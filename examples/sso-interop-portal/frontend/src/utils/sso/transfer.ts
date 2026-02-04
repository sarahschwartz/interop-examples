import { type Address, type Hex, pad, parseEther, toHex } from "viem";

import type { PasskeyCredential } from "../types";
import { sendTxWithPasskey } from "./sendTxWithPasskey";

export async function sendETH(
  amount: string,
  recipient: Address,
  accountAddress: Address,
  passkeyCredentials: PasskeyCredential,
) {
  const txData = [
    {
      to: recipient,
      value: parseEther(amount),
      data: "0x" as Hex,
    },
  ];

  const callGasLimit = 500000n;
  const verificationGasLimit = 2000000n;
  const maxFeePerGas = 10000000000n;
  const maxPriorityFeePerGas = 5000000000n;
  const preVerificationGas = 200000n;

  // Pack gas limits: (verificationGasLimit << 128) | callGasLimit
  const accountGasLimits = pad(toHex((verificationGasLimit << 128n) | callGasLimit), { size: 32 });

  // Pack gas fees: (maxPriorityFeePerGas << 128) | maxFeePerGas
  const gasFees = pad(toHex((maxPriorityFeePerGas << 128n) | maxFeePerGas), { size: 32 });

  const gasOptions = {
    gasFees,
    accountGasLimits,
    callGasLimit,
    verificationGasLimit,
    preVerificationGas,
    maxFeePerGas,
    maxPriorityFeePerGas,
  };

  const hash = await sendTxWithPasskey(accountAddress, passkeyCredentials, txData, gasOptions);
  return hash;
}
