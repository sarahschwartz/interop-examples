import { createViemClient } from "@matterlabs/zksync-js/viem/client";
import { createViemSdk } from "@matterlabs/zksync-js/viem/sdk";
import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

import { L1_RPC_URL, L2_RPC_URL, zksyncOsTestnet } from "./constants";
import { env } from "./envConfig";

const EXECUTOR_PRIVATE_KEY = env.EXECUTOR_PRIVATE_KEY as `0x${string}`;

if (!EXECUTOR_PRIVATE_KEY) {
  console.error("❌ EXECUTOR_PRIVATE_KEY not found in .env file");
  process.exit(1);
}

// Clients
export const executorAccount = privateKeyToAccount(EXECUTOR_PRIVATE_KEY);

const l1 = createPublicClient({
  chain: sepolia,
  transport: http(L1_RPC_URL),
});

const l2 = createPublicClient({
  transport: http(L2_RPC_URL),
});

export const l1Wallet = createWalletClient({
  account: executorAccount,
  chain: sepolia,
  transport: http(L1_RPC_URL),
});

export const l2Wallet = createWalletClient({
  account: executorAccount,
  transport: http(L2_RPC_URL),
  chain: zksyncOsTestnet,
});

// Create ZKSync client
export const client = createViemClient({ l1, l2, l1Wallet, l2Wallet });
export const sdk = createViemSdk(client);
