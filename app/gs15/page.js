"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PlanPractice from "@/components/PlanPractice";
import PageQuizRow from "@/components/PageQuizRow";
import RevisionTodayCard from "@/components/RevisionTodayCard";
import {
  DAYS, SEC_META, TOTAL_CHAPTERS, TOTAL_PAGES,
  getGs15, setStartDate, resetGs15, toggleItem, toggleWeak, weakKey,
  planFor, currentDayNum, dayStats, dayCompletion, mustComplete, planStreak, passProgress,
} from "@/lib/gs15";

// /gs15 — the 15-day GS sprint. A SECOND plan page, deliberately: the owner
// asked to keep /today (RBE) and put this "alag doosre page pr". The RBE plan
// stays as a menu to pull tests from; this is the one with a daily contract.
//
// Design constraint that drove everything here: the previous two plans died on
// day 2 because a day was all-or-nothing and enormous. So every day splits into
// MUST (~2h, makes the day COUNT and feeds the streak) and bonus. A day is never
// a debt — miss it and the next day is still just its own MUST.

const PASS_NAME = { 1: "Pehla pass · seekhna", 2: "Doosra pass · yaad", 3: "Teesra pass · flash" };
const PASS_COLOR = { 1: "#8ab4f8", 2: "#f59e0b", 3: "#6bd39a" };

