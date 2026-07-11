// Vocab (One Word Substitution etc.) local store + helpers.
import { makeId } from "./storage";

export const VKEYS = {
  ows: "cgl.vocab.ows",         // [{ def, word, type }]
  details: "cgl.vocab.details", // { [word]: { meaning, trick, synonyms[], antonyms[] } }
  progress: "cgl.vocab.done",   // [dayNumbers...]
  meta: "cgl.vocab.meta",       // { source, count, perDay }
  bookmarks: "cgl.vocab.bookmarks", // [words...]
};

export const PER_DAY = 50; // fixed 50 words per day; Day 1 fills first, then shifts

// Entry types
export const TYPES = [
  { key: "ows", label: "OWS", icon: "🔤" },
  { key: "idiom", label: "Idiom / Phrase", icon: "💬" },
  { key: "vocab", label: "Vocab", icon: "📖" },
];
export function typeLabel(t) {
  return (TYPES.find((x) => x.key === t) || TYPES[2]).label;
}
export function typeIcon(t) {
  return (TYPES.find((x) => x.key === t) || TYPES[2]).icon;
}
function normalizeType(t) {
  const v = String(t || "").toLowerCase();
  if (v.startsWith("ows") || v.includes("one word")) return "ows";
  if (v.startsWith("idiom") || v.includes("phrase")) return "idiom";
  return "vocab";
}

// Each TYPE gets its OWN day sequence starting at Day 1. So idioms fill idiom
// Day 1 first, vocab fills vocab Day 1 first, etc. — a new type never lands on
// the "last" day of another type. The global number of days = the max across types.
export function totalDays() {
  return TYPES.reduce((mx, t) => Math.max(mx, Math.ceil(getTypeItems(t.key).length / PER_DAY)), 0);
}

// All entries of one type, in insertion order.
export function getTypeItems(type) {
  return getOws().filter((it) => it.type === type);
}

