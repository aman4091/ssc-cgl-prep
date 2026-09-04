// 🧪 Apna test banao — jo chapter chahiye wahi, jitne question chahiye utne.
//
// Site par test do hi tarah se milte the: poora chapter (25-25 ke set) ya "Aaj
// ka set" (chapter khud chunta hai). Dono mein ek hi kami thi — aaj Trigonometry
// aur Biology dono padhe hon to unka ek saath test dene ka koi rasta nahi tha.
// Do alag test dena wahi baat nahi: revision ka poora faayda tabhi hai jab do
// alag cheezein ek hi paper mein aayen, kyunki asli exam bhi yahi karta hai.
//
// Isliye yahan ek "mix": Trigonometry ke 10, Biology ke 5, Percentage ke 10 —
// kul 25. Kul ki hadd apni hai (25 default), aur chaho to poore 25 ek hi
// chapter ke le lo.
//
// Kuch naya data yahan NAHI hai. Chapter ki list wahi hai jo PYQ menu mein hai
// (lib/allbank ke sources), question objects wahi hain jo bank ke apne page par
// khulte hain — isliye ✅ ho-gaya, ★ bookmark, stats aur paste kiya Gemini
// answer dono jagah ek hi rehte hain. Test bhi koi naya engine nahi chalata:
// banaya hua quiz seedha /quizzes/<id> par khulta hai, wahi QBoard.
//
// Har chuna hua question par teen nishaan lagte hain — `_subject`, `_card`,
// `_chapter`. Mile-jule test mein poore board ka ek subject hota hi nahi,
// isliye QBoard inhi se tay karta hai ki ye question kis ring mein ginega, kis
// card mein khulega, aur galat hone par Mistake Notebook mein kis chapter ke
// naam se chadhega.

import { ALL_SUBJECTS, sourcesFor } from "./allbank";
import { isDone, doneKeyFor } from "./qdone";
import { seededShuffle } from "./shuffle";
import { saveQuiz, makeId } from "./storage";

// Ek baithak mein itne. SSC ka section bhi 25 ka hai, aur 25 se aage dhyaan
// waise bhi nahi tikta — par ye sirf DEFAULT hai, badla ja sakta hai.
export const MIX_LIMIT = 25;
// Waqt: SSC Tier-1 mein 100 question 60 minute mein — yaani 0.6 minute per
// question. Wahi raftaar yahan bhi.
export const minutesFor = (n) => Math.max(3, Math.round((Number(n) || 0) * 0.6));

const DRAFT_KEY = "cgl.mixtest";

// key -> { key, subject, subjectSlug, card, srcId, srcLabel, name, count, load }
const PARTS = new Map();

// Chapter ki sthir pehchaan. List ka number kaam nahi aata — bank badle ya
// koi chapter jud jaye to number khisak jata hai aur kal ka chuna hua test
// aaj kisi aur chapter ka ban jata.
export const partKey = (subjectSlug, srcId, slug) => `${subjectSlug}/${srcId}/${slug}`;

let catalogCache = null;

// Poori list: subject → bank → chapter (naam + ginti). Ek bhi question fetch
// nahi hota — sirf har bank ki index.json, jo chhoti hai aur browser waise bhi
// cache kar leta hai. Isliye ye page turant khulta hai.
export async function loadMixCatalog() {
  if (catalogCache) return catalogCache;
  const out = [];
  for (const s of ALL_SUBJECTS) {
    const sources = [];
    for (const src of sourcesFor(s.slug)) {
      let parts = [];
      try { parts = await src.parts(); } catch { parts = []; }
      const rows = [];
      for (const p of parts) {
        const count = Number(p.count) || 0;
        if (!count) continue;              // khaali chapter chunne ka koi matlab nahi
        const key = partKey(s.slug, src.id, p.slug || p.name);
        PARTS.set(key, {
          key,
          subject: s.subject,              // counter/card ka subject ("math"/"gs"/…)
          subjectSlug: s.slug,
          card: src.card,
          srcId: src.id,
          srcLabel: src.label,
          name: p.name,
          count,
          load: p.load,
        });
        rows.push({ key, name: p.name, count });
      }
      if (rows.length) {
        sources.push({
          id: src.id, label: src.label, icon: src.icon, parts: rows,
          total: rows.reduce((a, r) => a + r.count, 0),
        });
      }
    }
    if (sources.length) {
      out.push({
        slug: s.slug, label: s.label, icon: s.icon, subject: s.subject, sources,
        total: sources.reduce((a, x) => a + x.total, 0),
      });
    }
  }
  catalogCache = out;
  return out;
}

// Meri books badal sakti hain (Settings → PYQ Manager se naya topic), isliye
// list dobara banane ka rasta khula rakha hai.
export function clearMixCatalog() { catalogCache = null; PARTS.clear(); }

