# 📚 BookHub – Cloud-Native Book Review & Recommendation Platform

BookHub is a cloud-native web application where users can browse books, rate books, write reviews, manage reading lists, compare book prices, and receive personalized recommendations using AWS services.

Built as my **Cloud Computing graduation project**, using:

- ☁️ **AWS** – Lambda, API Gateway, RDS (MySQL), Cognito, S3, CloudFront, VPC  
- 🛠️ **Terraform** – Infrastructure as Code for all cloud resources  
- 🧠 **Serverless backend** – Lambda functions for all business logic  
- 🎨 **Frontend** – React (hosted on S3 and distributed via CloudFront)
- 🔔 **Notification System** – Built using AWS SNS

---

## 🏗️ Cloud Architecture

This is the cloud architecture for BookHub:

![Cloud Architecture]()

---

## 🗄️ Database ERD

The relational database schema (MySQL on RDS) powering BookHub:

![Database ERD]()

---

## 📁 Repository Structure

```text
bookhub/
- docs/
   - architecture/        # The Cloud Architecture Diagram 
   - erd/                 # The Database ERD Diagram

- terraform/              # Terraform IaC
- backend/                # Lambda functions & API code
- frontend/               # React frontend source code
- README.md               # Project documentation
