"use client";

import { useEffect, useRef } from "react";
import { nextUp, getDayTypeItems, getDetail, setDetail, TYPES, totalDays } from "@/lib/vocab";
import { getSettings } from "@/lib/storage";
import { vocabDetail } from "@/lib/client-ai";

// Warms the meaning cache for the next few days of words, quietly, in the
// background — so opening a word shows it instantly instead of waiting on the AI.
//
// The cache is `cgl.vocab.details`, a cgl.* key, so lib/sync sweeps it into
// Supabase like everything else: fetch a word once on any device and every other
// device gets it. That is what makes this worth doing at all rather than each
// phone paying for the same 250 lookups.
//
// It is deliberately unhurried. One request at a time with a gap between, and it
// stops for the session the moment one fails — a missing key or a rate limit
// should not turn into hundreds of retries.
const DAYS_AHEAD = 5;
const GAP_MS = 900;      // between words
const START_DELAY = 4000; // let the page settle first

export default function VocabPrefetch() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    let alive = true;
    let timer = null;

    const run = async () => {
      if (!getSettings().apiKey) return; // nothing to call with

      // The next DAYS_AHEAD days, starting from wherever you actually are.
      const start = nextUp()?.day || 1;
      const last = Math.min(totalDays(), start + DAYS_AHEAD - 1);

      const todo = [];
      for (let d = start; d <= last; d++) {
        for (const t of TYPES) {
          for (const it of getDayTypeItems(d, t.key)) {
            if (it?.word && !getDetail(it.word)) todo.push(it);
          }
        }
      }
      if (!todo.length) return;

      for (const it of todo) {
        if (!alive) return;
        try {
          const detail = await vocabDetail(it.word, it.def);
          if (!alive) return;
          // A blank meaning is a miss, not an answer — leave it uncached so a
          // real click can try again rather than showing an empty card forever.
          if (String(detail?.meaning || "").trim()) setDetail(it.word, detail);
        } catch {
          return; // no key, rate limit, offline — give up for this session
        }
        await new Promise((r) => { timer = setTimeout(r, GAP_MS); });
      }
    };

    const kick = setTimeout(run, START_DELAY);
    return () => {
      alive = false;
      clearTimeout(kick);
      if (timer) clearTimeout(timer);
    };
  }, []);

  return null;
}
