// Ready-made GK question banks that ship with the app (public/gkbank/).
//
// These are deliberately NOT in localStorage: every cgl.* key is picked up by the
// Supabase sync, so 600 shared questions would re-upload on every unrelated
// write. Same static-file pattern as public/calcbank and public/cabank — fetched
// on demand, cached in memory for the session.

let indexCache = null;
const topicCache = {};

export async function loadGkIndex() {
  if (indexCache) return indexCache;
  try {
    const r = await fetch("/gkbank/index.json");
    if (!r.ok) return { topics: [] };
    const d = await r.json();
    indexCache = d && Array.isArray(d.topics) ? d : { topics: [] };
    return indexCache;
  } catch {
    return { topics: [] };
  }
}

export async function loadGkTopic(slug) {
  if (topicCache[slug]) return topicCache[slug];
  try {
    const r = await fetch(`/gkbank/${slug}.json`);
    if (!r.ok) return [];
    const qs = await r.json();
    topicCache[slug] = Array.isArray(qs) ? qs : [];
    return topicCache[slug];
  } catch {
    return [];
  }
}

const norm = (s) => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();

// Which built-in topic belongs to a subject-chapter. Chapters are created by the
// user with random ids, so the only stable link is the name they gave it —
// "Ancient History" under gs picks up the Ancient History bank.
export function findGkTopic(topics, subject, chapterName) {
  return (topics || []).find((t) => t.subject === subject && norm(t.chapter) === norm(chapterName)) || null;
}

export async function gkTopicFor(subject, chapterName) {
  const { topics } = await loadGkIndex();
  return findGkTopic(topics, subject, chapterName);
}

export async function gkTopicsForSubject(subject) {
  const { topics } = await loadGkIndex();
  return topics.filter((t) => t.subject === subject);
}

// Every built-in question for a subject, tagged with its topic so a PYQ bank can
// filter them. `gk: true` marks them read-only — they live in a static file, so
// the delete/edit paths (which write localStorage) must not be offered.
export async function loadGkQuestions(subject) {
  const topics = await gkTopicsForSubject(subject);
  const out = [];
  for (const t of topics) {
    const qs = await loadGkTopic(t.slug);
    for (const q of qs) out.push({ ...q, topic: t.label, gk: true });
  }
  return out;
}
