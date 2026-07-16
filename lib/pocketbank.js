// Pocket Rocket — 162 English grammar rules that ship with the app
// (public/pocketbank/rules.json).
//
// The book is written in Hinglish and stays that way: the rule, its explanation
// and its examples are the author's own words, ingested verbatim.
//
// Static file, not localStorage: every cgl.* key is picked up by the Supabase
// sync, and lib/grammar.js keeps the user's OWN rules under "cgl.study.rules".
// Mixing 162 shipped rules into that store would re-upload them on every
// unrelated write and tangle them with the rules the user added themselves.

let cache = null;

export async function loadPocket() {
  if (cache) return cache;
  try {
    const r = await fetch("/pocketbank/rules.json");
    if (!r.ok) return { rules: [] };
    const d = await r.json();
    cache = d && Array.isArray(d.rules) ? d : { rules: [] };
    return cache;
  } catch {
    return { rules: [] };
  }
}

export async function pocketRule(n) {
  const { rules } = await loadPocket();
  return rules.find((r) => String(r.n) === String(n)) || null;
}

// A rule's blocks are {p: "text"} or {table: [[cell, …], …]} — not strings, so
// they cannot be joined directly. A table is written back out as rows, which is
// how the book prints it and how an AI can read it.
function blockText(b) {
  if (b?.table) return b.table.map((row) => row.join(" | ")).join("\n");
  return b?.p || "";
}

// The whole rule as plain text — what gets handed to an AI, or copied to the
// clipboard for Gemini. The book's own words, nothing added.
export function ruleAsText(rule) {
  if (!rule) return "";
  return [
    `Rule ${rule.n}`,
    ...(rule.explanation || []).map(blockText),
    ...(rule.examples || []).map(blockText),
  ]
    .filter(Boolean)
    .join("\n")
    .replace(/\\([_*`[\]|\\])/g, "$1"); // undo the markdown escaping — AI wants the raw text
}
