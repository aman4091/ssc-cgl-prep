"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CALC_TYPES, buildCalcQuiz, getCalcPool, addCalcPoolQuestions, clearCalcPool, loadCalcBankIndex } from "@/lib/calc";
import { extractPdfTextSmart, generateQuizText, readImageText } from "@/lib/client-ai";
import { saveQuiz, getSettings } from "@/lib/storage";

const ALL = CALC_TYPES.map((t) => t.key);

export default function CalculationPage() {
  const router = useRouter();
  const [sel, setSel] = useState(new Set(ALL));
  const [count, setCount] = useState(20);
  const [sec, setSec] = useState(12);
  const [poolCount, setPoolCount] = useState(0);
  const [bookTopics, setBookTopics] = useState([]);
  const [busy, setBusy] = useState(false);
  const [starting, setStarting] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { setPoolCount(getCalcPool().length); }, []);
  useEffect(() => { loadCalcBankIndex().then(setBookTopics); }, []);

  const requireKey = () => {
    if (!getSettings().apiKey) { setError("Add your DeepSeek API key in Settings first."); return false; }
    return true;
  };

  const handlePdf = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !requireKey()) return;
    setBusy(true); setError(""); setStatus("PDF padhi ja rahi hai…");
    try {
      const { text } = await extractPdfTextSmart(file, (p) => {
        if (p.phase === "text") setStatus(`PDF padhi ja rahi hai… page ${p.page}/${p.total}`);
        else setStatus(`📷 Scanned PDF — OCR ho raha hai… page ${p.page}/${p.total}`);
      });
      if (!text || text.trim().length < 20) throw new Error("Couldn't extract text from this PDF.");
      setStatus("Generating questions…");
      const { questions: qs } = await generateQuizText(text);
      const n = addCalcPoolQuestions(qs);
      setPoolCount(getCalcPool().length);
      setStatus(`Done! Added ${n} questions — they'll now appear randomly in your drills.`);
    } catch (err) { setError(err.message); setStatus(""); }
    finally { setBusy(false); }
  };

  const handleImages = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length || !requireKey()) return;
    setBusy(true); setError(""); setStatus("");
    try {
      let added = 0;
      for (let i = 0; i < files.length; i++) {
        setStatus(`📷 Reading image ${i + 1}/${files.length}…`);
        let text = ""; try { const r = await readImageText(files[i]); text = r.text; } catch { /* skip */ }
        if (text && text.trim().length > 15) {
          setStatus(`Image ${i + 1}/${files.length}: generating questions…`);
          try { const { questions: qs } = await generateQuizText(text); added += addCalcPoolQuestions(qs); } catch (err) { console.warn(err); }
        }
      }
      if (added === 0) throw new Error("No questions could be created from these images.");
      setPoolCount(getCalcPool().length);
      setStatus(`Done! Added ${added} questions.`);
    } catch (err) { setError(err.message); setStatus(""); }
    finally { setBusy(false); }
  };

  const clearPool = () => { if (confirm("Remove uploaded calculation questions?")) { clearCalcPool(); setPoolCount(0); } };

  const pasteImage = async () => {
    if (!requireKey()) return;
    try {
      if (!navigator.clipboard?.read) { setError("Paste button isn't supported — use Ctrl+V instead."); return; }
      const items = await navigator.clipboard.read();
      const files = [];
      for (const it of items) {
        const type = it.types.find((t) => t.startsWith("image/"));
        if (type) { const blob = await it.getType(type); files.push(new File([blob], "pasted.png", { type })); }
      }
      if (!files.length) { setError("Clipboard mein koi image nahi mili."); return; }
      handleImages({ target: { files, value: "" } });
    } catch (e) { setError("Paste failed: " + e.message); }
  };

  // Ctrl+V paste image(s) -> add to pool
  useEffect(() => {
    const onPaste = (e) => {
      const files = [];
      for (const it of e.clipboardData?.items || []) {
        if (it.type?.startsWith("image/")) { const f = it.getAsFile(); if (f) files.push(f); }
      }
      if (files.length && !busy) { e.preventDefault(); handleImages({ target: { files, value: "" } }); }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy]);

  const toggle = (k) => {
    const next = new Set(sel);
    next.has(k) ? next.delete(k) : next.add(k);
    setSel(next);
  };
  const allOn = () => setSel(new Set([...ALL, ...bookTopics.map((t) => t.key)]));
  const clear = () => setSel(new Set());
  const onlyBook = () => setSel(new Set(bookTopics.map((t) => t.key)));

  const start = async () => {
    const keys = sel.size ? [...sel] : ALL;
    setStarting(true); setError("");
    try {
      const quiz = await buildCalcQuiz(keys, count, sec);
      if (!quiz.questions.length) { setError("Koi question nahi bana — dusra type chuno."); return; }
      saveQuiz(quiz);
      router.push(`/quizzes/${quiz.id}`);
    } catch (err) { setError(err.message); }
    finally { setStarting(false); }
  };

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <span className="hero__eyebrow">🧮 Speed Maths</span>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.7rem, 4vw, 2.6rem)" }}>
          Calculation <span className="grad">Booster</span>
        </h1>
        <p className="hero__sub">
          A few minutes daily — endless auto-generated drills <strong>plus 3,355 real book questions</strong> (Decimal, Surds, %, SI&nbsp;&amp;&nbsp;CI, Time&nbsp;&amp;&nbsp;Work…).
          Every question in seconds — your calculation speed will take off. 🚀
        </p>
      </section>

      {/* Upload own calc questions */}
      <section className="section" style={{ marginTop: 12 }}>
        <div className="glass-card">
          <div className="row between" style={{ flexWrap: "wrap", gap: 8 }}>
            <div>
              <h3>📥 Add your own questions (optional)</h3>
              <p className="muted mt-8" style={{ fontSize: "0.85rem" }}>
                Questions from a PDF/image get mixed <strong>randomly</strong> into your drills. Or paste an image anywhere with <strong>Ctrl+V</strong>.
                {poolCount > 0 ? ` Currently ${poolCount} uploaded questions.` : ""}
              </p>
            </div>
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <label className="btn btn--ghost btn--sm" style={{ opacity: busy ? 0.6 : 1, pointerEvents: busy ? "none" : "auto" }}>
                📄 PDF
                <input type="file" accept="application/pdf" hidden onChange={handlePdf} />
              </label>
              <label className="btn btn--ghost btn--sm" style={{ opacity: busy ? 0.6 : 1, pointerEvents: busy ? "none" : "auto" }}>
                📷 Image(s)
                <input type="file" accept="image/*" multiple hidden onChange={handleImages} />
              </label>
              <button className="btn btn--ghost btn--sm" onClick={pasteImage} disabled={busy}>📋 Paste</button>
              {poolCount > 0 && <button className="btn btn--ghost btn--sm" onClick={clearPool}>Clear</button>}
            </div>
          </div>
          {status && <p className="mt-16" style={{ color: "var(--accent-2)", fontSize: "0.9rem" }}>{status}</p>}
          {error && <p className="mt-16" style={{ color: "var(--danger)", fontSize: "0.9rem" }}>{error}</p>}
        </div>
      </section>

      <section className="section">
        <div className="glass-card">
          <div className="row between" style={{ flexWrap: "wrap", gap: 8 }}>
            <h3>Choose types</h3>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn btn--ghost btn--sm" onClick={allOn}>Select all</button>
              {bookTopics.length > 0 && <button className="btn btn--ghost btn--sm" onClick={onlyBook}>📚 Book only</button>}
              <button className="btn btn--ghost btn--sm" onClick={clear}>Clear</button>
            </div>
          </div>

          <p className="muted mt-16" style={{ fontSize: "0.8rem" }}>⚡ Auto-generated (endless, never repeat)</p>
          <div className="chips mt-8">
            {CALC_TYPES.map((t) => (
              <button key={t.key} className={`chip chip--btn chip--lg ${sel.has(t.key) ? "is-active" : ""}`} onClick={() => toggle(t.key)}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {bookTopics.length > 0 && (
            <>
              <p className="muted mt-24" style={{ fontSize: "0.8rem" }}>
                📚 Book questions — <strong>{bookTopics.reduce((a, t) => a + t.count, 0).toLocaleString()}</strong> real questions from <em>Calculation ka Best Compilation</em> (Mohit Goyal Sir)
              </p>
              <div className="chips mt-8">
                {bookTopics.map((t) => (
                  <button key={t.key} className={`chip chip--btn chip--lg ${sel.has(t.key) ? "is-active" : ""}`} onClick={() => toggle(t.key)}>
                    {t.icon} {t.label} <span className="muted" style={{ fontSize: "0.75rem" }}>({t.count})</span>
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="row mt-24" style={{ gap: 16, flexWrap: "wrap", alignItems: "center" }}>
            <label className="row" style={{ gap: 8, alignItems: "center" }}>
              <span className="muted" style={{ fontSize: "0.85rem" }}>Questions:</span>
              <select className="select" style={{ width: "auto", padding: "8px 12px" }} value={count} onChange={(e) => setCount(parseInt(e.target.value))}>
                {[10, 20, 30, 50].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
            <label className="row" style={{ gap: 8, alignItems: "center" }}>
              <span className="muted" style={{ fontSize: "0.85rem" }}>Time per Q:</span>
              <select className="select" style={{ width: "auto", padding: "8px 12px" }} value={sec} onChange={(e) => setSec(parseInt(e.target.value))}>
                <option value={8}>8s (pro)</option>
                <option value={12}>12s</option>
                <option value={20}>20s</option>
                <option value={0}>No timer</option>
              </select>
            </label>
            <button className="btn btn--primary" onClick={start} disabled={sel.size === 0 || starting}>
              {starting ? "Loading…" : "🚀 Start drill"}
            </button>
          </div>
          <p className="hint" style={{ marginTop: 12 }}>💡 Total {count} questions · {sec ? `${Math.round((count * sec) / 60 * 10) / 10} min timer` : "no timer"}. You'll see right/wrong instantly in the result.</p>
        </div>
      </section>
    </>
  );
}
