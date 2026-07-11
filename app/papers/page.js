"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getQuizzes, saveQuiz, deleteQuiz, makeId, getSettings } from "@/lib/storage";
import { extractPdfTextSmart, generateQuizText } from "@/lib/client-ai";

export default function PapersPage() {
  const [papers, setPapers] = useState([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  const refresh = () => setPapers(getQuizzes().filter((q) => q.source === "paper"));
  useEffect(() => { refresh(); }, []);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    if (!getSettings().apiKey) { setError("Add your DeepSeek API key in Settings first."); return; }
    setBusy(true); setError(""); setStatus("Reading PDF…");
    try {
      const { text, ocr } = await extractPdfTextSmart(file, (p) => {
        if (p.phase === "text") setStatus(`Reading PDF… page ${p.page}/${p.total}`);
        else setStatus(`📷 Scanned paper — running OCR… page ${p.page}/${p.total}`);
      });
      if (!text || text.trim().length < 20) throw new Error("Couldn't extract text from this PDF. Try a better scan/PDF.");
      setStatus(`AI is building the full paper quiz…${ocr ? " (from OCR)" : ""} (this takes a moment)`);
      const data = await generateQuizText(text);
      const title = name.trim() || data.title || file.name.replace(/\.pdf$/i, "");
      const quiz = {
        id: makeId(), title, source: "paper",
        createdAt: new Date().toISOString(), questions: data.questions,
        timeLimitSec: 3600, // full CGL paper = 1 hour
      };
      saveQuiz(quiz);
      setName(""); refresh();
      setStatus(`Done! "${title}" — a paper with ${quiz.questions.length} questions is ready.`);
    } catch (err) { setError(err.message); setStatus(""); }
    finally { setBusy(false); }
  };

  const del = (id) => { deleteQuiz(id); refresh(); };

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <span className="hero__eyebrow">📄 Full Papers</span>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.7rem, 4vw, 2.6rem)" }}>
          SSC CGL <span className="grad">Papers</span>
        </h1>
        <p className="hero__sub">Upload a full paper PDF (year-wise) — AI turns it into a complete quiz. Attempt it in one sitting.</p>
      </section>

      <section className="section" style={{ marginTop: 16 }}>
        <div className="glass-card">
          <h3>➕ New paper (PDF)</h3>
          <div className="row mt-16" style={{ gap: 10, flexWrap: "wrap" }}>
            <input className="input" style={{ flex: 1, minWidth: 200 }} placeholder="Paper name — e.g. SSC CGL 2023 Tier-1 (Shift 1)"
              value={name} onChange={(e) => setName(e.target.value)} />
            <label className="btn btn--primary" style={{ opacity: busy ? 0.6 : 1, pointerEvents: busy ? "none" : "auto" }}>
              {busy ? "Working…" : "📄 Upload paper PDF"}
              <input ref={fileRef} type="file" accept="application/pdf" hidden onChange={handleFile} />
            </label>
          </div>
          {status && <p className="mt-16" style={{ color: "var(--accent-2)", fontSize: "0.9rem" }}>{status}</p>}
          {error && <p className="mt-16" style={{ color: "var(--danger)", fontSize: "0.9rem" }}>{error}</p>}
        </div>
      </section>

      <section className="section">
        <div className="section__head">
          <h2>Your Papers</h2>
          <p>{papers.length ? `${papers.length} papers saved` : "No papers yet — upload a PDF above."}</p>
        </div>
        {papers.length === 0 ? (
          <div className="placeholder">No papers yet. Upload a year's PDF to get started. 🚀</div>
        ) : (
          <div className="grid grid--3">
            {papers.map((p) => (
              <article key={p.id} className="glass-card">
                <div className="row between" style={{ alignItems: "flex-start" }}>
                  <span className="badge badge--ok">{p.questions.length} Q</span>
                  <button className="btn btn--ghost btn--sm" onClick={() => del(p.id)} title="Delete">✕</button>
                </div>
                <h3 style={{ marginTop: 14 }}>{p.title}</h3>
                <p className="muted mt-8" style={{ fontSize: "0.82rem" }}>{new Date(p.createdAt).toLocaleDateString("en-IN")}</p>
                <Link href={`/quizzes/${p.id}`} className="btn btn--primary btn--block mt-16">Start Paper</Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
