/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  type Address,
  concat,
  encodeAbiParameters,
  erc20Abi,
  getContract,
  type Hex,
  keccak256,
  type PublicClient,
  toBytes,
  toHex,
  zeroAddress,
  zeroHash,
} from "viem";

import { INTEROP_ROOT_STORAGE_ABI, NATIVE_TOKEN_VAULT_ABI } from "../abis/abis";
import {
  CHAIN_A,
  L2_INTEROP_ROOT_STORAGE,
  L2_NATIVE_TOKEN_VAULT_ADDRESS,
  NEW_ENCODING_VERSION,
  TOKEN_ADDRESS,
} from "../constants";
import type { ProofResponse } from "../types";

/**
 * Convert chainid to minimal bytes representation
 */
function toChainReferenceHex(chainid: bigint): Hex {
  if (chainid === 0n) return "0x00";
  // toHex(chainid) can be "0x1" etc; toBytes/toHex normalizes to even-length hex
  return toHex(toBytes(toHex(chainid)));
}

/**
 * Format ERC-7930 interoperable address for EVM chain without address
 */

export function formatEvmV1(chainid: bigint): Hex {
  const chainRefHex = toChainReferenceHex(chainid);

  // chainRefLength is byte-length, so use bytes length, not hex string length
  const chainRefLen = toBytes(chainRefHex).length;

  return concat([
    "0x00010000",
    toHex(chainRefLen, { size: 1 }),
    chainRefHex,
    "0x00", // same as toHex(0,{size:1})
  ]);
}

/**
 * Format ERC-7930 interoperable address with just address (no chain reference)
 */
export function formatEvmV1AddressOnly(addr: Address): Hex {
  return concat([
    "0x000100000014", // version (0x0001) + chainType (0x0000) + chainRefLength (0x00) + addrLength (0x14 = 20)
    addr,
  ]);
}

/**
 * Compute asset ID
 */
export function computeAssetId(chainId: bigint, tokenAddress: Address): Hex {
  const encoded = encodeAbiParameters(
    [{ type: "uint256" }, { type: "address" }, { type: "address" }],
    [chainId, L2_NATIVE_TOKEN_VAULT_ADDRESS, tokenAddress],
  );

  return keccak256(encoded);
}

/**
 * Encode bridge burn data
 */
export function encodeBridgeBurnData(amount: bigint, receiver: Address, tokenAddress: Address): Hex {
  return encodeAbiParameters(
    [{ type: "uint256" }, { type: "address" }, { type: "address" }],
    [amount, receiver, tokenAddress],
  );
}

/**
 * Encode asset router bridgehub deposit data
 */
export function encodeAssetRouterBridgehubDepositData(
  assetId: Hex,
  transferData: Hex, // if you truly have a string, make sure it's a 0x-prefixed hex string
): Hex {
  const encoded = encodeAbiParameters([{ type: "bytes32" }, { type: "bytes" }], [assetId, transferData]);
  return concat([NEW_ENCODING_VERSION, encoded]);
}

/**
 * Build second bridge calldata
 */
export function buildSecondBridgeCalldata(assetId: Hex, amount: bigint, receiver: Address, tokenAddress: Address) {
  const inner = encodeBridgeBurnData(amount, receiver, tokenAddress);
  return encodeAssetRouterBridgehubDepositData(assetId, inner);
}

export async function waitUntilBlockFinalized(
  client: PublicClient,
  blockNumber: bigint,
  onProgress: (step: any) => void,
) {
  onProgress("Waiting for block to be finalized...");
  const POLL_INTERVAL = 100;
  const DEFAULT_TIMEOUT = 60_000;
  let retries = Math.floor(DEFAULT_TIMEOUT / POLL_INTERVAL);

  while (retries > 0) {
    try {
      const block = await client.getBlock({ blockTag: "finalized" });
      const executedBlock = block ? Number(block.number) : 0;

      if (executedBlock >= blockNumber) {
        onProgress("✓ Block finalized");
        return;
      }
    } catch {
      // Ignore errors, keep retrying
    }

    retries -= 1;
    await new Promise((res) => setTimeout(res, POLL_INTERVAL));
  }

  throw new Error("Block was not finalized in time");
}

