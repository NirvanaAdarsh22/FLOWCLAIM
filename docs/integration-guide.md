# FlowClaim Integration Guide

Guide for connecting services across the FlowClaim ecosystem.

---

## 1. Frontend to Backend Communication

- **Base URL**: `/api` (configured in Vite proxy to forward to `http://localhost:5000`).
- **Headers**:
  ```http
  Content-Type: application/json
  Authorization: Bearer <jwt-token>
  ```
- **Error Format**:
  All error responses follow the standard JSON envelope:
  ```json
  {
    "success": false,
    "message": "Clear description of error",
    "errors": []
  }
  ```

---

## 2. Worker to Backend Integration

- Worker daemon consumes BullMQ jobs queued in Redis under `receipt-processing`.
- Job outputs are validated before any status transitions are recorded.
- Background jobs are strictly idempotent to prevent duplicate ledger commits.
