// Mind Map ka roz ka plan — CA jaisa 3-pass nahi.
//
// Ye REVISION hai, padhai nahi: sab kuch pehle padha ja chuka hai. Isliye
// koi "naya material" nahi hota — pehli baar dikhta card bhi seedha SRS mein
// (interval 1) jata hai, aur plan bas do cheezein hai: aaj due + roz ke itne
// naye. Interval exam ki tareekh se dabta hai (lib/carevision/srs), aur wo
// tareekh site ki apni exam-date setting se aati hai.

import { daysUntil, isDue } from "../carevision/srs";

const TIER_RANK = { A: 0, B: 1, C: 2 };

// Naye cards ka kram: pehle A tier, phir B, phir C; usi tier mein map ke
// PDF kram se.
export function sortForStudy(cards) {
  return [...cards].sort((a, b) =>
    (TIER_RANK[a.tier] ?? 3) - (TIER_RANK[b.tier] ?? 3)
    || a.pdfPage - b.pdfPage
    || a.depth - b.depth);
}

export function todayPlan({ cards, srs, stars = {}, galti = {}, log = {}, today, exam, newPerDay = 40 }) {
  const day = log[today] || { r: 0, g: 0, nw: 0 };
  const due = cards
    .filter((c) => isDue(srs[c.id], today))
    .sort((a, b) => (srs[a.id].d < srs[b.id].d ? -1 : srs[a.id].d > srs[b.id].d ? 1 : (TIER_RANK[a.tier] ?? 3) - (TIER_RANK[b.tier] ?? 3)));
  const unseen = sortForStudy(cards.filter((c) => !srs[c.id]));
  const newLeft = Math.max(0, newPerDay - day.nw);
  const fresh = unseen.slice(0, newLeft);
  const galtiCards = cards.filter((c) => galti[c.id]?.on);
  const starCards = cards.filter((c) => stars[c.id]);
  return {
    daysLeft: daysUntil(today, exam),
    due, fresh, unseen: unseen.length, day, newLeft,
    galtiCards, starCards,
    queue: [...due, ...fresh],
  };
}
