# 📚 BookArc – Cloud-Native Book Review & Recommendation Platform

BookArc is a **cloud-native web application** that allows users to:
- Browse and search for books
- Rate and review books
- Manage personal reading lists
- Compare book prices
- Receive personalized book recommendations
- Get system notifications (e.g., new reviews, book updates)

This project was developed as my **Cloud Computing graduation project**, focusing on **serverless architecture, scalability, and infrastructure as code**.

---

## 🛠️ Technology Stack

### ☁️ Cloud & Backend
- **AWS Lambda** – Serverless compute
- **Amazon API Gateway** – REST API management
- **Amazon RDS (MySQL)** – Relational database
- **Amazon Cognito** – Authentication & user management
- **Amazon SNS** – Notification system
- **Amazon S3** – Static assets & image storage
- **Amazon CloudFront** – Global content delivery
- **Amazon VPC** – Network isolation and security

### 🧱 Infrastructure as Code
- **Terraform** – Provisioning all AWS resources

### 🎨 Frontend
- **React.js**
- Hosted on **S3** and delivered via **CloudFront**

---

## 🏗️ Cloud Architecture

High-level architecture of the BookArc platform:

![Cloud Architecture](docs/architecture/bookarc-architecture.png)

📄 Detailed explanation:  
👉 [`docs/architecture/architecture-explanation.md`](docs/architecture/architecture-explanation.md)

---

## 🗄️ Database Design (ERD)

Relational database schema used by the application (MySQL on RDS):

![Database ERD](docs/erd/bookarc-erd.png)

📄 Entity descriptions:  
👉 [`docs/erd/erd-description.md`](docs/erd/erd-description.md)

---

## 📁 Repository Structure

```text
docs/         → Architecture diagrams, ERD, screenshots
terraform/    → Infrastructure as Code (AWS resources)
backend/      → Lambda functions & business logic
frontend/     → React frontend application
