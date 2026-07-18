"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { askAI, generateSimilar } from "@/lib/client-ai";
import { saveQuiz, makeId } from "@/lib/storage";
import { recordAttempts, getStat, keyFor } from "@/lib/qstats";
import { isQBookmarked, toggleQBookmark } from "@/lib/qbookmarks";
import { getSavedShortcut, saveShortcutFor, clearSavedShortcut } from "@/lib/shortcuts";
import { addReview } from "@/lib/qreview";
import Markdown from "./Markdown";
import AskElsewhere from "./AskElsewhere";
import PasteAnswer from "./PasteAnswer";
import QTimer from "./QTimer";

// A maths question is IMAGES — the stem, four options and the solution are PNG→
// WebP crops on the R2 CDN, because maths does not survive being flattened to
// text. This is PyqQuestionCard's twin: the same answer/reveal/archive/bookmark
// machinery and the same Copy&Ask / Gemini / shortcut / 20-similar buttons, but
// the three render sites show <img> instead of <Markdown>.
//
// The helpers (keyFor, askAI, generateSimilar, AskButtons, PasteAnswer) all read
// q.question / q.options as text, so we hand them a text projection of the lossy
// fields. That is good for word problems and imperfect for fraction-heavy ones —
// the honest ceiling without vision. The images are what the student actually
// sees; the text only feeds search, alt and the AI buttons.
export default function MathQuestionCard({ q, index, subject = "math", chapterName }) {
  const router = useRouter();
  const [picked, setPicked] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [shortcut, setShortcut] = useState("");
  const [scShown, setScShown] = useState(false);
  const [scLoading, setScLoading] = useState(false);
  const [simLoading, setSimLoading] = useState(false);
  const [err, setErr] = useState("");
  const [recorded, setRecorded] = useState(false);
  const [bm, setBm] = useState(false);
  const [flash, setFlash] = useState("");
  const archiveTimer = useRef(null);

  // The text projection the machinery keys on. `id` in the question text keeps
  // the stats/bookmark/shortcut key unique and stable even when two questions'
  // lossy text collides or is empty.
  const alt = q.qText || `Maths ${q.id}`;
  const tq = {
    ...q,
    question: `[${q.id}] ${q.qText || ""}`.trim(),
    options: q.optText && q.optText.length === 4 ? q.optText : ["a", "b", "c", "d"],
  };

  // Maths-only Gemini prompt: this bank is about speed, so it asks for the
  // fastest way to crack the question rather than the shared "answer + short
  // explanation" prompt. Baked into the question text (no promptKey) so the
  // global geminiPrompt setting — used by every other bank — is untouched. The
  // text is the lossy qText (the question is an image); good for word problems,
  // imperfect for fraction-heavy ones.
  const geminiQ = {
    question:
      "Is question ko seconds mein kaise solve karein — sabse fast trick/shortcut " +
      "batao, lamba method nahi. Hinglish mein.\n\n" + (q.qText || ""),
    options: tq.options,
  };
  // Pressing Gemini also opens the paste box for THIS question (PasteAnswer
  // listens on cgl:gemini-asked), same as the shared AskButtons does.
  const openPaste = () => {
    try { window.dispatchEvent(new CustomEvent("cgl:gemini-asked", { detail: { key: keyFor(tq) } })); }
    catch { /* ignore */ }
  };

  useEffect(() => { setBm(isQBookmarked(tq)); setShortcut(getSavedShortcut(tq)); }, [q.id]);
  useEffect(() => () => { if (archiveTimer.current) clearTimeout(archiveTimer.current); }, []);

  const choose = (oi) => {
    if (picked !== null) return;
    const correct = oi === q.answer;
    setPicked(oi);
    setRevealed(true);
    if (!recorded) { recordAttempts([{ q: tq, correct }]); setRecorded(true); }
    addReview(tq, { subject, source: "chapter", category: chapterName || subject, correct });
    setFlash(correct
      ? "✓ Correct · tracked. Question list mein hi rahega."
      : "❌ Saved to Wrong (Mistakes). Solution dekho.");
  };

  const fetchShortcut = async () => {
    setScLoading(true); setErr("");
    try {
      const opts = tq.options.map((o, i) => `${String.fromCharCode(65 + i)}) ${o}`).join("   ");
      const text =
        `${q.qText || ""}\nOptions: ${opts}\n` +
        `Correct answer (already verified): ${String.fromCharCode(65 + q.answer)}) ${tq.options[q.answer]}\n`;
      const { answer } = await askAI({ question: text, mode: "shortcut", subject });
      setShortcut(answer); setScShown(true); saveShortcutFor(tq, answer);
    } catch (e) { setErr(e.message); } finally { setScLoading(false); }
  };
  const toggleShortcut = () => {
    if (scShown) { setScShown(false); return; }
    if (shortcut) { setScShown(true); return; }
    fetchShortcut();
  };
  const regenShortcut = () => { clearSavedShortcut(tq); setShortcut(""); fetchShortcut(); };

  const toggleBm = () => { setBm(toggleQBookmark(tq, subject)); };

  // The lossy text extraction leaves junk in qText/optText — lone surrogates
  // where a math glyph was dropped, zero-width spaces, and the printed "(a) "
  // option letters. That derails the similar-question generator, so scrub it to
  // the cleanest plain text we can before sending.
  const cleanText = (s) =>
    String(s || "")
      .replace(/[\uD800-\uDFFF]/g, "")
      .replace(/[\u200B-\u200F\u2060-\u2064\uFEFF]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  const cleanOpt = (s) => cleanText(s).replace(/^\(?[a-dA-D]\)\s*/, "");

  const make20 = async () => {
    setSimLoading(true); setErr("");
    try {
      const sampleQ = cleanText(q.qText);
      if (!sampleQ) {
        setErr("Is question ka text bahut lossy hai (image-only) — similar generate nahi ho payega. Kisi text-wale question pe try karo.");
        setSimLoading(false); return;
      }
      const opts = (q.optText && q.optText.length === 4 ? q.optText : tq.options).map(cleanOpt);
      const data = await generateSimilar({ question: sampleQ, options: opts }, 20, subject);
      const quiz = { id: makeId(), title: data.title || "Similar (20)", source: "similar", createdAt: new Date().toISOString(), questions: data.questions };
      saveQuiz(quiz);
      router.push(`/quizzes/${quiz.id}`);
    } catch (e) { setErr(e.message); setSimLoading(false); }
  };

  const st = getStat(tq);

  return (
    <article className="glass-card">
      <div className="q-head">
        <h3 style={{ fontSize: "1rem", fontWeight: 600, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span className="rule-card__n">{index + 1}.</span>
          <span className="paper-tag paper-tag--pyq">PYQ</span>
          {q.source && <span className="paper-tag">📄 {q.source}</span>}
        </h3>
        <div className="q-head__actions">
          <QTimer answered={picked !== null} />
          {st?.attempts > 0 && <span className="done-badge" title={`${st.correct}/${st.attempts}`}>🔁 {st.attempts}x</span>}
          <AskElsewhere q={tq} />
          <AskElsewhere
            q={geminiQ}
            url="https://gemini.google.com/app"
            label="✨ Gemini"
            title="Question copy karke Gemini kholo — seconds mein solve karne ki trick pucho"
            onAsked={openPaste}
          />
          <button className="btn btn--ghost btn--sm" onClick={toggleBm} title="Bookmark" style={bm ? { color: "var(--warning)" } : {}}>{bm ? "★" : "☆"}</button>
        </div>
      </div>

      <PasteAnswer q={tq} />

      {/* The stem — figure (if any) is baked into this crop */}
      <a href={q.qImg} target="_blank" rel="noreferrer" className="math-img-wrap mt-12">
        <img src={q.qImg} alt={alt} loading="lazy" className="math-img" />
      </a>

      <div className="grid" style={{ gap: 8, marginTop: 12, gridTemplateColumns: "minmax(0, 1fr)" }}>
        {q.optImgs.map((src, oi) => {
          const s = {
            display: "flex", alignItems: "center", gap: 10, textAlign: "left",
            padding: "8px 12px", borderRadius: 10, minHeight: 46,
            borderWidth: "1px", borderStyle: "solid", borderColor: "var(--glass-border)",
            background: "var(--bg)", cursor: picked === null ? "pointer" : "default",
          };
          if (revealed) {
            if (oi === q.answer) { s.borderColor = "var(--ok)"; s.background = "var(--ok-wash)"; }
            else if (oi === picked) { s.borderColor = "var(--accent)"; s.background = "var(--accent-wash)"; }
          }
          return (
            <button key={oi} className="math-opt" style={s} onClick={() => choose(oi)}>
              <strong style={{ opacity: 0.7 }}>{String.fromCharCode(65 + oi)}</strong>
              <img src={src} alt={tq.options[oi]} loading="lazy" className="math-opt-img" />
              {revealed && oi === q.answer && <span style={{ color: "var(--success)", marginLeft: "auto" }}>✓</span>}
            </button>
          );
        })}
      </div>

      {flash && <p className="mt-12" style={{ color: "var(--accent-2)", fontSize: "0.85rem", fontWeight: 600 }}>{flash}</p>}

      {!revealed && <button className="btn btn--ghost btn--sm mt-12" onClick={() => setRevealed(true)}>👁️ Show answer</button>}

      {revealed && (
        <div className="mt-12">
          <strong style={{ color: "var(--text-2)", fontSize: "0.86rem" }}>Solution: </strong>
          <a href={q.solImg} target="_blank" rel="noreferrer" className="math-img-wrap mt-8">
            <img src={q.solImg} alt="solution" loading="lazy" className="math-img" />
          </a>
        </div>
      )}

      {/* 20-similar is always available — you can spin up a same-type practice
          set without answering first. Shortcut stays behind reveal because it
          explains the (now shown) solution. */}
      <div className="row mt-12" style={{ gap: 8, flexWrap: "wrap" }}>
        {revealed && <button className="btn btn--ghost btn--sm" onClick={toggleShortcut} disabled={scLoading}>{scLoading ? "Thinking…" : scShown ? "⚡ Hide shortcut" : "⚡ Shortcut trick"}</button>}
        <button className="btn btn--ghost btn--sm" onClick={make20} disabled={simLoading} title="Isi type ke 20 naye questions generate karo (practice quiz)">{simLoading ? "Generating…" : "🎯 20 similar"}</button>
      </div>

      {err && <p style={{ color: "var(--danger)", fontSize: "0.85rem", marginTop: 8 }}>{err}</p>}
      {scShown && shortcut && (
        <div className="answer-box mt-12">
          <Markdown>{shortcut}</Markdown>
          <button className="btn btn--ghost btn--sm mt-12" onClick={regenShortcut} disabled={scLoading}>
            {scLoading ? "Thinking…" : "🔄 New shortcut"}
          </button>
        </div>
      )}
    </article>
  );
}
