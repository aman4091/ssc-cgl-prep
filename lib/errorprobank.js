// Error Pro (Aman Sir English) — 1,792 SSC English grammar practice questions
// that ship with the app (public/errorprobank/).
//
// Nothing in it was generated: the question, four options, the answer and the
// bilingual (English answer, Hinglish reasoning) solution are all the book's
// own — "Aman Sir Error Pro — Complete Book". A second English question source
// alongside Pinnacle English, so it reuses the same static-file pattern:
// fetched on demand, one file per chapter, cached for the session. Never in
// localStorage, so the Supabase sync doesn't re-upload 1,792 shared questions.

let indexCache = null;
const chapterCache = {};

export async function loadErrorProIndex() {
  if (indexCache) return indexCache;
  try {
    const r = await fetch("/errorprobank/index.json");
    if (!r.ok) return { chapters: [] };
    const d = await r.json();
    indexCache = d && Array.isArray(d.chapters) ? d : { chapters: [] };
    return indexCache;
  } catch {
    return { chapters: [] };
  }
}

export async function loadErrorProChapter(slug) {
  if (chapterCache[slug]) return chapterCache[slug];
  try {
    const r = await fetch(`/errorprobank/${slug}.json`);
    if (!r.ok) return [];
    const d = await r.json();
    chapterCache[slug] = Array.isArray(d?.questions) ? d.questions : [];
    return chapterCache[slug];
  } catch {
    return [];
  }
}

// The index entry for one chapter. Null for an unknown slug, so a bad URL can
// render "not found" instead of throwing.
export async function errorProChapterMeta(slug) {
  const { chapters } = await loadErrorProIndex();
  return chapters.find((c) => c.slug === slug) || null;
}
