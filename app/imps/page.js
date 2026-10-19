"use client";

// ⭐ Saare IMP — ek jagah (owner): Fact log, Vocab, Answers, PYQ, PDFs. Tablet par stylus se likhe IMP yahan sirf DEKHNE ko, har device
// par. Har IMP tabhi khulta hai jab screen ke paas aaye (lambi list halki rahe).

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Markdown from "@/components/Markdown";
import ImpView, { ImpNoteBox } from "@/components/ImpView";
import { allImpNotes } from "@/lib/impnotes";
import { localInkCounts, allLocalInkIds, pendingInk, healInk } from "@/lib/ink";
import { inkRecord, inkSetter } from "@/lib/impink";
import { isInkWriter } from "@/lib/inkdevice";
import { getWrongBook, imagesOf } from "@/lib/wrongbook";
import { listPdfs, pdfImpParse } from "@/lib/pdfstore";
import { getFacts } from "@/lib/missionfacts";
import { factSecs } from "@/lib/factslides";

// Card ke neeche subject (owner) — Maths / Reasoning / GS / English.
const SUBJ = { math: "🧮 Maths", maths: "🧮 Maths", reasoning: "🧠 Reasoning", gs: "🌍 GS", english: "📘 English" };
const subjOf = (k) => SUBJ[String(k || "").toLowerCase()] || "";
import { useImageUrls } from "@/lib/wrongimages";
import "../pdfs/pdfs.css";

const TABS = [
  { k: "fact", label: "🧠 Fact log" },
  { k: "vocab", label: "🔤 Vocab" },
  { k: "ans", label: "📖 Answers" },
  { k: "pyq", label: "📚 PYQ" },
  { k: "pdf", label: "📄 PDFs" },
];

// Screen ke paas aaye tabhi andar wala bane.
function Lazy({ children, h = 140 }) {
  const ref = useRef(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || on) return undefined;
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setOn(true); io.disconnect(); } }, { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [on]);
  return <div ref={ref} style={on ? undefined : { minHeight: h }}>{on ? children : null}</div>;
}

// Is pate ka IMP hai? (cloud par uska pata, ya is device par likha hua kaagaz)
//
// `docs` IndexedDB ke asli kaagaz hain. Pehle sirf ink.counts dekhi jati thi —
// wo localStorage mein hai aur bhare hone par uska write chupchaap fail ho
// jata hai, to naya IMP banane ke baad bhi list use dekh nahi paati thi
// (owner: "dono IMP nahi dikh rahe, sirf pehla").
const hasInk = (v) => !!(v && (v.impStrokes > 0 || (v.impUrl && v.impStrokes === undefined)));
const hasNote = (notes, docs, k) => hasInk(notes[k]) || docs.has(`imp:${k}`);

function AnsQ({ r }) {
  const { urls } = useImageUrls(imagesOf(r));
  return (
    <>
      {r.q?.question ? <div className="imps-q"><Markdown>{r.q.question}</Markdown></div> : null}
      {urls.slice(0, 1).map((u) => <img key={u} src={u} alt="" className="imps-img" />)}
    </>
  );
}

