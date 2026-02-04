import { stringToHex } from "viem";

import { I_L1_MESSENGER_ABI, MESSAGE_VERIFICATION_ABI } from "../abis/abis";
import {
  CHAIN_A,
  CHAIN_B,
  CLIENT_CHAIN_A,
  CLIENT_CHAIN_B,
  L1_MESSENGER_ADDRESS,
  L2_MESSAGE_VERIFICATION_ADDRESS,
  LOCAL_RICH_ACCOUNT,
  WALLET_CHAIN_A,
  WALLET_CHAIN_B,
} from "../constants";
import { waitForL2ToL1LogProof, waitUntilRootBecomesAvailable } from "./interop-utils";

/**
 * Main interop flow: send message from Chain A and verify on Chain B
 * WARNING: This function uses a known private key
 * This is used on the frontend for demo purposes only
 * NEVER use a private key on a frontend in production
 */
export async function sendInteropMessage(message: string, isAToB: boolean, onProgress: (step: string) => void) {
  onProgress("Connected to source and destination chains");

  const clientSource = isAToB ? CLIENT_CHAIN_A : CLIENT_CHAIN_B;
  const clientDest = isAToB ? CLIENT_CHAIN_B : CLIENT_CHAIN_A;
  const walletSource = isAToB ? WALLET_CHAIN_A : WALLET_CHAIN_B;

  // Get chain IDs
  const networkSource = isAToB ? CHAIN_A.id : CHAIN_B.id;
  const networkDest = isAToB ? CHAIN_B.id : CHAIN_A.id;

  onProgress(`Source Chain ID: ${networkSource}, Destination Chain ID: ${networkDest}`);

  // Step 1: Send L2-to-L1 message on source chain
  onProgress("Sending L2→L1 message on source chain...");

  const messageBytes = stringToHex(message);

  const txn = {
    address: L1_MESSENGER_ADDRESS,
    abi: I_L1_MESSENGER_ABI,
    functionName: "sendToL1",
    args: [messageBytes],
    account: LOCAL_RICH_ACCOUNT,
  };

  // Estimate gas
  const gasEstimate = await clientSource.estimateContractGas(txn);

  const txHash = await walletSource.writeContract({
    ...txn,
    gas: gasEstimate * 2n,
    maxFeePerGas: 1_000_000_000n,
    maxPriorityFeePerGas: 0n,
    chain: walletSource.chain,
  });

  onProgress(`✓ Transaction sent: ${txHash}`);

  // Wait for transaction
  const receipt = await clientSource.waitForTransactionReceipt({ hash: txHash });
  onProgress(`✓ Transaction mined in block ${receipt.blockNumber}`);

  // Step 2: Wait for proof
  const logProof = await waitForL2ToL1LogProof(clientSource, receipt.blockNumber, txHash, onProgress);

  // Extract batch number and message index from log proof
  // viem returns: { batch_number, id (message index), root, proof }
  const batchNumber = logProof.batch_number;
  const messageIndex = logProof.id;

  onProgress(`✓ Proof obtained - Batch: ${batchNumber}, Index: ${messageIndex}`);
  console.log("Full logProof object:", logProof); // Debug log

  // Step 3: Wait for interop root on destination chain
  await waitUntilRootBecomesAvailable(clientDest, BigInt(networkSource), batchNumber, logProof.root, onProgress);

  // Step 4: Verify on destination chain
  onProgress("Verifying message on destination chain...");

  const included = await clientDest.readContract({
    address: L2_MESSAGE_VERIFICATION_ADDRESS,
    abi: MESSAGE_VERIFICATION_ABI,
    functionName: "proveL2MessageInclusionShared",
    args: [
      networkSource,
      batchNumber,
      messageIndex,
      {
        txNumberInBatch: receipt.transactionIndex,
        sender: LOCAL_RICH_ACCOUNT.address,
        data: messageBytes,
      },
      logProof.proof,
    ],
  });

  if (!included) {
    throw new Error("Message was NOT included");
  }

  onProgress("✓ Message verified on destination chain!");

  return {
    txHash,
    isAToB,
    message,
  };
}
