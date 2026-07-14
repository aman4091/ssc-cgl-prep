"use client";

import { useState } from "react";
import { addEntryQuestions, addEntryNotes, addEntryPdfMeta } from "@/lib/feed";
import { extractPdfTextSmart, generateQuizText, extractNotesChunked, readImageText } from "@/lib/client-ai";
import { saveFile } from "@/lib/filestore";
import { getSettings } from "@/lib/storage";

// Add-content controls for a single feed entry (PDF / image / paste -> questions,
// plus important-notes for Current Affairs). Used on the entry detail page so an
// entry can be filled after it's created. Mirrors the logic FeedEntry uses inline.
export default function FeedUploader({ entry, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const isCA = entry.feed === "current";

  const requireKey = () => {
    if (!getSettings().apiKey) { setError("Add your DeepSeek API key in Settings first."); return false; }
    return true;
  };

  const handlePdf = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !requireKey()) return;
    setBusy(true); setError(""); setStatus("PDF save ho rahi hai…");
    try {
      const pid = addEntryPdfMeta(entry.id, file.name);
      await saveFile(pid, file);
      setStatus("PDF padhi ja rahi hai…");
      const { text } = await extractPdfTextSmart(file, (p) => {
        if (p.phase === "text") setStatus(`Reading PDF… page ${p.page}/${p.total}`);
        else setStatus(`📷 Scanned PDF — running OCR… page ${p.page}/${p.total}`);
      });
      if (!text || text.trim().length < 20) throw new Error("Couldn't extract text from this PDF.");
      setStatus("Generating questions…");
      const { questions: qs } = await generateQuizText(text);
      const n = addEntryQuestions(entry.id, qs);
      let nn = 0;
      if (isCA) {
        setStatus("📌 Extracting important notes/facts…");
        try {
          const { notes } = await extractNotesChunked(text, (i, t, so) =>
            setStatus(`📌 Extracting important notes — part ${i}/${t} (so far ${so})…`));
          nn = addEntryNotes(entry.id, notes);
        } catch (err) { console.warn("notes failed", err); }
      }
      setStatus(`Done! Added ${n} questions${isCA ? ` · ${nn} notes` : ""}. PDF saved too.`);
      onChanged && onChanged();
    } catch (err) { setError(err.message); setStatus(""); }
    finally { setBusy(false); }
  };

  const handleQuestionImages = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length || !requireKey()) return;
    setBusy(true); setError(""); setStatus("");
    try {
      let added = 0, notesAdded = 0;
      for (let i = 0; i < files.length; i++) {
        setStatus(`📷 Reading image ${i + 1}/${files.length}…`);
        let text = ""; try { const r = await readImageText(files[i]); text = r.text; } catch { /* skip */ }
        if (text && text.trim().length > 15) {
          setStatus(`Image ${i + 1}/${files.length}: generating questions…`);
          try { const { questions: qs } = await generateQuizText(text); added += addEntryQuestions(entry.id, qs); } catch (err) { console.warn(err); }
          if (isCA) {
            setStatus(`📌 Image ${i + 1}/${files.length}: extracting important notes…`);
            try { const { notes } = await extractNotesChunked(text); notesAdded += addEntryNotes(entry.id, notes); } catch (err) { console.warn(err); }
          }
        }
      }
      if (added === 0 && notesAdded === 0) throw new Error("Nothing could be extracted from these images.");
      setStatus(`Done! Added ${added} questions${isCA ? ` · ${notesAdded} notes` : ""}.`);
      onChanged && onChanged();
    } catch (err) { setError(err.message); setStatus(""); }
    finally { setBusy(false); }
  };

  const pasteImage = async () => {
    if (!requireKey()) return;
    try {
      if (!navigator.clipboard?.read) { setError("Paste button isn't supported — use Ctrl+V instead."); return; }
      const items = await navigator.clipboard.read();
      const files = [];
      for (const it of items) {
        const type = it.types.find((t) => t.startsWith("image/"));
        if (type) { const blob = await it.getType(type); files.push(new File([blob], "pasted.png", { type })); }
      }
      if (!files.length) { setError("No image found in the clipboard."); return; }
      await handleQuestionImages({ target: { files, value: "" } });
    } catch (err) { setError("Paste failed: " + err.message); }
  };

  return (
    <div className="glass-card">
      <h3>➕ Add questions{isCA ? " + notes" : ""}</h3>
      <p className="muted mt-8" style={{ fontSize: "0.85rem" }}>
        Is date ka PDF ya screenshot daalo — questions{isCA ? " aur important facts" : ""} apne aap nikal aayenge.
      </p>
      <div className="row mt-12" style={{ gap: 8, flexWrap: "wrap" }}>
        <label className="btn btn--primary btn--sm" style={{ opacity: busy ? 0.6 : 1, pointerEvents: busy ? "none" : "auto" }}>
          {isCA ? "📄 PDF → questions + notes" : "📄 PDF → questions"}
          <input type="file" accept="application/pdf" hidden onChange={handlePdf} />
        </label>
        <label className="btn btn--ghost btn--sm" style={{ opacity: busy ? 0.6 : 1, pointerEvents: busy ? "none" : "auto" }}>
          📷 {isCA ? "Image → questions + notes" : "Question image(s)"}
          <input type="file" accept="image/*" multiple hidden onChange={handleQuestionImages} />
        </label>
        <button className="btn btn--ghost btn--sm" onClick={pasteImage} disabled={busy}>📋 Paste image</button>
      </div>
      {status && <p className="mt-12" style={{ color: "var(--accent-2)", fontSize: "0.85rem" }}>{status}</p>}
      {error && <p className="mt-12" style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{error}</p>}
    </div>
  );
}