export function partInfo(key) { return PARTS.get(key) || null; }

// Jo question test mein ja sakta hai: jawab pata ho, aur dikhne ko kuch ho
// (text ya tasveer — Pinnacle Maths/Reasoning ke sawaal tasveer hain).
const usable = (q) => !!q && typeof q.answer === "number" && !!(q.question || q.qImg);

/**
 * picks: [{ key, n }] — kis chapter ke kitne question.
 * -> { id, title, n, rows } ya null (kuch mila hi na to).
 */
export async function buildMixTest(picks, { minutes, mix = false, skipDone = true, onStep } = {}) {
  await loadMixCatalog();
  const rows = (picks || [])
    .map((p) => ({ part: PARTS.get(p.key), want: Math.max(0, Math.floor(Number(p.n) || 0)) }))
    .filter((r) => r.part && r.want > 0);
  if (!rows.length) return null;

  // Beej har test ke liye alag — warna ek hi mix dobara banao to wahi question
  // wahi kram mein aa jate.
  const seed = `mix-${Date.now()}`;
  const picked = [];
  const seen = new Set();          // ek hi question do bank mein ho sakta hai
  const used = [];                 // jo chapter asli mein aaye

  let step = 0;
  for (const { part, want } of rows) {
    let qs = [];
    try { qs = await part.load(); } catch { qs = []; }
    onStep?.(++step, rows.length, part.name);
    const all = (Array.isArray(qs) ? qs : []).filter(usable);
    if (!all.length) continue;
    // Pehle wahi jo abhi tak nahi hue. Itne bache hi na ho to poore chapter se
    // — adhoora test dene se behtar hai.
    const fresh = skipDone ? all.filter((q) => !isDone(q)) : all;
    const pool = fresh.length >= want ? fresh : all;
    const take = [];
    for (const q of seededShuffle(pool, seed + part.key)) {
      const k = doneKeyFor(q);
      if (k && seen.has(k)) continue;
      if (k) seen.add(k);
      take.push({
        ...q,
        // Ye teen nishaan hi mile-jule test ko chalate hain — upar wali
        // tippani dekho.
        _subject: part.subject,
        _card: part.card,
        _chapter: part.name,
        _srcLabel: part.srcLabel,
        // React ki key: do bank ek hi id chhap sakte hain.
        _uid: `${part.key}:${take.length}`,
      });
      if (take.length >= want) break;
    }
    if (!take.length) continue;
    used.push({ key: part.key, name: part.name, n: take.length, subject: part.subject });
    picked.push(...take);
  }
  if (!picked.length) return null;

  // Default mein chapter-wise blocks — Trigonometry ke saare saath, phir
  // Biology ke. Padhte waqt dimaag ek hi patri par rehta hai. "Mila do" chuno
  // to asli mock jaisa, jahan har question naya jhatka hota hai.
  const questions = mix ? seededShuffle(picked, seed) : picked;

  // Sab ek hi subject se aaye ho to quiz ka apna subject wahi — tab header ka
  // "🔢 Aaj" wala counter bhi dikhta hai. Mile-jule test mein wo hota hi nahi.
  const subs = new Set(used.map((u) => u.subject));
  const subject = subs.size === 1 ? [...subs][0] : "";

  const names = used.map((u) => u.name);
  const short = names.slice(0, 3).join(", ") + (names.length > 3 ? ` +${names.length - 3}` : "");
  const title = `🧪 Mera test · ${short}`;
  const quiz = {
    id: makeId(),
    title,
    subject,
    source: `${names.join(", ")} · questions`,
    // Wahi mix dobara banane ke liye — result ke baad "phir se" ka rasta.
    mix: used.map(({ key, name, n }) => ({ key, name, n })),
    minutes: Math.max(1, Math.round(Number(minutes) || minutesFor(questions.length))),
    createdAt: new Date().toISOString(),
    questions,
  };
  saveQuiz(quiz);
  return { id: quiz.id, title, n: questions.length, rows: used, subject };
}

// ── pichhli baar ka mix ─────────────────────────────────────────────────────
//
// Roz ka revision aksar wahi rehta hai. Page dobara kholne par sab kuch phir se
// chunna sirf ragad hai, isliye aakhri chunaav yaad rakh lete hain. Chhoti key
// hai (do-chaar line ka JSON), isliye seedha localStorage — aur `cgl.` hone ki
// wajah se doosre device par bhi wahi.

export function getMixDraft() {
  if (typeof window === "undefined") return null;
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
    if (!d || !Array.isArray(d.picks)) return null;
    return d;
  } catch { return null; }
}

export function setMixDraft(draft) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft || {})); }
  catch { /* quota — draft kho jayega, test nahi */ }
}
