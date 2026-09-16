"use client";

// Mind Map Revision (/mindmap) — History, Polity, Geography… ke mind maps se
// bane cards. Poori keemat RAASTE mein hai, isliye sawaal breadcrumb hai:
// "Stone Age › Neolithic › Sites › Kashmir Valley › Burzahom → ?"
//
// CA deck se poori tarah alag: alag cards, alag keys (cgl.mm.*), alag plan,
// alag Galtiyan. Saanjha sirf SRS engine aur Recall/Test ke components.
//
// Ye REVISION hai: koi Read mode / 3-pass nahi. Recall hi darwaza hai, aur
// pehli baar dikhta card bhi seedha SRS mein jata hai.

import "@/app/ca-revision/carev.css";
import "./mm.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SUBJECTS, loadCore, loadExt, loadIndex, cardMeta } from "@/lib/mindmap/deck";
import { getSrs, getStars, getGalti, getLog, getPrefs, setPrefs, rate, recordTest } from "@/lib/mindmap/progress";
import { todayPlan } from "@/lib/mindmap/plan";
import { dayKey } from "@/lib/daytime";
import { getExam } from "@/lib/mission";
import Recall from "@/components/carevision/Recall";
import TestMode from "@/components/carevision/TestMode";

const TIERS = [["all", "Sab"], ["A", "A"], ["B", "B"], ["C", "C"]];
const NEW_CHOICES = [20, 40, 60, 80];

