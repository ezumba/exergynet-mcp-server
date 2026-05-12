#!/usr/bin/env node
process.env.BASE_PRIVATE_KEY = process.env.BASE_PRIVATE_KEY || '0x1111111111111111111111111111111111111111111111111111111111111111';
process.env.RPC_URL = process.env.RPC_URL || 'https://mainnet.base.org';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { ethers } from "ethers";
import * as crypto from "crypto";
// CANONICAL LNES-04 COORDINATES
const MEMBRANE_ADDR = "0x5CFE075149776f4b3cca07a27D4fd85A60BA5e3f";
const USDC_ADDR = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const S3_BUCKET = "exergynet-sump-v1";
const S3_REGION = "us-east-1";
// LNES-03 Solana coordinates (for verify/status tools)
const LNES03_PROGRAM_ID = "7BCPpUMBxQMPomsgTaJsQdLEfycNwPWqkQD1Cea4CcCL";
const PROOF_TX = "3MFnUnvVN2EbnUC3gPAWWERCNz283672Xus8iGZqWihvnQkndExNKnGHoGBgjb4aqs1pyke2iKWihPgMnQUvPiZe";
const MEMBRANE_ABI = [
    "function openJob(bytes32 jobId) external",
    "function settleExergy(bytes32 jobId, bytes seal, bytes journal, address droneNode) external",
];
const USDC_ABI = [
    "function approve(address spender, uint256 amount) public returns (bool)",
    "function allowance(address owner, address spender) public view returns (uint256)",
    "function balanceOf(address account) public view returns (uint256)",
];
const server = new Server({ name: "exergynet-mcp-server", version: "0.2.0" }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
        {
            name: "exergynet_open_job",
            description: "Open a compute job on the LNES-04 Base Mainnet membrane. Locks USDC toll into escrow and emits JobOpened event. The S3 key for off-chain payload metadata is sha256(jobId). Returns jobId and S3 metadata key.",
            inputSchema: {
                type: "object",
                required: ["opcode"],
                properties: {
                    opcode: { type: "string", description: "Compute opcode e.g. 0x01 for OPTICAL" },
                    metadata: { type: "object", description: "Optional rich job parameters stored off-chain in S3" }
                }
            }
        },
        {
            name: "exergynet_estimate_gate",
            description: "Calculate whether routing compute through ExergyNet is profitable vs external provider.",
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
            description: "Return the canonical LNES-03 Solana program ID and LNES-04 Base contract address.",
            inputSchema: { type: "object", properties: {} }
        },
        {
            name: "exergynet_verify_program",
            description: "Check if LNES-03 Solana program is live on Mainnet.",
            inputSchema: {
                type: "object",
                properties: { rpcUrl: { type: "string" } },
                additionalProperties: false
            }
        },
        {
            name: "exergynet_get_proof_transaction",
            description: "Return the proven Genesis SettleExergy transaction signature.",
            inputSchema: { type: "object", properties: {} }
        }
    ]
}));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const args = (request.params.arguments || {});
    switch (request.params.name) {
        case "exergynet_open_job": {
            const pk = process.env.BASE_PRIVATE_KEY;
            if (!pk || pk === '0x1111111111111111111111111111111111111111111111111111111111111111') {
                return { content: [{ type: "text", text: "ERROR: BASE_PRIVATE_KEY not configured in MCP environment." }] };
            }
            try {
                const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || "https://mainnet.base.org");
                const wallet = new ethers.Wallet(pk, provider);
                const usdc = new ethers.Contract(USDC_ADDR, USDC_ABI, wallet);
                const membrane = new ethers.Contract(MEMBRANE_ADDR, MEMBRANE_ABI, wallet);
                // Generate deterministic 32-byte jobId
                const jobId = ethers.hexlify(crypto.randomBytes(32));
                const jobIdBytes = ethers.getBytes(jobId);
                // S3 metadata key = hex(sha256(jobId)) — Fracture 1 binding
                const s3Key = crypto.createHash('sha256').update(jobIdBytes).digest('hex');
                const metadataUrl = `s3://${S3_BUCKET}/${s3Key}_INBOUND.json`;
                // Check USDC balance
                const balance = await usdc.balanceOf(wallet.address);
                if (balance < 2000000n) {
                    return { content: [{ type: "text", text: `INSUFFICIENT_USDC: Balance ${balance} < 2000000 micro-USDC required for toll.` }] };
                }
                // Approve if needed
                const allowance = await usdc.allowance(wallet.address, MEMBRANE_ADDR);
                if (allowance < 2000000n) {
                    const approveTx = await usdc.approve(MEMBRANE_ADDR, ethers.MaxUint256);
                    await approveTx.wait(1);
                }
                // Open job on-chain
                const tx = await membrane.openJob(jobId, { gasLimit: 300000 });
                await tx.wait(1);
                const result = {
                    status: "JOB_OPENED",
                    jobId,
                    s3MetadataKey: s3Key,
                    metadataUrl,
                    txHash: tx.hash,
                    membrane: MEMBRANE_ADDR,
                    note: "Deposit off-chain payload JSON to metadataUrl. SovereignSiphon will poll for ZK proof and call settleExergy."
                };
                return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
            }
            catch (e) {
                return { content: [{ type: "text", text: `OPEN_JOB_ERROR: ${e.message}` }] };
            }
        }
        case "exergynet_estimate_gate": {
            const extCost = Number(args.externalComputeCostUsd) || 0;
            const setCost = Number(args.settlementCostUsd) || 0;
            const margin = Number(args.riskMarginUsd) || 0;
            const total = setCost + margin;
            if (extCost > total) {
                return { content: [{ type: "text", text: `ACTION: USE_EXERGYNET (Savings: $${(extCost - total).toFixed(4)})` }] };
            }
            else {
                return { content: [{ type: "text", text: `REJECT: Below threshold (Deficit: $${(total - extCost).toFixed(4)})` }] };
            }
        }
        case "exergynet_get_program_id":
            return { content: [{ type: "text", text: JSON.stringify({
                            solana_lnes03: LNES03_PROGRAM_ID,
                            base_lnes04: MEMBRANE_ADDR,
                            usdc_base: USDC_ADDR,
                            s3_sump: S3_BUCKET
                        }) }] };
        case "exergynet_verify_program": {
            const { Connection, PublicKey } = await import("@solana/web3.js");
            const rpcUrl = args.rpcUrl || "https://api.mainnet-beta.solana.com";
            const connection = new Connection(rpcUrl, "confirmed");
            const info = await connection.getAccountInfo(new PublicKey(LNES03_PROGRAM_ID));
            return { content: [{ type: "text", text: JSON.stringify({ exists: info !== null, executable: info?.executable }) }] };
        }
        case "exergynet_get_proof_transaction":
            return { content: [{ type: "text", text: PROOF_TX }] };
        default:
            throw new Error(`Tool not found: ${request.params.name}`);
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
