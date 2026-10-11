"use client";

// 🅳 Focus — screen par sirf ABHI ka kaam, bahut bada, ek gol ghadi ke saath
// jo block ka bacha hua waqt dikhati hai. Neeche aaj ke saare kaam ek patli
// qatar mein (beete ✓, abhi wala roshan). Sabse neeche teen chhote number.

import Link from "next/link";
import { Go, splitTitle, secOf } from "./parts";
import { hhmm } from "./useMissionHome";

export default function HomeFocus({ d }) {
  const b = d.cur;
  const life = !b || b.life || b.brk;
  const frac = b ? Math.min(1, Math.max(0, (d.nowMin - b.s) / Math.max(1, b.e - b.s))) : 0;
  const R = 92, C = 2 * Math.PI * R;
  const [name, topic] = splitTitle(b);
  return (
    <div className="hD" style={{ "--sc": secOf(b).c }}>
      <p className="hD-top">
        Day <b>{d.day}</b>/{d.N} · <span style={{ color: d.phase.color }}>{d.phase.name}</span> · Exam <b>{d.toExam ?? "–"}</b> din
      </p>

      <section className="hD-stage">
        <div className="hD-clock">
          <svg viewBox="0 0 220 220" aria-hidden="true">
            <circle cx="110" cy="110" r={R} className="hD-clock__bg" />
            <circle cx="110" cy="110" r={R} className="hD-clock__fg" strokeDasharray={C} strokeDashoffset={C * frac} />
          </svg>
          <div className="hD-clock__in">
            <b>{b ? hhmm(Math.max(0, b.e - d.nowMin)) : "—"}</b>
            <span>{b ? `${b.start} – ${b.end}` : ""}</span>
          </div>
        </div>
        <div className="hD-task">
          <span className="hD-label">{life ? "Abhi" : "▶ ABHI KA KAAM"}</span>
          <h1 className="hD-name">{b ? name : "Khaali waqt"}</h1>
          {topic ? <p className="hD-topic">{topic}</p> : null}
          {b && b.tg ? <p className="hD-tg">🎯 {b.tg}</p> : null}
          {!life && (
            <div className="hD-btns">
              <Go b={b} />
              <button className={`hD-done${d.doneToday[b.id] ? " is-on" : ""}`} onClick={() => d.toggle(b.id)}>
                {d.doneToday[b.id] ? "✓ Ho gaya (undo)" : "✓ Ho gaya"}
              </button>
            </div>
          )}
          {d.next ? <p className="hD-next">Uske baad <b>{d.next.start}</b> — {splitTitle(d.next)[0]}</p> : null}
        </div>
      </section>

      <section className="hD-rail" aria-label="Aaj ke kaam">
        {d.work.map((w) => {
          const isNow = b && b.id === w.id;
          return (
            <span
              key={w.id}
              className={`hD-step${isNow ? " is-now" : ""}${d.doneToday[w.id] ? " is-ok" : ""}${w.e <= d.nowMin ? " is-past" : ""}`}
              style={{ "--sc": secOf(w).c }}
              title={w.t}
            >
              <i>{d.doneToday[w.id] ? "✓" : secOf(w).icon}</i>
              <small>{w.start}</small>
            </span>
          );
        })}
      </section>

      <section className="hD-foot">
        <div><b>{d.stats.coreDone}/{d.stats.coreTotal}</b><span>CORE</span></div>
        <div><b>{d.streak}</b><span>🔥 streak</span></div>
        <div><b>{d.due.n}</b><span>🧠 due</span></div>
        <div><b>{d.lastPct ?? d.PCT_NOW}</b><span>🎯 → {d.PCT_TARGET}</span></div>
      </section>
      <p className="hD-links">
        <Link href="/pyq/sprint">⚡ Sprint</Link> · <Link href={`/mission/plan?day=${d.dd}`}>📅 Poora din</Link> · <Link href="/mission/progress">🚩 Checkpoints</Link>
      </p>
    </div>
  );
}
