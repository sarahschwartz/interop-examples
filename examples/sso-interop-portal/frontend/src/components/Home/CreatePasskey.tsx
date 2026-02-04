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
    setCreationError(undefined);
    if (!passkeyName) {
      setCreationError("no-user-name");
      return;
    }
    try {
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
      <div className="step-header">
        <div
          className={`step-icon ${passkeyCredentials?.credentialId ? "completed" : ""}`}
          id="passkey-icon"
        >
          {passkeyCredentials?.credentialId ? "✓" : "1"}
        </div>
        <div
          id="home-create-key"
          className="step-title"
        >
          {t("home.createKey")}
        </div>
      </div>

      {!passkeyCredentials?.credentialId && (
        <form
          id="passkey-input"
          onSubmit={handleCreatePasskey}
        >
          <div className="form-group">
            <label
              id="home-user-name"
              htmlFor="userName"
            >
              {t("home.userName")}
            </label>
            <input
              type="text"
              id="userName"
              placeholder="interop-passkey"
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

      {passkeyCredentials?.credentialId && (
        <div
          id="passkey-success"
          className="alert alert-success"
        >
          {/*
           */}
          <strong id="home-key-created">{t("home.keyCreated")}</strong>
          <div className="info-row">
            <span
              id="home-credential-id"
              className="info-label"
            >
              {t("home.credentialID")}
            </span>
            <span className="info-value">
              <code id="credentialIdDisplay">{passkeyCredentials.credentialId}</code>
            </span>
          </div>
          <button
            id="resetPasskeyBtn"
            className="secondary small"
            onClick={handleResetPasskey}
          >
            {t("home.resetPasskeyBtn")}
          </button>
        </div>
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
