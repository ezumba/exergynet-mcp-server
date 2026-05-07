# exergynet-mcp-server

> The official MCP server for the **ExergyNet** thermodynamic compute clearinghouse.

[![npm version](https://img.shields.io/npm/v/exergynet-mcp-server)](https://www.npmjs.com/package/exergynet-mcp-server)
[![MCP Registry](https://img.shields.io/badge/MCP%20Registry-io.github.ezumba%2Fexergynet-blue)](https://registry.modelcontextprotocol.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

ExergyNet operates the **LNES-04 protocol** on the Base L2 EVM, enabling autonomous agents to natively request Zero-Knowledge verified off-chain compute directly from the blockchain.

---

## Quick Install

```bash
npx -y exergynet-mcp-server
```

### Claude Code

```bash
claude mcp add --transport stdio \
  --env BASE_PRIVATE_KEY=your_hex_private_key \
  --env RPC_URL=your_base_rpc_url \
  exergynet -- npx -y exergynet-mcp-server
```

### Claude Desktop / ElizaOS / Other MCP Clients

Add to your MCP config file:

```json
{
  "mcpServers": {
    "exergynet": {
      "command": "npx",
      "args": ["-y", "exergynet-mcp-server"],
      "env": {
        "BASE_PRIVATE_KEY": "your_hex_private_key",
        "RPC_URL": "your_base_rpc_url"
      }
    }
  }
}
```

---

## Overview

ExergyNet is a compute clearinghouse where agents pay for ZK-verified off-chain computation using on-chain USDC escrow. Rather than arbitrary pricing, resources are settled via the **LNES-04 protocol** — a thermodynamic accounting standard enforced on Base L2.

Agents using this server can autonomously:

- Request **ZK-verified off-chain compute** directly from the blockchain
- Handle **USDC approvals and on-chain escrow** without human intervention
- Pay **computational tolls** trustlessly via smart contract

---

## Configuration

| Variable | Required | Description |
|---|---|---|
| `BASE_PRIVATE_KEY` | ✅ Yes | Agent's hot wallet private key (hex). Must hold Base Sepolia or Mainnet USDC to pay compute tolls. |
| `RPC_URL` | ✅ Yes | Base L2 EVM RPC endpoint URL |

> ⚠️ **Security**: `BASE_PRIVATE_KEY` is a live signing key used for on-chain transactions. Use a dedicated agent wallet funded only with what's needed for operations.

### Getting a Base RPC URL

- [Alchemy](https://www.alchemy.com/) — `https://base-mainnet.g.alchemy.com/v2/YOUR_KEY`
- [Infura](https://infura.io/) — `https://base-mainnet.infura.io/v3/YOUR_KEY`
- Public (rate-limited) — `https://mainnet.base.org`
- Testnet (Sepolia) — `https://sepolia.base.org`

---

## Autonomous Agent Tools

### `exergynet_open_job`

Autonomously handles EVM USDC approvals and escrows the computational toll on-chain. This single tool manages the full lifecycle of submitting a compute job to the ExergyNet clearinghouse — approval, escrow, and job registration — without requiring human confirmation at each step.

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
