// The notes-quiz engine: turn a page's (or a whole chapter's) transcribed text
// into a 50-question MCQ quiz — first batch now, the rest topped up in the
// background — with cross-click dedup so pressing again asks NEW questions.
// Lifted out of components/NotesReader.js so both the per-page 📝 button and the
// per-chapter quiz button share ONE engine.

import { getQuiz, saveQuiz, makeId } from "@/lib/storage";
import { storeGet, storeSet, storeRemove } from "./bigstore";
import { generateNotesQuiz } from "@/lib/client-ai";

const QUIZ_TARGET = 50;
const QUIZ_BATCH = 10;
const LANES = 3;         // batches fired together — 3×10 covers 50 in two rounds
const DRY_BEFORE_RELAX = 2;

const normQ = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9ऀ-ॿ]+/g, "").slice(0, 80);

function dispatchAppend(id, count, done) {
  try { window.dispatchEvent(new CustomEvent("cgl:quiz-appended", { detail: { id, count, done } })); }
  catch { /* no window */ }
}

// Cross-click memory of what a page/chapter has already been quizzed on, keyed by
// `pk`. A pure dedup CACHE — it must never crash the quiz on a full localStorage.
const ASKED_KEY = "cgl.notesquiz.asked";
function readAsked() { try { return JSON.parse(storeGet(ASKED_KEY) || "{}"); } catch { return {}; } }
function getAsked(pk) { return readAsked()[pk] || []; }
function writeAsked(all, pk) {
  try { storeSet(ASKED_KEY, JSON.stringify(all)); return; }
  catch {
    try { storeSet(ASKED_KEY, JSON.stringify(pk ? { [pk]: all[pk] || [] } : {})); }
    catch { /* storage full — dedup memory is expendable */ }
  }
}
function addAsked(pk, texts) {
  const all = readAsked();
  const seen = new Set((all[pk] || []).map(normQ));
  const merged = [...(all[pk] || [])];
  for (const t of texts) { const k = normQ(t); if (t && !seen.has(k)) { seen.add(k); merged.push(t); } }
  all[pk] = merged.slice(-120); // cap the memory per page
  writeAsked(all, pk);
}
// Har page/chapter se ab tak kitne question poochhe ja chuke hain — { pk: n }.
// /notes/quiz hub ismein "✓ ho chuka" nishaan lagata hai. Poora naksha ek baar
// mein isliye ki hub ek screen par sau se zyada chapter dikhata hai; ek-ek ke
// liye poora store parse karna wahan mehnga padta.
export function askedMap() {
  const all = readAsked();
  const out = {};
  for (const k of Object.keys(all)) out[k] = (all[k] || []).length;
  return out;
}

function clearAsked(pk) { const all = readAsked(); delete all[pk]; writeAsked(all, null); }

// Drop questions whose stem matches anything already asked or already in this quiz.
function freshOnly(questions, ...excludeLists) {
  const seen = new Set();
  for (const list of excludeLists) for (const t of list) seen.add(normQ(t));
  const out = [];
  for (const q of questions || []) {
    const k = normQ(q.question);
    if (!k || seen.has(k)) continue;
    seen.add(k); out.push(q);
  }
  return out;
}

// A padded copy of a question — same facts, options reordered — so a last-resort
// repeat at least doesn't read as the identical card twice.
function reshuffle(q) {
  const opts = Array.isArray(q.options) ? q.options : [];
  const order = opts.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { ...q, options: order.map((i) => opts[i]), answer: order.indexOf(q.answer) };
}

