// Pinnacle English — 7,585 SSC English questions that ship with the app
// (public/engbank/).
//
// Nothing in it was generated: the question, four options, the answer and the
// solution note are the book's own, and the solutions are bilingual (English
// answer, Hindi reasoning) exactly as printed.
//
// Static files, not localStorage: every cgl.* key is picked up by the Supabase
// sync, so 7,585 shared questions would re-upload on every unrelated write.
// Same pattern as public/warbank, public/gkbank, public/calcbank and
// public/cabank — fetched on demand, one file per chapter, cached for the
// session.

let indexCache = null;
const chapterCache = {};

export async function loadEngIndex() {
  if (indexCache) return indexCache;
  try {
    const r = await fetch("/engbank/index.json");
    if (!r.ok) return { chapters: [] };
    const d = await r.json();
    indexCache = d && Array.isArray(d.chapters) ? d : { chapters: [] };
    return indexCache;
  } catch {
    return { chapters: [] };
  }
}

// Cloze Test and Comprehension share one passage across ~5 questions each, so
// the files store them once in a `passages` map and reference them by id. Put
// them back on the questions here, and nothing downstream needs to know.
export async function loadEngChapter(slug) {
  if (chapterCache[slug]) return chapterCache[slug];
  try {
    const r = await fetch(`/engbank/${slug}.json`);
    if (!r.ok) return [];
    const d = await r.json();
    const passages = d?.passages || {};
    const qs = Array.isArray(d?.questions) ? d.questions : [];
    chapterCache[slug] = qs.map((q) =>
      q.passageId ? { ...q, passage: passages[q.passageId] || "" } : q,
    );
    return chapterCache[slug];
  } catch {
    return [];
  }
}

// The index entry for one chapter. Null for an unknown slug, so a bad URL can
// render "not found" instead of throwing.
export async function engChapterMeta(slug) {
  const { chapters } = await loadEngIndex();
  return chapters.find((c) => c.slug === slug) || null;
}
