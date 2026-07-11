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

export function addEntry(feed, bucket, { date, title, videoUrl } = {}) {
  const all = read();
  const entry = {
    id: "fe_" + makeId(), feed, bucket,
    date: date || "", title: title || "", videoUrl: videoUrl || "",
    questions: [], pdfs: [], createdAt: new Date().toISOString(),
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
