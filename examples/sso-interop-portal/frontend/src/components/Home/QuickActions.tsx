import { useState } from "react";
import { useTranslation } from "react-i18next";
import { type Address, formatEther, parseEther } from "viem";
import { entryPoint08Abi } from "viem/account-abstraction";
import { sepolia } from "viem/chains";
import { useBalance, type UseBalanceReturnType, useReadContract } from "wagmi";

import { FAUCET_ENDPOINT, SHOW_INTEROP, ssoContracts, zksyncOsTestnet } from "~/utils/constants";
import type { Tab } from "~/utils/tabs";

interface Props {
  setActiveTab: (next: Tab) => void;
  balance: UseBalanceReturnType;
  accountAddress: Address;
  shadowAccount: Address;
  aaveBalance?: bigint;
  justActivated: boolean;
}

export function QuickActions({
  setActiveTab,
  balance,
  accountAddress,
  shadowAccount,
  aaveBalance,
  justActivated,
}: Props) {
  const [isCallingFaucet, setIsCallingFaucet] = useState<boolean>(false);
  const { t } = useTranslation();

  const entryPointBalance = useReadContract({
    address: ssoContracts.entryPoint,
    abi: entryPoint08Abi,
    functionName: "balanceOf",
    args: [accountAddress],
    chainId: zksyncOsTestnet.id,
  });

  const shadowAccountBalance = useBalance({
    address: shadowAccount,
    chainId: sepolia.id,
  });

  const MIN_VALUE = parseEther("0.005");

  const entryPointIsLow = entryPointBalance.data !== undefined && entryPointBalance.data < MIN_VALUE ? true : false;
  const accountBalIsLow = balance.data?.value !== undefined && balance.data?.value < MIN_VALUE ? true : false;
  const shadowAccountIsLow =
    shadowAccountBalance.data?.value !== undefined && shadowAccountBalance.data.value < MIN_VALUE ? true : false;
  const showFaucetBtn = !justActivated && (entryPointIsLow || accountBalIsLow || shadowAccountIsLow);

  async function handleFaucet() {
    console.log("calling faucet");
    setIsCallingFaucet(true);
    try {
      const response = await fetch(FAUCET_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountAddress }),
      });
      const json = await response.json();
      if (!json.responseObject.funded) {
        throw new Error(json.message || "API error");
      }
      console.log("funded:", json.responseObject.funded);
      entryPointBalance.refetch();
      shadowAccountBalance.refetch();
      balance.refetch();
    } catch (error) {
      console.log("error calling faucet", error);
    } finally {
      setIsCallingFaucet(false);
    }
  }

  return (
    <>
      <div className="quick-actions-grid">
        <div className="action-card">
          <img
            src="/ic-h-send.svg"
            alt=""
            className="action-card-icon"
          />
          <h3 className="action-card-title">{t("home.sendTitle")}</h3>
          <p className="action-card-desc">{t("home.sendDesc")}</p>
          <button
            id="quickSendBtn"
            className="secondary-brand"
            onClick={() => setActiveTab("Send")}
          >
            {t("home.quickSendBtn")}
          </button>
        </div>

        <div className={`action-card-wrapper ${aaveBalance ? "has-aave" : ""}`}>
          {aaveBalance && (
            <div className="aave-deposits-badge">
              {t("home.aaveDeposits")}: {Number(formatEther(aaveBalance)).toFixed(4)} ETH
            </div>
          )}
          <div className="action-card">
            <img
              src="/ic-h-aave.svg"
              alt=""
              className="action-card-icon"
            />
            <h3 className="action-card-title">{t("home.earnTitle")}</h3>
            <p className="action-card-desc">{t("home.earnDesc")}</p>
            <button
              id="quickEarnBtn"
              className="secondary-brand"
              onClick={() => setActiveTab("Earn")}
            >
              {t("home.quickEarnBtn")}
            </button>
          </div>
        </div>

        {SHOW_INTEROP && (
          <div className="action-card">
            <img
              src="/ic-h-interop.svg"
              alt=""
              className="action-card-icon"
            />
            <h3 className="action-card-title">{t("home.interopTitle")}</h3>
            <p className="action-card-desc">{t("home.interopDesc")}</p>
            <button
              id="quickInteropBtn"
              className="secondary-brand"
              onClick={() => setActiveTab("Interop")}
            >
              {t("home.quickInteropBtn")}
            </button>
          </div>
        )}
      </div>
      {showFaucetBtn && (
        <div className="faucet-card-container">
          <div className="action-card">
            <h3 className="action-card-title">{t("home.faucet")}</h3>
            <p className="action-card-desc">{t("home.faucetDesc")}</p>
            <button
              id="faucetBtn"
              className="secondary-brand"
              onClick={handleFaucet}
              disabled={isCallingFaucet}
            >
              {isCallingFaucet ? t("home.funding") : t("home.faucetBtn")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