export default function MindMapPage() {
  const [today, setToday] = useState(null);
  const [exam, setExam] = useState(null);
  const [index, setIndex] = useState(null);
  const [prefs, setPrefsState] = useState(null);
  const [cards, setCards] = useState([]);
  const [withExt, setWithExt] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [session, setSession] = useState(null);
  const [mode, setMode] = useState("home");     // home | test | maps
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setToday(dayKey());
    setExam(getExam());
    setPrefsState(getPrefs());
    loadIndex().then(setIndex).catch(() => setError("Index nahi mila — net check karo."));
  }, []);

  // Jis subject ki PDF aa chuki hai uske core cards; checkbox par extended bhi.
  useEffect(() => {
    if (!index) return undefined;
    let alive = true;
    setLoading(true);
    const ready = SUBJECTS.filter((s) => index.subjects?.[s.key]).map((s) => s.key);
    Promise.all(ready.map((s) => (withExt
      ? Promise.all([loadCore(s), loadExt(s)]).then((x) => x.flat())
      : loadCore(s))))
      .then((lists) => { if (alive) { setCards(lists.flat()); setLoading(false); } })
      .catch(() => {
        if (alive) { setError("Cards load nahi hue — ek baar khulne ke baad offline chalega."); setLoading(false); }
      });
    return () => { alive = false; };
  }, [index, withExt]);

  useEffect(() => {
    const onVis = () => {
      if (!document.hidden) { setToday(dayKey()); setExam(getExam()); setTick((t) => t + 1); }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const subject = prefs?.subject || "all";
  const tier = prefs?.tier || "all";
  const visible = useMemo(() => cards.filter((c) =>
    (subject === "all" || c.subject === subject) && (tier === "all" || c.tier === tier)), [cards, subject, tier]);

  const view = useMemo(() => {
    if (!today || !exam) return null;
    const srs = getSrs();
    const stars = getStars();
    const galti = getGalti();
    const log = getLog();
    const plan = todayPlan({ cards: visible, srs, stars, galti, log, today, exam, newPerDay: prefs?.newPerDay || 40 });
    const perSubject = {};
    for (const c of cards) {
      const s = (perSubject[c.subject] = perSubject[c.subject] || { total: 0, due: 0, seen: 0 });
      s.total += 1;
      if (srs[c.id]) s.seen += 1;
      if (srs[c.id] && srs[c.id].d <= today) s.due += 1;
    }
    return { plan, srs, stars, galti, perSubject };
  }, [today, exam, cards, visible, prefs, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (patch) => { setPrefs(patch); setPrefsState(getPrefs()); };
  const exit = useCallback(() => {
    setSession(null);
    setMode("home");
    setTick((t) => t + 1);
    window.scrollTo(0, 0);
  }, []);
  const onRate = useCallback((card, good) => rate(card.id, good, today, exam), [today, exam]);
  const dress = (list) => list.map((c) => ({ ...c, meta: cardMeta(c), extra: c.flagged ? `⚠ ${c.flagged}` : null }));

  if (session) return <Recall queue={dress(session)} today={today} onExit={exit} onRate={onRate} />;

  if (mode === "test" && view) {
    return (
      <TestMode
        cards={visible}
        parts={[...new Set(visible.map((c) => c.subject))].sort()}
        today={today}
        groupKey="subject"
        groupLabel="Subject"
        stars={view.stars}
        record={(results, day) => recordTest(results, day, exam)}
        expand={(subs) => Promise.all(subs.map(loadExt)).then((x) => x.flat())}
        onExit={exit}
        onGaltiyan={() => { setMode("home"); setSession(view.plan.galtiCards); }}
      />
    );
  }

  if (mode === "maps" && view) {
    const maps = [];
    for (const c of visible) {
      const key = `${c.subject}/${c.pdfPage}`;
      let m = maps.find((x) => x.key === key);
      if (!m) { m = { key, title: c.mapTitle, subject: c.subject, tier: c.tier, cards: [] }; maps.push(m); }
      m.cards.push(c);
    }
    return (
      <div className="carev">
        <div className="carev-bar"><button className="carev-link" onClick={exit}>← Wapas</button><span /></div>
        <h1 className="carev-title carev-h2">Map chuno</h1>
        <p className="carev-dim carev-small">
          Ek map ke saare cards, PDF ke kram mein — jab pata ho ki wahi topic kamzor hai.
        </p>
        <ul className="mm-maps">
          {maps.map((m) => (
            <li key={m.key}>
              <button className="mm-map" onClick={() => setSession(m.cards)}>
                <span className="mm-map-t">{m.title}</span>
                <span className="carev-dim carev-small">{m.subject} · tier {m.tier} · {m.cards.length} card</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const p = view?.plan;
  const left = p?.daysLeft;
  const ready = index ? SUBJECTS.filter((s) => index.subjects?.[s.key]) : [];
  const pending = index ? SUBJECTS.filter((s) => !index.subjects?.[s.key]) : [];

  return (
    <div className="carev">
      <header className="carev-head">
        <div className="carev-eyebrow">Mind Maps · revision</div>
        <h1 className="carev-title">
          {left == null ? "…" : left > 0 ? <><b>{left}</b> din baaki</> : left === 0 ? "Aaj exam hai" : "Exam ho gaya"}
        </h1>
        <div className="carev-dim">
          {exam ? `Exam ${exam} · ` : ""}{cards.length} card{subject !== "all" ? ` · ${subject}` : ""}
        </div>
      </header>

      <section className="carev-today">
        <div className="carev-tiles">
          <div className="carev-tile"><div className="carev-num">{p ? p.due.length : "–"}</div><div>Due aaj</div></div>
          <div className="carev-tile"><div className="carev-num">{p ? p.fresh.length : "–"}</div><div>Naye</div></div>
          <div className="carev-tile"><div className="carev-num">{p ? p.day.r : "–"}</div><div>Aaj ho gaye</div></div>
        </div>
        <button
          className="carev-btn carev-btn-primary carev-wide carev-go"
          disabled={!p || !p.queue.length}
          onClick={() => setSession(p.queue)}
        >
          {loading ? "Load ho raha hai…"
            : p && p.queue.length ? `Aaj ka revision shuru karo · ${p.queue.length}` : "Aaj ka sab ho gaya ✓"}
        </button>
        <div className="carev-modes">
          <button className="carev-btn" onClick={() => setMode("test")} disabled={!visible.length}>Test</button>
          <button className="carev-btn" disabled={!p || !p.galtiCards.length} onClick={() => setSession(p.galtiCards)}>
            Galtiyan · {p ? p.galtiCards.length : 0}
          </button>
          <button className="carev-btn" onClick={() => setMode("maps")} disabled={!visible.length}>Map</button>
        </div>
        {p && p.starCards.length ? (
          <button className="carev-btn carev-wide" onClick={() => setSession(p.starCards)}>
            Star kiye hue · {p.starCards.length}
          </button>
        ) : null}
        {error ? <p className="carev-error">{error}</p> : null}
      </section>

      <section className="carev-box">
        <div className="carev-label">Subject</div>
        <div className="mm-tiles">
          <button className={`mm-tile${subject === "all" ? " on" : ""}`} onClick={() => update({ subject: "all" })}>
            <span className="mm-ico">📚</span>
            <span className="mm-name">Sab</span>
            <span className="mm-due">{cards.length}</span>
          </button>
          {ready.map((s) => (
            <button
              key={s.key}
              className={`mm-tile${subject === s.key ? " on" : ""}`}
              onClick={() => update({ subject: s.key })}
            >
              <span className="mm-ico">{s.icon}</span>
              <span className="mm-name">{s.label}</span>
              <span className="mm-due">{view?.perSubject[s.key]?.due || 0} due</span>
            </button>
          ))}
          {pending.map((s) => (
            <span key={s.key} className="mm-tile off" title="PDF abhi add nahi hui">
              <span className="mm-ico">{s.icon}</span>
              <span className="mm-name">{s.label}</span>
              <span className="mm-due">PDF baaki</span>
            </span>
          ))}
        </div>

        <div className="carev-label">Tier</div>
        <div className="carev-chips">
          {TIERS.map(([v, l]) => (
            <button key={v} className={`carev-chip${tier === v ? " on" : ""}`} onClick={() => update({ tier: v })}>{l}</button>
          ))}
        </div>

        <div className="carev-label">Naye cards / din</div>
        <div className="carev-chips">
          {NEW_CHOICES.map((n) => (
            <button
              key={n}
              className={`carev-chip${prefs?.newPerDay === n ? " on" : ""}`}
              onClick={() => update({ newPerDay: n })}
            >{n}</button>
          ))}
        </div>

        <label className="carev-check">
          <input type="checkbox" checked={withExt} onChange={(e) => setWithExt(e.target.checked)} />
          Budget ke bahar wale cards bhi (extended)
        </label>
        {view ? (
          <div className="carev-dim carev-small">
            Dekhe: {Object.values(view.perSubject).reduce((n, s) => n + s.seen, 0)} / {cards.length}
          </div>
        ) : null}
      </section>

      <p className="carev-dim carev-small carev-foot">
        Har card mind map ke raaste se bana hai (map ka naam aur PDF page card par).
        ⚠ wale card ka raasta ya fact PDF mein shaq wala tha.
      </p>
    </div>
  );
}
