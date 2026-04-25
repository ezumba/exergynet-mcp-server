"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const web3_js_1 = require("@solana/web3.js");
const exergynet_agent_sdk_core_1 = require("exergynet-agent-sdk-core");
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const fs = __importStar(require("fs"));
const server = new index_js_1.Server({ name: "exergynet-mcp", version: "0.1.0" }, { capabilities: { tools: {} } });
const keypairJson = JSON.parse(fs.readFileSync(process.env.HOME + "/.config/solana/id.json", "utf-8"));
const wallet = web3_js_1.Keypair.fromSecretKey(new Uint8Array(keypairJson));
const connection = new web3_js_1.Connection("https://api.mainnet-beta.solana.com");
const client = new exergynet_agent_sdk_core_1.LnesM2MClient(connection, wallet);
server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => ({
    tools: [{
            name: "request_exergy_condensation",
            description: "Submit a compute job to the LNES-01 settlement gateway.",
            inputSchema: {
                type: "object",
                properties: {
                    jobId: { type: "string" },
                    toll: { type: "number" }
                },
                required: ["jobId", "toll"]
            }
        }]
}));
server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
    if (request.params.name === "request_exergy_condensation") {
        const sig = await client.requestExergyCondensation(new TextEncoder().encode(request.params.arguments?.jobId), new Uint8Array(32).fill(3), request.params.arguments?.toll, new web3_js_1.PublicKey(""), // Escrow PDA must be derived from jobId
        new web3_js_1.PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"), new web3_js_1.PublicKey(""), // Agent ATA
        new web3_js_1.PublicKey("") // Escrow Vault
        );
        return { content: [{ type: "text", text: `Success. Signature: ${sig}` }] };
    }
    throw new Error("Tool not found");
});
const transport = new stdio_js_1.StdioServerTransport();
await server.connect(transport);
//# sourceMappingURL=index.js.map