import { deepseekChat, parseJsonLoose } from "@/lib/deepseek";

const PROMPT = `You are an SSC CGL question setter AND an accurate solver. You get one or more RULES/concepts. Generate a fresh MCQ practice set that TESTS those exact rules (SSC CGL Prelims style).

Output STRICT JSON only:
{
  "title": "short quiz title (mention the chapter/rule)",
  "questions": [
    {
      "question": "the question text (ends at the question mark — NO options inside)",
      "diagram": "<svg ...>...</svg> only if a figure helps, else \\"\\"",
      "solution": "your working / reasoning ending at the exact answer",
      "options": ["opt1","opt2","opt3","opt4"],
      "answer": 0,
      "explanation": "1-2 line reason tied to the rule being tested"
    }
  ]
}

CORRECTNESS (most important):
- SOLVE each question yourself first; make ONE option equal your computed/correct answer; other 3 are plausible distractors.
- Set "answer" to the 0-based index of the correct option. Re-check the index.
- options[answer], solution, and explanation must agree.
- Only ONE option may be defensibly correct. AVOID ambiguous items where two options could both be argued correct (e.g. collective nouns like electorate/jury/team that can take singular OR plural, "which is more formal" style). Skip such questions — pick clear-cut cases only.

RULES:
- EVERY question must test one of the GIVEN rules/concepts — do NOT drift to unrelated topics.
- Put the four choices ONLY inside "options". Never list options inside the "question" text.
- English: make grammar/error-spotting/fill-in questions on the exact rule. Maths: numeric MCQs on the concept.
- MATH in LaTeX ($...$): x^{2}, \\frac{a}{b}, \\sqrt{x}, \\times, \\div. NEVER a bare ^ caret.
- Provide exactly the requested number of questions, each with exactly 4 options.`;

export async function POST(req) {
  try {
    const { rules, subject, chapter, count = 10, apiKey, model, baseUrl } = await req.json();
    const list = Array.isArray(rules) ? rules.map((r) => String(r || "").trim()).filter(Boolean) : [];
    if (list.length === 0)
      return Response.json({ error: "Koi rule nahi mila is quiz ke liye." }, { status: 400 });

    const n = Math.min(Math.max(parseInt(count) || 10, 1), 30);
    const rulesText = list.map((r, i) => `${i + 1}. ${r}`).join("\n");
    const ctx =
      (subject ? `Subject: ${subject}.\n` : "") +
      (chapter ? `Chapter: ${chapter}.\n` : "") +
      `Rules to test:\n${rulesText}\n\nGenerate ${n} NEW MCQs testing ONLY these rules.`;

    const result = await deepseekChat({
      apiKey,
      model,
      baseUrl,
      temperature: 0.3,
      jsonMode: true,
      maxTokens: 8000,
      messages: [
        { role: "system", content: PROMPT },
        { role: "user", content: ctx },
      ],
    });

    if (!result.ok) return Response.json({ error: result.error }, { status: result.status });

    const parsed = parseJsonLoose(result.content) || {};
    const questions = Array.isArray(parsed.questions)
      ? parsed.questions.filter((x) => x && x.question && Array.isArray(x.options) && x.options.length >= 2)
      : [];
    if (questions.length === 0)
      return Response.json({ error: "Quiz generate nahi hua, dobara try karo." }, { status: 422 });

    return Response.json({ title: parsed.title || (chapter ? `${chapter} Quiz` : "Rule Quiz"), questions });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
