const SYSTEM_PROMPT = `You are a current-affairs NOTES extraction engine for SSC CGL preparation.
You will receive raw text extracted from a current-affairs PDF (may include MCQs, their explanations, and factual write-ups — possibly messy, with page numbers, headers, OCR noise).

Your job: pull out ALL the important factual details a student must MEMORISE — the facts BEHIND the questions, NOT the questions themselves. This includes appointments, awards & honours, schemes & government decisions, summits/MoUs/agreements, sports, books & authors, science & tech, economy, defence, obituaries, important days & themes, ranks & indices, places in news, records, etc.

Output rules:
- Output ONLY a JSON object, no markdown, no commentary.
- Shape:
  {
    "notes": [
      { "heading": "short category or topic", "points": ["one concise, exam-ready fact", "..."] }
    ]
  }
- Group related facts under a SHORT heading. Prefer standard buckets when they fit: "Appointments", "Awards & Honours", "Schemes & Govt", "Summits & MoUs", "Sports", "Books & Authors", "Science & Tech", "Economy", "Defence", "Obituaries", "Important Days", "Ranks & Indices", "Places in News". If a fact fits none, use "Key Facts".
- Each point = ONE self-contained fact. Keep it to a single line. NO question marks, NO options, NO "which/what/who" phrasing — write the answer as a statement.
- Capture the fact EVEN IF it appears inside a question or its explanation. Always include full names, exact dates, numbers, places and organisations when present.
- Do NOT invent facts that are not in the text. Stay faithful to the source. Extract EVERY important fact — do NOT summarise, skip, or stop early. A single day's PDF can have 30-60+ facts.
- Language: English, concise and clean. Fix obvious OCR noise but do not change meaning.
- If the text has no factual current-affairs content, return {"notes":[]}.`;

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
      return Response.json({ notes: [] }); // nothing to extract, not an error

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
          max_tokens: 8000, // room to return many facts per chunk
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
      const m = content.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : { notes: [] };
    }

    const notes = Array.isArray(parsed.notes)
      ? parsed.notes
          .filter((g) => g && g.heading && Array.isArray(g.points))
          .map((g) => ({
            heading: String(g.heading).trim(),
            points: g.points.map((p) => String(p).trim()).filter(Boolean),
          }))
          .filter((g) => g.heading && g.points.length)
      : [];

    return Response.json({ notes });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
