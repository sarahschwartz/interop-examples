import { useTranslation } from "react-i18next";
import { type Address, erc20Abi, formatEther } from "viem";
import { sepolia } from "viem/chains";
import { type UseBalanceReturnType, useReadContract } from "wagmi";

import { AAVE_CONTRACTS } from "~/utils/constants";
import type { PasskeyCredential } from "~/utils/types";

import { ActivityTab } from "./Activity";
import { Deposit } from "./Deposit";
import { Withdraw } from "./Withdraw";

interface Props {
  accountAddress?: Address;
  shadowAccount?: Address;
  balance: UseBalanceReturnType;
  passkeyCredentials?: PasskeyCredential;
}

export function EarnTab({ accountAddress, shadowAccount, balance, passkeyCredentials }: Props) {
  const aaveBalance = useReadContract({
    address: AAVE_CONTRACTS.aToken,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [shadowAccount!],
    chainId: sepolia.id,
  });

  const { t } = useTranslation();

  return (
    <div
      className="tab-content"
      id="earn-tab"
    >
      <div className="card">
        <div
          id="earn-title"
          className="card-title"
        >
          {t("earn.title")}
        </div>
        <div
          id="earn-subtitle"
          className="card-subtitle"
        >
          {t("earn.subtitle")}
        </div>
      </div>

      {shadowAccount && (
        <div
          id="aave-balance-section"
          className="card"
        >
          <div className="info-row">
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
          <div className="info-row">
            <span
              id="earn-deposits"
              className="info-label"
            >
              {t("earn.deposits")}
            </span>
            <span className="info-value">
              <span id="aaveBalanceDisplay">{aaveBalance.data ? formatEther(aaveBalance.data) : "0"}</span> aETH
            </span>
          </div>
          <button
            id="refreshAaveBalanceBtn"
            className="secondary small"
            onClick={() => aaveBalance.refetch()}
          >
            {t("earn.refreshBtn")}
          </button>
        </div>
      )}

      <Deposit
        shadowAccount={shadowAccount}
        balance={balance}
        passkeyCredentials={passkeyCredentials}
        accountAddress={accountAddress}
      />

      <Withdraw
        shadowAccount={shadowAccount}
        aaveBalance={aaveBalance}
        balance={balance}
        passkeyCredentials={passkeyCredentials}
        accountAddress={accountAddress}
      />

      <ActivityTab accountAddress={accountAddress} />
    </div>
  );
}
