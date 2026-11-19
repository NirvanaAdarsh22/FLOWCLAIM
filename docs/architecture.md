# FlowClaim System Architecture

FlowClaim is an enterprise expense verification and deterministic policy-enforcement platform.

---

## 1. Core Architecture Principles

1. **Deterministic Business Decisions**:
   AI/ML extracts receipt information, but all policy validations, status transitions, and financial ledger writes are deterministically verified in the backend.

2. **Clean Separation of Storage**:
   - **PostgreSQL**: Stores relational, transactional, and audit data (users, auth, ledger).
   - **MongoDB**: Stores semi-structured document data (claims, line items, receipt metadata).
   - **Redis**: Provides rate limiting, volatile session tokens, and worker job queueing.

3. **Layered Module Structure**:
   ```
   FlowClaim/
   ├── frontend/         # React 19 + Vite + Lucide UI
   ├── backend2/         # Node.js + Express (ESM) modular API
   ├── worker/           # Background BullMQ pipeline daemon
   ├── packages/         # Standalone calculation engines
   │   ├── policy-engine
   │   ├── fraud-engine
   │   └── anomaly-engine
   └── docs/             # Technical specifications & guides
   ```

---

## 2. Request & Execution Flow

```
[Employee Client] ──> [Vite Dev Proxy: 5173] ──> [Express API: 5000]
                                                          │
          ┌─────────────────┬─────────────────────────────┤
          ▼                 ▼                             ▼
   [PostgreSQL]        [MongoDB]                     [Redis]
 (Users & Auth)     (Claims & Receipts)       (Rate Limits & Queue)
```
