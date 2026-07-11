"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getQuizzes, saveQuiz, deleteQuiz, makeId, getSettings } from "@/lib/storage";

async function extractPdfText(file) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((it) => it.str).join(" ") + "\n";
  }
  return text;
}

export default function QuizzesPage() {
  const [quizzes, setQuizzes] = useState([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  useEffect(() => {
    setQuizzes(getQuizzes());
  }, []);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setStatus("");

    const settings = getSettings();
    if (!settings.apiKey) {
      setError("Add your DeepSeek API key in Settings first.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    setBusy(true);
    try {
      setStatus("Extracting text from PDF…");
      const text = await extractPdfText(file);

      setStatus("Building quiz with AI… (this may take a moment)");
      const res = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          apiKey: settings.apiKey,
          model: settings.model,
          baseUrl: settings.baseUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Quiz banane mein error.");

      const quiz = {
        id: makeId(),
        title: data.title || file.name.replace(/\.pdf$/i, ""),
        source: file.name,
        createdAt: new Date().toISOString(),
        questions: data.questions,
      };
      const all = saveQuiz(quiz);
      setQuizzes(all);
      setStatus(`Done! Built a quiz with ${quiz.questions.length} questions.`);
    } catch (err) {
      setError(err.message);
      setStatus("");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDelete = (id) => {
    setQuizzes(deleteQuiz(id));
  };

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <span className="hero__eyebrow">📝 Practice</span>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)" }}>
          <span className="grad">Quizzes</span>
        </h1>
        <p className="hero__sub">
          Upload a PDF of questions — AI automatically builds an MCQ quiz. Then attempt it.
        </p>
      </section>

      {/* Create from PDF */}
      <section className="section" style={{ marginTop: 16 }}>
        <div className="glass-card">
          <div className="row between">
            <div>
              <h3>PDF → Quiz</h3>
              <p className="muted mt-8">
                A text-based PDF works best (scanned image PDFs may not yield text).
              </p>
            </div>
            <label className={`btn btn--primary ${busy ? "" : ""}`} style={{ opacity: busy ? 0.6 : 1, pointerEvents: busy ? "none" : "auto" }}>
              {busy ? "Working…" : "Upload PDF"}
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                onChange={handleFile}
                hidden
              />
            </label>
          </div>
          {status && <p className="mt-16" style={{ color: "var(--accent-2)", fontSize: "0.9rem" }}>{status}</p>}
          {error && <p className="mt-16" style={{ color: "var(--danger)", fontSize: "0.9rem" }}>{error}</p>}
        </div>
      </section>

      {/* Saved quizzes */}
      <section className="section">
        <div className="section__head">
          <h2>Your Quizzes</h2>
          <p>{quizzes.length ? `${quizzes.length} quiz saved` : "No quizzes yet — upload a PDF above."}</p>
        </div>

        {quizzes.length === 0 ? (
          <div className="placeholder">No quizzes found. Upload a PDF to get started. 🚀</div>
        ) : (
          <div className="grid grid--3">
            {quizzes.map((q) => (
              <article key={q.id} className="glass-card">
                <div className="row between" style={{ alignItems: "flex-start" }}>
                  <span className="badge badge--ok">{q.questions.length} Q</span>
                  <button
                    className="btn btn--ghost btn--sm"
                    onClick={() => handleDelete(q.id)}
                    title="Delete"
                  >
                    ✕
                  </button>
                </div>
                <h3 style={{ marginTop: 14 }}>{q.title}</h3>
                <p className="muted mt-8" style={{ fontSize: "0.82rem" }}>
                  {q.source} · {new Date(q.createdAt).toLocaleDateString("en-IN")}
                </p>
                <Link href={`/quizzes/${q.id}`} className="btn btn--primary btn--block mt-16">
                  Start Quiz
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
