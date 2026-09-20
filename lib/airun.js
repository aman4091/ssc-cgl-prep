"use client";

// 🤖 AI run — ek jagah chuno, ginti chuno, aur utne question ek-ek karke
// AI site par le jao.
//
// Har bank ka apna loader aur apni shakl hai (kahin text question, kahin
// poora question ek tasveer). Ye file un sabko EK jaisa roop deti hai —
// "job" — taaki /ai-run ka page sirf ek hi cheez samjhe:
//
//   { id, subject, kind, title, text | imgUrl | blob, done, save(answer) }
//
// kind "text"  -> prompt + question clipboard par, ek hi paste
// kind "image" -> tasveer clipboard par (OCR bharose ka nahi: fraction,
//                 ghat, figure), wapas aate hi prompt copy ho jata hai
//
// KRAM WAHI jo chapter ke page par hai. Drill apna kram cgl.pyqdrill mein
// bachata hai (jahan tak tum pahunche ho wahi sabse aage), isliye yahan bhi
// wahi kram lagta hai — warna "run" kisi aur hi question se shuru hota aur
// jo tumne kal kar liya wo dobara AI ke paas chala jata.
//
// Jawab wahin jata hai jahan se us question ka card use padhta hai: bank ke
// question par uska apna shortcut store, Answers ke screenshot par wrong book
// ka detail2, vocab par us word ki `mine` meaning.

import { loadErrorProIndex, loadErrorProChapter } from "./errorprobank";
import { loadEngIndex, loadEngChapter } from "./engbank";
import { loadWarIndex, loadWarSubject } from "./warbank";
import { loadGkIndex, loadGkTopic } from "./gkbank";
import { loadMathIndex, loadMathChapter } from "./mathbank";
import { loadReasonIndex, loadReasonChapter } from "./reasonbank";
import { getSavedShortcut, saveShortcutFor } from "./shortcuts";
import { mathTq, reasonTq } from "./imgq";
import { getWrongBook, setDetail2, imagesOf, newGeminiAnswer, SUBJECTS as WB_SUBJECTS } from "./wrongbook";
import { getDoneMap } from "./answersdone";
import { imageBlob } from "./imgclip";
import { getMine, setMine } from "./vocab";
import { vocabPool } from "./vocabpool";
import {
  getUserBooks, getUserTopics, getUserTopicQuestions, shelfBook, isUserTopicId,
} from "./userpyq";
import { getOrder, qKeyOf } from "./pyqdrill";
import { hashStr } from "./syncitems";

const letter = (i) => String.fromCharCode(65 + i);

// Text question ka wo roop jo AI ko bhejte hain.
function questionText(q) {
  const opts = (q.options || []).map((o, i) => `${letter(i)}) ${o}`).join("\n");
  return `${String(q.question || "").trim()}\n${opts}`.trim();
}

// Drill jis pehchaan se kram bachata hai (components/PyqDrill ka hashOf).
const drillKey = (q) => hashStr(qKeyOf(q));

function textJob(q, subject) {
  return {
    id: q.id || `${subject}:${String(q.question || "").slice(0, 60)}`,
    dkey: drillKey(q),
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
    dkey: drillKey(q),
    subject,
    kind: "image",
    title: q.qText ? String(q.qText).slice(0, 120) : `[${q.id}]`,
    text: "",
    imgUrl: q.qImg,
    done: !!getSavedShortcut(tq),
    save: (answer) => saveShortcutFor(tq, answer),
  };
}

// Jo topic tumne khud jode hain wo sab /pyq/gk/<id> par khulte hain (chahe
// kisi bhi bank ki shelf par dikhte hon), isliye unka drill-key bhi wahi.
function userTopicItems(shelfId) {
  return getUserTopics(shelfId).map((t) => ({
    slug: t.id,
    label: `✍️ ${t.name}`,
    count: getUserTopicQuestions(t.id).length,
    mine: true,
  }));
}

const bank = (cfg) => ({ kind: "bank", ...cfg });

