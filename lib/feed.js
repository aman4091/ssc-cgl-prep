// Dated "feed" store for Current Affairs & Static GK.
// Each entry = one date/topic with an optional video + a set of questions (quiz) + saved PDFs.
import { makeId } from "./storage";
import { deleteFile } from "./filestore";

export const FEED_KEY = "cgl.feed.entries";

function read() {
  if (typeof window === "undefined") return [];
  try { const r = localStorage.getItem(FEED_KEY); return r ? JSON.parse(r) : []; }
  catch { return []; }
}
function write(v) { localStorage.setItem(FEED_KEY, JSON.stringify(v)); }

// newest first (by date label, then createdAt)
export function getEntries(feed, bucket) {
  return read()
    .filter((e) => e.feed === feed && e.bucket === bucket)
    .sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.createdAt || "").localeCompare(a.createdAt || ""));
}
export function getEntry(id) { return read().find((e) => e.id === id) || null; }
export function getAllEntries() { return read(); }

// All current-affairs questions across every date entry (for the CA Rush pop-up).
export function getCurrentAffairsQuestions() {
  return getAllEntries()
    .filter((e) => e.feed === "current")
    .flatMap((e) => e.questions || [])
    .filter((q) => q && q.question && Array.isArray(q.options) && q.options.length >= 2 && q.answer != null);
}
// One random current-affairs MCQ, or null if none exist yet.
export function randomCurrentAffairsQuestion() {
  const qs = getCurrentAffairsQuestions();
  if (qs.length === 0) return null;
  return qs[Math.floor(Math.random() * qs.length)];
}

export function addEntry(feed, bucket, { date, title, videoUrl } = {}) {
  const all = read();
  const entry = {
    id: "fe_" + makeId(), feed, bucket,
    date: date || "", title: title || "", videoUrl: videoUrl || "",
    questions: [], notes: [], pdfs: [], createdAt: new Date().toISOString(),
  };
  all.unshift(entry);
  write(all);
  return entry;
}
export function updateEntry(id, patch) {
  const all = read().map((e) => (e.id === id ? { ...e, ...patch } : e));
  write(all);
  return all.find((e) => e.id === id) || null;
}
export async function deleteEntry(id) {
  const e = getEntry(id);
  for (const p of e?.pdfs || []) { try { await deleteFile(p.id); } catch { /* ignore */ } }
  write(read().filter((x) => x.id !== id));
}

export function addEntryQuestions(id, questions) {
  const clean = (questions || []).filter((q) => q && q.question && Array.isArray(q.options) && q.options.length >= 2);
  const all = read().map((e) => (e.id === id ? { ...e, questions: [...(e.questions || []), ...clean] } : e));
  write(all);
  return clean.length;
}
export function clearEntryQuestions(id) {
  write(read().map((e) => (e.id === id ? { ...e, questions: [] } : e)));
}

// Current-Affairs notes: merge grouped facts into the entry, deduping identical
// points within a heading. Returns how many NEW points were added.
export function addEntryNotes(id, groups) {
  const clean = (groups || [])
    .filter((g) => g && g.heading && Array.isArray(g.points))
    .map((g) => ({ heading: String(g.heading).trim(), points: g.points.map((p) => String(p).trim()).filter(Boolean) }))
    .filter((g) => g.heading && g.points.length);
  let added = 0;
  const all = read().map((e) => {
    if (e.id !== id) return e;
    const byHeading = new Map();
    for (const g of e.notes || []) byHeading.set(g.heading.toLowerCase(), { heading: g.heading, points: [...g.points] });
    for (const g of clean) {
      const key = g.heading.toLowerCase();
      const cur = byHeading.get(key) || { heading: g.heading, points: [] };
      const seen = new Set(cur.points.map((p) => p.toLowerCase()));
      for (const p of g.points) {
        if (!seen.has(p.toLowerCase())) { cur.points.push(p); seen.add(p.toLowerCase()); added++; }
      }
      byHeading.set(key, cur);
    }
    return { ...e, notes: [...byHeading.values()] };
  });
  write(all);
  return added;
}
export function clearEntryNotes(id) {
  write(read().map((e) => (e.id === id ? { ...e, notes: [] } : e)));
}

export function addEntryPdfMeta(id, name) {
  const pid = "pdf_" + makeId();
  const all = read().map((e) => (e.id === id ? { ...e, pdfs: [...(e.pdfs || []), { id: pid, name, addedAt: new Date().toISOString() }] } : e));
  write(all);
  return pid;
}
export async function removeEntryPdf(id, pid) {
  try { await deleteFile(pid); } catch { /* ignore */ }
  write(read().map((e) => (e.id === id ? { ...e, pdfs: (e.pdfs || []).filter((p) => p.id !== pid) } : e)));
}
