// Galtiyan deck ka niyam — alag file taaki node test seedha chala sake.
//
// Test mein galat = deck mein (ya phir se), streak 0. Sahi = streak +1, aur
// GALTI_CLEAR baar LAGAATAR sahi hone par hi bahar (on: 0). Apne aap kabhi
// saaf nahi hota. Record kabhi delete nahi hota (sync ke liye) — sirf on 0.

export const GALTI_CLEAR = 2;

/** g: { id: { on, s, at } } ko jagah par badalta hai. */
export function galtiAnswer(g, id, good, today) {
  const e = g[id];
  if (!good) g[id] = { on: 1, s: 0, at: (e && e.on && e.at) || today };
  else if (e && e.on) {
    const s = (e.s || 0) + 1;
    g[id] = s >= GALTI_CLEAR ? { ...e, on: 0, s } : { ...e, s };
  }
  return g;
}
