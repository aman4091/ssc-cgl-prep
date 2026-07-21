"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  SUBJECTS, subjectLabel, getWrongBook, countsBySubject,
  addWrong, updateWrong, removeWrong, clearWrong,
} from "@/lib/wrongbook";
import { saveQuiz, makeId } from "@/lib/storage";
import QuestionEditor from "@/components/QuestionEditor";

// Wrong Questions — a hand-kept book, one shelf per subject.
//
// Separate from the Mistake Notebook on purpose: that one fills itself from the
// quiz runners, this one holds only what you type in. They share no storage.
const BLANK = { question: "", options: ["", "", "", ""], answer: 0 };

// A question renders here rather than through PyqQuestionCard because that card
// archives every answer into the Mistake Notebook — which is exactly the store
// this page is meant to stay out of.
function WrongCard({ rec, onEdit, onDelete }) {
  const [shown, setShown] = useState(false);
  const q = rec.q || {};
  const opts = q.options || [];
  return (
    <div className="glass-card">
      <p style={{ fontWeight: 600, whiteSpace: "pre-wrap" }}>{q.question}</p>
      <div className="mt-8" style={{ display: "grid", gap: 6 }}>
        {opts.map((o, i) => {
          const right = shown && i === q.answer;
          return (
            <div
              key={i}
              style={{
                padding: "8px 12px", borderRadius: 8, fontSize: "0.92rem",
                border: `1px solid ${right ? "var(--success)" : "var(--glass-border)"}`,
                background: right ? "rgba(34,197,94,0.10)" : "transparent",
              }}
            >
              <strong style={{ opacity: 0.6, marginRight: 8 }}>{String.fromCharCode(65 + i)}</strong>
              {o}
              {right && <span style={{ color: "var(--success)", marginLeft: 8 }}>✓</span>}
            </div>
          );
        })}
      </div>

      {shown && (q.solution || rec.note) && (
        <p className="muted mt-8" style={{ fontSize: "0.86rem", whiteSpace: "pre-wrap" }}>
          {q.solution && <>💡 {q.solution}</>}
          {q.solution && rec.note && <br />}
          {rec.note && <>📝 {rec.note}</>}
        </p>
      )}

      <div className="row mt-8" style={{ gap: 8, flexWrap: "wrap" }}>
        <button className="btn btn--ghost btn--sm" onClick={() => setShown((v) => !v)}>
          {shown ? "🙈 Hide answer" : "👁️ Show answer"}
        </button>
        <button className="btn btn--ghost btn--sm" onClick={onEdit}>✏️ Edit</button>
        <button className="btn btn--ghost btn--sm" onClick={onDelete}>🗑️ Delete</button>
      </div>
    </div>
  );
}

export default function WrongQuestionsPage() {
  const router = useRouter();
  const [subject, setSubject] = useState("reasoning");
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState(() => Object.fromEntries(SUBJECTS.map((s) => [s.key, 0])));
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null); // record id being edited
  const [note, setNote] = useState("");

  const refresh = (subj = subject) => {
    setItems(getWrongBook(subj));
    setCounts(countsBySubject());
  };
  useEffect(() => { refresh(subject); /* eslint-disable-next-line */ }, [subject]);

  const active = SUBJECTS.find((s) => s.key === subject);

  const save = (q) => {
    if (editing) updateWrong(editing, q, note);
    else addWrong(q, subject, note);
    setAdding(false);
    setEditing(null);
    setNote("");
    refresh();
  };

  const startEdit = (rec) => {
    setEditing(rec.id);
    setNote(rec.note || "");
    setAdding(true);
  };
  const cancel = () => { setAdding(false); setEditing(null); setNote(""); };

  const remove = (id) => {
    if (!confirm("Ye question hata dein?")) return;
    removeWrong(id);
    refresh();
  };
  const clearShelf = () => {
    if (!confirm(`${active.label} ke saare ${items.length} questions hata dein?`)) return;
    clearWrong(subject);
    refresh();
  };

  const practice = () => {
    if (!items.length) return;
    const quiz = {
      id: makeId(),
      title: `${active.icon} ${active.label} · Wrong questions`,
      source: "wrongbook",
      createdAt: new Date().toISOString(),
      questions: items.map((r) => r.q),
    };
    saveQuiz(quiz);
    router.push(`/quizzes/${quiz.id}`);
  };

  const editingRec = editing ? items.find((r) => r.id === editing) : null;

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">❌ Wrong Questions</span>
          <Link href="/mistakes" className="btn btn--ghost btn--sm">🔴 Mistake Notebook</Link>
        </div>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.7rem, 4vw, 2.6rem)" }}>
          Wrong <span className="grad">Questions</span>
        </h1>
        <p className="hero__sub">
          Apni khud ki list — jo question class, book ya mock mein galat hua, subject ke hisaab se
          yahan add karo. Ye Mistake Notebook se alag hai; yahan sirf wahi aata hai jo tum daalte ho.
        </p>
      </section>

      <section className="section" style={{ marginTop: 12 }}>
        {/* Subject shelves */}
        <div className="chips" style={{ marginBottom: 16 }}>
          {SUBJECTS.map((s) => (
            <button
              key={s.key}
              className={`chip chip--btn chip--lg ${subject === s.key ? "is-active" : ""}`}
              onClick={() => { setSubject(s.key); cancel(); }}
            >
              {s.icon} {s.label} ({counts[s.key]})
            </button>
          ))}
        </div>

        <div className="row" style={{ gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <button
            className="btn btn--primary btn--sm"
            onClick={() => (adding ? cancel() : setAdding(true))}
          >
            {adding ? "✕ Cancel" : `➕ Add question to ${active.label}`}
          </button>
          {items.length > 0 && (
            <>
              <button className="btn btn--ghost btn--sm" onClick={practice}>
                🎯 Practice {active.label} ({items.length})
              </button>
              <button className="btn btn--ghost btn--sm" onClick={clearShelf}>
                🗑️ Clear {active.label}
              </button>
            </>
          )}
        </div>

        {adding && (
          <div className="glass-card" style={{ marginBottom: 16 }}>
            <h3>{editing ? "✏️ Edit question" : "➕ Naya question"} · {active.icon} {active.label}</h3>
            <p className="muted mt-8" style={{ fontSize: "0.84rem" }}>
              Question likho, options bharo, aur sahi wale ko tick karo.
            </p>
            <div className="mt-8">
              <label className="vd-label">Note (optional) — kyun galat hua?</label>
              <textarea
                className="textarea"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. formula yaad nahi tha"
              />
            </div>
            {/* Keyed so switching shelves or rows never carries a half-typed
                question into the next one. */}
            <QuestionEditor
              key={editing || `new-${subject}`}
              question={editingRec ? editingRec.q : BLANK}
              onSave={save}
              onCancel={cancel}
            />
          </div>
        )}

        {items.length === 0 ? (
          <div className="placeholder">
            {active.label} mein abhi kuch nahi. Upar “➕ Add question” se apna pehla galat question
            daalo.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {items.map((rec) => (
              <WrongCard
                key={rec.id}
                rec={rec}
                onEdit={() => startEdit(rec)}
                onDelete={() => remove(rec.id)}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
