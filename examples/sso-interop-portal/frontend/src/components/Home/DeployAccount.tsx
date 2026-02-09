import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Address } from "viem";

import { DEPLOY_ACCOUNT_ENDPOINT } from "~/utils/constants";
import { saveAccountAddress } from "~/utils/sso/passkeys";
import type { DeployAccountArgs, PasskeyCredential } from "~/utils/types";

import { Spinner } from "../Earn/Spinner";

interface Props {
  setAccountAddress: (address: Address) => void;
  passkeyCredentials?: PasskeyCredential;
}

const DEPLOY_STEPS = ["home.deployStep1", "home.deployStep2", "home.deployStep3"] as const;

export function DeployAccount({ passkeyCredentials, setAccountAddress }: Props) {
  const [deployBtnDisabled, setDeployBtnDisabled] = useState<boolean>(true);
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [deployError, setDeployError] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);

  useEffect(() => {
    const disable = passkeyCredentials?.credentialId ? false : true;
    setDeployBtnDisabled(disable);
  }, [passkeyCredentials]);

  useEffect(() => {
    if (!isDeploying) {
      setCurrentStep(0);
      return;
    }

    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < DEPLOY_STEPS.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [isDeploying]);

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
      console.log("JSON:", json);
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
      {isDeploying ? (
        <div className="deploying-progress">
          <button
            id="deployAccountBtn"
            className="deploy-btn"
            disabled={true}
          >
            <span className="deploying-content">
              <Spinner />
              {t("home.deploying")}
            </span>
          </button>
          <p
            className="deploying-step-text"
            key={currentStep}
          >
            {t(DEPLOY_STEPS[currentStep])}
            <span className="animated-dots" />
          </p>
        </div>
      ) : (
        <div className="step-header">
          <div className="step-icon-pending">
            <svg
              className="dashed-circle"
              width="40"
              height="40"
              viewBox="0 0 40 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                cx="20"
                cy="20"
                r="19"
                stroke="#555a66"
                strokeWidth="1"
                strokeDasharray="4 4"
                strokeOpacity="0.5"
              />
            </svg>
            <svg
              className="wallet-icon"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M21 12V7H3v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M3 7V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx="16"
                cy="12"
                r="2"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
          </div>
          <div className="step-header-content">
            <div>
              <div
                id="home-activate-wallet"
                className="step-title"
              >
                {t("home.activateWallet")}
              </div>
              <p
                id="home-deploy-wallet"
                className="deploy-subtitle"
              >
                {t("home.deployWallet")}
              </p>
            </div>
            <button
              id="deployAccountBtn"
              className="deploy-btn"
              disabled={deployBtnDisabled}
              onClick={handleDeployAccount}
            >
              {t("home.deployAccountBtn")}
            </button>
          </div>
        </div>
      )}

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
