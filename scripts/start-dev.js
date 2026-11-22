/**
 * @file scripts/start-dev.js
 * Unified development runner starting Backend, BullMQ Worker, and Frontend concurrently.
 */

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(__filename), "..");

console.log("==================================================");
console.log("  FLOWCLAIM UNIFIED DEVELOPMENT RUNNER");
console.log("==================================================");

function runProcess(name, cmdString, cwd) {
  const proc = spawn(cmdString, {
    cwd,
    shell: true,
    env: { ...process.env, FORCE_COLOR: "true" }
  });

  proc.stdout.on("data", (data) => {
    process.stdout.write(`[${name}] ${data}`);
  });

  proc.stderr.on("data", (data) => {
    process.stderr.write(`[${name}] ${data}`);
  });

  proc.on("close", (code) => {
    console.log(`[${name}] process exited with code ${code}`);
  });

  return proc;
}

// 1. Start Backend API Server
console.log("[Runner] Starting Backend2 API on http://localhost:5000...");
const backend = runProcess("Backend", "node src/server.js", path.join(rootDir, "backend2"));

// 2. Start Worker Daemon
console.log("[Runner] Starting BullMQ Background Worker Daemon...");
const worker = runProcess("Worker", "node src/worker.js", path.join(rootDir, "worker"));

// 3. Start Frontend Client
console.log("[Runner] Starting Vite Frontend on http://localhost:5173...");
const frontend = runProcess("Frontend", "npm run dev", path.join(rootDir, "frontend"));

process.on("SIGINT", () => {
  console.log("\n[Runner] Shutting down FlowClaim services...");
  backend.kill();
  worker.kill();
  frontend.kill();
  process.exit(0);
});
