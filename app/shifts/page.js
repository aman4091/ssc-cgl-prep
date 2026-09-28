"use client";

// 📋 SSC 2025 shift tracker — har subject ka apna tab, har paper ke aage
// 1–5 checkbox (ek mock 5 baar tak). Data: lib/shifts2025.js

import { useEffect, useMemo, useState } from "react";
import "./shifts.css";
import { SUBJECTS, EXAMS, TRIES, papersFor, readTicks, toggleTick } from "@/lib/shifts2025";

export default function ShiftsPage() {
  const [sub, setSub] = useState("reasoning");
  const [ex, setEx] = useState("");
  const [ticks, setTicks] = useState({});
  const [open, setOpen] = useState({ cgl: true, chsl: true, steno: true });

  useEffect(() => {
    const load = () => setTicks(readTicks());
    load();
    try { const s = localStorage.getItem("cgl.shifts.tab"); if (SUBJECTS.some((x) => x.key === s)) setSub(s); } catch { /* ignore */ }
    window.addEventListener("cgl:sync-applied", load);
    return () => window.removeEventListener("cgl:sync-applied", load);
  }, []);
  const pickSub = (k) => { setSub(k); try { localStorage.setItem("cgl.shifts.tab", k); } catch { /* ignore */ } };

  const papers = useMemo(() => papersFor(sub), [sub]);
  const row = ticks[sub] || {};
  const cnt = (id) => (row[id] || []).filter(Boolean).length;
  const subStat = (k) => {
    const r = ticks[k] || {};
    const ps = papersFor(k);
    return { done: ps.filter((p) => (r[p.id] || []).some(Boolean)).length, total: ps.length };
  };

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <span className="hero__eyebrow">📋 SSC 2025 — saare shift</span>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.5rem, 4vw, 2.2rem)" }}>
          Har paper <span className="grad">5 baar</span>
        </h1>
        <p className="hero__sub">
          CGL, CHSL aur Steno 2025 ke saare shift — subject-wise. Paper jitni baar lagao, utne box tick karo (1 se 5).
          Steno mein Maths nahi hota, isliye Maths tab mein sirf CGL + CHSL.
        </p>
      </section>

      <section className="section">
        <div className="sh-tabs">
          {SUBJECTS.map((s) => {
            const st = subStat(s.key);
            return (
              <button key={s.key} type="button" className={`sh-tab${sub === s.key ? " is-on" : ""}`} onClick={() => pickSub(s.key)}>
                {s.icon} {s.label} <small>{st.done}/{st.total}</small>
              </button>
            );
          })}
        </div>
        <div className="sh-chips">
          <button type="button" className={!ex ? "is-on" : ""} onClick={() => setEx("")}>Sab</button>
          {EXAMS.filter((e) => !(sub === "maths" && e.noMaths)).map((e) => (
            <button key={e.key} type="button" className={ex === e.key ? "is-on" : ""} onClick={() => setEx(e.key)}>{e.short}</button>
          ))}
        </div>

        {EXAMS.filter((e) => (!ex || ex === e.key) && !(sub === "maths" && e.noMaths)).map((e) => {
          const list = papers.filter((p) => p.exam === e.key);
          const done = list.filter((p) => cnt(p.id) > 0).length;
          const tries = list.reduce((a, p) => a + cnt(p.id), 0);
          return (
            <div key={e.key} className="sh-group">
              <button type="button" className="sh-group__hd" onClick={() => setOpen((o) => ({ ...o, [e.key]: !o[e.key] }))}>
                <span>{open[e.key] ? "▾" : "▸"} <b>{e.name}</b> <em>{e.when}</em></span>
                <span className="sh-group__n">{done}/{list.length} paper · {tries} baar</span>
              </button>
              <div className="sh-bar"><div style={{ width: `${(done * 100) / (list.length || 1)}%` }} /></div>
              {open[e.key] && (
                <ul className="sh-list">
                  {list.map((p) => {
                    const arr = row[p.id] || [];
                    const n = cnt(p.id);
                    return (
                      <li key={p.id} className={n ? (n >= TRIES ? "is-full" : "is-some") : ""}>
                        <span className="sh-name">{p.label}</span>
                        <span className="sh-boxes">
                          {Array.from({ length: TRIES }, (_, i) => (
                            <label key={i} className={arr[i] ? "is-on" : ""}>
                              <input type="checkbox" checked={!!arr[i]} onChange={() => setTicks({ ...toggleTick(sub, p.id, i) })} />
                              {i + 1}
                            </label>
                          ))}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </section>
    </>
  );
}
