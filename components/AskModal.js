"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { askAI, generateSimilar, readImageText } from "@/lib/client-ai";
import { saveQuiz, makeId } from "@/lib/storage";
import { saveAnswer, SUBJECTS } from "@/lib/savedanswers";
import Markdown from "./Markdown";

export default function AskModal({ open, onClose }) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [question, setQuestion] = useState("");
  const [imageText, setImageText] = useState("");
  const [imageName, setImageName] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [imageEngine, setImageEngine] = useState("");
  const [ocrProgress, setOcrProgress] = useState(null);
  const [answer, setAnswer] = useState("");
  const [answerKind, setAnswerKind] = useState("");     // "" | "solve" | "shortcut"
  const [loading, setLoading] = useState(false);
  const [scLoading, setScLoading] = useState(false);
  const [simLoading, setSimLoading] = useState(false);
  const [error, setError] = useState("");
  const [savedMsg, setSavedMsg] = useState("");
  const fileRef = useRef(null);
  const previewRef = useRef("");

  const reset = () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = "";
    setQuestion(""); setImageText(""); setImageName(""); setImagePreview(""); setImageEngine("");
    setOcrProgress(null); setAnswer(""); setAnswerKind(""); setError(""); setSavedMsg("");
    setLoading(false); setScLoading(false); setSimLoading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSave = (subj) => {
    if (!answer) return;
    saveAnswer({ subject: subj, question, imageText, answer });
    const label = SUBJECTS.find((s) => s.k === subj)?.label || subj;
    setSavedMsg(`✓ Saved to ${label} notebook`);
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
    setImageEngine("");
    setOcrProgress(0);
    try {
      const { text, engine } = await readImageText(file, (p) => setOcrProgress(p));
      setImageText(text);
      setImageEngine(engine);
      setOcrProgress(1);
      if (!text) setError("No text found in the image (it may be blurry or handwritten).");
    } catch (err) {
      setError("Image read failed: " + err.message);
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

  const pasteImg = async () => {
    setError("");
    try {
      if (!navigator.clipboard?.read) { setError("Paste button not supported — use Ctrl+V instead."); return; }
      const items = await navigator.clipboard.read();
      for (const it of items) {
        const type = it.types.find((t) => t.startsWith("image/"));
        if (type) { const blob = await it.getType(type); processImageFile(new File([blob], "pasted.png", { type })); return; }
      }
      setError("Clipboard mein koi image nahi mili.");
    } catch (e) { setError("Paste failed: " + e.message); }
  };

  const removeImage = () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = "";
    setImagePreview(""); setImageName(""); setImageText(""); setImageEngine(""); setOcrProgress(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleAsk = async () => {
    setError(""); setAnswer(""); setAnswerKind(""); setSavedMsg(""); setLoading(true);
    try {
      const { answer } = await askAI({ question, imageText, subject });
      setAnswer(answer); setAnswerKind("solve");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleShortcut = async () => {
    setError(""); setAnswer(""); setAnswerKind(""); setSavedMsg(""); setScLoading(true);
    try {
      const { answer } = await askAI({ question, imageText, mode: "shortcut", subject });
      setAnswer(answer); setAnswerKind("shortcut");
    } catch (err) {
      setError(err.message);
    } finally {
      setScLoading(false);
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
  const anyBusy = loading || scLoading || simLoading;
  const canSubmit = (question || imageText) && !busyOcr && !anyBusy;

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
          <button className="btn btn--ghost btn--sm" onClick={pasteImg} type="button">📋 Paste</button>
          <span className="muted" style={{ fontSize: "0.78rem" }}>or <strong>Ctrl+V</strong></span>
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
                {busyOcr && ` · ${imageEngine === "gemini" ? "Gemini reading…" : `reading ${Math.round(ocrProgress * 100)}%`}`}
                {ocrProgress === 1 && imageText && ` · ✔ text ready${imageEngine === "gemini" ? " (Gemini)" : ""}`}
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

        <div className="row mt-16" style={{ gap: 10, flexWrap: "wrap" }}>
          <button className="btn btn--primary" onClick={handleAsk} disabled={!canSubmit}>
            {loading ? "Solving…" : "Solve / Answer"}
          </button>
          <button className="btn btn--ghost" onClick={handleShortcut} disabled={!canSubmit}>
            {scLoading ? "Thinking…" : "⚡ Shortcut trick"}
          </button>
          <button className="btn btn--ghost" onClick={handleSimilar} disabled={!canSubmit}>
            {simLoading ? "Generating…" : "20 similar questions"}
          </button>
          <button className="btn btn--ghost btn--sm" onClick={reset}>🔄 New question</button>
        </div>

        {error && <p className="mt-16" style={{ color: "var(--danger)", fontSize: "0.9rem" }}>{error}</p>}

        {answer && (
          <div className="answer-box mt-16">
            {answerKind === "shortcut" && (
              <p className="muted" style={{ fontSize: "0.78rem", marginBottom: 6 }}>⚡ Shortcut trick</p>
            )}
            <Markdown>{answer}</Markdown>
          </div>
        )}

        {answer && (
          <div className="save-row mt-16">
            <span className="muted" style={{ fontSize: "0.82rem" }}>💾 Save to notebook:</span>
            <div className="subj-row" style={{ marginTop: 8 }}>
              {SUBJECTS.map((s) => (
                <button
                  key={s.k}
                  type="button"
                  className="subj-chip"
                  onClick={() => handleSave(s.k)}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {savedMsg && (
              <p className="mt-8" style={{ fontSize: "0.85rem", color: "var(--success)" }}>
                {/* The Saved Answers page was removed, so there is nowhere to
                    link to — the answer is still saved, just not browsable. */}
                {savedMsg}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
