// Telegram batch engine — the shared logic behind "/start" (and the daily cron)
// AND the menu-driven per-chapter / notes quizzes.
//
// Everything flows through `dispatch()`: send an array of records as quiz polls,
// store poll->question (tg:polls) for wrong-tracking, and advance each question's
// spaced-repetition schedule (tg:sched). Selection differs per caller:
//   • runBatch     — MIXED across all sources: DUE re-asks first, then fresh.
//   • runChapter   — one chosen chapter: UNSEEN first, then repeats (priority).
//   • runNotesQuiz — DeepSeek-generated MCQs from one notes page.
//
// All sources are read LIVE (cache:"no-store") — a question added to a bank file,
// a new CA day, or a question you filed in the app (synced blob) auto-appears.
// Reuses the existing `syncs` table (rows tg:sched, tg:polls, tg:nquiz). Additive.

import { TG, supaGet, supaPut, tgSend, readVocabOws, readCustomChapters } from "./tgserver";
import {
  shuffle, normalizeBankQ, pollable, recordFromStd, pollFromRecord, vocabRecord,
} from "./tgquiz";
import { chapterRecords, notesPageText } from "./tgmenu";

const POLL_CAP = 1200;                 // tg:polls history cap (for wrong-tracking)
const GAPS = [1, 3, 7, 15, 30, 45];    // din: seen-th exposure ke baad agli due-gap
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const dayIndex = () => Math.floor(Date.now() / 86400000); // UTC day number

function nextDueAfter(seen, today) {
  return today + GAPS[Math.min(GAPS.length - 1, Math.max(0, seen - 1))];
}

async function jget(origin, path) {
  const r = await fetch(origin + path, { cache: "no-store" });
  if (!r.ok) return null;
  return r.json().catch(() => null);
}

// English/GS bank sources for the MIXED pool. WAR ke saare subjects GS; GK sirf
// subject==="gs". CA months + recent DAYS (naya daily auto-shamil).
const BANKS = [
  { indexPath: "/engbank/index.json", list: "chapters", subject: "english", path: (c) => `/engbank/${c.slug}.json`, label: (c) => c.label },
  { indexPath: "/errorprobank/index.json", list: "chapters", subject: "english", path: (c) => `/errorprobank/${c.slug}.json`, label: (c) => c.label },
  { indexPath: "/gkbank/index.json", list: "topics", subject: "gs", filter: (t) => t.subject === "gs", path: (c) => `/gkbank/${c.slug}.json`, label: (c) => c.label },
  { indexPath: "/warbank/index.json", list: "subjects", subject: "gs", path: (c) => `/warbank/${c.slug}.json`, label: (c) => c.label },
  { indexPath: "/cabank/index.json", list: "months", subject: "gs", path: (c) => `/cabank/${encodeURIComponent(c.period)}.json`, label: (c) => c.label || "Current Affairs" },
  { indexPath: "/cabank/index.json", list: "days", subject: "gs", path: (c) => `/cabank/${encodeURIComponent(c.period)}.json`, label: (c) => c.label || "Current Affairs" },
];

async function bankFresh(origin, bank, limit, excl) {
  const idx = await jget(origin, bank.indexPath);
  let entries = (idx && idx[bank.list]) || [];
  if (bank.filter) entries = entries.filter(bank.filter);
  const out = [];
  for (const e of shuffle(entries)) {
    if (out.length >= limit) break;
    const data = await jget(origin, bank.path(e));
    const raw = Array.isArray(data) ? data : (data && data.questions) || [];
    for (const q of shuffle(raw)) {
      if (out.length >= limit) break;
      if (q.passageId || q.passage) continue;
      const nq = normalizeBankQ(q);
      if (!pollable(nq)) continue;
      const rec = recordFromStd({ subject: bank.subject, q: nq, label: bank.label(e) });
      if (excl.has(rec.key)) continue;
      out.push(rec);
    }
  }
  return out;
}

async function vocabFresh(limit, excl) {
  const ows = await readVocabOws();
  const pool = ows.filter((it) => it && it.word && String(it.def || "").trim());
  if (pool.length < 2) return [];
  const out = [];
  for (const item of shuffle(pool)) {
    if (out.length >= limit) break;
    const rec = vocabRecord(item, pool);
    if (rec && !excl.has(rec.key)) out.push(rec);
  }
  return out;
}

