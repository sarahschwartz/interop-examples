import { type ChangeEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { type Address, formatEther, isAddress, parseEther } from "viem";
import type { UseBalanceReturnType } from "wagmi";

import { sendETH } from "~/utils/sso/transfer";
import type { Tab } from "~/utils/tabs";
import type { PasskeyCredential } from "~/utils/types";

import { BackButton } from "./BackButton";

interface Props {
  accountAddress?: Address;
  balance: UseBalanceReturnType;
  passkeyCredentials?: PasskeyCredential;
  setActiveTab: (next: Tab) => void;
}

export function SendTab({ accountAddress, balance, passkeyCredentials, setActiveTab }: Props) {
  const [amount, setAmount] = useState<string>("0");
  const [recipient, setRecipient] = useState<string>();
  const [transferError, setTransferError] = useState<string>();
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string>();
  const [txHash, setTxHash] = useState<string>();
  const btnsDisabled = accountAddress && passkeyCredentials ? false : true;

  const { t } = useTranslation();

  function handleAmountChange(e: ChangeEvent<HTMLInputElement>) {
    if (balance.isSuccess) {
      const newAmount = parseEther(e.target.value);
      if (newAmount > balance.data.value) {
        setAmount(formatEther(balance.data.value));
      } else {
        setAmount(e.target.value);
      }
    }
  }

  function handleMax() {
    if (balance.isSuccess) {
      setAmount(formatEther(balance.data.value));
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSending(true);
    setIsSuccess(false);
    setTransferError(undefined);
    setError(undefined);
    setTxHash(undefined);

    try {
      if (!accountAddress || !passkeyCredentials) throw new Error("missing account or passkey");
      if (parseEther(amount) === BigInt(0) || !recipient) {
        setTransferError("inputError");
        return;
      }
      if (!isAddress(recipient)) {
        setTransferError("addressError");
        return;
      }

      const hash = await sendETH(amount, recipient, accountAddress, passkeyCredentials);
      setTxHash(hash);
      setIsSuccess(true);
      balance.refetch();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.log("Error sending transfer:", error);
      setTransferError("transferFailed");
      setError(error.message && typeof error.message === "string" ? error.message : "unknown error");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div
      className="tab-content"
      id="send-tab"
    >
      <div className="tab-header">
        <BackButton setActiveTab={setActiveTab} />
        <div
          id="send-money"
          className="tab-title"
        >
          {t("send.sendMoney")}
        </div>
      </div>
      <div className="card">
        <form
          onSubmit={handleSubmit}
          id="transfer-form"
        >
          <div className="form-group">
            <label
              id="send-recipient"
              htmlFor="recipientAddress"
            >
              {t("send.recipientAddress")}
            </label>
            <input
              type="text"
              id="recipientAddress"
              placeholder="0x..."
              onChange={(e) => setRecipient(e.target.value)}
            />
          </div>

          <div className="form-group">
            <div className="label-row">
              <label
                id="send-amount"
                htmlFor="transferAmount"
              >
                {t("send.amount")}
              </label>
              <span
                className="max-link"
                onClick={btnsDisabled || isSending ? undefined : handleMax}
                role="button"
                tabIndex={btnsDisabled || isSending ? -1 : 0}
              >
                Max
              </span>
            </div>
            <input
              type="number"
              id="transferAmount"
              min="0"
              step="any"
              placeholder="0.01"
              value={amount}
              onChange={handleAmountChange}
              disabled={btnsDisabled || isSending}
            />
          </div>

          <button
            id="transferBtn"
            disabled={btnsDisabled || isSending}
            type="submit"
          >
            {isSending ? t("send.sending") : t("send.transferBtn")}
          </button>
        </form>

        {isSuccess && (
          <div
            id="transfer-success"
            className="alert alert-success"
          >
            <strong id="send-tx-sent">{t("send.txSent")}</strong>
            <div className="info-row">
              <span
                id="send-tx-label"
                className="info-label"
              >
                {t("send.txLabel")}
              </span>
              <span className="info-value">
                <a
                  id="transfer-tx-link"
                  href={`https://zksync-os-testnet-alpha.staging-scan-v2.zksync.dev/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <code id="txHashDisplay">{txHash}</code>
                </a>
              </span>
            </div>
          </div>
        )}

        {transferError && (
          <div
            id="transfer-error"
            className="alert alert-error"
          >
            {t(`send.${transferError}`)} {error}
          </div>
        )}
      </div>
    </div>
  );
}
