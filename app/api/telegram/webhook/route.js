// POST /api/telegram/webhook  — Telegram har update yahan bhejta hai.
//
// Do cheezein:
//  1. "/start" (ya "/next", "/quiz", "/go") message  -> ek batch (default TG_BATCH)
//     mixed quiz polls group mein bhejta. Turant 200 return karke `after()` mein
//     background bhejta, taaki Telegram timeout pe retry na kare (double sending).
//  2. "poll_answer" -> galat answer tg:wrong mein + poora solution message.
//
// Additive only — tumhara data kabhi delete/overwrite nahi hota.

import { NextResponse, after } from "next/server";
import { TG, supaGet, supaPut, tgApi, tgSend } from "@/lib/tgserver";
import { runBatch } from "@/lib/tgbatch";
import { clamp } from "@/lib/tgquiz";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const ownerId = process.env.TELEGRAM_USER_ID || ""; // optional: only YOU can trigger/track

function parseCommand(text) {
  const m = String(text || "").trim().match(/^\/(start|next|quiz|go)(?:@\w+)?(?:\s+(\d+))?/i);
  if (!m) return null;
  const n = m[2] ? Math.max(1, Math.min(200, Number(m[2]))) : TG.batch;
  return { count: n };
}

export async function POST(req) {
  if (TG.webhookSecret) {
    const got = req.headers.get("x-telegram-bot-api-secret-token") || "";
    if (got !== TG.webhookSecret) return NextResponse.json({ ok: false }, { status: 401 });
  }

  const origin = new URL(req.url).origin;
  const update = await req.json().catch(() => null);
  if (!update) return NextResponse.json({ ok: true });

  // ---- 1. "/start" style command ----
  const msg = update.message;
  const cmd = msg && parseCommand(msg.text);
  if (cmd) {
    const fromOwner = !ownerId || String(msg.from?.id || "") === String(ownerId);
    const rightChat = String(msg.chat?.id || "") === String(TG.chatId);
    if (fromOwner && rightChat) {
      // Respond now; send the batch after the response so Telegram doesn't retry.
      after(async () => {
        await tgSend("sendMessage", { chat_id: TG.chatId, text: `📤 ${cmd.count} quiz bhej raha hoon…` });
        const r = await runBatch(origin, cmd.count).catch((e) => ({ sent: 0, error: String(e.message || e) }));
        await tgSend("sendMessage", {
          chat_id: TG.chatId,
          text: r.error ? `⚠️ ${r.error}` : `✅ ${r.sent} quiz bhej diye. Aur chahiye? /start dabao.`,
        });
      });
    }
    return NextResponse.json({ ok: true });
  }

  // ---- 2. quiz answer ----
  const pa = update.poll_answer;
  if (!pa || !Array.isArray(pa.option_ids) || pa.option_ids.length === 0) {
    return NextResponse.json({ ok: true });
  }
  if (ownerId && String(pa.user?.id || "") !== String(ownerId)) return NextResponse.json({ ok: true });

  const pollId = pa.poll_id;
  const chosen = pa.option_ids[0];
  try {
    const pollsRow = (await supaGet("tg:polls")) || { polls: {} };
    const rec = (pollsRow.polls || {})[pollId];
    if (!rec) return NextResponse.json({ ok: true });
    if (chosen === rec.answer) return NextResponse.json({ ok: true }); // correct

    const wrongRow = (await supaGet("tg:wrong").catch(() => null)) || { items: {} };
    const items = wrongRow.items || {};
    items[pollId] = {
      pollId, subject: rec.subject, question: rec.question, options: rec.options,
      answer: rec.answer, chosen, solution: rec.solution || "", at: new Date().toISOString(),
    };
    await supaPut("tg:wrong", { items });

    const body =
      `❌ Galat\n\n${clamp(rec.question, 300)}\n\n` +
      `Tumne: ${rec.options[chosen]}\n✅ Sahi: ${rec.options[rec.answer]}` +
      (rec.solution ? `\n\n📖 ${clamp(rec.solution, 3500)}` : "");
    await tgApi("sendMessage", { chat_id: TG.chatId, text: body }).catch(() => {});
  } catch {
    // never fail the webhook
  }
  return NextResponse.json({ ok: true });
}
