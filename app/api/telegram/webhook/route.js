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
import { runBatch, runChapter, runNotesQuiz } from "@/lib/tgbatch";
import { escHtml } from "@/lib/tgquiz";
import {
  rootMenu, tabMenu, sourceMenu, notesBooksMenu, notesTopicsMenu, notesPageView,
} from "@/lib/tgmenu";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const ownerId = process.env.TELEGRAM_USER_ID || ""; // optional: only YOU can trigger/track

// Bare "/start" (or /menu) -> button menu; "/start 30" -> direct mixed batch.
function parseCommand(text) {
  const m = String(text || "").trim().match(/^\/(start|next|quiz|go|menu)(?:@\w+)?(?:\s+(\d+))?/i);
  if (!m) return null;
  const explicit = !!m[2];
  const n = explicit ? Math.max(1, Math.min(200, Number(m[2]))) : TG.batch;
  return { count: n, explicit };
}

// Plain-text fallback: markdown/LaTeX markers halka saaf.
function cleanTg(s) {
  return String(s || "").replace(/\*\*/g, "").replace(/\$\$?/g, "").trim().slice(0, 3800);
}

// Markdown (DeepSeek/bank solution) -> Telegram HTML: **bold** dikhega, headings
// bold, "- " bullets "• " ban jaate. LaTeX $..$ strip (Telegram render nahi karta).
// Raw ko pehle cap karte taaki koi <b> tag beech mein na kate.
function mdToHtml(s) {
  let t = String(s || "").replace(/\$\$?/g, "").slice(0, 3500);
  t = escHtml(t);
  t = t.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");     // **bold**
  t = t.replace(/^#{1,6}\s*(.+)$/gm, "<b>$1</b>");  // ## Heading -> bold
  t = t.replace(/^\s*[-*]\s+/gm, "• ");             // - / * bullet -> •
  return t.trim();
}

// Ek reply bhejo: pehle HTML (bold ke saath), parse fail ho to plain fallback.
async function sendReply(text, replyToId) {
  const base = { chat_id: TG.chatId, reply_to_message_id: replyToId, allow_sending_without_reply: true };
  const res = await tgSend("sendMessage", { ...base, text: mdToHtml(text), parse_mode: "HTML" });
  if (!res.ok) return tgSend("sendMessage", { ...base, text: cleanTg(text) });
  return res;
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
    if (j.answer) return "🧠 **Detailed (DeepSeek)**\n\n" + j.answer; // raw md — sendReply HTML banayega
    return "⚠️ " + (j.error || "DeepSeek jawab nahi de paaya. App Settings mein DeepSeek key hai? (Sync ON?)");
  } catch (e) {
    return "⚠️ " + String(e.message || e);
  }
}

// ---- Inline-menu (callback_query) helpers -----------------------------------

// Show a menu payload {text, reply_markup} by editing the tapped message in
// place. If that message is a photo (came from a notes image page), replace it.
async function editMenu(chatId, messageId, menu) {
  const res = await tgSend("editMessageText", {
    chat_id: chatId, message_id: messageId,
    text: menu.text, parse_mode: "HTML", reply_markup: menu.reply_markup,
    disable_web_page_preview: true,
  });
  if (!res.ok) {
    await tgSend("deleteMessage", { chat_id: chatId, message_id: messageId }).catch(() => {});
    await tgSend("sendMessage", {
      chat_id: chatId, text: menu.text, parse_mode: "HTML",
      reply_markup: menu.reply_markup, disable_web_page_preview: true,
    });
  }
}

// Render one notes page. Text page -> edit message text (+ figure photos);
// image-book page -> replace with a scan photo carrying the nav buttons.
async function showNotesPage(origin, chatId, messageId, slug, tIdx, pIdx) {
  const view = await notesPageView(origin, slug, tIdx, pIdx);
  if (view.kind === "image") {
    await tgSend("deleteMessage", { chat_id: chatId, message_id: messageId }).catch(() => {});
    await tgSend("sendPhoto", {
      chat_id: chatId, photo: view.photo, caption: view.caption,
      parse_mode: "HTML", reply_markup: view.reply_markup,
    });
    return;
  }
  const res = await tgSend("editMessageText", {
    chat_id: chatId, message_id: messageId, text: view.text, parse_mode: "HTML",
    reply_markup: view.reply_markup, disable_web_page_preview: true,
  });
  if (!res.ok) {
    await tgSend("deleteMessage", { chat_id: chatId, message_id: messageId }).catch(() => {});
    await tgSend("sendMessage", {
      chat_id: chatId, text: view.text, parse_mode: "HTML",
      reply_markup: view.reply_markup, disable_web_page_preview: true,
    });
  }
  for (const f of (view.figures || []).slice(0, 3)) {
    await tgSend("sendPhoto", { chat_id: chatId, photo: f }).catch(() => {});
  }
}

// Send a mixed batch in the background + a status line (used by /start N and 🎲).
function sendMixedBatch(origin, count) {
  after(async () => {
    await tgSend("sendMessage", { chat_id: TG.chatId, text: `📤 ${count} quiz bhej raha hoon…` });
    const r = await runBatch(origin, count).catch((e) => ({ sent: 0, errors: [String(e.message || e)] }));
    await tgSend("sendMessage", {
      chat_id: TG.chatId,
      text: r.sent ? `✅ ${r.sent} quiz bhej diye. Aur? /start` : `⚠️ ${(r.errors && r.errors[0]) || "kuch nahi bheja"}`,
    });
  });
}

