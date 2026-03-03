import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatEther } from "viem";

import {
  hasTransferValue,
  normalizeAlias,
  SEND_ALIAS_TRACKING_KEY,
  shortAddress,
  STATUS_LABELS,
  statusBadgeClass,
} from "~/utils/aliases/utils";
import { RESOLVER_URL } from "~/utils/constants";
import type { DepositEvent, DepositRequestData } from "~/utils/types";

import { FlowStepper } from "./FlowStepper";

export function SendToAlias() {
  const [alias, setAlias] = useState("");
  const [aliasError, setAliasError] = useState<string>();
  const [aliasSuccess, setAliasSuccess] = useState<string>();
  const [isAliasLoading, setIsAliasLoading] = useState(false);
  const [depositRequest, setDepositRequest] = useState<DepositRequestData>();
  const [depositEvents, setDepositEvents] = useState<DepositEvent[]>([]);

  const { t } = useTranslation();

  const transferEvents = useMemo(() => {
    return depositEvents.filter((event) => hasTransferValue(event.amount));
  }, [depositEvents]);

  function getTrackingIdFromUrl(): string | null {
    if (typeof window === "undefined") return null;
    const url = new URL(window.location.href);
    return url.searchParams.get("trackingId");
  }

  function buildTrackingLink(trackingId: string): string {
    const url = new URL(window.location.origin);
    url.searchParams.set("tab", "Send");
    url.searchParams.set("trackingId", trackingId);
    return url.toString();
  }

  async function runRequest<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, options);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const message = typeof data.error === "string" ? data.error : t("send.requestFailed");
      throw new Error(message);
    }
    return response.json() as Promise<T>;
  }

  async function loadTracking(trackingId: string) {
    type TrackingResponse = {
      request?: {
        trackingId?: string;
        l1DepositAddressY?: string;
        l2VaultAddressX?: string;
      };
      events?: DepositEvent[];
    };
    const data = await runRequest<TrackingResponse>(`${RESOLVER_URL}/deposit/${trackingId}`);
    const requestData = data.request;
    if (!requestData?.trackingId || !requestData?.l1DepositAddressY) return;

    setDepositRequest({
      trackingId: requestData.trackingId,
      l1DepositAddress: requestData.l1DepositAddressY,
      l2VaultAddress: requestData.l2VaultAddressX,
    });
    setDepositEvents(data.events ?? []);
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const trackingFromUrl = getTrackingIdFromUrl();
    const storedTracking = localStorage.getItem(SEND_ALIAS_TRACKING_KEY);
    const trackingId = trackingFromUrl ?? storedTracking;
    if (!trackingId) return;
    localStorage.setItem(SEND_ALIAS_TRACKING_KEY, trackingId);
    void loadTracking(trackingId).catch(() => {
      localStorage.removeItem(SEND_ALIAS_TRACKING_KEY);
    });
  }, []);

  useEffect(() => {
    if (!depositRequest?.trackingId) return;
    const interval = setInterval(() => {
      void loadTracking(depositRequest.trackingId).catch(() => undefined);
    }, 2500);
    return () => clearInterval(interval);
  }, [depositRequest?.trackingId]);

  async function handleAliasContinue() {
    const normalizedAlias = normalizeAlias(alias);
    setAliasError(undefined);
    setAliasSuccess(undefined);
    if (!normalizedAlias) {
      setAliasError(t("send.aliasRequired"));
      return;
    }

    setIsAliasLoading(true);
    try {
      const exists = await runRequest<{ result: "match" | "maybe_needs_suffix" | "not_found" }>(
        `${RESOLVER_URL}/alias/exists`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ nickname: normalizedAlias, suffix: "" }),
        },
      );

      if (exists.result !== "match") {
        setAliasError(t("send.aliasNotFound"));
        setDepositRequest(undefined);
        setDepositEvents([]);
        return;
      }

      const deposit = await runRequest<{
        trackingId: string;
        l1DepositAddress: string;
        l2VaultAddress?: string;
      }>(`${RESOLVER_URL}/deposit/request`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nickname: normalizedAlias, suffix: "" }),
      });

      setDepositRequest({
        trackingId: deposit.trackingId,
        l1DepositAddress: deposit.l1DepositAddress,
        l2VaultAddress: deposit.l2VaultAddress,
      });
      setDepositEvents([]);
      localStorage.setItem(SEND_ALIAS_TRACKING_KEY, deposit.trackingId);
      setAliasSuccess(t("send.depositAddressGenerated"));
      await loadTracking(deposit.trackingId);
    } catch (requestError) {
      if (requestError instanceof Error) {
        const message = requestError.message.toLowerCase();
        if (
          message.includes("alias not registered") ||
          message.includes("not registered") ||
          message.includes("not found") ||
          message.includes("failed to fetch")
        ) {
          setAliasError(t("send.aliasNotFound"));
        } else {
          setAliasError(t("send.requestFailed"));
        }
      } else {
        setAliasError(t("send.requestFailed"));
      }
    } finally {
      setIsAliasLoading(false);
    }
  }

  async function copyText(value: string, messageKey: string) {
    try {
      await navigator.clipboard.writeText(value);
      setAliasSuccess(t(messageKey));
      setAliasError(undefined);
    } catch {
      setAliasError(t("send.copyFailed"));
    }
  }

  return (
    <div className="card">
      <div className="tab-subtitle send-section-title">{t("send.sendToAlias")}</div>
      <div className="alert alert-info">
        <strong>{t("send.aliasSendNoticeTitle")}</strong>
        <div className="alias-step">
          <span className="step-number">1. </span>
          {t("send.aliasStep1")}
        </div>
        <div className="alias-step">
          <span className="step-number">2.</span>
          {t("send.aliasStep2")}
        </div>
        <div className="alias-step">
          <span className="step-number">3. </span>
          {t("send.aliasStep3")}
        </div>
      </div>
      <div className="send-alias-input-row">
        <input
          value={alias}
          placeholder={t("send.aliasPlaceholder")}
          onChange={(event) => setAlias(event.target.value)}
        />
        <button
          className="small"
          type="button"
          disabled={isAliasLoading}
          onClick={() => void handleAliasContinue()}
        >
          {isAliasLoading ? t("send.loading") : t("send.continue")}
        </button>
      </div>

      {aliasSuccess && <div className="alert alert-success">{aliasSuccess}</div>}
      {aliasError && <div className="alert alert-error">{aliasError}</div>}

      {depositRequest && (
        <div className="send-alias-details">
          <div className="aave-info">
            <div className="aave-info-row">
              <strong>{t("send.depositAddress")}</strong>
            </div>
            <div className="aave-info-row">
              <code>{depositRequest.l1DepositAddress}</code>
            </div>
            <div className="receive-actions">
              <button
                className="secondary-brand small"
                type="button"
                onClick={() => void copyText(depositRequest.l1DepositAddress, "send.depositAddressCopied")}
              >
                {t("send.copyAddress")}
              </button>
              <button
                className="secondary-brand small"
                type="button"
                onClick={() => void copyText(buildTrackingLink(depositRequest.trackingId), "send.trackingLinkCopied")}
              >
                {t("send.copyTrackingLink")}
              </button>
            </div>
            <div className="aave-info-row">
              <span>
                {t("send.trackingId")}: {depositRequest.trackingId}
              </span>
            </div>
          </div>

          {transferEvents.length > 0 && (
            <FlowStepper
              events={transferEvents}
              t={t}
            />
          )}

          <div>
            <h3 className="tab-subtitle">{t("send.depositHistory")}</h3>
            <table className="tx-table">
              <thead>
                <tr>
                  <th>{t("send.asset")}</th>
                  <th>{t("send.amountShort")}</th>
                  <th>{t("send.statusShort")}</th>
                </tr>
              </thead>
              <tbody>
                {depositEvents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="tx-empty"
                    >
                      {t("send.noEvents")}
                    </td>
                  </tr>
                ) : (
                  depositEvents.map((event) => (
                    <tr key={event.id}>
                      <td>{event.l1TokenAddress ? shortAddress(event.l1TokenAddress) : "ETH"}</td>
                      <td>{event.amount ? formatEther(BigInt(event.amount)) : "0"}</td>
                      <td>
                        <span className={statusBadgeClass(event.status, event.stuck)}>
                          {STATUS_LABELS[(event.status ?? "").toLowerCase()] ?? t("send.inProgress")}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
