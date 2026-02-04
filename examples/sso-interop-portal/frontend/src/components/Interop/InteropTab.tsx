import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { erc20Abi } from "viem";

import { CLIENT_CHAIN_A, CLIENT_CHAIN_B, TOKEN_ADDRESS } from "~/utils/constants";

import { InteropMessage } from "./InteropMessage";
import { TokenTransfer } from "./TokenTransfer";

export function InteropTab() {
  const [networksDetected, setNetworksDetected] = useState<boolean>(false);

  useEffect(() => {
    // check if both local chains are running
    async function checkChains() {
      try {
        const blockNumChainA = await CLIENT_CHAIN_A.getBlockNumber();
        const blockNumChainB = await CLIENT_CHAIN_B.getBlockNumber();
        const tokenInfo = await CLIENT_CHAIN_A.readContract({
          address: TOKEN_ADDRESS,
          abi: erc20Abi,
          functionName: "symbol",
        });
        if (blockNumChainA && blockNumChainB && tokenInfo) {
          setNetworksDetected(true);
        }
      } catch (error) {
        console.log("Error detecting local chains or token:", error);
      }
    }
    checkChains();
  }, []);

  const { t } = useTranslation();

  return (
    <div
      className="tab-content"
      id="interop-tab"
    >
      <div className="card">
        <div
          id="interop-title"
          className="card-title"
        >
          {t("interop.title")}
        </div>
        <div className="card-subtitle">
          <span id="interop-subtitle">{t("interop.subtitle")}</span>
          <br />
          <strong>
            <span id="interop-note-label">{t("interop.noteLabel")}</span>
          </strong>{" "}
          <span id="interop-note">{t("interop.note")}</span>
        </div>
        {/* <!-- Connection Warning --> */}
        {!networksDetected && (
          <div className="alert alert-error">
            <strong>
              ⚠️ <span id="interop-connection-issue">{t("interop.connectionIssue")}</span>
            </strong>
            <div id="interop-warning-message"></div>
            <div className="interop-connection-box">
              <span id="interop-connection-msg">{t("interop.connectionMsg")}</span>
              <ul className="connection-list">
                <li id="interop-connection-check-1">{t("interop.connectionCheck1")}</li>
                <li id="interop-connection-check-2">{t("interop.connectionCheck2")}</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      <InteropMessage networksDetected={networksDetected} />

      <TokenTransfer networksDetected={networksDetected} />
    </div>
  );
}