// Route one button press. `answerCallbackQuery` stops the tap spinner.
async function handleCallback(origin, cq) {
  const data = String(cq.data || "");
  const chatId = cq.message?.chat?.id;
  const messageId = cq.message?.message_id;
  await tgSend("answerCallbackQuery", { callback_query_id: cq.id });
  const [tok, a, b, c] = data.split("|");

  switch (tok) {
    case "noop":
      return;
    case "home":
      return editMenu(chatId, messageId, rootMenu());
    case "b":
      return sendMixedBatch(origin, Math.max(1, Math.min(200, Number(a) || 10)));
    case "t":
      return editMenu(chatId, messageId, await tabMenu(a));
    case "s":
      return editMenu(chatId, messageId, await sourceMenu(origin, a, 0, b || ""));
    case "sp":
      return editMenu(chatId, messageId, await sourceMenu(origin, a, Number(b) || 0, c || ""));
    case "c": {
      const src = a, idx = Number(b) || 0;
      after(async () => {
        await tgSend("sendMessage", { chat_id: TG.chatId, text: "📤 10 questions bhej raha hoon…" });
        const r = await runChapter(origin, src, idx, 10).catch((e) => ({ sent: 0, errors: [String(e.message || e)] }));
        await tgSend("sendMessage", {
          chat_id: TG.chatId,
          text: r.sent ? `✅ ${r.sent} bhej diye.` : `⚠️ ${(r.errors && r.errors[0]) || "kuch nahi bheja"}`,
          reply_markup: { inline_keyboard: [[{ text: "▶️ Aur 10", callback_data: `c|${src}|${idx}` }, { text: "🔙 Menu", callback_data: "home" }]] },
        });
      });
      return;
    }
    case "nb":
      return editMenu(chatId, messageId, notesBooksMenu(0));
    case "nbp":
      return editMenu(chatId, messageId, notesBooksMenu(Number(a) || 0));
    case "nk":
      return editMenu(chatId, messageId, await notesTopicsMenu(origin, a, 0));
    case "ntp":
      return editMenu(chatId, messageId, await notesTopicsMenu(origin, a, Number(b) || 0));
    case "nt":
      return showNotesPage(origin, chatId, messageId, a, Number(b) || 0, 0);
    case "np":
      return showNotesPage(origin, chatId, messageId, a, Number(b) || 0, Number(c) || 0);
    case "nq": {
      const slug = a, tIdx = Number(b) || 0, pIdx = Number(c) || 0;
      after(async () => {
        await tgSend("sendMessage", { chat_id: TG.chatId, text: "🧠 Notes se quiz bana raha hoon… (thoda ruko)" });
        const ai = await userAi("gs");
        const r = await runNotesQuiz(origin, slug, tIdx, pIdx, ai, 10).catch((e) => ({ sent: 0, error: String(e.message || e) }));
        await tgSend("sendMessage", {
          chat_id: TG.chatId,
          text: r.sent ? `✅ ${r.sent} quiz bhej diye.` : `⚠️ ${r.error || "quiz nahi bana"}`,
          reply_markup: { inline_keyboard: [[{ text: "🔁 Aur 10", callback_data: `nq|${slug}|${tIdx}|${pIdx}` }, { text: "🔙 Menu", callback_data: "home" }]] },
        });
      });
      return;
    }
    default:
      return;
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

  // ---- 0. inline-menu button press (callback_query) ----
  const cq = update.callback_query;
  if (cq) {
    const fromOwner = !ownerId || String(cq.from?.id || "") === String(ownerId);
    const rightChat = String(cq.message?.chat?.id || "") === String(TG.chatId);
    if (fromOwner && rightChat) {
      await handleCallback(origin, cq).catch(() => {});
    } else {
      await tgSend("answerCallbackQuery", { callback_query_id: cq.id }); // stop spinner
    }
    return NextResponse.json({ ok: true });
  }

  // ---- 1. "/start" -> button menu; "/start 30" -> direct mixed batch ----
  const msg = update.message;
  const cmd = msg && parseCommand(msg.text);
  if (cmd) {
    const fromOwner = !ownerId || String(msg.from?.id || "") === String(ownerId);
    const rightChat = String(msg.chat?.id || "") === String(TG.chatId);
    if (fromOwner && rightChat) {
      if (cmd.explicit) {
        sendMixedBatch(origin, cmd.count); // "/start 30" — background batch + status
      } else {
        const m = rootMenu(); // bare "/start" — open the button menu
        await tgSend("sendMessage", { chat_id: TG.chatId, text: m.text, parse_mode: "HTML", reply_markup: m.reply_markup });
      }
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
              await sendReply(ans, replied.message_id);
            });
          } else {
            const text = rec.solution
              ? `📖 ${rec.solution}`
              : `ℹ️ Iska chhota solution stored nahi. Detailed ke liye is quiz ko reply karke "detail" likho.`;
            await sendReply(text, replied.message_id);
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

    // Miss yahan (Supabase) darj rehti hai — solution reply ke saath. App ka
    // /review tab hata diya gaya, isliye ise abhi koi screen nahi padhti.
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
        `**✅ Sahi:** ${rec.options[rec.answer]}` +
        (rec.solution ? `\n\n📖 ${rec.solution}` : "");
      await sendReply(body, rec.messageId);
    }
  } catch {
    // never fail the webhook
  }
  return NextResponse.json({ ok: true });
}
