# exergynet-mcp-server

> Read-only MCP lookups for the ExergyNet LNES-03 program on Solana, plus a local compute-cost estimator. Part of ExergyNet, model-independent infrastructure for useful AI work and persistent state — see [exergynet.org](https://exergynet.org).

[![npm version](https://img.shields.io/npm/v/exergynet-mcp-server)](https://www.npmjs.com/package/exergynet-mcp-server)
[![MCP Registry](https://img.shields.io/badge/MCP%20Registry-io.github.ezumba%2Fexergynet-blue)](https://registry.modelcontextprotocol.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Security advisory (2026-08-28)

**A prior version of this package (versions up to and including 0.2.2) shipped a working `exergynet_open_job` tool that, once a user configured a real wallet, sent a real Base Mainnet transaction — including an unconditional, unlimited USDC spending approval — to a contract address that ExergyNet's own status page identifies as retired, with access control that cannot be independently verified.** No evidence was found of any independent (non-developer) wallet ever having used this path. Full detail: [`MCP_SECURITY_ADVISORY_2026-08-28.md`](https://github.com/ezumba/exergynet-site/blob/main/MCP_SECURITY_ADVISORY_2026-08-28.md) in the `exergynet-site` repository.

**As of 0.2.3, `exergynet_open_job` is disabled.** It always returns a fail-closed message and does not construct, sign, or submit any transaction under any configuration. This version has no signing dependency at all (`ethers` and `viem` have been removed) and does not read or require any private key. **0.2.4** additionally fixes input-validation and audit-logging gaps found by an independent MCP security scan — see below.

If you installed a version before 0.2.3 and configured a real `BASE_PRIVATE_KEY`, revoke any USDC approval you may have granted to `0x5cfE075149776f4b3cca07a27D4fd85A60BA5e3f` on Base Mainnet (e.g. via [revoke.cash](https://revoke.cash/address/0x5cfE075149776f4b3cca07a27D4fd85A60BA5e3f?chainId=8453)) and upgrade immediately.

## Independent security scan remediation (0.2.4)

An earlier build (0.1.10) was independently scanned by MCP Vouch against the OWASP MCP Top 10 and scored 71/100 (Grade C), with four warnings: input validation, audit/telemetry, rate limiting, and supply chain risk. 0.2.4 addresses all four in the current tool set:

- **Input validation:** `exergynet_estimate_gate` and `exergynet_verify_program` now reject non-finite, negative, or malformed input with a clear error instead of silently coercing it.
- **Audit/telemetry:** every tool call is logged to stderr with a timestamp and outcome.
- **Rate limiting:** `exergynet_verify_program` (the only tool making an outbound network call) is limited to 20 calls per 10-second window.
- **Supply chain:** `ethers`/`viem` were already removed in 0.2.3. `npm audit fix` was applied for the transitive `ws` vulnerability in 0.2.4. The remaining moderate-severity `uuid` advisory (reachable via `@solana/web3.js` → `jayson` → `uuid@8.3.2`) is resolved in **0.2.5** with a targeted `overrides` entry pinning `jayson`'s `uuid` dependency to `^11.1.1`, without downgrading `@solana/web3.js` itself. `npm audit` reports 0 vulnerabilities after this change. Verified safe, not just applied blindly: full rebuild, all 9 regression tests passing, and a live network call through `exergynet_verify_program` against Solana Mainnet-Beta confirmed the override doesn't change RPC behavior.

A fresh independent rescan will be requested once a version is published; results (old vs. new) will be recorded rather than the 71/100 figure being quietly dropped.

---

## Quick Install

```bash
npx -y exergynet-mcp-server
```

### Claude Code

```bash
claude mcp add --transport stdio \
  --env RPC_URL=your_solana_rpc_url \
  exergynet -- npx -y exergynet-mcp-server
```

### Claude Desktop / ElizaOS / Other MCP Clients

```json
{
  "mcpServers": {
    "exergynet": {
      "command": "npx",
      "args": ["-y", "exergynet-mcp-server"],
      "env": {
        "RPC_URL": "your_solana_rpc_url"
      }
    }
  }
}
```

**No private key or wallet credential is required or accepted by this server.** `RPC_URL` is optional and defaults to the public Solana Mainnet-Beta endpoint.

---

## Tools

| Tool | What it does | Can it move funds or sign anything? |
|---|---|---|
| `exergynet_get_program_id` | Returns the LNES-03 Solana program ID | No — static value, no network call |
| `exergynet_verify_program` | Read-only check that the LNES-03 program account exists and is executable | No — a single read-only RPC call |
| `exergynet_get_proof_transaction` | Returns a reference LNES-03 settlement transaction signature | No — static value |
| `exergynet_estimate_gate` | Local arithmetic comparing an external compute cost to a settlement cost + risk margin you provide | No — no network call at all |
| `exergynet_open_job` | **Disabled.** Always returns a fail-closed message | No — by construction; the tool has no signing capability in this version |

### Write-tool maturity

`exergynet_open_job` will remain disabled until a current Base L2 execution target is independently verified end-to-end — correct chain ID, correct contract identity, matching ABI, and a live settlement path (a real prover producing the ZK receipt that `settleExergy` requires) — and that verification is documented publicly. A version that re-enables it will state exactly which contract it targets and how a caller can independently confirm that before any transaction is possible. Until then: **no ExergyNet MCP tool in this package will ever ask for a private key or send a transaction.**

For current, verified Base L2 contract addresses and settlement status, see [exergynet.org/proof.html](https://exergynet.org/proof.html) — do not rely on any address that may appear in an older cached copy of this README or an MCP directory listing that hasn't recrawled this repository yet.

---

## Compatible Agents

- **Claude** (Claude Code, Claude Desktop)
- **ElizaOS**
- Any MCP-compatible agent runtime

---

## Links

- 🌐 [exergynet.org](https://exergynet.org)
- 📦 [npm: exergynet-mcp-server](https://www.npmjs.com/package/exergynet-mcp-server)
- 🐙 [GitHub](https://github.com/ezumba/exergynet-mcp-server)
- 🗂️ [MCP Registry](https://registry.modelcontextprotocol.io) — `io.github.ezumba/exergynet`

---

## License

MIT © [ezumba](https://github.com/ezumba)
