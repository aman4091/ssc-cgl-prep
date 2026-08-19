"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV_GROUPS, NAV_DIRECT, trailForPath, nodeAt } from "@/lib/nav";
import { getNewWordEntries, newWordDayKey, newWordDayLabel } from "@/lib/vocab";
import { getUserTopics } from "@/lib/userpyq";

// Nav group key -> user "shelf book" id (Settings → PYQ Manager): jab bank ka
// menu khule to user ke apne topics bhi uske chapters ke saath dikhein.
const SHELF_BY_NAVKEY = {
  warbank: "shelf_war",
  pinnacle: "shelf_pinnacle",
  errorpro: "shelf_errorpro",
  pinmaths: "shelf_mathbank",
  pinreason: "shelf_reasonbank",
  gktricks: "shelf_gktricks",
  mirror: "shelf_mirror",
};

// The menu, and only the menu.
//
// A DRILL-DOWN, not a dropdown: the top level is names only. Tapping one
// replaces the list in place with that group's items and a "← back" row, rather
// than expanding underneath and pushing the rest of the menu down.
//
// Ab ye har chaudai par PARDE ke peeche hai: upar ek patli patti (☰ + naam),
// aur ☰ dabate hi menu baayen se phisal kar page ke UPAR aata hai. Pehle ye
// desktop par hamesha khada rehta tha aur 210px chaura khaana kha jata tha —
// jabki menu se kaam ek baar hota hai, padhai poore page par.
export default function Navbar() {
  const pathname = usePathname();
  const params = useSearchParams();
  // Seeded from the URL during render so landing deep in the app already shows
  // that group, rather than flashing the top level first.
  // A TRAIL, not one key — the menu is three deep: PYQ Bank -> a bank -> its
  // chapters. Back pops one level rather than jumping to the top.
  const [trail, setTrail] = useState(() => trailForPath(pathname));
  // A group can name a BANK instead of listing links — its rows are that bank's
  // chapters, fetched the first time the group is opened and then memoised by
  // the loader itself.
  const [bankLinks, setBankLinks] = useState({});
  // Phones only: the rail is off-canvas until the hamburger asks for it.
  const [open, setOpen] = useState(false);

  useEffect(() => { setTrail(trailForPath(pathname)); }, [pathname]);
  // Page badla to menu apne aap band — parda page ke upar hai, khula chhodne
  // par jis page par gaye ho wahi dikhta hi nahi.
  useEffect(() => { setOpen(false); }, [pathname, params]);
  // Menu khula ho to peeche ka page scroll na ho.
  useEffect(() => {
    if (!open) return undefined;
    document.body.classList.add("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, [open]);

  // /new-words par menu ki jagah pehle DATES dikhti hain (jis din words add
  // hue), date kholne par us din ke words. 5s refresh — overlay se naya word
  // aate hi list mein dikhe.
  const onNewWords = pathname === "/new-words";
  const [newEntries, setNewEntries] = useState([]);
  useEffect(() => {
    if (!onNewWords) return undefined;
    const load = () => setNewEntries([...getNewWordEntries()].reverse()); // naya pehle
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [onNewWords]);
  // Din ke groups — nayi date upar, bina-date wale ("Purane words") sabse neeche.
  const nwDay = onNewWords ? params.get("day") : null;
  const nwGroups = [];
  if (onNewWords) {
    const m = new Map();
    for (const e of newEntries) {
      const k = newWordDayKey(e.at);
      if (!m.has(k)) m.set(k, { key: k, label: newWordDayLabel(e.at), words: [] });
      m.get(k).words.push(e.w);
    }
    nwGroups.push(...m.values());
    nwGroups.sort((a, b) =>
      a.key === "old" ? 1 : b.key === "old" ? -1 : a.key < b.key ? 1 : -1
    );
  }
  const nwDayWords = nwDay
    ? (nwGroups.find((g) => g.key === nwDay) || {}).words || []
    : [];

  // A group can describe a BANK instead of listing links: which index to read,
  // which array in it holds the chapters, and what those rows link to. Fetched
  // the first time the group is opened, then kept.
  useEffect(() => {
    const g = nodeAt(trail);
    if (!g?.bank || bankLinks[g.key]) return;
    let alive = true;
    fetch(g.bank.url)
      .then((r) => (r.ok ? r.json() : null))
      .then((idx) => {
        if (!alive || !idx) return;
        // `list` may be a dotted path: a notes book keeps its chapters at
        // meta.topics, not at the top level.
        let rows =
          g.bank.list.split(".").reduce((o, k) => (o == null ? o : o[k]), idx) || [];
        // gkbank is two shelves in one file, split by subject.
        if (g.bank.subject) rows = rows.filter((c) => c.subject === g.bank.subject);
        // A notes book lists topics as RUNS — a chapter the book returns to later
        // appears twice — so dedupe by label or the menu shows it twice, both rows
        // filtering to the same thing.
        const seen = new Set();
        const links = [];
        for (const c of rows) {
          // Image-anchored notes (Brahmastra) list chapters as plain strings;
          // the text books list objects. Handle both.
          const label = typeof c === "string" ? c : (c.chapter || c.label || c.topic || c.slug);
          if (!label || seen.has(label)) continue;
          seen.add(label);
          links.push({
            // `param` books are one route filtered by query; the rest are a path.
            href: g.bank.param
              ? `${g.bank.href}?${g.bank.param}=${encodeURIComponent(label)}`
              : `${g.bank.href}/${c.slug}`,
            label,
          });
        }
        // User ke apne topics is bank ke andar (Settings → PYQ Manager) —
        // list mein sabse upar, "📖" ke saath.
        const shelfId = SHELF_BY_NAVKEY[g.key];
        if (shelfId) {
          const mine = getUserTopics(shelfId).map((t) => ({ href: `/pyq/gk/${t.id}`, label: `📖 ${t.name}` }));
          if (mine.length) links.unshift(...mine);
        }
        setBankLinks((prev) => ({ ...prev, [g.key]: links }));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [trail, bankLinks]);
  // Navigating means you are done with the menu — and on a phone it sits over
  // the page you just opened.
  // params bhi: /new-words par word chunne se sirf query badalti hai. Lekin
  // `day` chunna menu ke ANDAR agla level kholna hai (us din ke words) — us
  // par drawer band nahi hota, warna phone par date dabate hi list gayab.
  const paramsSansDay = (() => {
    const p = new URLSearchParams(params);
    p.delete("day");
    return p.toString();
  })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setOpen(false); }, [pathname, paramsSansDay]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Several rows can share a path and differ only by query — the three Current
  // Affairs tabs do — so matching on the path alone lights all of them up at
  // once. A row with a query must match that query as well; a row flagged
  // `isDefault` also matches when the query is absent, because that is the tab
  // its page opens on.
  const isActive = ({ href, isDefault }) => {
    const [p, q] = String(href).split("?");
    if (!(pathname === p || pathname.startsWith(p + "/"))) return false;
    if (!q) return true;
    for (const [k, v] of new URLSearchParams(q)) {
      const cur = params.get(k);
      if (cur === null ? !isDefault : cur !== v) return false;
    }
    return true;
  };
  const current = nodeAt(trail);
  // What this level shows: sub-groups, a bank's fetched chapters, or plain links.
  // A group may have BOTH sub-groups and plain links — Notes has three books to
  // drill into and two ordinary rows — so these concatenate rather than one
  // shadowing the other. `rows.map` already renders each shape.
  const rowsAll = current
    ? current.bank
      ? bankLinks[current.key] || []
      : [...(current.children || []), ...(current.links || [])]
    : NAV_GROUPS;
  const rows = rowsAll;

  // Asli logo (public/logo.png). Pehle yahan ek inline SVG mark tha jo theme ke
  // rang le leta tha; ab site ka apna logo hai.
  const mark = <img className="brand__mark" src="/logo.png" alt="" />;

  return (
    <>
      {/* Sabse upar ki patti — ☰ aur naam, bas. Test ke dauraan ye bhi chhup
          jaati hai (body.exam-on). */}
      <header className="topbar">
        <button
          className="topbar__burger"
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          ☰
        </button>
        <Link href="/" className="topbar__brand">
          {mark}
          <strong>SSC CGL Pre</strong>
        </Link>
      </header>

      {open && <div className="drawer__backdrop" onClick={() => setOpen(false)} />}
    <aside className={`drawer ${open ? "is-open" : ""}`}>
      <div className="drawer__head">
        <Link href="/" className="drawer__brand">
          {mark}
          <span className="brand__text">
            <strong>SSC CGL Pre</strong>
            <span className="drawer__sub">Prep Hub · Prelims</span>
          </span>
        </Link>
        <button className="drawer__x" aria-label="Band karo" onClick={() => setOpen(false)}>✕</button>
      </div>


      <nav className="drawer__nav">
        {onNewWords ? (
          /* ---- /new-words: pehle dates, date ke andar us din ke words ---- */
          nwDay ? (
            <>
              <Link href="/new-words" className="drawer__link">
                <span className="drawer__chev">←</span> Saari dates
              </Link>
              {nwDayWords.map((w, i) => (
                <Link
                  key={w}
                  href={`/new-words?day=${encodeURIComponent(nwDay)}&w=${encodeURIComponent(w)}`}
                  className={`drawer__link ${(params.get("w") || nwDayWords[0]) === w ? "is-active" : ""}`}
                >
                  <span className="drawer__ico">{i + 1}.</span>
                  {w}
                </Link>
              ))}
              {!nwDayWords.length && (
                <span className="drawer__link" style={{ color: "var(--dim)" }}>Is date par kuch nahi</span>
              )}
            </>
          ) : nwGroups.length ? (
            nwGroups.map((g) => (
              <Link
                key={g.key}
                href={`/new-words?day=${encodeURIComponent(g.key)}`}
                className="drawer__link"
              >
                <span className="drawer__ico">📅</span>
                {g.label} ({g.words.length})
              </Link>
            ))
          ) : (
            <span className="drawer__link" style={{ color: "var(--dim)" }}>Abhi koi word nahi</span>
          )
        ) : current ? (
          /* ---- level 2: one group, in place of the list ---- */
          <>
            <button className="drawer__back" onClick={() => setTrail((t) => t.slice(0, -1))}>
              <span className="drawer__chev">←</span>
              <span className="drawer__groupname">{current.name}</span>
            </button>

            {rows.map((l) =>
              l.href ? (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`drawer__link ${isActive(l) ? "is-active" : ""}`}
                >
                  {l.label}
                </Link>
              ) : (
                <button
                  key={l.key}
                  className="drawer__grouphd"
                  onClick={() => setTrail((t) => [...t, l.key])}
                >
                  <span className="drawer__ico">{l.icon}</span>
                  <span className="drawer__groupname">{l.name}</span>
                  <span className="drawer__chev">›</span>
                </button>
              )
            )}
            {current.bank && !bankLinks[current.key] && (
              <span className="drawer__link" style={{ color: "var(--dim)" }}>Loading…</span>
            )}
          </>
        ) : (
          /* ---- level 1: names only ---- */
          <>
            {rows.map((g) => (
              <button key={g.key} className="drawer__grouphd" onClick={() => setTrail([g.key])}>
                <span className="drawer__ico">{g.icon}</span>
                <span className="drawer__groupname">{g.name}</span>
                <span className="drawer__chev">›</span>
              </button>
            ))}

            {NAV_DIRECT.map((d) => (
              <Link
                key={d.href}
                href={d.href}
                className={`drawer__link drawer__link--top ${isActive(d) ? "is-active" : ""}`}
              >
                <span className="drawer__ico">{d.icon}</span>
                {d.label}
              </Link>
            ))}
          </>
        )}
      </nav>
    </aside>
    </>
  );
}
