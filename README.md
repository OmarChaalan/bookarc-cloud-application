# 📚 BookArc — Cloud-Native Book Management & Recommendation Platform

> **Graduation Project** — Cloud Computing B.S., Luminus Technical University College (LTUC)  
> Built and deployed on AWS using serverless architecture, Infrastructure as Code, and modern frontend development.

---

## 🌟 What is BookArc?

BookArc is a fully serverless, cloud-native web application designed for book lovers. It enables users to discover books, manage personal reading lists, write reviews, compare prices, and receive intelligent personalized recommendations — all powered by AWS.

This project was built as my graduation capstone to demonstrate real-world cloud engineering skills: designing a scalable architecture, provisioning infrastructure with Terraform, securing access with Cognito, and delivering a fast frontend globally via CloudFront.

---

## ✨ Core Features

| Feature | Description |
|---|---|
| 🔍 **Book Discovery** | Search and browse an extensive book catalog |
| ⭐ **Reviews & Ratings** | Write reviews and rate books |
| 📋 **Reading Lists** | Create and manage personal reading lists |
| 💰 **Price Comparison** | Compare book prices across sources |
| 🤖 **Personalized Recommendations** | AI-powered recommendations via AWS Personalize |
| 🔔 **Notifications** | Real-time system notifications via AWS SNS |
| 🔐 **Secure Authentication** | User registration, login, and session management via AWS Cognito |

---

## 🏗️ Cloud Architecture Overview

BookArc follows a **serverless, event-driven architecture** hosted entirely on AWS:

- The **React frontend** is hosted on **S3** and served globally through **CloudFront** for low-latency delivery.
- All API requests go through **Amazon API Gateway**, which routes them to **AWS Lambda** functions — no servers to manage.
- User data is stored in **Amazon RDS (MySQL)**, running inside a private subnet in a custom **VPC** for network isolation.
- A **Bastion Host (EC2)** in a public subnet is used for secure database administration — the RDS instance is never exposed to the internet.
- **AWS Cognito** handles all authentication, token management, and user pools.
- **AWS Personalize** powers the recommendation engine based on user behavior.
- **AWS SNS** delivers notifications to users when events occur (new reviews, book updates, etc.).

📐 Architecture Diagram: [`docs/architecture/bookarc-cloud-architecture.png`](docs/architecture/bookarc-cloud-architecture.png)  
📄 Detailed Architecture Explanation: [`docs/architecture/architecture-explanation.md`](docs/architecture/architecture-explanation.md)

---

## 🛠️ Technology Stack

### ☁️ AWS Services

| Service | Purpose |
|---|---|
| **AWS Lambda** | Serverless compute for API logic and background processing |
| **Amazon API Gateway** | REST API management and request routing |
| **Amazon RDS (MySQL)** | Relational database for structured data |
| **Amazon Cognito** | User authentication and authorization |
| **Amazon S3** | Static frontend hosting and image/asset storage |
| **Amazon CloudFront** | Global CDN for fast content delivery |
| **Amazon VPC** | Network isolation with public/private subnets |
| **AWS EC2** | Bastion Host for secure database administration |
| **AWS Personalize** | Machine learning-based book recommendations |
| **Amazon SNS** | Push notifications to users |

### 🧱 Infrastructure as Code

| Tool | What it Provisioned |
|---|---|
| **Terraform** | VPC, CloudFront, Frontend S3 Bucket, RDS |
| **AWS Console** | Cognito, API Gateway, Lambda, EC2, S3 Buckets |

### 🎨 Frontend

- **React.js** — Component-based UI
- Hosted on **Amazon S3**, delivered via **Amazon CloudFront**

---

## 🗄️ Database Design

BookArc uses a relational MySQL database hosted on Amazon RDS. The schema is designed to support users, books, reviews, ratings, reading lists, and recommendation tracking.

📊 ERD Diagrams:
- [`docs/erd/bookarc-erd1.jpg`](docs/erd/bookarc-erd1.jpg)
- [`docs/erd/bookarc-erd2.jpeg`](docs/erd/bookarc-erd2.jpeg)
- [`docs/erd/bookarc-erd3.jpeg`](docs/erd/bookarc-erd3.jpeg)

📄 Entity Descriptions: [`docs/erd/erd-description.md`](docs/erd/erd-description.md)

---

## 📁 Repository Structure

```
bookarc/
├── docs/
│   ├── architecture/       → Cloud architecture diagrams and explanation
│   └── erd/                → Database ERD diagrams and entity descriptions
├── terraform/              → Infrastructure as Code (Terraform configs)
├── backend/                → AWS Lambda functions and business logic
└── frontend/               → React.js frontend application
```

---

## 🔐 Security Highlights

- RDS database is in a **private subnet** — not accessible from the internet
- Database administration is done exclusively via a **Bastion Host** in a public subnet
- All API endpoints are protected with **AWS Cognito JWT tokens**
- S3 buckets are private; assets are served only through **CloudFront**
- VPC security groups follow the **principle of least privilege**

---

## 💡 Key Engineering Decisions

**Why Serverless?**  
Lambda + API Gateway eliminates server management, scales automatically with traffic, and reduces cost — you only pay for actual usage.

**Why Terraform for part of the infrastructure?**  
Core networking (VPC, subnets, RDS, CloudFront) is provisioned via Terraform for reproducibility and version control. This demonstrates Infrastructure as Code best practices.

**Why a Bastion Host instead of direct RDS access?**  
Direct public access to the database would be a major security risk. The Bastion Host pattern ensures the database is only reachable from an authorized, controlled entry point.

---

## 👨‍💻 Author

**[Your Name]**  
Cloud Computing Graduate — LTUC  
[LinkedIn](#) | [GitHub](#)

---

> *BookArc was fully deployed on AWS as part of my graduation project, demonstrating end-to-end cloud engineering from architecture design to infrastructure provisioning and frontend delivery.*
