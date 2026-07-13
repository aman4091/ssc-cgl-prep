"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getTests, addTest, addMock, deleteTest } from "@/lib/exttests";
import { parseTimeToSeconds, formatTime } from "@/lib/youtube";

const EMPTY = { name: "", website: "", url: "", section: "", correct: "", wrong: "", skipped: "", total: "", time: "", date: "", notes: "" };

export default function ExternalTestsPage() {
  const router = useRouter();
  const [tests, setTests] = useState([]);
  const [f, setF] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [mockName, setMockName] = useState("");
  const [showMock, setShowMock] = useState(false);

  const createMock = () => {
    const rec = addMock(mockName || "My Mock");
    setMockName(""); setShowMock(false);
    router.push(`/external-tests/${rec.id}`);
  };

  const refresh = () => setTests(getTests());
  useEffect(() => {
    refresh();
    try { setF((p) => ({ ...p, date: new Date().toISOString().slice(0, 10) })); } catch { /* ignore */ }
  }, []);

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const save = () => {
    if (!f.name.trim()) return;
    const correct = parseInt(f.correct) || 0;
    const wrong = parseInt(f.wrong) || 0;
    const skipped = parseInt(f.skipped) || 0;
    const total = parseInt(f.total) || (correct + wrong + skipped);
    const marks = correct * 2 - wrong * 0.5; // SSC: +2 correct, -0.5 wrong
    addTest({
      name: f.name.trim(), website: f.website.trim(), url: f.url.trim(), section: f.section.trim(),
      correct, wrong, skipped, total, marks, timeSec: parseTimeToSeconds(f.time), date: f.date, notes: f.notes.trim(),
    });
    setF({ ...EMPTY, website: f.website, url: f.url, date: f.date }); // keep website/url/date for next
    setShowForm(false);
    refresh();
  };

  const del = (id) => { if (confirm("Delete this record?")) { deleteTest(id); refresh(); } };


  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between" style={{ flexWrap: "wrap", gap: 8 }}>
          <span className="hero__eyebrow">🌐 External Tests</span>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn--ghost btn--sm" onClick={() => setShowMock((v) => !v)}>{showMock ? "✕ Close" : "🧩 Build a mock"}</button>
            <button className="btn btn--primary btn--sm" onClick={() => setShowForm((v) => !v)}>{showForm ? "✕ Close" : "➕ Log a score"}</button>
          </div>
        </div>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.7rem, 4vw, 2.6rem)" }}>
          External <span className="grad">Tests</span>
        </h1>
        <p className="hero__sub">
          A record of tests taken on other websites — score, time, section, link. All in one place, so you can see progress and reopen a test directly.
        </p>
      </section>

      {/* Create a mock */}
      {showMock && (
        <section className="section" style={{ marginTop: 12 }}>
          <div className="glass-card">
            <h3>🧩 New mock test</h3>
            <p className="muted mt-8" style={{ fontSize: "0.85rem" }}>
              Name do → phir builder mein sections (Maths, Reasoning…) banao, question screenshots paste karo,
              aur har section ka time set karke timed test do.
            </p>
            <div className="row mt-12" style={{ gap: 10, flexWrap: "wrap" }}>
              <input className="input" style={{ flex: 1, minWidth: 200 }} placeholder="Mock name (e.g. CGL Mock 12)"
                value={mockName} onChange={(e) => setMockName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") createMock(); }} />
              <button className="btn btn--primary" onClick={createMock}>Create & build →</button>
            </div>
          </div>
        </section>
      )}

      {/* Accuracy note (top cards removed) */}
      {tests.length > 0 && (
        <section className="section" style={{ marginTop: 8 }}>
          <p className="muted" style={{ fontSize: "0.8rem" }}>
            ℹ️ Accuracy = <strong>Correct ÷ Attempted (Correct + Wrong) × 100</strong> — skipped questions count nahi hote.
            Jaise 48 correct + 17 wrong = 65 attempted → (48 ÷ 65) × 100 = <strong>73.85%</strong>.
          </p>
        </section>
      )}

      {/* Add form */}
      {showForm && (
        <section className="section" style={{ marginTop: 12 }}>
          <div className="glass-card">
            <h3>➕ Test record</h3>
            <div className="form-grid mt-16">
              <label className="field"><span>Test name *</span><input className="input" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. CGL Mock 12" /></label>
              <label className="field"><span>Website</span><input className="input" value={f.website} onChange={(e) => set("website", e.target.value)} placeholder="e.g. Testbook / Adda247" /></label>
              <label className="field" style={{ gridColumn: "1 / -1" }}><span>Test link (URL)</span><input className="input" value={f.url} onChange={(e) => set("url", e.target.value)} placeholder="https://…  (to retake later)" /></label>
              <label className="field"><span>Section / subject</span><input className="input" value={f.section} onChange={(e) => set("section", e.target.value)} placeholder="e.g. Maths / Full mock" /></label>
              <label className="field"><span>Date</span><input className="input" type="date" value={f.date} onChange={(e) => set("date", e.target.value)} /></label>
              <label className="field"><span>Correct</span><input className="input" type="number" value={f.correct} onChange={(e) => set("correct", e.target.value)} placeholder="0" /></label>
              <label className="field"><span>Wrong</span><input className="input" type="number" value={f.wrong} onChange={(e) => set("wrong", e.target.value)} placeholder="0" /></label>
              <label className="field"><span>Skipped</span><input className="input" type="number" value={f.skipped} onChange={(e) => set("skipped", e.target.value)} placeholder="0" /></label>
              <label className="field"><span>Total (auto if blank)</span><input className="input" type="number" value={f.total} onChange={(e) => set("total", e.target.value)} placeholder="e.g. 100" /></label>
              <label className="field"><span>Time (mm:ss)</span><input className="input" value={f.time} onChange={(e) => set("time", e.target.value)} placeholder="e.g. 55:30" /></label>
              <label className="field" style={{ gridColumn: "1 / -1" }}><span>Notes</span><input className="input" value={f.notes} onChange={(e) => set("notes", e.target.value)} placeholder="what went wrong, what to improve…" /></label>
            </div>
            <div className="glass mt-16" style={{ padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <span className="muted" style={{ fontSize: "0.82rem" }}>SSC marks — <strong>+2</strong> per correct, <strong>−0.5</strong> per wrong</span>
              <span style={{ fontSize: "1.3rem", fontWeight: 800 }} className="grad">
                {((parseInt(f.correct) || 0) * 2 - (parseInt(f.wrong) || 0) * 0.5).toFixed(1)} marks
              </span>
            </div>
            <div className="row mt-16" style={{ gap: 10 }}>
              <button className="btn btn--primary" onClick={save} disabled={!f.name.trim()}>Save record</button>
              <button className="btn btn--ghost" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        </section>
      )}

      {/* List */}
      <section className="section">
        <div className="section__head"><h2>Your test log</h2><p>{tests.length ? `${tests.length} tests recorded` : "No records yet — start with ‘Add test’."}</p></div>
        {tests.length === 0 ? (
          <div className="placeholder">No external test records. Add one above. 📝</div>
        ) : (
          <div className="grid grid--2">
            {tests.map((t) => {
              const attempted = (t.correct || 0) + (t.wrong || 0);
              const acc = attempted ? ((t.correct / attempted) * 100).toFixed(2) : "0";
              const isMock = Array.isArray(t.sections);
              if (isMock) {
                const qn = t.sections.reduce((a, s) => a + (s.questions?.length || 0), 0);
                const mins = t.sections.reduce((a, s) => a + (Number(s.timeMin) || 0), 0);
                return (
                  <article key={t.id} className="glass-card">
                    <div className="row between" style={{ alignItems: "flex-start", gap: 10 }}>
                      <div>
                        <h3 style={{ fontSize: "1.05rem" }}>🧩 {t.name}</h3>
                        <p className="muted mt-8" style={{ fontSize: "0.8rem" }}>
                          <span className="type-tag">Mock</span>{" "}
                          {t.sections.length} section{t.sections.length !== 1 ? "s" : ""} · {qn} Q · {mins} min
                        </p>
                      </div>
                      <button className="btn btn--ghost btn--sm" onClick={() => del(t.id)}>✕</button>
                    </div>
                    <Link href={`/external-tests/${t.id}`} className="btn btn--primary btn--block mt-16">
                      🧩 Open / Take mock
                    </Link>
                  </article>
                );
              }
              return (
                <article key={t.id} className="glass-card">
                  <div className="row between" style={{ alignItems: "flex-start", gap: 10 }}>
                    <div>
                      <h3 style={{ fontSize: "1.05rem" }}>{t.name}</h3>
                      <p className="muted mt-8" style={{ fontSize: "0.8rem" }}>
                        {t.website && <span className="type-tag">{t.website}</span>}{" "}
                        {t.section && <span className="type-tag">{t.section}</span>}{" "}
                        {t.date && <span style={{ marginLeft: 4 }}>{t.date}</span>}
                      </p>
                    </div>
                    <button className="btn btn--ghost btn--sm" onClick={() => del(t.id)}>✕</button>
                  </div>

                  <div className="stat-row mt-16" style={{ gap: 8 }}>
                    <div className="stat glass" style={{ padding: "10px" }}><span className="stat__num grad" style={{ fontSize: "1.3rem" }}>{(t.marks != null ? t.marks : (t.correct || 0) * 2 - (t.wrong || 0) * 0.5).toFixed(1)}</span><span className="stat__label">Marks</span></div>
                    <div className="stat glass" style={{ padding: "10px" }}><span className="stat__num" style={{ fontSize: "1.3rem" }}>{acc}%</span><span className="stat__label">Accuracy</span></div>
                    <div className="stat glass" style={{ padding: "10px" }}><span className="stat__num" style={{ fontSize: "1.3rem", color: "var(--success)" }}>{t.correct}</span><span className="stat__label">Correct</span></div>
                    <div className="stat glass" style={{ padding: "10px" }}><span className="stat__num" style={{ fontSize: "1.3rem", color: "var(--danger)" }}>{t.wrong}</span><span className="stat__label">Wrong</span></div>
                    <div className="stat glass" style={{ padding: "10px" }}><span className="stat__num" style={{ fontSize: "1.3rem", color: "var(--accent-2)" }}>{t.timeSec ? formatTime(t.timeSec) : "–"}</span><span className="stat__label">Time</span></div>
                  </div>

                  <p className="muted mt-12" style={{ fontSize: "0.82rem" }}>
                    {t.correct}/{t.total} correct{t.skipped ? ` · ${t.skipped} skipped` : ""}
                  </p>
                  {t.notes && <p className="muted mt-8" style={{ fontSize: "0.82rem", fontStyle: "italic" }}>📝 {t.notes}</p>}

                  {t.url && (
                    <a href={t.url} target="_blank" rel="noreferrer" className="btn btn--primary btn--block mt-16">🔗 Reopen test</a>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
