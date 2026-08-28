#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
// LNES-03 Solana coordinates (read-only tools only — no signing, no funds, no private key).
const LNES03_PROGRAM_ID = "7BCPpUMBxQMPomsgTaJsQdLEfycNwPWqkQD1Cea4CcCL";
const PROOF_TX = "3MFnUnvVN2EbnUC3gPAWWERCNz283672Xus8iGZqWihvnQkndExNKnGHoGBgjb4aqs1pyke2iKWihPgMnQUvPiZe";
// ── MCP Vouch remediation (2026-08-28) ───────────────────────────────────────
// Audit/telemetry: log every tool invocation to stderr (never stdout, which
// carries the JSON-RPC transport). No PII, no arguments logged verbatim.
function auditLog(tool, outcome, detail) {
    const line = `[audit] ${new Date().toISOString()} tool=${tool} outcome=${outcome}${detail ? ` detail=${detail}` : ""}`;
    process.stderr.write(line + "\n");
}
// Rate limiting: only exergynet_verify_program makes an outbound network call
// (to a caller-supplied RPC endpoint). A simple fixed-window limiter prevents
// a runaway loop from hammering a third-party RPC provider. Read-only local
// arithmetic tools are not network-bound and are not rate limited.
const RATE_LIMIT_WINDOW_MS = 10000;
const RATE_LIMIT_MAX_CALLS = 20;
let rateWindowStart = Date.now();
let rateWindowCalls = 0;
function checkRateLimit() {
    const now = Date.now();
    if (now - rateWindowStart > RATE_LIMIT_WINDOW_MS) {
        rateWindowStart = now;
        rateWindowCalls = 0;
    }
    rateWindowCalls += 1;
    return rateWindowCalls <= RATE_LIMIT_MAX_CALLS;
}
// Input validation: reject non-finite / negative values instead of silently
// coercing them to 0 (the prior behavior masked malformed or hostile input).
function requireFiniteNonNegative(value, name) {
    const n = Number(value);
    if (!Number.isFinite(n)) {
        throw new Error(`${name} must be a finite number, got: ${JSON.stringify(value)}`);
    }
    if (n < 0) {
        throw new Error(`${name} must be >= 0, got: ${n}`);
    }
    return n;
}
function validateRpcUrl(value) {
    if (value === undefined || value === null)
        return undefined;
    if (typeof value !== "string") {
        throw new Error("rpcUrl must be a string");
    }
    let parsed;
    try {
        parsed = new URL(value);
    }
    catch {
        throw new Error("rpcUrl must be a well-formed URL");
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        throw new Error("rpcUrl must use http or https");
    }
    return value;
}
// SECURITY ADVISORY 2026-08-28: exergynet_open_job is disabled in this and all
// future versions until a verified current Base L2 execution target is
// established end-to-end (contract identity check + live settlement path).
// A prior version of this package sent USDC approvals toward a retired,
// access-control-unverifiable contract. See MCP_SECURITY_ADVISORY_2026-08-28.md
// in the exergynet-site repository for full detail.
const OPEN_JOB_DISABLED_MESSAGE = "Write settlement is temporarily unavailable while the current contract integration is being migrated. No transaction was created. See https://exergynet.org/proof.html for current settlement status.";
const server = new Server({ name: "exergynet-mcp-server", version: "0.2.5" }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
        {
            name: "exergynet_open_job",
            description: "DISABLED pending safe contract migration (security advisory 2026-08-28). Always returns a fail-closed message. Does not construct, sign, or submit any transaction, and does not read or require any private key.",
            inputSchema: { type: "object", properties: {} }
        },
        {
            name: "exergynet_estimate_gate",
            description: "Local arithmetic only. Compares an external compute cost estimate against a settlement cost plus risk margin. Makes no network call and touches no on-chain state.",
            inputSchema: {
                type: "object",
                required: ["externalComputeCostUsd", "settlementCostUsd"],
                properties: {
                    externalComputeCostUsd: { type: "number" },
                    settlementCostUsd: { type: "number" },
                    riskMarginUsd: { type: "number" }
                }
            }
        },
        {
            name: "exergynet_get_program_id",
            description: "Returns the LNES-03 Solana Mainnet program ID. Does not return a Base L2 contract address — see https://exergynet.org/proof.html for current, verified Base contract addresses and status.",
            inputSchema: { type: "object", properties: {} }
        },
        {
            name: "exergynet_verify_program",
            description: "Read-only check of whether the LNES-03 Solana program account exists and is executable on the given (or default) Solana RPC endpoint.",
            inputSchema: {
                type: "object",
                properties: { rpcUrl: { type: "string" } },
                additionalProperties: false
            }
        },
        {
            name: "exergynet_get_proof_transaction",
            description: "Returns a reference LNES-03 settlement transaction signature.",
            inputSchema: { type: "object", properties: {} }
        }
    ]
}));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const args = (request.params.arguments || {});
    const toolName = request.params.name;
    try {
        switch (toolName) {
            case "exergynet_open_job":
                auditLog(toolName, "ok");
                return { content: [{ type: "text", text: OPEN_JOB_DISABLED_MESSAGE }] };
            case "exergynet_estimate_gate": {
                const extCost = requireFiniteNonNegative(args.externalComputeCostUsd, "externalComputeCostUsd");
                const setCost = requireFiniteNonNegative(args.settlementCostUsd, "settlementCostUsd");
                const margin = args.riskMarginUsd === undefined ? 0 : requireFiniteNonNegative(args.riskMarginUsd, "riskMarginUsd");
                const total = setCost + margin;
                auditLog(toolName, "ok");
                if (extCost > total) {
                    return { content: [{ type: "text", text: `ACTION: USE_EXERGYNET (Savings: $${(extCost - total).toFixed(4)})` }] };
                }
                else {
                    return { content: [{ type: "text", text: `REJECT: Below threshold (Deficit: $${(total - extCost).toFixed(4)})` }] };
                }
            }
            case "exergynet_get_program_id":
                auditLog(toolName, "ok");
                return { content: [{ type: "text", text: JSON.stringify({ solana_lnes03: LNES03_PROGRAM_ID }) }] };
            case "exergynet_verify_program": {
                if (!checkRateLimit()) {
                    auditLog(toolName, "rejected", "rate_limit_exceeded");
                    return { content: [{ type: "text", text: `RATE_LIMITED: max ${RATE_LIMIT_MAX_CALLS} calls per ${RATE_LIMIT_WINDOW_MS / 1000}s` }] };
                }
                const rpcUrl = validateRpcUrl(args.rpcUrl) || "https://api.mainnet-beta.solana.com";
                const { Connection, PublicKey } = await import("@solana/web3.js");
                const connection = new Connection(rpcUrl, "confirmed");
                const info = await connection.getAccountInfo(new PublicKey(LNES03_PROGRAM_ID));
                auditLog(toolName, "ok");
                return { content: [{ type: "text", text: JSON.stringify({ exists: info !== null, executable: info?.executable }) }] };
            }
            case "exergynet_get_proof_transaction":
                auditLog(toolName, "ok");
                return { content: [{ type: "text", text: PROOF_TX }] };
            default:
                throw new Error(`Tool not found: ${toolName}`);
        }
    }
    catch (e) {
        auditLog(toolName, "rejected", e?.message ?? String(e));
        return { content: [{ type: "text", text: `ERROR: ${e?.message ?? String(e)}` }] };
    }
});
async function run() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
run().catch((e) => {
    console.error("[exergynet-mcp-server] FATAL:", e);
    process.exit(1);
});
