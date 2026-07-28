// POST /api/telegram/webhook  — Telegram calls this with every update.
//
// We care about `poll_answer`: when you answer a quiz poll wrong, we look up the
// question in `tg:polls`, append the miss to `tg:wrong` (so the app can pull it
// into your Wrong Book + revision), and post the FULL solution back to the group
// (the inline bulb explanation is capped at 200 chars; this gives you all of it).
//
// Purely additive — it only ever inserts into the tg:wrong row.

import { NextResponse } from "next/server";
import { TG, supaGet, supaPut, tgApi } from "@/lib/tgserver";
import { clamp } from "@/lib/tgquiz";

export const dynamic = "force-dynamic";

const ownerId = process.env.TELEGRAM_USER_ID || ""; // optional: only track YOUR answers

export async function POST(req) {
  // Secret-token header set when the webhook was registered.
  if (TG.webhookSecret) {
    const got = req.headers.get("x-telegram-bot-api-secret-token") || "";
    if (got !== TG.webhookSecret) return NextResponse.json({ ok: false }, { status: 401 });
  }

  const update = await req.json().catch(() => null);
  const pa = update && update.poll_answer;
  if (!pa || !Array.isArray(pa.option_ids)) return NextResponse.json({ ok: true });
  if (pa.option_ids.length === 0) return NextResponse.json({ ok: true }); // vote retracted
  if (ownerId && String(pa.user?.id || "") !== String(ownerId)) return NextResponse.json({ ok: true });

  const pollId = pa.poll_id;
  const chosen = pa.option_ids[0];

  try {
    const pollsRow = (await supaGet("tg:polls")) || { polls: {} };
    const rec = (pollsRow.polls || {})[pollId];
    if (!rec) return NextResponse.json({ ok: true }); // unknown / pruned poll

    if (chosen === rec.answer) return NextResponse.json({ ok: true }); // correct — nothing to do

    // Wrong -> store keyed by poll_id (quiz votes are final, so no dupes).
    const wrongRow = (await supaGet("tg:wrong").catch(() => null)) || { items: {} };
    const items = wrongRow.items || {};
    items[pollId] = {
      pollId,
      subject: rec.subject,
      question: rec.question,
      options: rec.options,
      answer: rec.answer,
      chosen,
      solution: rec.solution || "",
      at: new Date().toISOString(),
    };
    await supaPut("tg:wrong", { items });

    // Post the complete solution so you see the full "why" in Telegram too.
    const correctText = rec.options[rec.answer];
    const yourText = rec.options[chosen];
    const body =
      `❌ Galat\n\n${clamp(rec.question, 300)}\n\n` +
      `Tumne: ${yourText}\n✅ Sahi: ${correctText}` +
      (rec.solution ? `\n\n📖 ${clamp(rec.solution, 3500)}` : "");
    await tgApi("sendMessage", { chat_id: TG.chatId, text: body }).catch(() => {});
  } catch {
    // Never fail the webhook — Telegram would retry and spam.
  }
  return NextResponse.json({ ok: true });
}
