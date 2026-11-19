# FlowClaim Database Schema

---

## 1. PostgreSQL Schema (Relational & Auth)

### Table: `users`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | SERIAL | PRIMARY KEY | Unique user identifier |
| `full_name` | VARCHAR(255) | NOT NULL | User's full name |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | Corporate login email |
| `password_hash` | VARCHAR(255) | NOT NULL | bcrypt hash (12 salt rounds) |
| `employee_id` | VARCHAR(100) | UNIQUE, NOT NULL | Corporate employee ID |
| `department` | VARCHAR(100) | DEFAULT 'General' | Assigned department |
| `role` | VARCHAR(50) | DEFAULT 'employee' | System role |
| `is_active` | BOOLEAN | DEFAULT TRUE | Active account flag |
| `reset_password_token` | VARCHAR(64) | NULL | SHA-256 hashed reset token |
| `reset_password_expires` | TIMESTAMP | NULL | 15-minute expiry timestamp |

---

## 2. MongoDB Schema (Document & Claims)

### Collection: `claims`
```json
{
  "claimId": "CLM-M1024-8F",
  "employeeId": "EMP-7489",
  "category": "Travel",
  "expenseDate": "2026-11-15T00:00:00.000Z",
  "amount": 1250,
  "currency": "INR",
  "description": "Client travel conveyance",
  "receiptUrl": "https://storage.flowclaim.internal/receipts/rec-123.jpg",
  "status": "Pending Manager Approval",
  "policyViolations": [],
  "createdAt": "2026-11-19T10:00:00.000Z",
  "updatedAt": "2026-11-19T10:05:00.000Z"
}
```