// Background top-up to exactly 50, in three relaxing phases (new → page-repeat →
// no-exclude), padding from the quiz's own questions if a thin source runs dry.
async function streamNotesQuiz(text, quizId, pk) {
  let phase = 0, dry = 0;

  for (let round = 0; round < 24; round++) {
    const before = getQuiz(quizId);
    if (!before) return; // deleted
    const have = before.questions.length;
    if (have >= QUIZ_TARGET) break;

    const need = QUIZ_TARGET - have;
    const here = before.questions.map((q) => q.question);
    const asked = phase === 0 ? getAsked(pk) : [];
    const lanes = dry > 0 ? 1 : Math.max(1, Math.min(LANES, Math.ceil(need / QUIZ_BATCH)));

    const packs = await Promise.all(
      Array.from({ length: lanes }, (_, i) =>
        generateNotesQuiz(
          text,
          Math.min(QUIZ_BATCH, need),
          phase === 2 ? [] : [...asked, ...here],
          Math.min(1.0, 0.55 + 0.12 * (dry + i)) // vary per lane so they differ
        ).then((r) => r.questions || []).catch(() => [])
      )
    );
    const fresh = freshOnly(packs.flat(), asked, here).slice(0, need);

    const quiz = getQuiz(quizId);
    if (!quiz) return;
    if (fresh.length) {
      quiz.questions = [...quiz.questions, ...fresh];
      if (phase === 0) addAsked(pk, fresh.map((q) => q.question));
      dry = 0;
      quiz.streaming = quiz.questions.length < QUIZ_TARGET;
      saveQuiz(quiz);
      dispatchAppend(quizId, quiz.questions.length, !quiz.streaming);
      if (!quiz.streaming) return;
    } else {
      dry += 1;
      if (dry >= DRY_BEFORE_RELAX) {
        if (phase >= 2) break;  // every angle dry → pad below
        phase += 1; dry = 0;
      }
    }
  }

  // Still short → recycle this quiz's own questions with shuffled options so it
  // still hands over exactly 50.
  const quiz = getQuiz(quizId);
  if (!quiz) return;
  if (quiz.questions.length) {
    const base = quiz.questions.slice();
    for (let i = 0; quiz.questions.length < QUIZ_TARGET; i++) quiz.questions.push(reshuffle(base[i % base.length]));
  }
  quiz.streaming = false;
  saveQuiz(quiz);
  dispatchAppend(quizId, quiz.questions.length, true);
}

// Build a notes quiz from `text`, deduped against `pk`'s asked-history. Saves the
// quiz (streaming flag set if under target) and kicks off the background top-up.
// Returns { quizId, done }. The caller navigates to /quizzes/<quizId>.
// Throws Error("nahi bana") if even a no-exclude high-temp call yields nothing.
export async function startNotesQuiz({ text, pk, title }) {
  let asked = getAsked(pk);
  let first = await generateNotesQuiz(text, QUIZ_BATCH, asked).catch(() => ({ questions: [] }));
  let fresh = freshOnly(first.questions, asked);
  if (!fresh.length) {
    // Exhausted → new cycle: forget history, generate from scratch (repeats ok).
    clearAsked(pk); asked = [];
    first = await generateNotesQuiz(text, QUIZ_BATCH, []).catch(() => ({ questions: [] }));
    fresh = freshOnly(first.questions, []);
  }
  if (!fresh.length) {
    first = await generateNotesQuiz(text, QUIZ_BATCH, [], 0.95); // last try, high temp
    fresh = freshOnly(first.questions, []);
  }
  if (!fresh.length) throw new Error("nahi bana");
  addAsked(pk, fresh.map((q) => q.question));

  const quizId = makeId();
  const done = fresh.length >= QUIZ_TARGET;
  saveQuiz({
    id: quizId, title, source: "notesquiz",
    createdAt: new Date().toISOString(), questions: fresh, streaming: !done,
  });
  if (!done) streamNotesQuiz(text, quizId, pk);
  return { quizId, done };
}

// ---- whole-chapter quiz: pull questions from EVERY page, not one big blob ----
// A chapter can be many pages; feeding one truncated blob to the model only ever
// samples the first page or two. Instead we generate per page and round-robin
// across pages so the 50 are spread over the WHOLE chapter.

