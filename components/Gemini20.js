"use client";

// 🎯 20 similar — tasveer wale (Maths / Reasoning) question ke liye.
//
//   1. Button → question ki TASVEER clipboard par + Gemini naye tab mein.
//   2. Gemini mein tasveer paste karo, site par wapas aao → prompt ("is
//      tasveer wale question ko padh kar likh do") apne aap copy ho jata hai
//      (lib/geminiask armPrompt), wo Gemini mein paste karke bhejo.
//   3. Gemini ka likha hua question yahan paste → 🐋 DeepSeek 20 similar
//      banata hai (lib/similar) → quiz khulta hai.
//
// Tasveer na ho, ya browser tasveer copy na kar paye, to `onDirect` — card ka
// purana seedha 🎯 20.

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { questionImage, copyQuestionImage, armPrompt, toast } from "@/lib/geminiask";
import { makeSimilarQuiz } from "@/lib/similar";

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

export default function Gemini20({ q, subject, onDirect, className = "btn btn--sm q-act--keep", label = "🎯 20" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const go = async () => {
    if (!questionImage(q)) { onDirect?.(); return; }
    const ok = await copyQuestionImage(q);
    if (!ok) { onDirect?.(); return; }
    armPrompt(OCR_PROMPT);
    toast("🖼️ Image copy ho gayi — Gemini mein paste karo; yahan wapas aate hi prompt apne aap copy ho jayega");
    try { window.open(GEMINI, "_blank", "noopener,noreferrer"); } catch { /* ignore */ }
    setErr(""); setText(""); setOpen(true);
  };

  const make = async () => {
    setBusy(true); setErr("");
    try {
      const id = await makeSimilarQuiz({ question: text, options: [] }, subject, "Similar (20)");
      setOpen(false);
      router.push(`/quizzes/${id}`);
    } catch (e) { setErr(e.message || "Nahi bana — dobara try karo"); }
    finally { setBusy(false); }
  };

  return (
    <>
      <button type="button" className={className} onClick={go} title="Image copy + Gemini → likha hua question yahan paste → DeepSeek 20 similar">
        {label}
      </button>
      {open && typeof document !== "undefined" && createPortal(
        <div className="si-ov" onClick={() => !busy && setOpen(false)}>
          <div className="si-box" onClick={(e) => e.stopPropagation()}>
            <div className="si-hd">
              <b>🎯 20 similar — Gemini ka likha hua question</b>
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
                {busy ? "🐋 ban rahe hain…" : "🐋 20 similar banao"}
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
