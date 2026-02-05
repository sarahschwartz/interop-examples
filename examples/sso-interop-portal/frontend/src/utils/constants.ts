import { type Address, createPublicClient, createWalletClient, defineChain, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

// LocalStorage keys
export const STORAGE_KEY_PASSKEY = "zksync_sso_passkey";
export const STORAGE_KEY_ACCOUNT = "zksync_sso_account";
export const STORAGE_KEY_LANGUAGE = "zksync-interop-demo-language";

export const BUNDLER_URL = "https://bundler-api.stage-sso.zksync.dev";

export const BACKEND_URL = import.meta.env?.VITE_BACKEND_URL || "http://localhost:4340";
export const STATUS_ENDPOINT = `${BACKEND_URL}/status`;
export const DEPLOY_ACCOUNT_ENDPOINT = `${BACKEND_URL}/deploy-account`;
export const FAUCET_ENDPOINT = `${BACKEND_URL}/faucet`;
export const SUBMIT_INTEROP_TX_ENDPOINT = `${BACKEND_URL}/new-l1-interop-tx`;
export const L2_EXPLORER_BASE = "https://zksync-os-testnet-alpha.staging-scan-v2.zksync.dev/tx/";
export const L1_EXPLORER_BASE = "https://sepolia.etherscan.io/tx/";

export const DEFAULT_ZKSYNC_OS_RPC_URL = "https://zksync-os-testnet-alpha.zksync.dev/";

export const SHOW_INTEROP = import.meta.env?.VITE_SHOW_INTEROP === "true";

// ZKsync OS configuration
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
      http: [DEFAULT_ZKSYNC_OS_RPC_URL],
      webSocket: ["wss://zksync-os-testnet-alpha.zksync.dev/ws"],
    },
    public: {
      http: [DEFAULT_ZKSYNC_OS_RPC_URL],
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

// Setup public client for balance checks FIRST
export const L2_PUBLIC_CLIENT = createPublicClient({
  chain: zksyncOsTestnet,
  transport: http(DEFAULT_ZKSYNC_OS_RPC_URL),
});

// Setup Sepolia client for L1 balance checks
export const L1_PUBLIC_CLIENT = createPublicClient({
  chain: sepolia,
  transport: http(sepolia.rpcUrls.default.http[0]),
});

export const ssoContracts = {
  eoaValidator: "0xc6945fB9c35a5696E6FB0b23084B4409e2D945EA" as `0x${string}`,
  webauthnValidator: "0xD52c9b1bA249f877C8492F64c096E37a8072982A" as `0x${string}`,
  sessionValidator: "0x38Bf206f027B9c861643689CD516A3B00210586f" as `0x${string}`,
  guardianExecutor: "0x4337768cB3eC57Dd2cb843eFb929B773B13322de" as `0x${string}`,
  accountImplementation: "0x7235ea708874f733d70B604122BfC121468dFFF6" as `0x${string}`,
  beacon: "0x1dEedcF23b6970C30B9d82e18F27B0844bF37838" as `0x${string}`,
  factory: "0x121d7fB7D7B28eBcCf017A8175b8DD637C670BBc" as `0x${string}`,
  entryPoint: "0x4337084D9E255Ff0702461CF8895CE9E3b5Ff108" as `0x${string}`,
};

// TODO: use this once new SSO SDK is ready and add to .env.example
// export const RP_ID = import.meta.env?.VITE_RP_ID || "localhost";

/* *********** L1 <-> L2 INTEROP CONSTANTS *********** */

// Contract addresses on Sepolia (L1)
export const AAVE_CONTRACTS: { [key: string]: `0x${string}` } = {
  // L2 Contract (ZKSync OS Testnet)
  l2InteropCenter: "0xc64315efbdcD90B71B0687E37ea741DE0E6cEFac",

  // L1 Contracts (Sepolia)
  aavePool: "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951",
  aaveWeth: "0x387d311e47e80b498169e6fb51d3193167d89F7D", // Wrapped Token Gateway
  aaveWethToken: "0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c",
  aToken: "0x5b071b590a59395fE4025A0Ccc1FcC931AAc1830",
  ghoToken: "0xc4bF5CbDaBE595361438F8c6a187bDc330539c60",
};

export const BASE_TOKEN_ADDRESS: `0x${string}` = "0x000000000000000000000000000000000000800A";
// ZKSync L1 Bridge address (Sepolia)
export const BRIDGEHUB_ADDRESS = "0xc4FD2580C3487bba18D63f50301020132342fdbD";

// ZKSync Chain ID (ZKSync OS Testnet)
export const L2_CHAIN_ID = 8022833n;

/* *********** L2 <-> L2 INTEROP CONSTANTS *********** */

// Local chain configuration
export const CHAIN_A_RPC = "http://localhost:3050";
export const CHAIN_B_RPC = "http://localhost:3051";

export const CHAIN_A = defineChain({
  id: 6565,
  name: "LOCAL CHAIN A",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [CHAIN_A_RPC],
    },
  },
});

export const CHAIN_B = defineChain({
  id: 6566,
  name: "LOCAL CHAIN B",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [CHAIN_B_RPC],
    },
  },
});

// Rich wallet private key from local anvil node
export const LOCAL_RICH_WALLET_PRIVATE_KEY = "0x7726827caac94a7f9e1b160f7ea819f172f7b6f9d2a97f992c38edeab82d4110";

export const CLIENT_CHAIN_A = createPublicClient({
  chain: CHAIN_A,
  transport: http(CHAIN_A_RPC),
});
export const CLIENT_CHAIN_B = createPublicClient({
  chain: CHAIN_B,
  transport: http(CHAIN_B_RPC),
});
export const LOCAL_RICH_ACCOUNT = privateKeyToAccount(LOCAL_RICH_WALLET_PRIVATE_KEY);
export const WALLET_CHAIN_A = createWalletClient({
  account: LOCAL_RICH_ACCOUNT,
  chain: CHAIN_A,
  transport: http(CHAIN_A_RPC),
});
export const WALLET_CHAIN_B = createWalletClient({
  account: LOCAL_RICH_ACCOUNT,
  chain: CHAIN_B,
  transport: http(CHAIN_B_RPC),
});

// Token transfer functionality
// Can be set via VITE_TOKEN_ADDRESS environment variable
export const TOKEN_ADDRESS = import.meta.env?.VITE_TOKEN_ADDRESS || "0xe441CF0795aF14DdB9f7984Da85CD36DB1B8790d";

// System contract addresses
export const L1_MESSENGER_ADDRESS: Address = "0x0000000000000000000000000000000000008008";
export const L2_MESSAGE_VERIFICATION_ADDRESS: Address = "0x0000000000000000000000000000000000010009";
export const INTEROP_CENTER_ADDRESS: Address = "0x000000000000000000000000000000000001000d";
export const INTEROP_HANDLER_ADDRESS: Address = "0x000000000000000000000000000000000001000e";
export const L2_ASSET_ROUTER_ADDRESS: Address = "0x0000000000000000000000000000000000010003";
export const L2_NATIVE_TOKEN_VAULT_ADDRESS: Address = "0x0000000000000000000000000000000000010004";
export const L2_INTEROP_ROOT_STORAGE: Address = "0x0000000000000000000000000000000000010008";

// Encoding version for bridge data
export const NEW_ENCODING_VERSION = "0x01";