function read(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function write(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

export function getOws() {
  // legacy entries saved before "type" existed -> treat as OWS
  return read(VKEYS.ows, []).map((it) => ({
    def: it.def || "",
    word: it.word,
    type: it.type ? normalizeType(it.type) : "ows",
  }));
}

// Day N of a TYPE = that type's own items in [ (N-1)*PER_DAY, N*PER_DAY ).
export function getDayTypeItems(day, type) {
  const list = getTypeItems(type);
  const start = (day - 1) * PER_DAY;
  return list.slice(start, start + PER_DAY);
}

export function getDayTypeCounts(day) {
  const counts = {};
  for (const t of TYPES) counts[t.key] = getDayTypeItems(day, t.key).length;
  return counts;
}

export function saveOws(list) {
  // dedupe by word (case-insensitive), keep first def
  const seen = new Set();
  const clean = [];
  for (const it of list) {
    if (!it || !it.word) continue;
    const key = String(it.word).trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    clean.push({
      def: String(it.def || "").trim(),
      word: String(it.word).trim(),
      type: normalizeType(it.type),
    });
  }
  write(VKEYS.ows, clean);
  write(VKEYS.meta, { count: clean.length, perDay: PER_DAY, savedAt: new Date().toISOString() });
  return clean;
}

// Merge new entries into the existing set (dedupe + re-split into days).
export function appendOws(newItems) {
  const existing = getOws();
  return saveOws(existing.concat(newItems || []));
}

// Add a single entry (used by the syno/anto popup "Add to ..." button).
export function addEntry(word, def, type) {
  return appendOws([{ word, def, type }]);
}

// Change ONE entry's type in place (order preserved, so day assignment unchanged).
export function setEntryType(word, type) {
  const key = String(word || "").trim().toLowerCase();
  const list = read(VKEYS.ows, []).map((it) => {
    if (String(it.word || "").trim().toLowerCase() === key) {
      return { ...it, type: normalizeType(type) };
    }
    return it;
  });
  return saveOws(list);
}

// Bulk: move every entry of one type to another (e.g. all "vocab" -> "ows").
export function moveAllType(fromType, toType) {
  const from = normalizeType(fromType);
  const to = normalizeType(toType);
  const list = read(VKEYS.ows, []).map((it) => {
    const cur = it.type ? normalizeType(it.type) : "ows";
    return cur === from ? { ...it, type: to } : it;
  });
  return saveOws(list);
}

// ---- bookmarks ----
export function getBookmarks() {
  return read(VKEYS.bookmarks, []);
}
export function isBookmarked(word) {
  return getBookmarks().includes(word);
}
export function toggleBookmark(word) {
  const set = new Set(getBookmarks());
  if (set.has(word)) set.delete(word);
  else set.add(word);
  write(VKEYS.bookmarks, [...set]);
  return set.has(word);
}
export function getBookmarkItems() {
  const set = new Set(getBookmarks());
  return getOws().filter((it) => set.has(it.word));
}

export function clearOws() {
  localStorage.removeItem(VKEYS.ows);
  localStorage.removeItem(VKEYS.meta);
  localStorage.removeItem(VKEYS.progress);
}

export function getMeta() {
  const ows = getOws();
  return { count: ows.length, perDay: PER_DAY, days: totalDays() };
}

// day is 1-based. Combined Day N = Day N of every type, concatenated.
export function getDayItems(day) {
  return TYPES.flatMap((t) => getDayTypeItems(day, t.key));
}

export function getDaysOverview() {
  const done = new Set(read(VKEYS.progress, []));
  const typeCounts = TYPES.map((t) => getTypeItems(t.key).length);
  const nDays = typeCounts.reduce((mx, c) => Math.max(mx, Math.ceil(c / PER_DAY)), 0);
  const days = [];
  for (let d = 1; d <= nDays; d++) {
    let count = 0;
    for (const c of typeCounts) count += Math.max(0, Math.min(PER_DAY, c - (d - 1) * PER_DAY));
    days.push({ day: d, count, done: done.has(d) });
  }
  return days;
}

export function markDayDone(day) {
  const done = new Set(read(VKEYS.progress, []));
  done.add(day);
  write(VKEYS.progress, [...done]);
}

// ---- word detail cache ----
export function getDetail(word) {
  const all = read(VKEYS.details, {});
  return all[word] || null;
}
export function setDetail(word, detail) {
  const all = read(VKEYS.details, {});
  all[word] = detail;
  write(VKEYS.details, all);
}

// ---- build a local MCQ quiz (no AI): definition -> pick correct word ----
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function buildMcq(item, pool) {
  // prefer distractors of the SAME type (so an idiom quiz has idiom options)
  const sameType = pool.filter((p) => p.word !== item.word && p.type === item.type);
  const base = sameType.length >= 3 ? sameType : pool.filter((p) => p.word !== item.word);
  const distractors = shuffle(base).slice(0, 3).map((p) => p.word);
  const options = shuffle([item.word, ...distractors]);
  return {
    question: item.def || `One word for: ${item.word}`,
    options,
    answer: options.indexOf(item.word),
    explanation: `${item.def} → ${item.word}`,
    diagram: "",
  };
}

const QUIZ_LIMIT = 50; // max questions per quiz (random pick from cumulative pool)

// Cumulative items from Day 1 up to & including `day`.
// For one type: that type's first day*PER_DAY items. Mixed: each type's cumulative.
export function getCumulativeItems(day, type) {
  if (type) return getTypeItems(type).slice(0, day * PER_DAY);
  return TYPES.flatMap((t) => getTypeItems(t.key).slice(0, day * PER_DAY));
}

// Day quiz = ALL words learned so far (Day 1..day), RANDOM order, all types.
export function buildDayQuiz(day) {
  const pool = getOws();
  const items = shuffle(getCumulativeItems(day)).slice(0, QUIZ_LIMIT);
  const questions = items.map((it) => buildMcq(it, pool));
  return {
    id: makeId(),
    title: `Vocab Quiz · Day 1–${day}`,
    source: "vocab-day",
    createdAt: new Date().toISOString(),
    questions,
  };
}

// Same but only one type (OWS / idiom / vocab), cumulative + random.
export function buildTypeQuiz(day, type) {
  const pool = getOws();
  const items = shuffle(getCumulativeItems(day, type)).slice(0, QUIZ_LIMIT);
  const questions = items.map((it) => buildMcq(it, pool));
  return {
    id: makeId(),
    title: `${typeLabel(type)} Quiz · Day 1–${day}`,
    source: "vocab-type",
    createdAt: new Date().toISOString(),
    questions,
  };
}

// A single random MCQ from the whole pool (for hourly rush)
export function randomMcq() {
  const pool = getOws();
  if (pool.length < 4) return null;
  const item = pool[Math.floor(Math.random() * pool.length)];
  return buildMcq(item, pool);
}
