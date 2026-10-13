import { deepseekChat, parseJsonLoose } from "@/lib/deepseek";

// 🔤 Vocab ke shabdon ka CHHOTA Hindi matlab — ek baar mein kai (lib/vocabhindi
// 50-50 karke bhejta hai). Sirf DeepSeek (owner ki apni key).
const PROMPT = `You are an English–Hindi dictionary for SSC CGL students.
For EACH English word / one-word-substitution below (its English definition is given for context), give its SHORT Hindi meaning in Devanagari — 1 to 5 words, the way a Hindi dictionary would (e.g. "Benevolent" → "दयालु, परोपकारी").
Return STRICT JSON only: {"items":[{"w":"<word exactly as given>","hi":"<Hindi meaning>"}]}
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
