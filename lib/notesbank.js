// Notes banks — typed/transcribed study notes that ship with the app.
//
// Unlike the question banks, a notes book is prose: pages of headings, lists,
// tables and notes, transcribed from a scanned book by a vision model. The text
// is committed (public/<book>/notes.json, ~440 KB); the per-page original SCANS
// are the source of truth and live on the same Cloudflare R2 CDN as the image
// question banks — 86 MB of JPEG does not belong in the git repo, and they are
// only ever shown lazy-loaded behind a collapsed "Original scan dekho"
// disclosure at the foot of each page.
//
// loadNotes(book) returns { meta, pages, scanBase } where scanBase resolves a
// page's scan to `${scanBase}/page-063.jpg`.

const R2 = "https://pub-c85669238e024a9d94f302cf7a7868e2.r2.dev";

// Per-book config. Each book's scans sit under its own R2 prefix.
const BOOKS = {
  polity: {
    file: "/polity_notes/notes.json",
    scanBase: `${R2}/polity`,
    eyebrow: "📔 Polity Notes",
    title: "Indian Polity",
    sub:
      "SIMPLICRACK GS Foundation — Ishendu Sir. 216 pages, 12 chapters, Making of " +
      "the Constitution se Judiciary tak. Text ek machine transcription hai — har " +
      "page ke neeche asli scan hai, wahi source of truth hai.",
    note:
      "SIMPLICRACK / Ishendu Sir ka copyrighted course material. Text vision-model " +
      "se padha gaya hai, verified nahi — kuch galat lage to page ka scan kholo.",
  },
  "static-gk": {
    file: "/static_notes/notes.json",
    scanBase: `${R2}/staticgk`,
    eyebrow: "📗 Static GK",
    title: "Static GK",
    sub:
      "Rojgar Publication — 272 pages, 84 chapters: culture, states, geography, " +
      "history, economy, awards, science, schemes. Har subsection ke top pe ⚡ Quick " +
      "Revise box aur 📌 memory hooks — taaki har fact yaad ho jaye. Text publisher " +
      "ke PDF se seedha nikala hai; har page ke neeche asli scan hai.",
    note:
      "Rojgar Publication ka copyrighted material. Words PDF text-layer se verbatim " +
      "hain (vision-read nahi) — risk sirf structuring ka hai, jo scan se check ho jaata hai.",
  },
};

const cache = {};

export function notesBookMeta(book) {
  return BOOKS[book] || null;
}

export async function loadNotes(book) {
  if (cache[book]) return cache[book];
  const cfg = BOOKS[book];
  if (!cfg) return null;
  try {
    const r = await fetch(cfg.file);
    if (!r.ok) return null;
    const d = await r.json();
    const out = {
      meta: d?.meta || { topics: [], total_pages: 0 },
      pages: Array.isArray(d?.pages) ? d.pages : [],
      scanBase: cfg.scanBase,
      eyebrow: cfg.eyebrow,
      title: cfg.title,
      sub: cfg.sub,
      note: cfg.note,
    };
    cache[book] = out;
    return out;
  } catch {
    return null;
  }
}

// The scan filename for a page: page-063.jpg (zero-padded to 3).
export function scanUrl(scanBase, bookPage) {
  return `${scanBase}/page-${String(bookPage).padStart(3, "0")}.jpg`;
}
