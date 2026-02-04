import { useTranslation } from "react-i18next";

export function Footer() {
  const { t } = useTranslation();

  return (
    <div className="footer">
      <strong>
        <span id="footer-network">{t("footer.network")}</span>
      </strong>{" "}
      ZKSync OS Testnet (Layer 2) • Ethereum Sepolia (Layer 1)
      <br />
      <span id="footer-powered-by-zk">{t("activity.poweredByZk")}</span> •{" "}
      <span id="footer-secured-by-passkeys">{t("activity.securedByPasskeys")}</span>
    </div>
  );
}
