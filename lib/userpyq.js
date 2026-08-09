// User's OWN PYQ banks — books/topics/questions the user builds from their own
// PDFs (Settings → 📚 PYQ Manager). Unlike the shipped banks (public/*, read-
// only), these live in localStorage under cgl.* so they persist AND ride the
// Supabase sync to every device.
//
//   cgl.userpyq.books     [{ id:"ub_..", name, subject, icon, createdAt }]
//   cgl.userpyq.topics    [{ id:"u_..",  bookId, name, createdAt }]
//   cgl.userpyq.questions { [topicId]: [{ question, options, answer, explanation, source }] }
//
// Topic ids start with "u_" on purpose: /pyq/gk/[slug] treats such a slug as a
// user topic and loads it from here instead of the static gkbank — so user
// questions get the exact same question UI (cards, done-tabs, resume) as
// GK Tricks. `subject` (gs/english/maths/reasoning) rides on the BOOK and picks
// the right AI prompt on the cards.

import { makeId } from "./storage";

const KEYS = {
  books: "cgl.userpyq.books",
  topics: "cgl.userpyq.topics",
  questions: "cgl.userpyq.questions",
};

function read(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; }
  catch { return fallback; }
}
function write(key, value) { localStorage.setItem(key, JSON.stringify(value)); }

// ---------------- books ----------------
export function getUserBooks() { return read(KEYS.books, []); }
export function getUserBook(id) { return getUserBooks().find((b) => b.id === id) || null; }
export function addUserBook(name, subject = "gs", icon = "📘") {
  const n = String(name || "").trim();
  if (!n) return null;
  const books = getUserBooks();
  const dup = books.find((b) => b.name.toLowerCase() === n.toLowerCase());
  if (dup) return dup;
  const book = { id: "ub_" + makeId(), name: n, subject, icon, createdAt: new Date().toISOString() };
  write(KEYS.books, [...books, book]);
  return book;
}
export function deleteUserBook(id) {
  const topics = getUserTopics().filter((t) => t.bookId === id);
  const qmap = read(KEYS.questions, {});
  for (const t of topics) delete qmap[t.id];
  write(KEYS.questions, qmap);
  write(KEYS.topics, getUserTopics().filter((t) => t.bookId !== id));
  write(KEYS.books, getUserBooks().filter((b) => b.id !== id));
}

// ---------------- topics (chapters/subjects inside a book) ----------------
export function getUserTopics(bookId) {
  const all = read(KEYS.topics, []);
  return bookId ? all.filter((t) => t.bookId === bookId) : all;
}
export function getUserTopic(id) { return getUserTopics().find((t) => t.id === id) || null; }
export function addUserTopic(bookId, name) {
  const n = String(name || "").trim();
  if (!n || !bookId) return null;
  const all = read(KEYS.topics, []);
  const dup = all.find((t) => t.bookId === bookId && t.name.toLowerCase() === n.toLowerCase());
  if (dup) return dup;
  const topic = { id: "u_" + makeId(), bookId, name: n, createdAt: new Date().toISOString() };
  write(KEYS.topics, [...all, topic]);
  return topic;
}
export function deleteUserTopic(id) {
  const qmap = read(KEYS.questions, {});
  delete qmap[id];
  write(KEYS.questions, qmap);
  write(KEYS.topics, getUserTopics().filter((t) => t.id !== id));
}

// ---------------- questions ----------------
export function isUserTopicId(slug) { return typeof slug === "string" && slug.startsWith("u_"); }

export function getUserTopicQuestions(topicId) {
  const list = read(KEYS.questions, {})[topicId];
  return Array.isArray(list) ? list : [];
}
function qKey(q) {
  return String(q?.question || "").toLowerCase().replace(/\s+/g, " ").trim().slice(0, 200);
}
// Append, skipping duplicates (same normalized question text). Returns how many
// were actually NEW — the caller reports "added N · skipped M duplicates".
export function addUserTopicQuestions(topicId, questions) {
  const clean = (questions || []).filter(
    (q) => q && q.question && Array.isArray(q.options) && q.options.length >= 2
  );
  if (!clean.length) return 0;
  const qmap = read(KEYS.questions, {});
  const cur = Array.isArray(qmap[topicId]) ? qmap[topicId] : [];
  const seen = new Set(cur.map(qKey));
  const fresh = [];
  for (const q of clean) {
    const k = qKey(q);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    fresh.push({
      question: String(q.question),
      options: q.options.map(String),
      answer: Number.isInteger(q.answer) ? q.answer : Number(q.answer) || 0,
      explanation: String(q.explanation || q.solution || ""),
      diagram: String(q.diagram || ""),
      source: String(q.source || ""),
    });
  }
  if (fresh.length) {
    qmap[topicId] = [...cur, ...fresh];
    write(KEYS.questions, qmap); // quota bharne par ye throw karega — caller dikhaye
  }
  return fresh.length;
}
export function userTopicCount(topicId) { return getUserTopicQuestions(topicId).length; }
export function userBookCount(bookId) {
  return getUserTopics(bookId).reduce((a, t) => a + userTopicCount(t.id), 0);
}
