// ✨ "Gemini" button poori site mein — kis AI site par khulta hai, ye ab
// Settings se chunta hai (settings.askAiSite), hardcoded Gemini nahi.
//
// Button ka kaam wahi rehta hai (image/prompt copy karke site khol do, taaki
// tum wahan paste kar sako) — sirf DESTINATION badalta hai. Isliye label bhi
// isi list se aata hai: button hamesha usi site ka naam dikhata hai jo abhi
// chuni hui hai.

import { getSettings } from "./storage";

export const AI_SITES = [
  { key: "gemini", label: "Gemini", url: "https://gemini.google.com/app" },
  { key: "chatgpt", label: "ChatGPT", url: "https://chatgpt.com/" },
  { key: "claude", label: "Claude", url: "https://claude.ai/new" },
  { key: "deepseek", label: "DeepSeek", url: "https://chat.deepseek.com/" },
  { key: "kimi", label: "Kimi", url: "https://www.kimi.com/" },
  { key: "perplexity", label: "Perplexity", url: "https://www.perplexity.ai/" },
  { key: "grok", label: "Grok", url: "https://grok.com/" },
];

const DEFAULT_KEY = "gemini";

export function aiSiteOf(key) {
  return AI_SITES.find((s) => s.key === key) || AI_SITES.find((s) => s.key === DEFAULT_KEY);
}

// Har site ka apna link bhi rakha ja sakta hai (Settings mein) — jaise Gemini
// ka doosra account: https://gemini.google.com/u/1/app. Khaali chhodo to upar
// wala default chalta hai. Ye yahin padha jata hai, isliye poore app ke saare
// ✨ button apne aap usi link par khulte hain — aur overlay bhi wahi link
// site se le leta hai (components/OverlayInbox.js -> /ai-site).
function customUrl(key) {
  try {
    const u = getSettings().aiSiteUrls?.[key];
    return typeof u === "string" && /^https?:\/\//i.test(u.trim()) ? u.trim() : "";
  } catch { return ""; }
}

export function aiSiteUrl(key) { return customUrl(key) || aiSiteOf(key).url; }
export function aiSiteLabel(key) { return aiSiteOf(key).label; }
