const SYSTEM_PROMPT = `You are an answer-verification engine for SSC CGL quiz questions.
You will receive a numbered list of multiple-choice questions. Each one has options (A, B, C, D...) and the answer that is CURRENTLY marked as correct.

Your job: for EACH question, decide the actually-correct option and how confident you are.

Rules:
- Output ONLY a JSON object, no markdown, no commentary.
- Shape:
  {
    "results": [
      { "i": 0, "correct": 2, "confidence": "high", "reason": "one short line why" }
    ]
  }
- "i" = the question number given (0-based). Include EVERY question, in order.
- "correct" = 0-based index of the option you believe is correct.
- "confidence":
  - "high" — you are sure (you can solve/derive it, or it is well-established general knowledge).
  - "low" — you are NOT sure. Use this for recent/date-specific current-affairs facts (awards, appointments, events of a specific year) that you cannot reliably confirm. When unsure, set "correct" to the CURRENTLY-marked answer and confidence "low" — do NOT guess a different option.
- Be honest. It is much better to say "low" than to confidently change a factual answer you are not certain about.
- "reason" = one short line. For math, show the key step/result. For facts, state the fact.
- Do not rewrite questions or options. Only judge the correct index.`;

function friendly(status, raw) {
  if (status === 401) return "Invalid API key (401) — Settings mein sahi DeepSeek key daalo.";
  if (status === 402) return "Insufficient balance (402) — DeepSeek account mein credit daalo.";
  if (status === 429) return "Rate limit (429) — thodi der baad try karo.";
  return raw || `DeepSeek HTTP ${status}`;
}

export async function POST(req) {
  try {
    const { questions, apiKey, model, baseUrl } = await req.json();

    if (!apiKey || !apiKey.trim())
      return Response.json({ error: "API key missing. Settings mein daalo." }, { status: 400 });
    if (!Array.isArray(questions) || questions.length === 0)
      return Response.json({ results: [] });

    // Compact prompt: number each question with its options + current answer.
    const listed = questions.map((q, i) => {
      const opts = (q.options || []).map((o, oi) => `${String.fromCharCode(65 + oi)}) ${o}`).join("\n");
      const cur = q.answer != null ? String.fromCharCode(65 + q.answer) : "?";
      return `Q${i}. ${q.question}\n${opts}\nCurrently marked correct: ${cur}`;
    }).join("\n\n");

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
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: "Verify these questions:\n\n" + listed },
          ],
          temperature: 0,
          max_tokens: 8000,
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
    catch { const m = content.match(/\{[\s\S]*\}/); parsed = m ? JSON.parse(m[0]) : { results: [] }; }

    const results = Array.isArray(parsed.results)
      ? parsed.results
          .filter((r) => r && Number.isInteger(r.i) && Number.isInteger(r.correct))
          .map((r) => ({
            i: r.i,
            correct: r.correct,
            confidence: r.confidence === "high" ? "high" : "low",
            reason: String(r.reason || "").trim(),
          }))
      : [];

    return Response.json({ results });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
