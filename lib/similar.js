// 🎯 20 similar — ek question se usi type ke naye questions bana kar ek quiz.
//
// 20 ek hi shot mein maangna kaam nahi karta: model load mein tootne lagta hai
// aur kachra options deta hai (maths mein sabse bura). Isliye pehle chhota batch
// banao, use kholo, aur baaki background mein jodte raho. Yahi tarika
// MathQuestionCard aur quiz player pehle se use karte hain — ab solve page ko
// bhi chahiye tha, to wo soch yahan ek jagah aa gayi.

import { generateSimilar } from "./client-ai";
import { saveQuiz, getQuiz, makeId } from "./storage";

export const SIMILAR_TARGET = 20;
const SIMILAR_BATCH = 5;

function dispatchAppend(id, count, done) {
  try { window.dispatchEvent(new CustomEvent("cgl:quiz-appended", { detail: { id, count, done } })); }
  catch { /* SSR / no window */ }
}

// Background top-up — jaan-boojh kar kisi component ke state se nahi bandha, to
// wo unmount ho jaye (jaise solve page se aage nikal jao) tab bhi chalta rehta hai.
async function streamSimilar(sample, subject, quizId) {
  for (;;) {
    const before = getQuiz(quizId);
    if (!before) return; // quiz delete ho gaya — ruk jao
    if (before.questions.length >= SIMILAR_TARGET) break;

    let qs = [];
    try {
      const b = await generateSimilar(sample, Math.min(SIMILAR_BATCH, SIMILAR_TARGET - before.questions.length), subject);
      qs = (b && b.questions) || [];
    } catch { qs = []; }

    const quiz = getQuiz(quizId);
    if (!quiz) return;
    if (qs.length) quiz.questions = [...quiz.questions, ...qs];
    const finished = !qs.length || quiz.questions.length >= SIMILAR_TARGET;
    quiz.streaming = !finished;
    saveQuiz(quiz);
    dispatchAppend(quizId, quiz.questions.length, finished);
    if (finished) return;
  }
  const quiz = getQuiz(quizId);
  if (quiz && quiz.streaming) {
    quiz.streaming = false;
    saveQuiz(quiz);
    dispatchAppend(quizId, quiz.questions.length, true);
  }
}

// Lossy text extraction ka kachra — adhoore math glyph (lone surrogate),
// zero-width spaces, aur chhape hue "(a)" option letters. Ye seedha bhej dein to
// generator bhatak jata hai.
const cleanText = (s) =>
  String(s || "")
    .replace(/[\uD800-\uDFFF]/g, "")
    .replace(/[​-‏⁠-⁤﻿]/g, "")
    .replace(/\s+/g, " ")
    .trim();
const cleanOpt = (s) => cleanText(s).replace(/^\(?[a-dA-D]\)\s*/, "");

// Pehla batch banao aur quiz ka id lauta do; baaki background mein bharta rahega.
// -> quizId
export async function makeSimilarQuiz({ question, options }, subject, title) {
  const sample = { question: cleanText(question), options: (options || []).map(cleanOpt).filter(Boolean) };
  if (!sample.question) throw new Error("Is question ka text nahi hai — pehle ✨ Gemini/OCR chala lo.");

  const first = await generateSimilar(sample, SIMILAR_BATCH, subject);
  const questions = (first && first.questions) || [];
  if (!questions.length) throw new Error("Similar questions nahi ban paye — dobara try karo.");

  const quizId = makeId();
  const done = questions.length >= SIMILAR_TARGET;
  saveQuiz({
    id: quizId,
    title: title || first.title || "Similar practice",
    source: "similar",
    createdAt: new Date().toISOString(),
    questions,
    streaming: !done,
  });
  if (!done) streamSimilar(sample, subject, quizId); // fire-and-forget
  return quizId;
}
