"use client";

// 🤖 AI run — ek subject chuno, ginti chuno, aur utne question ek-ek karke
// AI site par le jao.
//
// Har bank ka apna loader aur apni shakl hai (kahin text question, kahin
// poora question ek tasveer). Ye file un sabko EK jaisa roop deti hai —
// "job" — taaki /ai-run ka page sirf ek hi cheez samjhe:
//
//   { id, subject, kind, title, text | imgUrl, done, save(answer) }
//
// kind "text"  -> prompt + question clipboard par, ek hi paste
// kind "image" -> tasveer clipboard par (OCR bharose ka nahi: fraction,
//                 ghat, figure), wapas aate hi prompt copy ho jata hai
//
// Jawab wahin jata hai jahan se us question ka card use padhta hai:
// bank ke question par uska apna shortcut store, Answers ke screenshot par
// wrong book ka detail2, vocab par us word ki `mine` meaning.

import { loadErrorProIndex, loadErrorProChapter } from "./errorprobank";
import { loadEngIndex, loadEngChapter } from "./engbank";
import { loadWarIndex, loadWarSubject } from "./warbank";
import { loadGkIndex, loadGkTopic } from "./gkbank";
import { loadMathIndex, loadMathChapter } from "./mathbank";
import { loadReasonIndex, loadReasonChapter } from "./reasonbank";
import { getSavedShortcut, saveShortcutFor } from "./shortcuts";
import { mathTq, reasonTq } from "./imgq";
import { getWrongBook, setDetail2, imagesOf, newGeminiAnswer, SUBJECTS as WB_SUBJECTS } from "./wrongbook";
import { imageBlob } from "./imgclip";
import { getMine, setMine } from "./vocab";
import { vocabPool } from "./vocabpool";

const letter = (i) => String.fromCharCode(65 + i);

// Text question ka wo roop jo AI ko bhejte hain.
function questionText(q) {
  const opts = (q.options || []).map((o, i) => `${letter(i)}) ${o}`).join("\n");
  return `${String(q.question || "").trim()}\n${opts}`.trim();
}

function textJob(q, subject) {
  return {
    id: q.id || `${subject}:${String(q.question || "").slice(0, 60)}`,
    subject,
    kind: "text",
    title: String(q.question || "").slice(0, 120),
    text: questionText(q),
    imgUrl: "",
    done: !!getSavedShortcut(q),
    save: (answer) => saveShortcutFor(q, answer),
  };
}

// Tasveer wale bank (Pinnacle Maths / Reasoning): question khud ek image hai.
function imgJob(q, subject, tq) {
  return {
    id: q.id,
    subject,
    kind: "image",
    title: q.qText ? String(q.qText).slice(0, 120) : `[${q.id}]`,
    text: "",
    imgUrl: q.qImg,
    done: !!getSavedShortcut(tq),
    save: (answer) => saveShortcutFor(tq, answer),
  };
}

const bank = (cfg) => ({ kind: "bank", ...cfg });

export const AI_SOURCES = [
  bank({
    key: "errorpro", name: "Error Pro", icon: "🎯", subject: "english",
    index: loadErrorProIndex, listOf: (i) => i.chapters || [],
    jobs: async (slug) => (await loadErrorProChapter(slug)).map((q) => textJob(q, "english")),
  }),
  bank({
    key: "engbank", name: "Pinnacle English", icon: "📚", subject: "english",
    index: loadEngIndex, listOf: (i) => i.chapters || [],
    jobs: async (slug) => (await loadEngChapter(slug)).map((q) => textJob(q, "english")),
  }),
  bank({
    key: "war", name: "WAR", icon: "⚔️", subject: "gs",
    index: loadWarIndex, listOf: (i) => i.subjects || [],
    jobs: async (slug) => (await loadWarSubject(slug)).map((q) => textJob(q, "gs")),
  }),
  bank({
    key: "gk", name: "GKTricks", icon: "🧠", subject: "gs",
    index: loadGkIndex, listOf: (i) => (i.topics || []).filter((t) => t.subject === "gs"),
    jobs: async (slug) => (await loadGkTopic(slug)).map((q) => textJob(q, "gs")),
  }),
  bank({
    key: "mirror", name: "Mirror of Common Errors", icon: "🪞", subject: "english",
    index: loadGkIndex, listOf: (i) => (i.topics || []).filter((t) => t.subject === "english"),
    jobs: async (slug) => (await loadGkTopic(slug)).map((q) => textJob(q, "english")),
  }),
  bank({
    key: "mathbank", name: "Pinnacle Maths", icon: "🧮", subject: "math",
    index: loadMathIndex, listOf: (i) => i.chapters || [],
    jobs: async (slug) => (await loadMathChapter(slug)).map((q) => imgJob(q, "math", mathTq(q))),
  }),
  bank({
    key: "reasonbank", name: "Pinnacle Reasoning", icon: "🧩", subject: "reasoning",
    index: loadReasonIndex, listOf: (i) => i.chapters || [],
    jobs: async (slug) => (await loadReasonChapter(slug)).map((q) => imgJob(q, "reasoning", reasonTq(q))),
  }),
  // 📖 Answers ke screenshot — jinka abhi koi Gemini answer nahi hai.
  {
    kind: "answers", key: "answers", name: "Answers (screenshot)", icon: "📖",
    index: async () => null,
    listOf: () => WB_SUBJECTS.map((s) => ({ slug: s.key, label: `${s.icon} ${s.label}`, icon: s.icon })),
    jobs: async (slug) => getWrongBook()
      .filter((r) => r.subject === slug)
      .map((r) => ({
        id: r.id,
        subject: slug,
        kind: "image",
        title: `${r.qid || r.id}`,
        text: "",
        // Screenshot sirf is browser mein hai (IndexedDB / R2 cache),
        // isliye URL nahi — blob yahan se milta hai.
        imgUrl: "",
        blob: async () => imageBlob((imagesOf(r) || [])[0]),
        done: !!newGeminiAnswer(r),
        save: (answer) => setDetail2(r.id, answer),
      })),
  },
  // 🔤 Vocab — jin words ka matlab abhi nahi hai.
  {
    kind: "vocab", key: "vocab", name: "Vocab", icon: "🔤",
    index: async () => null,
    listOf: () => [{ slug: "all", label: "🔤 Saare words", icon: "🔤" }],
    jobs: async () => vocabPool().map((it) => ({
      id: it.id,
      subject: "english",
      kind: "text",
      title: it.word,
      text: it.word,
      imgUrl: "",
      done: !!getMine(it.word),
      save: (answer) => setMine(it.word, answer),
    })),
  },
];

export const sourceByKey = (k) => AI_SOURCES.find((s) => s.key === k) || null;

/** Ek source ki list (chapter / topic / subject). */
export async function loadList(source) {
  if (!source) return [];
  const idx = await source.index();
  return source.listOf(idx || {});
}

/**
 * Chuni hui jagah ke pehle `limit` question — jinka jawab pehle se hai wo
 * chhod kar (unhe dobara AI ke paas bhejne ka koi matlab nahi).
 */
export async function loadJobs(source, slug, limit) {
  const all = await source.jobs(slug);
  const left = all.filter((j) => !j.done);
  return { total: all.length, pending: left.length, jobs: left.slice(0, limit) };
}
