# BookArc Cloud Architecture Explanation

## Overview
BookArc is designed as a cloud-native, serverless application using AWS managed services.
The architecture separates the frontend, backend, and database layers to ensure scalability,
security, and easy maintenance.

---

## Frontend Layer
- The frontend is a React application hosted on Amazon S3.
- Amazon CloudFront is used to distribute the frontend globally with low latency.
- Users access the application through a browser via CloudFront.

---

## Authentication Layer
- Amazon Cognito is responsible for user authentication and authorization.
- Users sign up and log in using Cognito User Pools.
- Cognito issues JWT tokens that are used to securely access backend APIs.

---

## Backend Layer
- The backend consists of AWS Lambda functions.
- Amazon API Gateway exposes REST APIs and routes requests to the correct Lambda functions.
- API Gateway validates Cognito tokens before allowing access to protected endpoints.

---

## Database Layer
- Amazon RDS (MySQL) is used as the relational database.
- The database is deployed in private subnets inside a VPC.
- Only backend Lambda functions are allowed to access the database.

---

## Notification System
- Notifications are handled at the application level using a shared notification service.
- A reusable `notification_service.py` layer is used by multiple Lambda functions.
- Backend Lambda functions call this service to create and manage notifications.
- Notifications are stored and retrieved through the backend APIs.
- This design keeps notification logic centralized and reusable.


---

## Networking & Security
- All resources are deployed inside a VPC.
- Public resources (CloudFront, API Gateway) are internet-facing.
- Private resources (RDS) are isolated for security.
- IAM roles and security groups control access between services.

---

## Infrastructure as Code
- All AWS resources are provisioned using Terraform.
- This ensures consistency, repeatability, and easy deployment.
