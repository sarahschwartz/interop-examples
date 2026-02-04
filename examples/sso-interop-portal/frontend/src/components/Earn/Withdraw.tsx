import { type ChangeEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { type Address, formatEther, parseEther } from "viem";
import type { UseBalanceReturnType, UseReadContractReturnType } from "wagmi";

import { withdrawFromAave } from "~/utils/l1-interop/aave-txns";
import type { PasskeyCredential } from "~/utils/types";

interface Props {
  aaveBalance: UseReadContractReturnType;
  balance: UseBalanceReturnType;
  shadowAccount?: Address;
  accountAddress?: Address;
  passkeyCredentials?: PasskeyCredential;
}

export function Withdraw({ aaveBalance, balance, shadowAccount, accountAddress, passkeyCredentials }: Props) {
  const [withdrawAmount, setWithdrawAmount] = useState<string>("0");
  const [isSending, setIsSending] = useState<boolean>(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState<boolean>(false);
  const [withdrawError, setWithdrawError] = useState<string>();
  const [txHash, setTxHash] = useState<string>();

  const { t } = useTranslation();

  const btnsDisabled =
    accountAddress &&
    passkeyCredentials &&
    shadowAccount &&
    aaveBalance.data &&
    typeof aaveBalance.data === "bigint" &&
    aaveBalance.data > BigInt(0)
      ? false
      : true;

  function handleWithdrawAmountChange(e: ChangeEvent<HTMLInputElement>) {
    if (aaveBalance.data && typeof aaveBalance.data === "bigint") {
      const newAmount = parseEther(e.target.value);
      if (newAmount > aaveBalance.data) {
        setWithdrawAmount(formatEther(aaveBalance.data));
      } else {
        setWithdrawAmount(e.target.value);
      }
    }
  }

  function handleMaxWithdraw() {
    if (aaveBalance.data && typeof aaveBalance.data === "bigint") {
      setWithdrawAmount(formatEther(aaveBalance.data));
    }
  }

  async function withdrawETH(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTxHash(undefined);
    setIsSending(true);
    setWithdrawSuccess(false);
    setWithdrawError(undefined);
    const amount = withdrawAmount === "" ? undefined : parseEther(withdrawAmount);
    if (!shadowAccount || !amount || !passkeyCredentials || !accountAddress) return;
    try {
      console.log("Withdrawing ETH");
      const hash = await withdrawFromAave(amount, shadowAccount, accountAddress, passkeyCredentials);
      setTxHash(hash);
      setWithdrawSuccess(true);
      balance.refetch();
    } catch (error) {
      console.log("Error withdrawing from Aave", error);
      setWithdrawError(typeof error === "string" ? error : "unknown error");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="card">
      <div
        id="earn-withdraw-label"
        className="card-title"
      >
        {t("earn.withdrawLabel")}
      </div>
      <form
        id="aave-withdraw-form"
        onSubmit={withdrawETH}
      >
        <div className="form-group">
          <label
            id="earn-withdraw-amount"
            htmlFor="aaveWithdrawAmount"
          >
            {t("earn.withdrawAmount")}
          </label>
          <div className="send-form-container">
            <input
              type="number"
              id="aaveWithdrawAmount"
              step="0.001"
              placeholder="0.01"
              value={withdrawAmount}
              onChange={handleWithdrawAmountChange}
              disabled={btnsDisabled || isSending}
            />
            <button
              className="maxBtn"
              type="button"
              disabled={btnsDisabled || isSending}
              onClick={handleMaxWithdraw}
            >
              Max
            </button>
          </div>
        </div>
        <button
          id="aaveWithdrawBtn"
          disabled={btnsDisabled || isSending}
          type="submit"
        >
          {isSending ? t("earn.withdrawing") : t("earn.withdrawBtn")}
        </button>
      </form>

      {withdrawSuccess && (
        <div
          id="aave-withdraw-success"
          className="alert alert-success"
        >
          <strong id="earn-withdraw-init">{t("earn.withdrawInit")}</strong>
          <div className="info-row">
            <span
              id="earn-withdraw-tx"
              className="info-label"
            >
              {t("earn.withdrawTx")}
            </span>
            <span className="info-value">
              <a
                id="transfer-tx-link"
                href={`https://zksync-os-testnet-alpha.staging-scan-v2.zksync.dev/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <code id="aaveWithdrawTxHash">{txHash}</code>
              </a>
            </span>
          </div>
          <div
            id="earn-withdraw-wait-msg"
            className="alert-info earn-wait-msg"
          >
            {t("earn.withdrawWaitMsg")}
          </div>
        </div>
      )}

      {withdrawError && (
        <div
          id="aave-withdraw-error"
          className="alert alert-error"
        >
          {t("earn.withdrawFailed")} {withdrawError};
        </div>
      )}
    </div>
  );
}
