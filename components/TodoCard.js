"use client";

// ✅ Homepage ki To-do list. Wahi list PC ke to-do overlay par bhi dikhti hai
// (D:\over\todo_app.py) — wahan ✅ karo to yahan agli sync par aa jaata hai,
// isliye card har kuch second list dobara dekh leta hai.

import { useCallback, useEffect, useRef, useState } from "react";
import { getTodos, addTodo, toggleTodo, removeTodo, clearDone, todoSig } from "@/lib/todo";

export default function TodoCard() {
  const [list, setList] = useState([]);
  const [text, setText] = useState("");
  const [showDone, setShowDone] = useState(false);
  const sig = useRef("");

  const refresh = useCallback(() => {
    const l = getTodos();
    const s = todoSig(l);
    if (s !== sig.current) { sig.current = s; setList(l); }
  }, []);

  useEffect(() => {
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

  const add = () => {
    if (!text.trim()) return;
    addTodo(text);
    setText("");
    refresh();
  };

  const open = list.filter((t) => !t.done);
  const done = list.filter((t) => t.done);

  return (
    <section className="panel todo">
      <div className="card-title-row">
        <div>
          <span className="section-kicker">Aaj ke kaam</span>
          <h2>✅ To-do {open.length > 0 && <span className="todo__count">{open.length} baaki</span>}</h2>
        </div>
      </div>

      <form className="todo__add" onSubmit={(e) => { e.preventDefault(); add(); }}>
        <input
          className="input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Naya kaam likho… (Enter)"
          maxLength={300}
        />
        <button className="btn btn--primary btn--sm" type="submit" disabled={!text.trim()}>➕ Jodo</button>
      </form>

      {open.length === 0 ? (
        <p className="todo__empty">{done.length ? "🎉 Sab ho gaya!" : "Abhi koi kaam nahi — upar likho."}</p>
      ) : (
        <ul className="todo__list">
          {open.map((t) => (
            <li key={t.id} className="todo__item">
              <label>
                <input type="checkbox" checked={false} onChange={() => { toggleTodo(t.id); refresh(); }} />
                <span>{t.text}</span>
              </label>
              <button className="todo__x" onClick={() => { removeTodo(t.id); refresh(); }} aria-label="Hatao" title="Hatao">✕</button>
            </li>
          ))}
        </ul>
      )}

      {done.length > 0 && (
        <div className="todo__donebar">
          <button className="hmore" onClick={() => setShowDone((v) => !v)}>
            {showDone ? "▲" : "▼"} Ho gaye ({done.length})
          </button>
          {showDone && (
            <>
              <ul className="todo__list todo__list--done">
                {done.map((t) => (
                  <li key={t.id} className="todo__item is-done">
                    <label>
                      <input type="checkbox" checked onChange={() => { toggleTodo(t.id); refresh(); }} />
                      <span>{t.text}</span>
                    </label>
                    <button className="todo__x" onClick={() => { removeTodo(t.id); refresh(); }} aria-label="Hatao" title="Hatao">✕</button>
                  </li>
                ))}
              </ul>
              <button className="btn btn--ghost btn--sm" onClick={() => { clearDone(); refresh(); }}>🧹 Ho gaye wale hatao</button>
            </>
          )}
        </div>
      )}
    </section>
  );
}
