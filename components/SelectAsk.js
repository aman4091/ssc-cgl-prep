"use client";

// 💬 Site par kahin bhi text select karo — chaar cheezein saamne aa jaati hain:
//
//   💬 Poochho   — dayein taraf panel khulta hai, usi text par baatcheet
//   🖼 Tasveer   — Wikipedia/Commons se photo, usi panel mein (muft, bina key)
//   🔍 Google    — nayi tab mein google.com par wahi text
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
//
// Do baatein jaan-boojh kar aisi hain:
//   • Google wala button CLICK ke andar hi window.open karta hai. Kisi await
//     ke BAAD kholte to browser use popup maan kar chup-chaap rok deta.
//   • Panel ke BAHAR click karne par wo chhup jata hai, par baatcheet mitti
//     nahi — dayein kinare par 💬 wala chhota button use wapas le aata hai.

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import "@/app/selectask.css";
import Markdown from "./Markdown";
import { termsOf } from "./AskWords";
import { askSelection } from "@/lib/client-ai";
import { searchImages } from "@/lib/webimages";
import { getThreads, saveThread, newThreadId } from "@/lib/asklog";

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

export default function SelectAsk() {
  const path = usePathname();
  const [bar, setBar] = useState(null);      // { text, x, y }
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
  const [at, setAt] = useState(-1);          // -1 = chalu, 0.. = purana

  const msgsRef = useRef(null);
  const boxRef = useRef(null);

  // ── selection ki patti ─────────────────────────────────────────────────
  const read = useCallback(() => {
    const s = typeof window !== "undefined" ? window.getSelection() : null;
    const text = s ? String(s).trim() : "";
    if (!s || !text || text.length < 2 || s.rangeCount === 0 || insideOwn(s.anchorNode)) { setBar(null); return; }
    const r = s.getRangeAt(0).getBoundingClientRect();
    if (!r || (!r.width && !r.height)) { setBar(null); return; }
    setBar({
      text,
      x: Math.min(Math.max(8, r.left + r.width / 2), window.innerWidth - 8),
      y: r.top,
    });
  }, []);

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
    if (!open) return undefined;
    const onDown = (e) => { if (!light && !insideOwn(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open, light]);

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
  }, [msgs, busy]);

  useEffect(() => { setOld(getThreads()); }, []);

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
    setSubject(subjectFromPath(path));
    setMsgs([]);
    setAt(-1);
    setErr("");
    setQ("");
    setFull(false);
    setAutoQ(auto ? AUTO_Q : "");
    setOpen(true);
    setBar(null);
    setTimeout(() => boxRef.current?.focus(), 60);
  }, [path]);

  // 🔎 AskWords: kisi naam par click → wahi panel, jawab bhi aur tasveer bhi.
  useEffect(() => {
    const h = (e) => {
      const text = String((e.detail && e.detail.text) || "").trim();
      if (!text) return;
      openPanel(text, true);
    };
    window.addEventListener("cgl:ask-term", h);
    return () => window.removeEventListener("cgl:ask-term", h);
  }, [openPanel]);

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
  const runAsk = useCallback(async (text) => {
    if (!text || busy) return;
    const history = msgs;
    setMsgs((m) => [...m, { role: "user", text }]);
    setErr("");
    setBusy(true);
    let answer = "";
    try {
      const r = await askSelection({ selection: sel, question: text, subject, history });
      answer = r.answer;
    } catch (e) {
      setErr(e.message);
      setBusy(false);
      return;
    }
    setBusy(false);
    setMsgs((m) => {
      const next = [...m, { role: "assistant", text: answer }];
      // Apne aap wale sawaal ("Isko samjhao…") mein koi naam hota hi nahi —
      // uske liye seedha wahi text jo chuna gaya tha.
      setTimeout(() => fetchImgs(next.length - 1, imageQueryFor(text === AUTO_Q ? "" : text, sel)), 0);
      return next;
    });
  }, [busy, msgs, sel, subject, fetchImgs]);

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

  // ── purani baatcheet ───────────────────────────────────────────────────
  const goto = useCallback((n) => {
    if (n < -1 || n >= old.length) return;
    setAt(n);
    if (n === -1) return;
    const t = old[n];
    setTid(t.id);
    setSel(t.sel || "");
    setSubject(t.subject || "");
    setMsgs(Array.isArray(t.msgs) ? t.msgs : []);
    setErr("");
    setFull(false);
  }, [old]);

  // ➕ topic se hatt kar kuch bhi.
  const fresh = useCallback(() => {
    setTid(newThreadId());
    setSel("");
    setSubject(subjectFromPath(path));
    setMsgs([]);
    setAt(-1);
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

  return (
    <>
      {bar ? (
        <div
          className="sa-bar"
          style={{ left: bar.x, top: Math.max(8, bar.y - 46), transform: "translateX(-50%)" }}
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
          <button
            type="button"
            onClick={() => {
              try { navigator.clipboard?.writeText(bar.text); } catch { /* ignore */ }
              setBar(null);
            }}
          >📋 Copy</button>
        </div>
      ) : null}

      {/* Hamesha maujood — kuch select kiye bina bhi kuch bhi poochh sakte ho. */}
      {!open ? (
        <button type="button" className="sa-reopen" onClick={() => setOpen(true)} title="Poochho">💬</button>
      ) : null}

      {open ? (
        <aside className="sa-panel">
          <div className="sa-head">
            <button type="button" className="sa-x" onClick={() => goto(at + 1)} disabled={at + 1 >= old.length} title="purani baat">‹</button>
            <span className="sa-head__t">
              {at === -1 ? "💬 Poochho" : `${at + 1}/${old.length} · purani`}
            </span>
            <button type="button" className="sa-x" onClick={() => goto(at - 1)} disabled={at <= -1} title="nayi baat">›</button>
            <span style={{ flex: 1 }} />
            <select value={subject} onChange={(e) => setSubject(e.target.value)} title="Subject">
              {SUBJECTS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
            </select>
            <button type="button" className="sa-x" onClick={fresh} title="Kuch bhi poochho — topic se alag">➕</button>
            <button type="button" className="sa-x" onClick={() => setOpen(false)}>✕</button>
          </div>

          {sel ? (
            <div
              className={`sa-quote${full ? "" : " is-clip"}`}
              onClick={() => setFull((v) => !v)}
              title={full ? "chhota karo" : "poora dekho"}
            >
              {sel}
            </div>
          ) : null}

          <div className="sa-msgs" ref={msgsRef}>
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
                  {m.role === "assistant" ? (
                    <div className="sa-msg sa-msg--ai"><Markdown>{m.text}</Markdown></div>
                  ) : null}
                  <Strip m={m} onOpen={openLight} />
                </div>
              )
            ))}
            {busy ? <div className="sa-note">🐋 soch raha hai…</div> : null}
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
            <button type="button" className="sa-send" onClick={send} disabled={busy || !q.trim()}>
              {busy ? "…" : "Bhejo"}
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
