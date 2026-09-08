// ✨ "Gemini" button poori site mein — kis AI site par khulta hai, ye ab
// Settings se chunta hai (settings.askAiSite), hardcoded Gemini nahi.
//
// Button ka kaam wahi rehta hai (image/prompt copy karke site khol do, taaki
// tum wahan paste kar sako) — sirf DESTINATION badalta hai. Isliye label bhi
// isi list se aata hai: button hamesha usi site ka naam dikhata hai jo abhi
// chuni hui hai.

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
export function aiSiteUrl(key) { return aiSiteOf(key).url; }
export function aiSiteLabel(key) { return aiSiteOf(key).label; }
