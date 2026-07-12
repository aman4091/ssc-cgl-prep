// Pomodoro study tracker. Persists focused study time per day + session counts
// so the navbar timer can show "aaj kitna padha". All local (localStorage).
const KEY = "cgl.pomodoro";

function keyOf(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function todayKey() { return keyOf(new Date()); }

function read() {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
function write(o) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(KEY, JSON.stringify(o)); } catch { /* quota */ }
}

// Add focused seconds to today's total (called as the timer runs).
export function addFocusSeconds(sec) {
  const n = Math.floor(sec);
  if (!n || n <= 0) return;
  const o = read();
  o.days = o.days || {};
  const k = todayKey();
  o.days[k] = (o.days[k] || 0) + n;
  o.totalSeconds = (o.totalSeconds || 0) + n;
  write(o);
}

// Mark one completed focus session (one finished pomodoro).
export function completeSession() {
  const o = read();
  o.sessions = o.sessions || {};
  const k = todayKey();
  o.sessions[k] = (o.sessions[k] || 0) + 1;
  write(o);
}

export function getTodaySeconds() { const o = read(); return (o.days && o.days[todayKey()]) || 0; }
export function getTodaySessions() { const o = read(); return (o.sessions && o.sessions[todayKey()]) || 0; }
export function getTotalSeconds() { const o = read(); return o.totalSeconds || 0; }

export function getWeekSeconds() {
  const o = read();
  const days = o.days || {};
  let sum = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    sum += days[keyOf(d)] || 0;
  }
  return sum;
}

export function fmtDuration(sec) {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m`;
  return `${s}s`;
}
