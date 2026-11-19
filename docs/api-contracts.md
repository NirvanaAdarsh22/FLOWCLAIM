# FlowClaim API Contracts

All endpoints are hosted at `http://localhost:5000/api`.

---

## 1. Authentication (`/auth`)

### POST `/auth/register`
- **Request Body**:
  ```json
  {
    "name": "Alex Vance",
    "email": "alex.vance@flowclaim.internal",
    "password": "Password123!",
    "employeeId": "EMP-7489",
    "department": "Engineering"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "User registered successfully",
    "user": {
      "id": 1,
      "full_name": "Alex Vance",
      "email": "alex.vance@flowclaim.internal",
      "employee_id": "EMP-7489",
      "department": "Engineering",
      "role": "employee"
    }
  }
  ```

### POST `/auth/login`
- **Request Body**:
  ```json
  {
    "email": "alex.vance@flowclaim.internal",
    "password": "Password123!"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Login successful",
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": {
      "id": 1,
      "full_name": "Alex Vance",
      "email": "alex.vance@flowclaim.internal",
      "role": "employee"
    }
  }
  ```

### POST `/auth/forgot-password`
- **Request Body**: `{ "email": "alex.vance@flowclaim.internal" }`
- **Response (200 OK)**: `{ "success": true, "message": "If an account exists, a reset link will be sent." }`

### POST `/auth/reset-password/:token`
- **Request Body**: `{ "password": "NewStrongPassword123!" }`
- **Response (200 OK)**: `{ "success": true, "message": "Password reset successfully. Please log in." }`

---

## 2. Claims Lifecycle (`/claims`)

Requires header: `Authorization: Bearer <token>`

- `POST /claims` — Create a new draft expense claim.
- `GET /claims/my` — Fetch all claims submitted by the logged-in employee.
- `GET /claims/:id` — View specific claim details.
- `POST /claims/:id/submit` — Submit claim for deterministic policy check and manager approval.

---

## 3. Profile & Roles

- `GET /profile` — Returns authenticated user profile (`id`, `name`, `email`, `employeeId`, `role`).
- `GET /finance/dashboard` — Role-protected test route for `finance_manager` and `admin`.
