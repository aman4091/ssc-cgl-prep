"use client";

// CA Revision — RBE Current Affairs magazine (Sept 2026) ke atomic cards,
// scripts/extract-ca.py se bane. Har fact PDF se hai; yahan kuch naya nahi
// banta.
//
// Ghar = Daily plan (lib/carevision/plan.js): countdown, aaj ka target, ek
// button. Wahi button Recall kholta hai aaj ki queue ke saath. Test/Galtiyan,
// Read aur Export isi route par aage judenge.

import "./carev.css";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { loadCore, loadAll, loadIndex, isHiddenByDefault } from "@/lib/carevision/deck";
import { getSrs, getStars, getLog, getPrefs, setPrefs, getPlanStart, noteDayTarget } from "@/lib/carevision/progress";
import { todayPlan, planDays, dayState, PASS1_LAST, PASS2_LAST } from "@/lib/carevision/plan";
import { dayKey } from "@/lib/daytime";
import Recall from "@/components/carevision/Recall";

const PASS_TEXT = {
  1: "Pass 1 — priority-1 ke naye cards",
  2: "Pass 2 — priority-2 ke naye cards + Pass 1 ka recall",
  3: "Pass 3 — koi naya card nahi: star + due",
};

const shortDate = (key) => {
  const [, m, d] = key.split("-").map(Number);
  return `${d} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1]}`;
};

export default function CaRevisionPage() {
  const [today, setToday] = useState(null);
  const [prefs, setPrefsState] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [cards, setCards] = useState(null);
  const [counts, setCounts] = useState(null);
  const [error, setError] = useState("");
  const [session, setSession] = useState(null);
  const [tick, setTick] = useState(0);        // progress badli (sync / session) -> plan dobara

  useEffect(() => {
    setToday(dayKey());
    setPrefsState(getPrefs());
    loadIndex().then((idx) => setCounts(idx.files)).catch(() => {});
  }, []);

  // Deck: Core = sirf core.json. Sab = core + har part ka extended (lazy).
  useEffect(() => {
    if (!prefs) return undefined;
    let alive = true;
    setCards(null);
    setError("");
    (prefs.scope === "all" ? loadAll() : loadCore())
      .then((list) => { if (alive) setCards(list); })
      .catch(() => { if (alive) setError("Cards load nahi hue — net check karo (ek baar khulne ke baad offline chalega)."); });
    return () => { alive = false; };
  }, [prefs]);

  // Doosre device se sync aaye / raat ko din badle — tab par wapas aate hi.
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

  const view = useMemo(() => {
    if (!today || !cards) return null;
    const srs = getSrs();
    const stars = getStars();
    const log = getLog();
    const start = getPlanStart(today);
    const plan = todayPlan({ cards: visible, srs, stars, log, today, start });
    let seen = 0, starred = 0;
    for (const c of visible) {
      if (srs[c.id]) seen += 1;
      if (stars[c.id]) starred += 1;
    }
    const starCards = visible.filter((c) => stars[c.id]);
    return { plan, log, start, seen, starred, starCards, days: planDays(start) };
  }, [today, cards, visible, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  // Aaj ka naya target din ke log mein — timeline "poora hua" isi se dikhati hai.
  useEffect(() => {
    if (view && today && view.plan.daysLeft >= 1) noteDayTarget(today, view.plan.newTarget);
  }, [view, today]);

  const updatePrefs = (patch) => { setPrefs(patch); setPrefsState(getPrefs()); };
  const exit = useCallback(() => { setSession(null); setTick((t) => t + 1); }, []);

  if (session) return <Recall queue={session} today={today} onExit={exit} />;

  const p = view?.plan;
  const left = p?.daysLeft;
  const todayCount = p ? p.queue.length : 0;

  return (
    <div className="carev">
      <header className="carev-head">
        <div className="carev-eyebrow">CA Revision · RBE magazine Sept 2026</div>
        <h1 className="carev-title">
          {left == null ? "…" : left > 0 ? <><b>{left}</b> din baaki</> : left === 0 ? "Aaj exam hai" : "Exam ho gaya"}
        </h1>
        <div className="carev-dim">
          {p && left > 0 ? <>Din {p.dayNo} / {view.days.length} · {PASS_TEXT[p.pass]}</> : "SSC CGL Tier 1 · 1 Oct 2026"}
        </div>
      </header>

      <section className="carev-today" aria-label="Aaj ka target">
        <div className="carev-tiles">
          <div className="carev-tile"><div className="carev-num">{p ? p.due.length : "–"}</div><div>Due aaj</div></div>
          <div className="carev-tile">
            <div className="carev-num">{p ? p.newLeft : "–"}</div>
            <div>Naye{p && p.newTarget ? ` / ${p.newTarget}` : ""}</div>
          </div>
          <div className="carev-tile"><div className="carev-num">{p ? p.day.r : "–"}</div><div>Aaj ho gaye</div></div>
        </div>

        {p && p.freshSections.length ? (
          <div className="carev-target">
            <span className="carev-dim">Aaj ke naye:</span>{" "}
            {p.freshSections.map(([s, n]) => <span key={s} className="carev-sec">{s} · {n}</span>)}
          </div>
        ) : null}
        {p && p.pass === 3 && p.starExtra.length ? (
          <div className="carev-target carev-dim">+ {p.starExtra.length} star kiye hue (Pass 3 mein roz)</div>
        ) : null}

        <button
          className="carev-btn carev-btn-primary carev-wide carev-go"
          disabled={!p || todayCount === 0}
          onClick={() => setSession(p.queue)}
        >
          {!p ? "Load ho raha hai…" : todayCount ? `Aaj ka revision shuru karo · ${todayCount}` : "Aaj ka sab ho gaya ✓"}
        </button>
        {view && view.starred > 0 ? (
          <button className="carev-btn carev-wide" onClick={() => setSession(view.starCards)}>
            Star kiye hue · {view.starred}
          </button>
        ) : null}
        {error ? <p className="carev-error">{error}</p> : null}
      </section>

      {view && view.days.length ? (
        <section className="carev-box" aria-label="Plan">
          <div className="carev-label">Plan · {shortDate(view.start)} se 30 Sep</div>
          <ol className="carev-days">
            {view.days.map((d) => {
              const st = d.key < today ? dayState(view.log[d.key]) : d.key === today ? "today" : "later";
              return (
                <li
                  key={d.key}
                  className={`carev-day p${d.pass} ${st}`}
                  title={`Din ${d.dayNo} · ${shortDate(d.key)} · Pass ${d.pass}`}
                  aria-current={d.key === today ? "date" : undefined}
                >
                  <span className="carev-day-n">{d.dayNo}</span>
                  <span className="carev-day-m">{st === "done" ? "✓" : st === "partial" ? "½" : `P${d.pass}`}</span>
                </li>
              );
            })}
          </ol>
          <ul className="carev-legend carev-small">
            <li><b>P1</b> Din 1–{PASS1_LAST}: naye priority-1</li>
            <li><b>P2</b> Din {PASS1_LAST + 1}–{PASS2_LAST}: priority-2 + recall</li>
            <li><b>P3</b> Din {PASS2_LAST + 1}+: sirf revision</li>
            <li><b>✓</b> target poora · <b>½</b> adhoora</li>
          </ul>
          {p && p.pass < 3 ? (
            <div className="carev-dim carev-small">Is pass mein bache naye: {p.passRemaining}</div>
          ) : null}
        </section>
      ) : null}

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
        {view ? (
          <div className="carev-dim carev-small">
            Dekhe: {view.seen} / {visible.length} · Star: {view.starred}
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
