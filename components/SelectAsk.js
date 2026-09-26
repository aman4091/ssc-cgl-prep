"use client";

// 💬 Site par kahin bhi text select karo — teen cheezein saamne aa jaati hain:
//
//   💬 Poochho   — dayein taraf panel khulta hai, usi text par baatcheet
//   🔍 Google    — nayi tab mein google.com par wahi text
//   📋 Copy      — clipboard mein
//
// Subject apne aap page ke pate se aa jata hai (Pinnacle Maths khula hai to
// Maths), par panel ke sar par uska chhota dropdown bhi hai — galat lage to
// wahin badal lo.
//
// Do baatein jaan-boojh kar aisi hain:
//   • Google wala button CLICK ke andar hi window.open karta hai. Kisi await
//     ke BAAD kholte to browser use popup maan kar chup-chaap rok deta.
//   • Patti selection ke upar tairti hai (fixed), aur scroll karte hi gayab —
//     warna wo apni purani jagah par chipki reh jati thi.

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import "@/app/selectask.css";
import Markdown from "./Markdown";
import { askSelection } from "@/lib/client-ai";

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

// Selection panel/patti ke andar se aayi hai? (Wahan ka select karna apna
// kaam hai — uspar dobara patti nahi aani chahiye.)
function insideOwn(node) {
  let el = node && (node.nodeType === 1 ? node : node.parentElement);
  while (el) {
    if (el.classList && (el.classList.contains("sa-panel") || el.classList.contains("sa-bar"))) return true;
    el = el.parentElement;
  }
  return false;
}

export default function SelectAsk() {
  const path = usePathname();
  const [bar, setBar] = useState(null);      // { text, x, y }
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState("");        // panel ke andar ka text (jama hua)
  const [subject, setSubject] = useState("");
  const [msgs, setMsgs] = useState([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [full, setFull] = useState(false);   // quote khula hai ya kata hua
  const msgsRef = useRef(null);
  const boxRef = useRef(null);

  // Selection badla → patti dikhao ya hatao.
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

  // Naya jawab aaya → neeche tak scroll.
  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
  }, [msgs, busy]);

  const openPanel = useCallback((text) => {
    setSel(text);
    setSubject(subjectFromPath(path));
    setMsgs([]);
    setErr("");
    setQ("");
    setFull(false);
    setOpen(true);
    setBar(null);
    setTimeout(() => boxRef.current?.focus(), 60);
  }, [path]);

  const send = useCallback(async () => {
    const text = q.trim();
    if (!text || busy) return;
    const history = msgs;
    setMsgs((m) => [...m, { role: "user", text }]);
    setQ("");
    setErr("");
    setBusy(true);
    try {
      const { answer } = await askSelection({ selection: sel, question: text, subject, history });
      setMsgs((m) => [...m, { role: "assistant", text: answer }]);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }, [q, busy, msgs, sel, subject]);

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
          <button type="button" onClick={() => openPanel(bar.text)}>💬 Poochho</button>
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

      {open ? (
        <aside className="sa-panel">
          <div className="sa-head">
            <span className="sa-head__t">💬 Poochho</span>
            <select value={subject} onChange={(e) => setSubject(e.target.value)} title="Subject">
              {SUBJECTS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
            </select>
            <button type="button" className="sa-x" onClick={() => setOpen(false)}>✕</button>
          </div>

          <div
            className={`sa-quote${full ? "" : " is-clip"}`}
            onClick={() => setFull((v) => !v)}
            title={full ? "chhota karo" : "poora dekho"}
          >
            {sel}
          </div>

          <div className="sa-msgs" ref={msgsRef}>
            {msgs.length === 0 && !busy ? (
              <div className="sa-note">Isi text ke baare mein jo poochhna hai, neeche likho.</div>
            ) : null}
            {msgs.map((m, i) => (
              m.role === "user"
                ? <div key={i} className="sa-msg sa-msg--me">{m.text}</div>
                : <div key={i} className="sa-msg sa-msg--ai"><Markdown>{m.text}</Markdown></div>
            ))}
            {busy ? <div className="sa-note">🐋 soch raha hai…</div> : null}
            {err ? <div className="sa-err">⚠️ {err}</div> : null}
          </div>

          <div className="sa-foot">
            <textarea
              ref={boxRef}
              rows={2}
              value={q}
              placeholder="Sawaal likho… (Enter = bhejo)"
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
    </>
  );
}
