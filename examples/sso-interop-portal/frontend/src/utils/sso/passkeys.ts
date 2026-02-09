import { registerNewPasskey } from "sso-legacy/client/passkey";
import { type Address, type Hex } from "viem";

import { STORAGE_KEY_ACCOUNT, STORAGE_KEY_PASSKEY } from "../constants";
import type { PasskeyCredential } from "../types";

export function loadExistingPasskey() {
  const savedPasskey = localStorage.getItem(STORAGE_KEY_PASSKEY);
  const savedAccount = localStorage.getItem(STORAGE_KEY_ACCOUNT);

  return {
    savedPasskey: savedPasskey ? (JSON.parse(savedPasskey) as PasskeyCredential) : undefined,
    savedAccount: savedAccount ? (savedAccount as Address) : undefined,
  };
}

export async function createNewPasskey(userName: string) {
  console.log("🔐 Creating passkey...");

  const passkeyName = userName.toLowerCase().replace(/\s+/g, "");

  // // TODO: Use new  SDK to register passkey
  // const passkeyCredentials = await createWebAuthnCredential({
  //   rpId: RP_ID,
  //   rpName: "SSO Interop Portal",
  //   name: passkeyName,
  //   displayName: userName,
  // });
  const result = await registerNewPasskey({
    userName: passkeyName,
    userDisplayName: userName,
  });
  // Store credentials
  const passkeyCredentials = {
    credentialId: result.credentialId as Hex,
    credentialPublicKey: Array.from(result.credentialPublicKey),
    userName: passkeyName,
    userDisplayName: userName,
  };

  console.log("✅ Passkey created successfully!");

  // Store credentials
  savePasskeyCredentials(passkeyCredentials);
  return passkeyCredentials;
}

// Save passkey to localStorage
function savePasskeyCredentials(passkeyCredentials: PasskeyCredential) {
  localStorage.setItem(STORAGE_KEY_PASSKEY, JSON.stringify(passkeyCredentials));
}

// Save wallet address to localStorage
export function saveAccountAddress(accountAddress: Address) {
  localStorage.setItem(STORAGE_KEY_ACCOUNT, accountAddress);
}

export function handleResetPasskey(text: string) {
  if (confirm(text)) {
    localStorage.removeItem(STORAGE_KEY_PASSKEY);
    localStorage.removeItem(STORAGE_KEY_ACCOUNT);
    location.reload();
  }
}
