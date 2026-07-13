// Minimal Google Gemini (Generative Language API) helper — used only for the
// shortcut trick. Plain fetch, no SDK.

function friendly(status, raw) {
  if (status === 400) return "Gemini: bad request / invalid API key (400).";
  if (status === 403) return "Gemini: API key not allowed (403) — check the key.";
  if (status === 404) return "Gemini: model not found (404) — fix the model id in Settings.";
  if (status === 429) return "Gemini: rate limit (429) — try again shortly.";
  return raw || `Gemini HTTP ${status}`;
}

export async function geminiChat({ apiKey, model, system, user, temperature = 0.2 }) {
  const mdl = (model || "gemini-3-pro").trim();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${mdl}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: user }] }],
    generationConfig: { temperature, maxOutputTokens: 4096 },
  };
  let res;
  try {
    res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } catch (e) {
    return { ok: false, status: 502, error: "Gemini network error: " + e.message };
  }
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { /* keep raw */ }
  if (!res.ok) return { ok: false, status: res.status, error: friendly(res.status, data?.error?.message || text) };
  const content = (data?.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("").trim();
  return { ok: true, content };
}

// Vision: send one or more images (base64) plus an instruction, get JSON back.
// images: [{ data: "<base64, no data: prefix>", mimeType }]. Used to read
// one-liner GK tables straight from the page image (far better than OCR).
export async function geminiVision({ apiKey, model, system, userText, images = [], temperature = 0.2, maxOutputTokens = 8192, responseMimeType = "application/json" }) {
  const mdl = (model || "gemini-3-pro").trim();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${mdl}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const parts = [];
  if (userText) parts.push({ text: userText });
  for (const im of images) {
    if (im && im.data) parts.push({ inlineData: { mimeType: im.mimeType || "image/jpeg", data: im.data } });
  }
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts }],
    generationConfig: { temperature, maxOutputTokens, responseMimeType },
  };
  let res;
  try {
    res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  } catch (e) {
    return { ok: false, status: 502, error: "Gemini network error: " + e.message };
  }
  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { /* keep raw */ }
  if (!res.ok) return { ok: false, status: res.status, error: friendly(res.status, data?.error?.message || text) };
  const content = (data?.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("").trim();
  return { ok: true, content };
}
