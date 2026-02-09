import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { type Address, erc20Abi, formatEther } from "viem";
import { sepolia } from "viem/chains";
import { type UseBalanceReturnType, useReadContract } from "wagmi";

import { AAVE_CONTRACTS, STATUS_ENDPOINT } from "~/utils/constants";
import type { Tab } from "~/utils/tabs";
import type { FinalizedTxnState, PasskeyCredential, PendingTxnState } from "~/utils/types";

import { BackButton } from "../BackButton";
import { ActivityTab } from "./Activity";
import { Deposit } from "./Deposit";
import { Withdraw } from "./Withdraw";

type EarnSubTab = "deposit" | "withdraw";

interface Props {
  accountAddress?: Address;
  shadowAccount?: Address;
  balance: UseBalanceReturnType;
  passkeyCredentials?: PasskeyCredential;
  setActiveTab: (next: Tab) => void;
}

export function EarnTab({ accountAddress, shadowAccount, balance, passkeyCredentials, setActiveTab }: Props) {
  const [pendingTxns, setPendingTxns] = useState<PendingTxnState[]>([]);
  const [finalizedTxns, setFinalizedTxns] = useState<FinalizedTxnState[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<EarnSubTab>("deposit");
  const [refreshTick, setRefreshTick] = useState(0);
  const triggerRefresh = () => setRefreshTick((x) => x + 1);

  const aaveBalance = useReadContract({
    address: AAVE_CONTRACTS.aToken,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [shadowAccount!],
    chainId: sepolia.id,
  });

  const { t } = useTranslation();

  useEffect(() => {
    if (!accountAddress) return;

    const controller = new AbortController();

    const getActivity = async () => {
      try {
        const response = await fetch(STATUS_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountAddress }),
          signal: controller.signal,
        });
        if (!response.ok) return;

        const status = await response.json();
        if (controller.signal.aborted) return;

        setPendingTxns(status.responseObject.pending);
        setFinalizedTxns(status.responseObject.finalized);
      } catch (err: any) {
        if (err?.name !== "AbortError") console.error("Error updating status:", err);
      }
    };

    getActivity();
    const intervalId = setInterval(getActivity, 60_000);

    return () => {
      controller.abort();
      clearInterval(intervalId);
    };
  }, [accountAddress, refreshTick]);

  return (
    <div
      className="tab-content"
      id="earn-tab"
    >
      <div className="tab-header">
        <BackButton setActiveTab={setActiveTab} />
        <div
          id="earn-title"
          className="tab-title"
        >
          {t("earn.title")}
        </div>
      </div>
      <p
        id="earn-subtitle"
        className="tab-description"
      >
        {t("earn.subtitle")}
      </p>

      {shadowAccount && (
        <div
          id="aave-balance-section"
          className="aave-info"
        >
          <div className="aave-info-row">
            <span
              id="earn-shadow"
              className="info-label"
            >
              {t("earn.shadowAccount")}
            </span>
            <span className="info-value">
              <a
                href={`https://sepolia.etherscan.io/address/${shadowAccount}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <code id="shadowAccountDisplay">{shadowAccount}</code>
              </a>
            </span>
          </div>
          <div className="aave-info-row">
            <span
              id="earn-deposits"
              className="info-label"
            >
              {t("earn.deposits")}
              <button
                id="refreshAaveBalanceBtn"
                className="refresh-btn-inline"
                onClick={() => aaveBalance.refetch()}
              >
                {t("earn.refreshBtn")}
              </button>
            </span>
            <span className="info-value">
              <span id="aaveBalanceDisplay">{aaveBalance.data ? formatEther(aaveBalance.data) : "0"}</span> aETH
            </span>
          </div>
        </div>
      )}

      <div className="earn-tabs">
        <button
          className={`earn-tab-btn ${activeSubTab === "deposit" ? "active" : ""}`}
          onClick={() => setActiveSubTab("deposit")}
        >
          {t("earn.depositLabel")}
        </button>
        <button
          className={`earn-tab-btn ${activeSubTab === "withdraw" ? "active" : ""}`}
          onClick={() => setActiveSubTab("withdraw")}
        >
          {t("earn.withdrawLabel")}
        </button>
      </div>

      {activeSubTab === "deposit" && (
        <Deposit
          shadowAccount={shadowAccount}
          balance={balance}
          passkeyCredentials={passkeyCredentials}
          accountAddress={accountAddress}
          triggerRefresh={triggerRefresh}
        />
      )}

      {activeSubTab === "withdraw" && (
        <Withdraw
          shadowAccount={shadowAccount}
          aaveBalance={aaveBalance}
          balance={balance}
          passkeyCredentials={passkeyCredentials}
          accountAddress={accountAddress}
          triggerRefresh={triggerRefresh}
        />
      )}

      <ActivityTab
        pendingTxns={pendingTxns}
        finalizedTxns={finalizedTxns}
      />
    </div>
  );
}
