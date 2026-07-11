function friendly(status, raw) {
  if (status === 401) return "Invalid API key (401) — key galat hai ya expire ho gayi.";
  if (status === 402) return "Insufficient balance (402) — DeepSeek account mein credit daalo.";
  if (status === 429) return "Rate limit (429) — thodi der baad try karo.";
  if (status === 400) return "Bad request (400) — " + (raw || "request galat hai.");
  return raw || `HTTP ${status}`;
}

export async function POST(req) {
  try {
    const { apiKey, model, baseUrl } = await req.json();
    if (!apiKey || !apiKey.trim()) {
      return Response.json({ error: "API key khaali hai. Settings mein daalo." }, { status: 400 });
    }

    const url = (baseUrl || "https://api.deepseek.com").replace(/\/$/, "") + "/chat/completions";

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
          messages: [{ role: "user", content: 'Reply with exactly: OK' }],
          max_tokens: 10,
        }),
      });
    } catch (netErr) {
      return Response.json(
        { error: "Network error — internet ya baseUrl check karo: " + netErr.message },
        { status: 502 }
      );
    }

    const text = await res.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { /* keep text */ }

    if (!res.ok) {
      const rawMsg = data?.error?.message || text;
      return Response.json({ error: friendly(res.status, rawMsg) }, { status: res.status });
    }

    const reply = data?.choices?.[0]?.message?.content?.trim() || "OK";
    return Response.json({ ok: true, reply });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
