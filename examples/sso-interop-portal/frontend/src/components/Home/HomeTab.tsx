import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Address } from "viem";
import type { UseBalanceReturnType } from "wagmi";

import { loadExistingPasskey } from "~/utils/sso/passkeys";
import type { Tab } from "~/utils/tabs";
import type { PasskeyCredential } from "~/utils/types";

import { CreatePasskey } from "./CreatePasskey";
import { DeployAccount } from "./DeployAccount";
import { WalletInfo } from "./WalletInfo";

interface Props {
  setPasskeyCredentials: Dispatch<SetStateAction<PasskeyCredential | undefined>>;
  setAccountAddress: Dispatch<SetStateAction<Address | undefined>>;
  setActiveTab: (next: Tab) => void;
  balance: UseBalanceReturnType;
  isMounted: boolean;
  passkeyCredentials?: PasskeyCredential;
  accountAddress?: Address;
  shadowAccount?: Address;
}

export function HomeTab({
  setPasskeyCredentials,
  setAccountAddress,
  setActiveTab,
  accountAddress,
  shadowAccount,
  passkeyCredentials,
  balance,
  isMounted,
}: Props) {
  const [justActivated, setJustActivated] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const { savedPasskey, savedAccount } = loadExistingPasskey();
    if (savedPasskey) setPasskeyCredentials(savedPasskey);
    if (savedAccount) setAccountAddress(savedAccount);
  }, []);

  function handleAccountDeployed(address: Address) {
    setJustActivated(true);
    setAccountAddress(address);
  }

  return (
    <div
      className="tab-content active"
      id="home-tab"
    >
      {isMounted ? (
        <>
          {!passkeyCredentials || !accountAddress ? (
            <div id="setup-section">
              <div style={{ padding: "24px 0" }}>
                <div
                  id="home-get-started"
                  className="card-title"
                >
                  {t("home.getStarted")}
                </div>
                <div
                  id="home-setup-wallet"
                  className="card-subtitle"
                >
                  {t("home.setupWallet")}
                </div>
              </div>

              {/* <!-- Step 1: Create Passkey --> */}
              <CreatePasskey
                passkeyCredentials={passkeyCredentials}
                setPasskeyCredentials={setPasskeyCredentials}
              />

              {/* <!-- Step 2: Deploy Account --> */}
              <DeployAccount
                passkeyCredentials={passkeyCredentials}
                setAccountAddress={handleAccountDeployed}
              />
            </div>
          ) : (
            <WalletInfo
              accountAddress={accountAddress}
              shadowAccount={shadowAccount!}
              balance={balance}
              setActiveTab={setActiveTab}
              justActivated={justActivated}
              setJustActivated={setJustActivated}
            />
          )}
        </>
      ) : (
        <div className="spinner">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
          >
            <path
              fill="currentColor"
              d="M10.72,19.9a8,8,0,0,1-6.5-9.79A7.77,7.77,0,0,1,10.4,4.16a8,8,0,0,1,9.49,6.52A1.54,1.54,0,0,0,21.38,12h.13a1.37,1.37,0,0,0,1.38-1.54,11,11,0,1,0-12.7,12.39A1.54,1.54,0,0,0,12,21.34h0A1.47,1.47,0,0,0,10.72,19.9Z"
            >
              <animateTransform
                attributeName="transform"
                dur="0.75s"
                repeatCount="indefinite"
                type="rotate"
                values="0 12 12;360 12 12"
              />
            </path>
          </svg>
        </div>
      )}
    </div>
  );
}
