// Pinnacle Reasoning — 3,543 SSC reasoning questions that ship with the app.
//
// The second image bank, built exactly like Pinnacle Maths (lib/mathbank.js).
// Reasoning is a picture book: in the non-verbal chapters (Embedded Figure,
// Mirror / Water Image, Cube and Dice, Paper Cut and Fold …) the stem AND the
// four options are figures — rendered as text the question is literally blank.
// So every stem, option and solution is a crop from the book, on the same
// Cloudflare R2 CDN as maths (prefix reasoning/), and the text fields here are
// only for search / alt / the AI buttons.
//
// index.base is the R2 URL; each question stores bare image names, resolved to
// full URLs here so the card just uses q.qImg / q.optImgs / q.solImg.
//
// Two of the book's 3,545 are held back: it prints no solution and no answer for
// them, and a question with no right answer is not a question.

let indexCache = null;
const chapterCache = {};

export async function loadReasonIndex() {
  if (indexCache) return indexCache;
  try {
    const r = await fetch("/reasonbank/index.json");
    if (!r.ok) return { chapters: [], base: "" };
    const d = await r.json();
    indexCache = d && Array.isArray(d.chapters) ? d : { chapters: [], base: "" };
    return indexCache;
  } catch {
    return { chapters: [], base: "" };
  }
}

export async function loadReasonChapter(slug) {
  if (chapterCache[slug]) return chapterCache[slug];
  try {
    const { base } = await loadReasonIndex();
    const r = await fetch(`/reasonbank/${slug}.json`);
    if (!r.ok) return [];
    const qs = await r.json();
    const url = (name) => `${base}/${name}`;
    chapterCache[slug] = (Array.isArray(qs) ? qs : []).map((q) => ({
      ...q,
      qImg: url(q.q),
      optImgs: q.opts.map(url),
      solImg: q.sol ? url(q.sol) : "",
    }));
    return chapterCache[slug];
  } catch {
    return [];
  }
}

export async function reasonChapterMeta(slug) {
  const { chapters } = await loadReasonIndex();
  return chapters.find((c) => c.slug === slug) || null;
}
