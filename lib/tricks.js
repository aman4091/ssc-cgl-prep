// 🪄 Yaad rakhne ki trick — fact log aur Zaroori baatein ke liye.
//
// Fact padh lene se yaad nahi hota; trick se hota hai ("VIBGYOR", "Kerala ka
// KMT…"). Isliye har fact/baat ke saath uski apni trick bach sakti hai:
// ✨ wale button se laa kar paste ki hui, ya 🐋 DeepSeek se mangwayi hui.
//
// `cgl.tricks` — { [card id]: "trick" }. Baaki cgl. keys ki tarah sync hoti
// hai, aur har card apna record (M:<id>), isliye do device par alag-alag
// trick bane to dono bachti hain.

import { storeGet, storeSet } from "./bigstore";

const KEY = "cgl.tricks";

// Wahi prompt dono jagah (✨ clipboard par, 🐋 API par) — jawab ek jaisa rahe.
export const TRICK_PROMPT = [
  "Neeche ek fact hai jo mujhe SSC exam ke liye hamesha ke liye yaad rakhna hai.",
  "Iski ek aasaan TRICK banao — Hinglish mein (Roman script).",
  "",
  "Niyam:",
  "- Trick CHHOTI ho aur ek baar padhne mein chipak jaye. Kahani nahi, lambi bhoomika nahi.",
  "- List/cluster ho to har item ka pehla akshar jodkar ek shabd ya chhota vaakya banao,",
  "  aur uske neeche ek-ek akshar kis item ka hai wo dikhao.",
  "- Number/saal ho to unhe kisi jaane-pehchane cheez se jodo.",
  "- Koi naya fact mat ghadho — sirf jo diya hai usi ki trick.",
  "",
  "Is shakl mein jawab do:",
  "🪄 TRICK: <ek line>",
  "🔑 Kaise: <2-4 chhoti line, har akshar/hissa kis cheez ka hai>",
  "",
  "Fact:",
].join("\n");

export const trickPromptFor = (text) => `${TRICK_PROMPT}\n${String(text || "").trim()}`;

function read() {
  if (typeof window === "undefined") return {};
  try {
    const v = JSON.parse(storeGet(KEY) || "{}");
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch { return {}; }
}
function write(map) {
  try { storeSet(KEY, JSON.stringify(map)); } catch { /* quota */ }
  try { window.dispatchEvent(new CustomEvent("cgl:tricks-changed")); } catch { /* SSR */ }
}

export function getTrick(id) { return read()[id] || ""; }

export function saveTrick(id, text) {
  const t = String(text || "").trim();
  if (!id || !t) return;
  const all = read();
  all[id] = t.slice(0, 2000);
  write(all);
}

export function clearTrick(id) {
  const all = read();
  if (!(id in all)) return;
  delete all[id];
  write(all);
}
