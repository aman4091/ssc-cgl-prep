const SYSTEM_PROMPT = `You are an exam-quiz extraction engine for SSC CGL preparation.
You will receive raw text extracted from a PDF of questions (possibly messy, with page numbers, headers, OCR noise).
Your job: convert it into a clean multiple-choice quiz as STRICT JSON.

Rules:
- Output ONLY a JSON object, no markdown, no commentary.
- Shape:
  {
    "title": "short quiz title",
    "questions": [
      {
        "question": "the question text",
        "diagram": "<svg ...>...</svg> only if a figure helps, else \\"\\"",
        "options": ["option A", "option B", "option C", "option D"],
        "answer": 0,
        "explanation": "1-2 line explanation (write '' if unknown)",
        "source": "the exam/paper/year this question is from IF it is written in the text (e.g. 'SSC CGL 2022 Tier-1', 'SSC CGL 2019', '[2018]'); else ''"
      }
    ]
  }
- "answer" is the 0-based index of the correct option.
- CORRECTNESS: If the source clearly marks the correct answer, use it. Otherwise SOLVE the question yourself, compute the exact value, and set "answer" to the option index equal to that value. The explanation must reach the same value as options[answer].
- Extract EVERY question present in the text — do NOT stop early or summarise. If the text has 40 questions, return all 40.
- Always produce exactly the options present (usually 4). If options are missing, infer sensible ones.
- Put the four choices ONLY inside the "options" array. The "question" text must END at the question mark and must NOT contain any of the choices or option letters (a)(b)A. — strip them out into "options".
- MATH: write all mathematics in LaTeX ($...$). Use x^{2}, \\frac{a}{b}, \\sqrt{x}, \\times, \\div. NEVER use a bare ^ caret. Applies to question, options and explanation.
- DIAGRAM: if the question needs a figure (height & distance, triangles, geometry, mensuration), put a clean self-contained SVG in "diagram" (viewBox, thin strokes stroke="#0f172a", small <text> labels, NO <script>, NO external images). Else set "diagram" to "".
- Keep language and content faithful to the source. Ignore page numbers and headers.
- "source": which exam/paper/shift each question is from. In PYQ material this is often written ONCE as a heading (e.g. "SSC CGL 2022 Tier-1, Shift-2 (11 Dec 2022)") and applies to every question below it until a NEW heading appears. CARRY that heading forward: set "source" on every question to the most recent paper/shift heading seen above it. Also copy inline tags like "(SSC CGL 2019)". If truly no paper is mentioned anywhere, use "".
- If the text has no real questions, return {"title":"","questions":[]}.`;

function friendly(status, raw) {
  if (status === 401) return "Invalid API key (401) — Settings mein sahi DeepSeek key daalo.";
  if (status === 402) return "Insufficient balance (402) — DeepSeek account mein credit daalo.";
  if (status === 429) return "Rate limit (429) — thodi der baad try karo.";
  return raw || `DeepSeek HTTP ${status}`;
}

export async function POST(req) {
  try {
    const { text, apiKey, model, baseUrl } = await req.json();

    if (!apiKey || !apiKey.trim())
      return Response.json({ error: "API key missing. Settings mein daalo." }, { status: 400 });
    if (!text || text.trim().length < 20)
      return Response.json({ error: "PDF se text nahi mila (shayad scanned/image PDF hai)." }, { status: 400 });

    const clipped = text.slice(0, 24000); // keep request sane
    const url = (baseUrl || "https://api.deepseek.com").replace(/\/$/, "") + "/chat/completions";

    // deepseek-reasoner doesn't support response_format json_object; only use it for chat models
    const useJsonMode = (model || "deepseek-chat").includes("chat");

    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: model || "deepseek-chat",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: "PDF text:\n\n" + clipped },
          ],
          temperature: 0.2,
          max_tokens: 8000, // room to return many questions per chunk
          ...(useJsonMode ? { response_format: { type: "json_object" } } : {}),
        }),
      });
    } catch (netErr) {
      return Response.json(
        { error: "Network error — internet ya baseUrl check karo: " + netErr.message },
        { status: 502 }
      );
    }

    const bodyText = await res.text();
    let data = {};
    try { data = bodyText ? JSON.parse(bodyText) : {}; } catch { /* keep raw */ }

    if (!res.ok) {
      return Response.json(
        { error: friendly(res.status, data?.error?.message || bodyText) },
        { status: res.status }
      );
    }

    const content = data?.choices?.[0]?.message?.content || "{}";
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      // fallback: pull the first {...} block
      const m = content.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : { title: "", questions: [] };
    }

    const questions = Array.isArray(parsed.questions)
      ? parsed.questions.filter((q) => q && q.question && Array.isArray(q.options) && q.options.length >= 2)
      : [];

    if (questions.length === 0) {
      return Response.json({ error: "Koi valid question extract nahi hua." }, { status: 422 });
    }

    return Response.json({
      title: parsed.title || "Untitled Quiz",
      questions,
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
