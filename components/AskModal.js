"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { askAI, generateSimilar, ocrImage } from "@/lib/client-ai";
import { saveQuiz, makeId } from "@/lib/storage";
import Markdown from "./Markdown";

export default function AskModal({ open, onClose }) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [question, setQuestion] = useState("");
  const [imageText, setImageText] = useState("");
  const [imageName, setImageName] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [ocrProgress, setOcrProgress] = useState(null);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [simLoading, setSimLoading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);
  const previewRef = useRef("");

  const reset = () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = "";
    setQuestion(""); setImageText(""); setImageName(""); setImagePreview("");
    setOcrProgress(null); setAnswer(""); setError("");
    setLoading(false); setSimLoading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  // Fresh state har baar modal khulne par
  useEffect(() => {
    if (open) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const processImageFile = async (file) => {
    if (!file) return;
    if (!file.type?.startsWith("image/")) {
      setError("That's not an image.");
      return;
    }
    setError("");
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const url = URL.createObjectURL(file);
    previewRef.current = url;
    setImagePreview(url);
    setImageName(file.name || "pasted-image.png");
    setImageText("");
    setOcrProgress(0);
    try {
      const text = await ocrImage(file, (p) => setOcrProgress(p));
      setImageText(text);
      setOcrProgress(1);
      if (!text) setError("No text found in the image (it may be blurry or handwritten).");
    } catch (err) {
      setError("OCR failed: " + err.message);
      setOcrProgress(null);
    }
  };

  // Clipboard paste (Ctrl+V) — jab modal khula ho
  useEffect(() => {
    if (!open) return;
    const onPaste = (e) => {
      const items = e.clipboardData?.items || [];
      for (const it of items) {
        if (it.type && it.type.startsWith("image/")) {
          const file = it.getAsFile();
          if (file) {
            e.preventDefault();
            processImageFile(file);
            break;
          }
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = ""; // same file dobara chune to bhi chale
    processImageFile(file);
  };

  const removeImage = () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = "";
    setImagePreview(""); setImageName(""); setImageText(""); setOcrProgress(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleAsk = async () => {
    setError(""); setAnswer(""); setLoading(true);
    try {
      const { answer } = await askAI({ question, imageText, subject });
      setAnswer(answer);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSimilar = async () => {
    setError(""); setSimLoading(true);
    try {
      const q = [question, imageText].filter(Boolean).join("\n");
      const data = await generateSimilar({ question: q, options: [] }, 20, subject);
      const quiz = {
        id: makeId(),
        title: data.title || "Similar Practice (20)",
        source: "Ask · similar",
        createdAt: new Date().toISOString(),
        questions: data.questions,
      };
      saveQuiz(quiz);
      onClose();
      router.push(`/quizzes/${quiz.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSimLoading(false);
    }
  };

  const busyOcr = ocrProgress !== null && ocrProgress < 1;
  const canSubmit = (question || imageText) && !busyOcr;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal glass" onClick={(e) => e.stopPropagation()}>
        <div className="row between">
          <h2 style={{ fontSize: "1.2rem" }}>🤖 Ask anything</h2>
          <button className="btn btn--ghost btn--sm" onClick={onClose}>✕</button>
        </div>
        <p className="muted" style={{ fontSize: "0.85rem", marginTop: 4 }}>
          Pick a subject for the right format — answers come in Hinglish.
        </p>

        <div className="subj-row mt-16">
          {[
            { k: "", label: "Auto" },
            { k: "math", label: "🧮 Math" },
            { k: "reasoning", label: "🧠 Reasoning" },
            { k: "english", label: "📚 English" },
            { k: "gs", label: "🌍 GS" },
          ].map((s) => (
            <button
              key={s.k || "auto"}
              className={`subj-chip ${subject === s.k ? "is-active" : ""}`}
              onClick={() => setSubject(s.k)}
              type="button"
            >
              {s.label}
            </button>
          ))}
        </div>

        <textarea
          className="textarea mt-16"
          placeholder="Type your question here... (or upload/paste an image)"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />

        {/* Image controls */}
        <div className="row mt-8" style={{ gap: 10 }}>
          <label className="btn btn--ghost btn--sm">
            📷 {imagePreview ? "Change image" : "Upload image"}
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFileInput} />
          </label>
          <span className="muted" style={{ fontSize: "0.78rem" }}>or paste with <strong>Ctrl+V</strong></span>
        </div>

        {/* Image preview + status */}
        {imagePreview && (
          <div className="img-preview mt-8">
            <a href={imagePreview} target="_blank" rel="noreferrer" title="Open full image">
              <img src={imagePreview} alt="question preview" />
            </a>
            <div className="img-preview__bar">
              <span className="muted" style={{ fontSize: "0.8rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {imageName}
                {busyOcr && ` · reading ${Math.round(ocrProgress * 100)}%`}
                {ocrProgress === 1 && imageText && " · ✔ text ready"}
              </span>
              <button className="btn btn--ghost btn--sm" onClick={removeImage}>Remove</button>
            </div>
          </div>
        )}

        {imageText && (
          <p className="muted mt-8" style={{ fontSize: "0.76rem", maxHeight: 56, overflow: "auto" }}>
            <strong>Extracted:</strong> {imageText.slice(0, 240)}
          </p>
        )}

        <div className="row mt-16" style={{ gap: 10 }}>
          <button className="btn btn--primary" onClick={handleAsk} disabled={loading || !canSubmit}>
            {loading ? "Solving…" : "Solve / Answer"}
          </button>
          <button className="btn btn--ghost" onClick={handleSimilar} disabled={simLoading || !canSubmit}>
            {simLoading ? "Generating…" : "20 similar questions"}
          </button>
          <button className="btn btn--ghost btn--sm" onClick={reset}>🔄 New question</button>
        </div>

        {error && <p className="mt-16" style={{ color: "var(--danger)", fontSize: "0.9rem" }}>{error}</p>}

        {answer && (
          <div className="answer-box mt-16">
            <Markdown>{answer}</Markdown>
          </div>
        )}
      </div>
    </div>
  );
}
