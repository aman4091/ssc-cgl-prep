// Small notes helpers shared between the notes reader and the homepage study
// feed. These are lifted verbatim from components/NotesReader.js so both places
// build the SAME ✨ Gemini copy (a page's plain text + the subject prompt).
// (renderBlocks stays in NotesReader — the feed only renders Hinglish Markdown.)

import { getSettings } from "@/lib/storage";

// Strip transcription markup (**bold**, __underline__, [?…] unsure marks) to words.
function stripMd(s) {
  return String(s || "")
    .replace(/^\s*\*\s+/, "")            // leading "* " bullet marker
    .replace(/\*\*([^*]+)\*\*/g, "$1")   // **bold** → text (before single-*)
    .replace(/\*([^*\n]+)\*/g, "$1")     // *italic* → text
    .replace(/\*/g, "")                  // any leftover lone asterisk marker
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\[\?([^\]]*)\]/g, (m, g) => (g ? g + "?" : "?"))
    .replace(/\s+/g, " ")
    .trim();
}

function blockText(b) {
  if (!b) return "";
  if (b.type === "heading" || b.type === "rule" || b.type === "note" || b.type === "hook")
    return stripMd(String(b.text || "").replace(/^#+\s+/, ""));
  if (b.type === "list") return (b.items || []).map((i) => "• " + stripMd(i)).join("\n");
  if (b.type === "example")
    return (b.items || []).map((i) => "• " + stripMd(i.text) + (i.note ? " — " + stripMd(i.note) : "")).join("\n");
  if (b.type === "qr")
    return (b.cells || []).map((c) => stripMd(c.k) + ": " + stripMd(c.v)).join("\n");
  if (b.type === "table") {
    const head = b.headers ? b.headers.map(stripMd).join(" | ") : "";
    const rows = (b.rows || []).map((r) => r.map(stripMd).join(" | ")).join("\n");
    return [head, rows].filter(Boolean).join("\n");
  }
  return "";
}

// Plain text of a page's blocks — what the ✨ Gemini button sends.
export function pageText(p) {
  return (p?.blocks || []).map(blockText).filter(Boolean).join("\n");
}

// Settings holds a prompt per subject plus a generic one; a page must carry its
// subject's instructions. Same precedence the question/notes cards use.
export function promptFor(subject) {
  const st = getSettings();
  const perSubject = String((st.shortcutPrompts || {})[subject] || "").trim();
  return perSubject || String(st.geminiPrompt || "").trim();
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* fall through */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.focus(); ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch { return false; }
}
