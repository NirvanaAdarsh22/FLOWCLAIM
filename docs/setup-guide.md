# FlowClaim Local Setup Guide

Step-by-step instructions to set up and run FlowClaim locally.

---

## 1. Prerequisites
- **Node.js**: v20 or higher (v24 recommended).
- **PostgreSQL**: Running on port 5432.
- **MongoDB**: Running on port 27017.
- **Redis**: Running on port 6379.

---

## 2. Quick Start

### Backend (`backend2/`)
```bash
cd backend2
npm install
npm run dev
```
Starts backend API on `http://localhost:5000`.

### Frontend (`frontend/`)
```bash
cd frontend
npm install
npm run dev
```
Starts development UI on `http://localhost:5173`.

---

## 3. Running Automated Tests
```bash
cd backend2
npm test
```
Runs the full suite of unit and integration tests.
