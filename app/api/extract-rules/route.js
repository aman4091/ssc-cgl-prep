import { deepseekChat, parseJsonLoose } from "@/lib/deepseek";

const PROMPT = `You extract concise, exam-ready RULES / concepts from study material for SSC CGL.
You receive raw text (from a PDF or OCR of an image — may be messy). Convert it into a clean list of individual rules.

Output STRICT JSON only (no markdown, no commentary):
{
  "chapter": "best short topic/chapter name for this material (e.g. 'Subject-Verb Agreement', 'Percentage')",
  "rules": [
    "Rule 1 stated as ONE clear, self-contained line",
    "Rule 2 ...",
    ...
  ]
}

Guidelines:
- Split the material into ATOMIC rules — one idea per rule. If the text lists 10 sub-rules, output 10 entries.
- Each rule must be a complete, standalone statement a student can revise (not just a heading).
- Keep the wording faithful to the source but make it clean and grammatical. Fix obvious OCR errors.
- Do NOT include exercise questions, answers, page numbers, or headers — only the rules/concepts.
- Keep language mostly English (with small Hindi hints allowed if present in source).
- If the material has no real rules, return {"chapter":"","rules":[]}.`;

export async function POST(req) {
  try {
    const { text, subject, chapterHint, apiKey, model, baseUrl } = await req.json();
    if (!text || text.trim().length < 15)
      return Response.json({ error: "Text bahut chhota hai / khaali hai." }, { status: 400 });

    const clipped = text.slice(0, 20000);
    const ctx =
      (subject ? `Subject: ${subject}.\n` : "") +
      (chapterHint ? `This material belongs to the chapter: ${chapterHint}.\n` : "") +
      `Material:\n${clipped}`;

    const result = await deepseekChat({
      apiKey,
      model,
      baseUrl,
      temperature: 0.2,
      jsonMode: true,
      maxTokens: 6000,
      messages: [
        { role: "system", content: PROMPT },
        { role: "user", content: ctx },
      ],
    });

    if (!result.ok) return Response.json({ error: result.error }, { status: result.status });

    const parsed = parseJsonLoose(result.content) || {};
    const rules = Array.isArray(parsed.rules)
      ? parsed.rules.map((r) => String(r || "").trim()).filter((r) => r.length > 3)
      : [];
    if (rules.length === 0)
      return Response.json({ error: "Is material se koi rule nahi nikla. Saaf text/photo try karo." }, { status: 422 });

    return Response.json({ chapter: parsed.chapter || "", rules });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
