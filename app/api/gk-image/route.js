import { geminiVision } from "@/lib/gemini";
import { parseJsonLoose } from "@/lib/deepseek";

// One-liner GK page IMAGE(s) -> MCQs via Gemini vision. A two-column
// "Question | Answer" table is read far more reliably from the image itself than
// from OCR text (which jumbles the columns). Gemini reads the layout natively.
const PROMPT = `You are an SSC CGL question setter. You are shown IMAGE(S) of a page from a ONE-LINER GK book — a two-column table with a QUESTION (or fill-in statement) on the left and its correct ANSWER on the right, usually under a topic heading.

Read EVERY row across all images and turn each Question-Answer pair into a clean 4-option MCQ.

Output STRICT JSON only, no markdown:
{
  "title": "short quiz title (the topic if visible)",
  "questions": [
    {
      "question": "the question text",
      "options": ["opt1","opt2","opt3","opt4"],
      "answer": 0,
      "explanation": "1 short line of context (or '')",
      "diagram": ""
    }
  ]
}

RULES (very important):
- The ANSWER shown in the book is AUTHORITATIVE and is always the CORRECT option. Never change it.
- Make ONE option EXACTLY equal the book's answer, then add 3 PLAUSIBLE but WRONG distractors of the SAME category (answer is a state -> other Indian states; a person -> similar people; a site/period/tool -> similar ones). Distractors must be clearly wrong but tempting, never random.
- Set "answer" to the 0-based index of the correct option. VARY the correct option's position across questions. Re-check the index points at the book's answer.
- Extract EVERY row you can read — do NOT skip rows or stop early. Ignore page numbers, headers, watermarks, and the column labels "Question"/"Answer".
- Never put the options inside the "question" text.
- If no readable Q&A rows, return {"title":"","questions":[]}.`;

export async function POST(req) {
  try {
    const { images, geminiApiKey, geminiModel } = await req.json();
    if (!geminiApiKey || !geminiApiKey.trim())
      return Response.json({ error: "Image mode Gemini vision use karta hai — Settings mein Gemini API key add karo." }, { status: 400 });
    if (!Array.isArray(images) || images.length === 0)
      return Response.json({ error: "Koi image nahi mili." }, { status: 400 });

    const g = await geminiVision({
      apiKey: geminiApiKey.trim(),
      model: geminiModel,
      system: PROMPT,
      userText: "Ye one-liner GK book ke page(s) hain. Har Question|Answer row ko 4-option MCQ bana do. Saari rows extract karo — ek bhi mat chhodo.",
      images,
      temperature: 0.35,
    });

    if (!g.ok) return Response.json({ error: g.error }, { status: g.status || 502 });

    const parsed = parseJsonLoose(g.content) || {};
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
      return Response.json({ error: "Image se koi question nahi bana — saaf photo/scan lo, ya thoda zoom karke lo." }, { status: 422 });

    return Response.json({ title: parsed.title || "GK One-liners", questions });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
