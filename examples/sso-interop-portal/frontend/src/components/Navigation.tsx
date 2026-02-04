import type { MouseEvent } from "react";
import { useTranslation } from "react-i18next";

import { SHOW_INTEROP } from "~/utils/constants";
import type { Tab } from "~/utils/tabs";

interface Props {
  activeTab: Tab;
  setActiveTab: (next: Tab) => void;
}

export function Navigation({ activeTab, setActiveTab }: Props) {
  const { t } = useTranslation();

  function handleTabChange(e: MouseEvent<HTMLButtonElement>) {
    const tab = e.currentTarget.dataset.tab;
    setActiveTab(tab as Tab);
  }

  return (
    <div className="nav-tabs">
      <button
        className={`nav-tab ${activeTab === "Home" ? "active" : ""}`}
        data-tab="Home"
        id="nav-home"
        onClick={handleTabChange}
      >
        {t("nav.home")}
      </button>
      <button
        className={`nav-tab ${activeTab === "Send" ? "active" : ""}`}
        data-tab="Send"
        id="nav-send"
        onClick={handleTabChange}
      >
        {t("nav.send")}
      </button>
      <button
        className={`nav-tab ${activeTab === "Earn" ? "active" : ""}`}
        data-tab="Earn"
        id="nav-earn"
        onClick={handleTabChange}
      >
        {t("nav.earn")}
      </button>

      {SHOW_INTEROP && (
        <button
          className={`nav-tab ${activeTab === "Interop" ? "active" : ""}`}
          data-tab="Interop"
          id="nav-interop"
          onClick={handleTabChange}
        >
          {t("nav.interop")}
        </button>
      )}
    </div>
  );
}
