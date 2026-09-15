// CA Revision ke cards — public/carevision/ se (scripts/extract-ca.py banata hai).
//
// Mobile data par 2.2 MB ek saath nahi: pehle index.json (chhota manifest) aur
// core.json (~800 card, ~270 KB) — bas itne se Recall chal jata hai. Extended
// cards har part ki alag file mein hain aur tabhi aate hain jab "Sab dikhao"
// maanga jaye. Service worker har .json ko cache karta hai, isliye ek baar
// khula to offline bhi chalta hai.
//
// URL mein ?v=<version> — naya deck bana to naya URL, purana cache beech mein
// nahi aata.

const BASE = "/carevision/";
let indexP = null;
let coreP = null;
const extP = {};

async function getJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
}

export function loadIndex() {
  if (!indexP) indexP = getJSON(BASE + "index.json").catch((e) => { indexP = null; throw e; });
  return indexP;
}

// Files mein partTitle nahi hota (har card par wahi 40 akshar dohraana bekaar
// tha) — yahan index se wapas lagta hai, taaki card poora schema rakhe.
function dress(cards, idx) {
  for (const c of cards) c.partTitle = idx.parts[c.part] || "";
  return cards;
}

export async function loadCore() {
  if (!coreP) {
    coreP = (async () => {
      const idx = await loadIndex();
      return dress(await getJSON(`${BASE}${idx.files.core.file}?v=${idx.version}`), idx);
    })().catch((e) => { coreP = null; throw e; });
  }
  return coreP;
}

export async function loadExtended(part) {
  if (!extP[part]) {
    extP[part] = (async () => {
      const idx = await loadIndex();
      const f = idx.files["ext-" + part];
      if (!f) return [];
      return dress(await getJSON(`${BASE}${f.file}?v=${idx.version}`), idx);
    })().catch((e) => { delete extP[part]; throw e; });
  }
  return extP[part];
}

export async function loadAll(parts) {
  const idx = await loadIndex();
  const want = parts && parts.length ? parts : Object.keys(idx.parts);
  const [core, ...ext] = await Promise.all([loadCore(), ...want.map(loadExtended)]);
  return [...core, ...ext.flat()];
}

// "Sab dikhao" band ho to priority-3 aur stale cards chhupe rehte hain (spec).
export const isHiddenByDefault = (c) => c.priority === 3 || c.window === "stale";
