// Wrong Questions book — its OWN store, deliberately separate from the Mistake
// Notebook (cgl.qreview).
//
// The notebook is automatic: it fills up with whatever the quiz runners catch.
// This one is hand-kept — questions you got wrong in class, in a book, in an
// offline mock — shelved by subject. Nothing writes here except this page, and
// nothing here leaks into the notebook's buckets or counts.
//
// Images go to Cloudflare R2 and the record keeps only the URL, so a question
// pasted on the desktop opens on the phone: cloud sync copies localStorage, and
// the URL is all the other device needs. If the upload fails (offline, R2 not
// configured) the blob falls back to the device's IndexedDB, which is where
// every image lived before R2 — hence both shapes below.

import { saveFile, deleteFile } from "./filestore";
import { compressImage } from "./pasteimg";
import { uploadToR2, deleteFromR2 } from "./r2client";

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

// One image is either { url } (on R2, visible everywhere) or { id } (a blob in
// this device's IndexedDB). `imgIds` is the pre-R2 shape and still readable.
export function imagesOf(rec) {
  if (Array.isArray(rec?.images) && rec.images.length) return rec.images;
  return (rec?.imgIds || []).map((id) => ({ id }));
}
export const imageKey = (img) => img.url || img.id;

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

// Compress, then try R2 and fall back to a local blob. Returns the image
// descriptors plus how many stayed local, so the form can say so out loud
// instead of quietly leaving them stuck on one device.
export async function storeImages(files) {
  const images = [];
  let localOnly = 0;
  for (const f of files || []) {
    const { blob } = await compressImage(f);
    try {
      const url = await uploadToR2(blob, "paste.jpg");
      images.push({ url });
    } catch {
      const id = newId("wbimg");
      await saveFile(id, blob);
      images.push({ id });
      localOnly += 1;
    }
  }
  return { images, localOnly };
}

async function dropImage(img) {
  if (img?.url) await deleteFromR2(img.url);
  else if (img?.id) await deleteFile(img.id).catch(() => {});
}

// Newest first, so a question you just added is at the top of its shelf.
export function addWrong({ subject, q = null, images = [], note = "" }) {
  const rec = {
    id: newId("wb"),
    subject,
    q,
    images,
    note: String(note || "").trim(),
    at: new Date().toISOString(),
  };
  write([rec, ...read()]);
  return rec;
}

// `images` replaces the list wholesale — anything dropped from it is deleted so
// removing an image actually reclaims the space (on R2 or on disk).
export async function updateWrong(id, { q, images, note }) {
  const all = read();
  const i = all.findIndex((r) => r.id === id);
  if (i < 0) return;
  const prev = all[i];
  const prevImgs = imagesOf(prev);
  const next = images === undefined ? prevImgs : images;
  const nextKeys = new Set(next.map(imageKey));
  const dropped = prevImgs.filter((im) => !nextKeys.has(imageKey(im)));
  all[i] = {
    ...prev,
    q: q === undefined ? prev.q : q,
    images: next,
    imgIds: undefined,          // migrated onto `images`
    note: note === undefined ? prev.note : String(note || "").trim(),
  };
  write(all);
  for (const im of dropped) await dropImage(im);
}

export async function removeWrong(id) {
  const rec = read().find((r) => r.id === id);
  write(read().filter((r) => r.id !== id));
  for (const im of imagesOf(rec)) await dropImage(im);
}

export async function clearWrong(subject) {
  const all = read();
  const going = subject ? all.filter((r) => r.subject === subject) : all;
  write(subject ? all.filter((r) => r.subject !== subject) : []);
  for (const r of going) for (const im of imagesOf(r)) await dropImage(im);
}
