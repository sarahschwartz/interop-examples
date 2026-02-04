import { type ChangeEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { type Address, formatEther, parseEther } from "viem";
import type { UseBalanceReturnType } from "wagmi";

import { depositToAave } from "~/utils/l1-interop/aave-txns";
import type { PasskeyCredential } from "~/utils/types";

interface Props {
  balance: UseBalanceReturnType;
  shadowAccount?: Address;
  accountAddress?: Address;
  passkeyCredentials?: PasskeyCredential;
}

export function Deposit({ balance, shadowAccount, accountAddress, passkeyCredentials }: Props) {
  const [depositAmount, setDepositAmount] = useState<string>("0");
  const [isSending, setIsSending] = useState<boolean>(false);
  const [depositSuccess, setDepositSuccess] = useState<boolean>(false);
  const [depositError, setDepositError] = useState<string>();
  const [txHash, setTxHash] = useState<string>();

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
    setTxHash(undefined);
    setIsSending(true);
    setDepositSuccess(false);
    setDepositError(undefined);
    const amount = depositAmount === "" ? undefined : parseEther(depositAmount);
    if (!shadowAccount || !amount || !passkeyCredentials || !accountAddress) return;
    try {
      console.log("Depositing ETH");
      const hash = await depositToAave(amount, shadowAccount, accountAddress, passkeyCredentials);
      setTxHash(hash);
      setDepositSuccess(true);
      balance.refetch();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.log("Error depositing ETH:", error);
      setDepositError(error);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="card">
      <div
        id="earn-deposit-label"
        className="card-title"
      >
        {t("earn.depositLabel")}
      </div>
      <form
        id="aave-deposit-form"
        onSubmit={depositETH}
      >
        <div className="form-group">
          <label
            id="earn-deposit-amount"
            htmlFor="aaveDepositAmount"
          >
            {t("earn.depositAmount")}
          </label>
          <div className="send-form-container">
            <input
              type="number"
              id="aaveDepositAmount"
              step="0.001"
              placeholder="0.01"
              value={depositAmount}
              disabled={btnsDisabled || isSending}
              onChange={handleDepositAmountChange}
            />
            <button
              className="maxBtn"
              type="button"
              disabled={btnsDisabled || isSending}
              onClick={handleMaxDeposit}
            >
              Max
            </button>
          </div>
        </div>
        <button
          id="aaveDepositBtn"
          disabled={btnsDisabled || isSending}
          type="submit"
        >
          {isSending ? t("earn.depositing") : t("earn.depositBtn")}
        </button>
      </form>

      {depositSuccess && (
        <div
          id="aave-deposit-success"
          className="alert alert-success"
        >
          <strong id="earn-deposit-init">{t("earn.depositInit")}</strong>
          <div className="info-row">
            <span
              id="earn-deposit-tx"
              className="info-label"
            >
              {t("earn.depositTx")}
            </span>
            <span className="info-value">
              <a
                id="transfer-tx-link"
                href={`https://zksync-os-testnet-alpha.staging-scan-v2.zksync.dev/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <code id="aaveDepositTxHash">{txHash}</code>
              </a>
            </span>
          </div>
          <div
            id="earn-deposit-wait-msg"
            className="alert-info earn-wait-msg"
          >
            {t("earn.depositWaitMsg")}
          </div>
        </div>
      )}

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
