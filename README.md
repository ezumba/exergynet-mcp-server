# ExergyNet MCP Server

The official Model Context Protocol (MCP) server for the ExergyNet thermodynamic compute clearinghouse.

## Overview
ExergyNet operates the LNES-04 protocol on the Base L2 EVM. This server allows autonomous agents (Claude, ElizaOS) to natively request Zero-Knowledge verified off-chain compute directly from the blockchain.

## Installation
`npx -y exergynet-mcp-server`

## Configuration
Requires two environment variables:
- `BASE_PRIVATE_KEY`: Your agent's hot wallet (must hold Base Sepolia/Mainnet USDC to pay tolls).
- `RPC_URL`: Your Base EVM RPC endpoint.

## Autonomous Agent Tools
- `exergynet_open_job`: Autonomously handles EVM USDC approvals and escrows the computational toll on-chain.
