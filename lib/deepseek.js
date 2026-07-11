// Server-side helper for DeepSeek (OpenAI-compatible) chat completions.

export function friendlyError(status, raw) {
  if (status === 401) return "Invalid API key (401) — Settings mein sahi DeepSeek key daalo.";
  if (status === 402) return "Insufficient balance (402) — DeepSeek account mein credit daalo.";
  if (status === 429) return "Rate limit (429) — thodi der baad try karo.";
  if (status === 400) return "Bad request (400) — " + (raw || "request galat hai.");
  return raw || `DeepSeek HTTP ${status}`;
}

// Returns { ok, content, status, error }
export async function deepseekChat({
  apiKey,
  model,
  baseUrl,
  messages,
  temperature = 0.3,
  jsonMode = false,
  maxTokens,
}) {
  if (!apiKey || !apiKey.trim()) {
    return { ok: false, status: 400, error: "API key missing. Settings mein daalo." };
  }

  const url = (baseUrl || "https://api.deepseek.com").replace(/\/$/, "") + "/chat/completions";
  const useJson = jsonMode && (model || "deepseek-chat").includes("chat");

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
        messages,
        temperature,
        ...(maxTokens ? { max_tokens: maxTokens } : {}),
        ...(useJson ? { response_format: { type: "json_object" } } : {}),
      }),
    });
  } catch (netErr) {
    return { ok: false, status: 502, error: "Network error: " + netErr.message };
  }

  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { /* keep raw text */ }

  if (!res.ok) {
    return { ok: false, status: res.status, error: friendlyError(res.status, data?.error?.message || text) };
  }

  const content = data?.choices?.[0]?.message?.content || "";
  return { ok: true, content, status: 200 };
}

// Robust JSON extraction from a model reply.
export function parseJsonLoose(content) {
  try {
    return JSON.parse(content);
  } catch {
    const m = content.match(/\{[\s\S]*\}/);
    if (m) {
      try { return JSON.parse(m[0]); } catch { /* fall through */ }
    }
    return null;
  }
}
