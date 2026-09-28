"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NAV_GROUPS, NAV_DIRECT, trailForPath, nodeAt } from "@/lib/nav";
import { getNewWordEntries, newWordDayKey, newWordDayLabel } from "@/lib/vocab";
import { getUserTopics } from "@/lib/userpyq";
import { notesByBook, bookIcon, bookLabel } from "@/lib/pastednotes";
import ThemeToggle from "./ThemeToggle";
import FocusLock from "./FocusLock";
import TopbarInfo from "./TopbarInfo";
import MenuRail from "./MenuRail";

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

// 📝 "Notesliner" ka khaana (NAV_DIRECT mein `oneliner: true` wali line).
// Iske andar ki list likhi hui nahi hai — jis book se notes paste hue hain
// wahi naam aate hain (Parmar Polity se banaye to "Polity"), aur us naam ke
// andar us book ke page. Isliye ye NAV_GROUPS ka hissa nahi ban sakta; yahan
// har baar lib/pastednotes se bana liya jata hai.
const OL_KEY = "oneliner";
// /notes/paste par menu khulte hi seedha isi khaane ke andar — wahan pahunche
// ho to agla kaam doosri book ya doosra page chunna hi hota hai.
// (Query badalne par ye nahi chalta, sirf path badalne par — isliye book ke
// andar ka level khula rehta hai.)
const seedTrail = (p) => (p && p.startsWith("/notes/paste") ? [OL_KEY] : trailForPath(p));

