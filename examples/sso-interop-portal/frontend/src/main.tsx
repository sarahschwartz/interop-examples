import "./index.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import i18n from "i18next";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { initReactI18next } from "react-i18next";
import { WagmiProvider } from "wagmi";

import ENGLISH from "~/locales/en/main.json";
import SPANISH from "~/locales/es/main.json";
import PORTUGUESE_BR from "~/locales/pt/main.json";

import App from "./App.tsx";
import { config } from "./utils/wagmi.ts";

i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    // the translations
    // (tip move them in a JSON file and import them,
    // or even better, manage them via a UI: https://react.i18next.com/guides/multiple-translation-files#manage-your-translations-with-a-management-gui)
    resources: {
      en: ENGLISH,
      es: SPANISH,
      pt: PORTUGUESE_BR,
    },
    lng: "en",
    fallbackLng: "en",

    interpolation: {
      escapeValue: false,
    },
  });

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
);
