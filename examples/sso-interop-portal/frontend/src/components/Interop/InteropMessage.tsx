import { type ChangeEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Hex } from "viem";

import { sendInteropMessage } from "~/utils/l2-interop/interop-messages";

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
    } catch (error) {
      console.log("Error sending tokens: ", error, typeof error);
      setError(typeof error === "string" ? error : "unknown error");
    } finally {
      setIsSending(false);
    }
  }

  function onProgress(step: string) {
    setProgress((prev) => [...prev, step]);
  }

  function handleDirectionChange(e: ChangeEvent<HTMLSelectElement>) {
    if (e.target.value === "a-to-b") {
      setIsAToB(true);
    } else {
      setIsAToB(false);
    }
  }

  return (
    <>
      <div className="card">
        <div
          id="interop-send-msg-label"
          className="card-title"
        >
          {t("interop.sendMsgLabel")}
        </div>
        <form
          id="interop-form"
          onSubmit={handleSubmit}
        >
          <div className="form-group">
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

          <div className="form-group">
            <label
              id="interop-msg-direction"
              htmlFor="interopMessageDirection"
            >
              {t("interop.msgDirection")}
            </label>
            <select
              id="interopMessageDirection"
              className="interop-direction-box"
              onChange={handleDirectionChange}
            >
              <option
                id="interop-a-to-b"
                value="a-to-b"
              >
                {t("interop.aToB")}
              </option>
              <option
                id="interop-b-to-a"
                value="b-to-a"
              >
                {t("interop.bToA")}
              </option>
            </select>
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
            className="alert alert-info"
          >
            <strong id="interopProgressTitle">{t("interop.msgProgressTitle")}</strong>
            <div id="interopProgressSteps">
              {progress.map((step, i) => (
                <div key={i}>{step}</div>
              ))}
            </div>
          </div>
        )}

        {isSuccess && (
          <div
            id="interop-success"
            className="alert alert-success"
          >
            <strong id="interop-msg-verified">{t("interop.msgVerified")}</strong>
            <div className="info-row">
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
            <div className="info-row">
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
            <div className="info-row">
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
            <div className="info-row">
              <span
                id="interop-msg-verified-on-dest"
                className="info-label"
              >
                {t("interop.msgVerifiedOnDestination")}
              </span>
              <span
                id="interop-msg-success"
                className="info-value"
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
