# Security Policy — ExergyNet MCP Server

## Supported Versions

| Version | Supported |
|---|---|
| 0.2.3 and later (`npx -y exergynet-mcp-server`) | Yes |
| 0.2.2 and earlier | No — upgrade immediately; see advisory below |

---

## Security Advisory (2026-08-28)

Versions up to and including 0.2.2 shipped a working `exergynet_open_job` that sent real Base Mainnet transactions to a retired contract. As of 0.2.3 this tool is disabled. No signing dependency remains in the package. No private key is read or required. See [`MCP_SECURITY_ADVISORY_2026-08-28.md`](https://github.com/ezumba/exergynet-site/blob/main/MCP_SECURITY_ADVISORY_2026-08-28.md) for full detail.

---

## x402 Attack-Class Analysis

The following maps the four principal attack classes identified in x402 agent payment protocol research (Wang et al., "When HTTP 402 Meets the Blockchain: Risks on Emerging x402 Payments," arXiv:2607.19545, USENIX Security 2026) to ExergyNet's architectural controls. These describe the settlement architecture's intended security properties — they apply to `exergynet_open_job` when it is re-enabled after a verified Base L2 migration.

| Attack class | Description | Intended architectural control (re-enabled settlement design) |
|---|---|---|
| **Free Shopping** | Agent requests compute without valid payment commitment | Designed so capital is locked in USDC escrow *before* compute is dispatched. The intended `exergynet_open_job` lifecycle is: approval → escrow → broadcast — so an agent is not intended to receive compute output before payment is committed. *(Tool currently disabled — describes the re-enabled design.)* |
| **Gas Abuse** | Attacker triggers settlement transactions to drain gas without delivering service | Intended to require on-chain proof verification before settlement is released — the design calls for a valid ZK proof from the prover and verification by the on-chain verifier contract before any settlement step executes. *(Tool currently disabled — describes the re-enabled design.)* |
| **Asset Theft** | Attacker redirects settled assets to an unintended recipient | Designed as a unidirectional escrow sump: funds enter, compute settles, funds are intended to release only to the predetermined recipient. The architecture aims to exclude AMM, liquidity-pool, and redirection surfaces. |
| **Service Denial** | Attacker replays, double-spends, or floods the settlement path to deny service | Architecture uses deterministic settlement with replayable audit trails. The contract design intends to serialize conflicting settlement attempts and revert replays. |

---

## Consequence Boundary

This package never holds signing credentials for consequential actions. `BASE_PRIVATE_KEY` is no longer read or accepted by this server (removed in 0.2.3 with `ethers`/`viem`). When `exergynet_open_job` is re-enabled in a future version, it will operate within explicitly granted spending limits only. The authority gate (LNES-22) is a separate architectural component from this server.

A live adversarial test of LNES-22 was conducted: a prompt-injection payload was sent to a running authority-review listener. The reasoning model partially complied (returned an approval). The deterministic validation layer rejected the request before any signed credential was exposed. Key material is structurally excluded from what the model layer receives.

---

## Local Mode Security Note

Running the MCP server (local read-only mode — the current default) does not involve any on-chain operations, private keys, or network settlement. The only outbound network call is the single Solana JSON-RPC read made by `exergynet_verify_program`, which is rate-limited to 20 calls per 10-second window. No credentials are transmitted.

---

## Vulnerability Disclosure

To report a security vulnerability:

1. **Do not open a public GitHub issue.**
2. Use GitHub's private security advisory feature: [github.com/ezumba/exergynet-mcp-server/security/advisories](https://github.com/ezumba/exergynet-mcp-server/security/advisories)
3. Include: affected component, reproduction steps, impact assessment.
4. We target a response within 72 hours and a patch within 14 days for confirmed critical issues.

---

*ExergyNet — consequential authority is never held by the model.*
