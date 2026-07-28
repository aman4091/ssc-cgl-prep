// GET /api/telegram/post?secret=TG_CRON_SECRET
//
// Ek batch (TG_BATCH, default 100) mixed quiz polls bhejta hai — same engine jo
// "/start" command use karta (lib/tgbatch). Vercel Cron ya koi bhi scheduler,
// ya browser mein manually hit karke test karo. Read-only on your data.

import { NextResponse } from "next/server";
import { TG, tgConfigured } from "@/lib/tgserver";
import { runBatch } from "@/lib/tgbatch";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req) {
  const url = new URL(req.url);
  const origin = url.origin;
  const secret = url.searchParams.get("secret") || "";
  const count = Math.max(1, Math.min(200, Number(url.searchParams.get("count") || TG.batch)));

  // Auth: Vercel Cron (Authorization: Bearer CRON_SECRET) or ?secret=TG_CRON_SECRET.
  // If neither secret is configured, open (handy while testing).
  const authHeader = req.headers.get("authorization") || "";
  const vercelCron = process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const authed =
    vercelCron ||
    (TG.cronSecret && secret === TG.cronSecret) ||
    (!TG.cronSecret && !process.env.CRON_SECRET);
  if (!authed) return NextResponse.json({ ok: false, error: "bad secret" }, { status: 401 });

  if (!tgConfigured()) {
    return NextResponse.json({ ok: false, error: "Telegram/Supabase env not set" }, { status: 500 });
  }

  const result = await runBatch(origin, count).catch((e) => ({ error: String(e.message || e) }));
  return NextResponse.json({ ok: !result.error, ...result });
}
