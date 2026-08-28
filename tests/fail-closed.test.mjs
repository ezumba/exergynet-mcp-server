import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverPath = join(__dirname, "..", "dist", "index.js");

function callServer(messages) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [serverPath], {
      // Deliberately unset — proves the tool needs no key to run or to fail closed.
      env: { ...process.env, BASE_PRIVATE_KEY: "", RPC_URL: "" },
    });
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

    for (const m of messages) {
      child.stdin.write(JSON.stringify(m) + "\n");
    }
    setTimeout(() => child.stdin.end(), 500);
  });
}

test("exergynet_open_job fails closed with no BASE_PRIVATE_KEY configured", async () => {
  const { stdout } = await callServer([
    { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "regression-test", version: "0.0.1" } } },
    { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "exergynet_open_job", arguments: {} } },
  ]);

  const lines = stdout.split("\n").filter((l) => l.trim().length > 0);
  const responses = lines.map((l) => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);

  const callResponse = responses.find((r) => r.id === 2);
  assert.ok(callResponse, `No response received for tools/call. Raw stdout: ${stdout}`);

  const text = callResponse.result?.content?.[0]?.text ?? "";
  assert.match(text, /temporarily unavailable/i, `Expected fail-closed message, got: ${text}`);
  assert.doesNotMatch(text, /0x5cfE/i, "Response must never mention the retired contract");
  assert.doesNotMatch(text, /txHash|JOB_OPENED/i, "No transaction should ever be reported as opened");
});
