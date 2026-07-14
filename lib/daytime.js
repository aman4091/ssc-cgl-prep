// Day boundary + focus window for a late sleeper. The "day" rolls over at the
// configured day-end time (not midnight), and the Focus Enforcer only nags while
// you're inside the active [dayStart, dayEnd] window.
import { getSettings } from "./storage";

function parseHM(s, fallback) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || "").trim());
  if (!m) return fallback;
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)));
  const mm = Math.min(59, Math.max(0, parseInt(m[2], 10)));
  return h * 60 + mm;
}

export function dayEndMinutes() { return parseHM(getSettings().dayEndTime, 2 * 60); }   // default 02:00
export function dayStartMinutes() { return parseHM(getSettings().dayStartTime, 8 * 60); } // default 08:00

// Local date key that rolls over at day-end (e.g. with day-end 03:00, anything
// before 3am still belongs to the previous calendar day). Returns "YYYY-MM-DD".
export function dayKey(date = new Date()) {
  const shifted = new Date(date.getTime() - dayEndMinutes() * 60 * 1000);
  const y = shifted.getFullYear();
  const m = String(shifted.getMonth() + 1).padStart(2, "0");
  const d = String(shifted.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Are we inside the waking/active window? Handles a window that wraps past midnight
// (e.g. 08:00 → 02:00). If start === end it's treated as always-on (24h).
export function inFocusWindow(date = new Date()) {
  const now = date.getHours() * 60 + date.getMinutes();
  const s = dayStartMinutes(), e = dayEndMinutes();
  if (s === e) return true;
  if (s < e) return now >= s && now < e;
  return now >= s || now < e;
}
