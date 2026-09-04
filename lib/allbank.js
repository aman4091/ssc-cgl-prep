// 🗂️ All — ek subject ke SAARE PYQ ek hi jagah.
//
// Shelf-wise banta hua bank apni jagah theek hai (Pinnacle Maths alag, Maths
// 2025 alag), par padhte waqt sawal "Maths karna hai" hota hai, "Pinnacle
// Maths ka Algebra chapter kholna hai" nahi. Ye file wahi jodne ka kaam karti
// hai: har subject ke neeche uske saare banks, aur har bank ke uske saare
// chapters — ek list.
//
// Kuch naya data yahan NAHI hai. Wahi loaders (warbank/engbank/mathbank/…) hain
// jo bank ke apne page chalate hain, isliye:
//   • question objects bilkul wahi hain — stats, ★ bookmark, ✅ ho-gaya,
//     paste kiya Gemini answer, sab dono jagah ek hi hain (keys content se
//     bante hain, page se nahi).
//   • jo chapter pehle khul chuka hai wo dobara fetch nahi hota — loaders apna
//     memory cache khud rakhte hain.
//
// Har question par teen extra field lagte hain (`_src`, `_chapter`, `_card`):
// kis bank se aaya, uska chapter, aur kaunsa card usse dikha sakta hai (maths/
// reasoning ke question TASVEER hain, unka card alag hai).

import { loadWarIndex, loadWarSubject } from "./warbank";
import { loadEngIndex, loadEngChapter } from "./engbank";
import { loadErrorProIndex, loadErrorProChapter } from "./errorprobank";
import { loadMathIndex, loadMathChapter } from "./mathbank";
import { loadSscMathsIndex, loadSscMathsChapter } from "./sscmaths";
import { loadReasonIndex, loadReasonChapter } from "./reasonbank";
import { loadGkIndex, loadGkTopic } from "./gkbank";
import { SHELF_BOOKS, getUserBooks, getUserTopics, getUserTopicQuestions, userTopicCount } from "./userpyq";

// Menu ke chaar subject. `subject` wahi string hai jo cards/counter samajhte
// hain (qcounter ka COUNTER_SUBJECTS), isliye "Aaj kitne hue" wahi ginta hai jo
// bank ke apne page par ginta.
export const ALL_SUBJECTS = [
  { slug: "maths", label: "Maths", icon: "🧮", subject: "math", desc: "Pinnacle Maths + Maths 2025" },
  { slug: "reasoning", label: "Reasoning", icon: "🧠", subject: "reasoning", desc: "Pinnacle Reasoning — verbal aur non-verbal" },
  { slug: "english", label: "English", icon: "📚", subject: "english", desc: "Pinnacle English + Error Pro + Mirror" },
  { slug: "gs", label: "General Studies", icon: "🌍", subject: "gs", desc: "WAR ke 12 subject + GKTricks" },
];

export function allSubjectMeta(slug) {
  return ALL_SUBJECTS.find((s) => s.slug === slug) || null;
}

const sum = (rows) => (rows || []).reduce((a, r) => a + (r.count || 0), 0);

// Ek bank = ek "source". `parts` uske tukde deta hai (chapter/subject/topic —
// ek fetch ek part), `count` bina questions fetch kiye ginti (menu ke liye).
// `card` batata hai kaunsa question card is bank ko dikha sakta hai.
//
// Har part apna `slug` aur apni `count` bhi saath laata hai. loadAllSubject ko
// inki zaroorat nahi (wo to sab kuch kholta hi hai), par "apna test banao"
// (lib/mixtest) ko hai: wahan chapter ki list bina ek bhi question fetch kiye
// dikhani hoti hai — "Trigonometry · 246 mein se kitne chahiye" — aur chuna hua
// chapter yaad rakhne ke liye ek sthir naam chahiye. Wo naam slug se banta hai,
// list ke number se nahi (list badal sakti hai, slug nahi).
const gkParts = (subject) => async () => {
  const { topics } = await loadGkIndex();
  return (topics || [])
    .filter((t) => t.subject === subject)
    .map((t) => ({ slug: t.slug, name: t.label, count: t.count || 0, load: () => loadGkTopic(t.slug) }));
};
const gkCount = (subject) => async () => {
  const { topics } = await loadGkIndex();
  return sum((topics || []).filter((t) => t.subject === subject));
};

// User ki apni books (Settings → 📚 PYQ Manager) bhi ismein aati hain — wo bhi
// isi subject ke question hain, sirf localStorage mein hain. SHELF_BOOKS wo
// "virtual" books hain jinke andar user ne shipped bank ke saath apne topic
// daale hain.
function myTopics(slug) {
  if (typeof window === "undefined") return [];
  const books = [...SHELF_BOOKS, ...getUserBooks()].filter((b) => b.subject === slug);
  const out = [];
  for (const b of books) {
    for (const t of getUserTopics(b.id)) out.push({ book: b, topic: t });
  }
  return out;
}
const myParts = (slug) => async () =>
  myTopics(slug).map(({ book, topic }) => ({
    slug: topic.id,
    name: `${book.name} · ${topic.name}`,
    count: userTopicCount(topic.id),
    load: async () => getUserTopicQuestions(topic.id),
  }));
const myCount = (slug) => async () =>
  myTopics(slug).reduce((a, { topic }) => a + userTopicCount(topic.id), 0);

const MY_SOURCE = (slug) => ({
  id: "mine", label: "Meri books", icon: "📘", card: "pyq",
  parts: myParts(slug), count: myCount(slug),
});

