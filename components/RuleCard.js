"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ruleDetail, ruleQuiz } from "@/lib/client-ai";
import { updateRule, deleteRule } from "@/lib/grammar";
import { saveQuiz, makeId } from "@/lib/storage";
import { parseTimeToSeconds, formatTime } from "@/lib/youtube";
import Markdown from "./Markdown";

export default function RuleCard({ rule, index, subject, chapterName, hasVideo, onSeek, onChanged }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);       // detail panel
  const [showEx, setShowEx] = useState(false);   // examples panel
  const [detail, setDetail] = useState(rule.detail || "");
  const [examples, setExamples] = useState(rule.examples || []);
  const [trap, setTrap] = useState(rule.trap || "");
  const [loading, setLoading] = useState(false);
  const [quizBusy, setQuizBusy] = useState(false);
  const [error, setError] = useState("");
  const [editTime, setEditTime] = useState(false);
  const [timeInput, setTimeInput] = useState(rule.videoTime != null ? formatTime(rule.videoTime) : "");
  const [urlInput, setUrlInput] = useState(rule.videoUrl || "");

  const ensureDetail = async (force = false) => {
    if (detail && !force) return true;
    setLoading(true); setError("");
    try {
      const d = await ruleDetail(rule.text, subject, chapterName);
      setDetail(d.detail); setExamples(d.examples || []); setTrap(d.trap || "");
      updateRule(rule.id, { detail: d.detail, examples: d.examples || [], trap: d.trap || "" });
      return true;
    } catch (err) { setError(err.message); return false; }
    finally { setLoading(false); }
  };
  const regenerate = async () => { await ensureDetail(true); };

  const toggleDetail = async () => {
    if (!open) { const ok = await ensureDetail(); if (ok) setOpen(true); }
    else setOpen(false);
  };
  const toggleExamples = async () => {
    if (!showEx) { const ok = await ensureDetail(); if (ok) setShowEx(true); }
    else setShowEx(false);
  };

  const startQuiz = async () => {
    setQuizBusy(true); setError("");
    try {
      const data = await ruleQuiz([rule.text], subject, chapterName, 10);
      const quiz = {
        id: makeId(),
        title: data.title || "Rule Quiz",
        source: `${chapterName} · rule`,
        createdAt: new Date().toISOString(),
        questions: data.questions,
      };
      saveQuiz(quiz);
      router.push(`/quizzes/${quiz.id}`);
    } catch (err) { setError(err.message); setQuizBusy(false); }
  };

  const saveTime = () => {
    const sec = timeInput.trim() ? parseTimeToSeconds(timeInput.trim()) : null;
    updateRule(rule.id, { videoTime: sec });
    rule.videoTime = sec;
    setEditTime(false);
    onChanged && onChanged();
  };
  const saveUrl = () => {
    updateRule(rule.id, { videoUrl: urlInput.trim() });
    rule.videoUrl = urlInput.trim();
    onChanged && onChanged();
  };

  const remove = () => {
    if (!confirm("Delete this rule?")) return;
    deleteRule(rule.id);
    onChanged && onChanged();
  };

  return (
    <article className="glass-card rule-card">
      <div className="row between" style={{ alignItems: "flex-start", gap: 10 }}>
        <p className="rule-card__text"><span className="rule-card__n">{index + 1}.</span> <Markdown inline>{rule.text}</Markdown></p>
        <button className="btn btn--ghost btn--sm" onClick={remove} title="Delete rule">✕</button>
      </div>

      <div className="row mt-12" style={{ gap: 8, flexWrap: "wrap" }}>
        <button className="btn btn--ghost btn--sm" onClick={toggleDetail} disabled={loading}>
          {loading && !detail ? "Loading…" : open ? "📖 Hide detail" : "📖 Detail"}
        </button>
        <button className="btn btn--ghost btn--sm" onClick={toggleExamples} disabled={loading}>
          {showEx ? "📝 Hide examples" : "📝 Examples"}
        </button>
        <button className="btn btn--ghost btn--sm" onClick={startQuiz} disabled={quizBusy}>
          {quizBusy ? "Generating…" : "🎯 Quiz"}
        </button>
        {hasVideo && rule.videoTime != null && (
          <button className="btn btn--ghost btn--sm" onClick={() => onSeek(rule.videoTime)} title="Play the video from here">
            ▶ {formatTime(rule.videoTime)}
          </button>
        )}
        {rule.videoUrl && (
          <a className="btn btn--ghost btn--sm" href={rule.videoUrl} target="_blank" rel="noreferrer">🔗 Video</a>
        )}
        <button className="btn btn--ghost btn--sm" onClick={() => setEditTime((v) => !v)} title="Set timestamp / video link">⏱️</button>
      </div>

      {editTime && (
        <div className="rule-card__meta mt-12">
          <div className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span className="muted" style={{ fontSize: "0.78rem" }}>Video timestamp (mm:ss):</span>
            <input className="input" style={{ width: 110 }} placeholder="2:35" value={timeInput} onChange={(e) => setTimeInput(e.target.value)} />
            <button className="btn btn--ghost btn--sm" onClick={saveTime}>Save time</button>
          </div>
          <div className="row mt-8" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span className="muted" style={{ fontSize: "0.78rem" }}>This rule's own video link:</span>
            <input className="input" style={{ flex: 1, minWidth: 180 }} placeholder="https://youtu.be/..." value={urlInput} onChange={(e) => setUrlInput(e.target.value)} />
            <button className="btn btn--ghost btn--sm" onClick={saveUrl}>Save link</button>
          </div>
          <p className="hint" style={{ marginTop: 8 }}>💡 After setting a timestamp, press ▶ — the chapter video above will play from there.</p>
        </div>
      )}

      {error && <p className="mt-12" style={{ color: "var(--danger)", fontSize: "0.85rem" }}>{error}</p>}

      {open && detail && (
        <div className="rule-card__detail mt-12">
          <span className="vd-label">📖 Full explanation</span>
          <div className="md mt-8"><Markdown>{detail}</Markdown></div>
          {trap && (
            <p className="mt-12" style={{ background: "rgba(239,68,68,0.12)", padding: "8px 12px", borderRadius: 10, fontSize: "0.88rem" }}>
              <strong>⚠️ Trap:</strong> {trap}
            </p>
          )}
        </div>
      )}

      {showEx && examples.length > 0 && (
        <div className="rule-card__detail mt-12">
          <div className="row between">
            <span className="vd-label">📝 Examples</span>
            <button className="btn btn--ghost btn--sm" onClick={regenerate} disabled={loading} title="Regenerate examples">
              {loading ? "…" : "🔄 Regenerate"}
            </button>
          </div>
          <ul className="mt-8" style={{ display: "grid", gap: 10, paddingLeft: 18 }}>
            {examples.map((ex, i) => (
              <li key={i}>
                {String(ex).split("\n").map((line, j) => (
                  line.trim() ? (
                    <div key={j} style={{ marginTop: j ? 2 : 0 }}><Markdown inline>{line}</Markdown></div>
                  ) : null
                ))}
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
