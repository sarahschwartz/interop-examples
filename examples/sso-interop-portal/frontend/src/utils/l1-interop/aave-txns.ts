import { type Address, concat, type Hex, pad, toHex } from "viem";

import { L2_PUBLIC_CLIENT, SUBMIT_INTEROP_TX_ENDPOINT } from "../constants";
import { sendTxWithPasskey } from "../sso/sendTxWithPasskey";
import type { PasskeyCredential } from "../types";
import { createAaveWithdrawBundle, encodeAaveDepositCalldata } from "./aave-utils";

export async function depositToAave(
  amount: bigint,
  shadowAccount: Address,
  accountAddress: Address,
  passkeyCredentials: PasskeyCredential,
) {
  console.log(`🔵 Initiating Aave deposit of ${amount} ETH...`);
  const { bundleCall, withdrawCall } = await encodeAaveDepositCalldata(amount, shadowAccount);
  const txData = [withdrawCall, bundleCall];
  const gasOptions = await getGasInfo();
  const hash = await sendTxWithPasskey(accountAddress, passkeyCredentials, txData, gasOptions);
  await submitTxHashToServer(hash, accountAddress);
  return hash;
}

export async function withdrawFromAave(
  amount: bigint,
  shadowAccount: Address,
  accountAddress: Address,
  passkeyCredentials: PasskeyCredential,
) {
  const withdrawBundle = await createAaveWithdrawBundle(amount, shadowAccount, accountAddress);
  const txData = [withdrawBundle];
  const gasOptions = await getGasInfo();
  const hash = await sendTxWithPasskey(accountAddress, passkeyCredentials, txData, gasOptions);
  await submitTxHashToServer(hash, accountAddress);
  return hash;
}

async function getGasInfo() {
  const feeData = await L2_PUBLIC_CLIENT.estimateFeesPerGas();
  const maxFeePerGas = feeData.maxFeePerGas;
  const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || (maxFeePerGas * 5n) / 100n;

  // Gas limits for Aave operation
  const callGasLimit = BigInt(3_000_000);
  const verificationGasLimit = BigInt(1_500_000);
  const preVerificationGas = BigInt(100_000);

  // Pack gas limits (v0.8 format)
  const accountGasLimits = concat([
    pad(toHex(verificationGasLimit), { size: 16 }),
    pad(toHex(callGasLimit), { size: 16 }),
  ]);

  const gasFees = concat([pad(toHex(maxPriorityFeePerGas), { size: 16 }), pad(toHex(maxFeePerGas), { size: 16 })]);

  return {
    gasFees,
    accountGasLimits,
    callGasLimit,
    verificationGasLimit,
    preVerificationGas,
    maxFeePerGas,
    maxPriorityFeePerGas,
  };
}

async function submitTxHashToServer(txHash: Hex, accountAddress: Address) {
  const response = await fetch(SUBMIT_INTEROP_TX_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ txHash, accountAddress }),
  });
  if (!response.ok) {
    const json = await response.json();
    throw new Error("Error submitting tx hash to server: " + json.message);
  }
}
