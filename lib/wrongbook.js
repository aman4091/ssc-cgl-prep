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
import { dropLocalInk } from "./ink";
import { shedOldQuizzes } from "./storage";

const KEY = "cgl.wrongbook";

export const SUBJECTS = [
  { key: "reasoning", label: "Reasoning", icon: "🧠" },
  { key: "gs", label: "GS", icon: "🌍" },
  { key: "math", label: "Maths", icon: "🧮" },
  { key: "english", label: "English", icon: "📘" },
];

export const subjectLabel = (k) =>
  (SUBJECTS.find((s) => s.key === k) || {}).label || k;

export const isSubject = (k) => SUBJECTS.some((s) => s.key === k);

// Local calendar day of a record — the key the date dropdown groups by, and the
// label it shows. en-CA gives a sortable "2026-07-21"; en-GB gives "21 Jul 2026".
export function dayKey(iso) {
  try { return new Date(iso).toLocaleDateString("en-CA"); } catch { return ""; }
}
export function dayLabel(iso) {
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return ""; }
}

function read() {
  if (typeof window === "undefined") return [];
  try { const r = localStorage.getItem(KEY); return r ? JSON.parse(r) : []; }
  catch { return []; }
}
// localStorage bhara hua ho to setItem throw karta hai. Pehle ye seedha upar
// chala jata tha — aur sabse bura roop ye banta: handwriting R2 par chadh jati,
// par setInk() ka pointer save na hota, yaani strokes pade rehte aur unhe koi
// point hi nahi karta.
//
// Isliye wahi raasta jo OverlayInbox aur VocabFeeder lete hain: sabse purane
// generate kiye hue quizzes gira do (wo dobara ban sakte hain) aur phir se
// koshish karo. Notes, vocab, progress, wrong-book — kisi ko haath nahi lagta.
function write(v) {
  const json = JSON.stringify(v);
  for (;;) {
    try { localStorage.setItem(KEY, json); return; }
    catch (e) { if (!shedOldQuizzes()) throw e; }
  }
}

