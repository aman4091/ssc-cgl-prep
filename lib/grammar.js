// Chapters + Rules store (local-first). Generic across subjects so the same
// UI works for English grammar, Maths, GS and Reasoning.
import { makeId } from "./storage";
import { deleteFile } from "./filestore";

export const GKEYS = {
  chapters: "cgl.study.chapters", // [{ id, subject, name, createdAt, videos:[{url,title}] }]
  rules: "cgl.study.rules",       // [{ id, chapterId, text, detail, examples[], videoTime, videoUrl, createdAt }]
  pdfs: "cgl.study.pdfs",         // { [chapterId]: [{ id, name, addedAt }] }  (blob lives in IndexedDB)
  notes: "cgl.study.notes",       // { [chapterId]: [{ id, name, addedAt }] }  (theory/notes images; blob in IndexedDB)
  questions: "cgl.study.questions", // { [chapterId]: [ MCQ objects ] }
};

export const SUBJECTS = {
  english: { label: "English Grammar", short: "English", icon: "✍️" },
  math: { label: "Maths", short: "Maths", icon: "🧮" },
  gs: { label: "General Studies", short: "GS", icon: "🌍" },
  reasoning: { label: "Reasoning", short: "Reasoning", icon: "🧠" },
};
export function subjectMeta(subject) {
  if (SUBJECTS[subject]) return SUBJECTS[subject];
  if (subject && subject.startsWith("pyq-")) {
    const base = SUBJECTS[subject.slice(4)] || { label: subject.slice(4), short: subject.slice(4), icon: "📘" };
    return { label: `PYQ · ${base.label}`, short: `PYQ ${base.short}`, icon: base.icon };
  }
  return { label: subject, short: subject, icon: "📘" };
}
// suggestions work for base subjects and their pyq- variants
export function suggestedFor(subject) {
  if (SUGGESTED[subject]) return SUGGESTED[subject];
  if (subject && subject.startsWith("pyq-")) return SUGGESTED[subject.slice(4)] || [];
  return [];
}

// Suggested starter chapters per subject (user can add their own too).
export const SUGGESTED = {
  english: ["Noun", "Pronoun", "Subject-Verb Agreement", "Tenses", "Articles", "Prepositions", "Adjectives & Adverbs", "Conjunctions", "Voice (Active/Passive)", "Narration", "Error Spotting", "Sentence Improvement"],
  math: ["Number System", "Percentage", "Ratio & Proportion", "Average", "Profit & Loss", "Time & Work", "Time Speed Distance", "Algebra", "Geometry", "Trigonometry", "Mensuration", "Data Interpretation"],
  gs: ["History", "Geography", "Polity", "Economy", "General Science", "Static GK", "Current Affairs"],
  reasoning: ["Analogy", "Classification", "Series", "Coding-Decoding", "Blood Relations", "Direction Sense", "Ranking & Order", "Syllogism", "Venn Diagram", "Non-Verbal"],
};

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

// ---------- Chapters ----------
export function getChapters(subject) {
  const all = read(GKEYS.chapters, []);
  return subject ? all.filter((c) => c.subject === subject) : all;
}
export function getChapter(id) {
  return read(GKEYS.chapters, []).find((c) => c.id === id) || null;
}
export function addChapter(subject, name) {
  const nm = String(name || "").trim();
  if (!nm) return null;
  const all = read(GKEYS.chapters, []);
  // avoid duplicate name within the same subject
  const dup = all.find((c) => c.subject === subject && c.name.toLowerCase() === nm.toLowerCase());
  if (dup) return dup;
  const chapter = { id: "ch_" + makeId(), subject, name: nm, createdAt: new Date().toISOString(), videos: [] };
  all.unshift(chapter);
  write(GKEYS.chapters, all);
  return chapter;
}
export function renameChapter(id, name) {
  const all = read(GKEYS.chapters, []).map((c) => (c.id === id ? { ...c, name: String(name).trim() || c.name } : c));
  write(GKEYS.chapters, all);
}
export async function deleteChapter(id) {
  // remove rules
  write(GKEYS.rules, read(GKEYS.rules, []).filter((r) => r.chapterId !== id));
  // remove pdfs (blobs + meta)
  const pdfs = read(GKEYS.pdfs, {});
  for (const p of pdfs[id] || []) { try { await deleteFile(p.id); } catch { /* ignore */ } }
  delete pdfs[id];
  write(GKEYS.pdfs, pdfs);
  // remove note images (blobs + meta)
  const notes = read(GKEYS.notes, {});
  for (const n of notes[id] || []) { try { await deleteFile(n.id); } catch { /* ignore */ } }
  delete notes[id];
  write(GKEYS.notes, notes);
  // remove questions
  const qs = read(GKEYS.questions, {});
  delete qs[id];
  write(GKEYS.questions, qs);
  // remove chapter
  write(GKEYS.chapters, read(GKEYS.chapters, []).filter((c) => c.id !== id));
}
export function chapterRuleCount(id) {
  return read(GKEYS.rules, []).filter((r) => r.chapterId === id).length;
}

