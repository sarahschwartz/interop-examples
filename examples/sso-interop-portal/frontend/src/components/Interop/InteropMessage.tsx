import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Hex } from "viem";

import { sendInteropMessage } from "~/utils/l2-interop/interop-messages";

import { Spinner } from "../Earn/Spinner";

interface Props {
  networksDetected: boolean;
}

export function InteropMessage({ networksDetected }: Props) {
  const [message, setMessage] = useState<string>("hello interop");
  const [isAToB, setIsAToB] = useState<boolean>(true);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [messageError, setMessageError] = useState<boolean>(false);
  const [error, setError] = useState<string | undefined>();
  const [progress, setProgress] = useState<string[]>([]);
  const [txInfo, setTxInfo] = useState<{
    txHash: Hex;
    isAToB: boolean;
    message: string;
  }>();

  const { t } = useTranslation();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProgress([]);
    setIsSending(true);
    setMessageError(false);
    setError(undefined);
    setIsSuccess(false);
    if (!message) {
      setMessageError(true);
      return;
    }
    try {
      const info = await sendInteropMessage(message, isAToB, onProgress);
      setTxInfo(info);
      setIsSuccess(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.log("Error sending tokens: ", error, typeof error);
      setError(error.message && typeof error.message === "string" ? error.message : "unknown error");
    } finally {
      setIsSending(false);
    }
  }

  function onProgress(step: string) {
    setProgress((prev) => [...prev, step]);
  }

  return (
    <>
      <div
        id="interop-send-msg-label"
        className="tab-title"
        style={{ marginTop: "8px", marginBottom: "16px" }}
      >
        {t("interop.sendMsgLabel")}
      </div>
      <div className="card">
        <form
          id="interop-form"
          onSubmit={handleSubmit}
        >
          <div className="form-row">
            <div
              className="form-group"
              style={{ flex: 1 }}
            >
              <label
                id="interop-msg-label"
                htmlFor="interopMessage"
              >
                {t("interop.msgLabel")}
              </label>
              <input
                type="text"
                id="interopMessage"
                placeholder="hello interop"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            <div
              className="form-group"
              style={{ flexShrink: 0 }}
            >
              <label id="interop-msg-direction">{t("interop.msgDirection")}</label>
              <div className="direction-swap">
                <span className="direction-chain">
                  <span className="direction-label">From</span>{" "}
                  {isAToB ? t("interop.chainA").replace(":", "") : t("interop.chainB").replace(":", "")}
                </span>
                <button
                  type="button"
                  className="swap-btn secondary-brand"
                  onClick={() => setIsAToB(!isAToB)}
                  aria-label="Swap direction"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M7 16L3 12M3 12L7 8M3 12H21M17 8L21 12M21 12L17 16M21 12H3"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="swap-text">Swap</span>
                </button>
                <span className="direction-chain">
                  <span className="direction-label">To</span>{" "}
                  {isAToB ? t("interop.chainB").replace(":", "") : t("interop.chainA").replace(":", "")}
                </span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            id="interopSendBtn"
            disabled={!networksDetected}
          >
            {t("interop.sendMsgBtn")}
          </button>
        </form>

        {isSending && (
          <div
            id="interop-progress"
            className="progress-section"
          >
            <div className="progress-title">
              <Spinner />
              <span id="interopProgressTitle">Sending message...</span>
            </div>
            <div
              id="interopProgressSteps"
              className="progress-steps"
            >
              {progress.map((step, i) => (
                <div key={i}>{step}</div>
              ))}
            </div>
          </div>
        )}

        {isSuccess && (
          <div
            id="interop-success"
            className="success-section"
          >
            <div
              className="success-title"
              id="interop-msg-verified"
            >
              {t("interop.msgVerified")}
            </div>
            <div className="success-row">
              <span
                id="interop-src-chain-tx"
                className="info-label"
              >
                {t("interop.srcChainTx")}
              </span>
              <span className="info-value">
                <code id="interopTxHashSource">{txInfo?.txHash}</code>
              </span>
            </div>
            <div className="success-row">
              <span
                id="interop-msg-text"
                className="info-label"
              >
                {t("interop.msg")}
              </span>
              <span className="info-value">
                <code id="interopMessageText">{txInfo?.message}</code>
              </span>
            </div>
            <div className="success-row">
              <span
                id="interop-msg-final-direction"
                className="info-label"
              >
                {t("interop.msgFinalDirection")}
              </span>
              <span className="info-value">
                <span id="interopMessageDirectionValue">{txInfo?.isAToB ? t("interop.aToB") : t("interop.bToA")}</span>
              </span>
            </div>
            <div className="success-row">
              <span
                id="interop-msg-verified-on-dest"
                className="info-label"
              >
                {t("interop.msgVerifiedOnDestination")}
              </span>
              <span
                id="interop-msg-success"
                className="info-value success-text"
              >
                {t("interop.msgSuccess")}
              </span>
            </div>
          </div>
        )}
        {error ||
          (messageError && (
            <div
              id="interop-error"
              className="alert alert-error"
            >
              {messageError ? t("interop.msgInvalid") : `${t("interop.msgError")} ${error}`}
            </div>
          ))}
      </div>
    </>
  );
}
