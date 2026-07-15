"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getPyqQuestions, addPyqQuestions, removePyqQuestion, updatePyqQuestion,
  clearPyqQuestions, markPyqToChapter, pyqKey, pyqSubjectMeta, PYQ_SUBJECTS,
} from "@/lib/pyqbank";
import { getChapters, addChapter } from "@/lib/grammar";
import { loadGkQuestions, gkTopicsForSubject } from "@/lib/gkbank";
import { readImageText, generateQuizText, extractPdfTextSmart, generateQuizChunked } from "@/lib/client-ai";
import { saveQuiz, makeId, getSettings } from "@/lib/storage";
import PyqQuestionCard from "@/components/PyqQuestionCard";

const PAGE = 50; // ready-made banks run to hundreds — render them in slices

function shuffle(a) {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}

// Per-question control: mark this PYQ into a real subject-chapter.
function ChapterMark({ subject, qk, marked, chapters, onMarked }) {
  const nameOf = (id) => chapters.find((c) => c.id === id)?.name || "chapter";
  const handle = (e) => {
    let id = e.target.value;
    e.target.value = "";
    if (!id) return;
    if (id === "__new") {
      const nm = (prompt("New chapter name:") || "").trim();
      if (!nm) return;
      const c = addChapter(subject, nm);
      if (!c) return;
      id = c.id;
    }
    markPyqToChapter(subject, qk, id);
    onMarked();
  };
  return (
    <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <span className="muted" style={{ fontSize: "0.8rem" }}>🏷️ Mark to chapter:</span>
      <select className="select" style={{ width: "auto", padding: "6px 10px" }} defaultValue="" onChange={handle}>
        <option value="">— choose —</option>
        {chapters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        <option value="__new">➕ New chapter…</option>
      </select>
      {(marked || []).map((id) => (
        <span key={id} className="badge badge--ok">→ {nameOf(id)}</span>
      ))}
    </div>
  );
}

export default function PyqSubjectPage() {
  const { subject } = useParams();
  const router = useRouter();
  const meta = pyqSubjectMeta(subject);
  const valid = PYQ_SUBJECTS.some((s) => s.key === subject);

  const [questions, setQuestions] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const imgRef = useRef(null);
  const pdfRef = useRef(null);

  // Ready-made banks that ship with the app (lib/gkbank) sit alongside the user's
  // own uploads, tagged by topic so either side can be viewed on its own.
  const [gkQs, setGkQs] = useState([]);
  const [gkTopics, setGkTopics] = useState([]);
  const [topicFilter, setTopicFilter] = useState(""); // "" = all | "mine" | topic label
  const [shown, setShown] = useState(PAGE);

  const refresh = () => { setQuestions(getPyqQuestions(subject)); setChapters(getChapters(subject)); };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [subject]);

  useEffect(() => {
    let alive = true;
    setGkQs([]); setGkTopics([]); setTopicFilter("");
    (async () => {
      const [ts, qs] = await Promise.all([gkTopicsForSubject(subject), loadGkQuestions(subject)]);
      if (!alive) return;
      setGkTopics(ts); setGkQs(qs);
    })();
    return () => { alive = false; };
  }, [subject]);

  useEffect(() => { setShown(PAGE); }, [topicFilter, subject]);

  const processImages = async (files) => {
    const list = Array.from(files || []);
    if (!list.length) return;
    if (!getSettings().apiKey) { setError("Add your DeepSeek API key in Settings first."); return; }
    setBusy(true); setError(""); setStatus("");
    try {
      let added = 0;
      for (let i = 0; i < list.length; i++) {
        setStatus(`📷 Reading image ${i + 1}/${list.length}…`);
        let text = "";
        try { const r = await readImageText(list[i]); text = r.text; } catch { /* skip */ }
        if (text && text.trim().length > 12) {
          setStatus(`Image ${i + 1}/${list.length}: questions bana raha…`);
          try { const { questions: qs } = await generateQuizText(text); added += addPyqQuestions(subject, qs); }
          catch (err) { console.warn(err); }
        }
      }
      if (!added) throw new Error("Koi naya question nahi bana — saaf screenshot use karo (ya duplicate the).");
      setStatus(`✓ Added ${added} question${added > 1 ? "s" : ""}.`);
      refresh();
    } catch (e) { setError(e.message); setStatus(""); }
    finally { setBusy(false); if (imgRef.current) imgRef.current.value = ""; }
  };

  const processPdfs = async (files) => {
    const list = Array.from(files || []);
    if (!list.length) return;
    if (!getSettings().apiKey) { setError("Add your DeepSeek API key in Settings first."); return; }
    setBusy(true); setError(""); setStatus("");
    try {
      let added = 0;
      for (const f of list) {
        const name = f.name || "PDF";
        setStatus(`📄 ${name}: reading pages…`);
        let text = "";
        try {
          const res = await extractPdfTextSmart(f, (p) => setStatus(`📄 ${name}: ${p.phase === "ocr" ? "OCR " : ""}page ${p.page}/${p.total}…`));
          text = res.text || "";
        } catch (err) { console.warn(err); }
        if (text && text.trim().length > 20) {
          const { questions: qs } = await generateQuizChunked(text, (i, n, so) => setStatus(`📄 ${name}: making questions ${i}/${n} (so far ${added + so})…`));
          added += addPyqQuestions(subject, qs);
        }
      }
      if (!added) throw new Error("PDF se koi naya question nahi bana.");
      setStatus(`✓ Added ${added} question${added > 1 ? "s" : ""}.`);
      refresh();
    } catch (e) { setError(e.message); setStatus(""); }
    finally { setBusy(false); if (pdfRef.current) pdfRef.current.value = ""; }
  };

  const pasteImage = async () => {
    if (!navigator.clipboard?.read) { setError("Paste not supported — use the 📷 button or Ctrl+V."); return; }
    try {
      const items = await navigator.clipboard.read();
      const files = [];
      for (const it of items) {
        const type = it.types.find((t) => t.startsWith("image/"));
        if (type) { const blob = await it.getType(type); files.push(new File([blob], "pasted.png", { type })); }
      }
      if (!files.length) { setError("Clipboard mein koi image nahi mili."); return; }
      processImages(files);
    } catch (e) { setError("Paste failed: " + e.message); }
  };

  // The user's own uploads first — a 600-question ready-made bank would otherwise
  // bury them. The tag chips below switch between the two.
  const all = [...questions, ...gkQs];
  const filtered = topicFilter === "" ? all
    : topicFilter === "mine" ? questions
    : gkQs.filter((q) => q.topic === topicFilter);

  const practice = () => {
    if (filtered.length === 0) { setError("Pehle questions add karo."); return; }
    const picked = shuffle(filtered).slice(0, 25);
    const label = topicFilter && topicFilter !== "mine" ? topicFilter : meta.label;
    const quiz = {
      id: makeId(), title: `${label} · PYQ Practice`, source: "PYQ",
      createdAt: new Date().toISOString(), questions: picked,
      timeLimitSec: 15 * 60, // 15-minute exam mode
    };
    saveQuiz(quiz);
    router.push(`/quizzes/${quiz.id}`);
  };

  if (!valid) {
    return (
      <section className="hero">
        <p className="muted">Unknown PYQ subject. <Link href="/pyq" className="link">← PYQ Bank</Link></p>
      </section>
    );
  }

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">{meta.icon} PYQ · {meta.label}</span>
          <Link href="/pyq" className="btn btn--ghost btn--sm">← PYQ Bank</Link>
        </div>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)" }}>
          {meta.label} <span className="grad">PYQs</span>
        </h1>
        <p className="hero__sub">
          Subject-wise question bank. Upload question screenshots/PDF → AI banata hai MCQs. Har question ko
          apne subject ke kisi <strong>chapter mein mark</strong> kar sakte ho — wahan PYQ tag ke saath dikhega.
        </p>
        <div className="row mt-16" style={{ gap: 8, flexWrap: "wrap" }}>
          <button className="btn btn--primary" onClick={practice} disabled={filtered.length === 0}>
            🎯 Practice ({Math.min(25, filtered.length)} Q · 15 min)
          </button>
          <button className="btn btn--ghost btn--sm" onClick={() => setShowAdd((v) => !v)}>
            {showAdd ? "✕ Close" : "➕ Add questions"}
          </button>
          <Link href={`/study/${subject}`} className="btn btn--ghost btn--sm">📚 Open {meta.label} chapters</Link>
        </div>
      </section>

      {/* Add questions — hidden until the button above is pressed */}
      {showAdd && (
      <section className="section" style={{ marginTop: 12 }}>
        <div className="glass-card">
          <div className="row between" style={{ flexWrap: "wrap", gap: 10 }}>
            <div>
              <h3>➕ Add PYQ questions</h3>
              <p className="muted mt-8" style={{ fontSize: "0.85rem" }}>
                Question ke screenshots ya PDF daalo — AI proper MCQ bana dega (duplicate skip).
              </p>
            </div>
            <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
              <label className="btn btn--primary" style={{ opacity: busy ? 0.6 : 1, pointerEvents: busy ? "none" : "auto" }}>
                {busy ? "Working…" : "📷 Image(s)"}
                <input ref={imgRef} type="file" accept="image/*" multiple hidden onChange={(e) => processImages(e.target.files)} />
              </label>
              <label className="btn btn--ghost" style={{ opacity: busy ? 0.6 : 1, pointerEvents: busy ? "none" : "auto" }}>
                {busy ? "Working…" : "📄 PDF(s)"}
                <input ref={pdfRef} type="file" accept="application/pdf" multiple hidden onChange={(e) => processPdfs(e.target.files)} />
              </label>
              <button className="btn btn--ghost" onClick={pasteImage} disabled={busy}>📋 Paste</button>
            </div>
          </div>
          {status && <p className="mt-16" style={{ color: "var(--accent-2)", fontSize: "0.9rem" }}>{status}</p>}
          {error && <p className="mt-16" style={{ color: "var(--danger)", fontSize: "0.9rem" }}>{error}</p>}
        </div>
      </section>
      )}

      {/* Questions */}
      <section className="section">
        <div className="section__head">
          <div>
            <h2>Questions</h2>
            <p>{all.length ? `${filtered.length} question${filtered.length !== 1 ? "s" : ""} — solve karo & chapter mark karo.` : "No questions yet — add from images/PDF above."}</p>
          </div>
          {questions.length > 0 && (
            <button className="btn btn--ghost btn--sm" onClick={() => { if (confirm("Clear all the questions YOU added to this PYQ bank? (Ready-made ones stay.)")) { clearPyqQuestions(subject); refresh(); } }}>🗑️ Clear mine</button>
          )}
        </div>

        {/* Topic tags — only worth showing once a ready-made bank is in the mix */}
        {gkTopics.length > 0 && all.length > 0 && (
          <div className="chips" style={{ marginBottom: 14 }}>
            <button className={`chip chip--btn chip--lg ${topicFilter === "" ? "is-active" : ""}`} onClick={() => setTopicFilter("")}>
              All ({all.length})
            </button>
            {questions.length > 0 && (
              <button className={`chip chip--btn chip--lg ${topicFilter === "mine" ? "is-active" : ""}`} onClick={() => setTopicFilter("mine")}>
                📥 Mine ({questions.length})
              </button>
            )}
            {gkTopics.map((t) => (
              <button key={t.slug} className={`chip chip--btn chip--lg ${topicFilter === t.label ? "is-active" : ""}`} onClick={() => setTopicFilter(t.label)}>
                {t.icon} {t.label} ({gkQs.filter((q) => q.topic === t.label).length})
              </button>
            ))}
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="placeholder">
            {all.length ? "Is tag mein koi question nahi." : "Add question images/PDF above to build this PYQ bank. 🎯"}
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gap: 12 }}>
              {filtered.slice(0, shown).map((q, i) => {
                const qk = pyqKey(q);
                // Ready-made questions live in a static file — there is nothing to
                // edit, delete or mark back into, so they only get "save to chapter".
                if (q.gk) {
                  return (
                    <PyqQuestionCard
                      key={q.id}
                      q={q}
                      index={i}
                      subject={subject}
                      chapterName={q.topic || meta.label}
                      archiveOnAnswer
                      fileToChapter
                    />
                  );
                }
                return (
                  <PyqQuestionCard
                    key={qk || i}
                    q={q}
                    index={i}
                    subject={subject}
                    chapterName={meta.label}
                    archiveOnAnswer
                    onDelete={() => { removePyqQuestion(subject, qk); refresh(); }}
                    onEdit={(nq) => { updatePyqQuestion(subject, qk, nq); refresh(); }}
                    markControl={
                      <ChapterMark subject={subject} qk={qk} marked={q.marked} chapters={chapters} onMarked={refresh} />
                    }
                  />
                );
              })}
            </div>
            {shown < filtered.length && (
              <button className="btn btn--ghost btn--block mt-16" onClick={() => setShown((n) => n + PAGE)}>
                ▼ Show {Math.min(PAGE, filtered.length - shown)} more ({shown} / {filtered.length})
              </button>
            )}
          </>
        )}
      </section>
    </>
  );
}
