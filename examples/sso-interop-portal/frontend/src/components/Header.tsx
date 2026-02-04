import type { ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { formatEther } from "viem";
import type { UseBalanceReturnType } from "wagmi";

import { zksyncOsTestnet } from "~/utils/constants";

interface Props {
  balance: UseBalanceReturnType;
}

export function Header({ balance }: Props) {
  const { t, i18n } = useTranslation();

  async function handleLangChange(e: ChangeEvent<HTMLSelectElement>) {
    await i18n.changeLanguage(e.target.value);
  }

  return (
    <div className="app-header">
      <div className="nav-left">
        <div className="app-logo">
          <img src="logo.svg" />
          <span>Passkey Wallet</span>
        </div>
        <label className="lang-label">
          <select
            id="lang"
            onChange={handleLangChange}
          >
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="pt">Português (BR)</option>
          </select>
        </label>
      </div>
      <div className="header-right">
        <div className="header-network">
          <span id="topbar-network">{t("topbar.network")}</span>:{" "}
          <strong>
            <span id="headerNetwork">{zksyncOsTestnet.name}</span>
          </strong>
        </div>
        <div className="header-balance">
          <span id="topbar-balance">{t("topbar.balance")}</span>:{" "}
          <strong>
            <span id="headerBalance">
              {balance.isSuccess && `${Number(formatEther(balance.data.value)).toFixed(4)} ETH`}
              {balance.isPending && "--"}
              {balance.isError && t("home.balanceError")}
            </span>
          </strong>
        </div>
      </div>
    </div>
  );
}
