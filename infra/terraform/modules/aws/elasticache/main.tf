# =============================================================================
#  ElastiCache for Redis.
#
#  Replaces the in-cluster Redis on the aws profile. The application sees
#  REDIS_URL either way.
#
#  Only portable Redis commands are used. No ElastiCache-only command appears
#  anywhere in the codebase, per anti-lock-in rule 3, which is what allows a
#  hospital to point the same build at a Redis pod, at Valkey, or at whatever
#  their platform team already runs.
#
#  Everything stored here is rebuildable: the cache, the rate-limit counters,
#  the pub/sub fanout, and the refresh-token revocation set, which is derived
#  from the token families in Postgres. Losing this cluster costs a cold cache
#  and a slow minute, not a session.
# =============================================================================

resource "random_password" "auth_token" {
  length  = 64
  special = false # ElastiCache AUTH rejects several punctuation characters
}

resource "aws_elasticache_subnet_group" "this" {
  name       = "${var.name}-cache"
  subnet_ids = var.data_subnet_ids

  tags = merge(var.tags, { Name = "${var.name}-cache" })
}

resource "aws_security_group" "this" {
  name        = "${var.name}-elasticache"
  description = "Redis from the EKS cluster security group only"
  vpc_id      = var.vpc_id

  tags = merge(var.tags, { Name = "${var.name}-elasticache" })
}

resource "aws_security_group_rule" "from_cluster" {
  type                     = "ingress"
  from_port                = 6379
  to_port                  = 6379
  protocol                 = "tcp"
  security_group_id        = aws_security_group.this.id
  source_security_group_id = var.allowed_security_group_id
  description              = "Redis from EKS"
}

resource "aws_elasticache_parameter_group" "this" {
  name   = "${var.name}-redis7"
  family = "redis7"

  parameter {
    # Evict rather than reject. A write rejection on a cache is an application
    # error path; an eviction is a cache miss, which the code already handles.
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  parameter {
    # Keyspace expiry events drive the queue fanout.
    name  = "notify-keyspace-events"
    value = "Ex"
  }

  tags = var.tags
}

resource "aws_elasticache_replication_group" "this" {
  replication_group_id = var.name
  description          = "${var.name} cache, pub/sub and rate limiting"

  engine         = "redis"
  engine_version = var.engine_version
  node_type      = var.node_type
  port           = 6379

  parameter_group_name = aws_elasticache_parameter_group.this.name
  subnet_group_name    = aws_elasticache_subnet_group.this.name
  security_group_ids   = [aws_security_group.this.id]

  num_cache_clusters         = var.num_cache_clusters
  automatic_failover_enabled = var.num_cache_clusters > 1
  multi_az_enabled           = var.num_cache_clusters > 1

  at_rest_encryption_enabled = true
  kms_key_id                 = var.kms_key_arn
  transit_encryption_enabled = true
  auth_token                 = random_password.auth_token.result

  # A cache does not need a backup. Everything here is rebuildable from
  # Postgres, and a snapshot of a cache is a snapshot of derived state.
  snapshot_retention_limit = var.snapshot_retention_limit
  maintenance_window       = var.maintenance_window

  apply_immediately          = false
  auto_minor_version_upgrade = true

  log_delivery_configuration {
    destination      = var.log_group_name
    destination_type = "cloudwatch-logs"
    log_format       = "json"
    log_type         = "slow-log"
  }

  tags = merge(var.tags, { Name = var.name })
}
