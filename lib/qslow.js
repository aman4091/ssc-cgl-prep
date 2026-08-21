// ⏱️ Time khaane wale question — sirf Maths aur Reasoning.
//
// SSC ka paper raftaar ka imtihaan hai. Ek Maths/Reasoning ka question 60
// second se zyada khaa gaya to wo question galat ho ya sahi, nuksaan usne kar
// hi diya — kyunki utni der mein do aur ho sakte the. Isliye yahan jama hone
// ki SIRF ek shart hai: waqt. Sahi kiya, galat kiya, ya dekh kar chhod diya —
// teeno isi list mein aate hain.
//
// Mistake Notebook (lib/qreview) se ye alag kyun:
//   Notebook GALTIYON ka hai — wahan sahi kiya hua question naya record banata
//   hi nahi. Yahan sahi kiye hue slow question hi sabse zaroori hain: wo wahi
//   hain jinhe aap kar to lete ho, par mehnga padta hai. Isliye apna store.
//
// English/GS jaan-boojh kar bahar hain: wo padhne wale subject hain, wahan der
// lagna raftaar ki galti nahi hai.

import { keyFor } from "./qstats";
import { storeGet, storeSet, storeRemove } from "./bigstore";

const KEY = "cgl.qslow";

// Lakeer. Isse UPAR gaya to hi record banta hai (60 theek par nahi).
export const SLOW_SEC = 60;

// `maths` bhi isliye ki lib/userpyq.js ki ek shelf usi hijje se likhi hai;
// baaki poora app `math` bolta hai (qcounter ke COUNTER_SUBJECTS).
const SUBJECTS = new Set(["math", "maths", "reasoning"]);
export function isSlowSubject(s) {
  return SUBJECTS.has(String(s || "").toLowerCase());
}

function read() {
  if (typeof window === "undefined") return [];
  try { const r = storeGet(KEY); return r ? JSON.parse(r) : []; }
  catch { return []; }
}
function write(v) {
  try { storeSet(KEY, JSON.stringify(v)); } catch { /* quota */ }
  try { window.dispatchEvent(new CustomEvent("cgl:qslow-changed")); } catch { /* SSR */ }
}

export function getSlow() { return read(); }

// Poore test ka hisaab ek saath — ek hi write, ek hi event.
// items: [{ q, subject, category, sec, outcome }]
//   sec     — is baar is question par kitne second lage (0 = pata nahi/khola hi nahi)
//   outcome — "right" | "wrong" | "skip"
//
// Question ki pehchaan wahi hai jo qstats/qreview ki hai (keyFor), isliye ek
// hi question chahe chapter se aaye ya generated quiz se, record ek hi banta
// hai aur dobara dene par wahi sudhar jata hai.
export function recordSlow(items) {
  const all = read();
  const now = new Date().toISOString();
  let changed = false;

  for (const it of items || []) {
    if (!it || !it.q || !isSlowSubject(it.subject)) continue;
    const sec = Math.round(Number(it.sec) || 0);
    // 0 second ka matlab hai question khola hi nahi gaya (QBoard sirf us
    // question ka waqt ginta hai jispar aap the). Bina dekhe chhoda hua
    // question "slow" nahi hai.
    if (sec <= 0) continue;
    const k = keyFor(it.q);
    if (!k || k === "::") continue;

    const i = all.findIndex((r) => r.key === k);
    const prev = i >= 0 ? all[i] : null;

    if (sec <= SLOW_SEC) {
      // Ab lakeer ke andar aa gaya. Record MITAATE nahi — yahi to sudhar ka
      // saboot hai. Bas `fixed` lag jata hai aur wo list se hat kar stats mein
      // "✅ Tez ho gaye" ban jata hai. Dobara slow hua to fixed apne aap
      // hat jayega (neeche wali branch).
      if (!prev) continue;
      all[i] = { ...prev, sec, outcome: it.outcome || prev.outcome, fixed: true, at: now };
      changed = true;
      continue;
    }

    all[i >= 0 ? i : all.length] = {
      key: k,
      q: it.q,
      subject: String(it.subject || "").toLowerCase() === "maths" ? "math" : it.subject,
      category: it.category || prev?.category || "",
      // Is baar kitna laga.
      sec,
      // Ab tak ka sabse bura — sudhar sirf tab dikhta hai jab pata ho ki
      // shuruaat kahan se hui thi.
      worstSec: Math.max(sec, prev?.worstSec || 0),
      outcome: it.outcome || "skip",
      // Kitni baar ye question 60 paar kar chuka hai. 3-4 baar wala question
      // "thoda dheela" nahi hai — wahan concept hi nahi baitha.
      hits: (prev?.hits || 0) + 1,
      fixed: false,
      firstAt: prev?.firstAt || now,
      at: now,
    };
    changed = true;
  }

  if (changed) write(all);
}

export function removeSlow(key) {
  const all = read();
  const next = all.filter((r) => r.key !== key);
  if (next.length !== all.length) write(next);
}

export function clearSlow() {
  try { storeRemove(KEY); } catch { /* ignore */ }
  try { window.dispatchEvent(new CustomEvent("cgl:qslow-changed")); } catch { /* SSR */ }
}
