import { randomBytes, createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../../config/postgresql.js";
import env from "../../config/env.js";

export const registerUser = async ({
  name,
  email,
  password,
  employeeId,
  department = "General"
}) => {
  const passwordHash = await bcrypt.hash(password, 12);

  const result = await pool.query(
    `INSERT INTO users
      (full_name, email, password_hash, employee_id, department, role)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, full_name, email, employee_id, department, role, is_active`,
    [name, email.toLowerCase(), passwordHash, employeeId, department, "employee"]
  );

  return result.rows[0];
};

export const loginUser = async ({ email, password }) => {
  const result = await pool.query(
    `SELECT id, full_name, email, password_hash,
            employee_id, department, role, is_active
     FROM users
     WHERE email = $1`,
    [email.toLowerCase()]
  );

  const user = result.rows[0];

  if (!user) {
    throw new Error("INVALID_CREDENTIALS");
  }

  if (!user.is_active) {
    throw new Error("ACCOUNT_INACTIVE");
  }

  const isPasswordValid = await bcrypt.compare(
    password,
    user.password_hash
  );

  if (!isPasswordValid) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const token = jwt.sign(
    { id: user.id, role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN || "1d" }
  );

  const { password_hash, ...safeUser } = user;

  return {
    user: safeUser,
    token
  };
};

export const requestPasswordReset = async (email) => {
  const result = await pool.query(
    `SELECT id, full_name, email
     FROM users
     WHERE email = $1`,
    [email.toLowerCase().trim()]
  );

  const user = result.rows[0];

  // Return the same generic response whether the user exists or not.
  if (!user) return null;

  // Generate a secure random token.
  const resetToken = randomBytes(32).toString("hex");

  // Store only the SHA-256 hash in PostgreSQL.
  const hashedToken = createHash("sha256")
    .update(resetToken)
    .digest("hex");

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await pool.query(
    `UPDATE users
     SET reset_password_token = $1,
         reset_password_expires = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $3`,
    [hashedToken, expiresAt, user.id]
  );

  return { user, resetToken };
};

export const resetUserPassword = async ({ token, password }) => {
  const hashedToken = createHash("sha256")
    .update(token)
    .digest("hex");

  const passwordHash = await bcrypt.hash(password, 12);

  const result = await pool.query(
    `UPDATE users
     SET password_hash = $1,
         reset_password_token = NULL,
         reset_password_expires = NULL,
         updated_at = CURRENT_TIMESTAMP
     WHERE reset_password_token = $2
       AND reset_password_expires > CURRENT_TIMESTAMP
     RETURNING id`,
    [passwordHash, hashedToken]
  );

  return result.rowCount > 0;
};
