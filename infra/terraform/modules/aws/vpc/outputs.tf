output "vpc_id" {
  value = aws_vpc.this.id
}

output "vpc_cidr" {
  value = aws_vpc.this.cidr_block
}

output "public_subnet_ids" {
  description = "NLB and NAT only."
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "EKS nodes and pods."
  value       = aws_subnet.private[*].id
}

output "data_subnet_ids" {
  description = "RDS and ElastiCache. No route to the internet."
  value       = aws_subnet.data[*].id
}

output "availability_zones" {
  value = local.azs
}

output "nat_public_ips" {
  description = "Give these to any provider that allowlists by source IP, such as an SMS or payment gateway."
  value       = aws_eip.nat[*].public_ip
}
