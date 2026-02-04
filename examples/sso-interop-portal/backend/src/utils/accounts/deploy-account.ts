/* eslint-disable @typescript-eslint/no-explicit-any */
// import { zksyncOsTestnet } from "./constants";
// import { getAccountAddressFromLogs, prepareDeploySmartAccount } from "zksync-sso/client";
import { base64UrlToUint8Array, getPublicKeyBytesFromPasskeySignature } from "sso-legacy/utils";
import { encodeAbiParameters, type Hex, keccak256, parseAbiParameters, parseEventLogs, toHex } from "viem";

import { client, l2Wallet } from "../client";
import { SSO_CONTRACTS } from "../constants";
import { sendFaucetFunds } from "./faucet";

export async function deploySmartAccount(
  originDomain: string,
  credentialId: Hex,
  credentialPublicKey: number[],
  // publicKey: { x: Hex; y: Hex }
) {
  try {
    console.log("🚀 Deploying smart account...");

    // TODO: replace with SSO SDK method once it's finalized

    // const { transaction, accountId } = prepareDeploySmartAccount({
    //   contracts,
    //   installSessionValidator: true,
    //   passkeySigners: [
    //     {
    //       credentialId,
    //       publicKey,
    //       originDomain,
    //     },
    //   ],
    // });

    // console.log("acccount ID", accountId);

    // const hash = await l2Wallet.sendTransaction({ ...transaction, chain: zksyncOsTestnet });

    // // Wait for receipt and extract deployed address from AccountCreated event
    // const receipt = await client.l2.waitForTransactionReceipt({ hash });
    // const deployedAddress = getAccountAddressFromLogs(receipt.logs);
    const deployedAddress = await deployAccountWithoutSDK(originDomain, credentialId, credentialPublicKey);
    console.log("deployed Address:", deployedAddress);

    await sendFaucetFunds(deployedAddress);

    return deployedAddress;
  } catch (error: any) {
    console.log("error:", error);
  }
}

async function deployAccountWithoutSDK(originDomain: string, credentialId: string, credentialPublicKey: number[]) {
  const credentialIdBytes = base64UrlToUint8Array(credentialId);
  const credentialIdHex = toHex(credentialIdBytes);
  const accountId = keccak256(credentialIdHex);

  // Extract public key coordinates from credentialPublicKey using SDK's COSE parser
  const [xBytes, yBytes] = getPublicKeyBytesFromPasskeySignature(new Uint8Array(credentialPublicKey));
  const x =
    "0x" +
    Array.from(xBytes)
      .map((b: any) => b.toString(16).padStart(2, "0"))
      .join("");
  const y =
    "0x" +
    Array.from(yBytes)
      .map((b: any) => b.toString(16).padStart(2, "0"))
      .join("");

  // Encode init data for WebAuthn validator
  // Format: (bytes credentialId, bytes32[2] publicKey, string domain)
  const webauthnInitData = encodeAbiParameters(parseAbiParameters("bytes, bytes32[2], string"), [
    credentialIdHex,
    [x as Hex, y as Hex],
    originDomain,
  ]);

  // Deploy WITHOUT initialization data to avoid the AlreadyInitialized error
  // We'll initialize manually after deployment
  const initData = "0x";

  console.log("Calling factory.deployAccount (without init)...");

  // Deploy the account using simple factory call
  const FACTORY_ABI = [
    {
      type: "function",
      name: "deployAccount",
      inputs: [
        { name: "accountId", type: "bytes32" },
        { name: "initData", type: "bytes" },
      ],
      outputs: [{ name: "account", type: "address" }],
      stateMutability: "nonpayable",
    },
    {
      type: "event",
      name: "AccountCreated",
      inputs: [
        { name: "account", type: "address", indexed: true },
        { name: "deployer", type: "address", indexed: true },
      ],
    },
  ];

  const hash = await l2Wallet.writeContract({
    address: SSO_CONTRACTS.factory,
    abi: FACTORY_ABI,
    functionName: "deployAccount",
    args: [accountId, initData],
  });

  console.log(`Transaction hash: ${hash}`);
  console.log("Waiting for confirmation...");

  const receipt = await client.l2.waitForTransactionReceipt({ hash });

  if (receipt.status !== "success") {
    throw new Error("Account deployment transaction reverted");
  }

  // Parse logs to find AccountCreated event
  const logs = parseEventLogs({
    abi: FACTORY_ABI,
    logs: receipt.logs,
  });

  let accountAddress;

  const accountCreatedLog: any = logs.find((log: any) => log.eventName === "AccountCreated");
  if (accountCreatedLog) {
    accountAddress = accountCreatedLog.args.account;
  } else {
    throw new Error("No AccountCreated event found");
  }

  // Check if account is initialized
  console.log("Checking if account is initialized...");
  try {
    await client.l2.readContract({
      address: accountAddress,
      abi: [
        {
          type: "function",
          name: "listModuleValidators",
          inputs: [],
          outputs: [{ name: "validatorList", type: "address[]" }],
          stateMutability: "view",
        },
      ],
      functionName: "listModuleValidators",
    });
    console.log("✅ Account is already initialized");
  } catch (error: any) {
    console.log("ERROR:", error);
    if (error.message.includes("NotInitialized") || error.message.includes("0x48c9ceda")) {
      console.log("⚠️  Account not initialized! Initializing now...");

      // Call initializeAccount directly
      const initHash = await l2Wallet.writeContract({
        address: accountAddress,
        abi: [
          {
            type: "function",
            name: "initializeAccount",
            inputs: [
              { name: "modules", type: "address[]" },
              { name: "data", type: "bytes[]" },
            ],
            stateMutability: "nonpayable",
          },
        ],
        functionName: "initializeAccount",
        args: [[SSO_CONTRACTS.webauthnValidator], [webauthnInitData]],
      });

      console.log(`Initialization tx: ${initHash}`);
      const initReceipt = await client.l2.waitForTransactionReceipt({ hash: initHash });

      if (initReceipt.status !== "success") {
        throw new Error("Account initialization failed");
      }

      console.log("✅ Account initialized successfully!");
    } else {
      console.warn("Could not check initialization status:", error.message);
    }
  }
  return accountAddress;
}