export const AI_SOURCES = [
  bank({
    key: "errorpro", name: "Error Pro", icon: "🎯", subject: "english", shelf: "shelf_errorpro",
    index: loadErrorProIndex, listOf: (i) => i.chapters || [],
    resumeKey: (slug) => `errorpro:${slug}`,
    jobs: async (slug) => (await loadErrorProChapter(slug)).map((q) => textJob(q, "english")),
  }),
  bank({
    key: "engbank", name: "Pinnacle English", icon: "📚", subject: "english", shelf: "shelf_pinnacle",
    index: loadEngIndex, listOf: (i) => i.chapters || [],
    resumeKey: (slug) => `pinnacle:${slug}`,
    jobs: async (slug) => (await loadEngChapter(slug)).map((q) => textJob(q, "english")),
  }),
  bank({
    key: "war", name: "WAR", icon: "⚔️", subject: "gs", shelf: "shelf_war",
    index: loadWarIndex, listOf: (i) => i.subjects || [],
    resumeKey: (slug) => `war:${slug}`,
    jobs: async (slug) => (await loadWarSubject(slug)).map((q) => textJob(q, "gs")),
  }),
  bank({
    key: "gk", name: "GKTricks", icon: "🧠", subject: "gs", shelf: "shelf_gktricks",
    index: loadGkIndex, listOf: (i) => (i.topics || []).filter((t) => t.subject === "gs"),
    resumeKey: (slug) => `gk:${slug}`,
    jobs: async (slug) => (await loadGkTopic(slug)).map((q) => textJob(q, "gs")),
  }),
  bank({
    key: "mirror", name: "Mirror of Common Errors", icon: "🪞", subject: "english", shelf: "shelf_mirror",
    index: loadGkIndex, listOf: (i) => (i.topics || []).filter((t) => t.subject === "english"),
    resumeKey: (slug) => `gk:${slug}`,
    jobs: async (slug) => (await loadGkTopic(slug)).map((q) => textJob(q, "english")),
  }),
  bank({
    key: "mathbank", name: "Pinnacle Maths", icon: "🧮", subject: "math", shelf: "shelf_mathbank",
    index: loadMathIndex, listOf: (i) => i.chapters || [],
    resumeKey: (slug) => `mathbank:${slug}`,
    jobs: async (slug) => (await loadMathChapter(slug)).map((q) => imgJob(q, "math", mathTq(q))),
  }),
  bank({
    key: "reasonbank", name: "Pinnacle Reasoning", icon: "🧩", subject: "reasoning", shelf: "shelf_reasonbank",
    index: loadReasonIndex, listOf: (i) => i.chapters || [],
    resumeKey: (slug) => `reasonbank:${slug}`,
    jobs: async (slug) => (await loadReasonChapter(slug)).map((q) => imgJob(q, "reasoning", reasonTq(q))),
  }),
  // ✍️ Jo books tumne khud banayi hain (kisi shelf ke andar nahi).
  {
    kind: "mine", key: "mybooks", name: "Meri books", icon: "✍️",
    index: async () => null,
    listOf: () => getUserBooks()
      .filter((b) => !shelfBook(b.id))
      .flatMap((b) => getUserTopics(b.id).map((t) => ({
        slug: t.id,
        label: `${b.icon || "📘"} ${b.name} · ${t.name}`,
        count: getUserTopicQuestions(t.id).length,
        subject: b.subject || "gs",
      }))),
    resumeKey: (slug) => `gk:${slug}`,
    jobs: async (slug, item) => getUserTopicQuestions(slug)
      .map((q) => textJob(q, (item && item.subject) || "gs")),
  },
  // 📖 Answers ke screenshot — jinka abhi koi Gemini answer nahi hai.
  {
    kind: "answers", key: "answers", name: "Answers (screenshot)", icon: "📖",
    index: async () => null,
    listOf: () => WB_SUBJECTS.map((s) => ({ slug: s.key, label: `${s.icon} ${s.label}`, icon: s.icon })),
    resumeKey: (slug) => `answers:all:${slug}:all`,
    jobs: async (slug) => {
      // Kram bilkul wahi jo Answers board par hai: record ka apna waqt, ya
      // "Ho gaya" ka waqt — jo baad ka ho (components/AnswersBoard ka
      // sortAt). Warna run ka pehla question board ke pehle se milta hi
      // nahi tha.
      const done = getDoneMap();
      const qnum = (r) => {
        const m = /^q(\d+)$/.exec(r.qid || "");
        return m ? Number(m[1]) : 0;
      };
      const sortAt = (r) => {
        const a = String(r.at || "");
        const d = done[r.id] || "";
        return d > a ? d : a;
      };
      return getWrongBook()
        .filter((r) => r.subject === slug)
        .sort((a, b) => (sortAt(a) === sortAt(b) ? qnum(a) - qnum(b) : (sortAt(a) < sortAt(b) ? -1 : 1)))
        .map((r) => ({
        id: r.id,
        dkey: hashStr(`mock:${r.id}`),   // Answers board ki apni pehchaan (uid)
        subject: slug,
        kind: "image",
        title: `${r.qid || r.id}`,
        text: "",
        // Screenshot sirf is browser mein hai (IndexedDB / R2 cache), isliye
        // URL nahi — blob yahan se milta hai.
        imgUrl: "",
        blob: async () => imageBlob((imagesOf(r) || [])[0]),
        done: !!newGeminiAnswer(r),
        save: (answer) => setDetail2(r.id, answer),
      }));
    },
  },
  // 🔤 Vocab — jin words ka matlab abhi nahi hai.
  {
    kind: "vocab", key: "vocab", name: "Vocab", icon: "🔤",
    index: async () => null,
    listOf: () => [{ slug: "all", label: "🔤 Saare words", icon: "🔤" }],
    resumeKey: () => "vocab:all",
    jobs: async () => vocabPool().map((it) => ({
      id: it.id,
      dkey: hashStr(it.id),
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

/** Ek source ki list — bank ke apne chapter, aur tumhare apne jode hue topic. */
export async function loadList(source) {
  if (!source) return [];
  const idx = await source.index();
  const own = source.shelf ? userTopicItems(source.shelf) : [];
  return [...source.listOf(idx || {}), ...own];
}

/**
 * Chuni hui jagah ke agle `limit` question.
 *
 * Kram wahi jo us page par hai: drill ne jo qataar bachayi hai (cgl.pyqdrill)
 * wahi, aur Answers par board ka apna kram. Us kram ka pehla question wahi
 * hai jo page kholne par saamne aata hai — isliye run ka Question 1 bhi
 * wahi hota hai, aur agli baar wahin se aage.
 *
 * Kuch chhoda NAHI jata, chahe us question par pehle se jawab ho: owner ka
 * niyam — run se bana jawab hi rakhna hai, wo purane ke upar likh jata hai.
 */
export async function loadJobs(source, slug, limit, item) {
  // Bank ki shelf par tumhara apna joda hua topic — uske question bank ke
  // loader ke paas nahi, tumhare apne store mein hain.
  const all = isUserTopicId(slug)
    ? getUserTopicQuestions(slug).map((q) => textJob(q, (item && item.subject) || source.subject || "gs"))
    : await source.jobs(slug, item);
  const saved = source.resumeKey ? getOrder(source.resumeKey(slug), all.length) : null;
  let ordered = all;
  if (saved && saved.length) {
    const pos = new Map();
    saved.forEach((e, idx) => {
      const key = typeof e === "number" ? (all[e] || {}).dkey : e;
      if (key != null && !pos.has(key)) pos.set(key, idx);
    });
    // Jo qataar mein nahi mila (naya question) wo aakhir mein.
    ordered = [...all].sort((a, b) => (pos.has(a.dkey) ? pos.get(a.dkey) : 1e9)
      - (pos.has(b.dkey) ? pos.get(b.dkey) : 1e9));
  }
  return { total: all.length, pending: ordered.length, jobs: ordered.slice(0, limit) };
}
