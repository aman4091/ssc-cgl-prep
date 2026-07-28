// Telegram quiz-poll helpers — SERVER-SAFE (no window / localStorage).
//
// Ye file `app/api/telegram/*` routes aur (kuch pure helpers) client dono use
// karte hain. Kaam sirf ek: ek standard MCQ ({question, options, answer,
// solution/explanation}) ko Telegram ke sendPoll (type:"quiz") payload mein
// badalna, saath hi vocab (word -> meaning) ka MCQ banana. Yahan se kuch bhi
// delete/mutate nahi hota — sab read + transform.

// Telegram sendPoll hard limits:
export const TG_LIMITS = {
  question: 300, // poll question 1..300 chars
  option: 100,   // har option 1..100 chars
  options: 10,   // 2..10 options
  explanation: 200, // inline (bulb) explanation 0..200 chars
};

export function clamp(s, n) {
  const t = String(s == null ? "" : s).replace(/\s+/g, " ").trim();
  if (t.length <= n) return t;
  return t.slice(0, Math.max(0, n - 1)).trimEnd() + "…";
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// A stable-ish key for "already sent" dedup. Uses id when present (banks have
// one), else subject + normalized question.
export function stdKey(subject, q) {
  if (q && q.id) return `${subject}:${q.id}`;
  const norm = String(q?.question || "").toLowerCase().replace(/\s+/g, " ").trim().slice(0, 120);
  return `${subject}:${norm}`;
}

// Bank question -> normalized MCQ. engbank uses `solution`, gkbank uses
// `explanation`; passage-based (cloze/comprehension) questions are skipped by
// the caller (they don't fit a poll bubble).
export function normalizeBankQ(q) {
  return {
    id: q.id || "",
    question: q.question || "",
    options: Array.isArray(q.options) ? q.options : [],
    answer: Number.isInteger(q.answer) ? q.answer : -1,
    solution: q.solution || q.explanation || "",
    chapter: q.chapter || "",
  };
}

// True only when a normalized MCQ can safely become a quiz poll.
export function pollable(q) {
  const opts = (q.options || []).map((o) => String(o || "").trim()).filter(Boolean);
  if (opts.length < 2 || opts.length > TG_LIMITS.options) return false;
  if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= (q.options || []).length) return false;
  if (String(q.question || "").trim().length < 1) return false;
  if (q.passageId || q.passage) return false; // passage-based -> too long for a poll
  return true;
}

// Standard MCQ -> Telegram sendPoll payload + the FULL record we persist so the
// webhook can post the complete solution and the app can import the miss.
//
// `subject` is "english" | "gs" | "vocab". `label` is a short context tag put
// before the question (e.g. "Antonyms") so a one-word stem isn't ambiguous.
export function toQuizPoll({ subject, q, label = "" }) {
  const opts = q.options.map((o) => clamp(o, TG_LIMITS.option));
  const correctText = opts[q.answer];
  const stem = label ? `${label} — ${q.question}` : q.question;
  const solution = String(q.solution || "").trim();
  return {
    poll: {
      question: clamp(stem, TG_LIMITS.question),
      options: opts,
      type: "quiz",
      correct_option_id: q.answer,
      is_anonymous: false, // REQUIRED so poll_answer carries the voter (tracking)
      explanation: clamp(solution || `Sahi: ${correctText}`, TG_LIMITS.explanation),
    },
    // Persisted alongside the returned poll_id (see /api/telegram/post):
    record: {
      subject,
      key: stdKey(subject, q),
      question: stem,
      options: opts,
      answer: q.answer,
      solution, // FULL text (untruncated) for the follow-up message + app import
    },
  };
}

// ---- Vocab: word -> meaning MCQ (user's chosen format) --------------------
// `item` = { word, def, type }. `pool` = all ows items. Correct option is the
// word's own meaning (def); 3 distractor meanings come from other words, same
// type preferred so an idiom quiz has idiom-style options.
export function buildVocabPoll(item, pool) {
  const def = String(item.def || "").trim();
  if (!def) return null;
  const others = pool.filter(
    (p) => p.word !== item.word && String(p.def || "").trim() && String(p.def).trim() !== def,
  );
  const sameType = others.filter((p) => p.type === item.type);
  const base = sameType.length >= 3 ? sameType : others;
  const distract = shuffle(base).slice(0, 3).map((p) => String(p.def).trim());
  if (distract.length < 1) return null; // need at least a 2-option poll
  const optionTexts = shuffle([def, ...distract]);
  const q = {
    id: "vocab:" + String(item.word).toLowerCase().trim(),
    question: `Meaning of: ${item.word}`,
    options: optionTexts,
    answer: optionTexts.indexOf(def),
    solution: `${item.word} → ${def}`,
  };
  if (!pollable(q)) return null;
  return toQuizPoll({ subject: "vocab", q, label: "🔤 Vocab" });
}
