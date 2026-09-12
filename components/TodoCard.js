"use client";

// ✅ Homepage ki To-do list — subject-wise. Wahi list PC ke to-do overlay par
// bhi dikhti hai (D:\over\todo_app.py) — wahan ✅ karo to yahan agli sync par
// aa jaata hai, isliye card har kuch second list dobara dekh leta hai.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getTodos, addTodo, toggleTodo, removeTodo, clearDone, todoSig,
  TODO_SUBJECTS, groupOpen, subjectOf,
} from "@/lib/todo";

// Pichhli baar kaunsa subject chuna tha — sirf is device ki suvidha, isliye
// `cgl.` ke bina (sync nahi hoti).
const LAST_KEY = "todo.lastSubject";
const iconOf = (k) => (TODO_SUBJECTS.find((s) => s.key === k) || {}).icon || "📌";

export default function TodoCard() {
  const [list, setList] = useState([]);
  const [text, setText] = useState("");
  const [subject, setSubject] = useState("math");
  const [showDone, setShowDone] = useState(false);
  const sig = useRef("");

  const refresh = useCallback(() => {
    const l = getTodos();
    const s = todoSig(l);
    if (s !== sig.current) { sig.current = s; setList(l); }
  }, []);

  useEffect(() => {
    try { const k = localStorage.getItem(LAST_KEY); if (k && TODO_SUBJECTS.some((s) => s.key === k)) setSubject(k); } catch { /* ignore */ }
    refresh();
    const iv = setInterval(refresh, 4000);
    window.addEventListener("cgl:sync-applied", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(iv);
      window.removeEventListener("cgl:sync-applied", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [refresh]);

  const pick = (k) => {
    setSubject(k);
    try { localStorage.setItem(LAST_KEY, k); } catch { /* ignore */ }
  };

  const add = () => {
    if (!text.trim()) return;
    addTodo(text, subject);
    setText("");
    refresh();
  };

  const open = list.filter((t) => !t.done);
  const done = list.filter((t) => t.done);
  const groups = groupOpen(list);

  const row = (t, isDone) => (
    <li key={t.id} className={`todo__item${isDone ? " is-done" : ""}`}>
      <label>
        <input type="checkbox" checked={isDone} onChange={() => { toggleTodo(t.id); refresh(); }} />
        {isDone && <span className="todo__sub" title={subjectOf(t)}>{iconOf(subjectOf(t))}</span>}
        <span>{t.text}</span>
      </label>
      <button className="todo__x" onClick={() => { removeTodo(t.id); refresh(); }} aria-label="Hatao" title="Hatao">✕</button>
    </li>
  );

  return (
    <section className="panel todo">
      <div className="card-title-row">
        <div>
          <span className="section-kicker">Aaj ke kaam</span>
          <h2>✅ To-do {open.length > 0 && <span className="todo__count">{open.length} baaki</span>}</h2>
        </div>
      </div>

      <div className="todo__subjects" role="group" aria-label="Subject">
        {TODO_SUBJECTS.map((s) => (
          <button
            key={s.key}
            type="button"
            className={`todo__chip${subject === s.key ? " is-on" : ""}`}
            aria-pressed={subject === s.key}
            onClick={() => pick(s.key)}
          >
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      <form className="todo__add" onSubmit={(e) => { e.preventDefault(); add(); }}>
        <input
          className="input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`${iconOf(subject)} ${TODO_SUBJECTS.find((s) => s.key === subject)?.label} ka naya kaam… (Enter)`}
          maxLength={300}
        />
        <button className="btn btn--primary btn--sm" type="submit" disabled={!text.trim()}>➕ Jodo</button>
      </form>

      {open.length === 0 ? (
        <p className="todo__empty">{done.length ? "🎉 Sab ho gaya!" : "Abhi koi kaam nahi — upar subject chuno aur likho."}</p>
      ) : (
        <div className="todo__groups">
          {groups.map((g) => (
            <div key={g.key} className="todo__group">
              <div className="todo__ghead">
                <span>{g.icon} {g.label}</span>
                <span className="todo__gcount">{g.items.length}</span>
              </div>
              <ul className="todo__list">
                {g.items.map((t) => row(t, false))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {done.length > 0 && (
        <div className="todo__donebar">
          <button className="hmore" onClick={() => setShowDone((v) => !v)}>
            {showDone ? "▲" : "▼"} Ho gaye ({done.length})
          </button>
          {showDone && (
            <>
              <ul className="todo__list todo__list--done">
                {done.map((t) => row(t, true))}
              </ul>
              <button className="btn btn--ghost btn--sm" onClick={() => { clearDone(); refresh(); }}>🧹 Ho gaye wale hatao</button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
