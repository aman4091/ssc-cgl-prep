// 🎯 "Aaj ka set" — ek click, aur test saamne.
//
// Roz ka sabse bada nuksaan padhai mein nahi hota, FAISLE mein hota hai: kaunsa
// bank, kaunsa chapter, kitne question. Bees minute usi mein nikal jaate hain,
// aur aksar wahi chapter chun liya jata hai jo pehle se aata hai — kyunki wo
// achha lagta hai. Ye file wo faisla chheen leti hai.
//
// Chapter apne aap chunte hain, aur KAMZOR chapter ko zyada mauka milta hai.
// Kamzori ka pata lib/qreview ke weak-areas se chalta hai (kis category mein
// kitne galat hue) — wahi aankda jo Answers board ki chapter report banata hai.
// Har chapter ka ek base weight bhi hai, warna jo chapter kabhi chhua hi nahi
// wo kabhi aata hi nahi.
//
// Jo question pehle ho chuke (lib/qdone) unhe chhod dete hain — set mein wahi
// aata hai jo abhi baaki hai. Poora chapter ho chuka ho to phir usme se hi
// dobara, kyunki khaali set dene se koi faayda nahi.

import { loadMathIndex, loadMathChapter } from "./mathbank";
import { loadReasonIndex, loadReasonChapter } from "./reasonbank";
import { loadEngIndex, loadEngChapter } from "./engbank";
import { loadGkIndex, loadGkTopic } from "./gkbank";
import { getWeakAreas } from "./qreview";
import { isDone } from "./qdone";
import { seededShuffle } from "./shuffle";
import { saveQuiz, makeId } from "./storage";

const slugify = (s) =>
  String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// Har subject ka bank: list kahan se aati hai, aur ek chapter kaise khulta hai.
const BANKS = {
  math: {
    index: async () => (await loadMathIndex()).chapters || [],
    chapter: loadMathChapter,
    label: "Maths",
  },
  reasoning: {
    index: async () => (await loadReasonIndex()).chapters || [],
    chapter: loadReasonChapter,
    label: "Reasoning",
  },
  english: {
    index: async () => (await loadEngIndex()).chapters || [],
    chapter: loadEngChapter,
    label: "English",
  },
  gs: {
    // gkbank mein English ke topic bhi pade hain (Noun, Error Spotting…).
    // GS ke set mein wo aa jaate the — isliye sirf subject "gs" wale.
    index: async () => ((await loadGkIndex()).topics || []).filter((t) => t.subject === "gs"),
    chapter: loadGkTopic,
    label: "GS",
  },
};

// Kis chapter mein kitne galat hue — chapter ke slug ke hisaab se.
function weakBySlug() {
  const out = {};
  for (const w of getWeakAreas()) {
    const s = slugify(w.category);
    if (s) out[s] = (out[s] || 0) + (w.wrong || 0);
  }
  return out;
}

// Weight = 1 + galtiyan. Jo chapter kabhi chhua hi nahi uska 1 rehta hai —
// yaani mauka milta hai, par kamzor chapter ko zyada.
function pickChapter(chapters, weak, used) {
  const pool = chapters.filter((c) => c.slug && !used.has(c.slug) && (c.count || 0) > 0);
  if (!pool.length) return null;
  const w = pool.map((c) => 1 + (weak[c.slug] || 0) * 3);
  const total = w.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= w[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

// Ek set mein itne chapter mila kar dete hain. Har chapter ek alag fetch hai,
// isliye ginti kam — par agar koi chapter chhota nikla to set adhoora reh
// jayega, to zaroorat padne par TRIES tak aur chapter khol lete hain.
const MIX_CHAPTERS = 4;

/**
 * subject ke liye `n` question ka set banao aur quiz save kar do.
 * -> { id, title, n, chapters } ya null (bank hi na mile to).
 */
export async function buildTodaySet(subject, n = 25) {
  const bank = BANKS[subject];
  if (!bank) return null;
  const chapters = await bank.index();
  if (!chapters.length) return null;

  const weak = weakBySlug();
  // Beej har set ke liye alag — warna ek hi din do baar set banao to wahi
  // question wahi kram mein aa jate.
  const seed = `${subject}-${Date.now()}`;
  const used = new Set();
  const picked = [];
  const names = [];
  const perChapter = Math.max(4, Math.ceil(n / MIX_CHAPTERS));

  // Jab tak set bhar na jaye, aur jab tak koi chapter bacha ho. Khaali nikla
  // chapter (index mein hai par file nahi) mauka nahi khata — warna set adhoora
  // reh jata tha.
  let guard = 0;
  const loaded = [];        // top-up ke liye — jo chapter khul chuke
  while (picked.length < n && used.size < chapters.length && guard++ < 20) {
    const ch = pickChapter(chapters, weak, used);
    if (!ch) break;
    used.add(ch.slug);
    const qs = await bank.chapter(ch.slug);
    if (!qs.length) continue;
    // Pehle wahi jo abhi tak nahi hue; sab ho chuke ho to phir se unhi mein se.
    const fresh = qs.filter((q) => !isDone(q));
    const pool = fresh.length >= 4 ? fresh : qs;
    loaded.push(pool);
    const take = seededShuffle(pool, seed + ch.slug).slice(0, perChapter);
    if (!take.length) continue;
    names.push(ch.label || ch.slug);
    picked.push(...take);
  }

  // Bank chhota nikla (GS ke paas do hi topic hain) — to jo chapter khul chuke
  // hain unhi se set poora kar lo. Adhoora set dene se behtar hai.
  if (picked.length < n && loaded.length) {
    const have = new Set(picked);
    for (const pool of loaded) {
      for (const q of seededShuffle(pool, seed + "top")) {
        if (picked.length >= n) break;
        if (!have.has(q)) { have.add(q); picked.push(q); }
      }
      if (picked.length >= n) break;
    }
  }
  if (!picked.length) return null;

  const questions = seededShuffle(picked, seed).slice(0, n);
  const title = `🎯 Aaj ka set · ${bank.label}`;
  const quiz = {
    id: makeId(),
    title,
    // Subject saath mein — quiz page isi se tay karta hai ki tasveer wale
    // sawaal ka Maths card kholna hai ya Reasoning ka.
    subject,
    // `source` se quiz runner ko pata chalta hai ki ye kis tarah ka set hai;
    // "chapter · questions" wala roop weak-area ki category bhi theek deta hai.
    source: `${names.join(", ")} · questions`,
    createdAt: new Date().toISOString(),
    questions,
  };
  saveQuiz(quiz);
  return { id: quiz.id, title, n: questions.length, chapters: names };
}
