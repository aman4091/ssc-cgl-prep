"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  updateEntry, deleteEntry, addEntryQuestions, clearEntryQuestions,
  addEntryPdfMeta, removeEntryPdf,
} from "@/lib/feed";
import { extractPdfTextSmart, generateQuizText, ocrImage } from "@/lib/client-ai";
import { saveQuiz, makeId, getSettings } from "@/lib/storage";
import { saveFile, openFile } from "@/lib/filestore";
import YouTubePlayer from "@/components/YouTubePlayer";

export default function FeedEntry({ entry, onChanged }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [editVideo, setEditVideo] = useState(false);
  const [vUrl, setVUrl] = useState(entry.videoUrl || "");
  const [showVideo, setShowVideo] = useState(false);

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
      setStatus(`Done! Added ${n} questions. PDF saved too.`);
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
      let added = 0;
      for (let i = 0; i < files.length; i++) {
        setStatus(`📷 Running OCR on image ${i + 1}/${files.length}…`);
        let text = ""; try { text = await ocrImage(files[i]); } catch { /* skip */ }
        if (text && text.trim().length > 15) {
          setStatus(`Image ${i + 1}/${files.length}: generating questions…`);
          try { const { questions: qs } = await generateQuizText(text); added += addEntryQuestions(entry.id, qs); } catch (err) { console.warn(err); }
        }
      }
      if (added === 0) throw new Error("No questions could be created from these images.");
      setStatus(`Done! Added ${added} questions.`);
      onChanged && onChanged();
    } catch (err) { setError(err.message); setStatus(""); }
    finally { setBusy(false); }
  };

  // paste image(s) from clipboard into THIS entry
  const pasteImage = async () => {
    if (!requireKey()) return;
    try {
      if (!navigator.clipboard?.read) { setError("Paste button isn't supported in this browser — use Ctrl+V instead."); return; }
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

  const startQuiz = () => {
    if (!entry.questions?.length) { setError("Add questions first (from a PDF/image)."); return; }
    const label = entry.date || entry.title || "Quiz";
    const quiz = {
      id: makeId(), title: `${label} · Quiz`, source: `${entry.feed} · ${entry.bucket}`,
      createdAt: new Date().toISOString(), questions: entry.questions,
    };
    saveQuiz(quiz);
    router.push(`/quizzes/${quiz.id}`);
  };

  const saveVideo = () => { updateEntry(entry.id, { videoUrl: vUrl.trim() }); setEditVideo(false); onChanged && onChanged(); };
  const remove = async () => { if (confirm("Delete this entry?")) { await deleteEntry(entry.id); onChanged && onChanged(); } };
  const clearQ = () => { if (confirm("Remove all questions from this entry?")) { clearEntryQuestions(entry.id); onChanged && onChanged(); } };
  const delPdf = async (pid) => { if (confirm("Delete this PDF?")) { await removeEntryPdf(entry.id, pid); onChanged && onChanged(); } };
  const openPdf = async (pid) => { try { await openFile(pid); } catch (err) { setError(err.message); } };

  const heading = entry.date || entry.title || "Untitled";

  return (
    <article className="glass-card feed-entry">
      <div className="row between" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h3 style={{ fontSize: "1.1rem" }}>📅 {heading}</h3>
          {entry.title && entry.date && <p className="muted" style={{ fontSize: "0.85rem" }}>{entry.title}</p>}
          <p className="muted mt-8" style={{ fontSize: "0.8rem" }}>
            {entry.questions?.length || 0} questions{entry.videoUrl ? " · ▶ video" : ""}
          </p>
        </div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          {entry.questions?.length > 0 && <button className="btn btn--primary btn--sm" onClick={startQuiz}>🎯 Start Quiz ({entry.questions.length})</button>}
          <button className="btn btn--ghost btn--sm" onClick={remove}>✕</button>
        </div>
      </div>

      {/* Video */}
      <div className="mt-12">
        {entry.videoUrl ? (
          <>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn btn--ghost btn--sm" onClick={() => setShowVideo((v) => !v)}>{showVideo ? "▷ Hide video" : "▶ Watch video"}</button>
              <button className="btn btn--ghost btn--sm" onClick={() => setEditVideo((v) => !v)}>✏️ Edit link</button>
            </div>
            {showVideo && <div className="mt-12"><YouTubePlayer url={entry.videoUrl} /></div>}
          </>
        ) : (
          <button className="btn btn--ghost btn--sm" onClick={() => setEditVideo((v) => !v)}>▶ Add video link</button>
        )}
        {editVideo && (
          <div className="row mt-12" style={{ gap: 8, flexWrap: "wrap" }}>
            <input className="input" style={{ flex: 1, minWidth: 200 }} placeholder="YouTube URL" value={vUrl} onChange={(e) => setVUrl(e.target.value)} />
            <button className="btn btn--primary btn--sm" onClick={saveVideo}>Save</button>
          </div>
        )}
      </div>

      {/* Add questions */}
      <div className="row mt-12" style={{ gap: 8, flexWrap: "wrap" }}>
        <label className="btn btn--ghost btn--sm" style={{ opacity: busy ? 0.6 : 1, pointerEvents: busy ? "none" : "auto" }}>
          📄 PDF → questions
          <input type="file" accept="application/pdf" hidden onChange={handlePdf} />
        </label>
        <label className="btn btn--ghost btn--sm" style={{ opacity: busy ? 0.6 : 1, pointerEvents: busy ? "none" : "auto" }}>
          📷 Question image(s)
          <input type="file" accept="image/*" multiple hidden onChange={handleQuestionImages} />
        </label>
        <button className="btn btn--ghost btn--sm" onClick={pasteImage} disabled={busy}>📋 Paste image</button>
        {entry.questions?.length > 0 && <button className="btn btn--ghost btn--sm" onClick={clearQ}>Clear questions</button>}
      </div>

      {status && <p className="mt-12" style={{ color: "var(--accent-2)", fontSize: "0.85rem" }}>{status}</p>}
      {error && <p className="mt-12" style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{error}</p>}

      {entry.pdfs?.length > 0 && (
        <div className="mt-12" style={{ display: "grid", gap: 6 }}>
          {entry.pdfs.map((p) => (
            <div key={p.id} className="row between" style={{ background: "rgba(255,255,255,0.04)", padding: "6px 12px", borderRadius: 10 }}>
              <button className="link" onClick={() => openPdf(p.id)} style={{ textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📄 {p.name}</button>
              <button className="btn btn--ghost btn--sm" onClick={() => delPdf(p.id)}>✕</button>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