const newId = (p) => `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

// One image is either { url } (on R2, visible everywhere) or { id } (a blob in
// this device's IndexedDB). `imgIds` is the pre-R2 shape and still readable.
export function imagesOf(rec) {
  if (Array.isArray(rec?.images) && rec.images.length) return rec.images;
  return (rec?.imgIds || []).map((id) => ({ id }));
}
export const imageKey = (img) => img.url || img.id;

// Overlay ke answers page ka ❌ Wrong book link record ko qid se dhundta hai —
// subject koi bhi ho, mila to wahi shelf khulti hai.
export function findByQid(qid) {
  if (!qid) return null;
  return read().find((r) => r.qid === qid) || null;
}

// Self-heal: ek hi qid ke duplicate records hata do. Do khuli tabs ka
// OverlayInbox ek hi naya question ek saath utha leta tha (image upload ke
// seconds mein done-list abhi likhi nahi hoti) — jo ban gaye unhe yahan
// saaf karte hain. Jis copy mein zyada data hai (detail/answer/note) wo
// rehti hai; barabar par sabse purani. removeWrong images bhi cleanup karta
// hai, aur har copy ki apni alag image thi — kept record ki image safe hai.
export async function dedupeByQid() {
  const groups = new Map();
  for (const r of read()) {
    if (!r.qid) continue;
    if (!groups.has(r.qid)) groups.set(r.qid, []);
    groups.get(r.qid).push(r);
  }
  let removed = 0;
  for (const recs of groups.values()) {
    if (recs.length < 2) continue;
    const score = (r) =>
      (r.detail ? 4 : 0) + (r.answer ? 2 : 0) + (r.note ? 1 : 0) + (r.q ? 1 : 0);
    const keep = [...recs].sort(
      (a, b) => score(b) - score(a) || (a.at < b.at ? -1 : 1)
    )[0];
    for (const r of recs) {
      if (r.id !== keep.id) {
        await removeWrong(r.id);
        removed += 1;
      }
    }
  }
  return removed;
}

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

// Question ke saath uski handwriting bhi jaati hai — R2 par dono generations
// aur device ka IndexedDB copy. Images ke dropImage() ka hi ink waala jodidar.
async function dropInk(rec) {
  if (rec?.inkUrl) await deleteFromR2(rec.inkUrl);
  if (rec?.inkPrev) await deleteFromR2(rec.inkPrev);
  if (rec?.id) await dropLocalInk(rec.id);
}

// Newest first, so a question you just added is at the top of its shelf.
// `answer` is a short, ALWAYS-visible correct answer (e.g. "B" or "42") — kept
// apart from q.solution (the longer explanation that hides behind "Show answer").
export function addWrong({ subject, q = null, images = [], note = "", answer = "", qid = "" }) {
  const rec = {
    id: newId("wb"),
    subject,
    q,
    images,
    note: String(note || "").trim(),
    answer: String(answer || "").trim(),
    // Overlay ka question number (q093...) — overlay ke answers pages se
    // match karne ke liye card par dikhta hai. Manual paste par khali.
    qid: String(qid || "").trim(),
    at: new Date().toISOString(),
  };
  write([rec, ...read()]);
  return rec;
}

// `images` replaces the list wholesale — anything dropped from it is deleted so
// removing an image actually reclaims the space (on R2 or on disk).
export async function updateWrong(id, { q, images, note, answer }) {
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
    answer: answer === undefined ? prev.answer : String(answer || "").trim(),
  };
  write(all);
  for (const im of dropped) await dropImage(im);
}

// Cache what OCR read out of a record's images. It is plain text, so it syncs
// with the record and the next device never re-runs the (paid) vision call.
export function setOcrText(id, text) {
  const all = read();
  const i = all.findIndex((r) => r.id === id);
  if (i < 0) return;
  all[i] = { ...all[i], ocrText: String(text || "").trim() };
  write(all);
}

// The answer/explanation you paste back from Gemini for this question. Stored as
// markdown text on the record, so it shows under "Show answer" and syncs.
export function setDetail(id, text) {
  const all = read();
  const i = all.findIndex((r) => r.id === id);
  if (i < 0) return;
  all[i] = { ...all[i], detail: String(text || "").trim() };
  write(all);
}

// DUSRA answer. Overlay ke answers page par bhi yahi tha (qNNN.2.txt): naya
// answer paste karne par wo dikhne lagta hai aur pehla mitta nahi — ek fold ke
// peeche bach jata hai, taaki dono padhe ja sakein.
export function setDetail2(id, text) {
  const all = read();
  const i = all.findIndex((r) => r.id === id);
  if (i < 0) return;
  all[i] = { ...all[i], detail2: String(text || "").trim() };
  write(all);
}

// Jo answer abhi dikh raha hai (dusra ho to dusra, warna pehla) — ✏️ Edit isi
// ko bharta aur isi ko wapas likhta hai.
export const shownDetail = (r) => (r?.detail2 || r?.detail || "");
export function setShownDetail(id, text) {
  const rec = read().find((r) => r.id === id);
  if (!rec) return;
  if (rec.detail2) setDetail2(id, text);
  else setDetail(id, text);
}

// Handwriting (✍️) ka pointer — stylus se likha hua solution. Strokes khud R2
// par gzip'd JSON hain (lib/ink.js); record par sirf URL + rev aata hai, bilkul
// images ki tarah, taaki sync row halka rahe.
//
// inkStrokes/inkH bhi yahin rehte hain taaki dusre device ka card ✍️ badge
// dikha sake bina poora ink download kiye. inkPrev ek generation peeche ka URL
// hai — do device ke beech kuch ulta-pulta ho to wapas laane ke liye.
export function setInk(id, { inkUrl, inkAt, inkRev, inkStrokes, inkH, inkPrev }) {
  const all = read();
  const i = all.findIndex((r) => r.id === id);
  if (i < 0) return;
  all[i] = {
    ...all[i],
    inkUrl: inkUrl || "",
    inkAt: inkAt || new Date().toISOString(),
    inkRev: inkRev || 0,
    inkStrokes: inkStrokes || 0,
    inkH: inkH || 0,
    inkPrev: inkPrev === undefined ? all[i].inkPrev || "" : inkPrev,
  };
  write(all);
}

export const hasInk = (r) => !!(r?.inkUrl || r?.inkStrokes);
export const inkCount = (r) => r?.inkStrokes || 0;

export function getWrongById(id) {
  return read().find((r) => r.id === id) || null;
}

export async function removeWrong(id) {
  const rec = read().find((r) => r.id === id);
  write(read().filter((r) => r.id !== id));
  for (const im of imagesOf(rec)) await dropImage(im);
  await dropInk(rec);
}

export async function clearWrong(subject) {
  const all = read();
  const going = subject ? all.filter((r) => r.subject === subject) : all;
  write(subject ? all.filter((r) => r.subject !== subject) : []);
  for (const r of going) {
    for (const im of imagesOf(r)) await dropImage(im);
    await dropInk(r);
  }
}
