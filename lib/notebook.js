// My Notebook — a free-form scratch book the user fills with anything: a rule
// they want to remember, an image / screenshot, or both together. Newest on top.
//
// Everything lives in ONE localStorage key (cgl.notebook) — the text AND the
// images (stored inline as compressed data URLs). That is deliberate: the whole
// notebook then rides the existing Supabase sync (which only carries cgl.* keys)
// so it shows up on every device. Images are downscaled + re-encoded before they
// land here (see compressImage) so a screenshot is tens-to-low-hundreds of KB,
// not multi-MB — otherwise localStorage/sync would blow its quota.

import { makeId } from "./storage";

const KEY = "cgl.notebook";

export function getEntries() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function saveEntries(list) {
  localStorage.setItem(KEY, JSON.stringify(list));
  return list;
}

// Add one entry: a subject + topic label, text, an inline image (data URL), or
// any mix. Throws on a localStorage quota error so the UI can flag a too-big image.
export function addEntry({ title = "", subject = "", topic = "", text = "", img = "" } = {}) {
  const entry = {
    id: makeId(),
    title: String(title || "").trim(),
    subject: String(subject || "").trim(),
    topic: String(topic || "").trim(),
    text: String(text || "").trim(),
    img: img || "",
    createdAt: new Date().toISOString(),
  };
  saveEntries([entry, ...getEntries()]);
  return entry;
}

// Edit an entry's labels / text (its image stays as-is). Only the passed fields
// are changed.
export function updateEntry(id, fields = {}) {
  const clean = {};
  for (const k of ["title", "subject", "topic", "text"]) {
    if (k in fields) clean[k] = String(fields[k] || "").trim();
  }
  const list = getEntries().map((e) => (e.id === id ? { ...e, ...clean } : e));
  return saveEntries(list);
}

export function deleteEntry(id) {
  return saveEntries(getEntries().filter((e) => e.id !== id));
}

// One-time filing: the notebook used to be a flat pile with free-typed subject /
// topic labels, where the old Subject field was shown as each note's heading —
// i.e. it WAS the title. When the subject→chapter shelf shipped, every note that
// already existed was, per the owner, English grammar noun notes — so file them
// all under English › Noun once, then never touch them again (the flag stops it
// re-stamping notes the user later moves elsewhere). Crucially, the old free-text
// Subject (and Topic) is carried into the new Title field so those headings aren't
// lost. Runs on the notebook mount.
const FILED_KEY = "cgl.notebook.filed_v1";
// A local (non-syncing) snapshot of the notes exactly as they were the moment
// before filing runs, so nothing is ever truly unrecoverable if the mapping is
// wrong. Deliberately NOT a cgl.* key: it stays on this device and never rides
// sync, so it can't overwrite good data elsewhere.
const BACKUP_KEY = "notebook.backup.pre_filing";
export function fileLegacyEntries() {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(FILED_KEY)) return;
    const list = getEntries();
    if (list.length) {
      if (!localStorage.getItem(BACKUP_KEY)) {
        try { localStorage.setItem(BACKUP_KEY, JSON.stringify(list)); } catch { /* backup is best-effort */ }
      }
      saveEntries(list.map((e) => {
        // Keep whatever the note was headed by: an explicit title, else the old
        // free-text subject, else the old topic.
        const keptTitle = String(e.title || e.subject || e.topic || "").trim();
        return { ...e, title: keptTitle, subject: "English", topic: "Noun" };
      }));
    }
    localStorage.setItem(FILED_KEY, "1");
  } catch {
    /* quota / private mode — leave the notes as-is */
  }
}

// Downscale + re-encode a picked/pasted image File/Blob to a compact data URL so
// it fits in localStorage and syncs. Long edge capped at maxEdge; WebP quality
// ~0.82. Falls back to the original data URL if canvas isn't available.
export function compressImage(file, maxEdge = 1400, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Image padh nahi paaye."));
    reader.onload = () => {
      const src = reader.result;
      const img = new Image();
      img.onerror = () => resolve(src); // not a decodable image — keep as-is
      img.onload = () => {
        try {
          const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement("canvas");
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);
          // WebP where supported (smaller); fall back to JPEG.
          let out = canvas.toDataURL("image/webp", quality);
          if (!out.startsWith("data:image/webp")) out = canvas.toDataURL("image/jpeg", quality);
          resolve(out);
        } catch {
          resolve(src);
        }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}
