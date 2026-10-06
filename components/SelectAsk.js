"use client";

// 💬 Site par kahin bhi text select karo — chaar cheezein saamne aa jaati hain:
//
//   💬 Poochho   — dayein taraf panel khulta hai, usi text par baatcheet
//   🖼 Tasveer   — Wikipedia/Commons se photo, usi panel mein (muft, bina key)
//   🔍 Google    — nayi tab mein google.com par wahi text
//   📝 One-liner  — chuni hui line seedha One-liners page par (kis subject
//                  ki hai, wahi ek baar poochha jata hai)
//   📋 Copy      — clipboard mein
//
// Panel ke andar:
//   • 💬 dabate hi DeepSeek apne aap us text ko samjha deta hai. Uske baad jo
//     poochhna ho wahin poochho — baat aage chalti hai.
//   • HAR jawab ke NEECHE usi sawaal ki tasveerein aati hain. Agla sawaal
//     poochha to uski apni tasveerein uske neeche; upar wali wahin rehti
//     hain. (Pehle ek hi patti sabse upar chipki reh jati thi.)
//   • Tasveer par click karne se wo WAHIN badi khulti hai, ‹ › se agli-pichhli
//     — nayi tab nahi khulti.
//   • Sar par ‹ › se purani baatcheet wapas (lib/asklog mein sambhali hui).
//     Purani dekhne par koi naya call nahi hota, isliye paisa nahi lagta.
//   • ➕ se topic se hatt kar kuch bhi poochho.
//   • ⚡ Sprint chal raha ho to har jawab ke neeche "⭐ Is question ka jawab
//     bana do" — wo jawab usi question ka pakka jawab ban jata hai (sprint
//     ka parda usi pal badal jata hai, aur baad mein bhi wahi dikhta hai).
//
// Do baatein jaan-boojh kar aisi hain:
//   • Google wala button CLICK ke andar hi window.open karta hai. Kisi await
//     ke BAAD kholte to browser use popup maan kar chup-chaap rok deta.
//   • Panel ke BAHAR click karne par wo chhup jata hai, par baatcheet mitti
//     nahi — dayein kinare par 💬 wala chhota button use wapas le aata hai.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import "@/app/selectask.css";
import Markdown from "./Markdown";
import { termsOf } from "@/lib/terms";
import { askSelection } from "@/lib/client-ai";
import { searchImages } from "@/lib/webimages";
import { getThreads, saveThread, newThreadId } from "@/lib/asklog";
import { putAns, qText as sprintQText } from "@/lib/sprint";
import { addOneLiner, OL_SUBS } from "@/lib/oneliners";
import { addPair, readPending, setPending } from "@/lib/culturepairs";
import { StaticsPaste, askGeminiStatics } from "./StaticsInfo";
import ClusterButton from "./ClusterButton";

// 💬 Poochho dabate hi yahi sawaal apne aap chala jata hai — pehle kuch
// likhna nahi padta.
const AUTO_Q = "Isko samjhao — seedha, chhota aur kaam ka.";

const SUBJECTS = [
  { v: "", label: "Apne aap" },
  { v: "math", label: "🧮 Maths" },
  { v: "reasoning", label: "🧠 Reasoning" },
  { v: "english", label: "📚 English" },
  { v: "gs", label: "🌍 GS" },
];

// Page ka pata dekh kar subject. Jo na mile wo khaali — tab AI khud taay
// karta hai (route ka apna prompt bina subject ke bhi kaam karta hai).
function subjectFromPath(path) {
  const p = String(path || "");
  if (/\/(mathbank|maths2025|all\/maths|calc)/.test(p)) return "math";
  if (/\/(reasonbank|all\/reasoning)/.test(p)) return "reasoning";
  if (/\/(pinnacle|errorpro|mirror|all\/english|vocab|english)/.test(p)) return "english";
  if (/\/(war|gktricks|pyq\/gk|all\/gs|notes|current-affairs|static-gk|one-liners)/.test(p)) return "gs";
  return "";
}

