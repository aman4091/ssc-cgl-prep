import { deepseekChat, parseJsonLoose } from "@/lib/deepseek";

// Convert a page of current-affairs questions (from a user's PDF) into the CA
// question shape, keeping the questions FAITHFUL to the source but writing
// everything in natural HINGLISH — matching how CA answers already look.
const PROMPT = `You convert CURRENT-AFFAIRS questions from a PDF into clean JSON, keeping each question FAITHFUL to the source and writing everything in natural HINGLISH (Hindi + English mix in Roman/Latin script — the way Indian aspirants actually speak).

Return STRICT JSON only, no markdown fences, no commentary:
{ "questions": [ { "question": "...", "options": ["...","...","...","..."], "answer": 0, "detail": "..." } ] }

Rules:
- Extract only the questions that ACTUALLY appear in the text. Do NOT invent new topics. Keep each question's meaning exactly as given ("as it is") — just rewrite the wording in Hinglish.
- "question": the question in Hinglish. KEEP proper nouns as-is in English — names of people, places, organisations, schemes, awards, books, dates and numbers must stay in their original English form (do NOT transliterate or translate names).
- "options": exactly 4 options in Hinglish (again keep names/terms in English as-is). If the source already gives options, reuse them. If it is a one-line Q&A with a single correct answer, build 4 plausible options with the correct one included.
- "answer": 0-based index of the CORRECT option. If the source marks/states the answer, honour it; otherwise choose the correct one from your own knowledge.
- "detail": a SHORT Hinglish explanation (2-4 lines, markdown allowed) — why the answer is correct plus the one key fact to remember, in the same helpful tone a current-affairs answer key uses.
- Skip page headers, footers, watermarks, page numbers and instructions — only real questions.
- Output valid JSON only.`;

export async function POST(req) {
  try {
    const { text, apiKey, model, baseUrl } = await req.json();
    if (!apiKey) return Response.json({ error: "DeepSeek API key Settings mein daalo." }, { status: 400 });
    const src = String(text || "").trim();
    if (src.length < 15) return Response.json({ questions: [] });

    const jsonMode = !/reason/i.test(model || "");
    const r = await deepseekChat({
      apiKey, model, baseUrl,
      temperature: 0.3,
      jsonMode,
      maxTokens: 8000,
      messages: [
        { role: "system", content: PROMPT },
        { role: "user", content: "Current-affairs PDF text:\n\n" + src.slice(0, 24000) },
      ],
    });
    if (!r.ok) return Response.json({ error: r.error }, { status: r.status || 500 });

    const parsed = parseJsonLoose(r.content) || {};
    const raw = Array.isArray(parsed.questions) ? parsed.questions : [];
    const questions = raw
      .filter((q) => q && q.question && Array.isArray(q.options) && q.options.length >= 2)
      .map((q) => {
        const options = q.options.map((o) => String(o)).slice(0, 4);
        let answer = Number(q.answer);
        if (!Number.isInteger(answer) || answer < 0 || answer >= options.length) answer = 0;
        return {
          question: String(q.question).trim(),
          options,
          answer,
          detail: String(q.detail || "").trim(),
        };
      });

    return Response.json({ questions });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
