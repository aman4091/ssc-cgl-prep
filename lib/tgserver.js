// Server-only glue for the Telegram quiz feature. Runs in Next route handlers
// (Node, not the browser). Reuses the EXISTING `syncs` Supabase table — the
// quiz feature stores its state in three *separate* rows (codes tg:polls,
// tg:wrong, tg:state) so your own sync blob (code = your syncCode) is never
// touched.
//
// No new tables, no SQL. Same anon key + URL you already use for sync.

export const TG = {
  botToken: process.env.TELEGRAM_BOT_TOKEN || "",
  chatId: process.env.TELEGRAM_CHAT_ID || "",
  webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET || "",
  cronSecret: process.env.TG_CRON_SECRET || "",
  supaUrl: (process.env.SUPABASE_URL || "").replace(/\/+$/, ""),
  supaKey: process.env.SUPABASE_ANON_KEY || "",
  syncCode: process.env.TG_SYNC_CODE || "", // your sync code — to read your vocab
  postCount: Math.max(1, Number(process.env.TG_POST_COUNT || 15)),
  batch: Math.max(1, Math.min(200, Number(process.env.TG_BATCH || 100))), // /start batch size
  pollGapMs: Math.max(400, Number(process.env.TG_POLL_GAP_MS || 1200)),   // gap between sends
  // which subjects to draw from, comma-sep. default: all three.
  subjects: (process.env.TG_SUBJECTS || "vocab,english,gs")
    .split(",").map((s) => s.trim()).filter(Boolean),
};

export function tgConfigured() {
  return Boolean(TG.botToken && TG.chatId && TG.supaUrl && TG.supaKey);
}

function supaHeaders() {
  return {
    "Content-Type": "application/json",
    apikey: TG.supaKey,
    Authorization: `Bearer ${TG.supaKey}`,
  };
}

// Read one syncs row's `data` object by code. null if missing.
export async function supaGet(code) {
  const url = `${TG.supaUrl}/rest/v1/syncs?code=eq.${encodeURIComponent(code)}&select=data`;
  const res = await fetch(url, { headers: supaHeaders(), cache: "no-store" });
  if (!res.ok) throw new Error(`supaGet ${code} failed ${res.status}`);
  const rows = await res.json();
  return Array.isArray(rows) && rows[0] ? rows[0].data || null : null;
}

// Upsert one syncs row (merge-duplicates on the unique `code`).
export async function supaPut(code, data) {
  const res = await fetch(`${TG.supaUrl}/rest/v1/syncs`, {
    method: "POST",
    headers: { ...supaHeaders(), Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ code, data, updated_at: new Date().toISOString() }),
  });
  if (!res.ok) throw new Error(`supaPut ${code} failed ${res.status}: ${(await res.text()).slice(0, 160)}`);
}

// Read one localStorage key out of YOUR synced blob (via TG_SYNC_CODE), JSON-parsed.
// Returns `fallback` if sync is off / key missing / parse fails.
export async function readSynced(key, fallback = null) {
  if (!TG.syncCode) return fallback;
  const data = await supaGet(TG.syncCode).catch(() => null);
  const ls = data && data.localStorage ? data.localStorage : {};
  try {
    const raw = ls[key];
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

// Your vocab (cgl.vocab.ows) out of YOUR synced blob. [] if not synced yet.
export async function readVocabOws() {
  const arr = await readSynced("cgl.vocab.ows", []);
  return Array.isArray(arr) ? arr : [];
}

// Your app-added questions ("📁 Save to a chapter") out of the synced blob.
// { chapters:[{id,subject,name}], questions:{[chapterId]:[MCQ]} }. Empty if unsynced.
export async function readCustomChapters() {
  const [chapters, questions] = await Promise.all([
    readSynced("cgl.study.chapters", []),
    readSynced("cgl.study.questions", {}),
  ]);
  return {
    chapters: Array.isArray(chapters) ? chapters : [],
    questions: questions && typeof questions === "object" ? questions : {},
  };
}

// Call a Telegram Bot API method. Throws on non-ok so the caller can log it.
export async function tgApi(method, body) {
  const res = await fetch(`https://api.telegram.org/bot${TG.botToken}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!json.ok) throw new Error(`tg ${method}: ${json.description || res.status}`);
  return json.result;
}

// Like tgApi but never throws — returns the raw Telegram response so callers can
// read `parameters.retry_after` on a 429 (flood control) and back off.
export async function tgSend(method, body) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${TG.botToken}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return await res.json().catch(() => ({ ok: false }));
  } catch (e) {
    return { ok: false, description: String(e.message || e) };
  }
}
