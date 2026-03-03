import type { Address, Hex } from "viem";

export interface DeployAccountArgs {
  originDomain: string;
  credentialId: string;
  credentialPublicKey: number[];
}

export type ProofResponse = {
  id: bigint;
  batch_number: bigint;
  proof: Hex[];
  root: Hex;
};

export interface PasskeyCredential {
  credentialId: string;
  credentialPublicKey: number[];
  userName: string;
  userDisplayName: string;
}

export interface Metadata {
  action: string;
  amount: string;
}

export interface FinalizedTxnState extends Metadata {
  l2TxHash: Hex;
  l1FinalizeTxHash: Hex;
  finalizedAt: string;
  accountAddress: Address;
}

export interface PendingTxnState extends Metadata {
  hash: Hex;
  addedAt: string;
  status: string;
  lastFinalizeHash?: Hex;
  updatedAt?: string;
  accountAddress: Address;
}

export type DepositEvent = {
  id: number;
  amount?: string | number | bigint;
  attempts?: number;
  stuck?: boolean;
  status?: string;
  l1TokenAddress?: string;
  kind?: string;
  createdAt?: number;
};

export type DepositRequestData = {
  trackingId: string;
  l1DepositAddress: string;
  l2VaultAddress?: string;
};

export type StepperStep = "deposit" | "bridge" | "finalize" | "complete";

export type DepositRow = {
  alias?: string;
  trackingId: string;
  l1DepositAddressY: string;
  l2VaultAddressX: string;
  recipientPrividiumAddress?: string;
  events?: DepositEvent[];
};

export type GroupedDeposit = {
  address: string;
  alias: string;
  rows: DepositRow[];
};
