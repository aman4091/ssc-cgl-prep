"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { extractOws, extractOwsChunked, ocrImage, extractPdfTextSmart } from "@/lib/client-ai";
import { getSettings, saveQuiz } from "@/lib/storage";
import { appendOws, getDaysOverview, getMeta, clearOws, buildDayQuiz, PER_DAY, TYPES } from "@/lib/vocab";

export default function VocabPage() {
  const router = useRouter();
  const [days, setDays] = useState([]);

  // Every type, every day up to the last — the whole span in one quiz.
  const startCumQuiz = () => {
    const quiz = buildDayQuiz(days.length, "cum");
    if (!quiz.questions.length) return;
    saveQuiz(quiz);
    router.push(`/quizzes/${quiz.id}`);
  };
  const [meta, setMeta] = useState({ count: 0, perDay: PER_DAY, days: 0 });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [category, setCategory] = useState(""); // "" = auto-detect
  const [forceOcr, setForceOcr] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const imgRef = useRef(null);
  const pdfRef = useRef(null);

  const refresh = () => {
    setDays(getDaysOverview());
    setMeta(getMeta());
  };
  useEffect(() => { refresh(); }, []);

  const processImages = async (files) => {
    if (!files.length) return;
    setError(""); setStatus("");
    if (!getSettings().apiKey) {
      setError("Add your DeepSeek API key in Settings first.");
      return;
    }
    setBusy(true);
    try {
      let all = [];
      for (let i = 0; i < files.length; i++) {
        setStatus(`📷 Image ${i + 1}/${files.length} padha ja raha hai (OCR)…`);
        let text = "";
        try { text = await ocrImage(files[i]); } catch { /* skip bad image */ }
        if (text && text.trim().length > 8) {
          setStatus(`Image ${i + 1}/${files.length}: entries nikaale ja rahe hain… (abhi tak ${all.length})`);
          try {
            const { items } = await extractOws(text, category || undefined);
            if (Array.isArray(items)) all = all.concat(items);
          } catch (err) { console.warn(err); }
        }
      }
      if (all.length === 0) throw new Error("No entries found in these images. Use a clear, straight photo.");
      const before = getMeta().count;
      const saved = appendOws(all);
      const added = saved.length - before;
      const dupes = all.length - added;
      setStatus(
        `Done! ${added} new word${added === 1 ? "" : "s"} added` +
        (dupes > 0 ? ` · ${dupes} duplicate${dupes === 1 ? "" : "s"} skipped` : "") +
        `. Total ${saved.length} · ${Math.ceil(saved.length / PER_DAY)} days.`
      );
      refresh();
    } catch (err) {
      setError(err.message);
      setStatus("");
    } finally {
      setBusy(false);
      if (imgRef.current) imgRef.current.value = "";
    }
  };

  const handleImages = (e) => processImages(Array.from(e.target.files || []));

  const processPdfs = async (files) => {
    if (!files.length) return;
    setError(""); setStatus("");
    if (!getSettings().apiKey) {
      setError("Add your DeepSeek API key in Settings first.");
      return;
    }
    setBusy(true);
    try {
      let all = [];
      let lastText = "";
      let lastOcr = false;
      for (let f = 0; f < files.length; f++) {
        const name = files[f].name || `PDF ${f + 1}`;
        setStatus(`📄 ${name}: reading pages…`);
        let text = "";
        try {
          const res = await extractPdfTextSmart(files[f], (p) => {
            if (p.phase === "text") setStatus(`📄 ${name}: reading page ${p.page}/${p.total}…`);
            else setStatus(`📄 ${name}: scanned PDF — OCR page ${p.page}/${p.total} (slow)…`);
          }, { forceOcr });
          text = res.text || "";
          lastText = text;
          lastOcr = res.ocr;
        } catch (err) { console.warn(err); }
        if (text && text.trim().length > 12) {
          const { items } = await extractOwsChunked(text, category || undefined, (i, n, so) => {
            setStatus(`📄 ${name}: ${lastOcr ? "OCR done · " : ""}extracting words — part ${i}/${n} (so far ${all.length + so})…`);
          });
          if (Array.isArray(items)) all = all.concat(items);
        }
      }
      if (all.length === 0) {
        const chars = lastText.trim().length;
        if (chars < 40) {
          throw new Error(
            `PDF se text nahi mila (only ${chars} chars). Scanned pages blank/dhundhle ho sakte hain. ` +
            (forceOcr ? "OCR bhi kuch nahi padh paaya — saaf photos try karo." : "Neeche 'Force OCR' on karke dobara try karo.")
          );
        }
        throw new Error(
          `Text to mila (${chars} chars${lastOcr ? ", via OCR" : ""}) par koi word–meaning pair nahi bana. ` +
          `Sample: "${lastText.trim().slice(0, 160)}…" — agar ye gibberish hai to 'Force OCR' on karo; warna page format alag hai.`
        );
      }
      const before = getMeta().count;
      const saved = appendOws(all);
      const added = saved.length - before;
      const dupes = all.length - added;
      setStatus(
        `Done! ${added} new word${added === 1 ? "" : "s"} added` +
        (dupes > 0 ? ` · ${dupes} duplicate${dupes === 1 ? "" : "s"} skipped` : "") +
        `. Total ${saved.length} · ${Math.ceil(saved.length / PER_DAY)} days.`
      );
      refresh();
    } catch (err) {
      setError(err.message);
      setStatus("");
    } finally {
      setBusy(false);
      if (pdfRef.current) pdfRef.current.value = "";
    }
  };

  const handlePdfs = (e) => processPdfs(Array.from(e.target.files || []));

  const pasteImage = async () => {
    if (!getSettings().apiKey) { setError("Add your DeepSeek API key in Settings first."); return; }
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

  // Clipboard paste (Ctrl+V) -> add image
  useEffect(() => {
    const onPaste = (e) => {
      const files = [];
      for (const it of e.clipboardData?.items || []) {
        if (it.type && it.type.startsWith("image/")) {
          const f = it.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length && !busy) { e.preventDefault(); setShowAdd(true); processImages(files); }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy]);

  const handleClear = () => {
    if (confirm("Remove all vocab words?")) { clearOws(); refresh(); }
  };

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">📚 English · Vocab</span>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn--primary btn--sm" onClick={() => setShowAdd((v) => !v)}>{showAdd ? "✕ Close" : "➕ Add words"}</button>
            <Link href="/vocab/bookmarks" className="btn btn--ghost btn--sm">⭐ Bookmarks</Link>
            <Link href="/" className="btn btn--ghost btn--sm">← Home</Link>
          </div>
        </div>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.7rem, 4vw, 2.6rem)" }}>
          One Word <span className="grad">Substitution</span>
        </h1>
        <p className="hero__sub">
          Upload photos of book pages (OWS / idiom / phrase) — entries are extracted and split into {PER_DAY} per day.
          Day 1 fills up to {PER_DAY} first, then the next day.
        </p>
        {/* The cumulative quiz belongs here, not inside a single day — this is
            the page where you are looking at a span of days. */}
        {days.length > 1 && (
          <div className="row mt-16">
            <button className="btn btn--primary" onClick={() => startCumQuiz()}>
              🎯 Quiz · Day 1–{days.length}
            </button>
          </div>
        )}
      </section>

      {/* Upload — hidden until the "➕ Add words" button is pressed */}
      {showAdd && (
      <section className="section" style={{ marginTop: 12 }}>
        <div className="glass-card">
          <div className="row between">
            <div>
              <h3>Add from image or PDF</h3>
              <p className="muted mt-8">
                {meta.count
                  ? `Currently ${meta.count} words · ${meta.days} days (~${PER_DAY}/day) · add more — repeats are skipped automatically`
                  : `📷 Upload clear photos or a PDF (even scanned), or paste with Ctrl+V. Duplicate words are skipped.`}
              </p>
            </div>
            <div className="row" style={{ gap: 8 }}>
              {meta.count > 0 && (
                <button className="btn btn--ghost btn--sm" onClick={handleClear} disabled={busy}>Clear</button>
              )}
              <select className="select" style={{ width: "auto", padding: "8px 12px" }}
                value={category} onChange={(e) => setCategory(e.target.value)} disabled={busy} title="Ye image kis type ki hai?">
                <option value="">Auto-detect</option>
                {TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
              <label className="btn btn--primary" style={{ opacity: busy ? 0.6 : 1, pointerEvents: busy ? "none" : "auto" }}>
                {busy ? "Working…" : "📷 Add image(s)"}
                <input ref={imgRef} type="file" accept="image/*" multiple hidden onChange={handleImages} />
              </label>
              <label className="btn btn--ghost" style={{ opacity: busy ? 0.6 : 1, pointerEvents: busy ? "none" : "auto" }}>
                {busy ? "Working…" : "📄 Add PDF(s)"}
                <input ref={pdfRef} type="file" accept="application/pdf" multiple hidden onChange={handlePdfs} />
              </label>
              <label className="row" style={{ gap: 6, fontSize: "0.85rem", alignItems: "center", cursor: "pointer" }} title="Skip the PDF text layer and OCR every page (use when a scanned PDF returns 0 words)">
                <input type="checkbox" checked={forceOcr} onChange={(e) => setForceOcr(e.target.checked)} disabled={busy} />
                Force OCR
              </label>
              <button className="btn btn--ghost" onClick={pasteImage} disabled={busy}>📋 Paste</button>
            </div>
          </div>
          <p className="hint" style={{ marginTop: 10 }}>💡 Tip: images or a PDF both work. Scanned PDFs are OCR-read page by page (a 60–70 page book may take a few minutes). Already-added words are skipped, so you can re-upload safely.</p>
          {status && <p className="mt-16" style={{ color: "var(--accent-2)", fontSize: "0.9rem" }}>{status}</p>}
          {error && <p className="mt-16" style={{ color: "var(--danger)", fontSize: "0.9rem" }}>{error}</p>}
        </div>
      </section>
      )}

      {/* Days grid */}
      <section className="section">
        <div className="section__head">
          <h2>Daily Plan · {PER_DAY}/day</h2>
          <p>{meta.count ? "Click a day to start that day's words." : "Days appear as soon as you add images."}</p>
        </div>
        {meta.count === 0 ? (
          <div className="placeholder">No words yet. Add an image above. 📥</div>
        ) : (
          <div className="days-grid">
            {days.map((d) => (
              <Link
                key={d.day}
                href={`/vocab/${d.day}`}
                className={`day-cell glass ${d.done ? "is-done" : d.doneCount > 0 ? "is-part" : ""}`}
              >
                <span className="day-cell__n">Day {d.day}</span>
                <span className="day-cell__c">{d.count} words</span>
                {d.done ? (
                  <span className="day-cell__tick">✓</span>
                ) : d.doneCount > 0 ? (
                  <span className="day-cell__tick day-cell__tick--part">{d.doneCount}/{d.totalCount}</span>
                ) : null}
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
