"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { askAI, generateSimilar } from "@/lib/client-ai";
import { saveQuiz, getQuiz, makeId } from "@/lib/storage";
import { recordAttempts, getStat, keyFor } from "@/lib/qstats";
import { isQBookmarked, toggleQBookmark } from "@/lib/qbookmarks";
import { getSavedShortcut, saveShortcutFor, clearSavedShortcut } from "@/lib/shortcuts";
import { addReview } from "@/lib/qreview";
import Markdown from "./Markdown";
import AskElsewhere from "./AskElsewhere";
import PasteAnswer from "./PasteAnswer";
import QTimer from "./QTimer";
import FullscreenTestButton from "./FullscreenTestButton";

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
const SIMILAR_TARGET = 20;   // how many similar questions to end up with
const SIMILAR_BATCH = 5;     // first batch (shown immediately) and each top-up

function dispatchAppend(id, count, done) {
  try { window.dispatchEvent(new CustomEvent("cgl:quiz-appended", { detail: { id, count, done } })); }
  catch { /* SSR / no window */ }
}

// Background top-up: keep generating small batches and appending them to the
// saved quiz until it reaches SIMILAR_TARGET (or a batch fails / returns none).
// Deliberately NOT tied to component state — it runs on after the card unmounts.
async function streamSimilar(sample, subject, quizId) {
  for (;;) {
    const before = getQuiz(quizId);
    if (!before) return; // user deleted the quiz — stop
    const have = before.questions.length;
    if (have >= SIMILAR_TARGET) break;

    let qs = [];
    try {
      const b = await generateSimilar(sample, Math.min(SIMILAR_BATCH, SIMILAR_TARGET - have), subject);
      qs = (b && b.questions) || [];
    } catch { qs = []; }

    const quiz = getQuiz(quizId);
    if (!quiz) return;
    if (qs.length) quiz.questions = [...quiz.questions, ...qs];
    const finished = !qs.length || quiz.questions.length >= SIMILAR_TARGET;
    quiz.streaming = !finished;
    saveQuiz(quiz);
    dispatchAppend(quizId, quiz.questions.length, finished);
    if (finished) return;
  }
  // Loop exited because we were already at target — make sure the flag is clear.
  const quiz = getQuiz(quizId);
  if (quiz && quiz.streaming) { quiz.streaming = false; saveQuiz(quiz); dispatchAppend(quizId, quiz.questions.length, true); }
}

export default function MathQuestionCard({ q, index, subject = "math", chapterName, allQuestions }) {
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

  // Generating 20 in one shot is slow and the model sometimes returns an empty
  // reply under the load. So generate a first small batch, open the quiz right
  // away, then keep topping it up to the target in the background — the quiz
  // player listens for cgl:quiz-appended and shows new questions as they land.
  const make20 = async () => {
    setSimLoading(true); setErr("");
    try {
      const sampleQ = cleanText(q.qText);
      if (!sampleQ) {
        setErr("Is question ka text bahut lossy hai (image-only) — similar generate nahi ho payega. Kisi text-wale question pe try karo.");
        setSimLoading(false); return;
      }
      const opts = (q.optText && q.optText.length === 4 ? q.optText : tq.options).map(cleanOpt);
      const sample = { question: sampleQ, options: opts };
      const first = await generateSimilar(sample, SIMILAR_BATCH, subject);
      const quizId = makeId();
      const done = first.questions.length >= SIMILAR_TARGET;
      saveQuiz({
        id: quizId, title: first.title || "Similar practice", source: "similar",
        createdAt: new Date().toISOString(), questions: first.questions, streaming: !done,
      });
      router.push(`/quizzes/${quizId}`);
      if (!done) streamSimilar(sample, subject, quizId); // fire-and-forget top-up
    } catch (e) { setErr(e.message); setSimLoading(false); }
  };

  // A pasted Gemini answer is the solution from then on — the book's own
  // solution image is dropped rather than shown underneath it.
  const solution = shortcut || q.solution || q.explanation || "";

  const st = getStat(tq);

  return (
    <article className="glass-card">
      <div className="q-head">
        <h3 style={{ fontSize: "1rem", fontWeight: 600, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span className="rule-card__n">{index + 1}.</span>
        </h3>
        <div className="q-head__actions">
          <QTimer answered={picked !== null} />
          {st?.attempts > 0 && <span className="done-badge" title={`${st.correct}/${st.attempts}`}>🔁 {st.attempts}x</span>}
          {Array.isArray(allQuestions) && allQuestions.length > 1 && (
            <FullscreenTestButton
              questions={allQuestions}
              startIndex={allQuestions.indexOf(q)}
              title={chapterName || "Pinnacle Maths"}
              subject={subject}
              label="⛶"
              titleAttr="Isi question se full-screen test shuru karo"
            />
          )}
          <span className="q-act--keep">
            <AskElsewhere
              q={geminiQ}
              url="https://gemini.google.com/app"
              label="✨ Gemini"
              title="Question copy karke Gemini kholo — phir answer paste karo"
              onAsked={openPaste}
            />
          </span>
          <button className="btn btn--ghost btn--sm q-act--keep" onClick={make20} disabled={simLoading} title="Isi type ke 20 naye questions generate karo">{simLoading ? "…" : "🎯 20"}</button>
          <button className="btn btn--ghost btn--sm" onClick={toggleBm} title="Bookmark" style={bm ? { color: "var(--warning)" } : {}}>{bm ? "★" : "☆"}</button>
        </div>
      </div>

      <PasteAnswer q={tq} />

      {/* The stem — figure (if any) is baked into this crop */}
      {/* Not a link: tapping the question used to open the raw image in a
          new tab, which is never what you meant on a phone. */}
      <div className="math-img-wrap mt-12">
        <img src={q.qImg} alt={alt} loading="lazy" className="math-img" />
      </div>

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

      {revealed && (
        <div className="mt-12">
          <strong style={{ color: "var(--text-2)", fontSize: "0.86rem" }}>Solution: </strong>
          {/* A pasted Gemini answer replaces the book's solution image outright,
              rather than being stacked under it. */}
          {solution ? (
            <div className="mt-8" style={{ fontSize: "0.86rem" }}><Markdown>{solution}</Markdown></div>
          ) : (
            <div className="math-img-wrap mt-8">
              <img src={q.solImg} alt="solution" loading="lazy" className="math-img" />
            </div>
          )}
        </div>
      )}

      {/* 20-similar is always available — you can spin up a same-type practice
          set without answering first. Shortcut stays behind reveal because it
          explains the (now shown) solution. */}
      <div className="row mt-12" style={{ gap: 8, flexWrap: "wrap" }}>
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
