import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverPath = join(__dirname, "..", "dist", "index.js");

function callServer(messages, { collectStderr = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [serverPath], { env: { ...process.env } });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`Timed out. stderr: ${stderr}`));
    }, 8000);

    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", reject);
    child.on("close", () => {
      clearTimeout(timer);
      resolve({ stdout, stderr });
    });

    for (const m of messages) child.stdin.write(JSON.stringify(m) + "\n");
    setTimeout(() => child.stdin.end(), 500);
  });
}

function responsesFrom(stdout) {
  return stdout
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);
}

test("exergynet_estimate_gate rejects non-numeric input instead of silently treating it as zero", async () => {
  const { stdout } = await callServer([
    { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "0.0.1" } } },
    { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "exergynet_estimate_gate", arguments: { externalComputeCostUsd: "not-a-number", settlementCostUsd: 1 } } },
  ]);
  const res = responsesFrom(stdout).find((r) => r.id === 2);
  const text = res?.result?.content?.[0]?.text ?? "";
  assert.match(text, /^ERROR:/, `Expected a validation error, got: ${text}`);
});

test("exergynet_estimate_gate rejects negative values", async () => {
  const { stdout } = await callServer([
    { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "0.0.1" } } },
    { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "exergynet_estimate_gate", arguments: { externalComputeCostUsd: -5, settlementCostUsd: 1 } } },
  ]);
  const res = responsesFrom(stdout).find((r) => r.id === 2);
  const text = res?.result?.content?.[0]?.text ?? "";
  assert.match(text, /^ERROR:/, `Expected a validation error, got: ${text}`);
});

test("exergynet_verify_program rejects a malformed rpcUrl", async () => {
  const { stdout } = await callServer([
    { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "0.0.1" } } },
    { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "exergynet_verify_program", arguments: { rpcUrl: "not a url" } } },
  ]);
  const res = responsesFrom(stdout).find((r) => r.id === 2);
  const text = res?.result?.content?.[0]?.text ?? "";
  assert.match(text, /^ERROR:/, `Expected a validation error, got: ${text}`);
});

test("every tool invocation is audit-logged to stderr", async () => {
  const { stderr } = await callServer([
    { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "0.0.1" } } },
    { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "exergynet_get_proof_transaction", arguments: {} } },
  ]);
  assert.match(stderr, /\[audit\].*tool=exergynet_get_proof_transaction outcome=ok/);
});