// Your app-added questions ("📁 Save to a chapter", synced blob) into the pool.
async function mineFresh(limit, excl) {
  const { chapters, questions } = await readCustomChapters();
  const out = [];
  for (const ch of shuffle(chapters)) {
    if (out.length >= limit) break;
    const subj = ch.subject === "english" ? "english" : "gs";
    for (const q of shuffle(questions[ch.id] || [])) {
      if (out.length >= limit) break;
      if (q && (q.passageId || q.passage)) continue;
      const nq = normalizeBankQ(q);
      if (!pollable(nq)) continue;
      const rec = recordFromStd({ subject: subj, q: nq, label: `✍️ ${ch.name || ""}`.trim() });
      if (!excl.has(rec.key)) out.push(rec);
    }
  }
  return out;
}

// Gather up to `need` FRESH records, mixed across sources (round-robin merge).
async function gatherFresh(origin, need, excl) {
  if (need <= 0) return [];
  const per = Math.ceil(need / (BANKS.length + 2)) + 2; // +vocab +mine; small over-grab
  const buckets = await Promise.all([
    vocabFresh(per, excl),
    mineFresh(per, excl).catch(() => []),
    ...BANKS.map((b) => bankFresh(origin, b, per, excl).catch(() => [])),
  ]);
  const out = [];
  const used = new Set();
  let progress = true;
  while (out.length < need && progress) {
    progress = false;
    for (const b of buckets) {
      if (out.length >= need) break;
      const rec = b.shift();
      if (!rec) continue;
      progress = true;
      if (used.has(rec.key) || excl.has(rec.key)) continue;
      used.add(rec.key);
      out.push(rec);
    }
  }
  return out;
}

// ---- The shared sender -------------------------------------------------------
// Send records as quiz polls; store tg:polls (wrong-tracking) + advance tg:sched
// (spaced repetition). Flood-safe (gap + retry_after backoff). Returns counts.
export async function dispatch(origin, records) {
  const today = dayIndex();
  const schedRow = (await supaGet("tg:sched").catch(() => null)) || { items: {} };
  const items = schedRow.items || {};
  const pollsRow = (await supaGet("tg:polls").catch(() => null)) || { polls: {} };
  const polls = pollsRow.polls || {};
  const nowIso = new Date().toISOString();

  let sent = 0;
  const errors = [];
  for (const rec of records) {
    let res = await tgSend("sendPoll", { chat_id: TG.chatId, ...pollFromRecord(rec) });
    if (!res.ok && res.parameters && res.parameters.retry_after) {
      await sleep((res.parameters.retry_after + 1) * 1000);
      res = await tgSend("sendPoll", { chat_id: TG.chatId, ...pollFromRecord(rec) });
    }
    if (res.ok && res.result && res.result.poll) {
      const pollId = res.result.poll.id;
      // messageId store karte hain taaki galat answer par uski FULL solution us
      // hi poll ke REPLY mein bhej saken (threaded, disconnected nahi).
      polls[pollId] = { ...rec, at: nowIso, messageId: res.result.message_id };
      const prev = items[rec.key];
      const seen = (prev?.seen || 0) + 1;
      items[rec.key] = {
        subject: rec.subject, question: rec.question, options: rec.options,
        answer: rec.answer, solution: rec.solution,
        seen, lastDay: today, nextDue: nextDueAfter(seen, today),
      };
      sent += 1;
    } else if (res.description) {
      errors.push(String(res.description).slice(0, 120));
    }
    await sleep(TG.pollGapMs);
  }

  // Cap tg:polls to newest POLL_CAP.
  const ids = Object.keys(polls).sort((a, z) => String(polls[z].at).localeCompare(String(polls[a].at)));
  const trimmed = {};
  for (const id of ids.slice(0, POLL_CAP)) trimmed[id] = polls[id];

  await supaPut("tg:polls", { polls: trimmed }).catch((e) => errors.push("polls save: " + e.message));
  await supaPut("tg:sched", { items }).catch((e) => errors.push("sched save: " + e.message));

  return { sent, tried: records.length, errors };
}

// ---- MIXED batch (/start) ----------------------------------------------------
export async function runBatch(origin, count) {
  const today = dayIndex();

  const schedRow = (await supaGet("tg:sched").catch(() => null)) || { items: {} };
  const items = schedRow.items || {};

  // DUE first: spaced re-asks whose day has come, most-overdue first, once/day.
  const due = Object.values(items)
    .filter((it) => (it.nextDue ?? 0) <= today && it.lastDay !== today)
    .sort((a, z) => (a.nextDue ?? 0) - (z.nextDue ?? 0))
    .slice(0, count);

  // Fill the rest with fresh questions never scheduled before.
  const excl = new Set(Object.keys(items));
  const fresh = due.length < count
    ? await gatherFresh(origin, count - due.length, excl).catch(() => [])
    : [];

  const batch = shuffle([...due, ...fresh]).slice(0, count);
  return dispatch(origin, batch);
}

