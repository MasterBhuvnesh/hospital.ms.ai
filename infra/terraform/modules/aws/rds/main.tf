# =============================================================================
#  RDS PostgreSQL 16, Multi-AZ.
#
#  Replaces the CloudNativePG cluster on the aws profile, and the application
#  cannot tell the difference: it sees DATABASE_URL and the Postgres wire
#  protocol either way.
#
#  What is deliberately NOT used here:
#    - Aurora. Aurora-only SQL and its failover semantics are a portability
#      one-way door, and anti-lock-in rule 3 forbids a provider-proprietary
#      feature on a portable capability. Plain RDS Postgres is the same engine
#      a hospital runs on their own hardware.
#    - The RDS Data API. The Postgres wire protocol is the interface.
#
#  One instance, one database, one schema per service. Eight databases for a
#  system this size is eight backup schedules and eight failovers to reason
#  about, and the schema boundary is enforced in code by ScopedRepository.
# =============================================================================

resource "random_password" "master" {
  length  = 40
  special = false # some drivers still mangle URL-encoded passwords
}

resource "aws_db_subnet_group" "this" {
  name       = "${var.name}-db"
  subnet_ids = var.data_subnet_ids

  tags = merge(var.tags, { Name = "${var.name}-db" })
}

resource "aws_security_group" "this" {
  name        = "${var.name}-rds"
  description = "PostgreSQL from the EKS node security group only"
  vpc_id      = var.vpc_id

  tags = merge(var.tags, { Name = "${var.name}-rds" })
}

# Source is a security group, not a CIDR. A CIDR rule keeps working when the
# subnet is reused for something else; a security group reference does not.
resource "aws_security_group_rule" "from_cluster" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.this.id
  source_security_group_id = var.allowed_security_group_id
  description              = "PostgreSQL from EKS"
}

resource "aws_db_parameter_group" "this" {
  name   = "${var.name}-pg16"
  family = "postgres16"

  parameter {
    name  = "log_min_duration_statement"
    value = "500"
  }

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
    apply_method = "pending-reboot"
  }

  parameter {
    name  = "pg_stat_statements.track"
    value = "all"
  }

  parameter {
    name  = "log_lock_waits"
    value = "1"
  }

  parameter {
    # Reject unencrypted connections at the server. The application already
    # sets sslmode=verify-full; this makes a misconfigured client fail loudly
    # rather than silently sending clinical data in the clear.
    name  = "rds.force_ssl"
    value = "1"
    apply_method = "pending-reboot"
  }

  parameter {
    name  = "random_page_cost"
    value = "1.1"
  }

  tags = var.tags
}

resource "aws_db_instance" "this" {
  identifier     = var.name
  engine         = "postgres"
  engine_version = var.engine_version
  instance_class = var.instance_class

  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id            = var.kms_key_arn

  db_name  = var.database_name
  username = var.master_username
  password = random_password.master.result
  port     = 5432

  multi_az               = var.multi_az
  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.this.id]
  publicly_accessible    = false
  parameter_group_name   = aws_db_parameter_group.this.name

  # --- backup ---------------------------------------------------------------
  # RPO is 5 minutes and PITR is what delivers it. The 35-day window is the
  # maximum RDS offers, and it costs almost nothing next to the alternative.
  backup_retention_period   = var.backup_retention_period
  backup_window             = var.backup_window
  copy_tags_to_snapshot     = true
  delete_automated_backups  = false
  skip_final_snapshot       = false
  final_snapshot_identifier = "${var.name}-final-${formatdate("YYYYMMDDhhmmss", timestamp())}"
  deletion_protection       = var.deletion_protection

  maintenance_window          = var.maintenance_window
  auto_minor_version_upgrade  = true
  apply_immediately           = false

  # --- observability --------------------------------------------------------
  # Postgres logs go to CloudWatch because RDS offers nowhere else, and Alloy
  # forwards them into Loki where the rest of the platform's logs already are.
  enabled_cloudwatch_logs_exports       = ["postgresql", "upgrade"]
  performance_insights_enabled          = var.performance_insights_enabled
  performance_insights_retention_period = var.performance_insights_enabled ? 7 : null
  performance_insights_kms_key_id       = var.performance_insights_enabled ? var.kms_key_arn : null
  monitoring_interval                   = 60
  monitoring_role_arn                   = aws_iam_role.monitoring.arn

  tags = merge(var.tags, { Name = var.name })

  lifecycle {
    ignore_changes = [final_snapshot_identifier]
  }
}

resource "aws_iam_role" "monitoring" {
  name = "${var.name}-rds-monitoring"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "monitoring.rds.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "monitoring" {
  role       = aws_iam_role.monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# A cross-region snapshot copy. The RTO commitment is one hour in-region; this
# exists for the case where the region itself is the incident.
resource "aws_db_instance_automated_backups_replication" "this" {
  count = var.cross_region_backup_region == "" ? 0 : 1

  source_db_instance_arn = aws_db_instance.this.arn
  retention_period       = var.backup_retention_period
  kms_key_id             = var.cross_region_kms_key_arn
}
