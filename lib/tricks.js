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
  "Iski ek aisi TRICK banao jo sach mein yaad reh jaye — Hinglish mein (Roman script).",
  "",
  "SABSE ZAROORI NIYAM:",
  "- Sirf pehle akshar jod kar BEMAANI shabd mat banao (CLWH jaisa). Agar akshar hi",
  "  yaad karne hote to main list hi yaad kar leta — usme trick ka kya kaam.",
  "- Trick ek CHHOTA HINGLISH VAAKYA ho jiska apna matlab bane aur dimaag mein",
  "  tasveer ban jaye — hasne layak, ajeeb, ya chhoti kahani jaisa.",
  "- Har naam us vaakya mein apni AAWAZ se aaye (sound-alike), akshar se nahi:",
  "  Chilika -> chillana, Loktak -> log tak, Wular -> woolen, Harike -> har ek.",
  "- Akshar wali trick banani hi ho to wo ek ASLI shabd ya naam ho jiska matlab ho.",
  "- Number ya saal ho to kisi jaani-pehchani cheez se jodo (umar, cricket score).",
  "- Koi naya fact mat ghadho — sirf jo diya hai usi ki trick.",
  "- Chhota rakho. Lambi kahani, bhoomika ya explanation nahi.",
  "",
  "Is shakl mein jawab do:",
  "🪄 TRICK: <ek chhota vaakya — yahi yaad rakhna hai>",
  "🔑 Kaise: <vaakya ka kaunsa hissa kis cheez ke liye hai — ek-ek, · se alag>",
  "💡 Tasveer: <ek line — dimaag mein kya drishya banega>",
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

// AI ka jawab ek hi saans mein aata hai — "🪄 TRICK: …" wali line, phir
// "🔑 Kaise: C = Chilika · L = Loktak · …" wali. Markdown ek nayi line
// ko todta nahi (use do chahiye), isliye sab ek paragraph ban kar chipak
// jata tha — trick padhi hi nahi jati thi.
//
// Yahan har line apni line par aati hai, aur jis line mein " · " se judi
// teen ya zyada cheezein hain wo bullet ban jati hai (uska label, jaise
// "🔑 Kaise:", upar rehta hai).
export function tidyTrick(raw) {
  const lines = String(raw || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  // Blocks: har tukda ya to ek line hai ya bullets ki ek list. Do block ke
  // beech khali line — warna bullet ke neeche wali line usi bullet mein
  // chipak jati hai (markdown ka "lazy continuation").
  const blocks = [];
  for (const ln of lines) {
    const parts = ln.split(/\s+[·•]\s+/);
    if (parts.length >= 3) {
      const head = parts.shift();
      const m = /^(.*?:)\s*(.*)$/.exec(head);
      if (m && m[2]) { blocks.push(m[1]); parts.unshift(m[2]); }
      else parts.unshift(head);
      blocks.push(parts.map((x) => `- ${x}`).join("\n"));
    } else {
      blocks.push(ln);
    }
  }
  return blocks.join("\n\n");
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
