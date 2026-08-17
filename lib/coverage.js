// Coverage engine — "poora English+GS bank 40 din mein khtm" (Feature A, Engine 1).
//
// 4 PYQ banks (engbank + errorpro + war + gk) + vocab + current-affairs ka ek
// growing pool. Roz ek quota fresh cards nikalti hai (jo pehle nahi dikhaye),
// high-yield order mein, aur ek per-scope served-cycle rakhti hai taaki repeat na
// ho jab tak ek poora pass na ho jaaye. ~4 pass in 40 din.
//
// Ye lightweight hai: har item ka record nahi, sirf per-scope { pass, served[] }.
// Store cgl.cover -> lib/sync.js sync karta hai.

import { loadEngIndex, loadEngChapter } from "./engbank";
import { storeGet, storeSet, storeRemove } from "./bigstore";
import { loadErrorProIndex, loadErrorProChapter } from "./errorprobank";
import { loadWarIndex, loadWarSubject } from "./warbank";
import { loadGkIndex, loadGkTopic } from "./gkbank";
import { getOws } from "./vocab";
import { getCurrentAffairsQuestions } from "./feed";
import { loadCaBankIndex, loadCaBankMonth } from "./cabank";
import { doneKeyFor } from "./qdone";

const KEY = "cgl.cover";
export const PASSES = 4;
export const DAYS = 40;

function read() {
  if (typeof window === "undefined") return {};
  try { const r = storeGet(KEY); const v = r ? JSON.parse(r) : {}; return v && typeof v === "object" ? v : {}; }
  catch { return {}; }
}
function write(v) {
  try { storeSet(KEY, JSON.stringify(v)); } catch { /* quota */ }
  try { window.dispatchEvent(new CustomEvent("cgl:cover-changed")); } catch { /* SSR */ }
}

// Card identity within a scope.
function cardKey(card) {
  if (card.kind === "vocab") return "v:" + String(card.ref?.word || "").trim().toLowerCase();
  return doneKeyFor(card.ref);
}
const wrap = (arr, kind, subject) => (arr || []).map((ref) => ({ kind, ref, subject }));

// ---- scope descriptors (data loaded lazily, cached at module level) ----
let _scopes = null;      // [{ scope, subject, label, load }]
const _cache = new Map(); // scope -> cards[]

async function buildScopeList() {
  if (_scopes) return _scopes;
  const list = [];
  const safe = async (fn, d = []) => { try { return await fn(); } catch { return d; } };

  const eng = await safe(loadEngIndex, { chapters: [] });
  for (const c of eng.chapters || []) list.push({ scope: `eng:${c.slug}`, subject: "english", label: `English · ${c.label}`, count: c.count || 0, load: () => wrapQ(loadEngChapter(c.slug), "english") });

  const err = await safe(loadErrorProIndex, { chapters: [] });
  for (const c of err.chapters || []) list.push({ scope: `err:${c.slug}`, subject: "english", label: `Error · ${c.label}`, count: c.count || 0, load: () => wrapQ(loadErrorProChapter(c.slug), "english") });

  const war = await safe(loadWarIndex, { subjects: [] });
  for (const c of war.subjects || []) list.push({ scope: `war:${c.slug}`, subject: "gs", label: `GS · ${c.label}`, count: c.count || 0, load: () => wrapQ(loadWarSubject(c.slug), "gs") });

  const gk = await safe(loadGkIndex, { topics: [] });
  for (const c of gk.topics || []) list.push({ scope: `gk:${c.slug}`, subject: "gs", label: `GK · ${c.label}`, count: c.count || 0, load: () => wrapQ(loadGkTopic(c.slug), "gs") });

  // vocab — one scope, all words (count is cheap/sync)
  let vcount = 0; try { vcount = getOws().length; } catch { /* SSR */ }
  list.push({ scope: "vocab", subject: "english", label: "Vocab · OWS", count: vcount, load: async () => wrap(getOws(), "vocab", "english") });

  // current affairs — user feed + cabank months. Count from index, no full load.
  let cacount = 0;
  try { cacount += getCurrentAffairsQuestions().length; } catch { /* SSR */ }
  try {
    const caidx = await loadCaBankIndex();
    for (const m of caidx.months || []) cacount += (m.count || 0);
  } catch { /* offline */ }
  list.push({ scope: "ca", subject: "gs", label: "Current Affairs", count: cacount, load: loadCaCards });

  _scopes = list;
  return list;
}
async function wrapQ(promise, subject) {
  const arr = await promise;
  return wrap((arr || []).filter((q) => q && (q.question || q.qImg)), "q", subject);
}
async function loadCaCards() {
  const cards = wrap(getCurrentAffairsQuestions(), "ca", "gs");
  try {
    const idx = await loadCaBankIndex();
    for (const m of idx.months || []) {
      const e = await loadCaBankMonth(m.period);
      for (const q of e?.questions || []) cards.push({ kind: "ca", ref: q, subject: "gs" });
    }
  } catch { /* offline / no bank */ }
  // de-dup by key
  const seen = new Set(); const out = [];
  for (const c of cards) { const k = cardKey(c); if (seen.has(k)) continue; seen.add(k); out.push(c); }
  return out;
}

