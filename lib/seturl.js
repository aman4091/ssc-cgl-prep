// 🔗 Set ka natija khula ho to URL mein ?set=<pehchaan>&at=<sawaal> (owner):
// natije se ✍️ stylus khola, wapas aaye — to wahi set ka natija, USI sawaal
// par (pehle sets ki list par pahunch jaate the). Home ka "▶" bhi ?set= se
// hi set kholta hai. Natija band karte hi dono hat jaate hain.

const swap = (u) => {
  const next = u.pathname + u.search + u.hash;
  if (next !== window.location.pathname + window.location.search + window.location.hash) {
    window.history.replaceState(window.history.state, "", next);
  }
};

export function readSetUrl() {
  if (typeof window === "undefined") return { set: "", at: 0 };
  const sp = new URLSearchParams(window.location.search);
  return { set: sp.get("set") || "", at: Math.max(0, Number(sp.get("at")) || 0) };
}
export function putSetUrl(set, at) {
  if (typeof window === "undefined") return;
  const u = new URL(window.location.href);
  u.searchParams.set("set", String(set));
  u.searchParams.set("at", String(at || 0));
  swap(u);
}
export function dropSetUrl() {
  if (typeof window === "undefined") return;
  const u = new URL(window.location.href);
  u.searchParams.delete("set");
  u.searchParams.delete("at");
  swap(u);
}
// Natije ka `path` (Home ke liye) — set/at ke bina.
export function pagePath() {
  if (typeof window === "undefined") return "";
  const u = new URL(window.location.href);
  u.searchParams.delete("set");
  u.searchParams.delete("at");
  return u.pathname + u.search;
}
