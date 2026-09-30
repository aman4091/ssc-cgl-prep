"use client";

// 🪔 Statics ki poori jaankari — festival / tribe / dance / devta / mela …
//
//   1. Kuch bhi select karo → patti ka "🪔 Festival" → prompt + wo shabd copy,
//      Gemini naye tab mein, aur yahin site par paste karne ka popup.
//   2. Gemini ka jawab paste → 💾 Save → cgl.statics.info mein (sync hota hai).
//   3. Upar patti ka 🪔 button → saare saved ek-ek karke, ← → se.

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Markdown from "./Markdown";

export const STATICS_PROMPT = `Tum SSC CGL / CHSL ke Static GK (Art & Culture) ke expert teacher ho.
Neeche ek shabd diya hai — ye koi festival, tribe (janjati), folk/classical dance, devta/devi, mela, lok-geet, art form, instrument, temple ya koi aur static GK ki cheez ho sakti hai.
Iske baare mein EXAM ke hisaab se DETAIL mein batao — Hinglish mein, har point apni heading ke saath:

1. **Kya hai** — type (festival / tribe / dance / deity / …) + ek line mein parichay
2. **State / Region** — kis rajya / UT ka; district ya area bhi agar pata ho
3. **Tribe / Community** — kaun log manate / karte hain
4. **Kab** — kaunsa mahina / season / tithi (Hindu calendar + English mahina dono)
5. **God / Deity** — kis devta / devi se juda hai
6. **Meaning** — naam ka matlab
7. **Kyun / Story** — kyun manate hain, katha ya itihaas
8. **Kaise** — rituals, poshak, vadya yantra (instruments), khana
9. **Special facts** — UNESCO / GI tag / record / "sabse bada" / pehli baar / famous vyakti
10. **Confusion** — milte-julte naam jinse exam mein galti hoti hai (kaun kis rajya ka)
11. **SSC angle** — PYQ mein kaise poocha gaya ya poocha ja sakta hai (1–2 sample question)
12. **⚡ Yaad rakhne ki trick** — ek line

Jo point is cheez par lagu na ho, use chhod do. Koi bhi fact apni taraf se mat banao — pakka na ho to likho "pakka nahi".

Shabd:`;

const GEMINI = "https://gemini.google.com/app";
const KEY = "cgl.statics.info";

export function readInfo() {
  if (typeof window === "undefined") return [];
  try { const v = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
}
function writeInfo(v) {
  try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* quota */ }
  try { window.dispatchEvent(new CustomEvent("cgl:statics-info")); } catch { /* ignore */ }
}
export function saveInfo(term, text) {
  const t = String(term || "").trim();
  const all = readInfo().filter((x) => x.term.toLowerCase() !== t.toLowerCase());
  all.unshift({ id: `si_${Date.now().toString(36)}`, term: t, text: String(text || "").trim(), at: Date.now() });
  writeInfo(all);
}
export function removeInfo(id) { writeInfo(readInfo().filter((x) => x.id !== id)); }

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* fall through */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch { return false; }
}

// Patti ke button se: copy + Gemini — click ke usi pal (browser ka "user ne
// dabaya" wala haq tabhi tak rehta hai).
export function askGeminiStatics(term) {
  copyText(`${STATICS_PROMPT} ${String(term || "").trim()}`);
  try { window.open(GEMINI, "_blank", "noopener,noreferrer"); } catch { /* ignore */ }
}

// Gemini ka jawab yahan paste → Save → band.
export function StaticsPaste({ term, onClose }) {
  const [text, setText] = useState("");
  const [name, setName] = useState(term);
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="si-ov" onClick={onClose}>
      <div className="si-box" onClick={(e) => e.stopPropagation()}>
        <div className="si-hd">
          <b>🪔 Gemini ka jawab paste karo</b>
          <button type="button" className="si-x" onClick={onClose} aria-label="Band karo">✕</button>
        </div>
        <p className="si-hint">Prompt aur shabd copy ho gaye — Gemini ke naye tab mein paste karke bhejo, jawab yahan laao.</p>
        <input className="si-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Naam (festival / tribe / dance …)" />
        <textarea className="si-ta" rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder="Gemini ka jawab yahan paste karo…" autoFocus />
        <div className="si-row">
          <button type="button" className="btn btn--primary btn--sm" disabled={!text.trim() || !name.trim()} onClick={() => { saveInfo(name, text); onClose(); }}>💾 Save</button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => askGeminiStatics(name)}>✨ Gemini phir kholo</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// Upar patti ka 🪔 — saare saved ek-ek karke.
export function StaticsTopBtn() {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const load = useCallback(() => setList(readInfo()), []);
  useEffect(() => {
    load();
    window.addEventListener("cgl:statics-info", load);
    window.addEventListener("cgl:sync-applied", load);
    return () => { window.removeEventListener("cgl:statics-info", load); window.removeEventListener("cgl:sync-applied", load); };
  }, [load]);
  useEffect(() => {
    if (!open) return undefined;
    const k = (e) => {
      if (e.key === "Escape") setOpen(false);
      else if (e.key === "ArrowRight") setI((x) => Math.min(x + 1, list.length - 1));
      else if (e.key === "ArrowLeft") setI((x) => Math.max(x - 1, 0));
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, list.length]);
  if (!list.length) return null;
  const cur = list[Math.min(i, list.length - 1)];
  return (
    <>
      <button type="button" className="si-top" onClick={() => { setI(0); setOpen(true); }} title="Saved statics (festival / tribe / dance …)">
        🪔 <small>{list.length}</small>
      </button>
      {open && cur && createPortal(
        <div className="si-ov" onClick={() => setOpen(false)}>
          <div className="si-box si-box--view" onClick={(e) => e.stopPropagation()}>
            <div className="si-hd si-hd--view">
              <span className="si-n">{Math.min(i, list.length - 1) + 1}/{list.length}</span>
              <b className="si-title">🪔 {cur.term}</b>
              <button type="button" className="si-x" onClick={() => setOpen(false)} aria-label="Band karo">✕</button>
            </div>
            <div className="si-body"><Markdown>{cur.text}</Markdown></div>
            <div className="si-row si-row--stick">
              <button type="button" className="btn btn--ghost btn--sm" disabled={i <= 0} onClick={() => setI((x) => Math.max(0, x - 1))}>← Pichhla</button>
              <button type="button" className="btn btn--primary btn--sm" disabled={i >= list.length - 1} onClick={() => setI((x) => Math.min(list.length - 1, x + 1))}>Agla →</button>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                style={{ marginLeft: "auto" }}
                onClick={() => { if (window.confirm(`"${cur.term}" hata dein?`)) { removeInfo(cur.id); setI((x) => Math.max(0, x - 1)); } }}
              >🗑️</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
