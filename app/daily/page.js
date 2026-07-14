"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSettings, saveQuiz } from "@/lib/storage";
import { ocrImage, extractPdfTextSmart, generateQuizChunked } from "@/lib/client-ai";
import { keyFor } from "@/lib/qstats";
import PyqQuestionCard from "@/components/PyqQuestionCard";
import {
  todayKey, getDayQuestions, getDailyDates, addDailyQuestions,
  addDailyQuestion, updateDailyQuestion, removeDailyQuestion, clearDay, buildDailyQuiz,
} from "@/lib/daily";

const EMPTY_MANUAL = { question: "", options: ["", "", "", ""], answer: 0, explanation: "" };

export default function DailyQuizPage() {
  const router = useRouter();
  const [dateKey, setDateKey] = useState("");
  const [list, setList] = useState([]);
  const [dates, setDates] = useState([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [manual, setManual] = useState(EMPTY_MANUAL);
  const imgRef = useRef(null);
  const pdfRef = useRef(null);

  const refresh = (key) => {
    const k = key || dateKey;
    setList(getDayQuestions(k));
    setDates(getDailyDates());
  };

  // pick today's date on mount (client-only so SSR + hydration match)
  useEffect(() => {
    const k = todayKey();
    setDateKey(k);
    setList(getDayQuestions(k));
    setDates(getDailyDates());
  }, []);

  const changeDate = (k) => {
    setDateKey(k);
    setError(""); setStatus("");
    setList(getDayQuestions(k));
  };

  const isToday = dateKey === todayKey();

  // ---- add from images / PDFs (OCR/text -> DeepSeek builds full MCQs) ----
  const needKey = () => {
    if (!getSettings().apiKey) { setError("Add your DeepSeek API key in Settings first."); return true; }
    return false;
  };

  const ingestText = async (text, label) => {
    if (!text || text.trim().length < 12) throw new Error(`${label}: padha nahi jaa saka — saaf image/PDF try karo.`);
    setStatus(`${label}: questions banaye ja rahe hain…`);
    const { questions } = await generateQuizChunked(text, (i, n, so) =>
      setStatus(`${label}: extracting — part ${i}/${n} (so far ${so})…`));
    return Array.isArray(questions) ? questions : [];
  };

  const processImages = async (files) => {
    if (!files.length || needKey()) return;
    setError(""); setStatus(""); setBusy(true);
    try {
      let all = [];
      for (let i = 0; i < files.length; i++) {
        setStatus(`📷 Image ${i + 1}/${files.length} padha ja raha hai (OCR)…`);
        let text = "";
        try { text = await ocrImage(files[i]); } catch { /* skip bad image */ }
        if (text && text.trim().length > 10) {
          const qs = await ingestText(text, `Image ${i + 1}/${files.length}`);
          all = all.concat(qs);
        }
      }
      if (!all.length) throw new Error("Koi question nahi mila. Question + options saaf dikhne chahiye.");
      const added = addDailyQuestions(dateKey, all);
      refresh();
      setStatus(`Done! ${added} question${added === 1 ? "" : "s"} added${all.length - added > 0 ? ` · ${all.length - added} duplicate skipped` : ""}.`);
    } catch (err) { setError(err.message); setStatus(""); }
    finally { setBusy(false); if (imgRef.current) imgRef.current.value = ""; }
  };
  const handleImages = (e) => processImages(Array.from(e.target.files || []));

  const processPdfs = async (files) => {
    if (!files.length || needKey()) return;
    setError(""); setStatus(""); setBusy(true);
    try {
      let all = [];
      for (let f = 0; f < files.length; f++) {
        const name = files[f].name || `PDF ${f + 1}`;
        setStatus(`📄 ${name}: reading pages…`);
        let text = "";
        try {
          const res = await extractPdfTextSmart(files[f], (p) => {
            if (p.phase === "text") setStatus(`📄 ${name}: reading page ${p.page}/${p.total}…`);
            else setStatus(`📄 ${name}: scanned — OCR page ${p.page}/${p.total}…`);
          });
          text = res.text || "";
        } catch (err) { console.warn(err); }
        if (text && text.trim().length > 12) {
          const qs = await ingestText(text, name);
          all = all.concat(qs);
        }
      }
      if (!all.length) throw new Error("PDF se koi question nahi bana. Text-based ya saaf scan PDF try karo.");
      const added = addDailyQuestions(dateKey, all);
      refresh();
      setStatus(`Done! ${added} question${added === 1 ? "" : "s"} added${all.length - added > 0 ? ` · ${all.length - added} duplicate skipped` : ""}.`);
    } catch (err) { setError(err.message); setStatus(""); }
    finally { setBusy(false); if (pdfRef.current) pdfRef.current.value = ""; }
  };
  const handlePdfs = (e) => processPdfs(Array.from(e.target.files || []));

  const pasteImage = async () => {
    if (needKey()) return;
    try {
      if (!navigator.clipboard?.read) { setError("Paste button isn't supported — use Ctrl+V instead."); return; }
      const items = await navigator.clipboard.read();
      const files = [];
      for (const it of items) {
        const type = it.types.find((t) => t.startsWith("image/"));
        if (type) { const blob = await it.getType(type); files.push(new File([blob], "pasted.png", { type })); }
      }
      if (!files.length) { setError("No image found in the clipboard."); return; }
      processImages(files);
    } catch (err) { setError("Paste failed: " + err.message); }
  };

  // Ctrl+V anywhere pastes a screenshot into today's pool
  useEffect(() => {
    const onPaste = (e) => {
      const files = [];
      for (const it of e.clipboardData?.items || []) {
        if (it.type && it.type.startsWith("image/")) { const fl = it.getAsFile(); if (fl) files.push(fl); }
      }
      if (files.length && !busy) { e.preventDefault(); processImages(files); }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, dateKey]);

  // ---- manual add ----
  const setOpt = (i, v) => setManual((m) => ({ ...m, options: m.options.map((o, oi) => (oi === i ? v : o)) }));
  const addManual = () => {
    const opts = manual.options.map((o) => o.trim()).filter(Boolean);
    if (!manual.question.trim()) { setError("Question likho."); return; }
    if (opts.length < 2) { setError("Kam se kam 2 options do."); return; }
    if (manual.answer >= opts.length) { setError("Correct option chuno jo bhara ho."); return; }
    // answer index must map to the trimmed/filtered list
    const correctText = manual.options[manual.answer]?.trim();
    const answer = Math.max(0, opts.indexOf(correctText));
    const q = { question: manual.question.trim(), options: opts, answer, explanation: manual.explanation.trim(), diagram: "" };
    const added = addDailyQuestion(dateKey, q);
    if (!added) { setError("Ye question already added hai."); return; }
    setManual(EMPTY_MANUAL); setError(""); setStatus("Added ✅"); refresh();
  };

  const removeOne = (i) => setList(removeDailyQuestion(dateKey, i));
  const onClear = () => { if (confirm(`Clear all ${list.length} questions of ${dateKey}?`)) { clearDay(dateKey); refresh(); } };

  const attempt = () => {
    const quiz = buildDailyQuiz(dateKey);
    if (!quiz.questions.length) { setError("Pehle kuch questions add karo."); return; }
    saveQuiz(quiz);
    router.push(`/quizzes/${quiz.id}`);
  };

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">🗓️ Daily Quiz</span>
          <Link href="/mistakes" className="btn btn--ghost btn--sm">🔴 Mistake Notebook</Link>
        </div>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.7rem, 4vw, 2.6rem)" }}>
          Daily <span className="grad">Quiz</span>
        </h1>
        <p className="hero__sub">
          Din bhar jo questions milen (sectional / mock / extra) unhe yahan daalo — end of day dobara attempt karo.
          Galat → Mistake Notebook, sahi → done. 💪
        </p>
      </section>

      {/* Date picker */}
      <section className="section" style={{ marginTop: 12 }}>
        <div className="glass-card">
          <div className="row between" style={{ flexWrap: "wrap", gap: 10 }}>
            <div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <label className="muted" style={{ fontSize: "0.85rem" }}>Day:</label>
              <input type="date" className="select" style={{ width: "auto", padding: "8px 12px" }}
                value={dateKey} max={todayKey()} onChange={(e) => e.target.value && changeDate(e.target.value)} />
              {!isToday && (
                <button className="btn btn--ghost btn--sm" onClick={() => changeDate(todayKey())}>Aaj pe jao →</button>
              )}
              <span className="badge badge--ok">{list.length} Q{isToday ? " · today" : ""}</span>
            </div>
            {dates.length > 0 && (
              <div className="row" style={{ gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                <span className="muted" style={{ fontSize: "0.8rem" }}>Saved:</span>
                {dates.slice(0, 6).map((d) => (
                  <button key={d.dateKey} className={`chip chip--btn chip--sm ${d.dateKey === dateKey ? "is-active" : ""}`}
                    onClick={() => changeDate(d.dateKey)}>{d.dateKey.slice(5)} · {d.count}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Add questions */}
      <section className="section" style={{ marginTop: 12 }}>
        <div className="glass-card">
          <div className="row between" style={{ flexWrap: "wrap", gap: 12 }}>
            <div>
              <h3>➕ Add questions to {isToday ? "today" : dateKey}</h3>
              <p className="muted mt-8" style={{ maxWidth: 520 }}>
                Screenshot paste karo (Ctrl+V), image/PDF upload karo — AI question + options nikaal lega.
                Ya neeche khud type karo.
              </p>
            </div>
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <button className="btn btn--ghost" onClick={pasteImage} disabled={busy}>📋 Paste</button>
              <label className="btn btn--primary" style={{ opacity: busy ? 0.6 : 1, pointerEvents: busy ? "none" : "auto" }}>
                {busy ? "Working…" : "📷 Image(s)"}
                <input ref={imgRef} type="file" accept="image/*" multiple hidden onChange={handleImages} />
              </label>
              <label className="btn btn--ghost" style={{ opacity: busy ? 0.6 : 1, pointerEvents: busy ? "none" : "auto" }}>
                {busy ? "Working…" : "📄 PDF(s)"}
                <input ref={pdfRef} type="file" accept="application/pdf" multiple hidden onChange={handlePdfs} />
              </label>
              <button className="btn btn--ghost" onClick={() => setShowManual((v) => !v)} disabled={busy}>
                {showManual ? "✕ Close" : "✍️ Type it"}
              </button>
            </div>
          </div>
          {status && <p className="mt-16" style={{ color: "var(--accent-2)", fontSize: "0.9rem" }}>{status}</p>}
          {error && <p className="mt-16" style={{ color: "var(--danger)", fontSize: "0.9rem" }}>{error}</p>}

          {showManual && (
            <div className="mt-16" style={{ display: "grid", gap: 10, borderTop: "1px solid var(--glass-border)", paddingTop: 16 }}>
              <textarea className="input" rows={2} placeholder="Question…" value={manual.question}
                onChange={(e) => setManual((m) => ({ ...m, question: e.target.value }))} />
              {manual.options.map((o, i) => (
                <label key={i} className="row" style={{ gap: 10, alignItems: "center" }}>
                  <input type="radio" name="daily-correct" checked={manual.answer === i}
                    onChange={() => setManual((m) => ({ ...m, answer: i }))} title="Mark correct" />
                  <input className="input" style={{ flex: 1 }} placeholder={`Option ${String.fromCharCode(65 + i)}${i === manual.answer ? " (correct)" : ""}`}
                    value={o} onChange={(e) => setOpt(i, e.target.value)} />
                </label>
              ))}
              <textarea className="input" rows={2} placeholder="Explanation (optional)…" value={manual.explanation}
                onChange={(e) => setManual((m) => ({ ...m, explanation: e.target.value }))} />
              <div className="row" style={{ gap: 8 }}>
                <button className="btn btn--primary btn--sm" onClick={addManual}>➕ Add question</button>
                <span className="muted" style={{ fontSize: "0.78rem", alignSelf: "center" }}>Radio se correct option select karo.</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Collected list + attempt */}
      <section className="section">
        <div className="section__head">
          <h2>Questions · {isToday ? "Today" : dateKey}</h2>
          <p>{list.length ? "End of day pe attempt karo — repeat karke yaad hoga." : "Abhi tak koi question nahi. Upar se add karo."}</p>
        </div>

        {list.length > 0 && (
          <div className="row between" style={{ gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
            <button className="btn btn--primary" onClick={attempt}>🎯 Attempt this day's quiz ({list.length})</button>
            <button className="btn btn--ghost btn--sm" onClick={onClear}>🗑️ Clear day</button>
          </div>
        )}

        {list.length === 0 ? (
          <div className="placeholder">No questions yet. Paste a screenshot or type one above. ✍️</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {list.map((q, i) => (
              <PyqQuestionCard
                key={keyFor(q) || i}
                q={q}
                index={i}
                chapterName="Daily Quiz"
                chapterId={dateKey}
                archiveOnAnswer
                fileToChapter
                onDelete={() => removeOne(i)}
                onEdit={(nq) => { updateDailyQuestion(dateKey, i, nq); refresh(); }}
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
