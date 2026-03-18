import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Address } from "viem";
import { formatEther, getAddress } from "viem";

import {
  aliasKeyFromParts,
  normalizeAlias,
  shortAddress,
  STATUS_LABELS,
  statusBadgeClass,
  statusToStep,
  STORAGE_KEY_ALIAS_BY_ACCOUNT,
} from "~/utils/aliases/utils";
import { RESOLVER_URL } from "~/utils/constants";
import type { Tab } from "~/utils/tabs";
import type { DepositRow, GroupedDeposit, StepperStep } from "~/utils/types";

import { BackButton } from "./BackButton";
import { CopyIconButton } from "./CopyIconButton";

interface Props {
  accountAddress?: Address;
  setActiveTab: (next: Tab) => void;
}

export function ReceiveTab({ accountAddress, setActiveTab }: Props) {
  const [nickname, setNickname] = useState("");
  const [rows, setRows] = useState<DepositRow[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [successMessage, setSuccessMessage] = useState<string>();
  const [registrationMessage, setRegistrationMessage] = useState<string>();
  const [registrationMessageType, setRegistrationMessageType] = useState<"success" | "error">("success");
  const [isAliasOwned, setIsAliasOwned] = useState(false);
  const [ownedAliases, setOwnedAliases] = useState<Record<string, true>>({});
  const [associatedAlias, setAssociatedAlias] = useState<string>();
  const [copiedAddress, setCopiedAddress] = useState<string>();
  const [copiedAlias, setCopiedAlias] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const { t } = useTranslation();
  const activeAlias = normalizeAlias(associatedAlias || nickname);
  const hasStuckTransactions = rows.some((row) => (row.events ?? []).some((event) => event.stuck));

  function loadAliasMap(): Record<string, string> {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ALIAS_BY_ACCOUNT);
      return raw ? (JSON.parse(raw) as Record<string, string>) : {};
    } catch {
      return {};
    }
  }

  function persistAliasForAccount(address: Address, alias: string) {
    if (typeof window === "undefined") return;
    const aliasMap = loadAliasMap();
    const normalizedAddress = getAddress(address).toLowerCase();
    const normalizedAlias = normalizeAlias(alias);
    aliasMap[normalizedAddress] = normalizedAlias;
    localStorage.setItem(STORAGE_KEY_ALIAS_BY_ACCOUNT, JSON.stringify(aliasMap));
    setAssociatedAlias(normalizedAlias);
  }

  useEffect(() => {
    if (!accountAddress) {
      setAssociatedAlias(undefined);
      return;
    }
    const aliasMap = loadAliasMap();
    setAssociatedAlias(aliasMap[getAddress(accountAddress).toLowerCase()]);
  }, [accountAddress]);

  const groupedDeposits = useMemo(() => {
    return rows.reduce<Record<string, GroupedDeposit>>((acc, row) => {
      const key = row.l1DepositAddressY ?? "unknown";
      if (!acc[key]) {
        acc[key] = { address: row.l1DepositAddressY, alias: row.alias ?? nickname, rows: [] };
      }
      acc[key].rows.push(row);
      return acc;
    }, {});
  }, [rows, nickname]);

  async function runRequest<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, options);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const message = typeof data.error === "string" ? data.error : t("receive.requestFailed");
      throw new Error(message);
    }
    return response.json() as Promise<T>;
  }

  async function loadDeposits(claimOwned = false, preserveRegistrationMessage = false) {
    const normalizedNickname = activeAlias;
    if (!normalizedNickname || !accountAddress) {
      setRows([]);
      setIsAliasOwned(false);
      return;
    }

    setIsBusy(true);
    setErrorMessage(undefined);
    setSuccessMessage(undefined);
    if (!preserveRegistrationMessage) setRegistrationMessage(undefined);
    try {
      const exists = await runRequest<{ result: "match" | "maybe_needs_suffix" | "not_found" }>(
        `${RESOLVER_URL}/alias/exists`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ nickname: normalizedNickname, suffix: "" }),
        },
      );

      if (exists.result !== "match") {
        setRows([]);
        setIsAliasOwned(false);
        setLastRefreshed(new Date());
        return;
      }

      const aliasKey = aliasKeyFromParts(normalizedNickname, "");
      const data = await runRequest<DepositRow[]>(`${RESOLVER_URL}/alias/deposits?aliasKey=${aliasKey}`);

      const connected = getAddress(accountAddress).toLowerCase();
      const isOwnedFromRows =
        data.length > 0
          ? data.every((row) => (row.recipientPrividiumAddress || "").toLowerCase() === connected)
          : claimOwned ||
            ownedAliases[normalizedNickname] === true ||
            normalizeAlias(associatedAlias || "") === normalizedNickname;

      if (!isOwnedFromRows) {
        setRows([]);
        setIsAliasOwned(false);
        setErrorMessage(t("receive.aliasTaken"));
        return;
      }

      setRows(data);
      setIsAliasOwned(true);
      setLastRefreshed(new Date());
      persistAliasForAccount(accountAddress, normalizedNickname);
    } catch (error) {
      setIsAliasOwned(false);
      setErrorMessage(error instanceof Error ? error.message : t("receive.requestFailed"));
    } finally {
      setIsBusy(false);
    }
  }

  useEffect(() => {
    if (registrationMessage && registrationMessageType === "success") {
      const timer = setTimeout(() => setRegistrationMessage(undefined), 3000);
      return () => clearTimeout(timer);
    }
  }, [registrationMessage, registrationMessageType]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(undefined), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(interval);
  }, []);

  function getRefreshTimestamp(): string | null {
    if (!lastRefreshed) return null;
    const seconds = Math.floor((now - lastRefreshed.getTime()) / 1000);
    if (seconds < 5) return null;
    if (seconds < 60) return t("receive.updatedSecondsAgo", { s: seconds });
    const minutes = Math.floor(seconds / 60);
    return t("receive.updatedMinutesAgo", { m: minutes });
  }

  const isRefreshCoolingDown = lastRefreshed !== null && now - lastRefreshed.getTime() < 5000;

  useEffect(() => {
    if (!activeAlias) {
      setRows([]);
      setIsAliasOwned(false);
      setErrorMessage(undefined);
      return;
    }
    void loadDeposits();
  }, [activeAlias, accountAddress]);

  useEffect(() => {
    if (!activeAlias || !accountAddress) return;
    const interval = setInterval(() => {
      void loadDeposits();
    }, 2500);
    return () => clearInterval(interval);
  }, [activeAlias, accountAddress]);

  async function registerAlias() {
    const normalizedNickname = normalizeAlias(nickname);
    setRegistrationMessage(undefined);
    if (!normalizedNickname || !accountAddress) {
      setRegistrationMessageType("error");
      setRegistrationMessage(t("receive.nicknameAndWalletRequired"));
      setSuccessMessage(undefined);
      return;
    }

    setIsBusy(true);
    setErrorMessage(undefined);
    setSuccessMessage(undefined);
    try {
      const exists = await runRequest<{ result: "match" | "maybe_needs_suffix" | "not_found" }>(
        `${RESOLVER_URL}/alias/exists`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ nickname: normalizedNickname, suffix: "" }),
        },
      );
      if (exists.result === "match" && !isAliasOwned && !ownedAliases[normalizedNickname]) {
        setRegistrationMessageType("error");
        setRegistrationMessage(t("receive.aliasTaken"));
        return;
      }

      await runRequest(`${RESOLVER_URL}/alias/register`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          nickname: normalizedNickname,
          suffix: "",
          recipientAddress: getAddress(accountAddress),
        }),
      });
      setOwnedAliases((prev) => ({ ...prev, [normalizedNickname]: true }));
      setIsAliasOwned(true);
      persistAliasForAccount(accountAddress, normalizedNickname);
      setRegistrationMessageType("success");
      setRegistrationMessage(t("receive.aliasRegistered"));
      setSuccessMessage(t("receive.aliasRegistered"));
      await loadDeposits(true, true);
    } catch (error) {
      setRegistrationMessageType("error");
      setRegistrationMessage(error instanceof Error ? error.message : t("receive.requestFailed"));
      setErrorMessage(error instanceof Error ? error.message : t("receive.requestFailed"));
    } finally {
      setIsBusy(false);
    }
  }

  async function retryEvent(eventId: number) {
    const normalizedNickname = activeAlias;
    if (!normalizedNickname) return;
    setIsBusy(true);
    setErrorMessage(undefined);
    setSuccessMessage(undefined);
    try {
      await runRequest(`${RESOLVER_URL}/deposit-events/${eventId}/retry`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nickname: normalizedNickname, suffix: "" }),
      });
      setSuccessMessage(t("receive.retrySuccess", { id: eventId }));
      await loadDeposits();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t("receive.requestFailed"));
    } finally {
      setIsBusy(false);
    }
  }

  async function retryAllStuck() {
    const stuckEvents = rows.flatMap((row) => (row.events ?? []).filter((event) => event.stuck));
    if (stuckEvents.length === 0) {
      setSuccessMessage(t("receive.noStuckEvents"));
      setErrorMessage(undefined);
      return;
    }
    for (const event of stuckEvents) {
      await retryEvent(event.id);
    }
    setSuccessMessage(t("receive.retryAllSuccess", { count: stuckEvents.length }));
  }

  async function copyAlias() {
    if (!associatedAlias) return;
    try {
      await navigator.clipboard.writeText(associatedAlias);
      setCopiedAlias(true);
      setTimeout(() => setCopiedAlias(false), 2000);
    } catch {
      setErrorMessage(t("receive.requestFailed"));
    }
  }

  async function copyDepositAddress(address: string) {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      setTimeout(() => setCopiedAddress((prev) => (prev === address ? undefined : prev)), 2000);
    } catch {
      setErrorMessage(t("receive.requestFailed"));
    }
  }

  return (
    <div
      className="tab-content"
      id="receive-tab"
    >
      <div className="tab-header">
        <BackButton setActiveTab={setActiveTab} />
        <div>
          <div className="tab-title">{t("receive.title")}</div>
          <div className="tab-subtitle">{t("receive.subtitle")}</div>
        </div>
      </div>

      <div className={associatedAlias ? "" : "card"}>
        {associatedAlias && (
          <div className="aave-info">
            <div className="aave-info-row receive-alias-row">
              <span>{t("receive.associatedAlias")}:</span>
              <strong>{associatedAlias}</strong>
              <button
                className="refresh-btn-inline"
                type="button"
                onClick={() => void copyAlias()}
              >
                {copiedAlias ? t("receive.aliasCopied") : t("receive.copyAlias")}
              </button>
            </div>
            <div className="aave-info-row">
              <span className="receive-alias-hint">{t("receive.associatedAliasHelp")}</span>
            </div>
          </div>
        )}
        {!associatedAlias && (
          <div className="receive-grid">
            <img
              src="/ic-h-alias.svg"
              alt=""
              className="action-card-icon"
            />
            <div className="receive-setup-heading">{t("receive.setupHeading")}</div>
            <p className="receive-setup-explanation">{t("receive.setupExplanation")}</p>
            <div className="form-group">
              <label htmlFor="receiveNickname">{t("receive.nickname")}</label>
              <input
                id="receiveNickname"
                placeholder={t("receive.nicknamePlaceholder")}
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
              />
              <div className="receive-input-helper">{t("receive.nicknameHelperText")}</div>
              {normalizeAlias(nickname) && (
                <div className="receive-alias-preview">
                  {t("receive.aliasPreview")} <strong>{normalizeAlias(nickname)}</strong>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="receive-actions">
          {!associatedAlias && (
            <button
              type="button"
              onClick={() => void registerAlias()}
              disabled={isBusy}
            >
              {t("receive.registerAlias")}
            </button>
          )}
        </div>

        {registrationMessage && (
          <div className={`alert ${registrationMessageType === "success" ? "alert-success" : "alert-error"}`}>
            {registrationMessage}
          </div>
        )}
      </div>

      {associatedAlias && (
        <div className="card receive-deposits-header-card">
          <div className="receive-deposits-header">
            <strong>{t("receive.depositsHeading")}</strong>
            <div className="receive-refresh-controls">
              {hasStuckTransactions && (
                <button
                  className="refresh-btn-inline receive-retry-all-btn"
                  type="button"
                  onClick={() => void retryAllStuck()}
                  disabled={isBusy}
                >
                  {t("receive.retryAll")}
                </button>
              )}
              {isRefreshCoolingDown ? (
                <span className="refresh-updated-badge">✓ {t("receive.justUpdated")}</span>
              ) : (
                <>
                  {getRefreshTimestamp() && <span className="refresh-timestamp">{getRefreshTimestamp()}</span>}
                  <button
                    className="refresh-btn-inline"
                    type="button"
                    onClick={() => void loadDeposits()}
                    disabled={isBusy}
                  >
                    {t("receive.refresh")}
                  </button>
                </>
              )}
            </div>
          </div>

          {(() => {
            const STEPS: StepperStep[] = ["deposit", "bridge", "finalize", "complete"];
            const allGroups = Object.values(groupedDeposits);
            const allEvents = allGroups.flatMap((group) =>
              group.rows.flatMap((row) => (row.events ?? []).map((e) => ({ event: e, address: group.address }))),
            );

            if (allEvents.length === 0 && isAliasOwned) {
              return <p className="receive-no-deposits">{t("receive.noDepositsYet")}</p>;
            }

            return (
              <>
                <div className="receive-event-list">
                  {allEvents.map(({ event, address }) => {
                    const currentStep = statusToStep(event.status, event.stuck > 0);
                    const currentStepIndex = STEPS.indexOf(currentStep);
                    const isComplete = (event.status ?? "").toLowerCase() === "credited";
                    const statusLabel = STATUS_LABELS[(event.status ?? "").toLowerCase()] ?? t("receive.inProgress");
                    const amount = event.amount ? formatEther(BigInt(event.amount)) : "0";
                    const asset = event.l1TokenAddress ? shortAddress(event.l1TokenAddress) : "ETH";

                    return (
                      <div
                        key={event.id}
                        className={`receive-event-row${event.stuck ? " receive-event-row--stuck" : ""}`}
                      >
                        <div className="receive-event-main">
                          <div className="receive-event-amount">
                            <strong>{amount}</strong>
                            <span className="receive-event-asset">{asset}</span>
                          </div>
                          <div className="receive-event-pipeline">
                            {STEPS.map((step, i) => {
                              const isFilled = i < currentStepIndex;
                              const isCurrent = i === currentStepIndex && !isComplete;
                              const isStuckStep = event.stuck && isCurrent;
                              const dotClass = [
                                "receive-step-dot",
                                (isFilled || isCurrent) && !isStuckStep ? "receive-step-dot--active" : "",
                                isStuckStep ? "receive-step-dot--stuck" : "",
                                isComplete ? "receive-step-dot--complete" : "",
                              ]
                                .filter(Boolean)
                                .join(" ");
                              const lineClass = `receive-step-line${isFilled ? " receive-step-line--active" : ""}`;
                              return (
                                <div
                                  key={step}
                                  className="receive-step-segment"
                                >
                                  <div className={dotClass} />
                                  {i < STEPS.length - 1 && <div className={lineClass} />}
                                </div>
                              );
                            })}
                          </div>
                          <span className={statusBadgeClass(event.status, event.stuck > 0)}>{statusLabel}</span>
                        </div>
                        {event.stuck > 0 && (
                          <div className="receive-event-stuck-row">
                            <span className="receive-event-stuck-detail">
                              {t("receive.failedAfterAttempts", { n: event.attempts ?? 0 })}
                            </span>
                            <button
                              className="refresh-btn-inline"
                              type="button"
                              onClick={() => void retryEvent(event.id)}
                              disabled={isBusy}
                            >
                              {t("receive.retryTransfer")}
                            </button>
                          </div>
                        )}
                        <details className="receive-tech-details">
                          <summary>{t("receive.technicalDetails")}</summary>
                          <div className="receive-tech-address">
                            <span className="receive-tech-label">{t("receive.depositAddress")}:</span>
                            <span className="inline-copy-row">
                              <code>{address}</code>
                              <CopyIconButton
                                label={t("send.copyAddress")}
                                copied={copiedAddress === address}
                                onClick={() => void copyDepositAddress(address)}
                              />
                            </span>
                          </div>
                          <p className="receive-tech-hint">{t("receive.depositAddressHint")}</p>
                        </details>
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}
          {successMessage && (
            <div
              className="alert alert-success"
              style={{ marginTop: 12 }}
            >
              {successMessage}
            </div>
          )}
          {errorMessage && errorMessage !== t("receive.aliasTaken") && (
            <div
              className="alert alert-error"
              style={{ marginTop: 12 }}
            >
              {errorMessage}
            </div>
          )}
        </div>
      )}

      <div className="receive-groups">
        {!isAliasOwned && errorMessage === t("receive.aliasTaken") && (
          <div className="card">
            <div className="alert alert-error">{t("receive.aliasTaken")}</div>
          </div>
        )}
      </div>
    </div>
  );
}