// Saamne wale question ka apna subject (Home ke card `_ask` ke saath aate hain)
// — page ke pate se zyada sahi: Home par English ka sawaal ho to English ka prompt.
function subjectOfQ(q) {
  const k = String((q && q._ask) || "").toLowerCase();
  if (k === "maths" || k === "math") return "math";
  if (k === "reasoning" || k === "english") return k;
  if (k === "gs" || k === "ca") return "gs";
  return "";
}

// Selection panel / patti / badi tasveer ke andar se aayi hai? (Wahan ka
// select karna apna kaam hai — uspar dobara patti nahi aani chahiye.)
function insideOwn(node) {
  let el = node && (node.nodeType === 1 ? node : node.parentElement);
  while (el) {
    const c = el.classList;
    if (c && (c.contains("sa-panel") || c.contains("sa-bar") || c.contains("sa-light"))) return true;
    el = el.parentElement;
  }
  return false;
}

// Selection ki patti kahan NAHI aani chahiye: patti / badi tasveer ke andar,
// aur panel ke likhne wale dabbe mein. DeepSeek ke jawab (panel) mein
// select karna ab chalta hai — owner wahan se bhi one-liner / jodi banata hai.
function noBarFor(node) {
  let el = node && (node.nodeType === 1 ? node : node.parentElement);
  while (el) {
    const c = el.classList;
    if (c && (c.contains("sa-bar") || c.contains("sa-light"))) return true;
    if (/^(INPUT|TEXTAREA)$/.test(el.tagName)) return true;
    el = el.parentElement;
  }
  return false;
}

// Is sawaal ki tasveer kis cheez ki dhoondhein. Sawaal mein koi NAAM ho to
// wahi ("Konark Temple kab bana?" → Konark Temple), warna jo select kiya tha.
function imageQueryFor(question, sel) {
  const t = termsOf(question);
  return t.length ? t.slice(0, 2).join(" ") : sel;
}

// Ek sandesh ke neeche uski apni tasveerein.
function Strip({ m, onOpen }) {
  if (m.imgBusy) return <div className="sa-wait sa-wait--pad">🖼 dhoondh raha hai…</div>;
  if (!m.imgs || !m.imgs.length) {
    if (!m.imgQ) return null;
    return (
      <div className="sa-wait sa-wait--pad">
        🖼 Wikipedia par kuch nahi mila.{" "}
        <button
          type="button"
          className="linklike"
          onClick={() => window.open("https://www.google.com/search?tbm=isch&q=" + encodeURIComponent(m.imgQ), "_blank", "noopener")}
        >Google Images</button>
      </div>
    );
  }
  return (
    <div className="sa-imgs">
      {m.imgs.map((im, k) => (
        <button key={(im.full || "") + k} type="button" title={im.title} onClick={() => onOpen(m.imgs, k)}>
          <img src={im.thumb} alt={im.title} loading="lazy" />
        </button>
      ))}
    </div>
  );
}

