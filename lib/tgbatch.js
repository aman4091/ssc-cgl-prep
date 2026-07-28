// Telegram batch engine — the shared logic behind "/start" (and the daily cron).
//
// Ek batch = `count` quiz polls, MIXED across all English/GS/Vocab sources. Har
// bheja gaya question ek server-side spaced-repetition schedule (tg:sched) mein
// jaata hai: kal ek baar, phir 3 din, 7, 15… dobara aata hai jab tak yaad na ho.
// So har "/start" pehle DUE (dobara-dikhne-wale) uthata, phir naye (fresh) se
// bharke `count` poora karta. Sab sends flood-safe (gap + 429 backoff).
//
// Reuses the existing `syncs` table (rows tg:sched, tg:polls). Additive only.

import { TG, supaGet, supaPut, tgSend, readVocabOws } from "./tgserver";
import {
  shuffle, normalizeBankQ, pollable, recordFromStd, pollFromRecord, vocabRecord,
} from "./tgquiz";

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

// English/GS bank sources. WAR ke saare subjects GS hain; GK sirf subject==="gs".
const BANKS = [
  { indexPath: "/engbank/index.json", list: "chapters", subject: "english", path: (c) => `/engbank/${c.slug}.json`, label: (c) => c.label },
  { indexPath: "/errorprobank/index.json", list: "chapters", subject: "english", path: (c) => `/errorprobank/${c.slug}.json`, label: (c) => c.label },
  { indexPath: "/gkbank/index.json", list: "topics", subject: "gs", filter: (t) => t.subject === "gs", path: (c) => `/gkbank/${c.slug}.json`, label: (c) => c.label },
  { indexPath: "/warbank/index.json", list: "subjects", subject: "gs", path: (c) => `/warbank/${c.slug}.json`, label: (c) => c.label },
  { indexPath: "/cabank/index.json", list: "months", subject: "gs", path: (c) => `/cabank/${encodeURIComponent(c.period)}.json`, label: (c) => c.label || "Current Affairs" },
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

// Gather up to `need` FRESH records, mixed across sources (round-robin merge).
async function gatherFresh(origin, need, excl) {
  if (need <= 0) return [];
  const per = Math.ceil(need / (BANKS.length + 1)) + 2; // small over-grab for the merge
  const buckets = await Promise.all([
    vocabFresh(per, excl),
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

// Build one batch and send it. Returns { sent, tried, errors }.
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

  const pollsRow = (await supaGet("tg:polls").catch(() => null)) || { polls: {} };
  const polls = pollsRow.polls || {};
  const nowIso = new Date().toISOString();

  let sent = 0;
  const errors = [];
  for (const rec of batch) {
    let res = await tgSend("sendPoll", { chat_id: TG.chatId, ...pollFromRecord(rec) });
    // Flood control: respect retry_after once.
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

  return { sent, tried: batch.length, errors };
}
