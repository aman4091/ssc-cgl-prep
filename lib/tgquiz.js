// Telegram quiz-poll helpers — SERVER-SAFE (no window / localStorage).
//
// Sab kuch ek "record" ke around ghoomta hai:
//   { subject, key, question, options[], answer, solution }
// Fresh questions banks/vocab se record ban'te hain; spaced re-asks sched se
// wahi record wapas aata hai. `pollFromRecord` isse Telegram sendPoll (quiz)
// payload mein badalta. Yahan se kuch delete/mutate nahi hota.

export const TG_LIMITS = {
  question: 300, // poll question 1..300
  option: 100,   // option 1..100
  options: 10,   // 2..10 options
  explanation: 200, // bulb explanation 0..200
};

export function clamp(s, n) {
  const t = String(s == null ? "" : s).replace(/\s+/g, " ").trim();
  if (t.length <= n) return t;
  return t.slice(0, Math.max(0, n - 1)).trimEnd() + "…";
}

// HTML-escape for Telegram parse_mode:"HTML". Shared by the webhook + menu module.
export function escHtml(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Stable "already sent" identity. Uses bank id when present, else subject+question.
export function stdKey(subject, q) {
  if (q && q.id) return `${subject}:${q.id}`;
  const norm = String(q?.question || "").toLowerCase().replace(/\s+/g, " ").trim().slice(0, 120);
  return `${subject}:${norm}`;
}

// Bank question -> normalized MCQ. The answer/solution field name differs per bank:
// engbank/errorpro use `solution`, gkbank/warbank use `explanation`, cabank `detail`.
export function normalizeBankQ(q) {
  return {
    id: q.id || "",
    question: q.question || "",
    options: Array.isArray(q.options) ? q.options : [],
    answer: Number.isInteger(q.answer) ? q.answer : -1,
    solution: q.solution || q.explanation || q.detail || "",
  };
}

// Can this MCQ become a quiz poll?
export function pollable(q) {
  const opts = (q.options || []).map((o) => String(o || "").trim()).filter(Boolean);
  if (opts.length < 2 || opts.length > TG_LIMITS.options) return false;
  if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= (q.options || []).length) return false;
  if (String(q.question || "").trim().length < 1) return false;
  if (q.passageId || q.passage) return false; // passage-based -> too long for a poll
  return true;
}

// Normalized MCQ -> a stored record. `label` (e.g. "Antonyms") prefixes the stem
// so a one-word question isn't ambiguous. Options are clamped to Telegram's 100.
export function recordFromStd({ subject, q, label = "" }) {
  const options = q.options.map((o) => clamp(o, TG_LIMITS.option));
  const stem = label ? `${label} — ${q.question}` : q.question;
  return {
    subject,
    key: stdKey(subject, q),
    question: clamp(stem, TG_LIMITS.question),
    options,
    answer: q.answer,
    solution: String(q.solution || "").trim(),
  };
}

// Stored record -> Telegram sendPoll (quiz) payload. is_anonymous:false is REQUIRED
// so poll_answer updates carry the voter (tracking).
export function pollFromRecord(rec) {
  const correct = rec.options[rec.answer];
  return {
    question: clamp(rec.question, TG_LIMITS.question),
    options: rec.options.map((o) => clamp(o, TG_LIMITS.option)),
    type: "quiz",
    correct_option_id: rec.answer,
    is_anonymous: false,
    explanation: clamp(rec.solution || `Sahi: ${correct}`, TG_LIMITS.explanation),
  };
}

// Inline transcription markup -> Telegram HTML. Escapes first, then **bold**,
// __underline__, and drops the [?guess] uncertainty markers to plain text.
function inlineMd(s) {
  let t = escHtml(s);
  t = t.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
  t = t.replace(/__(.+?)__/g, "<u>$1</u>");
  t = t.replace(/\[\?([^\]]*)\]/g, "$1");
  return t;
}

// Notes text-page `blocks[]` -> { html, figures[] } for Telegram. Renders each
// typed block (heading/list/rule/note/qr/hook/example/table) to a readable HTML
// string (headings bold, rows as "• " lines) and collects `figure.src` image
// URLs separately (sent as photos). Image-book pages have empty blocks -> "".
export function blocksToTelegram(blocks) {
  const figures = [];
  const out = [];
  for (const b of Array.isArray(blocks) ? blocks : []) {
    if (!b || !b.type) continue;
    switch (b.type) {
      case "heading":
      case "section": {
        const txt = String(b.text || "").replace(/^#+\s*/, "").trim();
        if (txt) out.push(`<b>${inlineMd(txt)}</b>`);
        break;
      }
      case "rule":
      case "hook":
      case "note": {
        const txt = String(b.text || "").trim();
        if (txt) out.push(inlineMd(txt));
        break;
      }
      case "list": {
        for (const it of b.items || []) {
          const txt = String(it || "").trim();
          if (txt) out.push(`• ${inlineMd(txt)}`);
        }
        break;
      }
      case "qr": {
        if (b.title) out.push(`<b>${inlineMd(String(b.title))}</b>`);
        for (const c of b.cells || []) {
          if (c && (c.k || c.v)) out.push(`• <b>${inlineMd(String(c.k || ""))}</b> — ${inlineMd(String(c.v || ""))}`);
        }
        break;
      }
      case "example": {
        for (const it of b.items || []) {
          if (!it) continue;
          const n = it.n != null ? `${it.n}. ` : "";
          const note = it.note ? ` (${inlineMd(String(it.note))})` : "";
          out.push(`${n}${inlineMd(String(it.text || ""))}${note}`);
        }
        break;
      }
      case "table": {
        if (Array.isArray(b.headers) && b.headers.length)
          out.push(`<b>${b.headers.map((h) => inlineMd(String(h))).join(" | ")}</b>`);
        for (const row of b.rows || []) {
          if (Array.isArray(row)) out.push(row.map((c) => inlineMd(String(c ?? ""))).join(" | "));
        }
        break;
      }
      case "figure": {
        if (b.src) figures.push(String(b.src));
        if (b.caption) out.push(`🖼️ <i>${inlineMd(String(b.caption))}</i>`);
        break;
      }
      default:
        if (b.text) out.push(inlineMd(String(b.text)));
    }
  }
  return { html: out.join("\n").slice(0, 3500), figures };
}

// Vocab (word -> meaning) record. Correct option = the word's meaning; 3 distractor
// meanings from other words (same type preferred).
export function vocabRecord(item, pool) {
  const def = String(item.def || "").trim();
  if (!def) return null;
  const others = pool.filter(
    (p) => p.word !== item.word && String(p.def || "").trim() && String(p.def).trim() !== def,
  );
  const sameType = others.filter((p) => p.type === item.type);
  const base = sameType.length >= 3 ? sameType : others;
  const distract = shuffle(base).slice(0, 3).map((p) => String(p.def).trim());
  if (distract.length < 1) return null;
  const opts = shuffle([def, ...distract]);
  const q = {
    id: "vocab:" + String(item.word).toLowerCase().trim(),
    question: `Meaning of: ${item.word}`,
    options: opts,
    answer: opts.indexOf(def),
    solution: `${item.word} → ${def}`,
  };
  if (!pollable(q)) return null;
  return recordFromStd({ subject: "vocab", q, label: "🔤 Vocab" });
}
