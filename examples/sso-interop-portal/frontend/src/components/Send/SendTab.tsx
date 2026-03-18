import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Address } from "viem";
import type { UseBalanceReturnType } from "wagmi";

import { SHOW_ALIASES } from "~/utils/constants";
import type { Tab } from "~/utils/tabs";
import type { PasskeyCredential } from "~/utils/types";

import { BackButton } from "../BackButton";
import { SendToAlias } from "./SendToAlias";
import { Transfer } from "./Transfer";

type SendSubTab = "direct" | "alias";

interface Props {
  accountAddress?: Address;
  balance: UseBalanceReturnType;
  passkeyCredentials?: PasskeyCredential;
  setActiveTab: (next: Tab) => void;
}

export function SendTab({ accountAddress, balance, passkeyCredentials, setActiveTab }: Props) {
  const { t } = useTranslation();
  const [activeSubTab, setActiveSubTab] = useState<SendSubTab>("direct");

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

      {SHOW_ALIASES && (
        <div className="earn-tabs">
          <button
            className={`earn-tab-btn ${activeSubTab === "direct" ? "active" : ""}`}
            onClick={() => setActiveSubTab("direct")}
          >
            {t("send.sendDirect")}
          </button>
          <button
            className={`earn-tab-btn ${activeSubTab === "alias" ? "active" : ""}`}
            onClick={() => setActiveSubTab("alias")}
          >
            {t("send.sendToAlias")}
          </button>
        </div>
      )}

      {(!SHOW_ALIASES || activeSubTab === "direct") && (
        <Transfer
          accountAddress={accountAddress}
          balance={balance}
          passkeyCredentials={passkeyCredentials}
        />
      )}

      {SHOW_ALIASES && activeSubTab === "alias" && <SendToAlias />}
    </div>
  );
}
