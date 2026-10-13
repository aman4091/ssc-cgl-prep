import { deepseekChat, parseJsonLoose } from "@/lib/deepseek";

// 🔤 Vocab ke shabdon ka CHHOTA, bolchaal wala Hindi matlab (shuddh nahi — owner) — ek baar mein kai (lib/vocabhindi
// 50-50 karke bhejta hai). Sirf DeepSeek (owner ki apni key).
const PROMPT = `You are helping a Hindi-speaking SSC CGL student understand English words.
For EACH English word / one-word-substitution below (its English definition is given for context), give its meaning in SIMPLE, EVERYDAY spoken Hindi (bol-chaal ki Hindi) in Devanagari — 1 to 5 words — the way people actually talk, NOT formal/Sanskritized "shuddh" Hindi.
Use common words even if they come from Urdu or English, as long as an ordinary Hindi speaker instantly understands them. If no single simple word exists, describe it in a few easy words.
Good: "Abate" → "कम होना", "Abattoir" → "कसाईखाना", "Abbot" → "मठ का मुखिया", "Abbreviation" → "छोटा रूप", "Abdicate" → "गद्दी छोड़ना", "Aberration" → "गड़बड़, सामान्य से हटकर", "Abeyance" → "रुका हुआ, टला हुआ", "Ablution" → "नहाना-धोना", "Abolish" → "खत्म करना".
Bad (too formal): "उन्मूलन", "संक्षेपण", "विचलन", "स्थगन", "मठाधीश".
Return STRICT JSON only: {"items":[{"w":"<word exactly as given>","hi":"<simple Hindi meaning>"}]}
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
    const items = (Array.isArray(parsed.items) ? parsed.items : []).filter((x) => x && x.w && x.hi).map((x) => ({ w: String(x.w), hi: String(x.hi).trim() }));
    return Response.json({ items });
  } catch (e) {
    return Response.json({ error: e.message || "Server error" }, { status: 500 });
  }
}
