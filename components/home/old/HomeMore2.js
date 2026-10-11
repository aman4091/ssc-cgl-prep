"use client";

// Homepage roop J–N. Sab components/home/useMissionHome ka hi data padhte hain.

import Link from "next/link";
import { Go, Tick, subjectsOf, BlockName, splitTitle, secOf } from "./parts";
import { hhmm } from "./useMissionHome";

const isDone = (d, b) => !!(b && d.doneToday[b.id]);

// 🅹 Ghadi — poora din ek 24 ghante ki gol ghadi: har block ek rangeen arc,
// sui abhi ke waqt par, beech mein abhi ka kaam. Daayen aane wale kaam.
export function HomeDial({ d }) {
  const R = 150, cx = 180, cy = 180;
  const ang = (min) => (min / 1440) * 2 * Math.PI - Math.PI / 2;
  const pt = (min, r) => [cx + r * Math.cos(ang(min)), cy + r * Math.sin(ang(min))];
  const arc = (s, e, r) => {
    const [x1, y1] = pt(s, r), [x2, y2] = pt(e, r);
    return `M ${x1} ${y1} A ${r} ${r} 0 ${e - s > 720 ? 1 : 0} 1 ${x2} ${y2}`;
  };
  const [hx, hy] = pt(d.nowMin, R + 14);
  const [h0x, h0y] = pt(d.nowMin, R - 40);
  const up = d.work.filter((b) => b.e > d.nowMin).slice(0, 6);
  return (
    <div className="hJ">
      <section className="hJ-dial">
        <svg viewBox="0 0 360 360">
          <circle cx={cx} cy={cy} r={R} className="hJ-ring" />
          {Array.from({ length: 24 }, (_, h) => {
            const [x1, y1] = pt(h * 60, R + 16), [x2, y2] = pt(h * 60, R + (h % 6 ? 20 : 26));
            const [tx, ty] = pt(h * 60, R + 36);
            return (
              <g key={h}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} className="hJ-tick" />
                {h % 3 === 0 ? <text x={tx} y={ty} className="hJ-hr">{h}</text> : null}
              </g>
            );
          })}
          {d.tl.filter((b) => b.id !== "sleep").map((b) => (
            <path key={b.id} d={arc(b.s, Math.max(b.s + 4, b.e - 2), R)} className={`hJ-arc${b.life || b.brk ? " is-life" : ""}${isDone(d, b) ? " is-ok" : ""}`} style={{ stroke: secOf(b).c }} />
          ))}
          <line x1={h0x} y1={h0y} x2={hx} y2={hy} className="hJ-hand" />
          <circle cx={h0x} cy={h0y} r="5" className="hJ-pin" />
        </svg>
        <div className="hJ-center">
          <span>{d.cur ? `${d.cur.start}–${d.cur.end}` : "Abhi"}</span>
          <b>{d.cur ? splitTitle(d.cur)[0] : "Khaali"}</b>
          {d.cur && !d.cur.life ? <em>{hhmm(Math.max(0, d.cur.e - d.nowMin))} bacha</em> : null}
        </div>
      </section>
      <aside className="hJ-side">
        <p className="hJ-kick">Day {d.day}/{d.N} · {d.phase.name} · exam {d.toExam} din</p>
        {d.cur && !d.cur.life ? (
          <div className="hJ-now" style={{ "--sc": secOf(d.cur).c }}>
            <BlockName b={d.cur} />
            <div className="hJ-btns"><Go b={d.cur} /><button className="btn btn--ghost btn--sm" onClick={() => d.toggle(d.cur.id)}>{isDone(d, d.cur) ? "↩" : "✓ Ho gaya"}</button></div>
          </div>
        ) : null}
        <h3>Aage</h3>
        {up.map((b) => (
          <div key={b.id} className="hJ-up" style={{ "--sc": secOf(b).c }}>
            <span>{b.start}</span><b>{splitTitle(b)[0]}</b><small>{hhmm(b.min)}</small>
          </div>
        ))}
        <p className="hJ-foot">CORE {d.stats.coreDone}/{d.stats.coreTotal} · 🔥 {d.streak} · 🧠 {d.due.n} due</p>
      </aside>
    </div>
  );
}

