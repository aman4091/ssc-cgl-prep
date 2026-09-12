"use client";

// 🎯 Homepage ke Weak Topics — subject-wise. Chuna hua subject hi tab hai:
// list sirf usi ke topic dikhati hai, aur naya topic bhi usi mein judta hai.
// Wahi list PC ke overlay par bhi dikhti hai (D:\over\todo_app.py) — wahan
// ✅ karo to yahan agli sync par aa jaata hai, isliye card har kuch second
// list dobara dekh leta hai.
//
// (Andar ka naam "todo" hi hai — store `cgl.todos` — taaki sync aur PC
// overlay bina badle chalte rahein. Dikhne mein ab ye Weak Topics hai.)

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getTodos, addTodo, toggleTodo, removeTodo, clearDone, todoSig,
  TODO_SUBJECTS, subjectOf,
} from "@/lib/todo";

// Pichhli baar kaunsa subject chuna tha — sirf is device ki suvidha, isliye
// `cgl.` ke bina (sync nahi hoti).
const LAST_KEY = "todo.lastSubject";

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

  const openAll = list.filter((t) => !t.done);
  const left = Object.fromEntries(TODO_SUBJECTS.map((s) => [s.key, openAll.filter((t) => subjectOf(t) === s.key).length]));
  const mine = list.filter((t) => subjectOf(t) === subject);
  const open = mine.filter((t) => !t.done);
  const done = mine.filter((t) => t.done);
  const cur = TODO_SUBJECTS.find((s) => s.key === subject) || TODO_SUBJECTS[0];

  const row = (t, isDone) => (
    <li key={t.id} className={`todo__item${isDone ? " is-done" : ""}`}>
      <label>
        <input type="checkbox" checked={isDone} onChange={() => { toggleTodo(t.id); refresh(); }} />
        <span>{t.text}</span>
      </label>
      <button className="todo__x" onClick={() => { removeTodo(t.id); refresh(); }} aria-label="Hatao" title="Hatao">✕</button>
    </li>
  );

  return (
    <section className="panel todo">
      <div className="card-title-row">
        <div>
          <span className="section-kicker">Kamzor jagah</span>
          <h2>🎯 Weak Topics {openAll.length > 0 && <span className="todo__count">{openAll.length} baaki</span>}</h2>
        </div>
      </div>

      <div className="todo__subjects" role="tablist" aria-label="Subject">
        {TODO_SUBJECTS.map((s) => (
          <button
            key={s.key}
            type="button"
            role="tab"
            className={`todo__chip${subject === s.key ? " is-on" : ""}`}
            aria-selected={subject === s.key}
            onClick={() => pick(s.key)}
          >
            {s.icon} {s.label}
            {left[s.key] > 0 && <span className="todo__chipn">{left[s.key]}</span>}
          </button>
        ))}
      </div>

      <form className="todo__add" onSubmit={(e) => { e.preventDefault(); add(); }}>
        <input
          className="input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`${cur.icon} ${cur.label} ka weak topic likho… (Enter)`}
          maxLength={300}
        />
        <button className="btn btn--primary btn--sm" type="submit" disabled={!text.trim()}>➕ Jodo</button>
      </form>

      {open.length === 0 ? (
        <p className="todo__empty">
          {done.length
            ? `🎉 ${cur.label} ke saare weak topics cover ho gaye!`
            : `${cur.icon} ${cur.label} mein abhi koi weak topic nahi — upar likho.`}
        </p>
      ) : (
        <ul className="todo__list">
          {open.map((t) => row(t, false))}
        </ul>
      )}

      {done.length > 0 && (
        <div className="todo__donebar">
          <button className="hmore" onClick={() => setShowDone((v) => !v)}>
            {showDone ? "▲" : "▼"} Cover ho gaye ({done.length})
          </button>
          {showDone && (
            <>
              <ul className="todo__list todo__list--done">
                {done.map((t) => row(t, true))}
              </ul>
              <button className="btn btn--ghost btn--sm" onClick={() => { clearDone(subject); refresh(); }}>🧹 {cur.label} ke cover hue hatao</button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
