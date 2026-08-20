// Tasveer wale bank (Maths / Reasoning) ka "notebook wala roop".
//
// Un banks mein sawaal aur option TASVEER hain; Mistake Notebook aur stats
// text se pehchante hain (lib/qstats ka keyFor = sawaal ka text + sahi option
// ka text). Isliye card ek text-roop banata hai aur usi se record chhodta hai.
//
// Ye roop teen jagah chahiye: MathQuestionCard, ReasonQuestionCard, aur stylus
// wala parda (/wrong/solve). Pehle wo card ke andar hi bana hua tha, isliye
// stylus se wahi question DOOSRI pehchaan ke saath notebook mein chala jata
// tha — ek hi question do baar. Ab formula ek hi jagah hai.
//
// Formula bilkul wahi rakha gaya hai jo pehle card mein tha. Badla to purane
// record ki pehchaan badal jayegi aur notebook/stats sab anaath ho jayenge.

export function mathTq(q) {
  return {
    ...q,
    question: ("[" + q.id + "] " + (q.qText || "")).trim(),
    options: q.optText && q.optText.length === 4 ? q.optText : ["a", "b", "c", "d"],
  };
}

export function reasonTq(q) {
  const hasOptText = Array.isArray(q.optText) && q.optText.filter(Boolean).length === 4;
  return {
    ...q,
    question: ("[" + q.id + "] " + (q.instruction ? q.instruction + " " : "") + (q.qText || "")).trim(),
    options: hasOptText ? q.optText : ["a", "b", "c", "d"],
  };
}

// Text wala bank ho to question jaisa hai waisa hi. `kind` = "reason" ya
// "math" — "All" wali list har question par `_card` rakhti hai, warna subject
// se aata hai.
export function notebookQ(q, kind) {
  if (!q || !q.qImg) return q;
  return kind === "reason" || kind === "reasoning" ? reasonTq(q) : mathTq(q);
}