async function scopeCards(sc) {
  if (_cache.has(sc.scope)) return _cache.get(sc.scope);
  const cards = await sc.load();
  _cache.set(sc.scope, cards);
  return cards;
}

// Total pool size (for quota) from index counts — cheap, no chapter loads.
export async function coverageTotal() {
  const scopes = await buildScopeList();
  return scopes.reduce((n, sc) => n + (sc.count || 0), 0);
}

// Daily quota so the whole pool is covered PASSES times across DAYS.
export async function coverageQuota() {
  const total = await coverageTotal();
  return Math.max(1, Math.ceil((total * PASSES) / DAYS));
}

// Pull up to `n` fresh coverage cards, round-robin across scopes (high-yield
// order). Marks them served; a scope whose pass completes resets + bumps pass.
// Returns [{ kind, ref, subject, scope, coverKey }].
export async function pullFreshCoverage(n, exclude = new Set()) {
  const scopes = await buildScopeList();
  const st = read();
  const picked = [];
  const usedThisPull = new Set();
  // load fresh lists per scope
  const pools = [];
  for (const sc of scopes) {
    const cards = await scopeCards(sc);
    if (!cards.length) continue;
    let rec = st[sc.scope] || { pass: 0, served: [] };
    let servedSet = new Set(rec.served);
    let fresh = cards.filter((c) => !servedSet.has(cardKey(c)));
    if (!fresh.length) { rec = { pass: (rec.pass || 0) + 1, served: [] }; servedSet = new Set(); fresh = cards; }
    st[sc.scope] = rec;
    pools.push({ sc, fresh, servedSet, rec });
  }
  // round-robin
  let progress = true;
  while (picked.length < n && progress) {
    progress = false;
    for (const p of pools) {
      if (picked.length >= n) break;
      let c;
      while ((c = p.fresh.shift())) {
        const k = cardKey(c);
        if (usedThisPull.has(k) || exclude.has(k)) continue;
        usedThisPull.add(k);
        p.servedSet.add(k);
        p.rec.served = [...p.servedSet];
        picked.push({ ...c, scope: p.sc.scope, coverKey: k });
        progress = true;
        break;
      }
    }
  }
  write(st);
  return picked;
}

// Progress from index counts + served lengths — cheap, no chapter loads.
export async function coverageProgress() {
  const scopes = await buildScopeList();
  const st = read();
  let total = 0, served = 0, passSum = 0, withData = 0;
  for (const sc of scopes) {
    const count = sc.count || 0;
    if (!count) continue;
    total += count;
    const rec = st[sc.scope] || { pass: 0, served: [] };
    served += Math.min(rec.served.length, count);
    passSum += rec.pass || 0;
    withData += 1;
  }
  return {
    total,
    served,
    pct: total ? Math.round((served / total) * 100) : 0,
    pass: withData ? Math.round(passSum / withData) + 1 : 1,
    passes: PASSES,
  };
}

export function resetCoverage() { write({}); }
