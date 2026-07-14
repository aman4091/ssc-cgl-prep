"use client";

import { useState } from "react";
import { SUBJECTS, getChapters, addChapter, addChapterQuestions } from "@/lib/grammar";

// A small control on any question card: pick Subject + Chapter (or make a new one)
// and file this question into that chapter's question bank. Used in the Daily Quiz
// and quiz results so questions can be sorted into their subject/chapter.
export default function AddToChapter({ q }) {
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [newName, setNewName] = useState("");
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState(false);

  const chapters = subject ? getChapters(subject) : [];

  const save = () => {
    if (!subject) { setMsg("Subject chuno."); return; }
    let cid = chapterId;
    if (cid === "__new__" || (!cid && newName.trim())) {
      const ch = addChapter(subject, newName);
      if (!ch) { setMsg("Chapter ka naam likho."); return; }
      cid = ch.id;
    }
    if (!cid) { setMsg("Chapter chuno ya naya banao."); return; }
    const added = addChapterQuestions(cid, [q]);
    const ch = getChapters(subject).find((c) => c.id === cid);
    setMsg(added ? `✓ Saved to ${SUBJECTS[subject]?.short} · ${ch?.name}` : `Already in ${ch?.name}`);
    setDone(true);
    setOpen(false);
  };

  if (!open) {
    return (
      <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button className="btn btn--ghost btn--sm" onClick={() => { setOpen(true); setMsg(""); }}>
          {done ? "📁 Save to another chapter" : "📁 Save to a chapter"}
        </button>
        {msg && <span style={{ fontSize: "0.82rem", color: "var(--success)" }}>{msg}</span>}
      </div>
    );
  }

  return (
    <div className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <select className="select" style={{ width: "auto", padding: "6px 10px" }} value={subject}
        onChange={(e) => { setSubject(e.target.value); setChapterId(""); setNewName(""); setMsg(""); }}>
        <option value="">Subject…</option>
        {Object.entries(SUBJECTS).map(([k, s]) => <option key={k} value={k}>{s.icon} {s.short}</option>)}
      </select>
      {subject && (
        <select className="select" style={{ width: "auto", padding: "6px 10px" }} value={chapterId}
          onChange={(e) => setChapterId(e.target.value)}>
          <option value="">Chapter…</option>
          {chapters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          <option value="__new__">➕ New chapter…</option>
        </select>
      )}
      {subject && chapterId === "__new__" && (
        <input className="input" style={{ width: 170, padding: "6px 10px" }} placeholder="New chapter name"
          value={newName} onChange={(e) => setNewName(e.target.value)} autoFocus />
      )}
      <button className="btn btn--primary btn--sm" onClick={save} disabled={!subject}>Save</button>
      <button className="btn btn--ghost btn--sm" onClick={() => { setOpen(false); setMsg(""); }}>✕</button>
      {msg && <span style={{ fontSize: "0.82rem", color: "var(--danger)" }}>{msg}</span>}
    </div>
  );
}
