"use client";

// 🏰 GKTricks Medieval — FACTS ke saath padhne ke 20 tareeke (21–40).
// 1–20 (components/MedLayouts) bina facts ke hain; ye unse alag hain.
//
// Fact = DeepSeek chat wale jawab ki sirf ⚡ line (poora jawab nahi). Wo
// jawab pehle jaisa apne aap banta hai: saamne wala sawaal + agle 5
// (components/SelectAsk, `cgl:sprint-q`). List wale roop mein jo sawaal
// screen par dikhe wahi (+ agle 5). Fact log mein bhejna khud — ＋ button.

import { useEffect, useMemo, useRef, useState } from "react";
import Markdown from "./Markdown";
import MnemonicScroll from "./MnemonicScroll";
import AnsView from "./AnsFormats";
import { addClustersToFacts } from "./ClusterButton";
import { getAns, ansLookup } from "@/lib/sprint";
import { clustersOf } from "@/lib/clusterparse";
import { plain, shuffle, norm, Q, Empty, Rate, mark, wrongsOf, GROUPS, readJ, writeJ, toMs } from "./MedLayouts";
import "./medlayouts.css";
import "./medfacts.css";

export const MED_FACT_LAYOUTS = [
  { id: "21", name: "Kitaab — do panne" },
  { id: "22", name: "Sticky notes ki deewar" },
  { id: "23", name: "Clue game — facts se jawab pehchano" },
  { id: "24", name: "Fact mein khaali jagah" },
  { id: "25", name: "Akhbaar" },
  { id: "26", name: "Chat — ek-ek bubble" },
  { id: "27", name: "Mind map" },
  { id: "28", name: "A–Z Kosh" },
  { id: "29", name: "Fact kiska hai?" },
  { id: "30", name: "Likho phir milao" },
  { id: "31", name: "Aaj ke 10" },
  { id: "32", name: "🔍 Khoj" },
  { id: "33", name: "Do pane — list + poora" },
  { id: "34", name: "Highlighter padhai" },
  { id: "35", name: "Pehla akshar reel (facts)" },
  { id: "36", name: "Aaj / kal padha" },
  { id: "37", name: "Ek jawab → saare sawaal" },
  { id: "38", name: "Notes roop" },
  { id: "39", name: "Swipe stack" },
  { id: "40", name: "Apna trick likho" },
];

// ── fact (⚡ line) ────────────────────────────────────────────────────────
const zapCache = new Map();
function zapsOf(md) {
  if (zapCache.has(md)) return zapCache.get(md);
  const out = [];
  for (const c of clustersOf(md, { prose: false })) if (c.zap) out.push(c.zap.replace(/\*\*/g, "").trim());
  if (!out.length) {
    for (const l of String(md || "").split("\n")) {
      const m = /^\s*(?:[-*]\s*)?(?:\*\*)?⚡(?:\*\*)?\s*(.+)$/.exec(l);
      if (m) out.push(m[1].replace(/\*\*/g, "").trim());
    }
  }
  const r = [...new Set(out)];
  zapCache.set(md, r);
  return r;
}
// null = abhi bana nahi · [] = jawab hai par ⚡ nahi · [..] = facts
// Store ek baar padh kar rakho; naya jawab aate hi (cgl:sprint-ans / ds-saved) phir se.
let LOOK = null;
const lookup = () => LOOK || (LOOK = ansLookup());
const factsOf = (m) => { const md = lookup()(m.raw); return md ? zapsOf(md) : null; };

// ── DeepSeek: saamne wala + agle 5 ────────────────────────────────────────
let ALL = [];
const SEEN = "cgl.medseen";
function focus(m, next, seen = true) {
  if (!m || typeof window === "undefined") return;
  const nx = next || (() => { const i = ALL.findIndex((x) => x.id === m.id); return ALL.slice(i + 1, i + 6); })();
  if (seen) { const s = readJ(SEEN, {}); s[m.id] = Date.now(); writeJ(SEEN, s); }
  try { window.dispatchEvent(new CustomEvent("cgl:sprint-q", { detail: { q: m.raw, next: nx.map((x) => x.raw) } })); } catch { /* ignore */ }
}
function useFocus(m, next) {
  useEffect(() => { if (m) focus(m, next); }, [m && m.id]); // eslint-disable-line react-hooks/exhaustive-deps
}

const YR = /\b(?:5\d\d|6\d\d|7\d\d|8\d\d|9\d\d|1[0-8]\d\d)\b/g;
// Highlighter: saal / sankhya aur bade akshar wale naam.
function hl(text, q) {
  const s = String(text);
  const re = q ? new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig") : /(\b\d[\d,.]*\b|\b[A-Z][a-zA-Z'-]{2,}(?:\s+[A-Z][a-zA-Z'-]+)*)/g;
  const out = [];
  let last = 0, m, k = 0;
  re.lastIndex = 0;
  while ((m = re.exec(s)) !== null) {
    if (!m[0]) { re.lastIndex++; continue; }
    if (m.index > last) out.push(s.slice(last, m.index));
    out.push(<mark key={k++} className={q ? "" : /^\d/.test(m[0]) ? "is-n" : "is-w"}>{m[0]}</mark>);
    last = m.index + m[0].length;
  }
  out.push(s.slice(last));
  return out;
}

