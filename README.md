# 🎫 SupportDesk — Full-Stack MERN Customer Support Ticketing System

[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8.svg)](https://tailwindcss.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47a248.svg)](https://www.mongodb.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-Realtime-black.svg)](https://socket.io/)

A modern, production-ready, full-stack Customer Support Ticketing System built with the **MERN Stack** (MongoDB, Express.js, React.js, Node.js), featuring **AI-Powered Triage**, **Load-Balanced Agent Routing**, **Real-Time SLA Tracking**, **Live Ticket Chat**, and an **Interactive Analytics Dashboard**.

---

## ✨ Key Features

### 👤 Role-Based Portals
- **Client Portal**:
  - Intuitive dashboard tracking open, in-progress, and resolved tickets.
  - Multi-file attachment drag-and-drop ticket creation (up to 5 files, 10MB each).
  - Real-time conversation thread with assigned agents.
  - Live SLA countdown timer on active tickets.
  - **Embedded AI Chatbot** with instant FAQ answers and direct ticket generation from chat.
- **Agent Console**:
  - Comprehensive ticket management: search, multi-field filters (status, priority, department, agent), and sorting.
  - Internal private notes thread (agents only, hidden from clients).
  - Status progression workflow (`Open` → `In Progress` → `Waiting for Customer` → `Resolved` → `Closed`).
  - **AI Reply Suggestions**: Context-aware automated responses (deterministic engine + AI fallback).
  - One-click ticket re-triage and agent reassignment.
  - **Analytics Hub**: Recharts visualizations for priority distribution, status breakdown, department workload, and 30-day ticket volume trends with SLA compliance metrics.

### 🧠 Smart Triage & Automated Routing
- **Rule-Based & AI-Powered Classification**: Automatically detects urgency (`Critical`, `High`, `Medium`, `Low`), department (`Technical Support`, `Billing & Payments`, `Account & Access`, `General Support`, `Security`), and issue tags from ticket content.
- **Load-Balanced Dispatcher**: Evaluates agent workload in real-time and routes tickets to the available agent with the fewest active tickets in that department.
- **SLA Engine**: Dynamic deadlines based on priority (`Critical`: 1h, `High`: 2h, `Medium`: 8h, `Low`: 24h).
- **Background Cron Worker**: Runs every minute to monitor SLA warnings and automatically escalate breached tickets.

### ⚡ Real-Time Infrastructure
- Built with **Socket.IO** rooms:
  - User-specific notification channels (`user:{id}`)
  - Broadcast agent channel (`agents`)
  - Dedicated ticket chat rooms (`ticket:{id}`)

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite 8, Tailwind CSS v4, Lucide React, Recharts, React Router v6, Axios |
| **Backend** | Node.js, Express.js, Socket.IO, Multer, node-cron, JSON Web Tokens (JWT), bcryptjs |
| **Database** | MongoDB with Mongoose ODM |

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [MongoDB](https://www.mongodb.com/try/download/community) installed and running locally on port `27017`

### 1. Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/Customer_support_ticketing_system.git
cd Customer_support_ticketing_system
```

### 2. Install Dependencies
```bash
# Install root, backend, and frontend packages in one command
npm run install:all
```

### 3. Configure Environment Variables
Create a `.env` file in the `server/` directory (or copy from `.env.example`):
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/support_tickets
JWT_SECRET=your_super_secret_jwt_key_here
AI_API_KEY=
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

### 4. Seed the Database
Populate demo clients, agents, and realistic tickets with conversation histories:
```bash
npm run seed
```

### 5. Start Development Servers
```bash
npm run dev
```
- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:5000](http://localhost:5000)

---

## 🔐 Demo Credentials

| Role | Email | Password | Department |
|---|---|---|---|
| **Client** | `client@example.com` | `client123` | — |
| **Agent 1** | `agent1@example.com` | `agent123` | Technical Support |
| **Agent 2** | `agent2@example.com` | `agent123` | Billing & Payments |
| **Agent 3** | `agent3@example.com` | `agent123` | Account & Access |
| **Agent 4** | `agent4@example.com` | `agent123` | General Support |
| **Agent 5** | `agent5@example.com` | `agent123` | Security |

*(Quick-fill buttons for demo accounts are provided on the login page)*

---

## 📂 Project Structure

```
Customer_support_ticketing_system/
├── package.json               # Root scripts (concurrently)
├── .gitignore
├── .env.example
├── README.md
├── server/
│   ├── server.js              # Entry point (HTTP + Socket.IO)
│   ├── app.js                 # Express application setup
│   ├── seed.js                # Database seeder
│   ├── config/                # Database & Socket configurations
│   ├── controllers/           # Auth, Ticket, Dashboard, Agent, Chatbot controllers
│   ├── models/                # User, Ticket (with embedded messages)
│   ├── routes/                # Express API endpoints
│   ├── services/              # Triage, Routing, SLA, AI reply, Notification services
│   ├── middleware/            # JWT auth, Multer file upload, Global error handler
│   ├── workers/               # node-cron SLA monitor
│   └── uploads/               # Uploaded attachment storage
└── client/
    ├── src/
    │   ├── main.jsx           # React root with Providers
    │   ├── App.jsx            # Router and Protected Routes
    │   ├── index.css          # Tailwind CSS styles
    │   ├── context/           # AuthContext & SocketContext
    │   ├── layouts/           # ClientLayout & AgentLayout
    │   ├── pages/
    │   │   ├── auth/          # Login & Register
    │   │   ├── client/        # Client Dashboard, My Tickets, Create Ticket, Ticket Detail
    │   │   └── agent/         # Agent Dashboard, All Tickets, Ticket Detail, Analytics
    │   ├── components/        # UI components & Floating Chatbot
    │   └── services/          # Axios API & Ticket service layer
    └── vite.config.js
```

---

## 📜 License
This project is open source and available under the [MIT License](LICENSE).
