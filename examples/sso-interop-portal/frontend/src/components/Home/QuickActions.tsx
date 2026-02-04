import { useState } from "react";
import { useTranslation } from "react-i18next";
import { type Address, parseEther } from "viem";
import { entryPoint08Abi } from "viem/account-abstraction";
import { sepolia } from "viem/chains";
import { useBalance, type UseBalanceReturnType, useReadContract } from "wagmi";

import { FAUCET_ENDPOINT, ssoContracts, zksyncOsTestnet } from "~/utils/constants";
import type { Tab } from "~/utils/tabs";

interface Props {
  setActiveTab: (next: Tab) => void;
  balance: UseBalanceReturnType;
  accountAddress: Address;
  shadowAccount: Address;
}

export function QuickActions({ setActiveTab, balance, accountAddress, shadowAccount }: Props) {
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
  const showFaucetBtn = entryPointIsLow || accountBalIsLow || shadowAccountIsLow;

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
    <div className="card button-card">
      <div
        id="home-quick-actions"
        className="card-title"
      >
        {t("home.quickActions")}
      </div>
      <button
        id="quickSendBtn"
        onClick={() => setActiveTab("Send")}
      >
        {t("home.quickSendBtn")}
      </button>
      <button
        id="quickEarnBtn"
        className="secondary"
        onClick={() => setActiveTab("Earn")}
      >
        {t("home.quickEarnBtn")}
      </button>
      {showFaucetBtn && (
        <button
          id="faucetBtn"
          className="secondary"
          onClick={handleFaucet}
          disabled={isCallingFaucet}
        >
          {isCallingFaucet ? t("home.funding") : t("home.faucetBtn")}
        </button>
      )}
    </div>
  );
}
