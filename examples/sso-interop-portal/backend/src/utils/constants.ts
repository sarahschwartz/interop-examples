import { join } from "path";
import { defineChain } from "viem";

import { env } from "./envConfig";

// Contract addresses
export const L1_INTEROP_HANDLER = env.L1_INTEROP_HANDLER as `0x${string}`;
export const L2_INTEROP_CENTER = env.L2_INTEROP_CENTER as `0x${string}`;
export const BASE_TOKEN_ADDRESS: `0x${string}` = "0x000000000000000000000000000000000000800A";

// RPC URLs
export const L1_RPC_URL = env.L1_RPC_URL;
export const L2_RPC_URL = env.L2_RPC_URL;

// FILE PATHS
export const TXNS_STATE_FOLDER = join(__dirname, "txn-state");
export const PENDING_TXS_FILE = join(TXNS_STATE_FOLDER, "pending-txs.json");
export const FINALIZED_TXS_FILE = join(TXNS_STATE_FOLDER, "finalized-txs.json");

// ZKsync OS testnet chain info
export const zksyncOsTestnet = defineChain({
  id: 8022833,
  name: "ZKsync OS Developer Preview",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://zksync-os-testnet-alpha.zksync.dev/"],
      webSocket: ["wss://zksync-os-testnet-alpha.zksync.dev/ws"],
    },
    public: {
      http: ["https://zksync-os-testnet-alpha.zksync.dev/"],
      webSocket: ["wss://zksync-os-testnet-alpha.zksync.dev/ws"],
    },
  },
  blockExplorers: {
    default: {
      name: "ZKsync OS Explorer",
      url: "https://zksync-os-testnet-alpha.staging-scan-v2.zksync.dev",
    },
  },
});

// SSO contracts deployed on ZKsync OS testnet
export const SSO_CONTRACTS = {
  eoaValidator: "0xc6945fB9c35a5696E6FB0b23084B4409e2D945EA" as `0x${string}`,
  webauthnValidator: "0xD52c9b1bA249f877C8492F64c096E37a8072982A" as `0x${string}`,
  sessionValidator: "0x38Bf206f027B9c861643689CD516A3B00210586f" as `0x${string}`,
  guardianExecutor: "0x4337768cB3eC57Dd2cb843eFb929B773B13322de" as `0x${string}`,
  accountImplementation: "0x7235ea708874f733d70B604122BfC121468dFFF6" as `0x${string}`,
  beacon: "0x1dEedcF23b6970C30B9d82e18F27B0844bF37838" as `0x${string}`,
  factory: "0x121d7fB7D7B28eBcCf017A8175b8DD637C670BBc" as `0x${string}`,
  entryPoint: "0x4337084D9E255Ff0702461CF8895CE9E3b5Ff108" as `0x${string}`,
};
