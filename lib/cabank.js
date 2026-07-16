// Built-in monthly Current Affairs (public/cabank) — 455 questions with the
// source's own explanations, Jan–Jun 2026, from crazygktrick.com compilations.
//
// These ship as static files rather than as feed entries in localStorage: they
// are 460KB, identical for every user, and never edited — putting them in
// `cgl.feed.entries` would eat the storage quota and be re-uploaded through
// cloud sync on every unrelated feed change.
//
// They surface as read-only entries in the Monthly tab, shaped like feed entries
// so the existing Current-Affairs detail page can render them unchanged.

export const CABANK_PREFIX = "cabank_";

export function isCaBankId(id) { return typeof id === "string" && id.startsWith(CABANK_PREFIX); }
export function caBankId(period) { return CABANK_PREFIX + period; }
export function periodFromId(id) { return isCaBankId(id) ? id.slice(CABANK_PREFIX.length) : ""; }

let indexCache = null;
const monthCache = {};

// -> { source, sourceNote, total, months: [{ period, label, count }] }
export async function loadCaBankIndex() {
  if (indexCache) return indexCache;
  try {
    const res = await fetch("/cabank/index.json");
    if (!res.ok) throw new Error(String(res.status));
    indexCache = await res.json();
  } catch { indexCache = { total: 0, months: [] }; }
  return indexCache;
}

export async function loadCaBankMonth(period) {
  if (monthCache[period]) return monthCache[period];
  try {
    const res = await fetch(`/cabank/${encodeURIComponent(period)}.json`);
    if (!res.ok) throw new Error(String(res.status));
    monthCache[period] = await res.json();
  } catch { monthCache[period] = []; }
  return monthCache[period];
}

// A feed-entry-shaped object for the detail page. `builtin` marks it read-only.
// A period can be a month ("2026-06") or a day ("2026-07-15"); both are just a
// filename under /cabank and a lookup in the matching index list.
export async function loadCaBankEntry(id) {
  const period = periodFromId(id);
  if (!period) return null;
  const [index, questions] = await Promise.all([loadCaBankIndex(), loadCaBankMonth(period)]);
  if (!questions.length) return null;
  const day = (index.days || []).find((x) => x.period === period);
  const m = day || (index.months || []).find((x) => x.period === period);
  return {
    id,
    feed: "current",
    bucket: day ? "daily" : "monthly",
    builtin: true,
    date: m?.label || period,   // the detail page headlines this ("15 July 2026")
    title: `${m?.label || period} · Current Affairs`,
    source: m?.source || index.source || "",
    questions,
    notes: [],
    pdfs: [],
    videoUrl: "",
  };
}
