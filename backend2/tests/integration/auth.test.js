import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import app from "../../src/app.js";
import redis from "../../src/config/redis.js";
import pool from "../../src/config/postgresql.js";

describe("Authentication Integration Tests", () => {
  let server;
  let baseUrl;
  let token = null;

  const uniqueSuffix = Date.now();
  const testUser = {
    name: "Integration Test User",
    email: `test_${uniqueSuffix}@example.com`,
    password: "Password123!",
    employeeId: `EMP_${uniqueSuffix}`,
    department: "Engineering"
  };

  before(async () => {
    // Ensure Redis connection for rate limiting
    try {
      if (redis.status !== "ready" && redis.status !== "connecting") {
        await redis.connect();
      }
    } catch {
      // Redis fail-open
    }

    // Start ephemeral server for integration testing
    await new Promise((resolve) => {
      server = app.listen(0, "127.0.0.1", () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}/api`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    try {
      await pool.end();
      await redis.quit();
    } catch {
      // ignore teardown error
    }
  });

  it("POST /auth/register - registers a new employee account", async () => {
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testUser)
    });

    const data = await res.json();
    assert.equal(res.status, 201);
    assert.equal(data.success, true);
    assert.equal(data.user.email, testUser.email.toLowerCase());
    assert.equal(data.user.role, "employee");
    assert.equal(data.user.employee_id, testUser.employeeId);
  });

  it("POST /auth/register - rejects duplicate email", async () => {
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...testUser,
        employeeId: `DIFF_${uniqueSuffix}`
      })
    });

    const data = await res.json();
    assert.equal(res.status, 409);
    assert.equal(data.success, false);
  });

  it("POST /auth/register - rejects duplicate employeeId", async () => {
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...testUser,
        email: `different_${uniqueSuffix}@example.com`
      })
    });

    const data = await res.json();
    assert.equal(res.status, 409);
    assert.equal(data.success, false);
  });

  it("POST /auth/login - rejects invalid password", async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testUser.email,
        password: "WrongPassword!"
      })
    });

    const data = await res.json();
    assert.equal(res.status, 401);
    assert.equal(data.success, false);
    assert.equal(data.message, "Invalid email or password");
  });

  it("POST /auth/login - authenticates successfully and returns JWT token", async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password
      })
    });

    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.ok(data.token);
    assert.equal(data.user.email, testUser.email.toLowerCase());

    token = data.token;
  });

  it("GET /profile - rejects requests without Authorization header", async () => {
    const res = await fetch(`${baseUrl}/profile`);
    const data = await res.json();
    assert.equal(res.status, 401);
    assert.equal(data.success, false);
  });

  it("GET /profile - permits requests with valid JWT", async () => {
    const res = await fetch(`${baseUrl}/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.user.role, "employee");
    assert.equal(data.user.email, testUser.email.toLowerCase());
  });

  it("GET /finance/dashboard - rejects employee with HTTP 403", async () => {
    const res = await fetch(`${baseUrl}/finance/dashboard`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();
    assert.equal(res.status, 403);
    assert.equal(data.success, false);
  });

  it("POST /auth/forgot-password - accepts request with generic message", async () => {
    const res = await fetch(`${baseUrl}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testUser.email })
    });

    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.message, "If an account exists, a reset link will be sent.");
  });

  it("POST /auth/reset-password/:token - rejects malformed reset tokens", async () => {
    const res = await fetch(`${baseUrl}/auth/reset-password/invalid-token-123`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "NewStrongPassword123!" })
    });

    const data = await res.json();
    assert.equal(res.status, 400);
    assert.equal(data.success, false);
  });
});
