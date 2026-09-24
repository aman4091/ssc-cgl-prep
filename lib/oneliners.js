// 📝 One-liners — overlay ke 📝 button se aayi ek-ek line, apni alag jagah.
//
// Kaam ka silsila: subject ka screenshot -> Gemini ka poora answer (wo Answers
// page par jata hai) -> usi chat mein one-liner ka prompt -> jo chhoti line
// aati hai wo YAHAN. Fact log (lib/missionfacts) aur Zaroori baatein
// (lib/sscpoints) se alag store hai — owner: "fact log mein mt bhej, alag
// page bana" — taaki unka revision is dher se na bhar jaye.
//
// `cgl.oneliners` — list of { id, subject, text, at }. Baaki cgl. keys ki
// tarah sync hoti hai, aur list hone ki wajah se har line apna record: do
// device par alag-alag judein to dono bachti hain.

import { storeGet, storeSet } from "./bigstore";

const KEY = "cgl.oneliners";

// Wahi "One-Liner Notes Maker" prompt jo PC overlay ke 📝 button par hai
// (over/storage.py ka ONELINER_PROMPT) — hubahu, taaki dono jagah ek jaisi
// line bane. Notes ke page ka ✨ button bhi yahi bhejta hai: pehle wahan
// GS wala (question wala) prompt jata tha, jisme saaf likha hai "kahani mat
// likho" — isliye notes par wo bilkul bekaar tha.
export const ONELINER_PROMPT = `Tum mere liye ek "One-Liner Notes Maker" ho. Main competitive exam ki tayari kar raha hoon aur apni copy mein short notes banata hoon revision ke liye.

Main tumhe koi bhi topic, rule, ya question dunga — English Grammar, General Studies (GS), ya Maths se. Tumhe uska sabse important point sirf EK LINE mein dena hai.

Rules:
1. Har point sirf 1 line ka ho (max 20-25 words). Koi lamba explanation nahi.
2. English Grammar -> rule + chhota sa example, jaise:
   "One of + plural noun + singular verb -> One of the boys IS absent."
3. GS -> sirf key fact (naam, saal, jagah, number), jaise:
   "Battle of Plassey - 1757 - Clive vs Siraj-ud-Daulah."
4. Maths -> hamesha do cheezein do:
   📐 Formula: (basic formula ek line mein)
   ⚡ Shortcut Trick: (exam mein fast solve karne wali trick ek line mein)
   Jaise:
   📐 Formula: CI = P(1 + R/100)^T - P
   ⚡ Shortcut Trick: 2 saal ka CI-SI difference = P × (R/100)²
5. Agar maths ka koi question dun, to pehle formula, fir shortcut trick, aur fir us trick se question 2-3 line mein solve karke dikhao, taaki main same type ka question khud kar sakun.
6. Agar topic mein kai important points hain, to har point alag line mein do (numbered), par har line one-liner hi rahe.
7. Language simple Hinglish ho, aur formula/rule clear ho.
8. Last mein "🧠 Yaad rakhne ki trick:" do, sirf agar koi aasan memory trick ho.

Mera topic neeche diya gaya hai:`;

export const OL_SUBS = [
  { k: "gs", label: "GS", icon: "🌍" },
  { k: "english", label: "English", icon: "📘" },
  { k: "math", label: "Maths", icon: "🔢" },
  { k: "reasoning", label: "Reasoning", icon: "🧠" },
];

export function subOf(k) {
  return OL_SUBS.find((s) => s.k === k) || { k: k || "gs", label: k || "GS", icon: "📝" };
}

function read() {
  if (typeof window === "undefined") return [];
  try {
    const v = JSON.parse(storeGet(KEY) || "[]");
    return Array.isArray(v) ? v.filter((o) => o && o.id && o.text) : [];
  } catch { return []; }
}

function write(list) {
  try { storeSet(KEY, JSON.stringify(list)); } catch { /* quota */ }
  try { window.dispatchEvent(new CustomEvent("cgl:oneliners-changed")); } catch { /* SSR */ }
}

export function getOneLiners() { return read(); }

/** Overlay se aayi ek line. -> naya record ya null (khali/duplicate par). */
export function addOneLiner({ subject, text }) {
  const t = String(text || "").trim();
  if (!t) return null;
  const list = read();
  // Wahi line dobara (overlay ne ack se pehle phir bhej di) — ek hi rahegi.
  if (list.some((o) => o.text.trim() === t)) return null;
  const o = {
    id: `ol_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    subject: OL_SUBS.some((s) => s.k === subject) ? subject : "gs",
    text: t.slice(0, 2000),
    at: new Date().toISOString(),
  };
  write([o, ...list]);
  return o;
}

export function removeOneLiner(id) { write(read().filter((o) => o.id !== id)); }

export function clearOneLiners() { write([]); }

/** Ek record ki alag-alag lines — popup aur list dono isi se bante hain. */
export function olLines(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

/** List mein dikhne wali pehli line — aage lagi ginti ("1.") hata ke. */
export function olTitle(o) {
  const first = olLines(o && o.text)[0] || "";
  return first.replace(/^\d+[.)]\s*/, "");
}

/** "🧠 Yaad rakhne ki trick:" wali line — popup mein alag se dikhti hai. */
export function isTrickLine(line) {
  return /^🧠|yaad rakhne ki trick/i.test(String(line || "").trim());
}
