import { type ChangeEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { type Address, formatEther, parseEther } from "viem";
import type { UseBalanceReturnType, UseReadContractReturnType } from "wagmi";

import { withdrawFromAave } from "~/utils/l1-interop/aave-txns";
import type { PasskeyCredential } from "~/utils/types";

import { Spinner } from "./Spinner";

interface Props {
  aaveBalance: UseReadContractReturnType;
  triggerRefresh: () => void;
  balance: UseBalanceReturnType;
  shadowAccount?: Address;
  accountAddress?: Address;
  passkeyCredentials?: PasskeyCredential;
}

export function Withdraw({
  aaveBalance,
  balance,
  shadowAccount,
  accountAddress,
  passkeyCredentials,
  triggerRefresh,
}: Props) {
  const [withdrawAmount, setWithdrawAmount] = useState<string>("0");
  const [isSending, setIsSending] = useState<boolean>(false);
  const [withdrawError, setWithdrawError] = useState<string>();

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
    setIsSending(true);
    setWithdrawError(undefined);
    try {
      const amount = withdrawAmount === "" ? undefined : parseEther(withdrawAmount);
      if (!shadowAccount || !passkeyCredentials || !accountAddress) throw new Error("missing account info");
      if (!amount) throw new Error("invalid amount");
      console.log("Withdrawing ETH");
      await withdrawFromAave(amount, shadowAccount, accountAddress, passkeyCredentials);
      balance.refetch();
      triggerRefresh();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.log("Error withdrawing from Aave", error);
      setWithdrawError(error.message && typeof error.message === "string" ? error.message : "unknown error");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="card">
      <form
        id="aave-withdraw-form"
        onSubmit={withdrawETH}
      >
        <div className="form-group">
          <div className="label-row">
            <label
              id="earn-withdraw-amount"
              htmlFor="aaveWithdrawAmount"
            >
              {t("earn.withdrawAmount")}
            </label>
            <span
              className="max-link"
              onClick={btnsDisabled || isSending ? undefined : handleMaxWithdraw}
              role="button"
              tabIndex={btnsDisabled || isSending ? -1 : 0}
            >
              Max
            </span>
          </div>
          <input
            type="number"
            id="aaveWithdrawAmount"
            step="any"
            min="0"
            placeholder="0.01"
            value={withdrawAmount}
            onChange={handleWithdrawAmountChange}
            disabled={btnsDisabled || isSending}
          />
        </div>
        <button
          id="aaveWithdrawBtn"
          disabled={btnsDisabled || isSending}
          type="submit"
        >
          {isSending ? (
            <span className="deploying-content">
              <Spinner />
              {t("earn.withdrawing")}
            </span>
          ) : (
            t("earn.withdrawBtn")
          )}
        </button>
      </form>

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
