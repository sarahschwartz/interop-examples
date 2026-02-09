import { type ChangeEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { type Address, formatEther } from "viem";
import type { UseBalanceReturnType } from "wagmi";

import { STORAGE_KEY_LANGUAGE, zksyncOsTestnet } from "~/utils/constants";
import { handleResetPasskey } from "~/utils/sso/passkeys";
import type { Tab } from "~/utils/tabs";

interface Props {
  balance: UseBalanceReturnType;
  activeTab: Tab;
  accountAddress?: Address;
}

export function Header({ balance, accountAddress, activeTab }: Props) {
  const { t, i18n } = useTranslation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleLangChange(e: ChangeEvent<HTMLSelectElement>) {
    await i18n.changeLanguage(e.target.value);
    localStorage.setItem(STORAGE_KEY_LANGUAGE, e.target.value);
  }

  function handleCopyAddress() {
    if (accountAddress) {
      navigator.clipboard.writeText(accountAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function truncateAddress(address: string) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  return (
    <div className="app-header">
      <div className="nav-left">
        <div className="app-logo">
          <img src="logo.svg" />
          <span className="app-name-badge">Passkey Wallet</span>
        </div>
      </div>
      <div className="header-right">
        <div className="header-badge lang-badge">
          <select
            id="lang"
            onChange={handleLangChange}
            value={i18n.resolvedLanguage ?? i18n.language}
          >
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="pt">Português (BR)</option>
          </select>
        </div>
        <div className="header-badge">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
          <span id="headerNetwork">{activeTab === "Interop" ? t("interop.networkHeader") : zksyncOsTestnet.name}</span>
        </div>

        {activeTab !== "Interop" && accountAddress && (
          <div className="wallet-dropdown">
            <button
              className="header-badge wallet-badge"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M21 12V7H3v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M3 7V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle
                  cx="16"
                  cy="12"
                  r="2"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
              <span id="headerBalance">
                {balance.isSuccess && `${Number(formatEther(balance.data.value)).toFixed(4)} ETH`}
                {balance.isPending && "--"}
                {balance.isError && t("home.balanceError")}
              </span>
              <svg
                className={`dropdown-arrow ${isDropdownOpen ? "open" : ""}`}
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6 9l6 6 6-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {isDropdownOpen && (
              <>
                <div
                  className="dropdown-overlay"
                  onClick={() => setIsDropdownOpen(false)}
                />
                <div className="dropdown-menu">
                  <div
                    className="dropdown-item address-item"
                    onClick={handleCopyAddress}
                  >
                    <div className="address-row">
                      <code>{truncateAddress(accountAddress)}</code>
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
                    </div>
                    {copied && <span className="copied-text">{t("home.copied") || "Copied!"}</span>}
                  </div>
                  <div className="dropdown-divider" />
                  <button
                    className="dropdown-item disconnect-item"
                    onClick={() => handleResetPasskey(t("home.resetPasskeyAlert"))}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <polyline
                        points="16,17 21,12 16,7"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <line
                        x1="21"
                        y1="12"
                        x2="9"
                        y2="12"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {t("home.resetPasskeyMainBtn")}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