// The menu, and only the menu.
//
// Roop: ICON RAIL (components/MenuRail) — baayen patli patti mein har khaane
// ka icon + chhota naam; group dabane par bagal mein flyout khulta hai jisme
// andar ke level (bank ke chapter tak) drill-down se. Owner ne 15 roop mein
// se yahi chuna — pehle ka 2-column tile sidebar aur roop wala dropdown hata
// diye. Phone par rail ☰ se khulti hai.
//
// Ye file menu ka DATA banati hai (groups, bank ke chapter, Notesliner ki
// books, /new-words ki dates) aur use ek model (`menu`) mein deti hai.
export default function Navbar() {
  const pathname = usePathname();
  const params = useSearchParams();
  // A group can name a BANK instead of listing links — its rows are that bank's
  // chapters, fetched the first time the group is opened and then memoised by
  // the loader itself.
  const [bankLinks, setBankLinks] = useState({});
  // Phones only: the rail is off-canvas until the hamburger asks for it.
  const [open, setOpen] = useState(false);

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

  // 📝 Notesliner — paste kiye hue notes, book ke hisaab se. Ye store
  // (IndexedDB) se aata hai, isliye render ke waqt nahi, effect mein padha
  // jata hai — aur naya note paste hote hi menu apne aap badal jaye.
  const [olBooks, setOlBooks] = useState([]);
  useEffect(() => {
    const load = () => setOlBooks(notesByBook());
    load();
    window.addEventListener("cgl:pastednotes", load);
    // Bada store (IndexedDB) thodi der mein khulta hai — pehli baar khali
    // mil sakta hai, isliye ek baar baad mein phir dekh lete hain.
    const t = setTimeout(load, 1200);
    return () => { window.removeEventListener("cgl:pastednotes", load); clearTimeout(t); };
  }, []);
  // Khaana: pehla level book ke naam, uske andar us book ke page.
  const olNode = useMemo(() => {
    if (!olBooks.length) return null;
    return {
      key: OL_KEY,
      name: "📝 Notesliner",
      // Andar jaate hi "wapas" wali line par bhi "Notesliner" hi likha aata
      // tha — wahi naam jo abhi dabaya tha, to lagta tha ek hi cheez do baar
      // hai. Isliye wahan ka naam alag.
      backLabel: "Saara menu",
      icon: "📝",
      children: olBooks.map((g) => {
        const label = bookLabel(g);
        const q = `book=${encodeURIComponent(g.book)}`;
        return {
          key: `ol:${g.book}`,
          name: `${label} (${g.items.length})`,
          icon: bookIcon(g),
          links: [
            { href: `/notes/paste?${q}`, label: `📚 Poora ${label}`, off: ["n"] },
            ...g.items.map((n) => ({
              href: `/notes/paste?${q}&n=${encodeURIComponent(n.k)}`,
              label: `p.${n.page} · ${n.topic || "—"}`,
            })),
          ],
        };
      }),
    };
  }, [olBooks]);
  // Trail ko is khaane ke andar khud hal karte hain — nodeAt sirf NAV_GROUPS
  // dekhta hai, aur ye khaana wahan likha hua nahi hai.
  const olAt = (t) => {
    let node = olNode;
    for (const k of t.slice(1)) {
      node = ((node && node.children) || []).find((n) => n.key === k) || null;
      if (!node) return null;
    }
    return node;
  };

  // A group can describe a BANK instead of listing links: which index to read,
  // which array in it holds the chapters, and what those rows link to. Fetched
  // the first time the group is opened, then kept.
  // Ek bank ka chapter-list laao (pehli baar), phir yaad. Naye roop kai
  // khaane ek saath dikhate hain (mega menu, columns), isliye ye sirf chalu
  // trail tak simit nahi — `need(trail)` se koi bhi khaana maang sakta hai.
  const loading = useRef(new Set());
  const loadBank = useCallback((g) => {
    if (!g?.bank || bankLinks[g.key] || loading.current.has(g.key)) return;
    loading.current.add(g.key);
    fetch(g.bank.url)
      .then((r) => (r.ok ? r.json() : null))
      .then((idx) => {
        loading.current.delete(g.key);
        if (!idx) return;
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
      .catch(() => { loading.current.delete(g.key); });
  }, [bankLinks]);
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
  // `exact` rows (like /mission, whose sub-pages are their own rows) light up
  // only on their own path, not on every page beneath it.
  // `off` un query-naamon ki list hai jo MAUJOOD nahi hone chahiye: "📚 Poora
  // Polity" tabhi jagta hai jab koi ek page (?n=) chuna hua na ho, warna wo
  // aur us page ki line, dono ek saath jagti thi.
  const isActive = ({ href, isDefault, exact, off }) => {
    const [p, q] = String(href).split("?");
    if (exact ? pathname !== p : !(pathname === p || pathname.startsWith(p + "/"))) return false;
    for (const k of off || []) if (params.get(k)) return false;
    if (!q) return true;
    for (const [k, v] of new URLSearchParams(q)) {
      const cur = params.get(k);
      if (cur === null ? !isDefault : cur !== v) return false;
    }
    return true;
  };

  // ── Naye roop ke liye saajha model ──
  // Har khaana ek hi shakl mein: { id, icon, label, href } (seedha link) ya
  // { id, icon, label, trail } (andar ek aur level). `level(trail)` kisi bhi
  // khaane ke andar ki list deta hai; `need(trail)` bank ho to use mangwa
  // leta hai. /new-words par upar ka level us page ki dates/words hain.
  const nodeFor = (t) => (t[0] === OL_KEY ? olAt(t) : nodeAt(t));
  // "⚡ Shuru karo" jaisi line ka emoji naam se alag, icon ki jagah.
  const splitIcon = (label) => {
    const m = /^([^\p{L}\p{N}\s]+)\s+(.+)$/u.exec(String(label));
    return m ? [m[1], m[2]] : ["", label];
  };
  const toItem = (l, t) => (l.href
    ? (() => { const [ic, lb] = l.icon ? [l.icon, l.label] : splitIcon(l.label); return { id: l.href, icon: ic, label: lb, href: l.href, active: isActive(l) }; })()
    : { id: l.key, icon: l.icon || "", label: l.name, trail: [...t, l.key] });
  const pathTrail = seedTrail(pathname);
  const direct = (d) => (d.oneliner && olNode
    ? { id: d.href, icon: d.icon, label: d.label, trail: [OL_KEY], active: pathTrail[0] === OL_KEY }
    : { id: d.href, icon: d.icon, label: d.label, href: d.href, active: isActive(d) });
  const topItems = onNewWords
    ? (nwDay
      ? [{ id: "nw-back", icon: "←", label: "Saari dates", href: "/new-words" },
        ...nwDayWords.map((w, i) => ({ id: w, icon: `${i + 1}.`, label: w, href: `/new-words?day=${encodeURIComponent(nwDay)}&w=${encodeURIComponent(w)}`, active: (params.get("w") || nwDayWords[0]) === w }))]
      : nwGroups.map((g) => ({ id: g.key, icon: "📅", label: `${g.label} (${g.words.length})`, href: `/new-words?day=${encodeURIComponent(g.key)}` })))
    : [
      ...NAV_DIRECT.filter((d) => d.pin).map(direct),
      ...NAV_GROUPS.map((g) => ({ id: g.key, icon: g.icon, label: g.name, trail: [g.key], active: pathTrail[0] === g.key })),
      ...NAV_DIRECT.filter((d) => !d.pin).map(direct),
    ];
  const menu = {
    top: topItems,
    pathTrail,
    level: (t) => {
      if (!t || !t.length) return { title: "Menu", icon: "☰", items: topItems };
      const node = nodeFor(t);
      if (!node) return null;
      const raw = node.bank ? bankLinks[node.key] || [] : [...(node.children || []), ...(node.links || [])];
      return { title: node.backLabel || node.name, icon: node.icon, items: raw.map((l) => toItem(l, t)), loading: !!node.bank && !bankLinks[node.key] };
    },
    need: (t) => { if (t && t.length && t[0] !== OL_KEY) loadBank(nodeAt(t)); },
  };

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
        {/* ⏳ Aaj ki tareekh + exam countdown — patti ab khaali nahi. */}
        <TopbarInfo />
        {/* Din/raat — patti ke dayein sire par, hamesha ek tap ki doori par.
            Menu ke ANDAR rakhne se raat mein site kholte hi pehle menu kholna
            padta, aur wahi ek pal sabse chubhta hai. */}
        {/* 🔒 PC lock — patti ke dayein, din/raat ke bagal. Yahi ek jagah
            hai jo har page par rehti hai. */}
        <FocusLock />
        <ThemeToggle />
      </header>

      <MenuRail menu={menu} open={open} setOpen={setOpen} mark={mark} />
    </>
  );
}
