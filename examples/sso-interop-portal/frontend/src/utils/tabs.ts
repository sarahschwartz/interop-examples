export const TABS = ["Home", "Send", "Earn", "Interop"] as const;
export type Tab = (typeof TABS)[number];

export function getTabFromUrl(): Tab {
  const sp = new URLSearchParams(window.location.search);
  const t = sp.get("tab");
  return (TABS as readonly string[]).includes(t ?? "") ? (t as Tab) : "Home";
}

export function setTabInUrl(next: Tab, { replace }: { replace: boolean }) {
  const url = new URL(window.location.href);
  url.searchParams.set("tab", next);
  if (replace) window.history.replaceState({}, "", url);
  else window.history.pushState({}, "", url);
}