// 📝 "Kis subject ki one-liner?" — chuna hua text seedha One-liners page par
// (/oneliners), wahi chaar subject jo us page par hain: GS · English · Maths ·
// Reasoning (lib/oneliners ka OL_SUBS).
//
// Koi AI nahi chalta: line jaisi hai waisi jati hai. Isliye ye button muft hai.
function OlPick({ text, onClose }) {
  const [saved, setSaved] = useState(null);
  // 🪔 Statics — do shabd ki jodi (Modhera ↔ Gujarat) Bharat Sanskriti ke
  // "✍️ Mere jode" mein. Pehla shabd `cgl.culture.pending` mein rukta hai;
  // jodi-daar yahin likh do, ya page par select karke phir yahi button.
  const [pending] = useState(readPending);
  const [stat, setStat] = useState(false);
  const [other, setOther] = useState("");
  const [note, setNote] = useState("");
  const put = (sub) => {
    addOneLiner({ subject: sub.k, text });
    setSaved(sub);
    setTimeout(onClose, 2200);
  };
  const statics = () => {
    if (pending && pending !== text) {
      addPair(pending, text);
      setPending("");
      setSaved({ k: "statics", label: `🪔 ${pending} ↔ ${text}` });
      setTimeout(onClose, 2600);
    } else setStat(true);
  };
  const saveTyped = () => {
    if (!other.trim()) return;
    addPair(text, other, note);
    setPending("");
    setSaved({ k: "statics", label: `🪔 ${text} ↔ ${other.trim()}` });
    setTimeout(onClose, 2600);
  };

  return (
    <div className="sa-olm" onClick={onClose}>
      <div className="sa-olm__box" onClick={(e) => e.stopPropagation()}>
        {saved ? (
          saved.k === "statics" ? (
            <p className="sa-olm__ok">✅ Jodi ban gayi: <b>{saved.label}</b>{" "}<a href="/culture?set=mine">Kholo →</a></p>
          ) : (
            <p className="sa-olm__ok">
              ✅ <b>{saved.label}</b> ki one-liner ban gayi.{" "}
              <a href={`/oneliners?sub=${saved.k}`}>Kholo →</a>
            </p>
          )
        ) : stat ? (
          <>
            <div className="sa-olm__hd">
              <b>🪔 <q>{text.slice(0, 60)}</q> ka jodi-daar?</b>
              <button type="button" onClick={onClose} aria-label="Band karo">✕</button>
            </div>
            <input className="sa-olm__in" autoFocus value={other} onChange={(e) => setOther(e.target.value)} placeholder="Jaise: Gujarat / Surya mandir…" onKeyDown={(e) => { if (e.key === "Enter") saveTyped(); }} />
            <input className="sa-olm__in" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Explanation (chahiye to)" />
            <div className="sa-olm__books">
              <button type="button" onClick={saveTyped} disabled={!other.trim()}><span>💾</span>Jodi save</button>
              <button type="button" onClick={() => { setPending(text); onClose(); }}><span>👆</span>Baad mein select karunga</button>
            </div>
            <p className="sa-olm__hint">"Baad mein" chuna to page par jodi-daar select karo → 📝 One-liner → 🪔 Statics.</p>
          </>
        ) : (
          <>
            <div className="sa-olm__hd">
              <b>📝 Kis subject ki one-liner?</b>
              <button type="button" onClick={onClose} aria-label="Band karo">✕</button>
            </div>
            <p className="sa-olm__q">{text.slice(0, 220)}{text.length > 220 ? "…" : ""}</p>
            <div className="sa-olm__books">
              {OL_SUBS.map((sub) => (
                <button key={sub.k} type="button" onClick={() => put(sub)}>
                  <span>{sub.icon}</span>
                  {sub.label}
                </button>
              ))}
              <button type="button" onClick={statics}>
                <span>🪔</span>
                {pending && pending !== text ? `Statics — "${pending.slice(0, 24)}" se jodo` : "Statics"}
              </button>
            </div>
            {pending && pending !== text ? <p className="sa-olm__hint">🪔 <b>{pending}</b> ka jodi-daar baaki hai — ye shabd uske saath jodne ke liye Statics dabao. <button type="button" className="sa-olm__x" onClick={() => { setPending(""); onClose(); }}>radd karo</button></p> : null}
          </>
        )}
      </div>
    </div>
  );
}

