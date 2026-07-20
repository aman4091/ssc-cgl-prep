"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getEntry, updateEntry } from "@/lib/feed";
import { isCaBankId, loadCaBankEntry, loadCaBankIndex, caBankId } from "@/lib/cabank";
import { saveQuiz, makeId, getSettings } from "@/lib/storage";
import { verifyQuiz, askAI } from "@/lib/client-ai";
import { openFile } from "@/lib/filestore";
import YouTubePlayer from "@/components/YouTubePlayer";
import Markdown from "@/components/Markdown";
import QuestionEditor from "@/components/QuestionEditor";
import FeedUploader from "@/components/FeedUploader";
import AskButtons from "@/components/AskButtons";
import PasteAnswer from "@/components/PasteAnswer";

const letter = (i) => (i != null && i >= 0 ? String.fromCharCode(65 + i) : "?");

export default function CurrentAffairsDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [entry, setEntry] = useState(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  // Sibling periods, so you can change date/month without going back to a grid.
  const [siblings, setSiblings] = useState([]);
  const [tab, setTab] = useState("daily");

  // answer verification
  const [verifying, setVerifying] = useState(false);
  const [vStatus, setVStatus] = useState("");
  const [reports, setReports] = useState(null); // [{ i, q, suggested, confidence, reason, agree, applied }]

  // auto detailed explanations (Gemini, cached on each question as `detail`)
  const [genBusy, setGenBusy] = useState(false);
  const [genStatus, setGenStatus] = useState("");
  const [editIdx, setEditIdx] = useState(null); // which question is being edited
  const genRef = useRef(false);

  const saveEdit = (qi, nq) => {
    // clear the cached explanation so the corrected question gets a fresh one
    const cur = (getEntry(id)?.questions || []).map((x, i) => (i === qi ? { ...nq, detail: "" } : x));
    updateEntry(id, { questions: cur });
    setEntry(getEntry(id));
    setEditIdx(null);
    genRef.current = false; // let the auto-effect regenerate the cleared explanation
  };

  // Built-in months (cabank_2026-01) are static files, not localStorage entries.
  const builtin = isCaBankId(id);
  const refresh = () => { if (!builtin) setEntry(getEntry(id)); };
  useEffect(() => {
    if (builtin) {
      let alive = true;
      loadCaBankEntry(id).then((e) => { if (alive) { setEntry(e); setReady(true); } });
      loadCaBankIndex().then((b) => {
        if (!alive || !b) return;
        // Whichever list this entry belongs to is the one worth offering.
        const inDays = (b.days || []).some((d) => caBankId(d.period) === id);
        setTab(inDays ? "daily" : "monthly");
        const list = inDays ? b.days : b.months;
        setSiblings((list || []).slice().sort((a, b2) => (a.period < b2.period ? 1 : -1)));
      });
      return () => { alive = false; };
    }
    refresh(); setReady(true);
    /* eslint-disable-next-line */
  }, [id]);

  const caPromptFor = (q) => {
    const opts = (q.options || []).map((o, i) => `${letter(i)}) ${o}`).join("\n");
    const correct = q.answer != null ? `${letter(q.answer)}) ${q.options[q.answer]}` : "";
    return `Question: ${q.question}\nOptions:\n${opts}\nCorrect answer: ${correct}`;
  };
  const hasKey = () => Boolean(getSettings().apiKey || getSettings().geminiApiKey);

  // generate explanations for every question missing one, one by one (cached).
  const runGenerate = async () => {
    setGenBusy(true); setError("");
    try {
      let qs = getEntry(id)?.questions || [];
      for (let idx = 0; idx < qs.length; idx++) {
        if (qs[idx].detail) continue;
        setGenStatus(`Explanation ${idx + 1}/${qs.length}…`);
        try {
          const { answer } = await askAI({ question: caPromptFor(qs[idx]), mode: "ca" });
          if (answer) {
            const cur = getEntry(id)?.questions || [];
            qs = cur.map((q, i) => (i === idx ? { ...q, detail: answer } : q));
            updateEntry(id, { questions: qs });
            setEntry(getEntry(id));
          }
        } catch (e) { console.warn("ca explain failed", e); }
      }
    } finally { setGenBusy(false); setGenStatus(""); }
  };

  // auto-run once when the page opens, if any question lacks an explanation.
  useEffect(() => {
    if (!entry || genRef.current || genBusy || builtin) return;   // builtin ships its own explanations
    const qs = entry.questions || [];
    if (qs.length === 0 || qs.every((q) => q.detail)) return;
    if (!hasKey()) return; // needs a DeepSeek or Gemini key
    genRef.current = true;
    runGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry]);

  const regenerate = () => {
    const cur = (getEntry(id)?.questions || []).map((q) => ({ ...q, detail: "" }));
    updateEntry(id, { questions: cur });
    setEntry(getEntry(id));
    genRef.current = false; // let the auto-effect re-run
  };

  const startQuiz = () => {
    if (!entry?.questions?.length) { setError("No questions in this entry."); return; }
    const label = entry.date || entry.title || "Quiz";
    const quiz = {
      id: makeId(), title: `${label} · Quiz`, source: `${entry.feed} · ${entry.bucket}`,
      createdAt: new Date().toISOString(), questions: entry.questions,
    };
    saveQuiz(quiz);
    router.push(`/quizzes/${quiz.id}`);
  };

  const verifyAnswers = async () => {
    if (!entry?.questions?.length) return;
    if (!getSettings().apiKey) { setError("Add your DeepSeek API key in Settings first."); return; }
    setError(""); setReports(null); setVerifying(true);
    try {
      const { results } = await verifyQuiz(entry.questions, (done, total) =>
        setVStatus(`Checking answers… ${done}/${total}`));
      const rep = results.map((r) => {
        const q = entry.questions[r.i];
        if (!q) return null;
        return { i: r.i, q, suggested: r.correct, confidence: r.confidence, reason: r.reason, agree: r.correct === q.answer, applied: false };
      }).filter(Boolean);
      setReports(rep);
    } catch (err) { setError(err.message); }
    finally { setVerifying(false); setVStatus(""); }
  };

  const applyFix = (i, newAnswer) => {
    const qs = (entry.questions || []).map((q, idx) => (idx === i ? { ...q, answer: newAnswer } : q));
    updateEntry(entry.id, { questions: qs });
    refresh();
    setReports((rs) => rs.map((r) => (r.i === i ? { ...r, agree: true, applied: true } : r)));
  };

  const applyAllHigh = () => {
    const fixes = (reports || []).filter((r) => !r.agree && r.confidence === "high");
    if (!fixes.length) return;
    const map = new Map(fixes.map((r) => [r.i, r.suggested]));
    const qs = (entry.questions || []).map((q, idx) => (map.has(idx) ? { ...q, answer: map.get(idx) } : q));
    updateEntry(entry.id, { questions: qs });
    refresh();
    setReports((rs) => rs.map((r) => (map.has(r.i) ? { ...r, agree: true, applied: true } : r)));
  };

  const openPdf = async (pid) => { try { await openFile(pid); } catch (err) { setError(err.message); } };

  if (ready && !entry) {
    return (
      <section className="section" style={{ marginTop: 24 }}>
        <div className="glass-card center">
          <h2>Entry not found</h2>
          <p className="muted mt-8">Ye entry delete ho chuki hai ya kisi doosre device par hai.</p>
          <Link href="/current-affairs" className="btn btn--primary mt-16">← Current Affairs</Link>
        </div>
      </section>
    );
  }
  if (!entry) return null;

  const heading = entry.date || entry.title || "Untitled";
  const noteCount = (entry.notes || []).reduce((a, g) => a + (g.points?.length || 0), 0);
  const mism = reports ? reports.filter((r) => !r.agree) : [];
  const highFixes = mism.filter((r) => r.confidence === "high").length;

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">📰 Current Affairs</span>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            {/* Change date/month right here — the tab now opens the newest entry
                rather than a grid, so this is how you reach the others. */}
            {siblings.length > 1 && (
              <select
                className="input"
                style={{ width: "auto", padding: "5px 9px", fontSize: "0.85rem" }}
                value={id}
                onChange={(e) => router.push(`/current-affairs/${e.target.value}`)}
              >
                {siblings.map((p) => (
                  <option key={p.period} value={caBankId(p.period)}>
                    {p.label} ({p.count})
                  </option>
                ))}
              </select>
            )}
            <Link href={`/current-affairs?tab=${tab}&all=1`} className="btn btn--ghost btn--sm">
              All dates
            </Link>
          </div>
        </div>
        <div className="row between mt-8" style={{ alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
          <h1 className="hero__title" style={{ fontSize: "clamp(1.5rem, 4vw, 2.2rem)" }}>📅 {heading}</h1>
          {entry.questions?.length > 0 && (
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              {!builtin && (
                <button className="btn btn--ghost" onClick={verifyAnswers} disabled={verifying}>
                  {verifying ? (vStatus || "Verifying…") : "🔍 Verify answers"}
                </button>
              )}
              <button className="btn btn--primary" onClick={startQuiz}>🎯 Start Quiz ({entry.questions.length})</button>
            </div>
          )}
        </div>
        <p className="hero__sub">
          {entry.questions?.length || 0} questions
          {noteCount > 0 ? ` · 📌 ${noteCount} important facts` : ""}
          {entry.videoUrl ? " · ▶ video" : ""}
        </p>
      </section>

      {error && <p className="section" style={{ color: "var(--danger)", fontSize: "0.9rem" }}>{error}</p>}

      {/* Add questions / notes to this date — built-in months are read-only */}
      {!builtin && (
        <section className="section" style={{ marginTop: 12 }}>
          <FeedUploader entry={entry} onChanged={refresh} />
        </section>
      )}

      {/* Answer verification report */}
      {reports && (
        <section className="section" style={{ marginTop: 12 }}>
          <div className="glass-card">
            <div className="row between" style={{ flexWrap: "wrap", gap: 10 }}>
              <h3>🔍 Answer check</h3>
              {highFixes > 0 && <button className="btn btn--primary btn--sm" onClick={applyAllHigh}>Apply all confident fixes ({highFixes})</button>}
            </div>
            <p className="muted mt-8" style={{ fontSize: "0.86rem" }}>
              {reports.length} checked · {reports.length - mism.length} look correct · {mism.length} to review.
              {" "}Recent current-affairs facts pe AI unsure ho sakta hai (⚠️ low) — aisi jagah apne PDF ko final maano.
            </p>

            {mism.length === 0 ? (
              <p className="mt-16" style={{ color: "var(--success)", fontWeight: 600 }}>✅ Sab answers sahi lag rahe hain.</p>
            ) : (
              <div className="mt-16" style={{ display: "grid", gap: 14 }}>
                {mism.map((r) => (
                  <div key={r.i} className="answer-box" style={{ borderColor: r.confidence === "high" ? "var(--ok-wash)" : "rgba(251,191,36,0.4)" }}>
                    <div className="row between" style={{ gap: 8, alignItems: "flex-start", flexWrap: "wrap" }}>
                      <p style={{ fontWeight: 600, flex: 1, minWidth: 200 }}>{r.q.question}</p>
                      <span className="chip" style={{ fontSize: "0.75rem", color: r.confidence === "high" ? "var(--success)" : "var(--warning)" }}>
                        {r.confidence === "high" ? "Confident" : "⚠️ Unsure"}
                      </span>
                    </div>
                    <p className="mt-8" style={{ fontSize: "0.9rem" }}>
                      Current: <strong style={{ color: "var(--danger)" }}>{letter(r.q.answer)}) {r.q.options[r.q.answer]}</strong>
                    </p>
                    <p style={{ fontSize: "0.9rem" }}>
                      AI suggests: <strong style={{ color: "var(--success)" }}>{letter(r.suggested)}) {r.q.options[r.suggested]}</strong>
                    </p>
                    {r.reason && <p className="muted mt-8" style={{ fontSize: "0.84rem" }}>{r.reason}</p>}
                    {!r.applied && (
                      <div className="row mt-12" style={{ gap: 8, flexWrap: "wrap" }}>
                        <button className="btn btn--primary btn--sm" onClick={() => applyFix(r.i, r.suggested)}>✅ Use AI&apos;s answer</button>
                        <button className="btn btn--ghost btn--sm" onClick={() => setReports((rs) => rs.map((x) => (x.i === r.i ? { ...x, agree: true } : x)))}>Keep current</button>
                      </div>
                    )}
                    {r.applied && <p className="mt-8" style={{ color: "var(--success)", fontSize: "0.85rem", fontWeight: 600 }}>✓ Updated</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Questions + auto detailed explanations */}
      {entry.questions?.length > 0 && (
        <section className="section" style={{ marginTop: 12 }}>
          <div className="glass-card">
            <div className="row between" style={{ flexWrap: "wrap", gap: 10 }}>
              <h3>📝 Questions &amp; Explanations</h3>
              {builtin ? (
                <span className="muted" style={{ fontSize: "0.8rem" }}>
                  📚 Ready-made{entry.source ? ` · ${entry.source}` : ""}
                </span>
              ) : genBusy ? (
                <span className="muted" style={{ fontSize: "0.85rem", color: "var(--accent-2)" }}>{genStatus || "Generating…"}</span>
              ) : (
                <button className="btn btn--ghost btn--sm" onClick={regenerate}>🔄 Regenerate</button>
              )}
            </div>
            {!builtin && !hasKey() && (
              <p className="hint" style={{ marginTop: 8 }}>💡 Explanations ke liye Settings mein DeepSeek ya Gemini API key daalo (Gemini recent facts pe behtar hai).</p>
            )}
            <div className="mt-16" style={{ display: "grid", gap: 16 }}>
              {entry.questions.map((q, qi) => (
                <div key={qi} className="answer-box">
                  <div className="q-head">
                    <p style={{ fontWeight: 600, flex: 1 }}>{qi + 1}. {q.question}</p>
                    {editIdx !== qi && (
                      <div className="q-head__actions">
                        <AskButtons q={q} />
                        {!builtin && (
                          <button className="btn btn--ghost btn--sm" onClick={() => setEditIdx(qi)} title="Edit question">✏️ Edit</button>
                        )}
                      </div>
                    )}
                  </div>
                  {editIdx !== qi && <PasteAnswer q={q} />}
                  {editIdx === qi ? (
                    <QuestionEditor question={q} onSave={(nq) => saveEdit(qi, nq)} onCancel={() => setEditIdx(null)} />
                  ) : (
                    <>
                      <div className="grid" style={{ gap: 6, marginTop: 10 }}>
                        {q.options.map((opt, oi) => {
                          const isAns = oi === q.answer;
                          return (
                            <div key={oi} style={{
                              padding: "8px 12px", borderRadius: 8, fontSize: "0.9rem",
                              border: "1px solid " + (isAns ? "var(--ok)" : "var(--glass-border)"),
                              background: isAns ? "var(--ok-wash)" : "var(--bg)",
                            }}>
                              <strong style={{ opacity: 0.7, marginRight: 6 }}>{letter(oi)}</strong>{opt}
                              {isAns && <span style={{ color: "var(--success)", marginLeft: 6 }}>✓</span>}
                            </div>
                          );
                        })}
                      </div>
                      {q.detail ? (
                        <div className="mt-12" style={{ borderTop: "1px dashed var(--glass-border)", paddingTop: 10 }}>
                          <Markdown>{q.detail}</Markdown>
                        </div>
                      ) : genBusy ? (
                        <p className="muted mt-12" style={{ fontSize: "0.84rem" }}>Generating explanation…</p>
                      ) : (
                        <p className="muted mt-12" style={{ fontSize: "0.84rem" }}>No explanation yet — press 🔄 Regenerate{hasKey() ? "" : " (add an API key first)"}.</p>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Video */}
      {entry.videoUrl && (
        <section className="section" style={{ marginTop: 12 }}>
          <div className="glass-card">
            <h3 style={{ marginBottom: 12 }}>▶ Video</h3>
            <YouTubePlayer url={entry.videoUrl} />
          </div>
        </section>
      )}

      {/* Important notes / details */}
      <section className="section" style={{ marginTop: 12 }}>
        <div className="glass-card">
          <div className="row between">
            <h3>📌 Important Facts &amp; Details</h3>
            {noteCount > 0 && <span className="muted" style={{ fontSize: "0.85rem" }}>{noteCount} points</span>}
          </div>
          {noteCount === 0 ? (
            <p className="muted mt-12">
              No notes yet. Go back and add this date&apos;s PDF — questions <em>and</em> important facts are extracted together.
            </p>
          ) : (
            <div className="mt-16" style={{ display: "grid", gap: 18 }}>
              {(entry.notes || []).map((g, gi) => (
                <div key={gi}>
                  <h4 style={{ fontSize: "1rem", color: "var(--accent-2)", marginBottom: 8 }}>{g.heading}</h4>
                  <ul style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 7 }}>
                    {g.points.map((p, pi) => (
                      <li key={pi} style={{ fontSize: "0.95rem", lineHeight: 1.55 }}>{p}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Source PDFs */}
      {entry.pdfs?.length > 0 && (
        <section className="section" style={{ marginTop: 12 }}>
          <div className="glass-card">
            <h3 style={{ marginBottom: 12 }}>📄 Source PDF{entry.pdfs.length > 1 ? "s" : ""}</h3>
            <div style={{ display: "grid", gap: 6 }}>
              {entry.pdfs.map((p) => (
                <button key={p.id} className="link" onClick={() => openPdf(p.id)} style={{ textAlign: "left" }}>
                  📄 {p.name}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