// ---- One chosen CHAPTER (menu) ----------------------------------------------
// Priority: pehle UNSEEN (jo kabhi nahi bheje), fir REPEATS (most-overdue first),
// once/day. Har question tracked (tg:polls/tg:sched) — galat answer /review me.
export async function runChapter(origin, srcKey, idx, count = 10) {
  const today = dayIndex();
  const records = await chapterRecords(origin, srcKey, idx).catch(() => []);
  if (!records.length) return { sent: 0, tried: 0, errors: ["is chapter me quiz-worthy question nahi mila."] };

  const schedRow = (await supaGet("tg:sched").catch(() => null)) || { items: {} };
  const items = schedRow.items || {};

  const unseen = shuffle(records.filter((r) => !items[r.key]));
  const seen = records
    .filter((r) => items[r.key] && items[r.key].lastDay !== today)
    .sort((a, z) => (items[a.key].nextDue - items[z.key].nextDue) || (items[a.key].lastDay - items[z.key].lastDay));

  const batch = [...unseen, ...seen].slice(0, count);
  if (!batch.length) return { sent: 0, tried: 0, errors: ["is chapter ke saare aaj ho chuke — kal aana."] };
  return dispatch(origin, batch);
}

// ---- Notes-page MCQ (menu 📝) ------------------------------------------------
const normStem = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim().slice(0, 90);

async function callNotesQuiz(origin, text, n, exclude, temperature, ai) {
  try {
    const res = await fetch(origin + "/api/notes-quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text, count: n, exclude, temperature,
        apiKey: ai.apiKey, model: ai.model, baseUrl: ai.baseUrl,
      }),
    });
    const j = await res.json().catch(() => ({}));
    if (j.error && !Array.isArray(j.questions)) return { questions: [], error: j.error };
    return { questions: Array.isArray(j.questions) ? j.questions : [] };
  } catch (e) {
    return { questions: [], error: String(e.message || e) };
  }
}

// Generate `count` fresh MCQs from ONE notes page via DeepSeek (site's /api/notes
// -quiz, ≤10/call) and send them as tracked quiz polls. Cross-press dedup via a
// tg:nquiz row keyed by page. `ai` = { apiKey, model, baseUrl } from your Settings.
export async function runNotesQuiz(origin, slug, tIdx, pIdx, ai, count = 10) {
  const { text, topic, subject } = await notesPageText(origin, slug, tIdx, pIdx);
  if (!text || text.trim().length < 30) return { sent: 0, error: "is page par quiz ke liye kaafi text nahi." };
  if (!ai || !ai.apiKey) return { sent: 0, error: "DeepSeek key nahi mili — app Settings me key daalo + Sync ON." };

  const key = `${slug}#${tIdx}#${pIdx}`;
  const askRow = (await supaGet("tg:nquiz").catch(() => null)) || { asked: {} };
  const asked = askRow.asked || {};
  const prevStems = asked[key] || [];

  const collected = [];
  const stems = new Set(prevStems.map(normStem));
  let dry = 0;
  let lastErr = "";
  for (let round = 0; round < 8 && collected.length < count; round++) {
    const need = count - collected.length;
    const temp = Math.min(1.0, 0.55 + 0.12 * dry);
    const exclude = [...prevStems, ...collected.map((q) => q.question)];
    const { questions, error } = await callNotesQuiz(origin, text, Math.min(10, need), exclude, temp, ai);
    if (error) lastErr = error;
    let added = 0;
    for (const q of questions) {
      const s = normStem(q.question);
      if (!s || stems.has(s)) continue;
      stems.add(s);
      collected.push(q);
      added += 1;
      if (collected.length >= count) break;
    }
    if (added === 0) { dry += 1; if (dry >= 2) break; } else dry = 0;
  }

  if (!collected.length) return { sent: 0, error: lastErr || "quiz generate nahi hua, dobara try karo." };

  const subj = subject === "english" ? "english" : "gs";
  const records = [];
  for (const q of collected) {
    const nq = normalizeBankQ(q);
    if (!pollable(nq)) continue;
    records.push(recordFromStd({ subject: subj, q: nq, label: `📝 ${topic}`.trim() }));
  }
  if (!records.length) return { sent: 0, error: "banaye gaye questions poll-worthy nahi the." };

  const res = await dispatch(origin, records);

  asked[key] = [...prevStems, ...collected.map((q) => q.question)].slice(-160);
  await supaPut("tg:nquiz", { asked }).catch(() => {});
  return res;
}
