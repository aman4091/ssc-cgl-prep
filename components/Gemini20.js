"use client";

// 🎯 5 similar — tasveer wale (Maths / Reasoning) question ke liye.
//
//   1. Button → question ki TASVEER clipboard par + Gemini naye tab mein.
//   2. Gemini mein tasveer paste karo, site par wapas aao → prompt ("is
//      tasveer wale question ko padh kar likh do") apne aap copy ho jata hai
//      (lib/geminiask armPrompt), wo Gemini mein paste karke bhejo.
//   3. Gemini ka likha hua question yahan paste → 🐋 DeepSeek PEECHHE us
//      jaise 5 naye banata hai → sab /similar page par jama, mila-jula
//      (lib/simpool). Yahan se kahin jaana nahi padta.
//
// Tasveer hi na ho to question ka apna text seedha line mein; text bhi na ho
// to `onDirect`.

import { useState } from "react";
import { createPortal } from "react-dom";
import { questionImage, copyQuestionImage, armPrompt, toast } from "@/lib/geminiask";
import { addSimilar, SIM_PER } from "@/lib/simpool";

const GEMINI = "https://gemini.google.com/app";

export const OCR_PROMPT = `Is image mein ek SSC exam ka question hai. Ise dhyan se padh kar mujhe sirf TEXT mein likh do:
- poora question jaise-ka-taisa
- saare options (A), (B), (C), (D) alag-alag line par
- maths ke symbols saaf likhna (jaise 3/4, √2, x², π, ∠ABC, %)
- figure / table ho to use shabdon mein samjha do
Solution ya jawab bilkul mat dena — sirf question aur options.`;

async function copyText(t) {
  try { await navigator.clipboard.writeText(t); return true; } catch { return false; }
}

// Question ka apna text (options samet) — tasveer na ho tab ke liye.
function textOf(q) {
  const t = String(q?.question || "").trim();
  if (!t) return "";
  const opts = (q.options || []).map((o, i) => `(${String.fromCharCode(65 + i)}) ${o}`).join("\n");
  return `${t}\n${opts}`.trim();
}

export default function Gemini20({ q, subject, onDirect, className = "btn btn--sm q-act--keep", label = `🎯 ${SIM_PER}` }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const busy = false;
  const [err, setErr] = useState("");

  const go = async () => {
    if (!questionImage(q)) {
      const t = textOf(q);
      if (!t) { onDirect?.(); return; }
      addSimilar(t, subject);
      toast(`🐋 Iske jaise ${SIM_PER} peechhe ban rahe hain — 🎯 Similar page par milenge`);
      return;
    }
    const ok = await copyQuestionImage(q);
    armPrompt(OCR_PROMPT);
    toast(ok
      ? "🖼️ Image copy ho gayi — Gemini mein paste karo; yahan wapas aate hi prompt apne aap copy ho jayega"
      : "Image copy nahi ho payi — Gemini mein question ka screenshot khud daalo; yahan wapas aate hi prompt copy ho jayega");
    try { window.open(GEMINI, "_blank", "noopener,noreferrer"); } catch { /* ignore */ }
    setErr(""); setText(""); setOpen(true);
  };

  const make = () => {
    setErr("");
    try {
      addSimilar(text, subject);
      setOpen(false);
      toast(`🐋 Iske jaise ${SIM_PER} peechhe ban rahe hain — 🎯 Similar page par milenge`);
    } catch (e) { setErr(e.message || "Nahi hua — dobara try karo"); }
  };

  return (
    <>
      <button type="button" className={className} onClick={go} title="Image copy + Gemini → likha hua question yahan paste → peechhe 5 similar, 🎯 Similar page par">
        {label}
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <div className="si-ov" onClick={() => !busy && setOpen(false)}>
          <div className="si-box" onClick={(e) => e.stopPropagation()}>
            <div className="si-hd">
              <b>🎯 {SIM_PER} similar — Gemini ka likha hua question</b>
              <button type="button" className="si-x" onClick={() => setOpen(false)} disabled={busy} aria-label="Band karo">✕</button>
            </div>
            <p className="si-hint">
              Gemini mein image paste karo → yahan wapas aate hi prompt copy ho jayega, wo bhi Gemini mein paste karke bhejo → jo question wo likhe, yahan paste karo.
            </p>
            <textarea
              className="si-ta"
              rows={9}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Gemini ka likha hua question + options yahan paste karo…"
              autoFocus
            />
            {err ? <p className="si-hint" style={{ color: "var(--danger)" }}>{err}</p> : null}
            <div className="si-row">
              <button type="button" className="btn btn--primary btn--sm" disabled={!text.trim() || busy} onClick={make}>
                🐋 {SIM_PER} similar banao
              </button>
              <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={async () => { if (await copyText(OCR_PROMPT)) toast("📋 Prompt copy ho gaya"); }}>📋 Prompt copy</button>
              <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={async () => { if (await copyQuestionImage(q)) toast("🖼️ Image phir copy ho gayi"); }}>🖼️ Image phir copy</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
