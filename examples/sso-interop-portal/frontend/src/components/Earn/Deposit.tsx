import { type ChangeEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { type Address, formatEther, parseEther } from "viem";
import type { UseBalanceReturnType } from "wagmi";

import { depositToAave } from "~/utils/l1-interop/aave-txns";
import type { PasskeyCredential } from "~/utils/types";

import { Spinner } from "./Spinner";

interface Props {
  balance: UseBalanceReturnType;
  triggerRefresh: () => void;
  shadowAccount?: Address;
  accountAddress?: Address;
  passkeyCredentials?: PasskeyCredential;
}

export function Deposit({ balance, shadowAccount, accountAddress, passkeyCredentials, triggerRefresh }: Props) {
  const [depositAmount, setDepositAmount] = useState<string>("0");
  const [isSending, setIsSending] = useState<boolean>(false);
  const [depositError, setDepositError] = useState<string>();

  const { t } = useTranslation();

  const btnsDisabled =
    accountAddress && passkeyCredentials && shadowAccount && balance.data?.value && balance.data?.value > BigInt(0)
      ? false
      : true;

  function handleDepositAmountChange(e: ChangeEvent<HTMLInputElement>) {
    if (balance.isSuccess) {
      const newAmount = parseEther(e.target.value);
      if (newAmount > balance.data.value) {
        setDepositAmount(formatEther(balance.data.value));
      } else {
        setDepositAmount(e.target.value);
      }
    }
  }

  function handleMaxDeposit() {
    if (balance.isSuccess) {
      setDepositAmount(formatEther(balance.data.value));
    }
  }

  async function depositETH(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSending(true);
    setDepositError(undefined);
    try {
      const amount = depositAmount === "" ? undefined : parseEther(depositAmount);
      if (!shadowAccount || !passkeyCredentials || !accountAddress) throw new Error("missing account info");
      if (!amount) throw new Error("invalid amount");
      console.log("Depositing ETH");
      await depositToAave(amount, shadowAccount, accountAddress, passkeyCredentials);
      balance.refetch();
      triggerRefresh();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.log("Error depositing ETH:", error);
      setDepositError(error.message && typeof error.message === "string" ? error.message : "unknown error");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="card">
      <form
        id="aave-deposit-form"
        onSubmit={depositETH}
      >
        <div className="form-group">
          <div className="label-row">
            <label
              id="earn-deposit-amount"
              htmlFor="aaveDepositAmount"
            >
              {t("earn.depositAmount")}
            </label>
            <span
              className="max-link"
              onClick={btnsDisabled || isSending ? undefined : handleMaxDeposit}
              role="button"
              tabIndex={btnsDisabled || isSending ? -1 : 0}
            >
              Max
            </span>
          </div>
          <input
            type="number"
            id="aaveDepositAmount"
            step="any"
            placeholder="0.01"
            min="0"
            value={depositAmount}
            disabled={btnsDisabled || isSending}
            onChange={handleDepositAmountChange}
          />
        </div>
        <button
          id="aaveDepositBtn"
          disabled={btnsDisabled || isSending}
          type="submit"
        >
          {isSending ? (
            <span className="deploying-content">
              <Spinner />
              {t("earn.depositing")}
            </span>
          ) : (
            t("earn.depositBtn")
          )}
        </button>
      </form>

      {depositError && (
        <div
          id="aave-deposit-error"
          className="alert alert-error"
        >
          {t("earn.depositFailed")} {depositError};
        </div>
      )}
    </div>
  );
}
