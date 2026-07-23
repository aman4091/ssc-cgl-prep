"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  FULL_SECTIONS, CATEGORIES, categoryOf,
  getMocks, addMock, removeMock, mockTotals, sectionStats,
} from "@/lib/mockmarks";

const todayStr = () => new Date().toISOString().slice(0, 10);
const blankSection = () => ({ name: "", correct: "", wrong: "", total: "", timeMin: "" });
const fmtDate = (d) => { try { return new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); } catch { return d; } };

function MockMarksInner() {
  const sp = useSearchParams();
  const cat = categoryOf(sp.get("cat"));
  const isFull = cat.key === "full";

  const [mocks, setMocks] = useState([]);
  const [open, setOpen] = useState(false);

  // form state
  const [name, setName] = useState("");
  const [date, setDate] = useState(todayStr());
  const [sections, setSections] = useState([]);
  const [err, setErr] = useState("");

  const refresh = () => setMocks(getMocks(cat.key));

  // A full mock starts with the 4 SSC sections; a subject page has one row named
  // for that subject.
  const freshSections = () =>
    isFull
      ? FULL_SECTIONS.map((n) => ({ ...blankSection(), name: n }))
      : [{ ...blankSection(), name: cat.subject }];

  const resetForm = () => { setName(""); setDate(todayStr()); setSections(freshSections()); setErr(""); };

  useEffect(() => { refresh(); setOpen(false); resetForm(); /* eslint-disable-next-line */ }, [cat.key]);

  const setSec = (i, k, v) => setSections((rows) => rows.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const addRow = () => setSections((r) => [...r, blankSection()]);
  const delRow = (i) => setSections((r) => r.filter((_, idx) => idx !== i));

  const save = () => {
    const has = sections.some((s) => Number(s.correct) || Number(s.wrong) || Number(s.total));
    if (!has) { setErr("Marks daalo (correct / wrong / total)."); return; }
    if (!name.trim()) { setErr("Mock ka naam daalo."); return; }
    addMock({ name, cat: cat.key, date, sections });
    setOpen(false); resetForm(); refresh();
  };

  const remove = (id) => { if (confirm("Ye mock hata dein?")) { removeMock(id); refresh(); } };

  const draftTotals = mockTotals({ sections });

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">📊 Mock Marks · {cat.icon} {cat.label}</span>
          <Link href="/mock-tests" className="btn btn--ghost btn--sm">📝 Mock Tests</Link>
        </div>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.7rem, 4vw, 2.6rem)" }}>
          {cat.icon} <span className="grad">{cat.label}</span> marks
        </h1>
        <p className="hero__sub">
          {isFull
            ? "Har full mock ke section-wise marks record karo — correct, wrong, total, time. Naam aur date ke saath."
            : `${cat.label} ke har test ke marks record karo — correct, wrong, total, time. Naam aur date ke saath.`}
        </p>
      </section>

      <section className="section" style={{ marginTop: 12 }}>
        <button className="btn btn--primary btn--sm" onClick={() => (open ? (setOpen(false), resetForm()) : setOpen(true))}>
          {open ? "✕ Cancel" : `➕ Add ${cat.label} marks`}
        </button>

        {open && (
          <div className="glass-card" style={{ marginTop: 12 }}>
            <div className="row" style={{ gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div style={{ flex: "2 1 220px" }}>
                <label className="vd-label">Naam</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder={isFull ? "e.g. Testbook CGL Full Mock 12" : `e.g. ${cat.label} Test 5`} />
              </div>
              <div style={{ flex: "1 1 150px" }}>
                <label className="vd-label">Date</label>
                <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>

            {isFull ? (
              <>
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
              </>
            ) : (
              // A subject test — one set of numbers.
              <div className="mt-16" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
                {[["correct", "Correct ✅"], ["wrong", "Wrong ❌"], ["total", "Total Q"], ["timeMin", "Time (min)"]].map(([k, lbl]) => (
                  <div key={k}>
                    <label className="vd-label">{lbl}</label>
                    <input className="input" type="number" min="0" value={sections[0]?.[k] ?? ""} onChange={(e) => setSec(0, k, e.target.value)} />
                  </div>
                ))}
                <div>
                  <label className="vd-label">Score</label>
                  <div className="input" style={{ display: "flex", alignItems: "center", color: "var(--accent-2)", fontWeight: 700 }}>{draftTotals.score}</div>
                </div>
                <div>
                  <label className="vd-label">Accuracy</label>
                  <div className="input" style={{ display: "flex", alignItems: "center", color: "var(--accent-2)", fontWeight: 700 }}>{draftTotals.accuracy}%</div>
                </div>
              </div>
            )}

            {err && <p style={{ color: "var(--danger)", fontSize: "0.85rem", marginTop: 10 }}>{err}</p>}
            <div className="row mt-16" style={{ gap: 8 }}>
              <button className="btn btn--primary btn--sm" onClick={save}>💾 Save</button>
              <button className="btn btn--ghost btn--sm" onClick={() => { setOpen(false); resetForm(); }}>Cancel</button>
            </div>
          </div>
        )}
      </section>

      <section className="section">
        {mocks.length === 0 ? (
          <div className="placeholder">Abhi koi {cat.label} record nahi. Upar “➕ Add {cat.label} marks” se daalo.</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {mocks.map((m) => {
              const t = mockTotals(m);
              return (
                <div className="glass-card" key={m.id}>
                  <div className="row between" style={{ flexWrap: "wrap", gap: 8, alignItems: "flex-start" }}>
                    <div>
                      <strong style={{ fontSize: "1.02rem" }}>{m.name}</strong>
                      <div className="muted" style={{ fontSize: "0.8rem", marginTop: 2 }}>📅 {fmtDate(m.date)}</div>
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
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}

export default function MockMarksPage() {
  return (
    <Suspense fallback={<section className="hero"><span className="hero__eyebrow">📊 Mock Marks</span></section>}>
      <MockMarksInner />
    </Suspense>
  );
}