export async function waitForL2ToL1LogProof(
  client: PublicClient,
  blockNumber: bigint,
  txHash: Hex,
  onProgress: (step: any) => void,
) {
  await waitUntilBlockFinalized(client, blockNumber, onProgress);

  onProgress("Waiting for log proof...");

  // Poll for log proof
  const POLL_INTERVAL = 500;
  const MAX_RETRIES = 240; // Increased to 120 seconds (2 minutes)
  let retries = MAX_RETRIES;
  let lastError = null;

  while (retries > 0) {
    try {
      const proof: ProofResponse | undefined = await client.request({
        method: "zks_getL2ToL1LogProof" as any,
        params: [txHash, 0 as any],
      });

      // Log progress every 10 retries (every 5 seconds)
      if (retries % 10 === 0) {
        onProgress(`Checking log proof... (${retries} retries remaining)`);
      }

      if (proof) {
        onProgress("✓ Log proof available");
        return proof;
      }
    } catch (error: any) {
      lastError = error;
      // Log errors occasionally for debugging
      if (retries % 10 === 0) {
        console.warn("Error getting log proof:", error.message);
      }
    }

    retries -= 1;
    await new Promise((res) => setTimeout(res, POLL_INTERVAL));
  }

  throw new Error(`Log proof did not become available in time. Last error: ${lastError?.message || "none"}`);
}

/**
 * Wait for interop root to become available on destination chain
 */
export async function waitUntilRootBecomesAvailable(
  publicClient: PublicClient,
  chainId: bigint,
  batchNumber: bigint,
  expectedRoot: `0x${string}`,
  onProgress: (step: string) => void,
) {
  onProgress(`Waiting for interop root on destination chain...`);

  console.log("Waiting for interop root:", {
    chainId: chainId.toString(),
    batchNumber: batchNumber.toString(),
    expectedRoot,
  });

  const POLL_INTERVAL = 1_000;
  const DEFAULT_TIMEOUT = 300_000;
  let retries = Math.floor(DEFAULT_TIMEOUT / POLL_INTERVAL);
  let lastLogTime = Date.now();

  while (retries > 0) {
    let root;

    try {
      root = await publicClient.readContract({
        address: L2_INTEROP_ROOT_STORAGE,
        abi: INTEROP_ROOT_STORAGE_ABI,
        functionName: "interopRoots",
        args: [chainId, batchNumber],
      });
    } catch {
      root = null;
    }

    // Log every 10 seconds
    if (Date.now() - lastLogTime > 10_000) {
      console.log(`Still waiting... Current root: ${root}, Expected: ${expectedRoot}, Retries left: ${retries}`);
      lastLogTime = Date.now();
    }

    if (root && root !== zeroHash) {
      console.log(`Root found: ${root}`);

      if (typeof root === "string" && root.toLowerCase() === expectedRoot.toLowerCase()) {
        onProgress("✓ Interop root available");
        return;
      }

      throw new Error(`Interop root mismatch: expected ${expectedRoot}, got ${root}`);
    }

    retries -= 1;
    await new Promise((res) => setTimeout(res, POLL_INTERVAL));
  }

  throw new Error("Interop root did not become available in time");
}

/**
 * Get token balance for an address
 */
export async function getTokenBalance(tokenAddress: Address, ownerAddress: Address, publicClient: PublicClient) {
  const token = getContract({
    address: tokenAddress,
    abi: erc20Abi,
    client: { public: publicClient },
  });

  return await token.read.balanceOf([ownerAddress]);
}

/**
 * Get wrapped token address on destination chain
 */
export async function getWrappedTokenAddress(publicClient: PublicClient): Promise<Address | null> {
  const assetId = computeAssetId(BigInt(CHAIN_A.id), TOKEN_ADDRESS);

  const vault = getContract({
    address: L2_NATIVE_TOKEN_VAULT_ADDRESS,
    abi: NATIVE_TOKEN_VAULT_ABI,
    client: { public: publicClient },
  });

  try {
    // If your ABI defines tokenAddress(bytes32) -> address
    const wrappedAddress = (await vault.read.tokenAddress([assetId])) as Address;

    if (wrappedAddress && wrappedAddress !== zeroAddress) {
      return wrappedAddress;
    }
  } catch {
    // Token not yet bridged (or call reverts)
  }

  return null;
}
