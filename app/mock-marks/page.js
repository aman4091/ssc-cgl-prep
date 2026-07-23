"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  FULL_SECTIONS, getMocks, addMock, removeMock, mockTotals, sectionStats, overallSummary,
} from "@/lib/mockmarks";

const todayStr = () => new Date().toISOString().slice(0, 10);
const blankSection = () => ({ name: "", correct: "", wrong: "", total: "", timeMin: "" });
const fmtDate = (d) => { try { return new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); } catch { return d; } };

export default function MockMarksPage() {
  const [mocks, setMocks] = useState([]);
  const [summary, setSummary] = useState({ count: 0, avgScore: 0, avgAccuracy: 0, best: 0 });
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(null);

  // form state
  const [name, setName] = useState("");
  const [type, setType] = useState("full");
  const [date, setDate] = useState(todayStr());
  const [sections, setSections] = useState(FULL_SECTIONS.map((n) => ({ ...blankSection(), name: n })));
  const [err, setErr] = useState("");

  const refresh = () => { setMocks(getMocks()); setSummary(overallSummary()); };
  useEffect(() => { refresh(); }, []);

  const resetForm = () => {
    setName(""); setType("full"); setDate(todayStr());
    setSections(FULL_SECTIONS.map((n) => ({ ...blankSection(), name: n })));
    setErr("");
  };
  const chooseType = (t) => {
    setType(t);
    setSections(t === "full" ? FULL_SECTIONS.map((n) => ({ ...blankSection(), name: n })) : [blankSection()]);
  };
  const setSec = (i, k, v) => setSections((rows) => rows.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const addRow = () => setSections((r) => [...r, blankSection()]);
  const delRow = (i) => setSections((r) => r.filter((_, idx) => idx !== i));

  const save = () => {
    const has = sections.some((s) => Number(s.correct) || Number(s.wrong) || Number(s.total));
    if (!has) { setErr("Kam se kam ek section mein marks daalo."); return; }
    if (!name.trim()) { setErr("Mock ka naam daalo."); return; }
    addMock({ name, type, date, sections });
    setOpen(false); resetForm(); refresh();
  };

  const remove = (id) => { if (confirm("Ye mock hata dein?")) { removeMock(id); refresh(); } };

  // live totals for the form
  const draftTotals = mockTotals({ sections });

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">📊 Mock Marks</span>
          <Link href="/mock-tests" className="btn btn--ghost btn--sm">📝 Mock Tests</Link>
        </div>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.7rem, 4vw, 2.6rem)" }}>
          Mock <span className="grad">Marks Tracker</span>
        </h1>
        <p className="hero__sub">
          Har sectional/full mock ke marks yahan record karo — section-wise correct, wrong, total,
          time aur accuracy. Naam aur date ke saath. Apni progress ek jagah.
        </p>
      </section>

      {summary.count > 0 && (
        <section className="section" style={{ marginTop: 8 }}>
          <div className="mm-stats">
            <div className="stat glass"><span className="stat__num">{summary.count}</span><span className="stat__label">Mocks</span></div>
            <div className="stat glass"><span className="stat__num">{summary.avgScore}</span><span className="stat__label">Avg score</span></div>
            <div className="stat glass"><span className="stat__num">{summary.avgAccuracy}%</span><span className="stat__label">Avg accuracy</span></div>
            <div className="stat glass"><span className="stat__num" style={{ color: "var(--success)" }}>{summary.best}</span><span className="stat__label">Best score</span></div>
          </div>
        </section>
      )}

      <section className="section" style={{ marginTop: 12 }}>
        <button className="btn btn--primary btn--sm" onClick={() => (open ? (setOpen(false), resetForm()) : setOpen(true))}>
          {open ? "✕ Cancel" : "➕ Add mock result"}
        </button>

        {open && (
          <div className="glass-card" style={{ marginTop: 12 }}>
            <div className="row" style={{ gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div style={{ flex: "2 1 220px" }}>
                <label className="vd-label">Mock ka naam</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Testbook CGL Full Mock 12" />
              </div>
              <div style={{ flex: "1 1 150px" }}>
                <label className="vd-label">Date</label>
                <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>

            <div className="row mt-16" style={{ gap: 8, alignItems: "center" }}>
              <span className="muted" style={{ fontSize: "0.85rem" }}>Type:</span>
              <button className={`chip chip--btn ${type === "full" ? "is-active" : ""}`} onClick={() => chooseType("full")}>🎯 Full mock</button>
              <button className={`chip chip--btn ${type === "sectional" ? "is-active" : ""}`} onClick={() => chooseType("sectional")}>📚 Sectional</button>
            </div>

            {/* Sections */}
            <div className="mt-16" style={{ overflowX: "auto" }}>
              <table className="mm-table">
                <thead>
                  <tr>
                    <th>Section</th><th>Correct</th><th>Wrong</th><th>Total Q</th><th>Time (min)</th>
                    <th className="mm-derived">Score</th><th className="mm-derived">Acc%</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {sections.map((s, i) => {
                    const st = sectionStats(s);
                    return (
                      <tr key={i}>
                        <td><input className="input mm-in" value={s.name} onChange={(e) => setSec(i, "name", e.target.value)} placeholder="Section" /></td>
                        <td><input className="input mm-in mm-num" type="number" min="0" value={s.correct} onChange={(e) => setSec(i, "correct", e.target.value)} /></td>
                        <td><input className="input mm-in mm-num" type="number" min="0" value={s.wrong} onChange={(e) => setSec(i, "wrong", e.target.value)} /></td>
                        <td><input className="input mm-in mm-num" type="number" min="0" value={s.total} onChange={(e) => setSec(i, "total", e.target.value)} /></td>
                        <td><input className="input mm-in mm-num" type="number" min="0" value={s.timeMin} onChange={(e) => setSec(i, "timeMin", e.target.value)} /></td>
                        <td className="mm-derived">{st.score}</td>
                        <td className="mm-derived">{st.accuracy}%</td>
                        <td>{sections.length > 1 && <button className="btn btn--ghost btn--sm" onClick={() => delRow(i)}>✕</button>}</td>
                      </tr>
                    );
                  })}
                  <tr className="mm-total">
                    <td><strong>Total</strong></td>
                    <td>{draftTotals.correct}</td><td>{draftTotals.wrong}</td><td>{draftTotals.total}</td><td>{draftTotals.timeMin}</td>
                    <td className="mm-derived"><strong>{draftTotals.score}</strong></td>
                    <td className="mm-derived"><strong>{draftTotals.accuracy}%</strong></td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
            <button className="btn btn--ghost btn--sm mt-8" onClick={addRow}>➕ Add section</button>

            {err && <p style={{ color: "var(--danger)", fontSize: "0.85rem", marginTop: 10 }}>{err}</p>}
            <div className="row mt-16" style={{ gap: 8 }}>
              <button className="btn btn--primary btn--sm" onClick={save}>💾 Save mock</button>
              <button className="btn btn--ghost btn--sm" onClick={() => { setOpen(false); resetForm(); }}>Cancel</button>
            </div>
          </div>
        )}
      </section>

      <section className="section">
        {mocks.length === 0 ? (
          <div className="placeholder">Abhi koi mock record nahi. Upar “➕ Add mock result” se apna pehla mock daalo.</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {mocks.map((m) => {
              const t = mockTotals(m);
              const isOpen = expanded === m.id;
              return (
                <div className="glass-card" key={m.id}>
                  <div className="row between" style={{ flexWrap: "wrap", gap: 8, alignItems: "flex-start" }}>
                    <div>
                      <strong style={{ fontSize: "1.02rem" }}>{m.name}</strong>
                      <div className="muted" style={{ fontSize: "0.8rem", marginTop: 2 }}>
                        {m.type === "full" ? "🎯 Full" : "📚 Sectional"} · 📅 {fmtDate(m.date)}
                      </div>
                    </div>
                    <button className="btn btn--ghost btn--sm" onClick={() => remove(m.id)}>🗑️</button>
                  </div>

                  <div className="row mt-8" style={{ gap: 8, flexWrap: "wrap" }}>
                    <span className="chip">🏆 Score <strong>{t.score}</strong></span>
                    <span className="chip" style={{ color: "var(--success)" }}>✅ {t.correct}</span>
                    <span className="chip" style={{ color: "var(--danger)" }}>❌ {t.wrong}</span>
                    <span className="chip">🎯 {t.accuracy}% acc</span>
                    <span className="chip">⏱ {t.timeMin} min</span>
                    <span className="chip muted">{t.attempted}/{t.total} attempted</span>
                  </div>

                  {t.sections.length > 0 && (
                    <>
                      <button className="btn btn--ghost btn--sm mt-8" onClick={() => setExpanded(isOpen ? null : m.id)}>
                        {isOpen ? "🙈 Hide sections" : `📂 Section-wise (${t.sections.length})`}
                      </button>
                      {isOpen && (
                        <div className="mt-8" style={{ overflowX: "auto" }}>
                          <table className="mm-table">
                            <thead><tr><th>Section</th><th>✅</th><th>❌</th><th>Total</th><th>Score</th><th>Acc%</th><th>Time</th></tr></thead>
                            <tbody>
                              {t.sections.map((s, i) => (
                                <tr key={i}>
                                  <td>{s.name}</td><td>{s.correct}</td><td>{s.wrong}</td><td>{s.total}</td>
                                  <td>{s.score}</td><td>{s.accuracy}%</td><td>{s.timeMin}m</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
