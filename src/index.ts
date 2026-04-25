#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import { Connection, PublicKey } from "@solana/web3.js";

const EXERGYNET_PROGRAM_ID =
  "Fe8KhdiFWhKcPWH2N2Svqc3VSpK9EzN8nMh9pQ3cPCeD";

const PROOF_TRANSACTION =
  "5ZB3LmFMHfuicuT6jQ6gG6v4ny1e5BVQgi1VqkbrA5LriLBzaHUVrDCkmrcgv9jbmyyKtXgsfNwy2daqGqyCgi9h";

const DEFAULT_RPC =
  process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";

function jsonText(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(value, null, 2)
      }
    ]
  };
}

const server = new Server(
  {
    name: "exergynet-mcp-server",
    version: "0.1.3"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "exergynet_get_metadata",
        description:
          "Return machine-readable ExergyNet and LNES-01 protocol metadata.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false
        }
      },
      {
        name: "exergynet_get_program_id",
        description:
          "Return the Solana Mainnet-Beta program ID for LNES-01.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false
        }
      },
      {
        name: "exergynet_verify_program",
        description:
          "Check whether the LNES-01 program account exists and is executable on Solana Mainnet-Beta.",
        inputSchema: {
          type: "object",
          properties: {
            rpcUrl: {
              type: "string",
              description:
                "Optional Solana RPC URL. Defaults to https://api.mainnet-beta.solana.com."
            }
          },
          additionalProperties: false
        }
      },
      {
        name: "exergynet_get_proof_transaction",
        description:
          "Return the proven SettleExergy transaction signature and Solscan URL.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false
        }
      },
      {
        name: "exergynet_estimate_gate",
        description:
          "Estimate whether a compute job clears the ExergyNet economic gate.",
        inputSchema: {
          type: "object",
          required: ["externalComputeCostUsd", "settlementCostUsd"],
          properties: {
            externalComputeCostUsd: {
              type: "number",
              description:
                "Estimated cost or value of performing the useful compute externally."
            },
            settlementCostUsd: {
              type: "number",
              description:
                "Estimated settlement, proof, transaction, and execution cost."
            },
            riskMarginUsd: {
              type: "number",
              description:
                "Optional additional risk margin in USD."
            }
          },
          additionalProperties: false
        }
      },
      {
        name: "exergynet_get_urls",
        description:
          "Return canonical ExergyNet URLs for agents, docs, metadata, and registry references.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const args = (request.params.arguments || {}) as Record<string, unknown>;

  switch (request.params.name) {
    case "exergynet_get_metadata": {
      return jsonText({
        protocol: "ExergyNet",
        kernel: "LNES-01",
        description:
          "Machine-to-machine settlement interface for useful compute work on Solana.",
        network: "solana-mainnet-beta",
        program_id: EXERGYNET_PROGRAM_ID,
        npm_sdk: "lnes-agent-sdk-core",
        mcp_server: "exergynet-mcp-server",
        settlement_asset: "USDC",
        proof_transaction: PROOF_TRANSACTION,
        website: "https://exergynet.org",
        metadata: "https://exergynet.org/.well-known/exergynet.json",
        llms: "https://exergynet.org/llms.txt",
        agent_manifest: "https://exergynet.org/agent-manifest.json",
        docs: "https://exergynet.org/docs.html",
        mcp_docs: "https://exergynet.org/mcp.html",
        npm_mcp: "https://www.npmjs.com/package/exergynet-mcp-server",
        npm_sdk: "https://www.npmjs.com/package/lnes-agent-sdk-core"
      });
    }

    case "exergynet_get_program_id": {
      return {
        content: [
          {
            type: "text",
            text: EXERGYNET_PROGRAM_ID
          }
        ]
      };
    }

    case "exergynet_verify_program": {
      const rpcUrl =
        typeof args.rpcUrl === "string" && args.rpcUrl.length > 0
          ? args.rpcUrl
          : DEFAULT_RPC;

      const connection = new Connection(rpcUrl, "confirmed");
      const accountInfo = await connection.getAccountInfo(
        new PublicKey(EXERGYNET_PROGRAM_ID)
      );

      return jsonText({
        rpcUrl,
        program_id: EXERGYNET_PROGRAM_ID,
        exists: accountInfo !== null,
        executable: accountInfo?.executable === true,
        owner: accountInfo?.owner?.toBase58() || null,
        lamports: accountInfo?.lamports || null
      });
    }

    case "exergynet_get_proof_transaction": {
      return jsonText({
        transaction: PROOF_TRANSACTION,
        solscan: "https://solscan.io/tx/" + PROOF_TRANSACTION,
        program_id: EXERGYNET_PROGRAM_ID,
        instruction: "SettleExergy",
        settlement_asset: "USDC",
        status: "confirmed-mainnet-execution"
      });
    }

    case "exergynet_estimate_gate": {
      const externalComputeCostUsd = Number(args.externalComputeCostUsd);
      const settlementCostUsd = Number(args.settlementCostUsd);
      const riskMarginUsd =
        args.riskMarginUsd === undefined ? 0 : Number(args.riskMarginUsd);

      if (
        !Number.isFinite(externalComputeCostUsd) ||
        !Number.isFinite(settlementCostUsd) ||
        !Number.isFinite(riskMarginUsd)
      ) {
        throw new Error(
          "externalComputeCostUsd, settlementCostUsd, and riskMarginUsd must be finite numbers."
        );
      }

      const totalCostUsd = settlementCostUsd + riskMarginUsd;
      const marginUsd = externalComputeCostUsd - totalCostUsd;
      const clearsGate = externalComputeCostUsd > totalCostUsd;

      return jsonText({
        externalComputeCostUsd,
        settlementCostUsd,
        riskMarginUsd,
        totalCostUsd,
        marginUsd,
        clearsGate,
        decision: clearsGate
          ? "USE_EXERGYNET"
          : "REJECT_JOB_BELOW_GATE"
      });
    }

    case "exergynet_get_urls": {
      return jsonText({
        website: "https://exergynet.org",
        docs: "https://exergynet.org/docs.html",
        mcp_docs: "https://exergynet.org/mcp.html",
        proof: "https://exergynet.org/proof.html",
        agents: "https://exergynet.org/agents.html",
        metadata: "https://exergynet.org/.well-known/exergynet.json",
        llms: "https://exergynet.org/llms.txt",
        agent_manifest: "https://exergynet.org/agent-manifest.json",
        npm_mcp: "https://www.npmjs.com/package/exergynet-mcp-server",
        npm_sdk: "https://www.npmjs.com/package/lnes-agent-sdk-core",
        solscan_program:
          "https://solscan.io/account/" + EXERGYNET_PROGRAM_ID,
        solscan_proof:
          "https://solscan.io/tx/" + PROOF_TRANSACTION
      });
    }

    default:
      throw new Error(`Unknown tool: ${request.params.name}`);
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("[exergynet-mcp-server] fatal:", error);
  process.exit(1);
});