// 🅺 Raasta — 32 din ek sadak par: Day 1 se EXAM tak, beech mein checkpoint
// (CP1/CP2/CP3), D14 ka Maths gate aur phase badalne ke padaav. Tum kahan ho
// uska nishaan. Neeche aaj ke teen topic.
export function HomeRoad({ d }) {
  const pos = (n) => ((n - 1) / d.N) * 100;
  const stops = [
    { n: 1, t: "Start", i: "🚩" },
    { n: d.cps.c1, t: "CP1", i: "🎯" },
    { n: 14, t: "Maths gate", i: "🚪" },
    { n: d.cps.c2, t: "CP2", i: "🎯" },
    { n: d.cps.c3, t: "CP3 · Peak", i: "🎯" },
  ];
  const subs = subjectsOf(d);
  return (
    <div className="hK">
      <header className="hK-hd">
        <h1>Mission ka raasta</h1>
        <span>{Math.round(((d.day - 1) / d.N) * 100)}% safar · {d.toExam} din aur</span>
      </header>
      <section className="hK-road">
        <div className="hK-lane">
          {d.phases.map((p) => (
            <span key={p.k} className="hK-ph" style={{ left: `${pos(p.from)}%`, width: `${((p.to - p.from + 1) / d.N) * 100}%`, "--pc": p.color }}>{p.name}</span>
          ))}
          <span className="hK-done" style={{ width: `${pos(d.day)}%` }} />
          {stops.map((s) => (
            <span key={s.t} className={`hK-stop${s.n <= d.day ? " is-past" : ""}`} style={{ left: `${pos(s.n)}%` }}>
              <i>{s.i}</i><small>{s.t}<br />D{s.n}</small>
            </span>
          ))}
          <span className="hK-flag" style={{ left: "100%" }}><i>🏁</i><small>EXAM<br />27 Oct</small></span>
          <span className="hK-me" style={{ left: `${pos(d.day)}%` }}><i>🚀</i><b>Aap · D{d.day}</b></span>
        </div>
      </section>
      <section className="hK-today">
        {d.cur && !d.cur.life ? (
          <div className="hK-now" style={{ "--sc": secOf(d.cur).c }}>
            <span>▶ ABHI · {d.cur.start}</span>
            <b><BlockName b={d.cur} /></b>
            <div className="hK-btns"><Go b={d.cur} /><button className="btn btn--ghost btn--sm" onClick={() => d.toggle(d.cur.id)}>{isDone(d, d.cur) ? "↩" : "✓"}</button></div>
          </div>
        ) : null}
        {subs.map((s) => (
          <div key={s.k} className="hK-sub" style={{ "--sc": s.c }}>
            <span>{s.icon} {s.label}</span><b>{s.t}</b><Go b={s.b} />
          </div>
        ))}
      </section>
    </div>
  );
}

