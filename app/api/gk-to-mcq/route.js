import { deepseekChat, parseJsonLoose } from "@/lib/deepseek";

// One-liner GK book -> MCQ. Input is raw text from a "Question | Answer" table
// (each row = a fact with the correct answer, but NO options). For every row we
// keep the given answer as the correct option and fabricate 3 plausible wrong
// options, producing the standard MCQ shape used everywhere in the app.
const PROMPT = `You are an SSC CGL question setter. You receive raw text from a ONE-LINER GK book laid out as a two-column table: a QUESTION (or fill-in-the-blank statement) on the left and its correct ANSWER on the right. The text may be messy from PDF extraction — question and answer may sit on the same line, wrap across lines, and section headings (like "1. Prehistoric Period", "2. Indus Valley Civilization") separate topics.

Your job: turn EVERY question-answer pair into a clean 4-option MCQ.

Output STRICT JSON only, no markdown, no commentary:
{
  "title": "short quiz title (name the topic/book section if clear)",
  "questions": [
    {
      "question": "the question text (a full question; if the source is a fill-in statement, keep it as-is, ending where the blank is)",
      "options": ["opt1","opt2","opt3","opt4"],
      "answer": 0,
      "explanation": "1 short line of context for the fact (write '' if none)",
      "diagram": ""
    }
  ]
}

RULES (very important):
- The ANSWER given in the book is AUTHORITATIVE and is always the CORRECT option. Never change it.
- Make ONE option EXACTLY equal to the book's answer, then add 3 PLAUSIBLE but WRONG distractors of the SAME category/type (e.g. if the answer is a state, distractors are other Indian states; if a person, other similar people; if a period/tool/site, similar ones). Distractors must be clearly wrong but tempting — not random or absurd.
- Set "answer" to the 0-based index of the correct option. SHUFFLE which position the correct option sits in across questions (don't always make it index 0). Re-check the index points at the book's answer.
- Extract EVERY row present — do NOT skip rows or stop early. Ignore page numbers, headers, watermarks, and column labels ("Question", "Answer").
- Skip a row ONLY if it has no discernible answer.
- Keep each question self-contained. Never put the options inside the "question" text.
- MATH (rare here) in LaTeX ($...$). NEVER a bare ^ caret.
- If the text has no usable Q&A pairs, return {"title":"","questions":[]}.`;

export async function POST(req) {
  try {
    const { text, apiKey, model, baseUrl } = await req.json();
    const src = String(text || "").trim();
    if (src.length < 15)
      return Response.json({ error: "Text bahut chhota hai — poori book/table paste ya upload karo." }, { status: 400 });

    // reasoner models don't support JSON response_format
    const jsonMode = !/reason/i.test(model || "");

    const result = await deepseekChat({
      apiKey,
      model,
      baseUrl,
      temperature: 0.35,
      jsonMode,
      maxTokens: 8000,
      messages: [
        { role: "system", content: PROMPT },
        { role: "user", content: "One-liner GK table text:\n\n" + src.slice(0, 24000) },
      ],
    });

    if (!result.ok) return Response.json({ error: result.error }, { status: result.status });

    const parsed = parseJsonLoose(result.content) || {};
    const questions = Array.isArray(parsed.questions)
      ? parsed.questions
          .filter((x) => x && x.question && Array.isArray(x.options) && x.options.length >= 2)
          .map((x) => ({
            question: x.question,
            options: x.options,
            answer: Number.isInteger(x.answer) && x.answer >= 0 && x.answer < x.options.length ? x.answer : 0,
            explanation: x.explanation || "",
            diagram: "",
          }))
      : [];
    if (questions.length === 0)
      return Response.json({ error: "Koi question nahi bana — text table format mein hai ye check karo, ya dobara try karo." }, { status: 422 });

    return Response.json({ title: parsed.title || "GK One-liners", questions });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
