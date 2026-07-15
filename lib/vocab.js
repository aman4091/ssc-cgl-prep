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

// ---- progress ----
// Shape: { [day]: ["ows", "idiom", ...] } — which TYPES of that day are quizzed.
// Older data was a flat [dayNumber...] array written only by the all-types quiz,
// so those days migrate to "every type done".
function readProgress() {
  const raw = read(VKEYS.progress, {});
  if (Array.isArray(raw)) {
    const out = {};
    for (const d of raw) out[d] = TYPES.map((t) => t.key);
    return out;
  }
  return raw && typeof raw === "object" ? raw : {};
}

export function markDayTypeDone(day, type) {
  const all = readProgress();
  const set = new Set(all[day] || []);
  set.add(type);
  all[day] = [...set];
  write(VKEYS.progress, all);
}

// The all-types quiz covers every type of that day in one go.
export function markDayDone(day) {
  const all = readProgress();
  all[day] = TYPES.map((t) => t.key);
  write(VKEYS.progress, all);
}

// A day is done when every type that HAS words that day has been quizzed — a day
// with no idioms shouldn't wait forever for an idiom quiz.
export function getDayProgress(day) {
  const doneTypes = new Set(readProgress()[day] || []);
  const present = TYPES.filter((t) => getDayTypeItems(day, t.key).length > 0).map((t) => t.key);
  const done = present.filter((k) => doneTypes.has(k));
  return { doneTypes: done, presentTypes: present, done: present.length > 0 && done.length === present.length };
}

export function getDaysOverview() {
  const typeCounts = TYPES.map((t) => getTypeItems(t.key).length);
  const nDays = typeCounts.reduce((mx, c) => Math.max(mx, Math.ceil(c / PER_DAY)), 0);
  const days = [];
  for (let d = 1; d <= nDays; d++) {
    let count = 0;
    for (const c of typeCounts) count += Math.max(0, Math.min(PER_DAY, c - (d - 1) * PER_DAY));
    const p = getDayProgress(d);
    days.push({ day: d, count, done: p.done, doneCount: p.doneTypes.length, totalCount: p.presentTypes.length });
  }
  return days;
}

// ---- word detail cache ----

// A detail with no meaning is useless — the AI hiccuped. Treat it as a miss so
// it gets fetched again instead of showing a blank card forever.
function usable(d) {
  return !!d && typeof d === "object" && !!String(d.meaning || "").trim();
}

export function getDetail(word) {
  const all = read(VKEYS.details, {});
  const d = all[word];
  return usable(d) ? d : null;
}
export function setDetail(word, detail) {
  if (!usable(detail)) return;   // never cache a blank — it would stick forever
  const all = read(VKEYS.details, {});
  all[word] = detail;
  write(VKEYS.details, all);
}
export function clearDetail(word) {
  const all = read(VKEYS.details, {});
  if (!(word in all)) return;
  delete all[word];
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

// ---- coverage cycle: don't repeat a word until every word in the pool has been
// shown once. A per-scope "seen" set lives in localStorage; when a scope's pool
// is fully covered the cycle resets and a fresh pass begins. This is what stops
// vocab quizzes / Vocab Rush from showing the same word again too early. ----
const CYCLE_KEY = "cgl.vocab.cycle";
function getCycles() { return read(CYCLE_KEY, {}); }
function saveCycles(c) { write(CYCLE_KEY, c); }
function wkey(it) { return String(it?.word || "").trim().toLowerCase(); }

// Pick up to `count` items from `items`, preferring ones NOT yet seen in this
// scope's cycle. Marks the picks as seen (resetting when the pool is exhausted).
// Never repeats a word within one pick, and drops stale keys no longer in the pool.
function pickCycleItems(scopeKey, items, count) {
  const byKey = new Map();
  for (const it of items) { const k = wkey(it); if (k && !byKey.has(k)) byKey.set(k, it); }
  const allKeys = [...byKey.keys()];
  const want = Math.min(count, allKeys.length);
  if (want === 0) return [];

  const cycles = getCycles();
  let seen = new Set((cycles[scopeKey] || []).filter((k) => byKey.has(k))); // drop removed words
  const used = new Set();
  const pick = [];
  while (pick.length < want) {
    let avail = allKeys.filter((k) => !seen.has(k) && !used.has(k));
    if (avail.length === 0) {
      // whole cycle covered -> reset, but never repeat within this same pick
      seen = new Set(used);
      avail = allKeys.filter((k) => !used.has(k));
      if (avail.length === 0) break;
    }
    const k = avail[Math.floor(Math.random() * avail.length)];
    pick.push(k); used.add(k); seen.add(k);
  }
  cycles[scopeKey] = [...seen];
  saveCycles(cycles);
  return pick.map((k) => byKey.get(k));
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

// scope "cum" = every word learned so far (Day 1..day); "day" = only that day's
// words. Each scope keeps its own coverage cycle, so a Day-N-only quiz doesn't
// burn through the cumulative cycle (and vice-versa).

// All types together. Words are picked via the coverage cycle so nothing repeats
// until every word in that scope has been quizzed.
export function buildDayQuiz(day, scope = "cum") {
  const pool = getOws();
  const src = scope === "day" ? getDayItems(day) : getCumulativeItems(day);
  const items = pickCycleItems(scope === "day" ? `vmixed:d${day}` : `vmixed:${day}`, src, QUIZ_LIMIT);
  const questions = items.map((it) => buildMcq(it, pool));
  return {
    id: makeId(),
    title: `Vocab Quiz · ${scope === "day" ? `Day ${day}` : `Day 1–${day}`}`,
    source: "vocab-day",
    vocabDay: day,        // submitting this quiz ticks Day `day`
    createdAt: new Date().toISOString(),
    questions,
  };
}

// Same but only ONE type (OWS / idiom / vocab).
export function buildTypeQuiz(day, type, scope = "cum") {
  const pool = getOws();
  const src = scope === "day" ? getDayTypeItems(day, type) : getCumulativeItems(day, type);
  const items = pickCycleItems(scope === "day" ? `vtype:${type}:d${day}` : `vtype:${type}:${day}`, src, QUIZ_LIMIT);
  const questions = items.map((it) => buildMcq(it, pool));
  return {
    id: makeId(),
    title: `${typeLabel(type)} Quiz · ${scope === "day" ? `Day ${day}` : `Day 1–${day}`}`,
    source: "vocab-type",
    vocabDay: day,        // submitting this quiz ticks this one type of Day `day`
    vocabType: type,
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

// Random MCQ limited to selected day numbers (Vocab Rush). Empty/undefined `days`
// => whole pool (all days). Words are the union of every selected day (all types).
export function randomMcqFromDays(days) {
  const full = getOws();
  const set = new Set((days || []).map((d) => Number(d)).filter((d) => d >= 1));
  let pool = full;
  let scope = "vrush:all";
  if (set.size > 0) {
    const sorted = [...set].sort((a, b) => a - b);
    scope = "vrush:" + sorted.join(",");
    const seen = new Set();
    pool = [];
    for (const d of sorted) {
      for (const it of getDayItems(d)) {
        const k = String(it.word).toLowerCase();
        if (!seen.has(k)) { seen.add(k); pool.push(it); }
      }
    }
  }
  if (pool.length === 0) return null;
  // coverage cycle: cover every word once before any repeats (no more early dupes)
  const picked = pickCycleItems(scope, pool, 1);
  const item = picked[0] || pool[Math.floor(Math.random() * pool.length)];
  // need at least 4 items for 3 distractors; fall back to full pool if a day is tiny
  return buildMcq(item, pool.length >= 4 ? pool : full);
}
