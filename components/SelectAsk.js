"use client";

// 💬 Site par kahin bhi text select karo — teen cheezein saamne aa jaati hain:
//
//   💬 Poochho   — dayein taraf panel khulta hai, usi text par baatcheet
//   🖼 Tasveer   — Wikipedia/Commons se photo, usi panel mein (muft, bina key)
//   🔍 Google    — nayi tab mein google.com par wahi text
//   📋 Copy      — clipboard mein
//
// AI ke paas tasveer nahi hoti — wo sirf likhta hai. Isliye photo Wikipedia
// se aati hai; wahan ka API muft hai aur browser se seedha chalta hai.
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
//   • Panel ke BAHAR click karne par wo chhup jata hai, par baatcheet mitti
//     nahi — dayein kinare par 💬 wala chhota button use wapas le aata hai.

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import "@/app/selectask.css";
import Markdown from "./Markdown";
import { askSelection } from "@/lib/client-ai";
import { searchImages } from "@/lib/webimages";

// 💬 Poochho dabate hi yahi sawaal apne aap chala jata hai — pehle kuch
// likhna nahi padta. Uske baad jo poochhna ho, wahi panel mein poochho.
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
  const [imgs, setImgs] = useState(null);    // null = abhi maange nahi
  const [imgBusy, setImgBusy] = useState(false);
  const [imgErr, setImgErr] = useState("");
  // 🖼 button se panel khula ho to tasveer apne aap maang lete hain —
  // openPanel state reset karta hai, isliye kaam uske BAAD hona chahiye.
  const [imgWanted, setImgWanted] = useState("");
  const [autoQ, setAutoQ] = useState("");
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

  // Panel ke bahar click → chhup jao. Patti khud alag hai (uspar click karke
  // hi panel khulta hai), isliye use chhoda hua hai. `mousedown` isliye ki
  // text select karte waqt bhi panel raaste se hat jaye.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (!insideOwn(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  // Naya jawab aaya → neeche tak scroll.
  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight;
  }, [msgs, busy]);

  const openPanel = useCallback((text, auto) => {
    setSel(text);
    setSubject(subjectFromPath(path));
    setMsgs([]);
    setErr("");
    setQ("");
    setFull(false);
    setImgs(null);
    setImgErr("");
    setAutoQ(auto ? AUTO_Q : "");
    setOpen(true);
    setBar(null);
    setTimeout(() => boxRef.current?.focus(), 60);
  }, [path]);

  const loadImgs = useCallback(async () => {
    if (imgBusy) return;
    setImgBusy(true);
    setImgErr("");
    try {
      const list = await searchImages(sel);
      setImgs(list);
      if (!list.length) setImgErr("Is naam par Wikipedia par koi tasveer nahi mili. 🔍 Google dabao.");
    } catch (e) {
      setImgs([]);
      setImgErr(e.message);
    } finally { setImgBusy(false); }
  }, [sel, imgBusy]);

  // 🖼 button se aaye ho to panel khulte hi tasveer maang lo.
  useEffect(() => {
    if (!open || !imgWanted || imgWanted !== sel) return;
    setImgWanted("");
    loadImgs();
  }, [open, imgWanted, sel, loadImgs]);

  const runAsk = useCallback(async (text) => {
    if (!text || busy) return;
    const history = msgs;
    setMsgs((m) => [...m, { role: "user", text }]);
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
  }, [busy, msgs, sel, subject]);

  const send = useCallback(() => {
    const text = q.trim();
    if (!text) return;
    setQ("");
    runAsk(text);
  }, [q, runAsk]);

  // Panel 💬 se khula ho to pehla sawaal apne aap chala jata hai.
  useEffect(() => {
    if (!open || !autoQ) return;
    const t = autoQ;
    setAutoQ("");
    runAsk(t);
  }, [open, autoQ, runAsk]);

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
          {/* Panel wahi khulta hai — bas tasveer bhi maang leta hai. */}
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

      {/* Chhupa hua panel — baatcheet waise ki waise pari hai. */}
      {!open && sel ? (
        <button
          type="button"
          className="sa-reopen"
          onClick={() => setOpen(true)}
          title="Poochho wala panel wapas kholo"
        >💬</button>
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

          <div className="sa-imgrow">
            <button type="button" className="sa-imgbtn" onClick={loadImgs} disabled={imgBusy}>
              {imgBusy ? "🖼 dhoondh raha hai…" : imgs ? "🖼 dobara dhoondho" : "🖼 Tasveer dikhao"}
            </button>
            {/* AI ke paas tasveer nahi hoti; Wikipedia par na mile to Google
                Images hi aakhri raasta hai. */}
            <button
              type="button"
              className="sa-imgbtn"
              onClick={() => window.open("https://www.google.com/search?tbm=isch&q=" + encodeURIComponent(sel), "_blank", "noopener")}
            >🔍 Google Images</button>
          </div>

          {imgErr ? <div className="sa-err" style={{ padding: "0 12px 8px" }}>{imgErr}</div> : null}

          {imgs && imgs.length ? (
            <div className="sa-imgs">
              {imgs.map((im) => (
                <a key={im.full} href={im.page || im.full} target="_blank" rel="noreferrer" title={im.title}>
                  <img src={im.thumb} alt={im.title} loading="lazy" />
                </a>
              ))}
            </div>
          ) : null}

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
