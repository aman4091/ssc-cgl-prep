"use client";

import { useEffect, useState } from "react";
import Markdown from "./Markdown";
import { getSettings } from "@/lib/storage";
import { getSavedShortcut, saveShortcutFor, tidyAnswer } from "@/lib/shortcuts";
import { setDetail as setWrongDetail } from "@/lib/wrongbook";

// Flashcard ka Gemini-answer helper:
//  1) Settings ka prompt copy-paste ke liye dikhata (image questions mein clipboard
//     pe image hoti hai, prompt text alag se copy karna padta).
//  2) Answer paste box — Gemini se aaya answer paste karo, save karo.
//  3) Save: q/ca -> shortcut store (keyFor) so answer har jagah dikhe; Wrong-Book
//     image -> record ka detail (so /wrong bhi dikhaye). Agli baar reveal pe wahi.

export function savedAnswerOf(card) {
  if (!card) return "";
  if (card.kind === "wb") return card.ref?.detail || card.ref?.answer || "";
  if (card.ref) { try { return getSavedShortcut(card.ref) || ""; } catch { return ""; } }
  return "";
}

export default function FlashAnswer({ card, onSaved }) {
  const [saved, setSaved] = useState("");
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [showPrompt, setShowPrompt] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { setSaved(savedAnswerOf(card)); setOpen(false); setText(""); setShowPrompt(false); }, [card?.uid]);

  const st = getSettings();
  const perSub = String((st.shortcutPrompts || {})[card?.subject] || "").trim();
  const promptText = perSub || String(st.geminiPrompt || "").trim();

  const save = () => {
    const t = tidyAnswer(text.trim());
    if (!t) return;
    if (card.kind === "wb" && card.ref?.id) {
      try { setWrongDetail(card.ref.id, t); } catch { /* ignore */ }
      card.ref.detail = t; // is session mein turant dikhe
    } else if (card.ref) {
      try { saveShortcutFor(card.ref, t); } catch { /* ignore */ }
    }
    setSaved(t); setOpen(false);
    if (onSaved) onSaved(t);
  };

  const pasteClip = async () => {
    try { const t = await navigator.clipboard.readText(); if (t) setText((p) => (p ? p + "\n" + t : t)); }
    catch { /* clipboard blocked — user can Ctrl+V */ }
  };
  const copyPrompt = async () => {
    try { await navigator.clipboard.writeText(promptText); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch { /* ignore */ }
  };

  return (
    <div className="flash-answer mt-8">
      {promptText && (
        <>
          <button className="btn btn--ghost btn--sm" onClick={() => setShowPrompt((v) => !v)} title="Settings ka Gemini prompt — copy karke Gemini mein paste karo">
            📋 Prompt {showPrompt ? "▲" : "▼"}
          </button>
          {showPrompt && (
            <div className="answer-box mt-8">
              <p className="muted" style={{ whiteSpace: "pre-wrap", fontSize: "0.85rem", margin: 0 }}>{promptText}</p>
              <button className="btn btn--ghost btn--sm mt-8" onClick={copyPrompt}>{copied ? "✓ Copied" : "📋 Prompt copy"}</button>
            </div>
          )}
        </>
      )}

      {saved && !open && (
        <div className="answer-box mt-8">
          <span className="vd-label">✅ Saved answer</span>
          <div className="mt-8"><Markdown>{saved}</Markdown></div>
          <button className="btn btn--ghost btn--sm mt-8" onClick={() => { setText(saved); setOpen(true); }}>✏️ Badlo</button>
        </div>
      )}

      {!open ? (
        !saved && (
          <button className="btn btn--ghost btn--sm mt-8" onClick={() => { setText(""); setOpen(true); }}>
            📥 Answer paste karo
          </button>
        )
      ) : (
        <div className="answer-box mt-8">
          <span className="vd-label">📥 Gemini ka answer yahan paste karo</span>
          <textarea className="textarea" rows={5} style={{ marginTop: 8, width: "100%" }} value={text}
            onChange={(e) => setText(e.target.value)} autoFocus
            placeholder="Gemini se copy karke Ctrl+V — save karne pe agli baar yahi dikhega (Wrong-Book image ka answer /wrong mein bhi save ho jayega)." />
          <div className="row mt-8" style={{ gap: 8, flexWrap: "wrap" }}>
            <button className="btn btn--primary btn--sm" onClick={save} disabled={!text.trim()}>💾 Save</button>
            <button className="btn btn--ghost btn--sm" onClick={pasteClip}>📋 Paste from clipboard</button>
            <button className="btn btn--ghost btn--sm" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
