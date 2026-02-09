import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { type Address, erc20Abi, formatEther } from "viem";
import { sepolia } from "viem/chains";
import { type UseBalanceReturnType, useReadContract } from "wagmi";

import { AAVE_CONTRACTS } from "~/utils/constants";
import type { Tab } from "~/utils/tabs";

import { QuickActions } from "./QuickActions";

interface Props {
  setActiveTab: (next: Tab) => void;
  accountAddress: Address;
  shadowAccount: Address;
  balance: UseBalanceReturnType;
  justActivated: boolean;
  setJustActivated: Dispatch<SetStateAction<boolean>>;
}

type AnimationPhase = "activated-enter" | "activated-exit" | "balance-enter" | "balance-visible";

export function WalletInfo({
  accountAddress,
  balance,
  shadowAccount,
  setActiveTab,
  justActivated,
  setJustActivated,
}: Props) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<AnimationPhase | null>(justActivated ? "activated-enter" : null);

  const aaveBalance = useReadContract({
    address: AAVE_CONTRACTS.aToken,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [shadowAccount!],
    chainId: sepolia.id,
  });

  const hasAaveDeposits = aaveBalance.isSuccess && aaveBalance.data && aaveBalance.data > 0n;

  useEffect(() => {
    if (!justActivated) return;

    // Phase 1: "Wallet Activated!" enters from left
    setAnimationPhase("activated-enter");

    // Phase 2: After 3s, "Wallet Activated!" exits to right
    const exitTimer = setTimeout(() => {
      setAnimationPhase("activated-exit");
    }, 3000);

    // Phase 3: After exit animation (0.4s), "Your Balance" enters from left
    const balanceEnterTimer = setTimeout(() => {
      setAnimationPhase("balance-enter");
    }, 3400);

    // Phase 4: After enter animation, stays visible
    const balanceVisibleTimer = setTimeout(() => {
      setAnimationPhase("balance-visible");
      setJustActivated(false);
    }, 3800);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(balanceEnterTimer);
      clearTimeout(balanceVisibleTimer);
    };
  }, [justActivated]);

  function handleCopyAddress() {
    navigator.clipboard.writeText(accountAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function truncateAddress(address: string) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  return (
    <div id="wallet-view">
      <div className="balance-display">
        <div
          id="home-wallet-balance"
          className="balance-label"
        >
          {animationPhase === "activated-enter" || animationPhase === "activated-exit" ? (
            <span className={animationPhase === "activated-enter" ? "fade-in-left" : "fade-out-right"}>
              {t("home.walletActivated")}
            </span>
          ) : animationPhase === "balance-enter" ? (
            <span className="fade-in-left">{t("home.walletBalance")}</span>
          ) : (
            t("home.walletBalance")
          )}
        </div>
        <div className="balance-amount">
          <span id="balanceDisplay">
            {balance.isSuccess && `${Number(formatEther(balance.data.value)).toFixed(4)} ETH`}
            {balance.isPending && "..."}
            {balance.isError && t("home.balanceError")}
          </span>
        </div>
        <button
          className="address-badge"
          onClick={handleCopyAddress}
        >
          <span id="walletAddressDisplay">{truncateAddress(accountAddress)}</span>
          {copied ? (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M20 6L9 17L4 12"
                stroke="#22c55e"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="9"
                y="9"
                width="13"
                height="13"
                rx="2"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                stroke="currentColor"
                strokeWidth="2"
              />
            </svg>
          )}
          {copied && <span className="copied-badge">{t("home.copied") || "Copied!"}</span>}
        </button>
      </div>

      <QuickActions
        setActiveTab={setActiveTab}
        balance={balance}
        accountAddress={accountAddress}
        shadowAccount={shadowAccount}
        aaveBalance={hasAaveDeposits ? aaveBalance.data : undefined}
        justActivated={justActivated}
      />
    </div>
  );
}