const SOURCES = {
  maths: [
    {
      id: "mathbank", label: "Pinnacle Maths", icon: "🧮", card: "math", href: "/pyq/mathbank",
      parts: async () => (await loadMathIndex()).chapters.map((c) => ({ slug: c.slug, name: c.label, count: c.count || 0, load: () => loadMathChapter(c.slug) })),
      count: async () => sum((await loadMathIndex()).chapters),
    },
    {
      id: "maths2025", label: "Maths 2025", icon: "🧮", card: "pyq", href: "/pyq/maths2025",
      parts: async () => ((await loadSscMathsIndex()).chapters || []).map((c) => ({ slug: c.slug, name: c.label, count: c.count || 0, load: () => loadSscMathsChapter(c.slug) })),
      count: async () => sum((await loadSscMathsIndex()).chapters),
    },
    MY_SOURCE("maths"),
  ],
  reasoning: [
    {
      id: "reasonbank", label: "Pinnacle Reasoning", icon: "🧠", card: "reason", href: "/pyq/reasonbank",
      parts: async () => (await loadReasonIndex()).chapters.map((c) => ({ slug: c.slug, name: c.label, count: c.count || 0, load: () => loadReasonChapter(c.slug) })),
      count: async () => sum((await loadReasonIndex()).chapters),
    },
    MY_SOURCE("reasoning"),
  ],
  english: [
    {
      id: "engbank", label: "Pinnacle English", icon: "📚", card: "pyq", href: "/pyq/pinnacle",
      parts: async () => (await loadEngIndex()).chapters.map((c) => ({ slug: c.slug, name: c.label, count: c.count || 0, load: () => loadEngChapter(c.slug) })),
      count: async () => sum((await loadEngIndex()).chapters),
    },
    {
      id: "errorpro", label: "Error Pro", icon: "🎯", card: "pyq", href: "/pyq/errorpro",
      parts: async () => (await loadErrorProIndex()).chapters.map((c) => ({ slug: c.slug, name: c.label, count: c.count || 0, load: () => loadErrorProChapter(c.slug) })),
      count: async () => sum((await loadErrorProIndex()).chapters),
    },
    {
      id: "mirror", label: "Mirror of Common Errors", icon: "🪞", card: "pyq", href: "/pyq/mirror",
      parts: gkParts("english"), count: gkCount("english"),
    },
    MY_SOURCE("english"),
  ],
  gs: [
    {
      id: "war", label: "WAR", icon: "🎯", card: "pyq", href: "/pyq/war",
      parts: async () => (await loadWarIndex()).subjects.map((s) => ({ slug: s.slug, name: s.label, count: s.count || 0, load: () => loadWarSubject(s.slug) })),
      count: async () => sum((await loadWarIndex()).subjects),
    },
    {
      id: "gktricks", label: "GKTricks", icon: "🧠", card: "pyq", href: "/pyq/gktricks",
      parts: gkParts("gs"), count: gkCount("gs"),
    },
    MY_SOURCE("gs"),
  ],
};

export function sourcesFor(slug) { return SOURCES[slug] || []; }

// Menu ke liye ginti — sirf index.json padhta hai, questions nahi. Isliye "All"
// ka page turant khulta hai, 30,000 question fetch kiye bina.
export async function countsFor(slug) {
  const srcs = sourcesFor(slug);
  const counts = await Promise.all(srcs.map(async (s) => {
    try { return await s.count(); } catch { return 0; }
  }));
  const rows = srcs.map((s, i) => ({ id: s.id, label: s.label, icon: s.icon, count: counts[i] }));
  return { rows: rows.filter((r) => r.count > 0), total: rows.reduce((a, r) => a + r.count, 0) };
}

// Ek saath 56 fetch chhodna phone par thik nahi (maths ke do bank milakar itne
// hi chapter hain) — 6 ki line mein chalte hain.
async function pool(tasks, limit, onStep) {
  const out = new Array(tasks.length);
  let next = 0;
  const worker = async () => {
    for (;;) {
      const at = next++;
      if (at >= tasks.length) return;
      try { out[at] = await tasks[at](); } catch { out[at] = []; }
      if (onStep) onStep();
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return out;
}

const listCache = {};

// Subject ke saare questions, bank ke kram mein aur bank ke andar chapter ke
// kram mein. onProgress(done, total) har chapter aane par chalta hai — 12,000
// question ka intezaar bina kisi khabar ke lamba lagta hai.
export async function loadAllSubject(slug, onProgress) {
  if (listCache[slug]) return listCache[slug];
  const srcs = sourcesFor(slug);
  const groups = await Promise.all(srcs.map(async (s) => {
    try { return { src: s, parts: await s.parts() }; } catch { return { src: s, parts: [] }; }
  }));
  const flat = [];
  for (const g of groups) for (const p of g.parts) flat.push({ src: g.src, part: p });

  let done = 0;
  const total = flat.length;
  if (onProgress) onProgress(0, total);
  const loaded = await pool(
    flat.map(({ part }) => () => part.load()),
    6,
    () => { done += 1; if (onProgress) onProgress(done, total); },
  );

  const out = [];
  flat.forEach(({ src, part }, i) => {
    const qs = Array.isArray(loaded[i]) ? loaded[i] : [];
    qs.forEach((q, j) => {
      out.push({
        ...q,
        _src: src.id,
        _srcLabel: src.label,
        _chapter: part.name,
        _card: src.card,
        // React ki key: do bank ek hi id chhap sakte hain (Pinnacle English aur
        // Error Pro dono mein "voice-0001" hai), isliye list ki apni pehchaan.
        _uid: `${src.id}:${i}:${j}`,
      });
    });
  });
  listCache[slug] = out;
  return out;
}
