import { encodeFunctionData } from "viem";

import { L2_BASE_TOKEN_ABI } from "~/utils/abis/abis";
import L1_BRIDGEHUB_ABI_JSON from "~/utils/abis/IL1Bridgehub.json";
import AAVE_POOL_ABI_JSON from "~/utils/abis/IPool.json";
import WETH_ABI_JSON from "~/utils/abis/IWETH.json";
import I_WRAPPED_TOKEN_ABI_JSON from "~/utils/abis/IWrappedTokenGatewayV3.json";
import L2_INTEROP_CENTER_ABI_JSON from "~/utils/abis/L2InteropCenter.json";
import {
  AAVE_CONTRACTS,
  BASE_TOKEN_ADDRESS,
  BRIDGEHUB_ADDRESS,
  L1_PUBLIC_CLIENT,
  L2_CHAIN_ID,
  L2_PUBLIC_CLIENT,
} from "~/utils/constants";

// L2 gas parameters for bridging
const L2_GAS_LIMIT = 300000n;
const L2_GAS_PER_PUBDATA = 800n;

/**
 * Get the shadow account address for an L2 address
 * This is the L1 address that will perform actions on behalf of the L2 account
 */
export async function getShadowAccount(l2Address: `0x${string}`) {
  const shadowAccount = await L2_PUBLIC_CLIENT.readContract({
    address: AAVE_CONTRACTS.l2InteropCenter,
    abi: L2_INTEROP_CENTER_ABI_JSON.abi,
    functionName: "l1ShadowAccount",
    args: [l2Address],
  });

  return shadowAccount as `0x${string}`;
}

export async function createAaveDepositBundle(amount: bigint, shadowAccount: `0x${string}`) {
  const withdrawData = encodeFunctionData({
    abi: L2_BASE_TOKEN_ABI,
    functionName: "withdraw",
    args: [shadowAccount],
  });

  // Encode the depositETH function call
  // This will be executed by the shadow account on L1
  const depositETHData = encodeFunctionData({
    abi: I_WRAPPED_TOKEN_ABI_JSON.abi,
    functionName: "depositETH",
    args: [
      AAVE_CONTRACTS.aavePool, // Aave pool address
      shadowAccount, // On behalf of (receives aTokens)
      0, // Referral code
    ],
  });

  // Create the operation bundle
  const ops = [
    {
      target: AAVE_CONTRACTS.aaveWeth, // WETH Gateway contract
      value: amount, // ETH to deposit
      data: depositETHData, // Function call data
    },
  ];

  return {
    withdrawCall: {
      to: BASE_TOKEN_ADDRESS,
      value: amount,
      data: withdrawData,
    },
    bundle: {
      address: AAVE_CONTRACTS.l2InteropCenter,
      abi: L2_INTEROP_CENTER_ABI_JSON.abi,
      functionName: "sendBundleToL1",
      args: [ops],
      value: 0n, // No value sent to L2InteropCenter itself
    },
  };
}

/**
 * Create a transaction bundle to withdraw ETH from Aave on L1
 */
export async function createAaveWithdrawBundle(
  amount: bigint,
  shadowAccount: `0x${string}`,
  l2Receiver: `0x${string}`,
) {
  // Calculate mintValue for L2 gas
  const gasPrice = await L1_PUBLIC_CLIENT.getGasPrice();
  const baseCost = (await L1_PUBLIC_CLIENT.readContract({
    address: BRIDGEHUB_ADDRESS,
    abi: L1_BRIDGEHUB_ABI_JSON.abi,
    functionName: "l2TransactionBaseCost",
    args: [L2_CHAIN_ID, gasPrice, L2_GAS_LIMIT, L2_GAS_PER_PUBDATA],
  })) as bigint;
  const mintValue = baseCost + (baseCost * 20n) / 100n; // 20% buffer

  // Step 1: Withdraw from Aave Pool (gets WETH)
  const withdrawData = encodeFunctionData({
    abi: AAVE_POOL_ABI_JSON.abi,
    functionName: "withdraw",
    args: [
      AAVE_CONTRACTS.aaveWethToken, // WETH asset address
      amount, // Amount to withdraw
      shadowAccount, // Recipient (gets WETH)
    ],
  });

  // Step 2: Unwrap WETH to ETH
  const unwrapData = encodeFunctionData({
    abi: WETH_ABI_JSON.abi,
    functionName: "withdraw",
    args: [amount], // Amount of WETH to unwrap
  });

  // Step 3: Bridge ETH back to L2
  // mintValue = base fee; total value sent = l2Value + mintValue
  const totalBridgeValue = mintValue + amount;

  const bridgeData = encodeFunctionData({
    abi: L1_BRIDGEHUB_ABI_JSON.abi,
    functionName: "requestL2TransactionDirect",
    args: [
      {
        chainId: L2_CHAIN_ID,
        mintValue: totalBridgeValue, // Exact fee + l2Value
        l2Contract: l2Receiver,
        l2Value: amount, // Amount to send to L2 contract as msg.value
        l2Calldata: "0x",
        l2GasLimit: L2_GAS_LIMIT,
        l2GasPerPubdataByteLimit: L2_GAS_PER_PUBDATA,
        factoryDeps: [],
        refundRecipient: l2Receiver,
      },
    ],
  });

  // Create the operation bundle
  const ops = [
    {
      target: AAVE_CONTRACTS.aavePool, // Aave Pool contract
      value: 0n,
      data: withdrawData, // Withdraw WETH from pool
    },
    {
      target: AAVE_CONTRACTS.aaveWethToken, // WETH contract
      value: 0n,
      data: unwrapData, // Unwrap WETH to ETH
    },
    {
      target: BRIDGEHUB_ADDRESS,
      value: totalBridgeValue, // Total ETH for bridge (gas + amount)
      data: bridgeData,
    },
  ];

  const data = encodeFunctionData({
    abi: L2_INTEROP_CENTER_ABI_JSON.abi,
    functionName: "sendBundleToL1",
    args: [ops],
  });

  return {
    to: AAVE_CONTRACTS.l2InteropCenter,
    value: 0n,
    data,
  };
}

/**
 * Get L2 withdrawal parameters for sending ETH to shadow account
 * This is the first step - withdraw from L2 to L1 shadow account
 */
export function getL2WithdrawalParams(amount: bigint, shadowAccount: `0x${string}`) {
  return {
    token: "0x0000000000000000000000000000000000000000", // ETH
    amount,
    to: shadowAccount,
  };
}

/**
 * Encode the full L2-to-L1 Aave deposit flow as calldata for UserOperation
 * This combines:
 * 1. L2 withdrawal to shadow account
 * 2. Bundle execution to deposit into Aave
 */
export async function encodeAaveDepositCalldata(amount: bigint, shadowAccount: `0x${string}`) {
  const { bundle, withdrawCall } = await createAaveDepositBundle(amount, shadowAccount);

  return {
    withdrawCall,
    bundleCall: {
      to: AAVE_CONTRACTS.l2InteropCenter,
      value: 0n,
      data: encodeFunctionData({
        abi: bundle.abi,
        functionName: bundle.functionName,
        args: bundle.args,
      }),
    },
  };
}
