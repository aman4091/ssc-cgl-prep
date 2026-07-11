import { deepseekChat, parseJsonLoose } from "@/lib/deepseek";

const PROMPT = `You are an English vocab coach for SSC CGL. For the given word (with its OWS definition), return STRICT JSON only:
{
  "meaning": "clear simple meaning in 1 line (English), plus short Hindi meaning in brackets",
  "trick": "a short, catchy memory/mnemonic trick in Hinglish to remember this word",
  "synonyms": ["3 to 5 synonyms"],
  "antonyms": ["2 to 4 antonyms, or [] if none exist"],
  "example": "one simple example sentence using the word"
}
Keep it concise and accurate. No markdown, only JSON.`;

export async function POST(req) {
  try {
    const { word, def, apiKey, model, baseUrl } = await req.json();
    if (!word) return Response.json({ error: "Word missing." }, { status: 400 });

    const result = await deepseekChat({
      apiKey,
      model,
      baseUrl,
      temperature: 0.3,
      jsonMode: true,
      maxTokens: 700,
      messages: [
        { role: "system", content: PROMPT },
        { role: "user", content: `Word: ${word}\nDefinition (OWS): ${def || "(not given)"}` },
      ],
    });

    if (!result.ok) return Response.json({ error: result.error }, { status: result.status });

    const parsed = parseJsonLoose(result.content) || {};
    return Response.json({
      meaning: parsed.meaning || "",
      trick: parsed.trick || "",
      synonyms: Array.isArray(parsed.synonyms) ? parsed.synonyms : [],
      antonyms: Array.isArray(parsed.antonyms) ? parsed.antonyms : [],
      example: parsed.example || "",
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
