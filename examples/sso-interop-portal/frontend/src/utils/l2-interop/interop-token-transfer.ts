import {
  type Address,
  concat,
  decodeEventLog,
  encodeAbiParameters,
  erc20Abi,
  type Hex,
  keccak256,
  type PublicClient,
  toHex,
  type TransactionReceipt,
  type WalletClient,
  zeroAddress,
  zeroHash,
} from "viem";

import {
  BUNDLE_ABI,
  INTEROP_BUNDLE_SENT_EVENT_ABI,
  INTEROP_CENTER_ABI,
  INTEROP_HANDLER_ABI,
  NATIVE_TOKEN_VAULT_ABI,
} from "../abis/abis";
import {
  CHAIN_A,
  CHAIN_B,
  CLIENT_CHAIN_A,
  CLIENT_CHAIN_B,
  INTEROP_CENTER_ADDRESS,
  INTEROP_HANDLER_ADDRESS,
  L2_ASSET_ROUTER_ADDRESS,
  L2_NATIVE_TOKEN_VAULT_ADDRESS,
  LOCAL_RICH_ACCOUNT,
  TOKEN_ADDRESS,
  WALLET_CHAIN_A,
  WALLET_CHAIN_B,
} from "../constants";
import type { ProofResponse } from "../types";
import {
  buildSecondBridgeCalldata,
  computeAssetId,
  formatEvmV1,
  formatEvmV1AddressOnly,
  waitForL2ToL1LogProof,
  waitUntilRootBecomesAvailable,
} from "./interop-utils";

/**
 * Transfer ERC20 tokens between chains using interop
 * WARNING: This function uses a known private key
 * This is used on the frontend for demo purposes only
 * NEVER use a private key on a frontend in production
 */
export async function transferTokensInterop(
  tokenAddress: Address,
  amount: bigint,
  isAToB: boolean,
  onProgress: (step: string) => void,
) {
  try {
    onProgress("Starting token transfer...");

    const providerA = isAToB ? CLIENT_CHAIN_A : CLIENT_CHAIN_B;
    const providerB = isAToB ? CLIENT_CHAIN_B : CLIENT_CHAIN_A;

    const sourceChainId = isAToB ? CHAIN_A.id : CHAIN_B.id;
    const destChainId = isAToB ? CHAIN_B.id : CHAIN_A.id;
    const walletSource = isAToB ? WALLET_CHAIN_A : WALLET_CHAIN_B;
    const walletDest = isAToB ? WALLET_CHAIN_B : WALLET_CHAIN_A;

    // Step 1: Check if token is registered, register if needed
    await checkTokenRegistration(providerA, tokenAddress, walletSource, onProgress);

    // Step 2: Approve tokens
    await approveTokens(providerA, tokenAddress, walletSource, amount, onProgress);

    // Step 3: Build interop bundle
    const { calls, bundleAttributes } = await buildInteropBundle(amount, LOCAL_RICH_ACCOUNT.address, onProgress);

    // Step 4: Send bundle
    const sendReceipt = await sendBundle(destChainId, providerA, calls, bundleAttributes, walletSource, onProgress);

    // Step 5: Wait for proof
    onProgress("Step 5/6: Waiting for proof...");
    const logProof = await waitForL2ToL1LogProof(
      providerA,
      sendReceipt.blockNumber,
      sendReceipt.transactionHash,
      onProgress,
    );

    // Step 6: Wait for interop root to update
    const result = await waitForFinalRoot(providerB, sourceChainId, logProof, sendReceipt, walletDest, onProgress);
    return {
      sendTxHash: result.sendTxHash,
      executeTxHash: result.executeTxHash,
      amount,
      isAToB,
    };
  } catch (error) {
    console.error("Token transfer failed:", error);
    throw error;
  }
}

async function checkTokenRegistration(
  providerA: PublicClient,
  tokenAddress: Address,
  walletSource: WalletClient,
  onProgress: (step: string) => void,
) {
  onProgress("Step 1/6: Checking token registration...");
  try {
    const existingAssetId = await providerA.readContract({
      address: L2_NATIVE_TOKEN_VAULT_ADDRESS,
      abi: NATIVE_TOKEN_VAULT_ABI,
      functionName: "assetId",
      args: [tokenAddress],
    });
    if (existingAssetId && existingAssetId !== zeroHash) {
      onProgress("✓ Token already registered");
    } else {
      throw new Error("Token not registered");
    }
  } catch {
    onProgress("Registering token...");
    const registeredHash = await walletSource.writeContract({
      address: L2_NATIVE_TOKEN_VAULT_ADDRESS,
      abi: NATIVE_TOKEN_VAULT_ABI,
      functionName: "ensureTokenIsRegistered",
      args: [tokenAddress],
      chain: walletSource.chain,
      account: walletSource.account!,
    });
    await providerA.waitForTransactionReceipt({ hash: registeredHash });
    onProgress("✓ Token registered");
  }
}

async function approveTokens(
  providerA: PublicClient,
  tokenAddress: Address,
  walletSource: WalletClient,
  amount: bigint,
  onProgress: (step: string) => void,
) {
  onProgress("Step 2/6: Approving tokens...");
  const approveHash = await walletSource.writeContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "approve",
    args: [L2_NATIVE_TOKEN_VAULT_ADDRESS, amount],
    chain: walletSource.chain,
    account: walletSource.account!,
  });
  await providerA.waitForTransactionReceipt({ hash: approveHash });
  onProgress("✓ Tokens approved");
}

