// Notes ke ek page ka saada text — ✨ Gemini, 🧩 jodi (NotesPairsBtn) sab
// yahi bhejte hain.
// Plain text of a page's blocks — what the ✨ Gemini button sends. Strips the
// transcription markup (**bold**, __underline__, [?…] unsure marks) to words.
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
export function pageText(p) {
  return (p.blocks || []).map(blockText).filter(Boolean).join("\n");
}
