"use client";

import { useEffect, useState } from "react";
import { getSavedShortcut, saveShortcutFor, clearSavedShortcut, tidyAnswer } from "@/lib/shortcuts";
import { keyFor } from "@/lib/qstats";
import Markdown from "./Markdown";

// Paste an answer you got from Gemini (or anywhere) and save it as THIS question's
// shortcut / explanation. Reuses the shortcut store, so it also shows up under the
// ⚡ Shortcut trick button and syncs across devices.
export default function PasteAnswer({ q }) {
  const [saved, setSaved] = useState("");
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [show, setShow] = useState(false);

  useEffect(() => { setSaved(getSavedShortcut(q)); }, [q]);

  // Pressing the ✨ Gemini button for THIS question opens the paste box right away.
  useEffect(() => {
    const onAsked = (e) => {
      if (e.detail?.key && e.detail.key === keyFor(q)) { setText(getSavedShortcut(q) || ""); setOpen(true); }
    };
    window.addEventListener("cgl:gemini-asked", onAsked);
    return () => window.removeEventListener("cgl:gemini-asked", onAsked);
  }, [q]);

  const startEdit = () => { setText(saved || ""); setOpen(true); };
  const save = () => {
    // Same tidy the store applies, so what shows now matches what comes back.
    const t = tidyAnswer(text.trim());
    if (!t) return;
    saveShortcutFor(q, t);
    setSaved(t); setOpen(false); setShow(true);
  };
  const clear = () => { if (confirm("Saved answer hata du?")) { clearSavedShortcut(q); setSaved(""); setShow(false); } };
  const pasteClip = async () => {
    try { const t = await navigator.clipboard.readText(); if (t) setText((p) => (p ? p + "\n" + t : t)); }
    catch { /* clipboard blocked — user can Ctrl+V */ }
  };

  if (open) {
    return (
      <div className="answer-box mt-8">
        <span className="vd-label">📥 Gemini ka answer yahan paste karo</span>
        <textarea className="textarea" rows={5} style={{ marginTop: 8, width: "100%" }} value={text}
          onChange={(e) => setText(e.target.value)} autoFocus
          placeholder="Gemini se copy karke yahan paste (Ctrl+V) karo — ye is question ka shortcut / explanation ban jayega." />
        <div className="row mt-8" style={{ gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn--primary btn--sm" onClick={save} disabled={!text.trim()}>💾 Save</button>
          <button className="btn btn--ghost btn--sm" onClick={pasteClip}>📋 Paste from clipboard</button>
          <button className="btn btn--ghost btn--sm" onClick={() => setOpen(false)}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      {saved ? (
        <div className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button className="btn btn--ghost btn--sm" onClick={() => setShow((v) => !v)}>{show ? "▲ Hide answer" : "⚡ Saved answer"}</button>
          <button className="btn btn--ghost btn--sm" onClick={startEdit}>✏️ Edit</button>
          <button className="btn btn--ghost btn--sm" onClick={clear} title="Remove">🗑️</button>
        </div>
      ) : (
        <button className="btn btn--ghost btn--sm" onClick={startEdit} title="Gemini ka answer paste karke save karo">📥 Paste answer</button>
      )}
      {saved && show && <div className="answer-box mt-8"><Markdown>{saved}</Markdown></div>}
    </div>
  );
}
