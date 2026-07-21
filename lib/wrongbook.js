// Wrong Questions book — its OWN store, deliberately separate from the Mistake
// Notebook (cgl.qreview).
//
// The notebook is automatic: it fills up with whatever the quiz runners catch.
// This one is hand-kept — questions you got wrong in class, in a book, in an
// offline mock — shelved by subject. Nothing writes here except this page, and
// nothing here leaks into the notebook's buckets or counts.
//
// A record is a pasted screenshot, a typed MCQ, or both. localStorage holds
// only the light half; the images themselves live as blobs in the shared
// IndexedDB file store, which is also what the backup export walks.

import { saveFile, deleteFile } from "./filestore";
import { compressImage } from "./pasteimg";

const KEY = "cgl.wrongbook";

export const SUBJECTS = [
  { key: "reasoning", label: "Reasoning", icon: "🧠" },
  { key: "gs", label: "GS", icon: "🌍" },
  { key: "math", label: "Maths", icon: "🧮" },
  { key: "english", label: "English", icon: "📘" },
];

export const subjectLabel = (k) =>
  (SUBJECTS.find((s) => s.key === k) || {}).label || k;

function read() {
  if (typeof window === "undefined") return [];
  try { const r = localStorage.getItem(KEY); return r ? JSON.parse(r) : []; }
  catch { return []; }
}
function write(v) { localStorage.setItem(KEY, JSON.stringify(v)); }

const newId = (p) => `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export function getWrongBook(subject) {
  const all = read();
  return subject ? all.filter((r) => r.subject === subject) : all;
}

export function countsBySubject() {
  const counts = Object.fromEntries(SUBJECTS.map((s) => [s.key, 0]));
  for (const r of read()) if (counts[r.subject] != null) counts[r.subject] += 1;
  return counts;
}

// Only a record with real options can be fed to the quiz player.
export const isPracticeable = (r) =>
  !!r?.q?.question && Array.isArray(r?.q?.options) && r.q.options.filter(Boolean).length >= 2;

// Compress and store pasted images; returns the ids to keep on the record.
export async function storeImages(files) {
  const ids = [];
  for (const f of files || []) {
    const { blob } = await compressImage(f);
    const id = newId("wbimg");
    await saveFile(id, blob);
    ids.push(id);
  }
  return ids;
}

// Newest first, so a question you just added is at the top of its shelf.
export function addWrong({ subject, q = null, imgIds = [], note = "" }) {
  const rec = {
    id: newId("wb"),
    subject,
    q,
    imgIds,
    note: String(note || "").trim(),
    at: new Date().toISOString(),
  };
  write([rec, ...read()]);
  return rec;
}

// `imgIds` replaces the list wholesale — blobs dropped from it are deleted so
// removing an image actually reclaims the space.
export async function updateWrong(id, { q, imgIds, note }) {
  const all = read();
  const i = all.findIndex((r) => r.id === id);
  if (i < 0) return;
  const prev = all[i];
  const nextImgs = imgIds === undefined ? prev.imgIds || [] : imgIds;
  const dropped = (prev.imgIds || []).filter((x) => !nextImgs.includes(x));
  all[i] = {
    ...prev,
    q: q === undefined ? prev.q : q,
    imgIds: nextImgs,
    note: note === undefined ? prev.note : String(note || "").trim(),
  };
  write(all);
  for (const d of dropped) await deleteFile(d).catch(() => {});
}

export async function removeWrong(id) {
  const rec = read().find((r) => r.id === id);
  write(read().filter((r) => r.id !== id));
  for (const d of rec?.imgIds || []) await deleteFile(d).catch(() => {});
}

export async function clearWrong(subject) {
  const all = read();
  const going = subject ? all.filter((r) => r.subject === subject) : all;
  write(subject ? all.filter((r) => r.subject !== subject) : []);
  for (const r of going) for (const d of r.imgIds || []) await deleteFile(d).catch(() => {});
}