// 🅻 Subah ki Khabar — Home ek akhbaar ka pehla panna: aaj ki headline, ek
// chhota lead paragraph, "Aaj ka schedule" column aur "Aankde" ka dabba.
export function HomeBrief({ d }) {
  const p = d.plan || {};
  const g = p.g ? p.g.t.split(":")[0] : "", m = p.m ? p.m.t : "", e = p.e ? p.e.t : "";
  const date = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return (
    <div className="hL">
      <header className="hL-mast">
        <span>{date}</span>
        <h1>The CGL Times</h1>
        <span>Day {d.day} of {d.N} · Phase {d.phase.k}</span>
      </header>
      <section className="hL-lead">
        <p className="hL-kick">{p.type === "A" ? `Aaj FULL MOCK ${p.fm}` : "Aaj sectional ka din"} · exam {d.toExam} din door</p>
        <h2>{g}{m ? `, ${m}` : ""}{e ? ` aur ${e.split("+")[0].trim()}` : ""}</h2>
        <p className="hL-deck">
          {d.phase.t} Aaj ke {d.stats.coreTotal} CORE kaam mein se {d.stats.coreDone} ho chuke hain;
          {d.cur && !d.cur.life ? ` abhi ${splitTitle(d.cur)[0]} chal raha hai (${hhmm(Math.max(0, d.cur.e - d.nowMin))} bacha).` : " abhi koi padhai ka block nahi."}
        </p>
        {d.cur && !d.cur.life ? <div className="hL-go"><Go b={d.cur} /><button className="btn btn--ghost btn--sm" onClick={() => d.toggle(d.cur.id)}>{isDone(d, d.cur) ? "↩ Undo" : "✓ Ho gaya"}</button></div> : null}
      </section>
      <div className="hL-cols">
        <section className="hL-col">
          <h3>Aaj ka schedule</h3>
          {d.work.map((b) => (
            <div key={b.id} className={`hL-li${isDone(d, b) ? " is-ok" : ""}${d.cur && d.cur.id === b.id ? " is-now" : ""}`}>
              <Tick ok={isDone(d, b)} onClick={() => d.toggle(b.id)} />
              <span className="hL-time">{b.start}</span>
              <span>{splitTitle(b)[0]}</span>
            </div>
          ))}
        </section>
        <section className="hL-col">
          <h3>Aankde</h3>
          <dl className="hL-nums">
            <div><dt>Exam tak</dt><dd>{d.toExam} din</dd></div>
            <div><dt>CORE aaj</dt><dd>{d.stats.coreDone}/{d.stats.coreTotal}</dd></div>
            <div><dt>Streak</dt><dd>{d.streak} din</dd></div>
            <div><dt>Cluster due</dt><dd>{d.due.n}</dd></div>
            <div><dt>Naye cluster</dt><dd>{d.clusters}/{d.CLUSTER_TARGET}</dd></div>
            <div><dt>Percentile</dt><dd>{d.lastPct ?? d.PCT_NOW} → {d.PCT_TARGET}</dd></div>
            <div><dt>Full mock</dt><dd>{d.mocksDone}/{d.totalMocks}</dd></div>
          </dl>
          <h3>Kal</h3>
          {d.days[d.dd] ? <p className="hL-tmrw">D{d.dd + 1}: {d.days[d.dd].gT.split(":")[0]} · {d.days[d.dd].mT}</p> : <p className="hL-tmrw">EXAM 🎯</p>}
          <Link href="/mission/plan" className="hL-more">Poora plan →</Link>
        </section>
      </div>
    </div>
  );
}

// 🅼 Numbers Wall — sirf bade number, har ek apne dabbe mein; ABHI ek patli
// patti upar. Jo number dekh kar kaam karta hai, uske liye.
export function HomeWall({ d }) {
  const T = [
    { n: d.toExam, l: "din baaki", s: "CGL · 27 Oct", big: true },
    { n: `${d.day}/${d.N}`, l: "mission ka din", s: d.phase.name },
    { n: `${d.stats.coreDone}/${d.stats.coreTotal}`, l: "CORE aaj", s: d.dayOK ? "✓ din count" : "🔒 GS gate" },
    { n: d.streak, l: "🔥 streak", s: "din lagatar" },
    { n: d.due.n, l: "🧠 cluster due", s: "fact log" },
    { n: `${d.clusters}/${d.CLUSTER_TARGET}`, l: "🧩 naye cluster", s: "aaj" },
    { n: d.lastPct ?? d.PCT_NOW, l: "🎯 percentile", s: `target ${d.PCT_TARGET}` },
    { n: d.lastScore ?? "—", l: "📝 aakhri mock", s: `FLOOR ${d.FLOOR.total} · TARGET ${d.TARGET.total}` },
    { n: `${d.mocksDone}/${d.totalMocks}`, l: "full mock", s: "is mission mein" },
  ];
  return (
    <div className="hM">
      {d.cur ? (
        <section className="hM-now" style={{ "--sc": secOf(d.cur).c }}>
          <span>▶ {d.cur.start}–{d.cur.end}</span><b>{splitTitle(d.cur)[0]}</b><em>{hhmm(Math.max(0, d.cur.e - d.nowMin))}</em>
          {!d.cur.life ? <Go b={d.cur} /> : null}
        </section>
      ) : null}
      <section className="hM-grid">
        {T.map((t, i) => (
          <div key={i} className={`hM-t${t.big ? " is-big" : ""}`}>
            <b>{t.n}</b><span>{t.l}</span><small>{t.s}</small>
          </div>
        ))}
      </section>
      <p className="hM-links"><Link href="/pyq/sprint">⚡ Sprint</Link> · <Link href="/mission/plan">📅 Plan</Link> · <Link href="/mission/progress">🚩 Checkpoints</Link> · <Link href="/mission/facts">🧠 Fact log</Link></p>
    </div>
  );
}

