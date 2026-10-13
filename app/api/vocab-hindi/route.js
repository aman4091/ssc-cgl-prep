import { deepseekChat, parseJsonLoose } from "@/lib/deepseek";

// 🔤 Vocab ke shabdon ka CHHOTA, bolchaal wala Hindi matlab (shuddh nahi — owner) — ek baar mein kai (lib/vocabhindi
// 50-50 karke bhejta hai). Sirf DeepSeek (owner ki apni key).
const PROMPT = `You are helping a Hindi-speaking SSC CGL student understand English words.
For EACH English word / one-word-substitution below (its English definition is given for context), give its meaning in SIMPLE, EVERYDAY spoken Hindi (bol-chaal ki Hindi) in Devanagari — 1 to 5 words — the way people actually talk, NOT formal/Sanskritized "shuddh" Hindi.
Use common words even if they come from Urdu or English, as long as an ordinary Hindi speaker instantly understands them. If no single simple word exists, describe it in a few easy words.
Good: "Abate" → "कम होना", "Abattoir" → "कसाईखाना", "Abbot" → "मठ का मुखिया", "Abbreviation" → "छोटा रूप", "Abdicate" → "गद्दी छोड़ना", "Aberration" → "गड़बड़, सामान्य से हटकर", "Abeyance" → "रुका हुआ, टला हुआ", "Ablution" → "नहाना-धोना", "Abolish" → "खत्म करना".
Bad (too formal): "उन्मूलन", "संक्षेपण", "विचलन", "स्थगन", "मठाधीश".
Return STRICT JSON only, one item for EVERY numbered word, same order: {"items":[{"n":<the number given>,"w":"<word>","hi":"<simple Hindi meaning>"}]}
No transliteration, no English, no explanation.`;

export async function POST(req) {
  try {
    const { words, apiKey, model, baseUrl } = await req.json();
    const list = (Array.isArray(words) ? words : []).filter((x) => x && x.word).slice(0, 60);
    if (!list.length) return Response.json({ error: "Words missing." }, { status: 400 });
    const result = await deepseekChat({
      apiKey, model, baseUrl,
      temperature: 0.2,
      jsonMode: true,
      maxTokens: 3000,
      messages: [
        { role: "system", content: PROMPT },
        { role: "user", content: list.map((x, i) => `${i + 1}. ${x.word} — ${String(x.def || "").slice(0, 160)}`).join("\n") },
      ],
    });
    if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
    const parsed = parseJsonLoose(result.content) || {};
    // Shabd WAPAS apni list se — model "1. Abate" / "abate " jaisa kuch bhi
    // likhe, number (n) se ya saaf kiye shabd se asli shabd par hi jama ho.
    const norm = (w) => String(w || "").toLowerCase().replace(/^\s*\d+[.)]\s*/, "").split(/\s+[—–-]\s+/)[0].replace(/[^a-z0-9\s'-]/g, "").replace(/\s+/g, " ").trim();
    const byNorm = new Map(list.map((x) => [norm(x.word), x.word]));
    const raw = Array.isArray(parsed.items) ? parsed.items : Array.isArray(parsed) ? parsed : [];
    const items = [];
    raw.forEach((x, k) => {
      if (!x || !x.hi) return;
      const n = Number(x.n);
      const w = (Number.isInteger(n) && list[n - 1] && list[n - 1].word) || byNorm.get(norm(x.w)) || (raw.length === list.length && list[k] ? list[k].word : "");
      if (w) items.push({ w, hi: String(x.hi).trim() });
    });
    return Response.json({ items });
  } catch (e) {
    return Response.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
