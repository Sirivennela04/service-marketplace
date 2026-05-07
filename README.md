# Smart Service Marketplace 🚀

A distributed, containerized web application built to connect customers with local service providers (plumbers, electricians, cleaners, etc.). The project demonstrates core principles of distributed systems, scalability, and load balancing natively from the client side without relying on external proxies like NGINX.

## 🏗️ Architecture

The application follows a modern **3-Tier Microservices Architecture**:
- **Frontend (Client Tier):** Built with pure HTML/CSS/JS and served using a lightweight Node.js Express static server.
- **Backend (Application Tier):** Built with Node.js and Express. Handles API requests, business logic, and database operations.
- **Database (Data Tier):** MongoDB for persistent storage.

## 🌐 Distributed Systems Properties Demonstrated

This project explicitly satisfies several key distributed systems requirements:

1. **Client-Side Load Balancing (Scalability):** We do not use any middleware load balancers or proxy servers (like NGINX). Instead, the frontend itself uses a custom **Round-Robin algorithm** to distribute incoming API requests evenly across multiple backend instances.
2. **Multi-Node Capability:** The system is designed so the backends, database, and frontend can be hosted across completely different physical or virtual nodes.
3. **Containerization:** Every component is containerized using Docker, ensuring that the system behaves identically regardless of where it is deployed.

## 🛠️ Tech Stack
- **Frontend:** HTML5, Vanilla CSS (Custom Design System), Vanilla JS
- **Backend:** Node.js, Express.js
- **Database:** MongoDB 6.0
- **Containerization:** Docker & Docker Compose

## ✨ Key Features
- Browse 12+ service categories.
- Customers can submit service requests specifying urgency, budget, and location.
- Service request tracking (Pending → Accepted → In Progress → Completed).
- Provider registration and profile management.
- Dynamic global search across both requests and providers.
- Real-time statistics dashboard tracking total jobs, average ratings, and system activity.
- Integrated review and rating system.

## 🚀 How to Run Locally (Docker)

**Prerequisites:** You must have Docker and Docker Compose installed.

1. Clone the repository:
   ```bash
   git clone https://github.com/Sirivennela04/service-marketplace.git
   cd service-marketplace
   ```
2. Start the distributed setup:
   ```bash
   docker-compose up -d --build
   ```
   *This single command will spin up 1 MongoDB database, 2 Backend Node instances, and 1 Frontend Node.js server.*
3. Open your browser and navigate to:
   `http://localhost:8080`

## ☁️ How to Deploy to AWS EC2

To demonstrate the system live across the internet, you can deploy it to a single AWS EC2 instance.

1. Launch an Ubuntu EC2 instance on AWS.
2. **Critical Step:** In your EC2 Security Group, open inbound ports **8080** (Frontend), **3001** (Backend 1), and **3002** (Backend 2).
3. SSH into your instance and install Docker/Docker Compose.
4. Clone this repository onto the EC2 instance.
5. Open `frontend/app.js` and update the `BACKEND_NODES` array with your EC2's Public IP address:
   ```javascript
   const BACKEND_NODES = [
     'http://<YOUR-EC2-PUBLIC-IP>:3001',
     'http://<YOUR-EC2-PUBLIC-IP>:3002'
   ];
   ```
6. Run `docker-compose up -d --build`.
7. Access `http://<YOUR-EC2-PUBLIC-IP>:8080` from any laptop globally!

## 🧪 Demo Data Seeding
To populate the application with sample providers, requests, and reviews for testing:
1. Open the frontend in your browser.
2. Press `Ctrl + Shift + A` to open the hidden API Config menu.
3. Click the **"🌱 Seed Demo Data"** button.

---
*Built for Distributed Systems and Cloud Computing coursework.*
