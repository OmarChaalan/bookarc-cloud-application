module "vpc" {
  source = "./modules/vpc"

  project_name       = "bookarc"
  vpc_cidr           = "10.0.0.0/16"
  public_subnets     = ["10.0.1.0/24", "10.0.2.0/24"]
  private_subnets    = ["10.0.3.0/24", "10.0.4.0/24"]
  availability_zones = ["us-east-1a", "us-east-1b"]
}

module "rds" {
  source = "./modules/rds"

  project_name      = "bookarc"
  db_name           = "bookarcdb"
  db_username       = "admin"
  db_password       = "12345osrk"

  private_subnet_ids = module.vpc.private_subnet_ids
  vpc_id             = module.vpc.vpc_id
}xcopy "..\bookarc-cloud\bookarc-frontend-terraform" "terraform\bookarc-frontend-terraform\" /E /I /H /Y