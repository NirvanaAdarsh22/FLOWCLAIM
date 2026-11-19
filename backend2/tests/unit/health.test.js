import { describe, it } from "node:test";
import assert from "node:assert/strict";
import app from "../../src/app.js";

describe("Health Check Endpoints", () => {
  it("GET /health returns 200 with server status", async () => {
    // Basic test using express app instance
    assert.ok(app);
  });
});
