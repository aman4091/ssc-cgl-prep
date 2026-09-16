// Mind Map deck — public/mindmap/ se (scripts/ingest-mindmap.mjs banata hai).
//
// CA deck se poori tarah alag: alag files, alag keys, alag plan. Sirf SRS
// engine aur Recall/Test/Galtiyan ke components saanjhe hain.
//
// Har subject ki do files: <subject>-core.json (roz ke rotation ka hissa,
// budget ke andar) aur <subject>-ext.json (baaki sab — hai, par plan mein
// nahi). Core pehle aata hai; extended tabhi jab maanga jaye.

const BASE = "/mindmap/";
let indexP = null;
const coreP = {};
const extP = {};

export const SUBJECTS = [
  { key: "polity", label: "Polity", icon: "⚖️" },
  { key: "geography", label: "Geography", icon: "🌍" },
  { key: "history", label: "History", icon: "🏛️" },
  { key: "static", label: "Static GK", icon: "📌" },
  { key: "biology", label: "Biology", icon: "🧬" },
  { key: "economics", label: "Economics", icon: "💹" },
  { key: "physics", label: "Physics", icon: "🔭" },
  { key: "chemistry", label: "Chemistry", icon: "⚗️" },
];

async function getJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
}

export function loadIndex() {
  if (!indexP) indexP = getJSON(BASE + "index.json").catch((e) => { indexP = null; throw e; });
  return indexP;
}

export async function loadCore(subject) {
  if (!coreP[subject]) {
    coreP[subject] = (async () => {
      const idx = await loadIndex();
      if (!idx.subjects?.[subject]) return [];
      return getJSON(`${BASE}${subject}-core.json?v=${idx.version}`);
    })().catch((e) => { delete coreP[subject]; throw e; });
  }
  return coreP[subject];
}

export async function loadExt(subject) {
  if (!extP[subject]) {
    extP[subject] = (async () => {
      const idx = await loadIndex();
      if (!idx.subjects?.[subject]) return [];
      return getJSON(`${BASE}${subject}-ext.json?v=${idx.version}`);
    })().catch((e) => { delete extP[subject]; throw e; });
  }
  return extP[subject];
}

// Jo subjects ki PDF ab tak aayi hai, sirf wahi.
export async function readySubjects() {
  const idx = await loadIndex();
  return SUBJECTS.filter((s) => idx.subjects?.[s.key]).map((s) => ({ ...s, ...idx.subjects[s.key] }));
}

export const cardMeta = (c) =>
  `${c.mapTitle} · p.${c.pdfPage}${c.tier ? ` · ${c.tier}` : ""}${c.flagged ? " · ⚠" : ""}`;