export default function SelectAsk() {
  const path = usePathname();
  const [bar, setBar] = useState(null);      // { text, x, y }
  // 📝 One-liner: chuna hua text, jab tak subject nahi poochh lete.
  const [olText, setOlText] = useState("");
  const [siTerm, setSiTerm] = useState("");  // 🪔 Festival — paste popup kis shabd ka
  const [open, setOpen] = useState(false);

  // chalu baatcheet
  const [tid, setTid] = useState("");
  const [sel, setSel] = useState("");
  const [subject, setSubject] = useState("");
  const [msgs, setMsgs] = useState([]);

  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [full, setFull] = useState(false);   // quote khula hai ya kata hua
  const [autoQ, setAutoQ] = useState("");
  const [imgWanted, setImgWanted] = useState("");
  const [light, setLight] = useState(null);  // { list, at }
  const [old, setOld] = useState([]);        // sambhale hue thread
  // ⚡ Sprint mein abhi jo question saamne hai (wahi page khabar bhejta hai).
  const [sq, setSq] = useState(null);
  const [setAsDef, setSetAsDef] = useState(-1);   // kis sandesh par "✓ lag gaya"

  const msgsRef = useRef(null);
  const boxRef = useRef(null);
  const barRef = useRef(null);

  // 🖥️ Desktop (chaudi screen) par panel dayein taraf FIX — page khud baayen
  // khisak jaata hai, bahar click se band nahi hota, aur khula/band yaad
  // rehta hai. Phone par pehle jaisa (neeche se uthta, bahar dabao to band).
  const [dock, setDock] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1100px)");
    const on = () => setDock(mq.matches);
    on();
    mq.addEventListener("change", on);
    let want = true;
    try { want = localStorage.getItem("cgl.sa.dock") !== "0"; } catch { /* ignore */ }
    if (mq.matches && want) setOpen(true);
    return () => mq.removeEventListener("change", on);
  }, []);
  const closePanel = useCallback(() => {
    setOpen(false);
    if (dock) { try { localStorage.setItem("cgl.sa.dock", "0"); } catch { /* ignore */ } }
  }, [dock]);
  const showPanel = useCallback(() => {
    setOpen(true);
    try { localStorage.setItem("cgl.sa.dock", "1"); } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    const on = open && dock;
    document.body.classList.toggle("sa-docked", on);
    return () => document.body.classList.remove("sa-docked");
  }, [open, dock]);

  // ── selection ki patti ─────────────────────────────────────────────────
  const read = useCallback(() => {
    const s = typeof window !== "undefined" ? window.getSelection() : null;
    const text = s ? String(s).trim() : "";
    if (!s || !text || text.length < 2 || s.rangeCount === 0 || noBarFor(s.anchorNode)) { setBar(null); return; }
    const r = s.getRangeAt(0).getBoundingClientRect();
    if (!r || (!r.width && !r.height)) { setBar(null); return; }
    setBar({
      text,
      x: Math.min(Math.max(8, r.left + r.width / 2), window.innerWidth - 8),
      y: r.top,
    });
  }, []);

  // Patti ki asli chaudai naap kar screen ke andar rakho — kinaare par
  // (baayen/dayein) select karne se aadhi patti bahar kat jaati thi.
  useLayoutEffect(() => {
    const el = barRef.current;
    if (!bar || !el) return;
    // Pehle baayen kinaare par rakh kar naapo — dayein kinaare par patti
    // sikud kar galat chaudai deti hai.
    el.style.left = "0px";
    el.style.transform = "none";
    const w = el.offsetWidth, vw = document.documentElement.clientWidth || window.innerWidth;
    el.style.left = Math.max(8, Math.min(bar.x - w / 2, vw - w - 8)) + "px";
    el.style.transform = "none";
  }, [bar]);

  useEffect(() => {
    const later = () => setTimeout(read, 10);
    document.addEventListener("mouseup", later);
    document.addEventListener("touchend", later);
    document.addEventListener("keyup", later);
    const hide = () => setBar(null);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      document.removeEventListener("mouseup", later);
      document.removeEventListener("touchend", later);
      document.removeEventListener("keyup", later);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [read]);

  // Panel ke bahar click → chhup jao. Badi tasveer khuli ho to usse pehle
  // wahi band hoti hai (wo poori screen leti hai).
  useEffect(() => {
    if (!open || dock) return undefined;
    const onDown = (e) => { if (!light && !insideOwn(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open, light, dock]);

  // Neeche tak sirf tab jab TUM sawaal bhejo, panel khule ya baatcheet badle.
  // Line wale jawab peechhe bante waqt khud neeche nahi khichte — jo padh
  // rahe ho wahin rehta hai.
  const [sentTick, setSentTick] = useState(0);
  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
  }, [sentTick, open, tid]);

  useEffect(() => { setOld(getThreads()); }, []);
  useEffect(() => {
    const h = (e) => { setSq((e && e.detail && e.detail.q) || null); setSetAsDef(-1); };
    window.addEventListener("cgl:sprint-q", h);
    return () => window.removeEventListener("cgl:sprint-q", h);
  }, []);

  // Baatcheet badalte hi sambhal jati hai — band karke kholne par wahi milti.
  useEffect(() => {
    if (!tid || !msgs.length) return;
    saveThread({ id: tid, sel, subject, msgs });
    setOld(getThreads());
  }, [tid, sel, subject, msgs]);

  // ── panel kholna ───────────────────────────────────────────────────────
  const openPanel = useCallback((text, auto) => {
    setTid(newThreadId());
    setSel(text);
    setSubject(subjectOfQ(sqRef.current) || subjectFromPath(path));
    setMsgs([]);
    setErr("");
    setQ("");
    setFull(false);
    setAutoQ(auto ? AUTO_Q : "");
    setOpen(true);
    setBar(null);
    setTimeout(() => boxRef.current?.focus(), 60);
  }, [path]);

  // ── tasveer ────────────────────────────────────────────────────────────
  // `i` = kis sandesh ke neeche lagani hai. Isi se purane sandesh ki
  // tasveerein apni jagah pari rehti hain.
  const fetchImgs = useCallback(async (i, query) => {
    const qq = String(query || "").trim();
    if (!qq) return;
    setMsgs((m) => m.map((x, j) => (j === i ? { ...x, imgBusy: true, imgQ: qq } : x)));
    let list = [];
    try { list = await searchImages(qq); } catch { list = []; }
    setMsgs((m) => m.map((x, j) => (j === i ? { ...x, imgBusy: false, imgs: list } : x)));
  }, []);

  // 🖼 button se panel khula → sirf tasveer, koi AI call nahi.
  useEffect(() => {
    if (!open || !imgWanted || imgWanted !== sel) return;
    setImgWanted("");
    setMsgs((m) => {
      const next = [...m, { role: "imgs", imgQ: sel, imgBusy: true }];
      setTimeout(() => fetchImgs(next.length - 1, sel), 0);
      return next;
    });
  }, [open, imgWanted, sel, fetchImgs]);

  // ── sawaal ─────────────────────────────────────────────────────────────
  // ── 🐋 Queue: sawaal line mein lagte hain, jawab ek-ek karke peechhe ──────
  // Har sawaal ke saath us waqt saamne wala question (sq) bhi yaad — jawab
  // aane par "⭐ Is question ka jawab bana do" USI par lagta hai, latest par
  // nahi. Beech mein nayi baatcheet khol di to jawab purani baatcheet mein
  // jaata hai (asklog).
  const tidRef = useRef(tid); tidRef.current = tid;
  const sqRef = useRef(sq); sqRef.current = sq;
  const jobs = useRef([]);
  const working = useRef(false);
  const [queued, setQueued] = useState(0);

  const pump = useCallback(async () => {
    if (working.current) return;
    working.current = true;
    while (jobs.current.length) {
      setQueued(jobs.current.length);
      setBusy(true);
      const j = jobs.current[0];
      let answer = "", error = "";
      try {
        const r = await askSelection({ selection: j.sel, question: j.text, subject: j.subject, history: j.history });
        answer = r.answer;
      } catch (e) { error = e.message || "Jawab nahi aaya"; }
      jobs.current.shift();
      const fill = (m) => (m.mid === j.mid && m.pending ? { ...m, pending: false, text: answer || `⚠️ ${error}`, err: !answer } : m);
      if (tidRef.current === j.tid) {
        setMsgs((ms) => {
          const next = ms.map(fill);
          const at = next.findIndex((m) => m.mid === j.mid);
          if (answer && at >= 0) setTimeout(() => fetchImgs(at, imageQueryFor(j.text === AUTO_Q ? "" : j.text, j.sel)), 0);
          return next;
        });
      } else {
        // Purani baatcheet — sambhali hui copy mein jawab bhar do.
        const t = getThreads().find((x) => x.id === j.tid);
        if (t) {
          const ms = t.msgs || [];
          const has = ms.some((m) => m.mid === j.mid);
          saveThread({ ...t, msgs: has ? ms.map(fill) : [...ms, { role: "assistant", text: answer || `⚠️ ${error}`, mid: j.mid, q: j.q, ...(answer ? {} : { err: true }) }] });
        }
        setOld(getThreads());
      }
    }
    setQueued(0);
    setBusy(false);
    working.current = false;
  }, [fetchImgs]);

  // o: card ke 🐋 se aaya sawaal — { q, subject, sel: "", noHistory } —
  // jawab usi question par lage, pichhli baatcheet uske saath na jaaye.
  const runAsk = useCallback((text, o = {}) => {
    if (!text) return;
    const mid = `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const qNow = o.q !== undefined ? o.q : (sqRef.current || null);
    const history = o.noHistory ? [] : msgs.filter((m) => !m.pending);
    if (!tidRef.current) { const t = newThreadId(); tidRef.current = t; setTid(t); }
    setSentTick((x) => x + 1);
    setMsgs((m) => [...m, { role: "user", text, mid: mid + "u" }, { role: "assistant", text: "", pending: true, mid, q: qNow }]);
    setErr("");
    jobs.current.push({ mid, tid: tidRef.current, sel: o.sel !== undefined ? o.sel : sel, subject: o.subject || subject, history, text, q: qNow });
    setQueued(jobs.current.length);
    pump();
  }, [msgs, sel, subject, pump]);

  // 🐋 GS / English question card ka button → sawaal + options seedha yahan.
  const runAskRef = useRef(runAsk); runAskRef.current = runAsk;
  useEffect(() => {
    const h = (e) => {
      const d = (e && e.detail) || {};
      if (!d.text) return;
      setOpen(true);
      if (d.subject) setSubject(d.subject);
      runAskRef.current(d.text, { q: d.q || null, subject: d.subject, sel: "", noHistory: true });
    };
    window.addEventListener("cgl:chat-ask", h);
    return () => window.removeEventListener("cgl:chat-ask", h);
  }, []);

  const send = useCallback(() => {
    const text = q.trim();
    if (!text) return;
    setQ("");
    runAsk(text);
  }, [q, runAsk]);

  useEffect(() => {
    if (!open || !autoQ) return;
    const t = autoQ;
    setAutoQ("");
    runAsk(t);
  }, [open, autoQ, runAsk]);

  // ➕ topic se hatt kar kuch bhi.
  const fresh = useCallback(() => {
    setTid(newThreadId());
    setSel("");
    setSubject(subjectOfQ(sqRef.current) || subjectFromPath(path));
    setMsgs([]);
    setErr("");
    setQ("");
    setOpen(true);
    setTimeout(() => boxRef.current?.focus(), 60);
  }, [path]);

  // ── badi tasveer ───────────────────────────────────────────────────────
  const openLight = useCallback((list, k) => setLight({ list, at: k }), []);
  const move = useCallback((d) => {
    setLight((l) => (l ? { ...l, at: (l.at + d + l.list.length) % l.list.length } : l));
  }, []);
  useEffect(() => {
    if (!light) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setLight(null);
      else if (e.key === "ArrowRight") move(1);
      else if (e.key === "ArrowLeft") move(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [light, move]);

  const cur = light ? light.list[light.at] : null;
  const earlier = useMemo(() => old.filter((t) => t.id !== tid).slice(0, 30).reverse(), [old, tid]);

  return (
    <>
      {bar ? (
        <div
          ref={barRef}
          className="sa-bar"
          style={{ left: bar.x, top: Math.max(8, bar.y - 46), transform: "translateX(-50%)", maxWidth: "calc(100vw - 16px)", boxSizing: "border-box", flexWrap: "wrap" }}
          // mousedown par selection gir jati hai — isliye button ke click se
          // pehle hi default roko, warna `bar.text` khaali ho jata.
          onMouseDown={(e) => e.preventDefault()}
        >
          <button type="button" onClick={() => openPanel(bar.text, true)}>💬 Poochho</button>
          {/* Sirf tasveer chahiye to AI ko bulane ki zaroorat nahi — isliye
              yahan wo apne aap wala sawaal nahi jata. */}
          <button type="button" onClick={() => { openPanel(bar.text, false); setImgWanted(bar.text); }}>🖼 Tasveer</button>
          <button
            type="button"
            onClick={() => {
              // Bina await ke — click ka apna "user ne dabaya" wala haq isi
              // pal tak rehta hai.
              window.open("https://www.google.com/search?q=" + encodeURIComponent(bar.text), "_blank", "noopener");
              setBar(null);
            }}
          >🔍 Google</button>
          {/* 📝 Seedha One-liners page par — subject ek click mein poochhte
              hain, phir line apni jagah chali jati hai. */}
          <button type="button" onClick={() => { setOlText(bar.text); setBar(null); }}>📝 One-liner</button>
          {/* 🪔 Statics ki poori jaankari — prompt + shabd copy, Gemini naya tab,
              aur yahin paste ka popup (components/StaticsInfo). */}
          <button type="button" onClick={() => { askGeminiStatics(bar.text); setSiTerm(bar.text); setBar(null); }}>🪔 Festival</button>
          <button
            type="button"
            onClick={() => {
              try { navigator.clipboard?.writeText(bar.text); } catch { /* ignore */ }
              setBar(null);
            }}
          >📋 Copy</button>
        </div>
      ) : null}

      {olText ? <OlPick text={olText} onClose={() => setOlText("")} /> : null}
      {siTerm ? <StaticsPaste term={siTerm} onClose={() => setSiTerm("")} /> : null}

      {/* Hamesha maujood — kuch select kiye bina bhi kuch bhi poochh sakte ho. */}
      {!open ? (
        <button type="button" className="sa-reopen" onClick={showPanel} title="Poochho">💬</button>
      ) : null}

      {open ? (
        <aside className="sa-panel">
          <div className="sa-head">
            <span className="sa-head__t">💬 Poochho</span>
            <span style={{ flex: 1 }} />
            <select value={subject} onChange={(e) => setSubject(e.target.value)} title="Subject">
              {SUBJECTS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
            </select>
            <button type="button" className="sa-x" onClick={fresh} title="Kuch bhi poochho — topic se alag">➕</button>
            <button type="button" className="sa-x" onClick={closePanel} title="Band karo">✕</button>
          </div>

          <div className="sa-msgs" ref={msgsRef}>
            {/* Purani baatcheet upar, ek ke neeche ek (sabse purani sabse
                upar) — scroll karke wapas padh lo. Latest sabse neeche. */}
            {earlier.map((t) => (
              <div key={t.id} className="sa-thread">
                {t.sel ? <div className="sa-quote is-clip sa-quote--old" title={t.sel}>{t.sel}</div> : null}
                {(t.msgs || []).map((m, i) => (
                  m.role === "user" ? (
                    <div key={i} className="sa-msg sa-msg--me">{m.text}</div>
                  ) : (
                    <div key={i}>
                      {m.role === "assistant" ? <div className="sa-msg sa-msg--ai"><Markdown>{m.text}</Markdown></div> : null}
                      {m.role === "assistant" ? <ClusterButton md={m.text} subject={t.subject || "gs"} srcQ={m.q} /> : null}
                      {m.role === "assistant" && m.q && !m.pending ? (
                        <button type="button" className="sa-setdef" onClick={() => { putAns(m.q, m.text); setSetAsDef(m.mid); }}>
                          {setAsDef === m.mid ? "✓ Is question ka jawab ban gaya" : "⭐ Is question ka jawab bana do"}
                          <span className="sa-setdef__q"> · {sprintQText(m.q).replace(/^\[[^\]]*\]\s*/, "").slice(0, 40)}…</span>
                        </button>
                      ) : null}

                      <Strip m={m} onOpen={openLight} />
                    </div>
                  )
                ))}
              </div>
            ))}
            {earlier.length > 0 && (sel || msgs.length) ? <div className="sa-sep">— naya —</div> : null}
            {sel ? (
              <div
                className={`sa-quote${full ? "" : " is-clip"}`}
                onClick={() => setFull((v) => !v)}
                title={full ? "chhota karo" : "poora dekho"}
              >
                {sel}
              </div>
            ) : null}
            {msgs.length === 0 && !busy ? (
              <div className="sa-note">
                {sel
                  ? "Isi text ke baare mein jo poochhna hai, neeche likho."
                  : "Jo bhi poochhna hai, neeche likho — kisi bhi topic par."}
              </div>
            ) : null}
            {msgs.map((m, i) => (
              m.role === "user" ? (
                <div key={i} className="sa-msg sa-msg--me">{m.text}</div>
              ) : (
                <div key={i}>
                  {m.role === "assistant" && m.pending ? (
                    <div className="sa-note">🐋 {msgs.findIndex((x) => x.pending) === i ? "soch raha hai…" : "line mein — pehle wale ke baad"}</div>
                  ) : null}
                  {m.role === "assistant" && !m.pending ? (
                    <div className="sa-msg sa-msg--ai"><Markdown>{m.text}</Markdown></div>
                  ) : null}
                  {/* 🧩 Jawab mein cluster ho to seedha Fact log mein. */}
                  {m.role === "assistant" && !m.pending && !m.err ? <ClusterButton md={m.text} subject={subject || "gs"} srcQ={m.q} /> : null}
                  {/* ⭐ Jis question par poochha tha USI par — m.q (us waqt ka). */}
                  {m.role === "assistant" && !m.pending && !m.err && (m.q || sq) ? (
                    <button
                      type="button"
                      className="sa-setdef"
                      title={`Is question par lagega: ${sprintQText(m.q || sq).slice(0, 80)}`}
                      onClick={() => { putAns(m.q || sq, m.text); setSetAsDef(m.mid || i); }}
                    >
                      {setAsDef === (m.mid || i) ? "✓ Is question ka jawab ban gaya" : "⭐ Is question ka jawab bana do"}
                      {m.q ? <span className="sa-setdef__q"> · {sprintQText(m.q).replace(/^\[[^\]]*\]\s*/, "").slice(0, 40)}…</span> : null}
                    </button>
                  ) : null}
                  <Strip m={m} onOpen={openLight} />
                </div>
              )
            ))}
            {queued > 1 ? <div className="sa-note">🐋 {queued} sawaal line mein — ek-ek karke ban rahe hain</div> : null}
            {err ? <div className="sa-err">⚠️ {err}</div> : null}
          </div>

          <div className="sa-foot">
            <textarea
              ref={boxRef}
              rows={2}
              value={q}
              placeholder={sel ? "Sawaal likho… (Enter = bhejo)" : "Kuch bhi poochho… (Enter = bhejo)"}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
              }}
            />
            <button type="button" className="sa-send" onClick={send} disabled={!q.trim()}>
              Bhejo
            </button>
          </div>
        </aside>
      ) : null}

      {/* Badi tasveer — wahin, nayi tab nahi. */}
      {cur ? (
        <div className="sa-light" onClick={() => setLight(null)}>
          <img src={cur.big || cur.full} alt={cur.title} onClick={(e) => e.stopPropagation()} />
          <div className="sa-light__bar" onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => move(-1)} disabled={light.list.length < 2}>‹</button>
            <span className="sa-light__n">{light.at + 1}/{light.list.length}</span>
            <button type="button" onClick={() => move(1)} disabled={light.list.length < 2}>›</button>
            <a href={cur.page || cur.full} target="_blank" rel="noreferrer">Wikipedia</a>
            <button type="button" onClick={() => setLight(null)}>✕</button>
          </div>
          <div className="sa-light__t" onClick={(e) => e.stopPropagation()}>{cur.title}</div>
        </div>
      ) : null}
    </>
  );
}
