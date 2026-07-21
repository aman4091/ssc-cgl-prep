// SSC Maths 2025 — chapter-wise PYQ compilation (Mock Matrix Hub).
//
// Same shape as the other static banks: an index plus one file per chapter,
// fetched on demand and memoised at module level (NOT localStorage — every cgl.*
// key is swept into Supabase sync, and a 5,600-question bank has no business
// going up there).
//
// One thing is particular to this bank. About a fifth of the questions carry a
// CROP of the printed page instead of a text stem: in the source PDF the stacked
// fractions are vector art with no text behind them, so "12 ( )% of 560" is all
// the text layer holds. For those the crop is the question — it shows the stem,
// the exam tag and all four options — so the card renders the image and offers
// the options as bare letters. `img` is resolved to a full path here so nothing
// downstream needs to know about `base`.

let idxCache = null;
const chapCache = {};

export async function loadSscMathsIndex() {
  if (idxCache) return idxCache;
  try {
    const r = await fetch("/sscmaths2025/index.json");
    idxCache = r.ok ? await r.json() : { chapters: [] };
  } catch {
    idxCache = { chapters: [] };
  }
  return idxCache;
}

export async function loadSscMathsChapter(slug) {
  if (!slug) return [];
  if (chapCache[slug]) return chapCache[slug];
  const index = await loadSscMathsIndex();
  const base = index.base || "/sscmaths2025/img";
  try {
    const r = await fetch(`/sscmaths2025/${slug}.json`);
    const list = r.ok ? await r.json() : [];
    chapCache[slug] = (Array.isArray(list) ? list : []).map((q) =>
      q.img ? { ...q, img: `${base}/${q.img}` } : q
    );
  } catch {
    chapCache[slug] = [];
  }
  return chapCache[slug];
}

export async function sscMathsChapterMeta(slug) {
  const { chapters } = await loadSscMathsIndex();
  return (chapters || []).find((c) => c.slug === slug) || null;
}
