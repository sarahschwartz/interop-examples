import { type ChangeEvent, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { erc20Abi, formatUnits, type Hex, parseUnits, zeroAddress } from "viem";
import { useReadContract, useReadContracts } from "wagmi";

import { NATIVE_TOKEN_VAULT_ABI } from "~/utils/abis/abis";
import { CHAIN_A, CHAIN_B, L2_NATIVE_TOKEN_VAULT_ADDRESS, LOCAL_RICH_ACCOUNT, TOKEN_ADDRESS } from "~/utils/constants";
import { transferTokensInterop } from "~/utils/l2-interop/interop-token-transfer";
import { computeAssetId } from "~/utils/l2-interop/interop-utils";

interface Props {
  networksDetected: boolean;
}

export function TokenTransfer({ networksDetected }: Props) {
  const [amountInput, setAmountInput] = useState("100");
  const [isAToB, setIsAToB] = useState<boolean>(true);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [transferError, setTransferError] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [progress, setProgress] = useState<string[]>([]);
  const [txInfo, setTxInfo] = useState<{
    sendTxHash: Hex;
    executeTxHash: Hex;
    amount: bigint;
    isAToB: boolean;
  }>();

  const { t } = useTranslation();

  const tokenAInfo = {
    address: TOKEN_ADDRESS,
    abi: erc20Abi,
    chainId: CHAIN_A.id,
  } as const;

  const tokenAResult = useReadContracts({
    contracts: [
      {
        ...tokenAInfo,
        functionName: "balanceOf",
        args: [LOCAL_RICH_ACCOUNT.address],
      },
      {
        ...tokenAInfo,
        functionName: "symbol",
      },
      {
        ...tokenAInfo,
        functionName: "name",
      },
      {
        ...tokenAInfo,
        functionName: "decimals",
      },
    ],
  });

  const assetId = useMemo(() => computeAssetId(BigInt(CHAIN_A.id), TOKEN_ADDRESS), []);

  const tokenBAddress = useReadContract({
    address: L2_NATIVE_TOKEN_VAULT_ADDRESS,
    abi: NATIVE_TOKEN_VAULT_ABI,
    functionName: "tokenAddress",
    args: [assetId],
    chainId: CHAIN_B.id,
  });

  const tokenBBalance = useReadContract({
    address: tokenBAddress.isSuccess ? (tokenBAddress.data as `0x${string}`) : zeroAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [LOCAL_RICH_ACCOUNT.address],
    chainId: CHAIN_B.id,
  });

  function handleRefresh() {
    tokenAResult.refetch();
    tokenBBalance.refetch();
  }

  function handleDirectionChange(e: ChangeEvent<HTMLSelectElement>) {
    if (e.target.value === "a-to-b") {
      setIsAToB(true);
    } else {
      setIsAToB(false);
    }
  }

  function onProgress(step: string) {
    setProgress((prev) => [...prev, step]);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProgress([]);
    setIsSending(true);
    setError(undefined);
    setTransferError(undefined);
    setIsSuccess(false);

    const amount = amountInput === "" ? undefined : Number(amountInput);
    if (!amount || amount === 0) {
      setTransferError("amountError");
      return;
    }

    if (!tokenBBalance.isSuccess && !isAToB) {
      setTransferError("directionError");
      return;
    }

    if (!tokenAResult.isSuccess) throw new Error("missing token info");

    try {
      const inputAmount = parseUnits(amount.toString(), tokenAResult.data[3].result!);

      if (!tokenAResult.data[0].result || (isAToB && inputAmount > tokenAResult.data[0].result)) {
        setTransferError("invalidAmountA");
        return;
      }
      if ((!isAToB && !tokenBBalance.data) || (!isAToB && inputAmount > tokenBBalance.data!)) {
        setTransferError("invalidAmountB");
        return;
      }
      console.log("sending...");
      const token = isAToB ? TOKEN_ADDRESS : tokenBAddress.data;
      const result = await transferTokensInterop(token, inputAmount, isAToB, onProgress);
      setTxInfo(result);
      setIsSuccess(true);
      handleRefresh();
    } catch (error) {
      console.log("Error sending tokens: ", error, typeof error);
      setError(typeof error === "string" ? error : "unknown error");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <>
      <div className="card">
        <div
          id="interop-token-transfer-title"
          className="card-title"
        >
          {t("interop.tokenTransferTitle")}
        </div>
        <div
          id="interop-token-transfer-subtitle"
          className="card-subtitle"
        >
          {t("interop.tokenTransferSubtitle")}
        </div>

        {/* <!-- Token Info --> */}
        <div
          id="token-info"
          className="alert-info"
        >
          <div className="info-row">
            <span
              id="interop-token-label"
              className="info-label"
            >
              {t("interop.tokenLabel")}
            </span>
            <span className="info-value">
              <span id="tokenSymbol">{tokenAResult.isSuccess ? tokenAResult.data[1]?.result : "-"}</span>{" "}
              {tokenAResult.isSuccess && <span>({tokenAResult.data[2]?.result})</span>}
            </span>
          </div>
          <div className="info-row">
            <span
              id="interop-token-address"
              className="info-label"
            >
              {t("interop.tokenAddress")}
            </span>
            <span className="info-value">
              <code id="tokenAddress">{TOKEN_ADDRESS}</code>
            </span>
          </div>
          <div className="info-row">
            <span
              id="interop-chain-a-balance"
              className="info-label"
            >
              {t("interop.chainABalance")}
            </span>
            <span className="info-value">
              {tokenAResult.isSuccess ? (
                <span>
                  <span id="tokenBalanceA">
                    {tokenAResult.data[0].result && tokenAResult.data[3].result
                      ? formatUnits(tokenAResult.data[0].result, tokenAResult.data[3].result)
                      : "0"}
                  </span>{" "}
                  <span id="tokenSymbolA">{tokenAResult.data[1].result}</span>
                </span>
              ) : (
                <span>-</span>
              )}
            </span>
          </div>
          <div className="info-row">
            <span
              id="interop-chain-b-balance"
              className="info-label"
            >
              {t("interop.chainBBalance")}
            </span>
            <span className="info-value">
              {tokenBBalance.isSuccess && tokenAResult.isSuccess ? (
                <span>
                  <span id="tokenBalance">{formatUnits(tokenBBalance.data, tokenAResult.data[3].result!)}</span>{" "}
                  <span id="tokenSymbolB">{tokenAResult.data[1].result}</span>
                </span>
              ) : (
                <>
                  {tokenAResult.isSuccess ? (
                    <span>
                      0 ({t("interop.notBridgedYet")}) {tokenAResult.data[1].result}
                    </span>
                  ) : (
                    <span>-</span>
                  )}
                </>
              )}
            </span>
          </div>
          <button
            id="refreshTokenBalancesBtn"
            onClick={handleRefresh}
          >
            {t("interop.refreshTokenBalanceBtn")}
          </button>
        </div>

        {/* <!-- Transfer Form --> */}
        <form
          id="token-transfer-form"
          onSubmit={handleSubmit}
        >
          <div className="form-group">
            <label
              id="interop-token-transfer-amount"
              htmlFor="tokenTransferAmount"
            >
              {t("interop.tokenTransferAmount")}
            </label>
            <input
              type="number"
              id="tokenTransferAmount"
              placeholder="100"
              value={amountInput}
              step="1"
              min="0"
              onChange={(e) => setAmountInput(e.target.value)}
              disabled={!networksDetected || isSending}
            />
          </div>

          <div className="form-group">
            <label
              id="interop-transfer-direction"
              htmlFor="tokenTransferDirection"
            >
              {t("interop.transferDirection")}
            </label>
            <select
              id="tokenTransferDirection"
              className="interop-direction-box"
              onChange={handleDirectionChange}
              disabled={!networksDetected || isSending}
            >
              <option
                id="interop-transfer-token-a-to-b"
                value="a-to-b"
              >
                {t("interop.aToB")}
              </option>
              <option
                id="interop-transfer-token-b-to-a"
                value="b-to-a"
              >
                {t("interop.bToA")}
              </option>
            </select>
          </div>

          <button
            id="tokenTransferBtn"
            disabled={!networksDetected || isSending}
            type="submit"
          >
            {isSending ? t("interop.transferring") : t("interop.transferBtn")}
          </button>
        </form>

        {isSending && (
          <div
            id="token-transfer-progress"
            className="alert alert-info"
          >
            <strong id="tokenTransferProgressTitle">{t("interop.transferProgressTitle")}</strong>
            <div id="tokenTransferProgressSteps">
              {progress.map((step, i) => (
                <div key={i}>{step}</div>
              ))}
            </div>
          </div>
        )}

        {isSuccess && txInfo && (
          <div
            id="token-transfer-success"
            className="alert alert-success"
          >
            <strong id="interop-transfer-complete">{t("interop.transferComplete")}</strong>
            <div className="info-row">
              <span
                id="interop-status-src-chain-tx"
                className="info-label"
              >
                {t("interop.statusSrcChainTx")}
              </span>
              <span className="info-value">
                <code id="tokenTransferTxHashSource">{txInfo.sendTxHash}</code>
              </span>
            </div>
            <div className="info-row">
              <span
                id="interop-destination-chain-tx"
                className="info-label"
              >
                {t("interop.destinationChainTx")}
              </span>
              <span className="info-value">
                <code id="tokenTransferTxHashDest">{txInfo.executeTxHash}</code>
              </span>
            </div>
            <div className="info-row">
              <span
                id="interop-status-amount"
                className="info-label"
              >
                {t("interop.statusAmount")}
              </span>
              {tokenAResult.isSuccess && (
                <span className="info-value">
                  <span id="tokenTransferAmountValue">
                    {tokenAResult.data[3].result ? formatUnits(txInfo.amount, tokenAResult.data[3].result) : "0"}
                  </span>{" "}
                  <span id="tokenTransferSymbol">{tokenAResult.data[1].result}</span>
                </span>
              )}
            </div>
            <div className="info-row">
              <span
                id="interop-status-direction"
                className="info-label"
              >
                {t("interop.statusDirection")}
              </span>
              <span className="info-value">
                <span id="tokenTransferDirectionValue">{txInfo.isAToB ? t("interop.aToB") : t("interop.bToA")}</span>
              </span>
            </div>
          </div>
        )}

        {error ||
          (transferError && (
            <div
              id="token-transfer-error"
              className="alert alert-error"
            >
              {transferError ? t(`interop.${transferError}`) : `${t("interop.tokenTransferFailed")} ${error}`}
            </div>
          ))}
      </div>
    </>
  );
}
