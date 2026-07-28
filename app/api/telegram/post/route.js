// GET /api/telegram/post?secret=TG_CRON_SECRET
//
// Picks a batch of fresh MCQs (vocab + English PYQ + GS PYQ) and sends each as a
// Telegram QUIZ poll to your private group. Saves poll_id -> question in the
// `tg:polls` row and remembers what was sent in `tg:state` so nothing repeats
// until the pool recycles. Call it from Vercel Cron or any scheduler.
//
// Read-only on your data: banks are fetched from /public, vocab is read from
// your synced blob. Nothing is deleted or overwritten anywhere.

import { NextResponse } from "next/server";
import { TG, tgConfigured, supaGet, supaPut, readVocabOws, tgApi } from "@/lib/tgserver";
import { normalizeBankQ, pollable, toQuizPoll, buildVocabPoll, stdKey } from "@/lib/tgquiz";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SENT_TTL_DAYS = 45; // after this, a question may be shown again
const POLL_CAP = 800;     // keep the newest N poll mappings

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function pickN(arr, n) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

async function jget(origin, path) {
  const r = await fetch(origin + path, { cache: "no-store" });
  if (!r.ok) return null;
  return r.json().catch(() => null);
}

// Gather up to `want` pollable, not-recently-sent MCQs for a bank subject.
async function gatherBank(origin, { indexPath, listKey, subjectFilter, subject }, want, sentSet) {
  if (want <= 0) return [];
  const idx = await jget(origin, indexPath);
  let entries = (idx && idx[listKey]) || [];
  if (subjectFilter) entries = entries.filter(subjectFilter);
  const out = [];
  // Shuffle chapters, pull from a few until we have enough candidates.
  for (const ch of pickN(entries, entries.length)) {
    if (out.length >= want) break;
    const data = await jget(origin, `${indexPath.replace("/index.json", "")}/${ch.slug}.json`);
    const raw = Array.isArray(data) ? data : (data && data.questions) || [];
    const cands = [];
    for (const q of raw) {
      if (q.passageId || q.passage) continue; // passage-based -> skip
      const nq = normalizeBankQ(q);
      if (!pollable(nq)) continue;
      if (sentSet.has(stdKey(subject, nq))) continue;
      cands.push({ nq, label: ch.label || ch.chapter || "" });
    }
    for (const c of pickN(cands, want - out.length)) {
      out.push(toQuizPoll({ subject, q: c.nq, label: c.label }));
    }
  }
  return out;
}

async function gatherVocab(want, sentSet) {
  if (want <= 0) return [];
  const ows = await readVocabOws();
  const pool = ows.filter((it) => it && it.word && String(it.def || "").trim());
  if (pool.length < 2) return [];
  const out = [];
  for (const item of pickN(pool, pool.length)) {
    if (out.length >= want) break;
    if (sentSet.has("vocab:" + String(item.word).toLowerCase().trim())) continue;
    const built = buildVocabPoll(item, pool);
    if (built) out.push(built);
  }
  return out;
}

export async function GET(req) {
  const origin = new URL(req.url).origin;
  const secret = new URL(req.url).searchParams.get("secret") || "";

  // Authorize either via Vercel Cron (Authorization: Bearer CRON_SECRET) or a
  // ?secret= that matches TG_CRON_SECRET. If neither secret is configured, open
  // (useful while testing). Set at least one before going live.
  const authHeader = req.headers.get("authorization") || "";
  const vercelCron = process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const authed =
    vercelCron ||
    (TG.cronSecret && secret === TG.cronSecret) ||
    (!TG.cronSecret && !process.env.CRON_SECRET);
  if (!authed) {
    return NextResponse.json({ ok: false, error: "bad secret" }, { status: 401 });
  }
  if (!tgConfigured()) {
    return NextResponse.json({ ok: false, error: "Telegram/Supabase env not set" }, { status: 500 });
  }

  // What was already sent (prune stale so the pool recycles).
  const state = (await supaGet("tg:state").catch(() => null)) || { sentKeys: {} };
  const sentKeys = state.sentKeys || {};
  const cutoff = Date.now() - SENT_TTL_DAYS * 86400000;
  for (const [k, at] of Object.entries(sentKeys)) {
    if (new Date(at).getTime() < cutoff) delete sentKeys[k];
  }
  const sentSet = new Set(Object.keys(sentKeys));

  // Split the batch across the configured subjects.
  const subs = TG.subjects;
  const per = Math.max(1, Math.floor(TG.postCount / subs.length));
  const wants = {};
  subs.forEach((s, i) => { wants[s] = per + (i === 0 ? TG.postCount - per * subs.length : 0); });

  let built = [];
  if (subs.includes("vocab")) built.push(...await gatherVocab(wants.vocab || 0, sentSet).catch(() => []));
  if (subs.includes("english")) built.push(...await gatherBank(origin, {
    indexPath: "/engbank/index.json", listKey: "chapters", subject: "english",
  }, wants.english || 0, sentSet).catch(() => []));
  if (subs.includes("gs")) built.push(...await gatherBank(origin, {
    indexPath: "/gkbank/index.json", listKey: "topics",
    subjectFilter: (t) => t.subject === "gs", subject: "gs",
  }, wants.gs || 0, sentSet).catch(() => []));

  built = pickN(built, TG.postCount); // interleave subjects, cap to batch size

  // Send each as a quiz poll; record poll_id -> question.
  const pollsRow = (await supaGet("tg:polls").catch(() => null)) || { polls: {} };
  const polls = pollsRow.polls || {};
  const nowIso = new Date().toISOString();
  let sent = 0;
  const errors = [];
  for (const b of built) {
    try {
      const msg = await tgApi("sendPoll", { chat_id: TG.chatId, ...b.poll });
      const pollId = msg && msg.poll && msg.poll.id;
      if (pollId) {
        polls[pollId] = { ...b.record, at: nowIso };
        sentKeys[b.record.key] = nowIso;
        sent += 1;
      }
      await sleep(350); // stay under Telegram's per-chat flood limit
    } catch (e) {
      errors.push(String(e.message || e).slice(0, 120));
    }
  }

  // Cap poll history to the newest POLL_CAP entries.
  const ids = Object.keys(polls).sort((a, z) => String(polls[z].at).localeCompare(String(polls[a].at)));
  const trimmed = {};
  for (const id of ids.slice(0, POLL_CAP)) trimmed[id] = polls[id];

  await supaPut("tg:polls", { polls: trimmed }).catch((e) => errors.push("polls save: " + e.message));
  await supaPut("tg:state", { sentKeys, lastPostAt: nowIso }).catch((e) => errors.push("state save: " + e.message));

  return NextResponse.json({ ok: true, sent, tried: built.length, errors });
}
