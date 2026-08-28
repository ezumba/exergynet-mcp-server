import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distPath = join(__dirname, "..", "dist", "index.js");
const built = readFileSync(distPath, "utf8");

// Regression guard for the 2026-08-28 P0 incident: the retired Base Mainnet
// contract must never reappear in a shipped build, in any letter casing.
const RETIRED_ADDRESS = "0x5cfE075149776f4b3cca07a27D4fd85A60BA5e3f";

test("retired contract address does not appear in the built artifact", () => {
  assert.equal(
    built.toLowerCase().includes(RETIRED_ADDRESS.toLowerCase()),
    false,
    "Retired address 0x5cfE0751... must not appear in dist/index.js"
  );
});

test("no private-key environment variable is referenced", () => {
  assert.equal(/PRIVATE_KEY/i.test(built), false, "Built artifact must not reference any *PRIVATE_KEY env var");
});

test("no signing library is imported", () => {
  for (const lib of ["ethers", "viem"]) {
    assert.equal(
      new RegExp(`from ["']${lib}["']`).test(built),
      false,
      `Built artifact must not import '${lib}' — the write path must have no signing capability at all`
    );
  }
});

test("no bare 40-hex-char address literal appears anywhere in the built artifact", () => {
  // A defense-in-depth check: even a *different* hardcoded EVM address would
  // reintroduce the same class of defect (an unverified, silently-trusted
  // execution target). No address literal should ship until §9's contract
  // identity verification is implemented.
  const addressPattern = /0x[a-fA-F0-9]{40}/g;
  const matches = built.match(addressPattern) || [];
  assert.equal(matches.length, 0, `Found unexpected address literal(s) in dist/index.js: ${matches.join(", ")}`);
});
