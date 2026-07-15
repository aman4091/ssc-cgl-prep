// The WAR book — 3,152 SSC previous-year questions that ship with the app
// (public/warbank/).
//
// Everything in it is the book's own: the question, all four options, the
// answer, the explanation, and the exam each question came from. Nothing was
// generated — unlike the gkbank banks (lib/gkbank), whose wrong options were
// written by a language model because that book printed no options at all.
//
// Static files, not localStorage: every cgl.* key is picked up by the Supabase
// sync, so 3,152 shared questions would re-upload on every unrelated write.
// Same pattern as public/gkbank, public/calcbank and public/cabank — fetched on
// demand, cached in memory for the session. One file per subject, so opening
// Chemistry costs 21 KB rather than the whole 2.4 MB book.

let indexCache = null;
const subjectCache = {};

export async function loadWarIndex() {
  if (indexCache) return indexCache;
  try {
    const r = await fetch("/warbank/index.json");
    if (!r.ok) return { subjects: [] };
    const d = await r.json();
    indexCache = d && Array.isArray(d.subjects) ? d : { subjects: [] };
    return indexCache;
  } catch {
    return { subjects: [] };
  }
}

export async function loadWarSubject(slug) {
  if (subjectCache[slug]) return subjectCache[slug];
  try {
    const r = await fetch(`/warbank/${slug}.json`);
    if (!r.ok) return [];
    const qs = await r.json();
    subjectCache[slug] = Array.isArray(qs) ? qs : [];
    return subjectCache[slug];
  } catch {
    return [];
  }
}

// The index entry for one subject — label, icon, count and its chapter list.
// Returns null for an unknown slug so a bad URL can render "not found" instead
// of throwing.
export async function warSubjectMeta(slug) {
  const { subjects } = await loadWarIndex();
  return subjects.find((s) => s.slug === slug) || null;
}
