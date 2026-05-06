#!/usr/bin/env node
// KINEMATIC BYPASS: PHANTOM CREDENTIALS FOR SMITHERY SANDBOX
process.env.BASE_PRIVATE_KEY = process.env.BASE_PRIVATE_KEY || '0x1111111111111111111111111111111111111111111111111111111111111111';
process.env.RPC_URL = process.env.RPC_URL || 'https://base-sepolia-rpc.publicnode.com';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { Connection, PublicKey } from "@solana/web3.js";
const EXERGYNET_PROGRAM_ID = "Fe8KhdiFWhKcPWH2N2Svqc3VSpK9EzN8nMh9pQ3cPCeD";
const PROOF_TRANSACTION = "5ZB3LmFMHfuicuT6jQ6gG6v4ny1e5BVQgi1VqkbrA5LriLBzaHUVrDCkmrcgv9jbmyyKtXgsfNwy2daqGqyCgi9h";
const DEFAULT_RPC = "https://api.mainnet-beta.solana.com";
const server = new Server({ name: "exergynet-mcp-server", version: "0.1.4" }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
        { name: "exergynet_get_program_id", description: "Return the Mainnet LNES-01 program ID.", inputSchema: { type: "object", properties: {} } },
        { name: "exergynet_verify_program", description: "Check if LNES-01 is live on Mainnet.", inputSchema: { type: "object", properties: { rpcUrl: { type: "string" } }, additionalProperties: false } },
        { name: "exergynet_get_proof_transaction", description: "Return the proven SettleExergy transaction signature.", inputSchema: { type: "object", properties: {} } },
        {
            name: "exergynet_estimate_gate",
            description: "Calculate exergy-gate profitability.",
            inputSchema: {
                type: "object",
                required: ["externalComputeCostUsd", "settlementCostUsd"],
                properties: {
                    externalComputeCostUsd: { type: "number" },
                    settlementCostUsd: { type: "number" },
                    riskMarginUsd: { type: "number" }
                }
            }
        }
    ]
}));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const args = (request.params.arguments || {});
    switch (request.params.name) {
        case "exergynet_get_program_id": return { content: [{ type: "text", text: EXERGYNET_PROGRAM_ID }] };
        case "exergynet_verify_program": {
            const rpcUrl = args.rpcUrl || DEFAULT_RPC;
            const connection = new Connection(rpcUrl, "confirmed");
            const info = await connection.getAccountInfo(new PublicKey(EXERGYNET_PROGRAM_ID));
            return { content: [{ type: "text", text: JSON.stringify({ exists: info !== null, executable: info?.executable }) }] };
        }
        case "exergynet_get_proof_transaction": return { content: [{ type: "text", text: PROOF_TRANSACTION }] };
        case "exergynet_estimate_gate": {
            // Corrected Math Evaluation Matrix
            const extCost = Number(args.externalComputeCostUsd) || 0;
            const setCost = Number(args.settlementCostUsd) || 0;
            const margin = Number(args.riskMarginUsd) || 0;
            const totalCost = setCost + margin;
            if (extCost > totalCost) {
                return { content: [{ type: "text", text: `ACTION: USE_EXERGYNET (Margin: ${(extCost - totalCost).toFixed(2)})` }] };
            }
            else {
                return { content: [{ type: "text", text: `REJECT: Below threshold. (Deficit: ${(totalCost - extCost).toFixed(2)})` }] };
            }
        }
        default: throw new Error("Tool not found");
    }
});
async function run() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
run().catch((error) => {
    console.error("[exergynet-mcp-server] FATAL:", error);
    process.exit(1);
});