// Ek sawaal ke facts. auto = screen par dikhte hi DeepSeek ko bolo (list wale roop).
function Facts({ m, auto = false, mode = "", q = "" }) {
  const ref = useRef(null);
  const fs = factsOf(m);
  useEffect(() => {
    if (fs || !auto || typeof IntersectionObserver === "undefined") return undefined;
    const el = ref.current;
    if (!el) return undefined;
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) focus(m, null, false); });
    io.observe(el);
    return () => io.disconnect();
  }, [m.id, !!fs, auto]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!fs) return <div ref={ref} className="mf-wait">⏳ DeepSeek fact bana raha hai…</div>;
  if (!fs.length) return <div className="mf-wait">— is jawab mein ⚡ fact nahi mila</div>;
  const send = (e) => {
    e.stopPropagation();
    const n = addClustersToFacts(getAns(m.raw), "gs", m.raw);
    e.currentTarget.textContent = n ? "✓ Fact log" : "✓ pehle se";
    e.currentTarget.disabled = true;
  };
  return (
    <div className="mf-facts">
      {fs.map((z, i) => <p key={i}>⚡ {mode === "hl" || q ? hl(z, q) : <Markdown inline>{z}</Markdown>}</p>)}
      <button type="button" className="mf-send" onClick={send} title="Ye fact, fact log mein bhejo">＋ Fact log</button>
    </div>
  );
}

// 33 · Do pane: poora cluster — 🧩 naam + poora paragraph + ⚡ fact.
// Roop: 19 · Mind map FINAL (owner) — dropdown hataya. Baaki 19 roop
// components/AnsFormats mein (backup/README.md); FMT badlo to wo chalega.
const FMT = "19";
function Clusters({ m }) {
  const fmt = FMT;
  const md = lookup()(m.raw);
  if (!md) return <Wait />;
  const cs = clustersOf(md, { prose: true });
  const send = (e) => {
    const n = addClustersToFacts(md, "gs", m.raw);
    e.currentTarget.textContent = n ? "✓ Fact log" : "✓ pehle se";
    e.currentTarget.disabled = true;
  };
  return (
    <div className={`mf-cl af af--${fmt}`}>
      {cs.length ? <AnsView cs={cs} fmt={fmt} /> : <div className="mf-cl-p"><Markdown>{md}</Markdown></div>}
      <button type="button" className="mf-send" onClick={send} title="Ye cluster, fact log mein bhejo">＋ Fact log</button>
    </div>
  );
}

