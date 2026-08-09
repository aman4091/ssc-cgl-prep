import { deepseekChat, parseJsonLoose } from "@/lib/deepseek";

// Rewrite a small BATCH of already-extracted current-affairs MCQs into natural
// Hinglish. Deterministic parsing happens on the client (lib/caparse); this only
// translates the wording, so the answer index and count stay stable. If this
// fails, the client keeps the English version — questions are never lost.
const PROMPT = `You rewrite current-affairs MCQs into natural HINGLISH (Hindi + English mix in Roman/Latin script — the way Indian aspirants speak). You are given a JSON array of questions; return the SAME questions, SAME order, SAME count, only reworded.

Return STRICT JSON only, no markdown fences:
{ "items": [ { "question": "...", "options": ["...","...","...","..."], "answer": 0, "detail": "..." } ] }

Rules:
- Keep the SAME number of items and the SAME order as the input.
- Keep the SAME "answer" index for each item. Keep exactly 4 options in the same order/meaning.
- KEEP proper nouns in English as-is — names of people, places, organisations, schemes, awards, books, dates, numbers. Only the connecting/explaining words become Hinglish.
- "detail": rewrite the explanation in short Hinglish (markdown bullets ok), same facts.
- Output valid JSON only.`;

export async function POST(req) {
  try {
    const { items, apiKey, model, baseUrl } = await req.json();
    if (!apiKey) return Response.json({ error: "DeepSeek API key Settings mein daalo." }, { status: 400 });
    if (!Array.isArray(items) || !items.length) return Response.json({ items: [] });

    const jsonMode = !/reason/i.test(model || "");
    const r = await deepseekChat({
      apiKey, model, baseUrl,
      temperature: 0.2,
      jsonMode,
      maxTokens: 8000,
      messages: [
        { role: "system", content: PROMPT },
        { role: "user", content: "Questions JSON:\n\n" + JSON.stringify({ items }).slice(0, 24000) },
      ],
    });
    if (!r.ok) return Response.json({ error: r.error }, { status: r.status || 500 });

    const parsed = parseJsonLoose(r.content) || {};
    const out = Array.isArray(parsed.items) ? parsed.items : [];
    return Response.json({ items: out });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
