// 🔤📰 Vocab aur Current Affairs ki roz ki ginti.
//
// qcounter sirf chaar subject ginta hai (maths/reasoning/english/gs), aur wo
// theek hai — wo PYQ ke question ginta hai. Vocab aur CA question nahi hain,
// aadatein hain: roz thoda, warna bhool jaate ho. Par jo ginte nahi, wo hote
// bhi nahi — isliye inki bhi apni chhoti ginti.
//
// Din wahi jo qcounter ka hai (raat 12 baje naya), taaki homepage ke saare
// ring ek hi din ki baat karein.
//
// Ginti apne aap badhti hai:
//   vocab — vocab ka koi day/type quiz poora hone par (lib/vocab)
//   ca    — Current Affairs rush mein har jawab par (components/CurrentAffairsRush)
// Haath se kuch mark nahi karna padta; jo kaam kiya wahi ginta hai.
//
// Shakl qcounter jaisi hi hai — har device ka apna khaana:
//
//   { v: 2, byDev: [ { id, day, n: { vocab, ca } }, ... ] }
//
// Kyun, wo poora kissa lib/qcounter ke upar likha hai. Chhota roop: ek hi dabbe
// mein do device likhein to jo baad mein likhta hai wo pehle wale ka kaam mita
// deta hai. Alag khaane mein wo ho hi nahi sakta, aur "aaj kitne hue" sab
// khaanon ka jod hai.

import { counterDayKey } from "./qcounter";
import { deviceId } from "./deviceid";

const KEY = "cgl.dailytask";
export const TASKS = ["vocab", "ca"];

const emptyN = () => Object.fromEntries(TASKS.map((t) => [t, 0]));

function cleanN(raw) {
  const out = emptyN();
  if (!raw || typeof raw !== "object") return out;
  for (const t of TASKS) {
    const n = Number(raw[t]);
    out[t] = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  }
  return out;
}

function cleanDev(e, fallbackId) {
  return {
    id: String(e?.id || fallbackId),
    day: String(e?.day || counterDayKey()),
    n: cleanN(e?.n),
  };
}

function readState() {
  if (typeof window === "undefined") return { byDev: [] };
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(KEY) || "null"); } catch { raw = null; }
  if (raw && Array.isArray(raw.byDev)) {
    return { byDev: raw.byDev.map((e, i) => cleanDev(e, `d_old${i}`)) };
  }
  // Purana ek-dabba wala roop — is device ka khaana bana do, ginti bachi rahe.
  if (raw && (raw.n || raw.day)) {
    return { byDev: [cleanDev({ id: deviceId(), day: raw.day, n: raw.n })] };
  }
  return { byDev: [] };
}

function write(state) {
  try { localStorage.setItem(KEY, JSON.stringify({ v: 2, byDev: state.byDev })); }
  catch { /* quota */ }
  try { window.dispatchEvent(new CustomEvent("cgl:daily-changed")); } catch { /* SSR */ }
}

// Aaj ka jod — sab devices ka.
export function taskCounts() {
  const today = counterDayKey();
  const out = emptyN();
  for (const e of readState().byDev) {
    if (e.day !== today) continue;
    for (const t of TASKS) out[t] += e.n[t];
  }
  return out;
}

export function taskToday(task) { return taskCounts()[task] || 0; }

export function bumpTask(task, by = 1) {
  if (!TASKS.includes(task)) return 0;
  const state = readState();
  const id = deviceId();
  const today = counterDayKey();
  let me = state.byDev.find((x) => x.id === id);
  if (!me) { me = { id, day: today, n: emptyN() }; state.byDev.push(me); }
  // Din badla to sirf mera khaana 0 se — doosron ka waise hi, wo apne aap
  // sambhal lenge (aur aaj ke jod mein purane din wale ginte hi nahi).
  if (me.day !== today) { me.day = today; me.n = emptyN(); }
  me.n[task] = Math.max(0, me.n[task] + Math.trunc(by));
  write(state);
  return taskCounts()[task];
}
