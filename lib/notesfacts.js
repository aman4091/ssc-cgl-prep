// 🐋 Notes page ke DeepSeek facts — bane hue jawab, aur unhe padhne ka tareeka.
//
// Notes ka har page ek baar DeepSeek ke paas jata hai (button dabane par hi —
// paise lagte hain), aur jo jawab aata hai wo yahan rakh liya jata hai. Dobara
// wahi page kholo to button turant popup khol deta hai, bina naye call ke.
// `cgl.notesfacts` baaki cgl. keys ki tarah sync hoti hai, isliye ek device par
// banaye hue facts doosre par bhi mil jate hain.
//
// Jawab ki shakl route (app/api/notes-facts) ne tay ki hai:
//
//   TOPIC: <topic>
//
//   FACTS:
//   ⭐ FACT: ...
//   FACT: ...
//
//   CONFUSION:
//   A vs B — farak
//
// `parseNotesFacts` usi shakl ko todta hai taaki popup ka "🧩 Fact log" button
// har line ko alag fact bana kar bhej sake.

import { storeGet, storeSet } from "./bigstore";

const KEY = "cgl.notesfacts";

function read() {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(storeGet(KEY) || "{}") || {}; }
  catch { return {}; }
}
function write(v) {
  try { storeSet(KEY, JSON.stringify(v)); } catch { /* quota */ }
  try { window.dispatchEvent(new CustomEvent("cgl:notesfacts-changed")); } catch { /* SSR */ }
}

/** Ek page ki pehchaan — book ka slug + book ka page number. */
export function pageKey(book, page) {
  return `${(book && (book.slug || book.key)) || "notes"}#${(page && page.book_page) || 0}`;
}

export function getNotesFacts(key) { return read()[key] || ""; }

export function saveNotesFacts(key, text) {
  const t = String(text || "").trim();
  if (!key || !t) return;
  const all = read();
  all[key] = t;
  write(all);
}

export function clearNotesFacts(key) {
  const all = read();
  if (!(key in all)) return;
  delete all[key];
  write(all);
}

const FACT_LINE = /^\s*(?:⭐\s*)?(?:[-*•]\s*)?FACT\s*:\s*(.+)$/i;

/** Jawab ka text -> { topic, facts: [{text, star}], confusion: [] }. */
export function parseNotesFacts(md) {
  const lines = String(md || "").split(/\r?\n/);
  let topic = "";
  const facts = [];
  const confusion = [];
  let inConfusion = false;
  for (const raw of lines) {
    const line = raw.replace(/\*\*/g, "").trim();
    if (!line) continue;
    const t = /^TOPIC\s*:\s*(.+)$/i.exec(line);
    if (t) { topic = t[1].trim(); continue; }
    if (/^FACTS\s*:?$/i.test(line)) { inConfusion = false; continue; }
    if (/^CONFUSION\s*:?$/i.test(line)) { inConfusion = true; continue; }
    const f = FACT_LINE.exec(line);
    if (f) {
      facts.push({ text: f[1].trim(), star: /⭐/.test(raw) });
      continue;
    }
    // CONFUSION ke neeche ki saadi line bhi kaam ki hai ("A vs B — farak").
    if (inConfusion) confusion.push(line.replace(/^[-*•]\s*/, "").trim());
  }
  return { topic: topic.slice(0, 60), facts, confusion };
}

/** Fact log mein jo lines jaani hain — fact + confusion, ek hi list mein. */
export function factLines(parsed) {
  const out = (parsed.facts || []).map((f) => (f.star ? `⭐ ${f.text}` : f.text));
  for (const c of parsed.confusion || []) out.push(`⚠ ${c}`);
  return out.filter(Boolean);
}
