import { type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Address } from "viem";

import { DEPLOY_ACCOUNT_ENDPOINT } from "~/utils/constants";
import { saveAccountAddress } from "~/utils/sso/passkeys";
import type { DeployAccountArgs, PasskeyCredential } from "~/utils/types";

interface Props {
  setAccountAddress: Dispatch<SetStateAction<Address | undefined>>;
  passkeyCredentials?: PasskeyCredential;
}

export function DeployAccount({ passkeyCredentials, setAccountAddress }: Props) {
  const [deployBtnDisabled, setDeployBtnDisabled] = useState<boolean>(true);
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [deployError, setDeployError] = useState<boolean>(false);

  useEffect(() => {
    const disable = passkeyCredentials?.credentialId ? false : true;
    setDeployBtnDisabled(disable);
  }, [passkeyCredentials]);

  async function handleDeployAccount() {
    setDeployError(false);
    setIsDeploying(true);
    if (!passkeyCredentials?.credentialId || !passkeyCredentials.credentialPublicKey) {
      console.log("error deploying account: missing passkey credentials");
      setDeployError(true);
      return;
    }

    try {
      const args: DeployAccountArgs = {
        originDomain: window.location.origin,
        credentialId: passkeyCredentials.credentialId,
        credentialPublicKey: passkeyCredentials.credentialPublicKey,
      };
      const response = await fetch(DEPLOY_ACCOUNT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(args),
      });
      const json = await response.json();
      if (!json.responseObject.accountAddress) {
        throw new Error(json.message || "API error");
      }
      console.log("account deployed:", json.responseObject.accountAddress);
      const deployedAccount = json.responseObject.accountAddress;
      setAccountAddress(deployedAccount);
      saveAccountAddress(deployedAccount);
    } catch (e) {
      console.log("error deploying account", e);
      setDeployError(true);
    } finally {
      setIsDeploying(false);
    }
  }

  const { t } = useTranslation();

  return (
    <div
      className="setup-step"
      id="deploy-step"
    >
      <div className="step-header">
        <div
          className="step-icon"
          id="deploy-icon"
        >
          2
        </div>
        <div
          id="home-activate-wallet"
          className="step-title"
        >
          {t("home.activateWallet")}
        </div>
      </div>

      <div id="deploy-button-container">
        <p
          id="home-deploy-wallet"
          className="card-subtitle"
        >
          {t("home.deployWallet")}
        </p>
        <button
          id="deployAccountBtn"
          disabled={deployBtnDisabled || isDeploying}
          onClick={handleDeployAccount}
        >
          {isDeploying ? t("home.deploying") : t("home.deployAccountBtn")}
        </button>
      </div>

      {deployError && (
        <div
          id="deploy-error"
          className="alert alert-error"
        >
          {t("home.deployFailed")}
        </div>
      )}
    </div>
  );
}
