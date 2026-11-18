import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} from "../../src/modules/auth/auth.validator.js";

describe("Auth Validators", () => {
  describe("registerSchema", () => {
    it("validates correct registration payload", () => {
      const payload = {
        name: "Test User",
        email: "test@example.com",
        password: "password123",
        employeeId: "EMP-001",
        department: "Engineering"
      };
      const result = registerSchema.safeParse(payload);
      assert.equal(result.success, true);
      assert.equal(result.data.department, "Engineering");
    });

    it("defaults department to General if omitted", () => {
      const payload = {
        name: "Test User",
        email: "test@example.com",
        password: "password123",
        employeeId: "EMP-002"
      };
      const result = registerSchema.safeParse(payload);
      assert.equal(result.success, true);
      assert.equal(result.data.department, "General");
    });

    it("rejects short password (< 8 chars)", () => {
      const payload = {
        name: "Test User",
        email: "test@example.com",
        password: "short",
        employeeId: "EMP-003"
      };
      const result = registerSchema.safeParse(payload);
      assert.equal(result.success, false);
      assert.ok(result.error.issues.some((i) => i.path.includes("password")));
    });

    it("rejects invalid email format", () => {
      const payload = {
        name: "Test User",
        email: "not-an-email",
        password: "password123",
        employeeId: "EMP-004"
      };
      const result = registerSchema.safeParse(payload);
      assert.equal(result.success, false);
      assert.ok(result.error.issues.some((i) => i.path.includes("email")));
    });

    it("rejects missing employee ID", () => {
      const payload = {
        name: "Test User",
        email: "test@example.com",
        password: "password123"
      };
      const result = registerSchema.safeParse(payload);
      assert.equal(result.success, false);
      assert.ok(result.error.issues.some((i) => i.path.includes("employeeId")));
    });
  });

  describe("loginSchema", () => {
    it("validates correct login payload", () => {
      const result = loginSchema.safeParse({
        email: "user@example.com",
        password: "secretpassword"
      });
      assert.equal(result.success, true);
    });

    it("rejects missing password", () => {
      const result = loginSchema.safeParse({ email: "user@example.com" });
      assert.equal(result.success, false);
    });
  });

  describe("forgotPasswordSchema", () => {
    it("validates valid email", () => {
      const result = forgotPasswordSchema.safeParse({ email: "user@example.com" });
      assert.equal(result.success, true);
    });

    it("rejects invalid email", () => {
      const result = forgotPasswordSchema.safeParse({ email: "invalid-email" });
      assert.equal(result.success, false);
    });
  });

  describe("resetPasswordSchema", () => {
    it("accepts passwords >= 8 chars", () => {
      const result = resetPasswordSchema.safeParse({ password: "newpassword123" });
      assert.equal(result.success, true);
    });

    it("rejects passwords < 8 chars", () => {
      const result = resetPasswordSchema.safeParse({ password: "12345" });
      assert.equal(result.success, false);
    });
  });
});
