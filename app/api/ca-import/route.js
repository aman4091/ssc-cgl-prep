import { deepseekChat, parseJsonLoose } from "@/lib/deepseek";

// Convert a page of current-affairs questions (from a user's PDF) into the CA
// question shape, keeping the questions FAITHFUL to the source but writing
// everything in natural HINGLISH — matching how CA answers already look.
const PROMPT = `You turn a page of CURRENT-AFFAIRS material (from a PDF) into practice MCQs written in natural HINGLISH (Hindi + English mix in Roman/Latin script — the way Indian aspirants actually speak).

Return STRICT JSON only, no markdown fences, no commentary:
{ "questions": [ { "question": "...", "options": ["...","...","...","..."], "answer": 0, "detail": "..." } ] }

The PDF text can be in EITHER form — handle both:
- If it ALREADY has questions (MCQs / one-line Q&A): extract them FAITHFULLY, keep each question's meaning exactly "as it is", just reword in Hinglish. Reuse the given options/answer.
- If it is current-affairs CONTENT / notes / one-liners with NO ready-made questions: CREATE clear MCQs from the important facts (dates, appointments, awards, schemes, summits, sports, books, deaths, rankings, etc.) — roughly one question per notable fact. Make as many good questions as the content genuinely supports.

Rules for every question:
- "question": in Hinglish. KEEP proper nouns as-is in English — names of people, places, organisations, schemes, awards, books, dates and numbers stay in their original English form (do NOT transliterate/translate names).
- "options": exactly 4 options; keep names/terms in English as-is; exactly ONE correct. When creating options, make the 3 wrong ones plausible (similar type — other names/dates/places).
- "answer": 0-based index of the CORRECT option (honour the source's answer if given; else use your own knowledge).
- "detail": a SHORT Hinglish explanation (2-4 lines, markdown allowed) — why the answer is correct plus the one key fact to remember.
- Skip page headers, footers, watermarks, page numbers, ads and instructions. If a bit of text has no usable fact, skip it.
- Output valid JSON only. If there is truly nothing usable, return {"questions":[]}.`;

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
