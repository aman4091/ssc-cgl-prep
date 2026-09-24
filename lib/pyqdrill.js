// PYQ drill ka hisaab — har chapter ke liye do cheezein:
//
//   q      — har question par "aata hai" kitni baar laga aur "nahi aata"
//            kitni baar. Gap har galti par badhta hai (3, 4, 5 …), isliye
//            ginti bachni chahiye warna har baar 3 se shuru ho jata.
//   order  — QATAAR ka poora kram, list ke andar ke number (index) ki shakl
//            mein. Isi se site band karke kholne par wahi se shuru hota hai
//            jahan chhoda tha: question 5 par "nahi aata" dabaya to agli baar
//            6 se shuru hoga aur 5 apne gap ke baad wahin aayega.
//
// order index rakhta hai, question ka naam nahi — 387 question ke chapter
// mein naam rakhne par record 30 KB ka ho jata (har baar sync bhi hota).
// Chapter ki list badal jaye (naye question aa gaye) to `n` na milne par
// kram chhod diya jata hai; ginti (q) phir bhi bachi rehti hai.
//
// `cgl.pyqdrill` — baaki cgl. keys ki tarah sync hoti hai; har chapter apna
// record (M:<chapter>), isliye ek chapter chalane se sirf wahi record jata
// hai.

import { storeGet, storeSet } from "./bigstore";

const KEY = "cgl.pyqdrill";

function read() {
  if (typeof window === "undefined") return {};
  try {
    const v = JSON.parse(storeGet(KEY) || "{}");
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch { return {}; }
}
function write(map) { storeSet(KEY, JSON.stringify(map)); }

// Purana roop seedha { qkey: {k, m} } tha. Naya { q, order, n } hai.
function chRec(all, chapter) {
  const r = all[chapter];
  if (!r || typeof r !== "object") return { q: {}, order: null, n: 0 };
  if (r.q) return { q: r.q || {}, order: r.order || null, n: r.n || 0 };
  return { q: r, order: null, n: 0 };
}

// Question ki pehchaan: bank ka id, warna question ka text (tasveer wale
// bank mein id hi hota hai).
export const qKeyOf = (q) => String(q?.id || q?.qid || (q?.question || "").slice(0, 80));

export function getDrill(chapter) {
  return chRec(read(), chapter).q;
}

// Bachaya hua kram — har question ki CHHOTI pehchaan (uski key ka hash).
//
// Pehle yahan list ke number (index) rakhe the aur `n` (list ki lambai) se
// milaan hota tha. Uska matlab tha: list mein ek question bhi juda ya hata
// (Answers board mein roz hota hai, chapter mein bhi) to poora kram gir
// jata tha — qataar shuru se, gap phir 3 se.
//
// Hash isliye, poori key nahi: 400 question wale chapter mein keys ka
// record 30 KB ka ho jata aur har jawab par sync hota. Hash 7-8 akshar ka
// hai, aur takraane par bas ek card galat jagah baithega — kram nahi tootega.
export function getOrder(chapter, n) {
  const r = chRec(read(), chapter);
  const ord = r.order;
  if (!Array.isArray(ord) || !ord.length) return null;
  // Purane record number (list ka index) rakhte the. Unhe phenkte nahi:
  // agar list ki lambai wahi hai to wo number aaj bhi usi question par
  // ungli rakhte hain — PyqDrill dono shakl padh leta hai.
  if (typeof ord[0] === "number") return r.n === n ? ord : null;
  return ord;
}

export function saveOrder(chapter, order, n) {
  const all = read();
  const r = chRec(all, chapter);
  all[chapter] = { q: r.q, order, n };
  write(all);
}

export function markDrill(chapter, q, good) {
  const all = read();
  const r = chRec(all, chapter);
  const ch = { ...r.q };
  const k = qKeyOf(q);
  const cur = ch[k] || { k: 0, m: 0 };
  // "Aata hai" par galtiyon ki ginti 0 — gap ka badhna wahin tak tha
  // ("jab tak aata hai na laga du"). Agli baar galat hua to phir 3 se.
  ch[k] = good
    ? { k: (cur.k || 0) + 1, m: 0 }
    : { ...cur, m: (cur.m || 0) + 1 };
  all[chapter] = { q: ch, order: r.order, n: r.n };
  write(all);
  return ch[k];
}

// Sab bhool jao — ginti bhi, kram bhi.
export function clearDrill(chapter) {
  const all = read();
  if (!all[chapter]) return;
  delete all[chapter];
  write(all);
}

// Aata hai -> itne sawaal baad phir (owner: "101 par aayega").
export const KNOWN_GAP = 100;
// Nahi aata -> itne sawaal baad phir.
//
// Pehle ye 3, 4, 5, 6 … tha (har galti par ek badhta), par us faasle par
// question turant laut aata tha — yaad karne ka mauka hi nahi milta tha, aur
// wahi do-teen sawaal ghoomte rehte the. Ab ek pakka faasla — wahi 15 jo
// overlay ke 40-second drill aur Answers page par hai (lib/answerdrill),
// taaki teeno jagah ek hi niyam chale.
export const MISS_GAP = 15;
export const missGap = () => MISS_GAP;
