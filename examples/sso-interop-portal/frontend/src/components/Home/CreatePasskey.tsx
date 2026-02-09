import { type Dispatch, type SetStateAction, useState } from "react";
import { useTranslation } from "react-i18next";

import { createNewPasskey, handleResetPasskey } from "~/utils/sso/passkeys";
import type { PasskeyCredential } from "~/utils/types";

interface Props {
  setPasskeyCredentials: Dispatch<SetStateAction<PasskeyCredential | undefined>>;
  passkeyCredentials?: PasskeyCredential;
}

export function CreatePasskey({ setPasskeyCredentials, passkeyCredentials }: Props) {
  const [passkeyName, setPasskeyName] = useState<string>();
  const [passkeyBtnDisabled, setPasskeyBtnDisabled] = useState<boolean>(false);
  const [creationError, setCreationError] = useState<"no-user-name" | "error">();

  const { t } = useTranslation();

  async function handleCreatePasskey(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      setCreationError(undefined);
      if (!passkeyName) {
        setCreationError("no-user-name");
        return;
      }
      setPasskeyBtnDisabled(true);
      const newCredentials = await createNewPasskey(passkeyName);
      setPasskeyCredentials(newCredentials);
    } catch (e) {
      console.log("Error creating passkey:", e);
      setCreationError("error");
    } finally {
      setPasskeyBtnDisabled(false);
    }
  }

  return (
    <div
      className={`setup-step ${passkeyCredentials?.credentialId ? "completed" : ""}`}
      id="passkey-step"
    >
      {passkeyCredentials?.credentialId && (
        <div className="step-header">
          <div className="step-icon-completed">✓</div>
          <div className="step-header-content">
            <div>
              <div
                id="home-create-key"
                className="step-title"
              >
                {t("home.keyCreated")}
              </div>
              <div className="credential-id">
                {t("home.credentialID")} <code>{passkeyCredentials.credentialId}</code>
              </div>
            </div>
            <button
              id="resetPasskeyBtn"
              className="secondary small"
              onClick={() => handleResetPasskey(t("home.resetPasskeyAlert"))}
            >
              {t("home.resetPasskeyBtn")}
            </button>
          </div>
        </div>
      )}

      {!passkeyCredentials?.credentialId && (
        <form
          id="passkey-input"
          onSubmit={handleCreatePasskey}
        >
          <div
            id="home-user-name"
            className="step-title"
            style={{ marginBottom: 16 }}
          >
            {t("home.userName")}
          </div>
          <div className="form-group">
            <input
              type="text"
              id="userName"
              placeholder="my-wallet"
              onChange={(e) => setPasskeyName(e.target.value)}
            />
          </div>
          <button
            id="createPasskeyBtn"
            type="submit"
            disabled={passkeyBtnDisabled}
          >
            {passkeyBtnDisabled ? t("home.creating") : t("home.createPasskeyBtn")}
          </button>
        </form>
      )}

      {creationError && (
        <div
          id="passkey-error"
          className="alert alert-error"
        >
          {creationError === "no-user-name" ? t("home.enterUserName") : t("home.failedToCreateKey")}
        </div>
      )}
    </div>
  );
}
