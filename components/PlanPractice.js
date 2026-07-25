"use client";

import { useState } from "react";
import FullscreenRunner from "./FullscreenRunner";
import { loadMathChapter } from "@/lib/mathbank";
import { loadSscMathsChapter } from "@/lib/sscmaths";
import { loadReasonChapter } from "@/lib/reasonbank";
import { loadEngChapter } from "@/lib/engbank";
import { loadErrorProChapter } from "@/lib/errorprobank";
import { loadWarSubject } from "@/lib/warbank";
import { loadGkTopic } from "@/lib/gkbank";
import { QA_TYPE_LIST, getPlanner } from "@/lib/planner";

// "▶ N Q shuru" on a plan block: pulls N questions straight out of the mapped
// bank(s), avoids repeats across sessions (cgl.planserved cycle, resets when a
// pool is exhausted), and runs them in FullscreenRunner — which already feeds
// qstats, the Mistake Notebook and Activity. Zero navigation, zero friction.
//
// auto = { n, specs: [["bank","slug"], …] } or { n, mixedQA: true } — mixedQA
// builds the pool from the Day-1 inventory: rusty/nahi-aata types first.

const LOADERS = {
  mathbank:   { load: loadMathChapter, subject: "math", secs: 60 },
  // sscmaths rows that carry a page crop (stacked fractions/Hindi) are dropped —
  // their text projection is not trustworthy outside their own card.
  sscmaths:   { load: async (slug) => (await loadSscMathsChapter(slug)).filter((q) => !q.img), subject: "math", secs: 45 },
  reasonbank: { load: loadReasonChapter, subject: "reasoning", secs: 40 },
  engbank:    { load: loadEngChapter, subject: "english", secs: 30 },
  errorpro:   { load: loadErrorProChapter, subject: "english", secs: 40 },
  war:        { load: loadWarSubject, subject: "gs", secs: 25 },
  gk:         { load: loadGkTopic, subject: "gs", secs: 25 },
};

const usable = (q) =>
  q && typeof q.answer === "number" &&
  ((q.qImg && Array.isArray(q.optImgs)) ||
   (q.question && Array.isArray(q.options) && q.options.length >= 2));

const qKey = (q) => String(q.id || (q.question || "").slice(0, 80));

const SERVED_KEY = "cgl.planserved"; // { [specKey]: [qKey, …] }
function readServed() {
  try { return JSON.parse(localStorage.getItem(SERVED_KEY) || "{}"); } catch { return {}; }
}
function writeServed(v) { try { localStorage.setItem(SERVED_KEY, JSON.stringify(v)); } catch { /* quota */ } }

function shuffle(a) {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}

// Rusty/nahi-aata types first; falls back to the whole list when nothing is
// marked yet. Returns up to 4 units' worth of specs.
function mixedQaSpecs() {
  const rating = getPlanner().qaRating || {};
  const bad = QA_TYPE_LIST.filter((u) => rating[u.key] === "n" || rating[u.key] === "r");
  const pool = shuffle(bad.length ? bad : QA_TYPE_LIST).slice(0, 4);
  return pool.flatMap((u) => u.auto || []);
}

async function buildSet(auto) {
  const specs = auto.mixedQA ? mixedQaSpecs() : (auto.specs || []);
  if (!specs.length) return null;

  const served = readServed();
  const perSpec = [];
  for (const [bank, slug, chapters] of specs) {
    const L = LOADERS[bank];
    if (!L) continue;
    let all = [];
    try { all = (await L.load(slug)).filter(usable); } catch { all = []; }
    // Optional third element: chapter names inside the bank (WAR tags every
    // question) — so the FR day serves FR questions, not the whole subject.
    // Filter miss (renamed chapter) falls back to the whole pool, never empty.
    if (chapters && chapters.length) {
      const want = new Set(chapters.map((c) => String(c).toLowerCase().trim()));
      const filtered = all.filter((q) => q.chapter && want.has(String(q.chapter).toLowerCase().trim()));
      if (filtered.length) all = filtered;
    }
    if (!all.length) continue;
    const key = bank + ":" + slug + (chapters && chapters.length ? ":" + chapters.join("|") : "");
    const used = new Set(served[key] || []);
    let fresh = all.filter((q) => !used.has(qKey(q)));
    if (!fresh.length) { fresh = all; served[key] = []; } // cycle poora — reset
    perSpec.push({ key, fresh: shuffle(fresh), subject: L.subject, secs: L.secs });
  }
  if (!perSpec.length) return null;

  // Round-robin across specs so a 2-bank block mixes both, not 15-from-one.
  const picked = [];
  const seen = new Set();
  let i = 0;
  while (picked.length < auto.n && perSpec.some((s) => s.fresh.length)) {
    const s = perSpec[i % perSpec.length];
    i++;
    const q = s.fresh.shift();
    if (!q) continue;
    const k = s.key + "|" + qKey(q);
    if (seen.has(k)) continue;
    seen.add(k);
    picked.push({ q, specKey: s.key });
  }
  if (!picked.length) return null;

  for (const p of picked) {
    served[p.specKey] = [...(served[p.specKey] || []), qKey(p.q)];
  }
  writeServed(served);

  const secs = Math.max(...perSpec.map((s) => s.secs));
  return {
    questions: picked.map((p) => p.q),
    subject: perSpec[0].subject,
    timeLimitSec: picked.length * secs,
  };
}

export default function PlanPractice({ auto, title }) {
  const [busy, setBusy] = useState(false);
  const [run, setRun] = useState(null);

  if (!auto || !auto.n) return null;

  const start = async () => {
    if (busy) return;
    setBusy(true);
    const set = await buildSet(auto);
    setBusy(false);
    if (!set) { alert("Questions load nahi hue — internet/bank check karo."); return; }
    setRun(set);
  };

  return (
    <>
      <button className="btn btn--primary btn--sm" onClick={start} disabled={busy}>
        {busy ? "…" : `▶ ${auto.n} Q shuru`}
      </button>
      {run && (
        <FullscreenRunner
          questions={run.questions}
          title={title}
          subject={run.subject}
          timeLimitSec={run.timeLimitSec}
          onExit={() => setRun(null)}
        />
      )}
    </>
  );
}
