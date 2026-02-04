import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Address } from "viem";

import { STATUS_ENDPOINT } from "~/utils/constants";
import type { FinalizedTxnState, PendingTxnState } from "~/utils/types";

interface Props {
  accountAddress?: Address;
}

export function ActivityTab({ accountAddress }: Props) {
  const [pendingTxns, setPendingTxns] = useState<PendingTxnState[]>([]);
  const [finalizedTxns, setFinalizedTxns] = useState<FinalizedTxnState[]>([]);
  const { t } = useTranslation();

  useEffect(() => {
    if (!accountAddress) return;

    let cancelled = false;

    async function getActivity() {
      try {
        const response = await fetch(STATUS_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountAddress }),
        });

        if (!response.ok || cancelled) return;

        const status = await response.json();
        setPendingTxns(status.responseObject.pending);
        setFinalizedTxns(status.responseObject.finalized);
      } catch (err) {
        console.error("Failed to fetch activity", err);
      }
    }

    // run immediately
    getActivity();

    // then every minute
    const intervalId = setInterval(getActivity, 60_000);

    // cleanup
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [accountAddress]);

  if (pendingTxns.length > 0 || finalizedTxns.length > 0) {
    return (
      <div
        className="tab-content"
        id="activity-tab"
      >
        <div className="card">
          <div
            id="activity-title"
            className="card-title"
          >
            {t("earn.activity")}
          </div>
          <table
            className="tx-table"
            id="pending-txns-list"
          >
            <thead>
              <tr>
                <th>{t("earn.action")}</th>
                <th>{t("earn.depositAmount")}</th>
                <th>{t("earn.status")}</th>
                <th>{t("earn.finalizedAt")}</th>
              </tr>
            </thead>
            <tbody>
              {pendingTxns.map((tx) => (
                <tr key={tx.hash}>
                  <td>{tx.action}</td>
                  <td className="tx-amount">{tx.amount}</td>
                  <td>
                    <span className="tx-status tx-status--pending">{t("earn.pending")}</span>
                  </td>
                  <td>--</td>
                </tr>
              ))}
              {finalizedTxns.map((tx) => (
                <tr key={tx.l1FinalizeTxHash}>
                  <td>{t(`earn.${tx.action === "Deposit" ? "depositLabel" : "withdrawLabel"}`)}</td>
                  <td className="tx-amount">{parseFloat(tx.amount).toFixed(4)}</td>
                  <td>
                    <span className="tx-status tx-status--success">{t("earn.finalized")}</span>
                  </td>
                  <td className="tx-date">{new Date(tx.finalizedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
}
