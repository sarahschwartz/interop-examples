import { type ChangeEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { type Address, formatEther, isAddress, parseEther } from "viem";
import type { UseBalanceReturnType } from "wagmi";

import { L2_EXPLORER_BASE, ZKSYNC_OS_EXPLORER_URL } from "~/utils/constants";
import { sendETH } from "~/utils/sso/transfer";
import type { PasskeyCredential } from "~/utils/types";

const SEND_DIRECT_HISTORY_KEY = "send_direct_history";

interface TransferRecord {
  to: string;
  amount: string;
  txHash: string;
  timestamp: number;
}

interface Props {
  accountAddress?: Address;
  balance: UseBalanceReturnType;
  passkeyCredentials?: PasskeyCredential;
}

export function Transfer({ accountAddress, balance, passkeyCredentials }: Props) {
  const [amount, setAmount] = useState<string>("0");
  const [recipient, setRecipient] = useState<string>();
  const [transferError, setTransferError] = useState<string>();
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string>();
  const [txHash, setTxHash] = useState<string>();
  const [history, setHistory] = useState<TransferRecord[]>([]);
  const btnsDisabled = accountAddress && passkeyCredentials ? false : true;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SEND_DIRECT_HISTORY_KEY);
      if (stored) setHistory(JSON.parse(stored) as TransferRecord[]);
    } catch {
      // ignore
    }
  }, []);

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
      const record: TransferRecord = { to: recipient, amount, txHash: hash, timestamp: Date.now() };
      setHistory((prev) => {
        const updated = [record, ...prev];
        try {
          localStorage.setItem(SEND_DIRECT_HISTORY_KEY, JSON.stringify(updated));
        } catch {
          /* ignore */
        }
        return updated;
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      setTransferError("transferFailed");
      setError(error.message && typeof error.message === "string" ? error.message : "unknown error");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <>
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
              onChange={(event) => setRecipient(event.target.value)}
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
                  href={`${L2_EXPLORER_BASE}${txHash}`}
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

      <div className="card">
        <div>
          <h3 className="tab-subtitle">{t("send.transferHistory")}</h3>
          <table className="tx-table">
            <thead>
              <tr>
                <th>{t("send.recipient")}</th>
                <th>{t("send.amountShort")}</th>
                <th>{t("send.statusShort")}</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="tx-empty"
                  >
                    {t("send.noTransfers")}
                  </td>
                </tr>
              ) : (
                history.map((record) => (
                  <tr key={record.txHash}>
                    <td>
                      <a
                        href={`${ZKSYNC_OS_EXPLORER_URL}/address/${record.to}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <code>
                          {record.to.slice(0, 6)}…{record.to.slice(-4)}
                        </code>
                      </a>
                    </td>
                    <td>{record.amount} ETH</td>
                    <td>
                      <a
                        href={`${L2_EXPLORER_BASE}${record.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span className="status-badge status-completed">{t("send.done")}</span>
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