// 🅽 Gantt — din ek chart: upar ghante (05–23), har section ki apni line, block
// patti ki tarah apni jagah par, laal khadi lakeer = abhi.
export function HomeGantt({ d }) {
  const S = 5 * 60, E = 23.5 * 60, W = E - S;
  const x = (min) => `${((Math.min(E, Math.max(S, min)) - S) / W) * 100}%`;
  const rows = [
    { k: "mock", t: "📝 Mock" }, { k: "gs", t: "🌍 GS" }, { k: "maths", t: "🧮 Maths" },
    { k: "english", t: "📘 English" }, { k: "reasoning", t: "🧠 Reasoning" }, { k: "rev", t: "🔁 Revision" }, { k: "life", t: "☕ Life" },
  ];
  const rowOf = (b) => (b.life || b.brk ? "life" : b.sec);
  return (
    <div className="hN">
      <header className="hN-hd">
        <h1>Day {d.day} · chart</h1>
        <span>{d.phase.name} · CORE {d.stats.coreDone}/{d.stats.coreTotal} · exam {d.toExam} din</span>
      </header>
      <section className="hN-chart">
        <div className="hN-in">
        <div className="hN-hours">
          <span className="hN-lbl" />
          <div className="hN-track">
            {Array.from({ length: 19 }, (_, i) => 5 + i).map((h) => <span key={h} style={{ left: x(h * 60) }}>{String(h).padStart(2, "0")}</span>)}
          </div>
        </div>
        {rows.map((r) => (
          <div key={r.k} className="hN-row">
            <span className="hN-lbl">{r.t}</span>
            <div className="hN-track">
              {d.tl.filter((b) => b.id !== "sleep" && rowOf(b) === r.k).map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className={`hN-bar${isDone(d, b) ? " is-ok" : ""}${d.cur && d.cur.id === b.id ? " is-now" : ""}${b.core ? " is-core" : ""}`}
                  style={{ left: x(b.s), width: `calc(${x(b.e)} - ${x(b.s)})`, "--sc": secOf(b).c }}
                  title={`${b.start}–${b.end} · ${b.t}`}
                  onClick={() => !(b.life || b.brk) && d.toggle(b.id)}
                >
                  {b.min >= 45 ? splitTitle(b)[0] : ""}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div className="hN-nowline" style={{ left: `calc(120px + (100% - 120px) * ${(Math.min(E, Math.max(S, d.nowMin)) - S) / W})` }}><span>ABHI</span></div>
        </div>
      </section>
      <p className="hN-hint">Kisi patti par tap = ✓ ho gaya / undo. Mota kinara = CORE.</p>
      {d.cur && !d.cur.life ? (
        <section className="hN-now" style={{ "--sc": secOf(d.cur).c }}>
          <b><BlockName b={d.cur} /></b>
          <span>{hhmm(Math.max(0, d.cur.e - d.nowMin))} bacha</span>
          <Go b={d.cur} />
        </section>
      ) : null}
    </div>
  );
}
