import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Address } from "viem";
import { formatEther, getAddress } from "viem";

import { aliasKeyFromParts, normalizeAlias, shortAddress, STATUS_LABELS, statusBadgeClass, STORAGE_KEY_ALIAS_BY_ACCOUNT } from "~/utils/aliases/utils";
import { RESOLVER_URL } from "~/utils/constants";
import type { Tab } from "~/utils/tabs";
import type { DepositRow, GroupedDeposit } from "~/utils/types";

import { BackButton } from "./BackButton";

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
  const { t } = useTranslation();
  const activeAlias = normalizeAlias(associatedAlias || nickname);

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

  async function loadDeposits(showSuccessMessage: boolean, claimOwned = false, preserveRegistrationMessage = false) {
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
        if (showSuccessMessage) setSuccessMessage(t("receive.refreshed"));
        return;
      }

      const aliasKey = aliasKeyFromParts(normalizedNickname, "");
      const data = await runRequest<DepositRow[]>(
        `${RESOLVER_URL}/alias/deposits?aliasKey=${aliasKey}`,
      );

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
        setErrorMessage("already taken");
        return;
      }

      setRows(data);
      setIsAliasOwned(true);
      persistAliasForAccount(accountAddress, normalizedNickname);
      if (showSuccessMessage) setSuccessMessage(t("receive.refreshed"));
    } catch (error) {
      setIsAliasOwned(false);
      setErrorMessage(error instanceof Error ? error.message : t("receive.requestFailed"));
    } finally {
      setIsBusy(false);
    }
  }

  useEffect(() => {
    if (!activeAlias) {
      setRows([]);
      setIsAliasOwned(false);
      setErrorMessage(undefined);
      return;
    }
    void loadDeposits(false);
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
        setRegistrationMessage("already taken");
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
      await loadDeposits(false, true, true);
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
      await loadDeposits(false);
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

      <div className="card">
        {associatedAlias && (
          <div className="">
            {t("receive.associatedAlias")}: <strong>{associatedAlias}</strong>
          </div>
        )}
        {associatedAlias && (
          <div className="alert alert-info">
            {t("receive.associatedAliasHelp")}
          </div>
        )}
        {!associatedAlias && (
          <div className="receive-grid">
            <div className="form-group">
              <label htmlFor="receiveNickname">{t("receive.nickname")}</label>
              <input
                id="receiveNickname"
                placeholder={t("receive.nicknamePlaceholder")}
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
              />
            </div>
          </div>
        )}

        <div className="receive-actions">
          {!associatedAlias && (
            <button
              className="secondary-brand"
              type="button"
              onClick={() => void registerAlias()}
              disabled={isBusy}
            >
              {t("receive.registerAlias")}
            </button>
          )}
          <button
            className="secondary-brand"
            type="button"
            onClick={() => void loadDeposits(true)}
            disabled={isBusy}
          >
            {t("receive.refresh")}
          </button>
          <button
            type="button"
            onClick={() => void retryAllStuck()}
            disabled={isBusy}
          >
            {t("receive.retryAll")}
            <span
              className="receive-tooltip"
              title={t("receive.retryAllTooltip")}
              aria-label={t("receive.retryAllTooltip")}
            >
              ?
            </span>
          </button>
        </div>

        {registrationMessage && (
          <div className={`alert ${registrationMessageType === "success" ? "alert-success" : "alert-error"}`}>
            {registrationMessage}
          </div>
        )}
        {successMessage && <div className="alert alert-success">{successMessage}</div>}
        {errorMessage && errorMessage !== "already taken" && <div className="alert alert-error">{errorMessage}</div>}
      </div>

      <div className="receive-groups">
        {!isAliasOwned && errorMessage === "already taken" && (
          <div className="card">
            <div className="alert alert-error">already taken</div>
          </div>
        )}
        {Object.values(groupedDeposits).map((group) => {
          const events = group.rows.flatMap((row) => row.events ?? []);

          return (
            <div
              key={group.address}
              className="card receive-group-card"
            >
              <div className="receive-group-header">
                <div className="receive-group-address">
                  {t("receive.depositAddress")}: <code>{group.address}</code>
                </div>
              </div>

              <div className="receive-group-table-wrapper">
                <table className="tx-table">
                  <thead>
                    <tr>
                      <th>{t("receive.asset")}</th>
                      <th>{t("receive.amount")}</th>
                      <th>{t("receive.status")}</th>
                      <th>{t("receive.attempts")}</th>
                      <th>{t("receive.action")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="tx-empty"
                        >
                          {t("receive.noDeposits")}
                        </td>
                      </tr>
                    )}
                    {events.map((event) => (
                      <tr
                        key={event.id}
                        className={event.stuck ? "receive-stuck-row" : undefined}
                      >
                        <td>{event.l1TokenAddress ? shortAddress(event.l1TokenAddress) : "ETH"}</td>
                        <td>{event.amount ? formatEther(BigInt(event.amount)) : "0"}</td>
                        <td>
                          <span className={statusBadgeClass(event.status, event.stuck)}>
                            {STATUS_LABELS[(event.status ?? "").toLowerCase()] ?? t("receive.inProgress")}
                          </span>
                        </td>
                        <td>{event.attempts ?? 0}</td>
                        <td>
                          {event.stuck ? (
                            <button
                              className="small"
                              type="button"
                              onClick={() => void retryEvent(event.id)}
                              disabled={isBusy}
                            >
                              {t("receive.retry")}
                            </button>
                          ) : (
                            <span className="tx-empty">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
