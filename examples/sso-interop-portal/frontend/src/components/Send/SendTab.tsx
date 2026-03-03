import { useTranslation } from "react-i18next";
import type { Address } from "viem";
import type { UseBalanceReturnType } from "wagmi";

import type { Tab } from "~/utils/tabs";
import type { PasskeyCredential } from "~/utils/types";

import { BackButton } from "../BackButton";
import { SendToAlias } from "./SendToAlias";
import { Transfer } from "./Transfer";

interface Props {
  accountAddress?: Address;
  balance: UseBalanceReturnType;
  passkeyCredentials?: PasskeyCredential;
  setActiveTab: (next: Tab) => void;
}

export function SendTab({ accountAddress, balance, passkeyCredentials, setActiveTab }: Props) {
  const { t } = useTranslation();

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

      <Transfer
        accountAddress={accountAddress}
        balance={balance}
        passkeyCredentials={passkeyCredentials}
      />

      <SendToAlias />
    </div>
  );
}
