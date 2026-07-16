// Pinnacle Maths — 6,420 SSC maths questions that ship with the app.
//
// Maths does not survive PDF→text: a fraction prints as three stacked pieces,
// so the question, its four options and the worked solution are all IMAGES, not
// text. The small JSON here (public/mathbank/) holds only image names + the
// lossy text (for search / alt / the AI buttons); the images themselves live on
// a Cloudflare R2 CDN, because 428 MB of PNG — 127 MB as WebP — does not belong
// in the git repo, and reasoning is a second image bank coming the same way.
//
// index.base is the R2 URL; each question stores bare image names, resolved to
// full URLs here so the card just uses q.qImg / q.optImgs / q.solImg.

let indexCache = null;
const chapterCache = {};

export async function loadMathIndex() {
  if (indexCache) return indexCache;
  try {
    const r = await fetch("/mathbank/index.json");
    if (!r.ok) return { chapters: [], base: "" };
    const d = await r.json();
    indexCache = d && Array.isArray(d.chapters) ? d : { chapters: [], base: "" };
    return indexCache;
  } catch {
    return { chapters: [], base: "" };
  }
}

export async function loadMathChapter(slug) {
  if (chapterCache[slug]) return chapterCache[slug];
  try {
    const { base } = await loadMathIndex();
    const r = await fetch(`/mathbank/${slug}.json`);
    if (!r.ok) return [];
    const qs = await r.json();
    const url = (name) => `${base}/${name}`;
    chapterCache[slug] = (Array.isArray(qs) ? qs : []).map((q) => ({
      ...q,
      qImg: url(q.q),
      optImgs: q.opts.map(url),
      solImg: url(q.sol),
    }));
    return chapterCache[slug];
  } catch {
    return [];
  }
}

export async function mathChapterMeta(slug) {
  const { chapters } = await loadMathIndex();
  return chapters.find((c) => c.slug === slug) || null;
}
