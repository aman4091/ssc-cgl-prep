"use client";

import { useState } from "react";
import { getSettings } from "@/lib/storage";

// Question + lettered options as plain text. Markdown image (![](url)) becomes the
// raw URL so figure questions are still askable elsewhere.
function questionText(q) {
  const clean = (s) =>
    String(s || "")
      .replace(/!\[\]\((<[^>]+>|[^)]+)\)/g, (_, u) => " " + String(u).replace(/^<|>$/g, "") + " ")
      .replace(/\s+/g, " ")
      .trim();
  const opts = (q.options || []).map((o, i) => `${String.fromCharCode(65 + i)}) ${clean(o)}`).join("\n");
  return `${clean(q.question)}\n${opts}`.trim();
}

// Copy this question to the clipboard and open the ask-site set in Settings
// (askExternalUrl). If that URL contains %s, the question is injected into it so
// the search/chat is pre-filled; otherwise it just opens and you paste.
// `url` fixes the target site (e.g. Gemini); omit it to use the ask-site from
// Settings. `label` overrides the button text. `promptKey` names a Settings field
// whose text is prepended before the question when copying (e.g. "geminiPrompt").
export default function AskElsewhere({ q, className = "btn btn--ghost btn--sm", url, label, title, promptKey, onAsked }) {
  const [done, setDone] = useState(false);
  const go = async () => {
    let text = questionText(q);
    if (promptKey) {
      const pre = String(getSettings()[promptKey] || "").trim();
      if (pre) text = `${pre}\n\n${text}`;
    }
    try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }
    setDone(true); setTimeout(() => setDone(false), 1500);
    const tmpl = String(url != null ? url : (getSettings().askExternalUrl || "")).trim();
    if (tmpl) {
      const full = tmpl.includes("%s") ? tmpl.replace("%s", encodeURIComponent(text)) : tmpl;
      try { window.open(full, "_blank", "noopener,noreferrer"); } catch { /* ignore */ }
    }
    if (onAsked) { try { onAsked(); } catch { /* ignore */ } }
  };
  return (
    <button className={className} onClick={go} title={title || "Copy question & open your ask-site (set in Settings)"}>
      {done ? "✓ Copied" : (label || "📋 Copy & Ask")}
    </button>
  );
}
