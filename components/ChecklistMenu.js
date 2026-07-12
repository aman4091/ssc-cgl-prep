"use client";

import { useEffect, useRef, useState } from "react";
import {
  getTasks, addTask, toggleTask, toggleMode, removeTask, clearChecked, getProgress,
} from "@/lib/checklist";

// Navbar checklist quick-panel. Add tasks (daily-repeat or one-time), tick them
// off from anywhere, see progress. Lives in the persistent navbar.
export default function ChecklistMenu() {
  const [tasks, setTasks] = useState([]);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [mode, setMode] = useState("daily"); // default new-task mode
  const inputRef = useRef(null);

  useEffect(() => { setTasks(getTasks()); }, []);
  // re-check on open (a new day may have auto-cleared daily ticks)
  useEffect(() => { if (open) setTasks(getTasks()); }, [open]);

  const add = () => {
    if (!text.trim()) return;
    setTasks(addTask(text, mode));
    setText("");
    inputRef.current && inputRef.current.focus();
  };
  const onKey = (e) => { if (e.key === "Enter") add(); };

  const done = tasks.filter((t) => t.checked).length;
  const total = tasks.length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className="chk">
      <button className="chk__pill" onClick={() => setOpen((o) => !o)} title="Checklist">
        <span className="chk__ico">✅</span>
        <span className="chk__count">{total ? `${done}/${total}` : "List"}</span>
      </button>

      {open && (
        <>
          <div className="chk__scrim" onClick={() => setOpen(false)} />
          <div className="chk__panel" role="dialog">
            <div className="chk__head">
              <strong>✅ Checklist</strong>
              <span className="chk__prog-label">{done}/{total} done</span>
              <button className="chk__x" onClick={() => setOpen(false)}>✕</button>
            </div>

            {total > 0 && (
              <div className="chk__bar"><span style={{ width: `${pct}%` }} /></div>
            )}

            <div className="chk__list">
              {tasks.length === 0 ? (
                <p className="muted" style={{ fontSize: "0.82rem", padding: "10px 2px" }}>
                  Koi task nahi. Neeche add karo — <strong>🔁 daily</strong> (roz reset) ya <strong>1× once</strong> (permanent).
                </p>
              ) : (
                tasks.map((t) => (
                  <div key={t.id} className={`chk__row ${t.checked ? "is-done" : ""}`}>
                    <button className={`chk__box ${t.checked ? "is-on" : ""}`} onClick={() => setTasks(toggleTask(t.id))} title="Toggle">
                      {t.checked ? "✓" : ""}
                    </button>
                    <span className="chk__text">{t.text}</span>
                    <button
                      className={`chk__mode ${t.mode === "daily" ? "is-daily" : "is-once"}`}
                      onClick={() => setTasks(toggleMode(t.id))}
                      title={t.mode === "daily" ? "Daily (roz reset) — tap for one-time" : "One-time — tap for daily"}
                    >
                      {t.mode === "daily" ? "🔁" : "1×"}
                    </button>
                    <button className="chk__del" onClick={() => setTasks(removeTask(t.id))} title="Delete">✕</button>
                  </div>
                ))
              )}
            </div>

            <div className="chk__add">
              <input
                ref={inputRef}
                className="input"
                placeholder="Naya task…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={onKey}
              />
              <button
                className={`chk__modepick ${mode === "daily" ? "is-daily" : "is-once"}`}
                onClick={() => setMode((m) => (m === "daily" ? "once" : "daily"))}
                title={mode === "daily" ? "New task = Daily (roz reset)" : "New task = One-time"}
              >
                {mode === "daily" ? "🔁 Daily" : "1× Once"}
              </button>
              <button className="btn btn--primary btn--sm" onClick={add} disabled={!text.trim()}>Add</button>
            </div>

            {done > 0 && (
              <button className="chk__clear" onClick={() => setTasks(clearChecked())}>
                🧹 Clear checked ({done})
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
