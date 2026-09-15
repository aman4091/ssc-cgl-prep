// Padhne ka kram — spec ki priority table ka kram (Part I -> D -> F -> B ->
// First in India -> Part J 2026 -> ...). Naye cards isi kram mein aate hain,
// taaki pehle hafte mein wahi khatam ho jo sabse zyada poocha jata hai.

const ORDER = [
  (c) => c.part === "I",
  (c) => c.part === "D",
  (c) => c.part === "F",
  (c) => c.part === "B",
  (c) => c.section.startsWith("First in India"),
  (c) => c.part === "J" && /2026/.test(c.section),
  (c) => c.section.startsWith("Index & Rankings"),
  (c) => c.section === "Important Military Exercises" || c.section === "Operation Sindoor 2025",
  (c) => c.section.startsWith("Key Office Bearers") || c.section.startsWith("Union Budget"),
  (c) => c.part === "E",
  (c) => c.section.startsWith("International Conferences"),
  (c) => c.part === "C",
  (c) => c.part === "G",
  (c) => c.part === "A",
  (c) => c.part === "H",
  (c) => c.part === "J",
];

export function studyRank(c) {
  const i = ORDER.findIndex((f) => f(c));
  return i < 0 ? ORDER.length : i;
}

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

// PDF kram mein GI Tags state-wise chhape hain — seedha chalao to "Assam,
// Assam, Assam…" lagaatar aata hai aur dimaag answer ka pattern yaad kar leta
// hai, fact nahi. Isliye ek hi group (priority + kram) ke andar sections baari-
// baari (GI, UNESCO, Ramsar, NP, …), aur section ke andar ek pakka par bikhra
// hua kram (id ka hash) — har device par, har din wahi.
export function sortForStudy(cards) {
  const groups = new Map();
  for (const c of cards) {
    const g = `${c.priority}:${String(studyRank(c)).padStart(2, "0")}`;
    if (!groups.has(g)) groups.set(g, new Map());
    const secs = groups.get(g);
    if (!secs.has(c.section)) secs.set(c.section, []);
    secs.get(c.section).push(c);
  }
  const out = [];
  for (const g of [...groups.keys()].sort()) {
    const queues = [...groups.get(g).values()].map((q) => q.sort((a, b) => hash(a.id) - hash(b.id)));
    while (queues.some((q) => q.length)) {
      for (const q of queues) if (q.length) out.push(q.shift());
    }
  }
  return out;
}
