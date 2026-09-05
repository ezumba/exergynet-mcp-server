# ExergyNet Developer Quickstart

Two packages. Start with local memory if you want persistent agent state — no keys, no chain. Use `exergynet-mcp-server` if you want to query LNES-03 Solana program state or estimate compute costs.

---

## Which package do you need?

| Goal | Package | Install |
|---|---|---|
| Persistent local memory for AI agents | `@lnes/vanguard-memory-node` | `npx -y @lnes/vanguard-memory-node` |
| Query LNES-03 Solana program / estimate compute cost | `exergynet-mcp-server` (this repo) | `npx -y exergynet-mcp-server` |

Both packages are part of the ExergyNet fabric. They are independent — install one or both.

---

## Path 1 — Local Persistent Memory (`@lnes/vanguard-memory-node`)

### What you get

Persistent, SHA-256-addressed xLMP memory on your machine. Ingest documents or agent state, recall by content root, search by keyword. Context stays bounded as your corpus grows — validated at mean K ≈ 896 tokens across a ~10M-token persistent corpus. No cloud account. No private key. No on-chain transaction.

### Install

```bash
npx -y @lnes/vanguard-memory-node
```

### Add to Claude Desktop

`~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "vanguard-memory": {
      "command": "npx",
      "args": ["-y", "@lnes/vanguard-memory-node"]
    }
  }
}
```

### Add to Claude Code (CLI)

```bash
claude mcp add --transport stdio vanguard-memory -- npx -y @lnes/vanguard-memory-node
```

### Tools (11 total)

| Tool | What it does |
|---|---|
| `vmn_ingest` | Ingest text; returns SHA-256 shard hash |
| `vmn_recall` | Recall evidence from shard by hash + query |
| `vmn_search` | BM25 keyword search across vault objects |
| `vmn_list` | List all memory objects (optional namespace filter) |
| `vmn_inspect` | Inspect catalog metadata by hash |
| `vmn_delete` | Delete memory object by hash (permanent) |
| `vmn_stats` | Vault statistics |
| `vmn_index_status` | BM25 index status |
| `vmn_rebuild_index` | Rebuild BM25 index (safe — objects never modified) |
| `vmn_sync_vault` | Sync to ExergyNet LNES-17 vault (requires `EXERGYNET_API_KEY`) |
| `vmn_ingest_file` | Delta file ingestion with cursor tracking |

### What to expect

- First ingest: content is chunked, SHA-256-addressed, and indexed
- Recall: returns bounded, root-verified evidence — not a top-k fragment dump
- Context staging: bounded model-facing context was observed across the tested 32K–10M corpus-scaling envelope (sealed 10M holdout mean K = 895.96 tokens, 5/5 deterministic runs)

---

## Path 2 — Settlement Surface (`exergynet-mcp-server`, this package)

### What you get

Read-only LNES-03 Solana program lookups and a local compute-cost estimator. No private key or wallet credential is required or accepted.

> **Note:** `exergynet_open_job` (the write settlement tool) is currently disabled per security advisory 2026-08-28 pending a verified Base L2 contract migration. It always returns a fail-closed message and does not construct or sign any transaction. See [`MCP_SECURITY_ADVISORY_2026-08-28.md`](https://github.com/ezumba/exergynet-site/blob/main/MCP_SECURITY_ADVISORY_2026-08-28.md) for detail.

### Install

```bash
npx -y exergynet-mcp-server
```

### Add to Claude Code

```bash
claude mcp add --transport stdio exergynet -- npx -y exergynet-mcp-server
```

### Available tools

| Tool | What it does |
|---|---|
| `exergynet_get_program_id` | Returns the LNES-03 Solana Mainnet program ID |
| `exergynet_verify_program` | Read-only check: LNES-03 program exists + is executable on Solana |
| `exergynet_get_proof_transaction` | Returns a reference LNES-03 settlement transaction signature |
| `exergynet_estimate_gate` | Local arithmetic: external cost vs. settlement cost + margin |
| `exergynet_open_job` | **DISABLED** — fail-closed, no transaction (security advisory 2026-08-28) |

### When settlement re-activates

When `exergynet_open_job` is re-enabled after verified Base L2 contract migration, the designed flow will be:

```
USDC approval
    ↓
Escrow lock  ← capital committed before compute dispatched
    ↓
Broadcast
    ↓
Proof return  ← ZK proof from prover
    ↓
On-chain verification  ← proof verified before settlement released
    ↓
Settlement + audit receipt  ← replayable, independently verifiable
```

Current contract addresses and settlement status: [exergynet.org/proof.html](https://exergynet.org/proof.html)

---

## Architecture Reference

| Layer | What it does | Package | Requires keys? |
|---|---|---|---|
| xLMP / Vault | Persistent, bounded, SHA-256-addressed memory | `@lnes/vanguard-memory-node` | No |
| Vanguard | Evidence selection and context staging | `@lnes/vanguard-memory-node` | No |
| LNES-03 (Solana) | RISC Zero STARK verification (read-only lookups) | `exergynet-mcp-server` | No |
| LNES-04 (Base) | EVM escrow + ZK compute settlement | `exergynet-mcp-server` | Yes — when re-enabled |

---

## Troubleshooting

**"No memory found" on first recall**
Ingest at least one document first. The VMN index builds on ingest, not on startup. (This applies to `@lnes/vanguard-memory-node`.)

**`exergynet_open_job` returns a fail-closed message**
Expected. The tool is disabled in v0.2.3+. See [exergynet.org/proof.html](https://exergynet.org/proof.html) for current settlement status.

**MCP server not appearing in your client**
Restart the client after adding the server config. Verify `npx -y exergynet-mcp-server` (or `npx -y @lnes/vanguard-memory-node`) runs without errors in a standalone terminal first.

---

## What the model can and cannot do

**Can:** ingest memory (VMN), recall evidence (VMN), search memory (VMN), query LNES-03 program state, estimate compute costs.

**Cannot:** authorize consequential actions beyond the escrow scope, promote evidence to authoritative state without the governance layer, self-grant spending authority, send transactions (settlement tool is currently disabled).

This is the Consequence Boundary. The model proposes. Authority gates independently evaluate. See [SECURITY.md](../SECURITY.md).

---

*ExergyNet — start with memory, upgrade to settlement.*
