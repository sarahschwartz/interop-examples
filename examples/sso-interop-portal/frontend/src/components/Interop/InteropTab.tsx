import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { erc20Abi } from "viem";

import { CLIENT_CHAIN_A, CLIENT_CHAIN_B, TOKEN_ADDRESS } from "~/utils/constants";
import type { Tab } from "~/utils/tabs";

import { BackButton } from "../BackButton";
import { InteropMessage } from "./InteropMessage";
import { TokenTransfer } from "./TokenTransfer";

interface Props {
  setActiveTab: (next: Tab) => void;
}

export function InteropTab({ setActiveTab }: Props) {
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
      <div className="tab-header">
        <BackButton setActiveTab={setActiveTab} />
        <div
          id="interop-title"
          className="tab-title"
        >
          {t("interop.title")}
        </div>
      </div>
      <p
        id="interop-subtitle"
        className="tab-description"
      >
        {t("interop.subtitle")}
      </p>

      <div
        className="aave-info"
        style={{ marginBottom: "16px", alignItems: "flex-start" }}
      >
        <span>
          <strong id="interop-note-label">{t("interop.noteLabel")}</strong>{" "}
          <span id="interop-note">{t("interop.note")}</span>
        </span>
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

      <InteropMessage networksDetected={networksDetected} />

      <TokenTransfer networksDetected={networksDetected} />
    </div>
  );
}