function ImpsInner() {
  const sp = useSearchParams();
  // Tab aur chuna hua group page ki apni state mein, URL sirf yaad ke liye —
  // router par bharosa nahi (kuch chaudai par push / replace se URL badla hi nahi).
  const tabOf = (v) => (TABS.some((t) => t.k === v) ? v : "fact");
  const [tab, setTabS] = useState(() => tabOf(sp.get("t")));
  const [sel, setSelS] = useState(() => sp.get("g") || "");
  useEffect(() => { setTabS(tabOf(sp.get("t"))); setSelS(sp.get("g") || ""); }, [sp]);
  const putUrl = (t, g) => {
    try {
      const u = new URL(window.location.href);
      u.searchParams.set("t", t);
      if (g) u.searchParams.set("g", g); else u.searchParams.delete("g");
      u.searchParams.delete("pdf");
      window.history.replaceState(window.history.state, "", u.pathname + u.search);
    } catch { /* ignore */ }
  };
  const setTab = (t) => { setTabS(t); setSelS(""); putUrl(t, ""); };
  const setSel = (g) => { setSelS(g); putUrl(tab, g); try { window.scrollTo(0, 0); } catch { /* ignore */ } };
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const on = () => setTick((x) => x + 1);
    window.addEventListener("cgl:impnotes", on);
    window.addEventListener("cgl:pdfs", on);
    window.addEventListener("cgl:sync-applied", on);
    return () => { window.removeEventListener("cgl:impnotes", on); window.removeEventListener("cgl:pdfs", on); window.removeEventListener("cgl:sync-applied", on); };
  }, []);
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);
  // Is device par pade hue saare ink doc (IndexedDB se) — ginti wali list se
  // nahi, kyunki wo gir sakti hai.
  const [docs, setDocs] = useState(() => new Set());
  useEffect(() => {
    let alive = true;
    const load = async () => {
      const ids = await allLocalInkIds().catch(() => []);
      const counts = Object.keys(localInkCounts()).filter((k) => localInkCounts()[k] > 0);
      if (alive) setDocs(new Set([...ids, ...counts]));
    };
    load();
    window.addEventListener("cgl:impnotes", load);
    window.addEventListener("cgl:sync-applied", load);
    return () => { alive = false; window.removeEventListener("cgl:impnotes", load); window.removeEventListener("cgl:sync-applied", load); };
  }, [tick]);

  const data = useMemo(() => {
    if (!ready) return { fact: [], vocab: [], ans: [], pyq: [], pdf: [] };
    const notes = allImpNotes();
    // Fact log / Vocab: seedhe IMP ke pate se — fact / word ki list se NAHI.
    // Pehle list se banta tha: kisi device par word / fact kam hon (ya id alag)
    // to unka IMP chupchaap gayab — tablet 41, PC 22 (owner).
    // `order` ho to USI kram mein (fact log ka apna kram), warna naya IMP upar.
    const keysOf = (pre, order) => {
      const ks = new Set(Object.keys(notes).filter((k) => k.startsWith(pre) && hasNote(notes, docs, k)));
      for (const id of docs) if (id.startsWith(`imp:${pre}`)) ks.add(id.slice(4));
      const list = [...ks];
      if (order) {
        const at = (k) => (order.has(k) ? order.get(k) : Number.MAX_SAFE_INTEGER);
        return list.sort((a, b) => at(a) - at(b)
          || String(notes[a]?.impAt || "").localeCompare(String(notes[b]?.impAt || "")));
      }
      return list.sort((a, b) => String(notes[b]?.impAt || "9").localeCompare(String(notes[a]?.impAt || "9")));
    };
    // 🧠 Fact log ka IMP usi kram mein jis kram mein fact log khud chalta hai:
    // pehla fact sabse upar, aakhri sabse neeche (owner). Fact log ka kram
    // har device par ek hi hai (lib/missionfacts `at` se sorted), isliye ye
    // list bhi har jagah ek jaisi rehti hai.
    const factOrder = new Map();
    try { factSecs(getFacts()).forEach((s0, i) => factOrder.set(`fact:${s0.key}`, i)); } catch { /* ignore */ }
    const fact = keysOf("fact:", factOrder).map((k) => ({ k }));
    const vocab = keysOf("vocab:").map((k) => ({ k }));
    const ans = getWrongBook().filter((r) => hasInk({ impUrl: r.impUrl, impStrokes: r.impStrokes }) || docs.has(`${r.id}~imp`));
    const pyq = Object.entries(notes)
      .filter(([k, v]) => k.startsWith("pyq:") && hasInk(v))
      .map(([k, v]) => ({ k, ...v }))
      .concat([...docs].filter((id) => id.startsWith("imp:pyq:") && !notes[id.slice(4)]?.impUrl)
        .map((id) => ({ k: id.slice(4), ...(notes[id.slice(4)] || {}) })))
      .sort((a, b) => String(b.impAt || "").localeCompare(String(a.impAt || "")));
    // 📄 PDFs — HAR IMP apni line. Ek page par kai IMP ho sakte hain
    // (pdfimp:<id>:<page> aur uske baad #2, #3…), isliye yahan page ginne ke
    // bajay seedha IMP ki keys dekhte hain — paanch banaye to paanch dikhte
    // hain (owner).
    const pdfName = {};
    for (const r of listPdfs()) pdfName[r.id] = r.name;
    const pdfKeys = new Set(Object.keys(notes).filter((k) => k.startsWith("pdfimp:") && hasNote(notes, docs, k)));
    for (const idk of docs) if (idk.startsWith("imp:pdfimp:")) pdfKeys.add(idk.slice(4));
    const pdf = [...pdfKeys]
      .map((k) => ({ k, ...(pdfImpParse(k) || {}) }))
      .filter((x) => x.id)
      .map((x) => ({ ...x, name: pdfName[x.id] || "PDF" }))
      .sort((a, b) => (a.name || "").localeCompare(b.name || "") || a.p - b.p || a.n - b.n);
    return { fact, vocab, ans, pyq, pdf };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, tick, docs]);

  const list = data[tab] || [];
  // 📤 Tablet par: kitne IMP / writing abhi sirf yahin hain (cloud par nahi
  // pahunche) — aur turant bhejne ka button, galti ho to uska sandesh.
  const [writer, setWriter] = useState(false);
  const [pend, setPend] = useState(0);
  const [sendMsg, setSendMsg] = useState("");
  const [sending, setSending] = useState(false);
  useEffect(() => {
    const w = isInkWriter();
    setWriter(w);
    if (w) pendingInk(inkRecord).then((xs) => setPend(xs.length)).catch(() => {});
  }, [tick]);
  const sendNow = async () => {
    setSending(true); setSendMsg("⬆️ bhej raha…");
    const r = await healInk(inkRecord, inkSetter).catch((e) => ({ sent: 0, failed: 1, err: e.message }));
    const left = (await pendingInk(inkRecord).catch(() => [])).length;
    setPend(left);
    setSendMsg(r.failed ? `⚠️ ${r.sent} gaye, ${r.failed} nahi gaye — ${r.err}` : `✅ ${r.sent} cloud par gaye${left ? ` · ${left} baaki` : ""} — ab sync hone par PC par dikhenge`);
    setSending(false);
    try { window.dispatchEvent(new CustomEvent("cgl:sync-kick")); } catch { /* SSR */ }
  };
  // Answers / PYQ: pehle subject, PDFs: pehle PDF ka naam (owner) — dabao to
  // sirf uske IMP.
  const groupOf = (x) => (tab === "pdf" ? x.id : tab === "ans" ? (x.subject || "other") : (x.meta?.sub || "other"));
  const groups = useMemo(() => {
    if (!["ans", "pyq", "pdf"].includes(tab)) return [];
    const m = new Map();
    for (const x of list) {
      const g = groupOf(x);
      if (!m.has(g)) m.set(g, { g, label: tab === "pdf" ? `📄 ${x.name}` : subjOf(g) || "📝 Other", n: 0 });
      m.get(g).n++;
    }
    return [...m.values()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, tab]);
  const grouped = ["ans", "pyq", "pdf"].includes(tab);
  const shown = grouped ? (sel ? list.filter((x) => groupOf(x) === sel) : []) : list;
  return (
    <section className="section pdfs">
      <header className="pdfs-head">
        <div>
          <h1>⭐ Saare IMP</h1>
          <p className="hint">Tablet par stylus se likhe IMP — yahan sab ek jagah.</p>
        </div>
        <div className="pdfs-acts"><Link href="/pdfs" className="btn btn--ghost btn--sm">📄 Meri PDFs</Link></div>
      </header>
      {writer && (pend > 0 || sendMsg) ? (
        <div className="imps-pend">
          {pend > 0 ? <span>📤 <b>{pend}</b> IMP / writing abhi sirf is tablet par hain — cloud par nahi gaye, isliye PC par nahi dikhte.</span> : null}
          {pend > 0 ? <button type="button" className="btn btn--primary btn--sm" onClick={sendNow} disabled={sending}>⬆️ Abhi bhejo</button> : null}
          {sendMsg ? <small>{sendMsg}</small> : null}
        </div>
      ) : null}
      <div className="imps-tabs">
        {TABS.map((t) => (
          <button key={t.k} type="button" className={`imps-tab${t.k === tab ? " is-on" : ""}`} onClick={() => setTab(t.k)}>
            {t.label} <small>{(data[t.k] || []).length}</small>
          </button>
        ))}
      </div>
      {ready && !list.length ? <p className="hint">Abhi yahan koi IMP nahi — tablet par ⭐ IMP likho.</p> : null}
      <div className="pdfs-impgrid">
        {grouped && !sel && groups.map((x) => (
          <button key={x.g} type="button" className="imps-card imps-pdfname" onClick={() => setSel(x.g)}>
            <b>{x.label}</b>
            <small>⭐ {x.n} IMP ›</small>
          </button>
        ))}
        {grouped && sel ? (
          <div className="imps-pdfhead">
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setSel("")}>← {tab === "pdf" ? "Saari PDFs" : "Saare subject"}</button>
            <b>{(groups.find((x) => x.g === sel) || {}).label || ""}</b>
          </div>
        ) : null}
        {(tab === "fact" || tab === "vocab") && list.map((x) => (
          // Fact log / Vocab: sirf IMP (owner) — fact / word ka text nahi.
          <article key={x.k} data-k={x.k} className="imps-card imps-card--only">
            <Lazy><ImpNoteBox k={x.k} /></Lazy>
          </article>
        ))}
        {tab === "ans" && shown.map((r) => (
          <article key={r.id} className="imps-card">
            <Lazy h={200}><AnsQ r={r} /><ImpView rec={r} /></Lazy>
            {subjOf(r.subject) ? <span className="imps-subj">{subjOf(r.subject)}</span> : null}
          </article>
        ))}
        {tab === "pyq" && shown.map((x) => (
          <article key={x.k} className="imps-card">
            {x.meta?.src ? <span className="imps-sub">{x.meta.src}</span> : null}
            {x.meta?.img ? <img src={x.meta.img} alt="" className="imps-img" /> : x.meta?.title ? <div className="imps-q"><Markdown>{x.meta.title}</Markdown></div> : null}
            <Lazy><ImpNoteBox k={x.k} /></Lazy>
            {subjOf(x.meta?.sub) ? <span className="imps-subj">{subjOf(x.meta.sub)}</span> : null}
            {x.meta?.href ? <Link href={x.meta.href} className="pdfs-imp__p">PYQ kholo ›</Link> : null}
          </article>
        ))}
        {tab === "pdf" && shown.map((x) => (
          <article key={x.k} className="imps-card">
            <Link
              href={`/pdfs/view?id=${encodeURIComponent(x.id)}&p=${x.p}${x.n > 1 ? `&n=${x.n}` : ""}`}
              className="imps-pdf"
            >Page {x.p}{x.n > 1 ? ` · IMP ${x.n}` : ""} ›</Link>
            <Lazy><ImpNoteBox k={x.k} /></Lazy>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function ImpsPage() {
  return <Suspense fallback={<div className="placeholder">Loading…</div>}><ImpsInner /></Suspense>;
}
