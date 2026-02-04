import { useTranslation } from "react-i18next";
import { type Address, formatEther } from "viem";
import { type UseBalanceReturnType } from "wagmi";

import { handleResetPasskey } from "~/utils/sso/passkeys";
import type { Tab } from "~/utils/tabs";

import { QuickActions } from "./QuickActions";

interface Props {
  setActiveTab: (next: Tab) => void;
  accountAddress: Address;
  shadowAccount: Address;
  balance: UseBalanceReturnType;
}

export function WalletInfo({ accountAddress, balance, shadowAccount, setActiveTab }: Props) {
  const { t } = useTranslation();

  return (
    <div id="wallet-view">
      <div className="balance-display">
        <div
          id="home-wallet-balance"
          className="balance-label"
        >
          {t("home.walletBalance")}
        </div>
        <div className="balance-amount">
          <span id="balanceDisplay">
            {balance.isSuccess && `${Number(formatEther(balance.data.value)).toFixed(4)} ETH`}
            {balance.isPending && "..."}
            {balance.isError && t("home.balanceError")}
          </span>
        </div>
      </div>

      <div className="card">
        <div
          id="home-your-wallet"
          className="card-title"
        >
          {t("home.yourWallet")}
        </div>
        <div className="info-row">
          <span
            id="home-wallet-address-2"
            className="info-label"
          >
            {t("interop.tokenAddress")}
          </span>
          <span className="info-value">
            <code id="walletAddressDisplay">{accountAddress}</code>
          </span>
        </div>
        <button
          id="resetPasskeyMainBtn"
          className="secondary small"
          onClick={handleResetPasskey}
        >
          {t("home.resetPasskeyMainBtn")}
        </button>
      </div>
      <QuickActions
        setActiveTab={setActiveTab}
        balance={balance}
        accountAddress={accountAddress}
        shadowAccount={shadowAccount}
      />
    </div>
  );
}
