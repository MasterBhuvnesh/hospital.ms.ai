# =============================================================================
#  VPC. Three availability zones, three subnet tiers.
#
#    public   NLB and NAT only. Nothing else is ever placed here.
#    private  EKS nodes and pods. Egress through NAT.
#    data     RDS and ElastiCache. NO ROUTE TO THE INTERNET AT ALL.
#
#  The data tier having no NAT route is deliberate and worth the extra subnets:
#  a compromised database instance cannot call out, and an accidental
#  public-facing RDS is structurally impossible rather than merely discouraged.
#
#  One NAT Gateway per AZ. A single shared NAT is roughly $70/month cheaper and
#  turns one AZ's failure into everyone's problem.
# =============================================================================

locals {
  azs = slice(var.availability_zones, 0, var.az_count)

  public_subnets  = [for i in range(var.az_count) : cidrsubnet(var.cidr_block, 4, i)]
  private_subnets = [for i in range(var.az_count) : cidrsubnet(var.cidr_block, 4, i + 4)]
  data_subnets    = [for i in range(var.az_count) : cidrsubnet(var.cidr_block, 8, i + 160)]
}

resource "aws_vpc" "this" {
  cidr_block           = var.cidr_block
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = merge(var.tags, { Name = "${var.name}-vpc" })
}

resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id
  tags   = merge(var.tags, { Name = "${var.name}-igw" })
}

# --- public ----------------------------------------------------------------
resource "aws_subnet" "public" {
  count = var.az_count

  vpc_id                  = aws_vpc.this.id
  cidr_block              = local.public_subnets[count.index]
  availability_zone       = local.azs[count.index]
  map_public_ip_on_launch = false # the NLB gets its own EIPs

  tags = merge(var.tags, {
    Name = "${var.name}-public-${local.azs[count.index]}"
    # Consumed by ingress-nginx's service controller when it provisions the NLB
    "kubernetes.io/role/elb" = "1"
  })
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id
  tags   = merge(var.tags, { Name = "${var.name}-public" })
}

resource "aws_route" "public_internet" {
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.this.id
}

resource "aws_route_table_association" "public" {
  count          = var.az_count
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# --- NAT, one per AZ -------------------------------------------------------
resource "aws_eip" "nat" {
  count  = var.single_nat_gateway ? 1 : var.az_count
  domain = "vpc"
  tags   = merge(var.tags, { Name = "${var.name}-nat-${count.index}" })
}

resource "aws_nat_gateway" "this" {
  count = var.single_nat_gateway ? 1 : var.az_count

  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id
  depends_on    = [aws_internet_gateway.this]

  tags = merge(var.tags, { Name = "${var.name}-nat-${local.azs[count.index]}" })
}

# --- private, application --------------------------------------------------
resource "aws_subnet" "private" {
  count = var.az_count

  vpc_id            = aws_vpc.this.id
  cidr_block        = local.private_subnets[count.index]
  availability_zone = local.azs[count.index]

  tags = merge(var.tags, {
    Name = "${var.name}-private-${local.azs[count.index]}"
    # Where EKS places internal load balancers, and where the cluster
    # autoscaler looks for capacity.
    "kubernetes.io/role/internal-elb" = "1"
  })
}

resource "aws_route_table" "private" {
  count = var.az_count

  vpc_id = aws_vpc.this.id
  tags   = merge(var.tags, { Name = "${var.name}-private-${local.azs[count.index]}" })
}

resource "aws_route" "private_nat" {
  count = var.az_count

  route_table_id         = aws_route_table.private[count.index].id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = aws_nat_gateway.this[var.single_nat_gateway ? 0 : count.index].id
}

resource "aws_route_table_association" "private" {
  count          = var.az_count
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

# --- data, no internet route ----------------------------------------------
resource "aws_subnet" "data" {
  count = var.az_count

  vpc_id            = aws_vpc.this.id
  cidr_block        = local.data_subnets[count.index]
  availability_zone = local.azs[count.index]

  tags = merge(var.tags, { Name = "${var.name}-data-${local.azs[count.index]}" })
}

resource "aws_route_table" "data" {
  vpc_id = aws_vpc.this.id
  tags   = merge(var.tags, { Name = "${var.name}-data" })
  # Deliberately no 0.0.0.0/0 route. Local only.
}

resource "aws_route_table_association" "data" {
  count          = var.az_count
  subnet_id      = aws_subnet.data[count.index].id
  route_table_id = aws_route_table.data.id
}

# =============================================================================
#  VPC endpoints.
#
#  Image pulls and secret fetches do not traverse the NAT. That is both a cost
#  line, since ECR pull traffic is the largest single NAT consumer during a
#  rollout, and a security boundary, since the traffic never leaves the VPC.
# =============================================================================
resource "aws_vpc_endpoint" "gateway" {
  for_each = var.enable_endpoints ? toset(["s3", "dynamodb"]) : toset([])

  vpc_id            = aws_vpc.this.id
  service_name      = "com.amazonaws.${var.region}.${each.value}"
  vpc_endpoint_type = "Gateway"
  route_table_ids   = concat(aws_route_table.private[*].id, [aws_route_table.data.id])

  tags = merge(var.tags, { Name = "${var.name}-${each.value}" })
}

resource "aws_security_group" "endpoints" {
  count = var.enable_endpoints ? 1 : 0

  name        = "${var.name}-vpce"
  description = "HTTPS from inside the VPC to interface endpoints"
  vpc_id      = aws_vpc.this.id

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [var.cidr_block]
    description = "HTTPS from the VPC"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(var.tags, { Name = "${var.name}-vpce" })
}

resource "aws_vpc_endpoint" "interface" {
  for_each = var.enable_endpoints ? toset([
    "ecr.api",
    "ecr.dkr",
    "secretsmanager",
    "sts",
    "logs",
    "kms",
  ]) : toset([])

  vpc_id              = aws_vpc.this.id
  service_name        = "com.amazonaws.${var.region}.${each.value}"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private[*].id
  security_group_ids  = [aws_security_group.endpoints[0].id]
  private_dns_enabled = true

  tags = merge(var.tags, { Name = "${var.name}-${each.value}" })
}

# --- flow logs -------------------------------------------------------------
resource "aws_flow_log" "this" {
  count = var.flow_logs_enabled ? 1 : 0

  vpc_id               = aws_vpc.this.id
  traffic_type         = "ALL"
  log_destination_type = "s3"
  log_destination      = var.flow_logs_bucket_arn

  # Partitioned so Athena can query a month without scanning a year.
  destination_options {
    file_format                = "parquet"
    per_hour_partition         = true
    hive_compatible_partitions = true
  }

  tags = merge(var.tags, { Name = "${var.name}-flow-logs" })
}