// Run fn over items with a small concurrency cap (so a 30-page chapter doesn't
// fire 30 API calls at once).
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i], i); }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

// Round-robin pick from per-page lists (dedup by stem via `seen`) up to `cap`, so
// the first N questions are spread one-per-page rather than all from page 1.
function interleaveFresh(lists, cap, seen) {
  const idxs = lists.map(() => 0);
  const out = [];
  let progressed = true;
  while (out.length < cap && progressed) {
    progressed = false;
    for (let i = 0; i < lists.length && out.length < cap; i++) {
      while (idxs[i] < lists[i].length) {
        const q = lists[i][idxs[i]++];
        const k = normQ(q?.question);
        if (k && !seen.has(k)) { seen.add(k); out.push(q); progressed = true; break; }
      }
    }
  }
  return out;
}

async function streamChapterQuiz(pages, quizId, pk) {
  for (let round = 0; round < 8; round++) {
    const before = getQuiz(quizId);
    if (!before) return;
    if (before.questions.length >= QUIZ_TARGET) break;
    const seen = new Set(before.questions.map((q) => normQ(q.question)));
    const here = before.questions.map((q) => q.question);
    const need = QUIZ_TARGET - before.questions.length;
    const perPage = Math.max(1, Math.ceil(need / pages.length));
    const temp = Math.min(1.0, 0.7 + 0.06 * round);

    const packs = await mapLimit(pages, 5, (t) =>
      generateNotesQuiz(t, Math.min(QUIZ_BATCH, perPage + 1), here, temp)
        .then((r) => r.questions || []).catch(() => [])
    );
    const fresh = interleaveFresh(packs, need, seen);

    const quiz = getQuiz(quizId);
    if (!quiz) return;
    if (fresh.length) {
      quiz.questions = [...quiz.questions, ...fresh];
      addAsked(pk, fresh.map((q) => q.question));
      quiz.streaming = quiz.questions.length < QUIZ_TARGET;
      saveQuiz(quiz);
      dispatchAppend(quizId, quiz.questions.length, !quiz.streaming);
      if (!quiz.streaming) return;
    }
    // no fresh this round → loop retries at a higher temperature; pad below.
  }

  // Thin chapter / model dry → pad to exactly 50 with reshuffled repeats.
  const quiz = getQuiz(quizId);
  if (!quiz) return;
  if (quiz.questions.length) {
    const base = quiz.questions.slice();
    for (let i = 0; quiz.questions.length < QUIZ_TARGET; i++) quiz.questions.push(reshuffle(base[i % base.length]));
  }
  quiz.streaming = false;
  saveQuiz(quiz);
  dispatchAppend(quizId, quiz.questions.length, true);
}

// Build a 50-Q quiz spread over ALL of a chapter's pages. `texts` = each page's
// transcribed text. First batch covers every page (fast), rest streams to 50.
export async function startChapterQuiz({ texts, pk, title }) {
  const pages = (texts || []).map((t) => String(t || "").trim()).filter((t) => t.length >= 30);
  if (!pages.length) throw new Error("nahi bana");

  const perPage = Math.max(2, Math.ceil(QUIZ_TARGET / pages.length));
  const round1 = await mapLimit(pages, 5, (t, i) =>
    generateNotesQuiz(t, Math.min(QUIZ_BATCH, perPage + 1), [], Math.min(1.0, 0.6 + 0.03 * i))
      .then((r) => r.questions || []).catch(() => [])
  );
  const seen = new Set();
  const questions = interleaveFresh(round1, QUIZ_TARGET, seen);
  if (!questions.length) throw new Error("nahi bana");
  addAsked(pk, questions.map((q) => q.question));

  const quizId = makeId();
  const done = questions.length >= QUIZ_TARGET;
  saveQuiz({
    id: quizId, title, source: "notesquiz",
    createdAt: new Date().toISOString(), questions, streaming: !done,
  });
  if (!done) streamChapterQuiz(pages, quizId, pk);
  return { quizId, done };
}
