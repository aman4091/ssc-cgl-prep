// Client-side importer: pulls your Telegram quiz MISSES (tg:wrong row in the same
// Supabase project) into the app — enrolls each as a proper MCQ flashcard in the
// /review revision system, and keeps a browsable local list ("konsa galat hua").
//
// Additive only: it reads the tg:wrong row and INSERTS into the SRS store; it
// never deletes your data. Dedup by a stable content key, so a re-miss of the
// same question doesn't pile up.

import { getSettings } from "./storage";
import { enroll } from "./srs";

const LIST_KEY = "cgl.tg.wrong";     // imported misses, newest first
const LAST_KEY = "cgl.tg.lastImport"; // ISO of the newest miss we've imported

function read(key, fb) {
  if (typeof window === "undefined") return fb;
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fb; } catch { return fb; }
}
function write(key, v) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* quota */ }
}

export function getTelegramWrong() { return read(LIST_KEY, []); }

const subjOf = (s) => (s === "vocab" ? "english" : s); // SRS/subject label

// Fetch tg:wrong from Supabase (same creds as sync), import anything newer than
// the last import. Returns how many new misses came in.
export async function importTelegramWrong() {
  if (typeof window === "undefined") return 0;
  const s = getSettings();
  const base = String(s.supabaseUrl || "").replace(/\/+$/, "");
  const keyH = s.supabaseAnonKey;
  if (!base || !keyH) return 0; // sync not configured — nothing to pull

  let rows;
  try {
    const url = `${base}/rest/v1/syncs?code=eq.${encodeURIComponent("tg:wrong")}&select=data`;
    const res = await fetch(url, {
      headers: { apikey: keyH, Authorization: `Bearer ${keyH}` },
      cache: "no-store",
    });
    if (!res.ok) return 0;
    rows = await res.json();
  } catch { return 0; }

  const remote = Array.isArray(rows) && rows[0] && rows[0].data && rows[0].data.items;
  if (!remote) return 0;
  const items = Object.values(remote); // keyed by poll_id -> array of misses

  const lastAt = read(LAST_KEY, "");
  const fresh = items
    .filter((it) => it && it.at && (!lastAt || it.at > lastAt))
    .sort((a, b) => String(a.at).localeCompare(String(b.at)));
  if (!fresh.length) return 0;

  const list = getTelegramWrong();
  const haveKeys = new Set(list.map((x) => x.key));
  let added = 0;
  let maxAt = lastAt;

  for (const it of fresh) {
    if (it.at > maxAt) maxAt = it.at;
    const key = it.subject + ":" + (it.pollId || it.question).slice(0, 80);
    // Enroll as an MCQ flashcard so it flows into /review (dobara dekhne ke liye).
    const q = {
      id: key,
      question: it.question,
      options: it.options,
      answer: it.answer,
      solution: it.solution || "",
      explanation: it.solution || "",
    };
    enroll({ kind: "q", ref: q, src: "tg-wrong", category: subjOf(it.subject), subject: subjOf(it.subject) });
    if (!haveKeys.has(key)) {
      haveKeys.add(key);
      list.unshift({
        key,
        subject: it.subject,
        question: it.question,
        options: it.options,
        answer: it.answer,
        chosen: it.chosen,
        solution: it.solution || "",
        at: it.at,
      });
      added += 1;
    }
  }

  write(LIST_KEY, list.slice(0, 500));
  write(LAST_KEY, maxAt);
  try { window.dispatchEvent(new CustomEvent("cgl:srs-changed")); } catch { /* SSR */ }
  return added;
}