// Page ki pehchaan (PyqLooks ka `ns`) — Medieval par khaali, baaki PYQ par
// apni, taaki ek page ka "kahan tak padha" doosre par na chale.
let NS = "";
function useResume(key0, n) {
  const key = NS ? `${key0}.${NS}` : key0;
  const [i, setI] = useState(() => { const v = Number(readJ(key, 0)); return Number.isFinite(v) && v >= 0 && v < n ? v : 0; });
  const set = (v) => { const k = ((v % n) + n) % n; setI(k); writeJ(key, k); };
  return [Math.min(i, n - 1), set];
}
function useArrows(go) {
  const r = useRef(go); r.current = go;
  useEffect(() => {
    const k = (e) => {
      if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
      if (e.key === "ArrowRight") r.current(1);
      else if (e.key === "ArrowLeft") r.current(-1);
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);
}
function Nav({ i, n, go }) {
  return (
    <div className="mf-nav">
      <button type="button" onClick={() => go(-1)}>←</button>
      <span>{i + 1} / {n}</span>
      <button type="button" onClick={() => go(1)}>→</button>
    </div>
  );
}
// Jawab ke shabd fact mein se chhupao (clue / fact kiska).
function hideAns(text, a) {
  let s = String(text);
  for (const w of plain(a).split(/[\s,/-]+/).filter((x) => x.length > 2)) {
    s = s.replace(new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig"), "_____");
  }
  return s;
}
const Wait = ({ children }) => <div className="mf-wait mf-wait--big">{children || "⏳ DeepSeek fact bana raha hai…"}</div>;

// ─── 21 · Kitaab ───
function Book({ ms }) {
  const [i, setI] = useResume("cgl.medf.book", ms.length);
  const [open, setOpen] = useState(false);
  const m = ms[i];
  useFocus(m, ms.slice(i + 1, i + 6));
  const go = (d) => { setI(i + d); setOpen(false); };
  useArrows(go);
  return (
    <div className="mf21">
      <div className="mf21-book" key={i}>
        <div className="mf21-page">
          <small>Panna {i + 1}</small>
          <div className="mf21-q"><Q m={m} /></div>
        </div>
        <div className={`mf21-page is-r${open ? "" : " is-shut"}`} onClick={() => setOpen(true)}>
          {open ? <><h2>{m.a}</h2><Facts m={m} /></> : <span>dabao → jawab + facts</span>}
        </div>
      </div>
      <Nav i={i} n={ms.length} go={go} />
    </div>
  );
}

// ─── 22 · Sticky notes ───
function Sticky({ ms }) {
  const [n, setN] = useState(24);
  return (
    <div className="mf22">
      <div className="mf22-wall">
        {ms.slice(0, n).map((m, k) => (
          <div key={m.id} className={`mf22-note c${k % 5}`} style={{ "--r": `${((k * 37) % 7) - 3}deg` }}>
            <small><Q m={m} /></small>
            <b>{m.a}</b>
            <Facts m={m} auto />
          </div>
        ))}
      </div>
      {n < ms.length && <button type="button" className="ml-big" onClick={() => setN(n + 24)}>Aur 24 ({ms.length - n} bache)</button>}
    </div>
  );
}

// ─── 23 · Clue game ───
function Clue({ ms }) {
  const [order] = useState(() => shuffle(ms));
  const [i, setI] = useState(0);
  const [k, setK] = useState(1);
  const [show, setShow] = useState(false);
  const [pts, setPts] = useState(0);
  const m = order[i % order.length];
  useFocus(m, order.slice(i + 1, i + 6));
  const fs = factsOf(m);
  const clues = [...(fs || []).map((z) => hideAns(z, m.a)), `Sawaal: ${plain(m.q)}`];
  const rate = (ok) => { mark(m.id, ok); if (ok) setPts((p) => p + Math.max(1, clues.length - k + 1)); setI(i + 1); setK(1); setShow(false); };
  return (
    <div className="mf23">
      <div className="ml-score">⭐ {pts} ank · kam clue mein pehchano = zyada ank</div>
      {!fs ? <Wait>⏳ Clue ban rahe hai… tab tak sawaal wala clue chalega</Wait> : null}
      <ol className="mf23-clues">
        {clues.slice(0, k).map((c, j) => <li key={j} className={j === clues.length - 1 ? "is-q" : ""}>{c}</li>)}
      </ol>
      {show ? (
        <><h2 className="mf-center">{m.a}</h2><Rate onRate={rate} labels={["✗ Nahi pehchana", "✓ Pehchan liya"]} /></>
      ) : (
        <div className="ml-row">
          {k < clues.length ? <button type="button" onClick={() => setK(k + 1)}>🔎 Agla clue ({clues.length - k} bache)</button> : null}
          <button type="button" className="ml-big" onClick={() => setShow(true)}>Jawab dikhao</button>
        </div>
      )}
    </div>
  );
}

// ─── 24 · Khaali jagah ───
function blankOf(z) {
  const tries = [/\b(?:5\d\d|6\d\d|7\d\d|8\d\d|9\d\d|1[0-8]\d\d)\b/, /\b\d[\d,.]*\b/, /(?<=\s)[A-Z][a-zA-Z'-]{2,}/];
  for (const re of tries) { const r = re.exec(z); if (r) return { b: z.slice(0, r.index), w: r[0], a: z.slice(r.index + r[0].length) }; }
  const words = z.split(/\s+/);
  const w = words.reduce((x, y) => (y.length > x.length ? y : x), "");
  const at = z.indexOf(w);
  return { b: z.slice(0, at), w, a: z.slice(at + w.length) };
}
function Cloze({ ms }) {
  const [order] = useState(() => shuffle(ms));
  const [i, setI] = useState(0);
  const [open, setOpen] = useState({});
  const m = order[i % order.length];
  useFocus(m, order.slice(i + 1, i + 6));
  const fs = factsOf(m);
  const next = (ok) => { if (ok !== undefined) mark(m.id, ok); setI(i + 1); setOpen({}); };
  return (
    <div className="mf24">
      <div className="ml-q"><Q m={m} /> <b className="mf-ans">→ {m.a}</b></div>
      {!fs ? <><Wait /><button type="button" className="ml-big" onClick={() => next()}>Abhi chhodo →</button></>
        : !fs.length ? <><Wait>Is jawab mein ⚡ fact nahi</Wait><button type="button" className="ml-big" onClick={() => next()}>Agla →</button></>
          : (
            <>
              {fs.map((z, j) => {
                const p = blankOf(z);
                return <p key={j} className="mf24-line">⚡ {p.b}<button type="button" className={open[j] ? "is-open" : ""} onClick={() => setOpen((o) => ({ ...o, [j]: true }))}>{open[j] ? p.w : "?".repeat(Math.min(8, Math.max(3, p.w.length)))}</button>{p.a}</p>;
              })}
              <Rate onRate={next} />
            </>
          )}
    </div>
  );
}

// ─── 25 · Akhbaar ───
function Paper({ ms }) {
  const per = 6;
  const pages = Math.ceil(ms.length / per);
  const [p, setP] = useResume("cgl.medf.paper", pages);
  const list = ms.slice(p * per, p * per + per);
  const go = (d) => { setP(p + d); window.scrollTo({ top: 0, behavior: "smooth" }); };
  return (
    <div className="mf25">
      <header className="mf25-mast">
        <small>Ank {p + 1} / {pages}</small>
        <h1>Madhyakaal Samachar</h1>
        <small>Medieval History · GKTricks</small>
      </header>
      <div className="mf25-grid">
        {list.map((m, k) => (
          <article key={m.id} className={k === 0 ? "is-lead" : ""}>
            <h3>{m.a}</h3>
            <p className="mf25-deck"><Q m={m} /></p>
            <Facts m={m} auto />
          </article>
        ))}
      </div>
      <Nav i={p} n={pages} go={go} />
    </div>
  );
}

// ─── 26 · Chat ───
function Chat({ ms }) {
  const [order] = useState(() => shuffle(ms));
  const [i, setI] = useState(0);
  const [s, setS] = useState(0);
  const end = useRef(null);
  const m = order[i % order.length];
  useFocus(m, order.slice(i + 1, i + 6));
  const fs = factsOf(m) || [];
  const bubbles = [{ me: false, t: plain(m.q) }];
  if (s >= 1) bubbles.push({ me: true, t: m.a, big: true });
  fs.slice(0, Math.max(0, s - 1)).forEach((z) => bubbles.push({ me: false, t: `⚡ ${z}` }));
  const done = s >= 1 + fs.length;
  useEffect(() => { if (end.current) end.current.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [s, i]);
  return (
    <div className="mf26">
      <div className="mf26-log">
        {bubbles.map((b, k) => <div key={k} className={`mf26-b${b.me ? " is-me" : ""}${b.big ? " is-big" : ""}`}>{b.t}</div>)}
        {s >= 1 && !factsOf(m) ? <div className="mf26-b is-typing">⏳ fact likh raha hai…</div> : null}
        <div ref={end} />
      </div>
      <div className="ml-row">
        {!done ? <button type="button" className="ml-big" onClick={() => setS(s + 1)}>{s === 0 ? "Jawab batao" : "Aur batao ⚡"}</button>
          : <button type="button" className="ml-big" onClick={() => { setI(i + 1); setS(0); }}>Agla sawaal →</button>}
      </div>
    </div>
  );
}

// ─── 27 · Mind map ───
function MindMap({ ms }) {
  const [i, setI] = useResume("cgl.medf.map", ms.length);
  const m = ms[i];
  useFocus(m, ms.slice(i + 1, i + 6));
  useArrows((d) => setI(i + d));
  const fs = factsOf(m);
  return (
    <div className="mf27">
      <div className="ml-q"><Q m={m} /></div>
      <div className="mf27-grid">
        <div className="mf27-c">{m.a}</div>
        {(fs || []).slice(0, 8).map((z, k) => <div key={k} className={`mf27-n p${k}`}>{z}</div>)}
      </div>
      {!fs ? <Wait /> : !fs.length ? <Wait>Is jawab mein ⚡ fact nahi</Wait> : null}
      <Nav i={i} n={ms.length} go={(d) => setI(i + d)} />
    </div>
  );
}

// ─── 28 · A–Z Kosh ───
function Kosh({ ms }) {
  const list = useMemo(() => [...ms].sort((x, y) => x.a.localeCompare(y.a)), [ms]);
  const letters = [...new Set(list.map((m) => (m.a[0] || "#").toUpperCase()))];
  const [open, setOpen] = useState({});
  return (
    <div className="mf28">
      <div className="mf28-az">{letters.map((L) => <a key={L} href={`#mfk-${L}`}>{L}</a>)}</div>
      {list.map((m, k) => {
        const L = (m.a[0] || "#").toUpperCase();
        const first = k === 0 || (list[k - 1].a[0] || "#").toUpperCase() !== L;
        return (
          <div key={m.id}>
            {first ? <h3 id={`mfk-${L}`} className="mf28-L">{L}</h3> : null}
            <div className="mf28-it" onClick={() => { setOpen((o) => ({ ...o, [m.id]: !o[m.id] })); if (!open[m.id]) focus(m); }}>
              <b>{m.a}</b>
              <span><Q m={m} /></span>
              {open[m.id] ? <Facts m={m} /> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── 29 · Fact kiska hai? ───
function WhoseFact({ ms, tick }) {
  const pool = useMemo(() => ms.flatMap((m) => (factsOf(m) || []).map((z) => ({ m, z }))), [ms, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const [seed, setSeed] = useState(() => Math.random());
  const [pick, setPick] = useState(null);
  const [s, setS] = useState({ y: 0, n: 0 });
  const it = pool.length ? pool[Math.floor(seed * pool.length)] : null;
  const opts = useMemo(() => (it ? shuffle([it.m.a, ...wrongsOf(it.m, ms)]) : []), [it && it.z, ms]); // eslint-disable-line react-hooks/exhaustive-deps
  // Facts kam hon to agle sawaalon ke banwao (pehla bina fact wala + agle 5).
  useEffect(() => {
    if (pool.length >= 12) return;
    const m = ms.find((x) => !factsOf(x));
    if (m) focus(m, null, false);
  }, [pool.length]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!it) return <Wait>⏳ Facts ban rahe hai — thodi der mein yahan khel shuru hoga.</Wait>;
  const choose = (o) => { if (pick) return; setPick(o); const ok = norm(o) === norm(it.m.a); mark(it.m.id, ok); setS((x) => ({ y: x.y + (ok ? 1 : 0), n: x.n + (ok ? 0 : 1) })); };
  return (
    <div className="mf29">
      <div className="ml-score">✓ {s.y} · ✗ {s.n} · {pool.length} facts bane</div>
      <div className="mf29-fact">⚡ {hideAns(it.z, it.m.a)}</div>
      <p className="ml-dim">Ye fact kis jawab ka hai?</p>
      <div className="ml3-opts">
        {opts.map((o, k) => {
          const st = pick ? (norm(o) === norm(it.m.a) ? " is-y" : o === pick ? " is-n" : " is-dim") : "";
          return <button key={k} type="button" className={st} onClick={() => choose(o)}><b>{String.fromCharCode(65 + k)}</b>{o}</button>;
        })}
      </div>
      {pick ? <><div className="ml-q mf29-src"><Q m={it.m} /></div><button type="button" className="ml-big" onClick={() => { setPick(null); setSeed(Math.random()); }}>Agla →</button></> : null}
    </div>
  );
}

// ─── 30 · Likho phir milao ───
const keysOf = (z) => [...new Set([...(z.match(/\b\d[\d,.]*\b/g) || []), ...(z.match(/\b[A-Z][a-zA-Z'-]{2,}/g) || [])])];
function WriteCheck({ ms }) {
  const [order] = useState(() => shuffle(ms));
  const [i, setI] = useState(0);
  const [t, setT] = useState("");
  const [shown, setShown] = useState(false);
  const m = order[i % order.length];
  useFocus(m, order.slice(i + 1, i + 6));
  const fs = factsOf(m);
  const low = t.toLowerCase();
  const hit = (w) => !!w && low.includes(String(w).toLowerCase());
  const ansHit = plain(m.a).split(/\s+/).some((w) => w.length > 2 && hit(w));
  const next = (ok) => { mark(m.id, ok); setI(i + 1); setT(""); setShown(false); };
  return (
    <div className="mf30">
      <div className="ml-q"><Q m={m} /></div>
      <textarea className="mf30-in" rows={4} value={t} onChange={(e) => setT(e.target.value)} placeholder="Jawab aur jo bhi yaad hai (saal, naam…) likho" disabled={shown} />
      {!shown ? <button type="button" className="ml-big" onClick={() => setShown(true)}>Milao</button> : (
        <>
          <div className={`mf30-a ${ansHit ? "is-y" : "is-n"}`}>{ansHit ? "✓" : "✗"} Jawab: <b>{m.a}</b></div>
          {!fs ? <Wait /> : fs.map((z, j) => {
            const ks = keysOf(z);
            const got = ks.filter(hit).length;
            return <p key={j} className={`mf30-f${got ? " is-y" : ""}`}>{got ? "✓" : "○"} ⚡ {z}</p>;
          })}
          <Rate onRate={next} />
        </>
      )}
    </div>
  );
}

// ─── 31 · Aaj ke 10 ───
const today = () => new Date().toISOString().slice(0, 10);
function seeded(arr, seedStr) {
  let h = 0; for (const c of seedStr) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const b = [...arr];
  for (let i = b.length - 1; i > 0; i--) { h = (h * 1103515245 + 12345) >>> 0; const j = h % (i + 1); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}
function Today10({ ms }) {
  const d = today();
  const set = useMemo(() => seeded(ms, d).slice(0, 10), [ms, d]);
  const [st, setSt] = useState(() => { const v = readJ("cgl.medday", {}); return v.d === d ? v : { d, done: [] }; });
  const [open, setOpen] = useState(null);
  const [ans, setAns] = useState({});
  const done = (id) => { const v = { d, done: [...new Set([...st.done, id])] }; setSt(v); writeJ("cgl.medday", v); setOpen(null); };
  return (
    <div className="mf31">
      <div className="mf31-top"><b>{d}</b><span>{st.done.length} / {set.length} ho gaye</span></div>
      <div className="mf31-bar"><i style={{ width: `${(st.done.length / set.length) * 100}%` }} /></div>
      {set.map((m, k) => {
        const isDone = st.done.includes(m.id);
        const o = open === m.id;
        return (
          <div key={m.id} className={`mf31-it${isDone ? " is-done" : ""}${o ? " is-open" : ""}`}>
            <div className="mf31-h" onClick={() => { setOpen(o ? null : m.id); if (!o) focus(m, set.slice(k + 1, k + 6)); }}>
              <span>{isDone ? "✅" : k + 1}</span><div><Q m={m} /></div>
            </div>
            {o ? (ans[m.id] ? (
              <div className="mf31-body"><h2>{m.a}</h2><Facts m={m} />{!isDone ? <button type="button" className="ml-big" onClick={() => done(m.id)}>✓ Ho gaya</button> : null}</div>
            ) : <button type="button" className="ml-big" onClick={() => setAns((a) => ({ ...a, [m.id]: true }))}>👁️ Jawab + facts</button>) : null}
          </div>
        );
      })}
      {st.done.length === set.length ? <div className="ml-done"><b>Aaj ke 10 pure 🎉</b><span className="ml-dim">Kal naye 10 aayenge</span></div> : null}
    </div>
  );
}

// ─── 32 · Khoj ───
function Search({ ms, tick }) {
  const [t, setT] = useState("");
  const q = t.trim();
  const list = useMemo(() => {
    if (!q) return ms.slice(0, 20);
    const l = q.toLowerCase();
    return ms.filter((m) => `${plain(m.q)} ${m.a} ${(factsOf(m) || []).join(" ")}`.toLowerCase().includes(l)).slice(0, 30);
  }, [q, ms, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="mf32">
      <input className="mf32-in" value={t} onChange={(e) => setT(e.target.value)} placeholder="🔍 Naam, saal, jagah… (jaise Akbar, 1526, Hampi)" autoFocus />
      <p className="ml-dim">{q ? `${list.length} mile` : "Kuch likho — sawaal, jawab aur facts sab mein dhoondhega"}</p>
      {list.map((m) => (
        <div key={m.id} className="mf32-it">
          <div>{q ? hl(plain(m.q), q) : <Q m={m} />}</div>
          <b>{q ? hl(m.a, q) : m.a}</b>
          <Facts m={m} auto q={q} />
        </div>
      ))}
    </div>
  );
}

// ─── 33 · Do pane ───
// DeepSeek (owner ka niyam): khulte hi saamne wala + agle 4 (1–5). Phir jis
// sawaal par ho uske 5 AAGE wala ek (1 par → 6, 7 par → 12) — saare nahi.
// Saamne wale ka jawab na ho to wo bhi. Jaldi-jaldi aage badhne par beech
// wale chhoot na jayein (SelectAsk aakhri event hi uthata hai), isliye jo
// bheje nahi gaye wo agle event mein saath jaate hain.
function useAheadFive(ms, i) {
  const first = useRef(true);
  const pend = useRef([]);
  const last = useRef(0);
  const list = useRef(null);
  useEffect(() => {
    const m = ms[i];
    if (!m) return;
    // Nayi list (chapter / filter badla) → phir se shuru wale 1–5.
    if (list.current !== ms) { list.current = ms; first.current = true; last.current = 0; pend.current = []; }
    // Ginti sawaal ke asli number se (bina jawab wala beech mein ho to bhi 1 → 6).
    if (first.current) { first.current = false; pend.current = ms.filter((x) => x.no > m.no && x.no < m.no + 5); }
    // Thoda aage badhe (≤5) to beech ki ginti bhi — koi chhoote nahi; lambi
    // chhalang par sirf ek (saare nahi).
    const step = m.no - last.current;
    const from = step > 0 && step <= 5 ? last.current + 5 : m.no + 4;
    for (const x of ms.filter((y) => y.no > from && y.no <= m.no + 5)) if (!pend.current.includes(x)) pend.current.push(x);
    if (!ms.some((y) => y.no > from && y.no <= m.no + 5)) {
      const ahead = ms.find((x) => x.no >= m.no + 5);
      if (ahead && !pend.current.includes(ahead)) pend.current.push(ahead);
    }
    last.current = m.no;
    const look = lookup();
    pend.current = pend.current.filter((x) => !look(x.raw)).slice(-12);
    focus(m, pend.current);
  }, [i, ms]); // eslint-disable-line react-hooks/exhaustive-deps
}

function TwoPane({ ms }) {
  const [i, setI] = useResume("cgl.medf.pane", ms.length);
  const [detail, setDetail] = useState(false);
  const m = ms[i];
  useAheadFive(ms, i);
  const opts = m.opts.map((o, k) => <li key={k} className={k === m.ai ? "is-a" : ""}><b>{String.fromCharCode(65 + k)}</b>{o}</li>);
  const listRef = useRef(null);
  // 7000+ button — har naye jawab par dobara na banen.
  const list = useMemo(() => ms.map((x, k) => (
    <button key={x.id} type="button" className={k === i ? "is-on" : ""} onClick={() => { setI(k); setDetail(true); }}><span>{x.no}</span>{plain(x.q)}</button>
  )), [ms, i]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const el = listRef.current && listRef.current.querySelector(".is-on"); if (el) el.scrollIntoView({ block: "nearest" }); }, [i]);
  useEffect(() => {
    const k = (e) => {
      if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
      if (e.key === "ArrowDown") { e.preventDefault(); setI(i + 1); } else if (e.key === "ArrowUp") { e.preventDefault(); setI(i - 1); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });
  return (
    <div className={`mf33${detail ? " is-detail" : ""}`}>
      <div className="mf33-list" ref={listRef}>
        {list}
      </div>
      <div className="mf33-pane">
        <button type="button" className="mf33-back" onClick={() => setDetail(false)}>← List</button>
        <small>#{m.no}</small>
        <div className="mf33-q"><Q m={m} /></div>
        {/* Mobile: options jawab ke UPAR (desktop par daayen alag khaana). */}
        <ol className="mf33-opts mf33-opts--in">{opts}</ol>
        <h2>{m.a}</h2>
        <Clusters m={m} />
        <Nav i={m.no - 1} n={ms[ms.length - 1].no} go={(d) => setI(i + d)} />
      </div>
      {/* Jawab wale dabbe ke DAAYEN alag khaana — us sawaal ke options. */}
      <div className="mf33-side">
        <small>Options</small>
        <ol className="mf33-opts">{opts}</ol>
      </div>
    </div>
  );
}

// ─── 34 · Highlighter ───
function Highlight({ ms }) {
  const [n, setN] = useState(20);
  return (
    <div className="mf34">
      <p className="ml-dim"><mark className="is-n">saal / sankhya</mark> · <mark className="is-w">naam</mark> — inhi par nazar</p>
      {ms.slice(0, n).map((m, k) => (
        <div key={m.id} className="mf34-it">
          <span className="ml-dim">{k + 1}</span>
          <div>
            <div className="mf34-q">{hl(plain(m.q))}</div>
            <b className="mf34-a">→ {m.a}</b>
            <Facts m={m} auto mode="hl" />
          </div>
        </div>
      ))}
      {n < ms.length && <button type="button" className="ml-big" onClick={() => setN(n + 20)}>Aur 20 ({ms.length - n} bache)</button>}
    </div>
  );
}

// ─── 35 · Pehla akshar reel ───
function LetterReel({ ms }) {
  const items = ms.map((m) => {
    const fs = factsOf(m);
    const pts = [{ t: `**${m.a}**` }, ...(fs || []).map((t) => ({ t }))];
    if (!fs) pts.push({ t: "⏳ DeepSeek fact bana raha hai…", h: true });
    return { id: m.id, head: m.q, pts };
  });
  const onAt = useRef((i) => focus(ms[i], ms.slice(i + 1, i + 6))).current;
  useEffect(() => {
    const v = readJ("cgl.mnscroll.medfacts", null);
    const i = v && v.id ? Math.max(0, ms.findIndex((x) => x.id === v.id)) : 0;
    focus(ms[i], ms.slice(i + 1, i + 6));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return <MnemonicScroll items={items} storeKey="medfacts" onAt={onAt} />;
}

// ─── 36 · Aaj / kal padha ───
function Recent({ ms }) {
  const seen = readJ(SEEN, {});
  const day = 864e5;
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const t0 = start.getTime();
  const buckets = [["Aaj", (t) => t >= t0], ["Kal", (t) => t >= t0 - day && t < t0], ["Is hafte", (t) => t >= t0 - 7 * day && t < t0 - day], ["Purane", (t) => t < t0 - 7 * day]];
  const list = ms.filter((m) => seen[m.id]).sort((a, b) => seen[b.id] - seen[a.id]);
  if (!list.length) return <Empty>Abhi kuch nahi — 21–40 ke kisi bhi roop mein sawaal kholte hi yahan aayega.</Empty>;
  return (
    <div className="mf36">
      {buckets.map(([l, f]) => {
        const xs = list.filter((m) => f(seen[m.id]));
        if (!xs.length) return null;
        return (
          <section key={l}>
            <h3 className="mf36-h">{l} · {xs.length}</h3>
            {xs.map((m) => <div key={m.id} className="mf36-it"><Q m={m} /><b>→ {m.a}</b><Facts m={m} auto /></div>)}
          </section>
        );
      })}
    </div>
  );
}

// ─── 37 · Ek jawab → saare sawaal ───
function ByAnswer({ ms }) {
  const groups = useMemo(() => {
    const g = new Map();
    for (const m of ms) { const k = norm(m.a); if (!g.has(k)) g.set(k, []); g.get(k).push(m); }
    return [...g.values()].sort((a, b) => b.length - a.length || a[0].a.localeCompare(b[0].a));
  }, [ms]);
  const [open, setOpen] = useState({});
  const [n, setN] = useState(30);
  return (
    <div className="mf37">
      <p className="ml-dim">Ek hi jawab wale sawaal saath — pehle wo jinke sabse zyada sawaal.</p>
      {groups.slice(0, n).map((g) => {
        const k = g[0].id;
        const o = open[k];
        const fs = [...new Set(g.flatMap((m) => factsOf(m) || []))];
        const wait = g.filter((m) => !factsOf(m)).length;
        return (
          <div key={k} className={`mf37-g${o ? " is-open" : ""}`}>
            <div className="mf37-h" onClick={() => { setOpen((x) => ({ ...x, [k]: !x[k] })); if (!o) focus(g.find((m) => !factsOf(m)) || g[0], g.slice(1, 6)); }}>
              <b>{g[0].a}</b><span className="mf37-c">{g.length}</span>
            </div>
            <ul>{g.map((m) => <li key={m.id}><Q m={m} /></li>)}</ul>
            {o ? <div className="mf-facts">{fs.map((z, j) => <p key={j}>⚡ {z}</p>)}{wait ? <div className="mf-wait">⏳ {wait} ke facts ban rahe hai…</div> : null}</div> : null}
          </div>
        );
      })}
      {n < groups.length && <button type="button" className="ml-big" onClick={() => setN(n + 30)}>Aur 30</button>}
    </div>
  );
}

// ─── 38 · Notes roop ───
function Notes({ ms }) {
  const groups = useMemo(() => {
    const g = GROUPS.map(([l]) => ({ l, items: [] }));
    const rest = { l: "📦 Baaki", items: [] };
    for (const m of ms) {
      const t = `${plain(m.q)} ${m.a}`.toLowerCase();
      const k = GROUPS.findIndex(([, re]) => re.test(t));
      (k >= 0 ? g[k] : rest).items.push(m);
    }
    return [...g, rest].filter((x) => x.items.length);
  }, [ms]);
  const [n, setN] = useState(40);
  let left = n;
  return (
    <div className="mf38">
      <nav className="mf38-toc">{groups.map((g, k) => <a key={g.l} href={`#mfn-${k}`}>{g.l} <small>{g.items.length}</small></a>)}</nav>
      {groups.map((g, k) => {
        if (left <= 0) return null;
        const xs = g.items.slice(0, left);
        left -= xs.length;
        return (
          <section key={g.l} id={`mfn-${k}`}>
            <h2 className="mf38-h">{g.l}</h2>
            <ul className="mf38-ul">
              {xs.map((m) => <li key={m.id}><b>{m.a}</b> — <Q m={m} /><Facts m={m} auto /></li>)}
            </ul>
          </section>
        );
      })}
      {n < ms.length && <button type="button" className="ml-big" onClick={() => setN(n + 40)}>Aur 40 ({ms.length - n} bache)</button>}
    </div>
  );
}

// ─── 39 · Swipe stack ───
function Swipe({ ms }) {
  const [q, setQ] = useState(() => shuffle(ms.map((m) => m.id)));
  const [s, setS] = useState({ y: 0, n: 0 });
  const [open, setOpen] = useState(false);
  const [dx, setDx] = useState(0);
  const drag = useRef(null);
  const by = useMemo(() => new Map(ms.map((m) => [m.id, m])), [ms]);
  const m = by.get(q[0]);
  const behind = by.get(q[1]);
  useFocus(m, q.slice(1, 6).map((id) => by.get(id)));
  if (!m) return <div className="ml-done"><b>Sab yaad 🎉</b><span>✓ {s.y} · ✗ {s.n}</span><button type="button" className="ml-big" onClick={() => { setQ(shuffle(ms.map((x) => x.id))); setS({ y: 0, n: 0 }); }}>Phir se</button></div>;
  const rate = (ok) => {
    mark(m.id, ok);
    setS((x) => ({ y: x.y + (ok ? 1 : 0), n: x.n + (ok ? 0 : 1) }));
    setQ((x) => { const r = x.slice(1); if (!ok) r.splice(Math.min(3, r.length), 0, x[0]); return r; });
    setOpen(false); setDx(0);
  };
  const down = (e) => { drag.current = { x: e.clientX, moved: false }; e.currentTarget.setPointerCapture?.(e.pointerId); };
  const move = (e) => { if (!drag.current) return; const d = e.clientX - drag.current.x; if (Math.abs(d) > 6) drag.current.moved = true; setDx(d); };
  const up = () => {
    if (!drag.current) return;
    const moved = drag.current.moved;
    drag.current = null;
    if (dx > 90) rate(true); else if (dx < -90) rate(false); else { setDx(0); if (!moved) setOpen(true); }
  };
  return (
    <div className="mf39">
      <div className="ml-score">✓ {s.y} · ✗ {s.n} · {q.length} bache · ➡️ yaad · ⬅️ dobara</div>
      <div className="mf39-stack">
        {behind ? <div className="mf39-card is-behind"><Q m={behind} /></div> : null}
        <div className="mf39-card" style={{ transform: `translateX(${dx}px) rotate(${dx / 18}deg)` }} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          {dx > 30 ? <span className="mf39-tag is-y">YAAD</span> : dx < -30 ? <span className="mf39-tag is-n">DOBARA</span> : null}
          <div className="mf39-q"><Q m={m} /></div>
          {open ? <><h2>{m.a}</h2><Facts m={m} /></> : <small className="ml-dim">dabao → jawab + facts</small>}
        </div>
      </div>
      <Rate onRate={rate} labels={["⬅️ Dobara", "Yaad ➡️"]} />
    </div>
  );
}

// ─── 40 · Apna trick ───
const TR = "cgl.medtricks";
function Trick({ ms }) {
  const [tr, setTr] = useState(() => readJ(TR, {}));
  const [only, setOnly] = useState(false);
  const list = only ? ms.filter((m) => tr[m.id]) : ms;
  const [i, setI] = useResume("cgl.medf.trick", Math.max(1, list.length));
  const m = list[Math.min(i, list.length - 1)];
  useFocus(m, m ? list.slice(i + 1, i + 6) : []);
  const save = (v) => { const all = { ...tr, [m.id]: v }; if (!v.trim()) delete all[m.id]; setTr(all); writeJ(TR, all); };
  return (
    <div className="mf40">
      <div className="ml-chips">
        <button type="button" className={!only ? "is-on" : ""} onClick={() => { setOnly(false); setI(0); }}>Sab · {ms.length}</button>
        <button type="button" className={only ? "is-on" : ""} onClick={() => { setOnly(true); setI(0); }}>✍️ Jinme trick likha · {Object.keys(tr).filter((k) => ms.some((x) => x.id === k)).length}</button>
      </div>
      {!m ? <Empty>Abhi koi trick nahi likha.</Empty> : (
        <>
          <div className="ml-q"><Q m={m} /> <b className="mf-ans">→ {m.a}</b></div>
          <Facts m={m} />
          <label className="mf40-l">✍️ Apna trick / jod (khud ke shabdon mein)</label>
          <textarea key={m.id} className="mf30-in" rows={3} defaultValue={tr[m.id] || ""} onBlur={(e) => save(e.target.value)} placeholder="Jaise: Buland Darwaza = Akbar ki Gujarat jeet — 'B'uland 'A'kbar" />
          <Nav i={Math.min(i, list.length - 1)} n={list.length} go={(d) => setI(i + d)} />
        </>
      )}
    </div>
  );
}

const COMP = { 21: Book, 22: Sticky, 23: Clue, 24: Cloze, 25: Paper, 26: Chat, 27: MindMap, 28: Kosh, 29: WhoseFact, 30: WriteCheck, 31: Today10, 32: Search, 33: TwoPane, 34: Highlight, 35: LetterReel, 36: Recent, 37: ByAnswer, 38: Notes, 39: Swipe, 40: Trick };

export default function MedFacts({ lay, qs, ns = "" }) {
  NS = ns;
  const all = useMemo(() => { LOOK = null; return toMs(qs); }, [qs]);
  const [tick, setTick] = useState(0);
  const ms = all;
  ALL = ms;
  // DeepSeek ka jawab aaya → facts dikhao.
  useEffect(() => {
    const on = () => { LOOK = null; setTick((t) => t + 1); };
    window.addEventListener("cgl:sprint-ans", on);
    window.addEventListener("cgl:ds-saved", on);
    return () => { window.removeEventListener("cgl:sprint-ans", on); window.removeEventListener("cgl:ds-saved", on); };
  }, []);
  useEffect(() => () => { try { window.dispatchEvent(new CustomEvent("cgl:sprint-q", { detail: { q: null } })); } catch { /* ignore */ } }, []);
  const C = COMP[lay];
  if (!C) return null;
  if (!ms.length) return <Empty>Jawab wale sawaal nahi mile.</Empty>;
  return <div className={`ml mf mf--${lay}`}><C key={`${lay}:${ns}`} ms={ms} tick={tick} /></div>;
}
