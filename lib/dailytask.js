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

import { counterDayKey } from "./qcounter";

const KEY = "cgl.dailytask";
export const TASKS = ["vocab", "ca"];

function read() {
  if (typeof window === "undefined") return { day: "", n: {} };
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "{}");
    const day = counterDayKey();
    // Din badal gaya — ginti nayi.
    if (v?.day !== day) return { day, n: {} };
    return { day, n: v.n && typeof v.n === "object" ? v.n : {} };
  } catch {
    return { day: counterDayKey(), n: {} };
  }
}

function write(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* quota */ }
  try { window.dispatchEvent(new CustomEvent("cgl:daily-changed")); } catch { /* SSR */ }
}

export function taskToday(task) { return read().n[task] || 0; }

export function taskCounts() {
  const { n } = read();
  return Object.fromEntries(TASKS.map((t) => [t, n[t] || 0]));
}

export function bumpTask(task, by = 1) {
  if (!TASKS.includes(task)) return 0;
  const st = read();
  st.n[task] = Math.max(0, (st.n[task] || 0) + by);
  write(st);
  return st.n[task];
}