function fmtDate(startDate, n) {
  const [y, m, d] = startDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  dt.setUTCDate(dt.getUTCDate() + (n - 1));
  return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
}
const hrs = (m) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60 ? (m % 60) + "m" : ""}`.trim() : `${m}m`);

function ChapterRow({ book, ch, pages, done, weak, onToggle, onWeak, pass }) {
  return (
    <div
      className="row"
      style={{
        gap: 8, alignItems: "center", flexWrap: "wrap",
        padding: "6px 0", opacity: done ? 0.5 : 1,
        borderLeft: pass === 3 && weak ? "2px solid var(--bad, #ff8a7a)" : "2px solid transparent",
        paddingLeft: 8,
      }}
    >
      <button className={"chk__box" + (done ? " is-on" : "")} onClick={onToggle} aria-label={done ? "Undo" : "Done"}>
        {done ? "✓" : ""}
      </button>
      <span style={{ flex: 1, minWidth: 140, fontSize: "0.86rem", textDecoration: done ? "line-through" : "none" }}>
        {ch}
        <span className="muted" style={{ fontSize: "0.72rem", marginLeft: 6 }}>{pages}p</span>
      </span>
      <button
        className="btn btn--ghost btn--sm"
        onClick={onWeak}
        title={weak ? "Weak mark hata do" : "Weak — teesre pass mein ye dobara aayega"}
        style={weak ? { color: "#fbbf24", borderColor: "#fbbf24" } : { opacity: 0.55 }}
      >
        {weak ? "⭐" : "☆"}
      </button>
      <PageQuizRow book={book} chapter={ch} compact />
    </div>
  );
}

function Block({ b, day, done, weak, onToggle, onWeak }) {
  const meta = SEC_META[b.sec] || {};
  const slots = b.chapters ? b.chapters.map((_, i) => b.id + "-" + i) : [b.id];
  const dn = slots.filter((s) => done[s]).length;
  const allDone = dn >= slots.length;

  return (
    <div
      className="glass-card target-card"
      style={b.must ? { borderColor: "var(--accent)" } : undefined}
    >
      <div className="row between" style={{ gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
        <span>
          <span
            className="badge"
            style={{
              color: meta.color, borderColor: "transparent",
              background: `color-mix(in srgb, ${meta.color} 14%, transparent)`,
              fontSize: "0.68rem", fontWeight: 700,
            }}
          >
            {meta.icon} {meta.name}
          </span>
          {b.must && (
            <span
              className="badge"
              style={{
                marginLeft: 6, color: "var(--accent)", background: "var(--accent-wash)",
                border: "none", fontSize: "0.66rem", fontWeight: 800,
              }}
            >
              MUST
            </span>
          )}
        </span>
        <span className="muted" style={{ fontSize: "0.72rem", whiteSpace: "nowrap" }}>
          ~{b.min}m{slots.length > 1 ? ` · ${dn}/${slots.length}` : ""}
        </span>
      </div>

      <div className="row" style={{ gap: 8, alignItems: "flex-start" }}>
        {!b.chapters && (
          <button
            className={"chk__box" + (done[b.id] ? " is-on" : "")}
            style={{ marginTop: 2, flexShrink: 0 }}
            onClick={() => onToggle(b.id)}
            aria-label={done[b.id] ? "Undo" : "Done"}
          >
            {done[b.id] ? "✓" : ""}
          </button>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "0.9rem", fontWeight: b.chapters ? 700 : 500,
              textDecoration: !b.chapters && allDone ? "line-through" : "none",
            }}
          >
            {b.t}
          </div>
          {b.note && <p className="hint" style={{ margin: "3px 0 0" }}>{b.note}</p>}
          {(b.links || b.auto) && (
            <div className="row" style={{ gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              {b.auto && <PlanPractice auto={b.auto} title={b.t} />}
              {(b.links || []).map(([href, label], i) => (
                <Link key={i} href={href} className="btn btn--ghost btn--sm">{label} →</Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {b.chapters && (
        <div style={{ marginTop: 6 }}>
          {b.chapters.map((c, i) => (
            <ChapterRow
              key={c.ch}
              book={b.book}
              ch={c.ch}
              pages={c.pages}
              pass={b.pass}
              done={!!done[b.id + "-" + i]}
              weak={!!weak[weakKey(b.book, c.ch)]}
              onToggle={() => onToggle(b.id + "-" + i)}
              onWeak={() => onWeak(b.book, c.ch)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Gs15Page() {
  const [st, setSt] = useState(null);
  const [viewDay, setViewDay] = useState(null);
  const [dateIn, setDateIn] = useState("");

  useEffect(() => {
    setSt(getGs15());
    const t = new Date();
    setDateIn(`${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`);
  }, []);

  if (st === null) return <div className="placeholder">…</div>;

  if (!st.startDate) {
    return (
      <>
        <section className="hero">
          <span className="hero__eyebrow">🔥 15-Day GS Sprint</span>
          <h1 className="hero__title">
            {TOTAL_CHAPTERS} chapter, <span className="grad">3 baar</span>, 15 din
          </h1>
          <p className="hero__sub">
            Poori Parmar GK/GS book — {TOTAL_PAGES} page — teen baar. Saath mein roz English
            aur ek din chhod ke Reasoning. Maths tu khud kar raha hai, wo isme schedule nahi hai.
          </p>
        </section>
        <section className="section">
          <div className="glass-card" style={{ padding: 18 }}>
            <div className="card-hd">Din COUNT kab hota hai</div>
            <p className="muted" style={{ fontSize: "0.88rem" }}>
              Har din 3-4 <strong>MUST</strong> block hain — lagbhag <strong>2 ghante</strong>.
              Wo ho gaye = din jeeta, streak chali. Baaki sab bonus hai. Poora din ~3.5-4 ghante ka
              hai, par tujhe kabhi poora karna zaroori nahi.
            </p>
            <p className="hint">
              Aur sabse zaroori niyam: <strong>din chhoot jaye to peeche mat jao.</strong> Koi
              backlog nahi banta. Agle din bas us din ka MUST.
            </p>
            <div className="form-grid mt-16">
              <label className="field">
                <span>Day 1 kaunsa din hai?</span>
                <input type="date" className="input" value={dateIn} onChange={(e) => setDateIn(e.target.value)} />
              </label>
            </div>
            <button
              className="btn btn--primary btn--block mt-16"
              onClick={() => { if (dateIn) setSt({ ...setStartDate(dateIn) }); }}
            >
              Shuru karo →
            </button>
          </div>
        </section>
      </>
    );
  }

  const today = currentDayNum(st);
  const n = viewDay || Math.min(Math.max(today, 1), 15);
  const p = planFor(n);
  const isToday = n === today;
  const done = st.done[n] || {};
  const stats = dayStats(st, n);
  const streak = planStreak(st);
  const mustOK = mustComplete(st, n);
  const pct = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;
  const mustPct = stats.mustTotal ? Math.round((stats.mustDone / stats.mustTotal) * 100) : 0;
  const prog = passProgress(st);
  const mustBlocks = p.blocks.filter((b) => b.must);
  const bonusBlocks = p.blocks.filter((b) => !b.must);
  const onToggle = (id) => setSt({ ...toggleItem(n, id) });
  const onWeak = (book, ch) => setSt({ ...toggleWeak(book, ch) });

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">🔥 15-Day GS Sprint</span>
          {streak > 1 && <span className="badge">🔥 {streak} din</span>}
        </div>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)" }}>
          {today > 15
            ? <>15 din <span className="grad">poore</span> 🎯</>
            : today < 1
              ? <>Day 1: <span className="grad">{fmtDate(st.startDate, 1)}</span></>
              : <>Day <span className="grad">{n} / 15</span></>}
        </h1>
        <p className="hero__sub">
          {fmtDate(st.startDate, n)}
          {!isToday && today >= 1 && today <= 15 ? ` · (aaj Day ${today} hai)` : ""}
          {" · "}
          <span style={{ color: PASS_COLOR[p.pass], fontWeight: 700 }}>{PASS_NAME[p.pass]}</span>
        </p>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="glass-card" style={{ padding: "10px 14px", borderColor: PASS_COLOR[p.pass] }}>
          <span style={{ fontSize: "0.84rem", lineHeight: 1.5 }}>{p.how}</span>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <RevisionTodayCard />
      </section>

      <section className="section">
        {today > 15 && (
          <div className="glass-card" style={{ padding: 16, marginBottom: 12 }}>
            <p className="muted" style={{ margin: 0 }}>
              15 din khatam. Ab sirf Mistake Notebook + ⭐ waale chapters + neend. 💪
            </p>
          </div>
        )}

        {isToday && today > 1 && today <= 15 && !mustComplete(st, today - 1) && (
          <div className="glass-card" style={{ padding: "10px 14px", marginBottom: 12 }}>
            <span className="muted" style={{ fontSize: "0.84rem" }}>
              Kal (Day {today - 1}) ka MUST poora nahi hua. <strong>Usko chhod de</strong> — peeche
              jaana hi wo cheez hai jo pichle do plan maar chuki hai. Aaj Day {today} karo.
            </span>
          </div>
        )}

        <div className="row between" style={{ marginBottom: 6 }}>
          <span style={{ fontSize: "0.8rem", fontWeight: 700, color: mustOK ? "var(--ok)" : "var(--accent)" }}>
            MUST {stats.mustDone}/{stats.mustTotal} · ~{hrs(stats.mustMin)}
          </span>
          <span className="muted" style={{ fontSize: "0.8rem" }}>
            poora din {stats.done}/{stats.total} · ~{hrs(stats.min)}
          </span>
        </div>
        <div className="progress" style={{ marginBottom: 4 }}>
          <div className="progress__bar" style={{ width: mustPct + "%" }} />
        </div>
        <div className="progress" style={{ marginBottom: 12, opacity: 0.45 }}>
          <div className="progress__bar" style={{ width: pct + "%" }} />
        </div>

        {mustOK && (
          <div className="glass-card" style={{ padding: "10px 14px", marginBottom: 12, borderColor: "var(--ok)" }}>
            <span style={{ color: "var(--ok)", fontWeight: 700, fontSize: "0.85rem" }}>
              ✓ MUST poora — aaj ka din COUNT ho gaya. Ab jo bhi karega, upar se hai.
            </span>
          </div>
        )}

        {mustBlocks.map((b) => (
          <Block key={b.id} b={b} day={n} done={done} weak={st.weak} onToggle={onToggle} onWeak={onWeak} />
        ))}

        {bonusBlocks.length > 0 && (
          <>
            <h2 style={{ fontSize: "1rem", margin: "18px 0 2px" }}>Aur ho sakta hai?</h2>
            <p className="hint" style={{ margin: "0 0 10px" }}>
              Yahan se neeche kuch bhi zaroori nahi. Din already count ho chuka hai.
            </p>
            {bonusBlocks.map((b) => (
              <Block key={b.id} b={b} day={n} done={done} weak={st.weak} onToggle={onToggle} onWeak={onWeak} />
            ))}
          </>
        )}
      </section>

      <section className="section">
        <h2 style={{ fontSize: "1.05rem", margin: "0 0 4px" }}>Teen pass · {TOTAL_CHAPTERS} chapter</h2>
        <p className="hint" style={{ margin: "0 0 10px" }}>
          Har bar poori kitaab. Pass 1 seekhne ka, pass 2 yaad ka, pass 3 flash ka.
        </p>
        {[1, 2, 3].map((ps) => {
          const pcnt = Math.round((prog[ps - 1] / TOTAL_CHAPTERS) * 100);
          return (
            <div key={ps} style={{ marginBottom: 10 }}>
              <div className="row between" style={{ marginBottom: 4 }}>
                <span style={{ fontSize: "0.8rem", color: PASS_COLOR[ps], fontWeight: 700 }}>{PASS_NAME[ps]}</span>
                <span className="muted" style={{ fontSize: "0.78rem" }}>{prog[ps - 1]}/{TOTAL_CHAPTERS}</span>
              </div>
              <div className="progress">
                <div className="progress__bar" style={{ width: pcnt + "%", background: PASS_COLOR[ps] }} />
              </div>
            </div>
          );
        })}
      </section>

      <section className="section">
        <div className="row between">
          <h2 style={{ fontSize: "1.05rem", margin: 0 }}>15 din</h2>
          {viewDay && <button className="btn btn--ghost btn--sm" onClick={() => setViewDay(null)}>Aaj pe wapas</button>}
        </div>
        <p className="hint" style={{ margin: "4px 0 10px" }}>
          Cell ke neeche us din ka pass. Tap karke koi bhi din khol lo.
        </p>
        <div className="days-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))" }}>
          {DAYS.map((d) => {
            const comp = dayCompletion(st, d.day);
            const ok = mustComplete(st, d.day);
            return (
              <button
                key={d.day}
                className={"day-cell" + (ok ? " is-done" : comp > 0 ? " is-part" : "")}
                onClick={() => setViewDay(d.day === today ? null : d.day)}
                style={{ cursor: "pointer", outline: d.day === n ? "2px solid var(--accent-2, #8ab4f8)" : "none" }}
              >
                <span className="day-cell__n">{d.day}</span>
                <span className="day-cell__c">pass {d.pass}</span>
                {ok && <span className="day-cell__tick">✓</span>}
              </button>
            );
          })}
        </div>
      </section>

      <section className="section">
        <div className="glass-card" style={{ padding: 14 }}>
          <div className="card-hd">Ye plan kya nahi karta</div>
          <p className="muted" style={{ fontSize: "0.84rem", margin: "0 0 8px" }}>
            Maths yahan schedule nahi hai — wo tera apna daily mock hai, aur wahi ek cheez hai jo
            chali (15.5 → 27). RBE ka 50-din wala plan <Link href="/today" style={{ color: "var(--accent-2, #8ab4f8)" }}>/today</Link> pe
            waise hi pada hai — usko ab <strong>contract nahi, menu</strong> ki tarah use karo:
            jis din man kare, wahan se ek-do test utha lo.
          </p>
          <p className="hint" style={{ margin: 0 }}>
            Har quiz ke baad galat questions apne aap{" "}
            <Link href="/mistakes" style={{ color: "var(--accent-2, #8ab4f8)" }}>Mistake Notebook</Link> mein
            jaate hain. GS ke marks{" "}
            <Link href="/mock-marks?cat=gk" style={{ color: "var(--accent-2, #8ab4f8)" }}>yahan</Link> likhte rehna —
            9-10 se 20 le jaana is sprint ka poora maqsad hai.
          </p>
        </div>
        <button
          className="btn btn--ghost btn--sm mt-16"
          onClick={() => {
            if (confirm("Poora 15-din ka progress mit jayega. Pakka?")) setSt({ ...resetGs15() });
          }}
        >
          Plan reset karo
        </button>
      </section>
    </>
  );
}
