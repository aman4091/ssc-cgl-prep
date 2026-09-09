// Naye word ka chhota matlab — DeepSeek se, background mein.
//
// Overlay ki vocab patti par ek word aur uske neeche do line ki jagah hai.
// Tumhari paste ki hui meaning wahan kaam nahi aati: wo poori samjhaish hai
// (paragraph), aur uski pehli line kaat kar lagane se aksar aadha-adhoora
// matlab dikhta tha. Isliye khud pakde hue word ke liye seedha do line ka
// matlab banwa lete hain, aur patti par wahi jata hai.
//
// Jab tak kisi word ka matlab nahi bana, wo kisi din mein jata hi nahi
// (lib/vocab ka vocabLineList dekho) — patti par khali word dikhane se kuch
// nahi milta.
//
// Chalta chupchaap hai: ek baar mein 20 word, do batch ke beech ek minute ka
// faasla, aur key na ho to kuch bhi nahi. Fail ho jaye to agli baar phir
// koshish — koi shor nahi.

import { getSettings } from "./storage";
import { newWordsMissingLine, addVocabLines } from "./vocab";

const BATCH = 20;
const GAP_MS = 60000;

let nextAt = 0;
let busy = false;

/**
 * Ek batch bana do. -> kitne naye matlab bane (0 = kuch nahi hua).
 *
 * `force` waqt ka faasla tod deta hai — Settings ke button ke liye.
 */
export async function fillVocabLines({ force = false, limit = BATCH } = {}) {
  if (busy) return 0;
  const now = Date.now();
  if (!force && now < nextAt) return 0;

  const s = getSettings();
  if (!s.apiKey) return 0;              // key hi nahi — chupchaap ruk jao

  const words = newWordsMissingLine(limit);
  if (!words.length) return 0;

  busy = true;
  nextAt = now + GAP_MS;
  try {
    const res = await fetch("/api/vocab-lines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        words, apiKey: s.apiKey, model: s.model, baseUrl: s.baseUrl,
      }),
    });
    if (!res.ok) return 0;
    const { lines } = await res.json();
    return addVocabLines(lines || {});
  } catch {
    return 0;                            // net gaya — agli baar phir
  } finally {
    busy = false;
  }
}

/** Kitne word abhi matlab ke intezaar mein hain. */
export function pendingVocabLines() {
  return newWordsMissingLine(9999).length;
}
