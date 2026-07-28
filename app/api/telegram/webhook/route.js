// POST /api/telegram/webhook  — Telegram har update yahan bhejta hai.
//
// Teen cheezein:
//  1. "/start" (ya /next /quiz /go) -> ek batch (default TG_BATCH) mixed quiz polls.
//     Turant 200 return karke `after()` mein background bhejta (Telegram retry se bacho).
//  2. Kisi quiz ko REPLY karo -> uski explanation: koi bhi text = stored solution;
//     "detail"/"deep" = DeepSeek se detailed (tumhare Settings ke prompt se).
//  3. "poll_answer" -> galat answer tg:wrong mein + full solution us quiz ke reply mein.
//
// Additive only — tumhara data kabhi delete/overwrite nahi hota.

import { NextResponse, after } from "next/server";
import { TG, supaGet, supaPut, tgSend } from "@/lib/tgserver";
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

// Telegram plain-text ke liye markdown/LaTeX markers halka saaf karo.
function cleanTg(s) {
  return String(s || "").replace(/\*\*/g, "").replace(/\$\$?/g, "").trim().slice(0, 3800);
}

// Tumhari app-Settings (synced blob se) — DeepSeek key, model, baseUrl, aur prompt
// sab yahin se. Matlab jo site par set hai wahi Telegram par. Env sirf fallback.
async function userAi(subject) {
  const fallback = {
    customPrompt: "",
    apiKey: process.env.DEEPSEEK_API_KEY || "",
    model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
    baseUrl: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
  };
  try {
    const data = await supaGet(TG.syncCode);
    const ls = (data && data.localStorage) || {};
    const s = ls["cgl.settings"] ? JSON.parse(ls["cgl.settings"]) : {};
    const subj = subject === "vocab" ? "english" : subject;
    const sp = (s.shortcutPrompts || {})[subj];
    return {
      customPrompt: (sp && sp.trim()) || (s.geminiPrompt && s.geminiPrompt.trim()) || "",
      apiKey: (s.apiKey && s.apiKey.trim()) || fallback.apiKey,
      model: (s.model && s.model.trim()) || fallback.model,
      baseUrl: (s.baseUrl && s.baseUrl.trim()) || fallback.baseUrl,
    };
  } catch { return fallback; }
}

// Detailed explanation site ke hi /api/ask se — TUMHARE settings ka prompt + model
// + key (synced blob se). Server-side koi hardcode nahi.
async function deepExplain(origin, rec) {
  const correct = rec.options[rec.answer];
  const question =
    `${rec.question}\n\nOptions:\n` +
    rec.options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join("\n") +
    `\n\nCorrect answer (already verified): ${correct}`;
  const ai = await userAi(rec.subject);
  try {
    const res = await fetch(origin + "/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question, mode: "explain",
        subject: rec.subject === "vocab" ? "english" : rec.subject,
        customPrompt: ai.customPrompt, apiKey: ai.apiKey, model: ai.model, baseUrl: ai.baseUrl,
      }),
    });
    const j = await res.json().catch(() => ({}));
    if (j.answer) return "🧠 Detailed (DeepSeek):\n\n" + cleanTg(j.answer);
    return "⚠️ " + (j.error || "DeepSeek jawab nahi de paaya. App Settings mein DeepSeek key hai? (Sync ON?)");
  } catch (e) {
    return "⚠️ " + String(e.message || e);
  }
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

  // ---- 2. kisi quiz ko REPLY karo -> uski explanation ----
  //   • koi bhi text (jaise "?")     -> quick stored solution
  //   • "detail" / "deep" / "ai"/"??"-> DeepSeek se detailed (settings prompt se)
  const replied = msg && msg.reply_to_message;
  if (replied) {
    const fromOwner = !ownerId || String(msg.from?.id || "") === String(ownerId);
    const rightChat = String(msg.chat?.id || "") === String(TG.chatId);
    if (fromOwner && rightChat) {
      try {
        const pollsRow = (await supaGet("tg:polls")) || { polls: {} };
        const polls = pollsRow.polls || {};
        let rec = replied.poll && replied.poll.id ? polls[replied.poll.id] : null;
        if (!rec) rec = Object.values(polls).find((r) => r.messageId === replied.message_id);
        if (rec) {
          const t = String(msg.text || "").trim().toLowerCase();
          const wantsDeep = /^(\/?detail|deep|\bai\b|\?\?)/.test(t);
          if (wantsDeep) {
            after(async () => {
              await tgSend("sendChatAction", { chat_id: TG.chatId, action: "typing" });
              const ans = await deepExplain(origin, rec);
              await tgSend("sendMessage", {
                chat_id: TG.chatId, text: ans,
                reply_to_message_id: replied.message_id, allow_sending_without_reply: true,
              });
            });
          } else {
            const text = rec.solution
              ? `📖 ${cleanTg(rec.solution)}`
              : `ℹ️ Iska chhota solution stored nahi. Detailed ke liye is quiz ko reply karke "detail" likho.`;
            await tgSend("sendMessage", {
              chat_id: TG.chatId, text,
              reply_to_message_id: replied.message_id, allow_sending_without_reply: true,
            });
          }
        }
      } catch { /* ignore */ }
    }
    return NextResponse.json({ ok: true });
  }

  // ---- 3. quiz answer ----
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

    // Track the miss (app /review Telegram tab + revision).
    const wrongRow = (await supaGet("tg:wrong").catch(() => null)) || { items: {} };
    const items = wrongRow.items || {};
    items[pollId] = {
      pollId, subject: rec.subject, question: rec.question, options: rec.options,
      answer: rec.answer, chosen, solution: rec.solution || "", at: new Date().toISOString(),
    };
    await supaPut("tg:wrong", { items });

    // Full solution us hi question ke REPLY mein (poll ki 200-char limit se aage).
    // Reply hone se message question se juda rehta — tap karke upar jump kar sakte.
    if (rec.messageId) {
      const body =
        `✅ Sahi: ${rec.options[rec.answer]}` +
        (rec.solution ? `\n\n📖 ${clamp(rec.solution, 3500)}` : "");
      await tgSend("sendMessage", {
        chat_id: TG.chatId, text: body,
        reply_to_message_id: rec.messageId, allow_sending_without_reply: true,
      });
    }
  } catch {
    // never fail the webhook
  }
  return NextResponse.json({ ok: true });
}
