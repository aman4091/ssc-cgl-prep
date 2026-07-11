import { deepseekChat, parseJsonLoose } from "@/lib/deepseek";

const PROMPT = `You extract vocabulary entries from text that is often MESSY OCR from a photo of a book page (typos, two columns, numbering, Hindi mixed in).

Each entry = a TERM, its MEANING, and its TYPE. Types:
- "ows"   = One Word Substitution (a phrase/definition -> its single WORD)
- "idiom" = Idiom or Phrase (the idiom/phrase -> its meaning)
- "vocab" = a vocabulary word (a word -> its meaning)

Decide the type from the content:
- If the term is a multi-word expression whose meaning is figurative (like "spill the beans") -> "idiom".
- If a definition/description maps to a single word answer -> "ows".
- Otherwise a single word with a meaning -> "vocab".

Return STRICT JSON only:
{ "items": [ { "def": "the meaning / definition", "word": "the term to remember", "type": "ows|idiom|vocab" } ] }

Rules:
- Be GENEROUS: extract EVERY clear term–meaning pair you can find.
- Fix obvious OCR typos so the term/meaning read correctly.
- Ignore page numbers, headers, chapter titles, and non-pair lines.
- No commentary. If nothing found, return { "items": [] }.`;

export async function POST(req) {
  try {
    const { text, forceType, apiKey, model, baseUrl } = await req.json();
    if (!text || text.trim().length < 10) return Response.json({ items: [] });

    const hint =
      forceType && ["ows", "idiom", "vocab"].includes(forceType)
        ? `\n\nThe user says ALL entries on this page are of type "${forceType}". Set every item's "type" to "${forceType}".`
        : "";

    const result = await deepseekChat({
      apiKey,
      model,
      baseUrl,
      temperature: 0.1,
      jsonMode: true,
      maxTokens: 8000,
      messages: [
        { role: "system", content: PROMPT },
        { role: "user", content: text.slice(0, 16000) + hint },
      ],
    });

    if (!result.ok) return Response.json({ error: result.error }, { status: result.status });

    const parsed = parseJsonLoose(result.content);
    const items = Array.isArray(parsed?.items)
      ? parsed.items
          .filter((x) => x && x.word && String(x.word).trim().length > 0)
          .map((x) => ({
            def: String(x.def || "").trim(),
            word: String(x.word).trim(),
            type: forceType || x.type || "vocab",
          }))
          .filter((x) => x.word.split(/\s+/).length <= 10)
      : [];

    return Response.json({ items });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
