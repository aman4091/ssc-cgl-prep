"use client";

import { useState } from "react";
import { askAI } from "@/lib/client-ai";
import Markdown from "./Markdown";

// A small follow-up "doubt" thread attached to one quiz question. The student
// types anything about THIS question and the AI explains in more detail,
// keeping the question (and prior replies) as context.
export default function QuestionFollowup({ question, subject }) {
  const [open, setOpen] = useState(false);
  const [thread, setThread] = useState([]); // [{ q, a }]
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const ask = async () => {
    const doubt = input.trim();
    if (!doubt || loading) return;
    setLoading(true); setError("");
    try {
      const q = question;
      const opts = q.options.map((o, i) => `${String.fromCharCode(65 + i)}) ${o}`).join("   ");
      const ctx =
        "Neeche ek quiz question hai. Student is question ke baare mein aur detail mein samajhna chahta hai — uska follow-up doubt solve karo.\n\n" +
        `Question: ${q.question}\n` +
        `Options: ${opts}\n` +
        (q.answer != null ? `Sahi answer: ${String.fromCharCode(65 + q.answer)}) ${q.options[q.answer]}\n` : "") +
        (q.explanation ? `Pehle se diya explanation: ${q.explanation}\n` : "") +
        (thread.length
          ? "\nAb tak ki baat-cheet:\n" + thread.map((t) => `Student: ${t.q}\nTutor: ${t.a}`).join("\n\n") + "\n"
          : "") +
        `\nStudent ka naya sawaal: ${doubt}\n\nIsko simple Hinglish mein, achhe se detail mein samjhao.`;
      const { answer } = await askAI({ question: ctx, subject });
      setThread((t) => [...t, { q: doubt, a: answer }]);
      setInput("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); ask(); }
  };

  if (!open) {
    return (
      <div className="mt-12">
        <button className="btn btn--ghost btn--sm" onClick={() => setOpen(true)}>💬 Ask a doubt about this question</button>
      </div>
    );
  }

  return (
    <div className="followup mt-16">
      <div className="row between">
        <span className="vd-label">💬 Doubt / follow-up</span>
        <button className="btn btn--ghost btn--sm" onClick={() => setOpen(false)}>Hide</button>
      </div>

      {thread.map((t, i) => (
        <div key={i} className="mt-12">
          <p className="followup__q"><strong>You:</strong> {t.q}</p>
          <div className="answer-box mt-8"><Markdown>{t.a}</Markdown></div>
        </div>
      ))}

      <div className="row mt-12" style={{ gap: 8, alignItems: "flex-end" }}>
        <textarea
          className="textarea"
          style={{ minHeight: 54, flex: 1 }}
          placeholder="Ask anything about this question… (e.g. 'why this step?', 'why is clergy plural?')"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button className="btn btn--primary" onClick={ask} disabled={loading || !input.trim()}>
          {loading ? "Thinking…" : "Ask"}
        </button>
      </div>
      <p className="hint" style={{ marginTop: 6 }}>You can also send with Ctrl+Enter. Ask as many follow-ups as you like.</p>
      {error && <p style={{ color: "var(--danger)", fontSize: "0.85rem", marginTop: 8 }}>{error}</p>}
    </div>
  );
}
