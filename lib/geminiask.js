// Question ki TASVEER Gemini tak pahunchane ka poora tareeka, ek hi jagah.
//
// KYUN image: maths aur reasoning bank ke question crops hain — fractions,
// figures, diagrams. Unka text (qText) lossy hota hai, aur non-verbal reasoning
// mein to text hai hi nahi ("A) a B) b C) c D) d"). Aisa text bhejne par jo
// jawab aata hai wo gadha hua hota hai. Tasveer bhejne par question jaisa hai
// waisa hi jata hai.
//
// KYUN ye do-kadam ka natak: clipboard par ek waqt mein EK hi cheez rehti hai.
// Image chali gayi to prompt saath nahi ja sakta. Isliye Answers page wali chaal
// — Gemini kholte waqt nishaan laga do, aur user jab is tab par WAPAS aata hai
// to prompt apne aap copy kar do. Wapas aana user waise bhi karta hai (answer
// paste karne), isliye ismein koi extra kaam nahi padta.
import { getSettings } from "./storage";
import { copyImageToClipboard, imageBlob } from "./imgclip";

export function toast(msg) {
  try { window.dispatchEvent(new CustomEvent("cgl:toast", { detail: msg })); } catch { /* ignore */ }
}

// Settings ka prompt, aur SIRF Settings ka: pehle is subject ka apna, warna
// generic. Koi code-side default nahi — pehle yahan ek fallback line thi, aur
// wo chupke se har jagah lag jati thi (notes ke page par bhi), isliye Settings
// mein kuch bhi likho farak hi nahi padta tha. Khaali ka matlab khaali hai:
// sirf question/page ka text copy hoga.
export function promptFor(subject, promptKey = "geminiPrompt") {
  const st = getSettings();
  const per = String((st.shortcutPrompts || {})[subject] || "").trim();
  return per || String(st[promptKey] || "").trim();
}

// Q par tasveer hai?
//
// Teen shakl hain, aur teeno dekhni PADTI hain — ek bhi chhoot jaye to us bank
// ka question chupchaap TEXT ban kar chala jata hai, aur uska text hi to toota
// hua hota hai (isi wajah se to wo tasveer hai).
//   • `qImg`   — Pinnacle maths/reasoning bank (lib/mathbank, lib/reasonbank)
//   • `img`    — SSC Maths 2025 ke crop (lib/sscmaths). Yahi chhoot raha tha:
//                geometry aur pie-chart wale question ka poora sawaal isi image
//                mein hota hai, par ✨ Gemini uska adhoora text bhej deta tha.
//   • `images` — wrong-book / Answers page ka record
export function questionImage(q) {
  if (q?.qImg) return { url: q.qImg };
  if (q?.img) return { url: q.img };
  const im = Array.isArray(q?.images) ? q.images.find((i) => i && (i.url || i.id)) : null;
  if (im) return im;
  // Aakhri raasta: question ke text ke ANDAR chipki hui markdown image
  // (![](url)) — user ke apne banaye question aise hi aate hain.
  const m = /!\[[^\]]*\]\(\s*<?([^\s)>]+)>?\s*\)/.exec(String(q?.question || ""));
  return m ? { url: m[1] } : null;
}

// Ek hi focus-listener poore app ke liye — har card apna lagata to sau listener
// ban jate aur prompt kai baar copy hota.
let pending = "";
let listening = false;
export function armPrompt(text) {
  pending = text || "";
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("focus", async () => {
    if (!pending) return;
    const t = pending;
    pending = "";
    try {
      await navigator.clipboard.writeText(t);
      toast("📋 Prompt copy ho gaya — Gemini mein paste karke bhejo");
    } catch { /* user apne aap likh lega */ }
  });
}

// Click ke gesture ke ANDAR hi chalao — copyImageToClipboard browser ke gesture
// par tika hai (isliye blob ko await nahi karta, lazily uthata hai).
// -> true jab image clipboard par chali gayi.
export async function copyQuestionImage(q) {
  const im = questionImage(q);
  if (!im) return false;
  return copyImageToClipboard(() => imageBlob(im));
}
