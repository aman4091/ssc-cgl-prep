import { deepseekChat, parseJsonLoose } from "@/lib/deepseek";

// Vocab overlay ki patti ke liye chhota matlab.
//
// Overlay par sirf ek word aur uske neeche do line ki jagah hai — wahan lamba
// samjhaya hua jawab kaam nahi aata. Isliye yahan se sirf itna maanga jata
// hai: kya hai, aur ek chhota sa istemal, Hinglish mein — taaki ek nazar
// mein baith jaye.
//
// Ek hi call mein bahut saare word, kyunki ye background mein chalta hai aur
// har word par alag call karna na sasta hai na tez.
const PROMPT = `You write ultra-short vocabulary notes for an Indian SSC-CGL aspirant.

For EACH term you are given, write its meaning in HINGLISH (Roman script Hindi mixed with English) in AT MOST 2 short lines.

Style:
- Line 1: the meaning, plainly. Start directly with the meaning, never repeat the term.
- Line 2 (optional): a tiny example or a hook that makes it stick.
- Keep the whole thing under 160 characters. Short is the point.
- Hinglish, Roman script only. No Devanagari. No markdown, no bullets, no quotes.

Return STRICT JSON only:
{ "lines": { "<term exactly as given>": "meaning line 1\\nline 2" } }

Every term you were given must appear as a key, spelled exactly as given.`;

export async function POST(req) {
  try {
    const { words, apiKey, model, baseUrl } = await req.json();
    const list = (Array.isArray(words) ? words : [])
      .map((w) => String(w || "").trim())
      .filter(Boolean)
      .slice(0, 40);
    if (!list.length) return Response.json({ lines: {} });

    const result = await deepseekChat({
      apiKey,
      model,
      baseUrl,
      temperature: 0.3,
      jsonMode: true,
      maxTokens: 4000,
      messages: [
        { role: "system", content: PROMPT },
        { role: "user", content: list.join("\n") },
      ],
    });

    if (!result.ok) return Response.json({ error: result.error }, { status: result.status });

    const parsed = parseJsonLoose(result.content);
    const raw = parsed?.lines && typeof parsed.lines === "object" ? parsed.lines : {};
    const lines = {};
    for (const w of list) {
      // Do line se zyada aaye to baaki chhod do — patti par utni hi jagah hai.
      const v = String(raw[w] || "").trim();
      if (v) lines[w] = v.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 2).join("\n");
    }
    return Response.json({ lines });
  } catch (e) {
    return Response.json({ error: e.message || "failed" }, { status: 500 });
  }
}
