// Generate NEW multiple-choice questions FROM study notes (facts/lists/tables),
// unlike /api/generate-quiz which EXTRACTS questions already present in a text.
// Used by the "📝 Quiz" button on each notes page. Batched by the caller, with
// an EXCLUDE list of already-asked stems so batches don't repeat.

function friendly(status, raw) {
  if (status === 401) return "Invalid API key (401) — Settings mein sahi DeepSeek key daalo.";
  if (status === 402) return "Insufficient balance (402) — DeepSeek account mein credit daalo.";
  if (status === 429) return "Rate limit (429) — thodi der baad try karo.";
  return raw || `DeepSeek HTTP ${status}`;
}

export async function POST(req) {
  try {
    const { text, count = 10, exclude = [], temperature, apiKey, model, baseUrl } = await req.json();
    const temp = Math.min(1.0, Math.max(0.2, Number(temperature) || 0.6));
    if (!apiKey || !apiKey.trim())
      return Response.json({ error: "API key missing. Settings mein daalo." }, { status: 400 });
    if (!text || text.trim().length < 30)
      return Response.json({ error: "Is page par quiz banane ke liye kaafi text nahi hai." }, { status: 400 });

    const n = Math.min(Math.max(parseInt(count, 10) || 10, 1), 15);
    const notes = String(text).slice(0, 12000);
    const exList = (exclude || []).slice(-120).map((s) => "- " + String(s).slice(0, 140)).join("\n");

    const SYSTEM = `You are an SSC CGL / GK quiz setter. You are given STUDY NOTES (facts, points, tables) on ONE topic. Create NEW multiple-choice questions that TEST the facts in these notes. Output STRICT JSON only — no markdown, no commentary.

Rules:
- Shape: {"title":"short topic title","questions":[{"question":"...","options":["A","B","C","D"],"answer":0,"explanation":"1-line why","diagram":""}]}
- "answer" is the 0-based index of the correct option.
- Create ${n} questions. Only use facts PRESENT in the notes — never invent facts not in them. If the notes genuinely can't yield ${n} distinct questions, return fewer; do NOT pad with repeats or made-up facts.
- Each question: one clear factual MCQ answerable from the notes, with 4 options — the correct one plus 3 plausible-but-wrong distractors.
- Test DIFFERENT facts each time. Do NOT repeat any question already in the EXCLUDE list below.
- Keep language faithful to the notes (Hindi/English as written). Keep questions tight and exam-style.
- If there is too little to make even one question, return {"title":"","questions":[]}.`;

    const user =
      "STUDY NOTES:\n\n" + notes +
      (exList ? "\n\nEXCLUDE (already-asked question stems — do NOT repeat these):\n" + exList : "");

    const url = (baseUrl || "https://api.deepseek.com").replace(/\/$/, "") + "/chat/completions";
    const useJsonMode = (model || "deepseek-chat").includes("chat");

    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey.trim()}` },
        body: JSON.stringify({
          model: model || "deepseek-chat",
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: user },
          ],
          temperature: temp, // caller raises this on dry rounds for more variety
          max_tokens: 4000,
          ...(useJsonMode ? { response_format: { type: "json_object" } } : {}),
        }),
      });
    } catch (netErr) {
      return Response.json({ error: "Network error: " + netErr.message }, { status: 502 });
    }

    const bodyText = await res.text();
    let data = {};
    try { data = bodyText ? JSON.parse(bodyText) : {}; } catch { /* keep raw */ }
    if (!res.ok) {
      return Response.json({ error: friendly(res.status, data?.error?.message || bodyText) }, { status: res.status });
    }

    const content = data?.choices?.[0]?.message?.content || "{}";
    let parsed;
    try { parsed = JSON.parse(content); }
    catch { const m = content.match(/\{[\s\S]*\}/); parsed = m ? JSON.parse(m[0]) : { title: "", questions: [] }; }

    const questions = Array.isArray(parsed.questions)
      ? parsed.questions.filter(
          (q) => q && q.question && Array.isArray(q.options) &&
            q.options.filter(Boolean).length >= 2 && Number.isInteger(q.answer)
        )
      : [];

    return Response.json({ title: parsed.title || "Notes quiz", questions });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