// ---------- Chapter videos ----------
export function addVideo(chapterId, url, title) {
  const all = read(GKEYS.chapters, []).map((c) => {
    if (c.id !== chapterId) return c;
    const videos = [...(c.videos || []), { url: String(url).trim(), title: String(title || "").trim() }];
    return { ...c, videos };
  });
  write(GKEYS.chapters, all);
  return getChapter(chapterId);
}
export function removeVideo(chapterId, idx) {
  const all = read(GKEYS.chapters, []).map((c) => {
    if (c.id !== chapterId) return c;
    const videos = (c.videos || []).filter((_, i) => i !== idx);
    return { ...c, videos };
  });
  write(GKEYS.chapters, all);
  return getChapter(chapterId);
}

// ---------- Rules ----------
export function getRules(chapterId) {
  return read(GKEYS.rules, []).filter((r) => r.chapterId === chapterId);
}
export function addRule(chapterId, text) {
  const t = String(text || "").trim();
  if (!t) return null;
  const all = read(GKEYS.rules, []);
  const rule = { id: "rl_" + makeId(), chapterId, text: t, detail: "", examples: [], videoTime: null, videoUrl: "", createdAt: new Date().toISOString() };
  all.push(rule);
  write(GKEYS.rules, all);
  return rule;
}
export function addRules(chapterId, texts) {
  const clean = (texts || []).map((t) => String(t || "").trim()).filter(Boolean);
  const all = read(GKEYS.rules, []);
  const added = [];
  for (const t of clean) {
    const rule = { id: "rl_" + makeId() + Math.floor(Math.random() * 1e4).toString(36), chapterId, text: t, detail: "", examples: [], videoTime: null, videoUrl: "", createdAt: new Date().toISOString() };
    all.push(rule);
    added.push(rule);
  }
  write(GKEYS.rules, all);
  return added;
}
export function updateRule(id, patch) {
  const all = read(GKEYS.rules, []).map((r) => (r.id === id ? { ...r, ...patch } : r));
  write(GKEYS.rules, all);
  return all.find((r) => r.id === id) || null;
}
export function deleteRule(id) {
  write(GKEYS.rules, read(GKEYS.rules, []).filter((r) => r.id !== id));
}

// ---------- Theory / Notes images (metadata; blob is in IndexedDB) ----------
export function getNotes(chapterId) {
  return read(GKEYS.notes, {})[chapterId] || [];
}
export function addNoteMeta(chapterId, name) {
  const id = "note_" + makeId();
  const notes = read(GKEYS.notes, {});
  notes[chapterId] = [...(notes[chapterId] || []), { id, name: name || "page", addedAt: new Date().toISOString() }];
  write(GKEYS.notes, notes);
  return id;
}
export async function removeNote(chapterId, id) {
  try { await deleteFile(id); } catch { /* ignore */ }
  const notes = read(GKEYS.notes, {});
  notes[chapterId] = (notes[chapterId] || []).filter((n) => n.id !== id);
  write(GKEYS.notes, notes);
}
// caption / topic label on a notes image (so user can find the topic)
export function setNoteCaption(chapterId, id, caption) {
  const notes = read(GKEYS.notes, {});
  notes[chapterId] = (notes[chapterId] || []).map((n) => (n.id === id ? { ...n, caption: String(caption || "").trim() } : n));
  write(GKEYS.notes, notes);
}

// ---------- Chapter questions (MCQs extracted from PDFs/images) ----------
export function getChapterQuestions(chapterId) {
  return read(GKEYS.questions, {})[chapterId] || [];
}
function qKey(q) {
  return String(q.question || "").toLowerCase().replace(/\s+/g, " ").trim().slice(0, 200);
}
// Adds only NEW questions — skips ones whose text already exists in this chapter.
export function addChapterQuestions(chapterId, questions) {
  const clean = (questions || []).filter((q) => q && q.question && Array.isArray(q.options) && q.options.length >= 2);
  const all = read(GKEYS.questions, {});
  const existing = all[chapterId] || [];
  const seen = new Set(existing.map(qKey));
  const toAdd = [];
  for (const q of clean) {
    const k = qKey(q);
    if (k && !seen.has(k)) { seen.add(k); toAdd.push(q); }
  }
  all[chapterId] = [...existing, ...toAdd];
  write(GKEYS.questions, all);
  return toAdd.length; // number of NEW questions actually added
}
export function removeChapterQuestion(chapterId, idx) {
  const all = read(GKEYS.questions, {});
  all[chapterId] = (all[chapterId] || []).filter((_, i) => i !== idx);
  write(GKEYS.questions, all);
}
export function clearChapterQuestions(chapterId) {
  const all = read(GKEYS.questions, {});
  delete all[chapterId];
  write(GKEYS.questions, all);
}

// ---------- Saved PDFs (metadata; blob is in IndexedDB) ----------
export function getPdfs(chapterId) {
  return read(GKEYS.pdfs, {})[chapterId] || [];
}
export function addPdfMeta(chapterId, name) {
  const id = "pdf_" + makeId();
  const pdfs = read(GKEYS.pdfs, {});
  pdfs[chapterId] = [...(pdfs[chapterId] || []), { id, name, addedAt: new Date().toISOString() }];
  write(GKEYS.pdfs, pdfs);
  return id;
}
export async function removePdf(chapterId, id) {
  try { await deleteFile(id); } catch { /* ignore */ }
  const pdfs = read(GKEYS.pdfs, {});
  pdfs[chapterId] = (pdfs[chapterId] || []).filter((p) => p.id !== id);
  write(GKEYS.pdfs, pdfs);
}
