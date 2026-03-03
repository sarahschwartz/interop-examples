import { keccak256, toHex } from "viem";

import type { StepperStep } from "../types";

export const STORAGE_KEY_ALIAS_BY_ACCOUNT = "zksync_receive_alias_by_account";
export const SEND_ALIAS_TRACKING_KEY = "zksync_send_alias_tracking_id";

export const STATUS_LABELS: Record<string, string> = {
  detected_l1: "Deposit received",
  l1_forwarder_deployed: "Preparing bridge",
  l1_bridging_submitted: "Bridging to ZKsync OS",
  l2_arrived: "Arrived on ZKsync OS",
  l2_forwarder_deployed: "Finalizing",
  l2_swept_y_to_x: "Finalizing",
  l2_vault_deployed: "Finalizing",
  credited: "Completed",
  pending: "Pending",
  stuck: "Needs attention",
  failed: "Needs attention",
  l1_failed: "Needs attention",
  l2_failed: "Needs attention",
  error: "Needs attention",
};

export const STATUS_STEP: Record<string, StepperStep> = {
  detected_l1: "deposit",
  l1_forwarder_deployed: "bridge",
  l1_bridging_submitted: "bridge",
  l2_arrived: "finalize",
  l2_forwarder_deployed: "finalize",
  l2_swept_y_to_x: "finalize",
  l2_vault_deployed: "finalize",
  credited: "complete",
};

export function statusToStep(status?: string, stuck?: boolean): StepperStep {
  if (stuck) return "bridge";
  return STATUS_STEP[(status ?? "").toLowerCase()] ?? "deposit";
}

export function hasTransferValue(amount: unknown): boolean {
  try {
    return BigInt(String(amount ?? "0")) > 0n;
  } catch {
    return false;
  }
}

export function normalizeAlias(input: string): string {
  return input.trim().toLowerCase();
}

export function aliasKeyFromParts(normalizedAlias: string, suffix: string): `0x${string}` {
  return keccak256(toHex(`${normalizedAlias}#${suffix}`));
}

export function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function statusBadgeClass(status?: string, stuck?: boolean): string {
  if (stuck) return "receive-badge receive-badge--error";
  const normalized = (status ?? "").toLowerCase();
  if (normalized === "credited") return "receive-badge receive-badge--success";
  if (normalized === "pending") return "receive-badge receive-badge--pending";
  if (normalized.includes("failed") || normalized === "error") return "receive-badge receive-badge--error";
  return "receive-badge receive-badge--default";
}
