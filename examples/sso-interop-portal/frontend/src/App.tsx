import { useEffect, useState } from "react";
import type { Address } from "viem";
import { useBalance } from "wagmi";

import { EarnTab } from "./components/Earn/EarnTab";
import { Header } from "./components/Header";
import { HomeTab } from "./components/Home/HomeTab";
import { InteropTab } from "./components/Interop/InteropTab";
import { Navigation } from "./components/Navigation";
import { SendTab } from "./components/SendTab";
import { SHOW_INTEROP, zksyncOsTestnet } from "./utils/constants";
import { getShadowAccount } from "./utils/l1-interop/aave-utils";
import { getTabFromUrl, setTabInUrl, type Tab } from "./utils/tabs";
import type { PasskeyCredential } from "./utils/types";

function App() {
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [passkeyCredentials, setPasskeyCredentials] = useState<PasskeyCredential>();
  const [accountAddress, setAccountAddress] = useState<Address>();
  const [activeTab, setActiveTab] = useState<Tab>(() => getTabFromUrl());
  const [shadowAccount, setShadowAccount] = useState<Address>();

  useEffect(() => {
    async function updateShadowAccount(address: Address) {
      const shadow = await getShadowAccount(address);
      setShadowAccount(shadow);
    }

    if (accountAddress) updateShadowAccount(accountAddress);
  }, [accountAddress]);

  const balance = useBalance({
    address: accountAddress,
    chainId: zksyncOsTestnet.id,
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsMounted(true);
      const onPopState = () => setActiveTab(getTabFromUrl());
      window.addEventListener("popstate", onPopState);
      return () => window.removeEventListener("popstate", onPopState);
    }
  }, []);

  function setTab(next: Tab) {
    setActiveTab(next);
    setTabInUrl(next, { replace: true });
  }

  return (
    <>
      <Header balance={balance} />
      <div className="container">
        <Navigation
          activeTab={activeTab}
          setActiveTab={setTab}
        />
        <div style={{ display: activeTab === "Home" ? "block" : "none" }}>
          <HomeTab
            accountAddress={accountAddress}
            passkeyCredentials={passkeyCredentials}
            setAccountAddress={setAccountAddress}
            setPasskeyCredentials={setPasskeyCredentials}
            setActiveTab={setTab}
            balance={balance}
            isMounted={isMounted}
            shadowAccount={shadowAccount}
          />
        </div>

        <div style={{ display: activeTab === "Send" ? "block" : "none" }}>
          <SendTab
            accountAddress={accountAddress}
            balance={balance}
            passkeyCredentials={passkeyCredentials}
          />
        </div>

        <div style={{ display: activeTab === "Earn" ? "block" : "none" }}>
          <EarnTab
            accountAddress={accountAddress}
            shadowAccount={shadowAccount}
            balance={balance}
            passkeyCredentials={passkeyCredentials}
          />
        </div>

        {SHOW_INTEROP && (
          <div style={{ display: activeTab === "Interop" ? "block" : "none" }}>
            <InteropTab />
          </div>
        )}
      </div>
    </>
  );
}

export default App;
