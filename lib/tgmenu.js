// Telegram inline-menu builders + the chapter-source registry.
//
// The bot's `/start` opens a button menu (Mixed · English · GS · Notes). From
// there you drill into a specific chapter (English/GS) or notes topic. Every
// list is fetched LIVE (cache:"no-store") — so a question added to a bank file,
// a new Current-Affairs day, or a question you filed via the app ("📁 Save to a
// chapter", read from your synced blob) shows up automatically, no code change.
//
// callback_data is capped at 64 bytes, so buttons carry compact tokens with
// INDICES into these (stable-order) lists rather than long slugs. Menus are
// edited in place; quizzes are sent in the background by the webhook.

import { normalizeBankQ, pollable, recordFromStd, clamp, blocksToTelegram } from "./tgquiz";
import { readCustomChapters } from "./tgserver";
import { notesBookMeta, listNotesBooks } from "./notesbank";

const CHAP_PAGE = 16; // chapters per keyboard page

async function jget(origin, path) {
  const r = await fetch(origin + path, { cache: "no-store" });
  if (!r.ok) return null;
  return r.json().catch(() => null);
}

const basename = (p) => String(p || "").split("/").pop();

// ---- Chapter-source registry -------------------------------------------------
// Each source: list(origin) -> [{ label, count, subject, load: ()=>rawQuestions }].
// `tab` groups it under English or GS ("both" = split by each entry's subject).

function bankSource({ key, tab, subject, indexPath, listKey, filter, entryPath }) {
  return {
    key, tab, subject,
    async list(origin) {
      const idx = await jget(origin, indexPath);
      let arr = (idx && idx[listKey]) || [];
      if (filter) arr = arr.filter(filter);
      return arr.map((e) => ({
        label: `${e.icon ? e.icon + " " : ""}${e.label || e.name || e.slug || ""}`.trim(),
        count: e.count || 0,
        subject,
        load: async () => {
          const d = await jget(origin, entryPath(e));
          return Array.isArray(d) ? d : (d && d.questions) || [];
        },
      }));
    },
  };
}

// Current Affairs: recent DAYS first (so a new daily auto-shows), then MONTHS.
const caSource = {
  key: "ca", tab: "gs", subject: "gs",
  async list(origin) {
    const idx = await jget(origin, "/cabank/index.json");
    const days = (idx && idx.days) || [];
    const months = (idx && idx.months) || [];
    return [...days, ...months].map((e) => ({
      label: `🗞️ ${e.label || e.period}`,
      count: e.count || 0,
      subject: "gs",
      load: async () => {
        const d = await jget(origin, `/cabank/${encodeURIComponent(e.period)}.json`);
        return Array.isArray(d) ? d : (d && d.questions) || [];
      },
    }));
  },
};

// Your app-added questions (synced blob). tab "both": each chapter carries its
// own subject; the English/GS menus filter by it but keep the original index.
const mineSource = {
  key: "mine", tab: "both", subject: "both",
  async list() {
    const { chapters, questions } = await readCustomChapters();
    return chapters.map((ch) => ({
      label: `✍️ ${ch.name || "Chapter"}`,
      count: (questions[ch.id] || []).length,
      subject: ch.subject === "english" ? "english" : "gs",
      load: async () => questions[ch.id] || [],
    }));
  },
};

export const CH_SOURCES = {
  eb: bankSource({ key: "eb", tab: "en", subject: "english", indexPath: "/engbank/index.json", listKey: "chapters", entryPath: (e) => `/engbank/${e.slug}.json` }),
  ep: bankSource({ key: "ep", tab: "en", subject: "english", indexPath: "/errorprobank/index.json", listKey: "chapters", entryPath: (e) => `/errorprobank/${e.slug}.json` }),
  gk: bankSource({ key: "gk", tab: "gs", subject: "gs", indexPath: "/gkbank/index.json", listKey: "topics", filter: (t) => t.subject === "gs", entryPath: (e) => `/gkbank/${e.slug}.json` }),
  wr: bankSource({ key: "wr", tab: "gs", subject: "gs", indexPath: "/warbank/index.json", listKey: "subjects", entryPath: (e) => `/warbank/${e.slug}.json` }),
  ca: caSource,
  mine: mineSource,
};

// The source buttons shown under each tab (mine appended only if it has entries).
const TAB_SOURCES = {
  en: [{ key: "eb", label: "📖 PYQ bank" }, { key: "ep", label: "✍️ Error-spotting" }],
  gs: [{ key: "gk", label: "📚 GK Topics" }, { key: "wr", label: "⚔️ WAR bank" }, { key: "ca", label: "🗞️ Current Affairs" }],
};

export async function loadSourceEntries(origin, srcKey) {
  const src = CH_SOURCES[srcKey];
  if (!src) return [];
  return src.list(origin).catch(() => []);
}

