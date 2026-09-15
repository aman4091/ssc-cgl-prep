"use client";

// CA Revision — RBE Current Affairs magazine (Sept 2026) ke atomic cards,
// scripts/extract-ca.py se bane. Har fact PDF se hai; yahan kuch naya nahi
// banta.
//
// Abhi: ghar (countdown, aaj ka due, deck chunna) + Recall mode. Daily plan,
// Test/Galtiyan, Read aur Export isi route par aage judenge.

import "./carev.css";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { loadCore, loadAll, loadIndex, isHiddenByDefault } from "@/lib/carevision/deck";
import { getSrs, getStars, getLog, getPrefs, setPrefs } from "@/lib/carevision/progress";
import { daysUntil, isDue } from "@/lib/carevision/srs";
import { sortForStudy } from "@/lib/carevision/plan";
import { dayKey } from "@/lib/daytime";
import Recall from "@/components/carevision/Recall";

const NEW_CHOICES = [20, 40, 60, 80];

function buildQueue(cards, srs, today, newLeft, onlyStar, stars) {
  const pool = onlyStar ? cards.filter((c) => stars[c.id]) : cards;
  const due = pool
    .filter((c) => isDue(srs[c.id], today))
    .sort((a, b) => (srs[a.id].d < srs[b.id].d ? -1 : srs[a.id].d > srs[b.id].d ? 1 : a.priority - b.priority));
  const fresh = onlyStar ? [] : sortForStudy(pool.filter((c) => !srs[c.id])).slice(0, Math.max(0, newLeft));
  return [...due, ...fresh];
}

export default function CaRevisionPage() {
  const [today, setToday] = useState(null);
  const [prefs, setPrefsState] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [cards, setCards] = useState(null);
  const [counts, setCounts] = useState(null);
  const [error, setError] = useState("");
  const [session, setSession] = useState(null);
  const [tick, setTick] = useState(0);        // progress badli (sync / session) -> ginti dobara

  useEffect(() => {
    setToday(dayKey());
    setPrefsState(getPrefs());
    loadIndex().then((idx) => setCounts(idx.files)).catch(() => {});
  }, []);

  // Deck: Core = sirf core.json. Sab = core + har part ka extended (lazy).
  useEffect(() => {
    if (!prefs) return;
    let alive = true;
    setCards(null);
    setError("");
    (prefs.scope === "all" ? loadAll() : loadCore())
      .then((list) => { if (alive) setCards(list); })
      .catch(() => { if (alive) setError("Cards load nahi hue — net check karo (ek baar khulne ke baad offline chalega)."); });
    return () => { alive = false; };
  }, [prefs]);

  // Doosre device se sync aaye to ginti taaza — tab par wapas aate hi.
  useEffect(() => {
    const onVis = () => { if (!document.hidden) { setToday(dayKey()); setTick((t) => t + 1); } };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const visible = useMemo(() => {
    if (!cards) return [];
    if (prefs?.scope !== "all" || showAll) return cards;
    return cards.filter((c) => !isHiddenByDefault(c));
  }, [cards, prefs, showAll]);

  const stats = useMemo(() => {
    if (!today || !cards) return null;
    const srs = getSrs();
    const stars = getStars();
    const day = getLog()[today] || { r: 0, g: 0, nw: 0 };
    let due = 0, seen = 0, starred = 0;
    for (const c of visible) {
      const s = srs[c.id];
      if (s) seen += 1;
      if (isDue(s, today)) due += 1;
      if (stars[c.id]) starred += 1;
    }
    const newLeft = Math.max(0, (prefs?.newPerDay || 40) - day.nw);
    const unseen = visible.length - seen;
    return { srs, stars, day, due, seen, starred, newLeft, newToday: Math.min(newLeft, unseen), total: visible.length };
    // tick: session ke baad / sync ke baad dobara gino
  }, [today, cards, visible, prefs, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const updatePrefs = (patch) => { setPrefs(patch); setPrefsState(getPrefs()); };

  const start = (onlyStar = false) => {
    const q = buildQueue(visible, stats.srs, today, stats.newLeft, onlyStar, stats.stars);
    if (q.length) setSession(q);
  };
  const exit = useCallback(() => { setSession(null); setTick((t) => t + 1); }, []);

  if (session) return <Recall queue={session} today={today} onExit={exit} />;

  const left = today ? daysUntil(today) : null;
  const todayCount = stats ? stats.due + stats.newToday : 0;

  return (
    <div className="carev">
      <header className="carev-head">
        <div className="carev-eyebrow">CA Revision · RBE magazine Sept 2026</div>
        <h1 className="carev-title">
          {left == null ? "…" : left > 0 ? <><b>{left}</b> din baaki</> : left === 0 ? "Aaj exam hai" : "Exam ho gaya"}
        </h1>
        <div className="carev-dim">SSC CGL Tier 1 · 1 Oct 2026</div>
      </header>

      <section className="carev-today">
        <div className="carev-tiles">
          <div className="carev-tile"><div className="carev-num">{stats ? stats.due : "–"}</div><div>Due aaj</div></div>
          <div className="carev-tile"><div className="carev-num">{stats ? stats.newToday : "–"}</div><div>Naye</div></div>
          <div className="carev-tile"><div className="carev-num">{stats ? stats.day.r : "–"}</div><div>Aaj ho gaye</div></div>
        </div>
        <button
          className="carev-btn carev-btn-primary carev-wide carev-go"
          disabled={!stats || todayCount === 0}
          onClick={() => start(false)}
        >
          {!stats ? "Load ho raha hai…" : todayCount ? `Aaj ka revision shuru karo · ${todayCount}` : "Aaj ka sab ho gaya ✓"}
        </button>
        {stats && stats.starred > 0 ? (
          <button className="carev-btn carev-wide" onClick={() => start(true)}>
            Star kiye hue · {stats.starred}
          </button>
        ) : null}
        {error ? <p className="carev-error">{error}</p> : null}
      </section>

      <section className="carev-box">
        <div className="carev-label">Deck</div>
        <div className="carev-chips" role="group" aria-label="Deck">
          <button
            className={`carev-chip${prefs?.scope !== "all" ? " on" : ""}`}
            onClick={() => updatePrefs({ scope: "core" })}
          >Core · {counts?.core?.cards ?? 800}</button>
          <button
            className={`carev-chip${prefs?.scope === "all" ? " on" : ""}`}
            onClick={() => updatePrefs({ scope: "all" })}
          >Sab cards</button>
        </div>
        {prefs?.scope === "all" ? (
          <label className="carev-check">
            <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
            Sab dikhao (priority 3 + purane bhi)
          </label>
        ) : null}

        <div className="carev-label">Naye cards / din</div>
        <div className="carev-chips" role="group" aria-label="Naye cards per din">
          {NEW_CHOICES.map((n) => (
            <button
              key={n}
              className={`carev-chip${prefs?.newPerDay === n ? " on" : ""}`}
              onClick={() => updatePrefs({ newPerDay: n })}
            >{n}</button>
          ))}
        </div>
        {stats ? (
          <div className="carev-dim carev-small">
            Dekhe: {stats.seen} / {stats.total} · Star: {stats.starred}
          </div>
        ) : null}
      </section>

      <p className="carev-dim carev-small carev-foot">
        Har card magazine ke PDF se hai (page number answer ke neeche). Progress phone aur PC par sync hoti hai.
        {" "}<Link href="/current-affairs">Daily CA →</Link>
      </p>
    </div>
  );
}
