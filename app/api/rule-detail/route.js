import { deepseekChat, parseJsonLoose } from "@/lib/deepseek";

const PROMPT = `You are an expert SSC CGL tutor. A student gives you ONE rule/concept and wants to understand it FULLY in the easiest way.

Return STRICT JSON only (no markdown fences around the whole thing):
{
  "detail": "a full but EASY explanation of the rule in Hinglish (Hindi+English roman script). Use markdown: short paragraphs, **bold** key words, and bullet points. Cover: rule kya kehta hai, kab & kaise lagta hai, kyun, aur common cases. Beginner ko samajh aa jaye — no heavy jargon.",
  "examples": ["3 to 5 clear example CASES that DEMONSTRATE this exact rule.", "For Maths give a tiny worked example."],
  "trap": "the most common mistake students make with this rule (1-2 lines, Hinglish)"
}

EXAMPLE FORMAT (very important — do this exactly):
- Put the correctness mark IMMEDIATELY BEFORE the sentence it applies to, glued to it. Never place a bare ✅ or ❌ floating BETWEEN two sentences.
- For English, when showing a right-vs-wrong contrast, put the correct line first, then a real newline, then the wrong line — like:
  "**Police** (plural verb): ✅ \\"The police **are** investigating the case.\\"\\n❌ \\"The police **is** investigating.\\""
- So each example string = a bold label, then "✅ ..." for the correct sentence, then \\n and "❌ ..." for the wrong one. The ✅ hugs the correct sentence and ❌ hugs the wrong sentence.
- If an example only shows correct usage, just use "✅ ..." (no ❌).

Rules:
- Stay strictly on THIS rule — do not drift to other rules.
- Hinglish, friendly, simple. Detailed but not bloated.
- MATH: write any mathematics in LaTeX ($...$). Use x^{2}, \\frac{a}{b}, \\sqrt{x}. NEVER a bare ^ caret.`;

export async function POST(req) {
  try {
    const { rule, subject, chapter, apiKey, model, baseUrl } = await req.json();
    if (!rule || !rule.trim())
      return Response.json({ error: "Rule khaali hai." }, { status: 400 });

    const ctx =
      (subject ? `Subject: ${subject}. ` : "") +
      (chapter ? `Chapter: ${chapter}. ` : "") +
      `\nRule:\n${rule.trim()}`;

    const isReasoner = (model || "").includes("reasoner");
    const result = await deepseekChat({
      apiKey,
      model,
      baseUrl,
      temperature: 0.3,
      jsonMode: true,
      maxTokens: isReasoner ? 8000 : 2000,
      messages: [
        { role: "system", content: PROMPT },
        { role: "user", content: ctx },
      ],
    });

    if (!result.ok) return Response.json({ error: result.error }, { status: result.status });

    const parsed = parseJsonLoose(result.content) || {};
    return Response.json({
      detail: parsed.detail || "",
      examples: Array.isArray(parsed.examples) ? parsed.examples : [],
      trap: parsed.trap || "",
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