// One chapter's entries -> poll records. Reuses the bank normalizers from tgquiz.
export async function chapterRecords(origin, srcKey, idx) {
  const entries = await loadSourceEntries(origin, srcKey);
  const entry = entries[idx];
  if (!entry) return [];
  const raw = await entry.load().catch(() => []);
  const out = [];
  for (const q of raw) {
    if (q && (q.passageId || q.passage)) continue;
    const nq = normalizeBankQ(q);
    if (!pollable(nq)) continue;
    out.push(recordFromStd({ subject: entry.subject, q: nq, label: entry.label }));
  }
  return out;
}

// ---- Menu builders -----------------------------------------------------------
const btn = (text, data) => ({ text: clamp(text, 60), callback_data: data });

export function rootMenu() {
  return {
    text: "📚 <b>Kya padhna hai?</b>\nButton dabao — ya <code>/start 30</code> se seedha mixed batch.",
    reply_markup: {
      inline_keyboard: [
        [btn("🎲 Mixed 10", "b|10")],
        [btn("📘 English", "t|en"), btn("📗 GS", "t|gs")],
        [btn("📔 Notes", "nb")],
      ],
    },
  };
}

export async function tabMenu(tab) {
  const rows = (TAB_SOURCES[tab] || []).map((s) => [btn(s.label, `s|${s.key}`)]);
  // Offer "Mere Questions" only if you have custom chapters for this subject.
  const subj = tab === "en" ? "english" : "gs";
  const mine = await mineSource.list().catch(() => []);
  if (mine.some((e) => e.subject === subj)) rows.push([btn("✍️ Mere Questions", `s|mine|${tab}`)]);
  rows.push([btn("🔙 Back", "home")]);
  return {
    text: tab === "en" ? "📘 <b>English</b> — source chuno:" : "📗 <b>GS</b> — source chuno:",
    reply_markup: { inline_keyboard: rows },
  };
}

// Chapter picker for one source. `subj` (mine only) filters display but the
// callback keeps each entry's ORIGINAL index so chapterRecords resolves it.
export async function sourceMenu(origin, srcKey, page = 0, subj = "") {
  const all = await loadSourceEntries(origin, srcKey);
  const shown = all.map((e, i) => ({ e, i })).filter((x) => !subj || x.e.subject === (subj === "en" ? "english" : "gs"));
  const pages = Math.max(1, Math.ceil(shown.length / CHAP_PAGE));
  const p = Math.min(Math.max(0, page), pages - 1);
  const slice = shown.slice(p * CHAP_PAGE, p * CHAP_PAGE + CHAP_PAGE);

  const rows = [];
  for (let k = 0; k < slice.length; k += 2) {
    const row = slice.slice(k, k + 2).map(({ e, i }) =>
      btn(`${e.label}${e.count ? ` · ${e.count}` : ""}`, `c|${srcKey}|${i}`));
    rows.push(row);
  }
  if (pages > 1) {
    const nav = [];
    const tail = subj ? `|${subj}` : "";
    if (p > 0) nav.push(btn("◀️", `sp|${srcKey}|${p - 1}${tail}`));
    nav.push(btn(`${p + 1}/${pages}`, "noop"));
    if (p < pages - 1) nav.push(btn("▶️", `sp|${srcKey}|${p + 1}${tail}`));
    rows.push(nav);
  }
  const back = subj ? `t|${subj}` : `t|${CH_SOURCES[srcKey]?.tab || "gs"}`;
  rows.push([btn("🔙 Back", back)]);
  return {
    text: shown.length ? "Chapter chuno — 10 questions ek baar me aayenge:" : "Koi chapter nahi mila.",
    reply_markup: { inline_keyboard: rows },
  };
}

// ---- Notes -------------------------------------------------------------------
export async function loadNotesServer(origin, slug) {
  const cfg = notesBookMeta(slug);
  if (!cfg) return null;
  const d = await jget(origin, cfg.file);
  if (!d) return null;
  return {
    slug,
    meta: d.meta || { topics: [] },
    pages: Array.isArray(d.pages) ? d.pages : [],
    scanBase: cfg.scanBase,
    subject: cfg.subject || "gs",
    title: cfg.title,
    eyebrow: cfg.eyebrow,
    imageMode: (d.meta && d.meta.render_mode) === "image",
  };
}

function topicNameAt(meta, idx) {
  const t = (meta.topics || [])[idx];
  if (t == null) return null;
  return typeof t === "string" ? t : t.topic;
}

function topicPages(book, topicName) {
  return book.pages.filter((p) => p && p.topic === topicName && !p.is_cover && p.kind !== "practice");
}

const NOTE_BOOK_PAGE = 12;
const NOTE_TOPIC_PAGE = 16;

