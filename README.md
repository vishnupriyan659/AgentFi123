# AgentFi

AgentFi is a decentralized, intelligent intent-execution engine built on Solana. It leverages large language models (LLMs) to parse natural language trading intents, evaluates risk and market routing natively using Solana RPCs and the Jupiter API, and executes seamlessly via user-approved signatures.

## Architecture

- **Frontend:** Vite, React, TypeScript, Shadcn UI, TailwindCSS, Solana Wallet Adapter
- **Backend:** Express, Node.js, Prisma, SQLite/PostgreSQL, TweetNaCl
- **Database:** Prisma ORM for relational schemas

---

## 🚀 Installation & Setup

### Prerequisites
- Node.js (v18+)
- npm or yarn

### 1. Clone the repository
```bash
git clone https://github.com/your-username/agentfi.git
cd agentfi
```

### 2. Install Dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd ../
npm install
```

---

## ⚙️ Environment Variables

Create `.env` files in both the `backend` and `frontend` (root) directories.

**Backend (`backend/.env`):**
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=your_super_secret_jwt_key
DATABASE_URL="file:./dev.db" # Or your postgres URL

# Solana settings
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_RPC_FALLBACK_URL=https://api.devnet.solana.com

# AI Settings (Optional - falls back to deterministic mock if omitted)
OPENAI_API_KEY=your_openai_api_key
```

**Frontend (`/.env`):**
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## 🏃 Running the Application

### 1. Database Setup (Backend)
Navigate to the backend and apply Prisma migrations:
```bash
cd backend
npx prisma generate
npx prisma migrate dev --name init
```

### 2. Start Both Servers
You can start both the frontend and backend concurrently from the root directory:

```bash
cd ..
npm run dev
```

- **Frontend:** `http://localhost:8080`
- **Backend:** `http://localhost:5000`

---

## 🐳 Docker Deployment

To run the entire stack in isolated Docker containers:

```bash
docker-compose up --build
```
This maps the backend to `5000`, the frontend to `8080`, and persists data via Docker volumes.

---

## 🧪 Testing

We use **Playwright** for complete End-to-End smoke testing.

Make sure the dev server is running (`npm run dev`), then execute:

```bash
npx playwright test
```

## Security
- **Authentication**: Strict Cryptographic nonces signed via the Solana Wallet.
- **Transactions**: The backend *never* signs transactions directly; it prepares the payload, returning it to the client for Wallet Approval.
- **Protections**: Rate limited, Helmet headers, payload compression, and gracefully-degraded RPC fallback handling.
