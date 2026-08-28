# exergynet-mcp-server

> Read-only MCP lookups for the ExergyNet LNES-03 program on Solana, plus a local compute-cost estimator. Part of ExergyNet, model-independent infrastructure for useful AI work and persistent state — see [exergynet.org](https://exergynet.org).

[![npm version](https://img.shields.io/npm/v/exergynet-mcp-server)](https://www.npmjs.com/package/exergynet-mcp-server)
[![MCP Registry](https://img.shields.io/badge/MCP%20Registry-io.github.ezumba%2Fexergynet-blue)](https://registry.modelcontextprotocol.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Security advisory (2026-08-28)

**A prior version of this package (versions up to and including 0.2.2) shipped a working `exergynet_open_job` tool that, once a user configured a real wallet, sent a real Base Mainnet transaction — including an unconditional, unlimited USDC spending approval — to a contract address that ExergyNet's own status page identifies as retired, with access control that cannot be independently verified.** No evidence was found of any independent (non-developer) wallet ever having used this path. Full detail: [`MCP_SECURITY_ADVISORY_2026-08-28.md`](https://github.com/ezumba/exergynet-site/blob/main/MCP_SECURITY_ADVISORY_2026-08-28.md) in the `exergynet-site` repository.

**As of 0.2.3, `exergynet_open_job` is disabled.** It always returns a fail-closed message and does not construct, sign, or submit any transaction under any configuration. This version has no signing dependency at all (`ethers` and `viem` have been removed) and does not read or require any private key.

If you installed a version before 0.2.3 and configured a real `BASE_PRIVATE_KEY`, revoke any USDC approval you may have granted to `0x5cfE075149776f4b3cca07a27D4fd85A60BA5e3f` on Base Mainnet (e.g. via [revoke.cash](https://revoke.cash/address/0x5cfE075149776f4b3cca07a27D4fd85A60BA5e3f?chainId=8453)) and upgrade immediately.

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