export function notesBooksMenu(page = 0) {
  const books = listNotesBooks();
  const pages = Math.max(1, Math.ceil(books.length / NOTE_BOOK_PAGE));
  const p = Math.min(Math.max(0, page), pages - 1);
  const rows = books.slice(p * NOTE_BOOK_PAGE, p * NOTE_BOOK_PAGE + NOTE_BOOK_PAGE)
    .map((b) => [btn(b.eyebrow || b.title || b.slug, `nk|${b.slug}`)]);
  if (pages > 1) {
    const nav = [];
    if (p > 0) nav.push(btn("◀️", `nbp|${p - 1}`));
    nav.push(btn(`${p + 1}/${pages}`, "noop"));
    if (p < pages - 1) nav.push(btn("▶️", `nbp|${p + 1}`));
    rows.push(nav);
  }
  rows.push([btn("🔙 Back", "home")]);
  return { text: "📔 <b>Notes</b> — book chuno:", reply_markup: { inline_keyboard: rows } };
}

export async function notesTopicsMenu(origin, slug, page = 0) {
  const book = await loadNotesServer(origin, slug);
  if (!book) return { text: "Notes load nahi hue.", reply_markup: { inline_keyboard: [[btn("🔙 Back", "nb")]] } };
  const topics = book.meta.topics || [];
  const pages = Math.max(1, Math.ceil(topics.length / NOTE_TOPIC_PAGE));
  const p = Math.min(Math.max(0, page), pages - 1);
  const rows = [];
  const slice = topics.slice(p * NOTE_TOPIC_PAGE, p * NOTE_TOPIC_PAGE + NOTE_TOPIC_PAGE);
  for (let k = 0; k < slice.length; k++) {
    const gi = p * NOTE_TOPIC_PAGE + k;
    const name = typeof slice[k] === "string" ? slice[k] : slice[k].topic;
    rows.push([btn(name, `nt|${slug}|${gi}`)]);
  }
  if (pages > 1) {
    const nav = [];
    if (p > 0) nav.push(btn("◀️", `ntp|${slug}|${p - 1}`));
    nav.push(btn(`${p + 1}/${pages}`, "noop"));
    if (p < pages - 1) nav.push(btn("▶️", `ntp|${slug}|${p + 1}`));
    rows.push(nav);
  }
  rows.push([btn("🔙 Books", "nb")]);
  return { text: `📔 <b>${book.title || slug}</b> — topic chuno:`, reply_markup: { inline_keyboard: rows } };
}

// A single notes page as a Telegram payload. Text pages -> HTML text (+ figure
// image URLs to send after); image-book pages -> a scan photo. Nav + 📝 Quiz.
export async function notesPageView(origin, slug, tIdx, pIdx) {
  const book = await loadNotesServer(origin, slug);
  if (!book) return { kind: "text", text: "Notes load nahi hue.", reply_markup: { inline_keyboard: [[btn("🔙 Back", "nb")]] } };
  const topicName = topicNameAt(book.meta, tIdx);
  const pages = topicPages(book, topicName);
  const backRow = [btn("🔙 Topics", `nk|${slug}`)];
  if (!pages.length)
    return { kind: "text", text: `“${topicName}” me koi page nahi mila.`, reply_markup: { inline_keyboard: [backRow] } };

  const p = Math.min(Math.max(0, pIdx), pages.length - 1);
  const page = pages[p];
  const header = `📔 <b>${book.title || slug}</b> › ${topicName}\nPage ${p + 1}/${pages.length}`;

  const nav = [];
  if (p > 0) nav.push(btn("◀️ Prev", `np|${slug}|${tIdx}|${p - 1}`));
  if (p < pages.length - 1) nav.push(btn("Next ▶️", `np|${slug}|${tIdx}|${p + 1}`));
  const rows = [];
  if (nav.length) rows.push(nav);

  if (book.imageMode) {
    // Scan IS the content; blocks are empty so no quiz here.
    rows.push(backRow);
    return {
      kind: "image",
      photo: `${book.scanBase}/${basename(page.scan)}`,
      caption: header,
      reply_markup: { inline_keyboard: rows },
    };
  }

  const { html, figures } = blocksToTelegram(page.blocks);
  rows.push([btn("📝 Quiz banao (10)", `nq|${slug}|${tIdx}|${p}`)]);
  rows.push(backRow);
  return {
    kind: "text",
    text: `${header}\n\n${html || "<i>(is page par text nahi)</i>"}`,
    figures,
    reply_markup: { inline_keyboard: rows },
  };
}

// Page text (for notes-quiz generation) from a single notes page.
export async function notesPageText(origin, slug, tIdx, pIdx) {
  const book = await loadNotesServer(origin, slug);
  if (!book || book.imageMode) return { text: "", topic: "", subject: (book && book.subject) || "gs" };
  const topicName = topicNameAt(book.meta, tIdx);
  const pages = topicPages(book, topicName);
  const page = pages[Math.min(Math.max(0, pIdx), pages.length - 1)];
  if (!page) return { text: "", topic: topicName || "", subject: book.subject };
  const { html } = blocksToTelegram(page.blocks);
  // Strip the HTML tags we added — the quiz route wants plain notes text.
  const plain = String(html).replace(/<[^>]+>/g, "");
  return { text: plain, topic: topicName || "", subject: book.subject };
}
