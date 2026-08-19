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
    subject: "gs",
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
  english: {
    file: "/english_notes/notes.json",
    scanBase: `${R2}/english`,
    subject: "english",
    eyebrow: "📘 English Notes",
    title: "English Grammar",
    sub:
      "English by Aman Vashishth Sir — class notes. 292 pages, 21 chapters, Parts " +
      "of Speech se Narration tak, error-spotting ke ✗→✓ jodon me. Text handwriting " +
      "se padha gaya hai — har page ke neeche asli scan hai, wahi source of truth hai.",
    note:
      "Aman Vashishth Sir ka copyrighted class material. Ye poori kitaab HAATH KI " +
      "LIKHAI hai — text vision-model ne padha hai, verified nahi. Polity/Static GK " +
      "se zyada risk hai yahan: ek galat-padha shabd bilkul sahi dikhta hai. Jo bhi " +
      "ajeeb lage, page ka scan kholo.",
  },
  // Parmar SSC GK/GS Theory Book — one book, four subjects. All share the same
  // R2 prefix (page numbers are unique across the whole book) and the same note.
  // 50 Golden Rules — RBE ka English grammar rule-book. Yahan scan nahi hai
  // (source PDF ke sirf teen page mile the), isliye scanBase nahi diya: reader
  // "Original scan dekho" wala hissa tabhi dikhata hai jab scanBase ho.
  goldenrules: {
    file: "/goldenrules_notes/notes.json",
    subject: "english",
    eyebrow: "🏅 Golden Rules",
    title: "Golden Rules of English",
    sub:
      "RBE ka 50 Golden Rules — 272 rule, 6 chapter (Nouns se Prepositions tak), " +
      "har rule ke saath uske apne example. Chapter ka naam menu mein hai; page " +
      "wahi hai jo chhapi kitaab ka hai.",
    note:
      "RBE Learning ka material, apni study ke liye transcribe kiya. Rule ka text " +
      "machine-transcription hai — jo ajeeb lage, asli PDF se mila lena.",
  },
  "parmar-geography": {
    file: "/parmar_geography_notes/notes.json",
    scanBase: `${R2}/parmar`,
    subject: "gs",
    eyebrow: "🌍 Geography · Parmar",
    title: "Geography — Parmar GK",
    sub: "Parmar SSC GK/GS Theory Book ka Geography section — 23 chapters. Mind-map figures book se; har page ke neeche asli scan hai.",
    note: "Parmar SSC ka copyrighted theory book, apni study ke liye transcribe kiya. Text machine-transcription hai — jo ajeeb lage, page ka scan kholo.",
  },
  "parmar-history": {
    file: "/parmar_history_notes/notes.json",
    scanBase: `${R2}/parmar`,
    subject: "gs",
    eyebrow: "📜 History · Parmar",
    title: "History — Parmar GK",
    sub: "Parmar SSC GK/GS Theory Book ka History section — 25 chapters, Stone Age se Governor-General tak. Har page ke neeche asli scan hai.",
    note: "Parmar SSC ka copyrighted theory book, apni study ke liye transcribe kiya. Text machine-transcription hai — jo ajeeb lage, page ka scan kholo.",
  },
  "parmar-polity": {
    file: "/parmar_polity_notes/notes.json",
    scanBase: `${R2}/parmar`,
    subject: "gs",
    eyebrow: "🏛️ Polity · Parmar",
    title: "Polity — Parmar GK",
    sub: "Parmar SSC GK/GS Theory Book ka Polity section — 19 chapters, Making of the Constitution se Noteworthy Points tak. Har page ke neeche asli scan hai.",
    note: "Parmar SSC ka copyrighted theory book, apni study ke liye transcribe kiya. Text machine-transcription hai — jo ajeeb lage, page ka scan kholo.",
  },
  "parmar-economy": {
    file: "/parmar_economy_notes/notes.json",
    scanBase: `${R2}/parmar`,
    subject: "gs",
    eyebrow: "💰 Economy · Parmar",
    title: "Economy — Parmar GK",
    sub: "Parmar SSC GK/GS Theory Book ka Economy section — 11 chapters, Basics of Economy se International Institutions tak. Har page ke neeche asli scan hai.",
    note: "Parmar SSC ka copyrighted theory book, apni study ke liye transcribe kiya. Text machine-transcription hai — jo ajeeb lage, page ka scan kholo.",
  },
  "parmar-physics": {
    file: "/parmar_physics_notes/notes.json",
    scanBase: `${R2}/parmar`,
    subject: "gs",
    eyebrow: "⚛️ Physics · Parmar",
    title: "Physics — Parmar GK",
    sub: "Parmar SSC GK/GS Theory Book ka Physics section — 8 chapters, Motion se Magnetic Effect of Electric Current tak. Formule + ray/circuit diagrams inline; har page ke neeche asli scan hai.",
    note: "Parmar SSC ka copyrighted theory book, apni study ke liye transcribe kiya. Text machine-transcription hai — jo ajeeb lage, page ka scan kholo.",
  },
  "parmar-biology": {
    file: "/parmar_biology_notes/notes.json",
    scanBase: `${R2}/parmar`,
    subject: "gs",
    eyebrow: "🧬 Biology · Parmar",
    title: "Biology — Parmar GK",
    sub: "Parmar SSC GK/GS Theory Book ka Biology section — 11 chapters, Cell se Hereditary and Evolution tak. Diagrams inline; har page ke neeche asli scan hai.",
    note: "Parmar SSC ka copyrighted theory book, apni study ke liye transcribe kiya. Text machine-transcription hai — jo ajeeb lage, page ka scan kholo.",
  },
  "parmar-chemistry": {
    file: "/parmar_chemistry_notes/notes.json",
    scanBase: `${R2}/parmar`,
    subject: "gs",
    eyebrow: "🧪 Chemistry · Parmar",
    title: "Chemistry — Parmar GK",
    sub: "Parmar SSC GK/GS Theory Book ka Chemistry section — 7 chapters, Matter se Carbon and its Compounds tak. Reactions + structure diagrams inline; har page ke neeche asli scan hai.",
    note: "Parmar SSC ka copyrighted theory book, apni study ke liye transcribe kiya. Text machine-transcription hai — jo ajeeb lage, page ka scan kholo.",
  },
  "parmar-static": {
    file: "/parmar_static_notes/notes.json",
    scanBase: `${R2}/parmar`,
    subject: "gs",
    eyebrow: "🎭 Static GK · Parmar",
    title: "Static GK — Parmar GK",
    sub: "Parmar SSC GK/GS Theory Book ka Static GK section — 11 chapters, Music & Paintings se Awards & Honours tak; state-wise dances/festivals/sports lists. Har page ke neeche asli scan hai.",
    note: "Parmar SSC ka copyrighted theory book, apni study ke liye transcribe kiya. Text machine-transcription hai — jo ajeeb lage, page ka scan kholo.",
  },
  "parmar-environment": {
    file: "/parmar_environment_notes/notes.json",
    scanBase: `${R2}/parmar`,
    subject: "gs",
    eyebrow: "🌱 Environment · Parmar",
    title: "Environment — Parmar GK",
    sub: "Parmar SSC GK/GS Theory Book ka Environment section — 6 chapters, Basics of Environmental Sciences se National Parks tak. Ecosystem/energy diagrams inline; har page ke neeche asli scan hai.",
    note: "Parmar SSC ka copyrighted theory book, apni study ke liye transcribe kiya. Text machine-transcription hai — jo ajeeb lage, page ka scan kholo.",
  },
  "eng-formula": {
    file: "/engformula_notes/notes.json",
    scanBase: `${R2}/eng-formula`,
    subject: "english",
    eyebrow: "📘 English Formulas",
    title: "The Formula Book of English",
    sub:
      "Gopal Verma (Rakesh Yadav) — 22 chapters, 76 pages. Master Formulas, rules & " +
      "examples (Hindi/English). Har page ke neeche asli scan hai, wahi source of truth hai.",
    note:
      "Gopal Verma / Rakesh Yadav Readers Publication ka copyrighted formula book, apni " +
      "study ke liye transcribe kiya. Text machine-transcription hai — jo ajeeb lage, page ka scan kholo.",
  },
  history: {
    file: "/history_notes/notes.json",
    scanBase: `${R2}/history`,
    subject: "gs",
    eyebrow: "📜 History Notes",
    title: "History — Handwritten Notes",
    sub:
      "Complete History handwritten notes — 25 chapters, Indus Valley se Modern " +
      "India tak. Text handwriting se padha gaya hai; har page ke neeche asli scan " +
      "hai, wahi source of truth hai.",
    note:
      "Handwritten SSC history notes. Text vision-model se padha gaya hai, verified " +
      "nahi — jo bhi ajeeb lage, page ka scan kholo. Practice/MCQ pages hataye gaye hain.",
  },
  "english-grammar": {
    file: "/english_grammar_notes/notes.json",
    scanBase: `${R2}/english-grammar`,
    subject: "english",

    eyebrow: "✍️ English Grammar",
    title: "English Grammar — Handwritten",
    sub:
      "Handwritten English grammar notes (Sscstudy.com) — 11 chapters, 229 pages. " +
      "Har page original scan hai (rules, diagrams & examples intact); text transcription nahi.",
    note:
      "Sscstudy.com / Shivam Pawar ka handwritten material. Ye IMAGE-anchored hai — " +
      "har page ek scan hai. Sirf apni study ke liye.",
  },
  brahmastra: {
    file: "/brahmastra_notes/notes.json",
    scanBase: `${R2}/brahmastra`,
    // Subject likha hi nahi tha, to ye maths ki book "gs" gin rahi thi — Gemini
    // ko GS ka prompt jaata tha aur quiz hub mein bhi GS ke neeche baithti.
    subject: "math",
    eyebrow: "📐 Maths Formula Book",
    title: "Brahmastra — Maths Formulas",
    sub:
      "Complete Maths Formula Book by Aditya Ranjan Sir — 34 chapters, 257 pages. " +
      "Har page original scan hai (formule + diagrams intact); text transcription nahi.",
    note:
      "Aditya Ranjan Publications ka copyrighted formula book. Ye IMAGE-anchored hai — " +
      "har page ek scan hai. Sirf apni study ke liye.",
  },
  "static-gk": {
    file: "/static_notes/notes.json",
    scanBase: `${R2}/staticgk`,
    subject: "gs",
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

// Lightweight list of all notes books (slug + labels), for menus/pickers.
export function listNotesBooks() {
  return Object.entries(BOOKS).map(([slug, c]) => ({
    slug,
    eyebrow: c.eyebrow,
    title: c.title,
    subject: c.subject || "gs",
  }));
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
      slug: book,
      meta: d?.meta || { topics: [], total_pages: 0 },
      pages: Array.isArray(d?.pages) ? d.pages : [],
      scanBase: cfg.scanBase,
      subject: cfg.subject || "gs",
      gemini: !!cfg.gemini,
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
