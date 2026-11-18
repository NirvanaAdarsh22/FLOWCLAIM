# FlowClaim — Backend API (`backend2`)

Welcome to the backend workspace for FlowClaim, an enterprise expense verification and policy-enforcement platform.

This workspace (`backend2/`) is developed with Node.js, Express.js (ES Modules), PostgreSQL, MongoDB, and Redis.

---

## 1. Prerequisites & Environment Setup

Create a `.env` file in `backend2/` following `.env.example`:

```env
PORT=5000
DATABASE_URL=postgresql://user:password@host/dbname
MONGO_URI=mongodb+srv://...
REDIS_URL=rediss://default:password@host:port
JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters
JWT_EXPIRES_IN=1d
EMAIL_USER=your_gmail_address@gmail.com
EMAIL_PASS=your_gmail_app_password
FRONTEND_URL=http://localhost:5173
```

---

## 2. Installation & Running Locally

Install dependencies and start the development server:

```bash
cd backend2
npm install
npm run dev
```

Run automated tests:

```bash
npm test
```

Server starts on: `http://localhost:5000`

---

## 3. Implemented API Endpoints

### Public & Health Endpoints
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/health` | Basic server health check | No |
| `GET` | `/api` | API root check | No |
| `GET` | `/api/health` | Health check for PostgreSQL, MongoDB, and Redis | No |

### Authentication & Password Reset (`/api/auth`)
| Method | Endpoint | Description | Rate Limit |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register new employee | 20 req / 15 min |
| `POST` | `/api/auth/login` | Login with email & password, returns JWT | 20 req / 15 min |
| `POST` | `/api/auth/forgot-password` | Request password reset email | 5 req / 15 min |
| `POST` | `/api/auth/reset-password/:token` | Set new password with 64-char hex token | 5 req / 15 min |

### Protected Endpoints
| Method | Endpoint | Description | Allowed Roles |
|---|---|---|---|
| `GET` | `/api/profile` | View authenticated user profile | Any authenticated user |
| `GET` | `/api/finance/dashboard` | Finance test route | `finance_manager`, `admin` |

---

## 4. Canonical Roles & Permissions

- **`employee`**: Can register, submit claims, view own claims and profile.
- **`manager`**: Can review and approve/reject claims within department.
- **`finance_manager`**: Can review financial allocations, budgets, and trigger payouts.
- **`admin`**: System administrator for user accounts and system configuration.

---

## 5. Security & Architecture Notes

- **Password Security**: Passwords hashed with `bcryptjs` (salt rounds: 12).
- **JWT Authentication**: Signed with `JWT_SECRET`, verified via `authMiddleware`.
- **Reset Token**: 32-byte cryptographically random token (`crypto.randomBytes`), stored as SHA-256 hash in PostgreSQL with a 15-minute expiry window. Single-use only.
- **Rate Limiting**: Backed by Redis to protect authentication and reset endpoints against brute-force attacks.
- **Fail-Safe Design**: Rate limiter fails open gracefully if Redis is momentarily unavailable.