async function buildInteropBundle(amount: bigint, recipientAddress: Address, onProgress: (step: string) => void) {
  onProgress("Step 3/6: Building interop bundle...");
  // Use original token info for asset ID to ensure consistency across chains
  const assetId = computeAssetId(BigInt(CHAIN_A.id), TOKEN_ADDRESS);

  const secondBridgeCalldata = buildSecondBridgeCalldata(assetId, amount, recipientAddress, zeroAddress);

  const indirectCallSelector = keccak256(toHex("indirectCall(uint256)")).slice(0, 10);

  const callAttributes = [indirectCallSelector + encodeAbiParameters([{ type: "uint256" }], [0n]).slice(2)] as Hex[];

  const calls = [
    {
      to: formatEvmV1AddressOnly(L2_ASSET_ROUTER_ADDRESS),
      data: secondBridgeCalldata,
      callAttributes: callAttributes,
    },
  ];
  // Build bundle attributes
  const unbundlerAddressSelector = keccak256(toHex("unbundlerAddress(bytes)")).slice(0, 10);

  const unbundlerPayload = encodeAbiParameters([{ type: "bytes" }], [formatEvmV1AddressOnly(recipientAddress)]);

  const bundleAttributes: Hex[] = [(unbundlerAddressSelector + unbundlerPayload.slice(2)) as Hex];

  return { calls, bundleAttributes };
}

async function sendBundle(
  destChainId: number,
  providerA: PublicClient,
  calls: {
    to: Address;
    data: Hex;
    callAttributes: Hex[];
  }[],
  bundleAttributes: Hex[],
  walletSource: WalletClient,
  onProgress: (step: string) => void,
) {
  onProgress("Step 4/6: Sending interop bundle...");

  let sendTx;
  try {
    const tx = {
      address: INTEROP_CENTER_ADDRESS,
      abi: INTEROP_CENTER_ABI,
      functionName: "sendBundle",
      args: [formatEvmV1(BigInt(destChainId)), calls, bundleAttributes],
      chain: walletSource.chain,
      account: walletSource.account!,
      gas: 5_000_000n,
      gasPrice: 1_000_000_000n,
    } as const;
    sendTx = await walletSource.writeContract(tx);

    onProgress(`✓ Bundle sent: ${sendTx}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("SendBundle call failed:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      data: error.data,
    });

    throw new Error(`Failed to send bundle: ${error.message}`);
  }

  const sendReceipt = await providerA.waitForTransactionReceipt({ hash: sendTx });

  // Check if transaction succeeded
  if (sendReceipt.status != "success") {
    throw new Error(
      `SendBundle transaction reverted. Tx: ${sendTx}. This usually means InteropCenter rejected the bundle.`,
    );
  }

  onProgress(`✓ Mined in block ${sendReceipt.blockNumber}`);
  return sendReceipt;
}

async function waitForFinalRoot(
  providerB: PublicClient,
  sourceChainId: number,
  logProof: ProofResponse,
  sendReceipt: TransactionReceipt,
  walletDest: WalletClient,
  onProgress: (step: string) => void,
) {
  onProgress("Step 6/6: Waiting for interop root...");

  await waitUntilRootBecomesAvailable(
    providerB,
    BigInt(sourceChainId),
    logProof.batch_number,
    logProof.root,
    onProgress,
  );
  // Extract bundle from receipt
  onProgress("Extracting bundle from receipt...");

  let interopBundle;

  for (const log of sendReceipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: INTEROP_BUNDLE_SENT_EVENT_ABI,
        data: log.data,
        topics: log.topics,
      });

      if (decoded.eventName === "InteropBundleSent") {
        interopBundle = decoded.args.interopBundle;
        break;
      }
    } catch {
      // log doesn't match this event — ignore
    }
  }

  if (!interopBundle) {
    throw new Error("InteropBundleSent event not found in receipt");
  }

  // Encode bundle
  const encodedBundle = encodeAbiParameters(BUNDLE_ABI, [interopBundle]);

  const BUNDLE_IDENTIFIER = "0x01";
  const l2ToL1Message = concat([BUNDLE_IDENTIFIER, encodedBundle]);

  // Build message inclusion proof
  const messageInclusionProof = {
    chainId: BigInt(sourceChainId),
    l1BatchNumber: logProof.batch_number,
    l2MessageIndex: logProof.id,
    message: {
      // expected only for local chains
      // TODO: fix for cases where index is not always 0
      txNumberInBatch: 0,
      sender: INTEROP_CENTER_ADDRESS,
      data: l2ToL1Message,
    },
    proof: logProof.proof,
  };

  // Execute bundle on destination chain
  onProgress("Executing bundle on destination chain...");
  const executeTxHash = await walletDest.writeContract({
    address: INTEROP_HANDLER_ADDRESS,
    abi: INTEROP_HANDLER_ABI,
    functionName: "executeBundle",
    args: [encodedBundle, messageInclusionProof],
    chain: walletDest.chain,
    account: walletDest.account!,
  });

  onProgress(`✓ Execute tx: ${executeTxHash}`);
  const executeReceipt = await providerB.waitForTransactionReceipt({ hash: executeTxHash });

  if (executeReceipt.status !== "success") {
    throw new Error("Execute bundle transaction failed");
  }
  console.log("bundle executed");

  onProgress("✓ Token transfer complete!");

  return {
    sendTxHash: sendReceipt.transactionHash,
    executeTxHash: executeTxHash,
    batchNumber: logProof.batch_number,
    messageIndex: logProof.id,
  };
}
