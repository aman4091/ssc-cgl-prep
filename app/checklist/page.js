"use client";

import { useEffect, useState } from "react";
import {
  getTasks, addTask, toggleTask, toggleMode, removeTask, clearChecked,
} from "@/lib/checklist";

export default function ChecklistPage() {
  const [tasks, setTasks] = useState([]);
  const [text, setText] = useState("");
  const [mode, setMode] = useState("daily");

  useEffect(() => { setTasks(getTasks()); }, []);

  const add = () => {
    if (!text.trim()) return;
    setTasks(addTask(text, mode));
    setText("");
  };
  const onKey = (e) => { if (e.key === "Enter") add(); };

  const done = tasks.filter((t) => t.checked).length;
  const total = tasks.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const daily = tasks.filter((t) => t.mode === "daily");
  const once = tasks.filter((t) => t.mode === "once");

  const Row = (t) => (
    <div key={t.id} className={`chk-row ${t.checked ? "is-done" : ""}`}>
      <button className={`chk-box ${t.checked ? "is-on" : ""}`} onClick={() => setTasks(toggleTask(t.id))} title="Toggle">
        {t.checked ? "✓" : ""}
      </button>
      <span className="chk-row__text">{t.text}</span>
      <button
        className={`chk__mode ${t.mode === "daily" ? "is-daily" : "is-once"}`}
        onClick={() => setTasks(toggleMode(t.id))}
        title={t.mode === "daily" ? "Daily (roz reset) — tap for one-time" : "One-time — tap for daily"}
      >
        {t.mode === "daily" ? "🔁 Daily" : "1× Once"}
      </button>
      <button className="chk__del" onClick={() => setTasks(removeTask(t.id))} title="Delete">✕</button>
    </div>
  );

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <span className="hero__eyebrow">✅ Checklist</span>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.7rem, 4vw, 2.6rem)" }}>
          Study <span className="grad">Checklist</span>
        </h1>
        <p className="hero__sub">
          Apne roz ke aur one-time kaam yaha track karo. <strong>🔁 Daily</strong> tasks har din reset ho jaate
          hain; <strong>1× Once</strong> tick karne pe wahi rehte hain. Navbar wale ✅ se bhi yahi list dikhti hai.
        </p>
      </section>

      {/* Progress + add */}
      <section className="section" style={{ marginTop: 12 }}>
        <div className="glass-card">
          <div className="row between" style={{ alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <h3>{total ? `${done}/${total} done` : "No tasks yet"}</h3>
            {done > 0 && <button className="btn btn--ghost btn--sm" onClick={() => setTasks(clearChecked())}>🧹 Clear checked ({done})</button>}
          </div>
          {total > 0 && (
            <div className="chk__bar" style={{ marginTop: 12 }}><span style={{ width: `${pct}%` }} /></div>
          )}

          <div className="chk-add mt-16">
            <input className="input" placeholder="Naya task likho…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey} />
            <button
              className={`chk__modepick ${mode === "daily" ? "is-daily" : "is-once"}`}
              onClick={() => setMode((m) => (m === "daily" ? "once" : "daily"))}
              title={mode === "daily" ? "New task = Daily (roz reset)" : "New task = One-time"}
            >
              {mode === "daily" ? "🔁 Daily" : "1× Once"}
            </button>
            <button className="btn btn--primary" onClick={add} disabled={!text.trim()}>Add</button>
          </div>
        </div>
      </section>

      {total === 0 ? (
        <section className="section">
          <div className="placeholder">Koi task nahi. Upar add karo — daily routine ya one-time kaam. 📝</div>
        </section>
      ) : (
        <>
          {daily.length > 0 && (
            <section className="section">
              <div className="section__head"><h2>🔁 Daily</h2><p>Roz reset — {daily.filter((t) => t.checked).length}/{daily.length} aaj done</p></div>
              <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {daily.map(Row)}
              </div>
            </section>
          )}
          {once.length > 0 && (
            <section className="section">
              <div className="section__head"><h2>1× One-time</h2><p>{once.filter((t) => t.checked).length}/{once.length} done</p></div>
              <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {once.map(Row)}
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}
