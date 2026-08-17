"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PlanPractice from "@/components/PlanPractice";
import PageQuizRow from "@/components/PageQuizRow";
import RevisionTodayCard from "@/components/RevisionTodayCard";
import {
  DAYS, SEC_META, PASS_META, PASS_COLOR, TOTAL_CHAPTERS, TOTAL_PAGES, TOTAL_DAYS,
  getGs30, setStartDate, resetGs30, toggleItem, toggleWeak, weakKey, weakCount,
  planFor, currentDayNum, dayStats, dayCompletion, mustComplete, planStreak, passProgress,
} from "@/lib/gs30";

// /gs30 — GS only, all 121 Parmar chapters, six passes, thirty days.
//
// This is the THIRD plan page this owner has had, and the first two died on day
// 2, so the shape here is a direct response to why: every day is the same size
// (MUST lands between 96 and 115 minutes, all thirty days), a missed day creates
// no backlog and no debt row, and the work gets LIGHTER as the passes go — the
// opposite of the RBE plan, which got heavier exactly when motivation ran out.
//
// /today (RBE 50-day) stays as a menu of tests to pull from, not a contract.

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
        // From pass 3 on, a chapter flagged weak earlier gets a visible spine —
        // that flag is the whole point of marking it in pass 2.
        borderLeft: pass >= 3 && weak ? "2px solid #fbbf24" : "2px solid transparent",
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
        title={weak ? "Weak mark hata do" : "Weak — aage ke pass mein ye highlight rahega"}
        style={weak ? { color: "#fbbf24", borderColor: "#fbbf24" } : { opacity: 0.5 }}
      >
        {weak ? "⭐" : "☆"}
      </button>
      <PageQuizRow book={book} chapter={ch} compact />
    </div>
  );
}

function Block({ b, done, weak, onToggle, onWeak }) {
  const meta = SEC_META[b.sec] || {};
  const slots = b.chapters ? b.chapters.map((_, i) => b.id + "-" + i) : [b.id];
  const dn = slots.filter((s) => done[s]).length;

  return (
    <div className="glass-card target-card" style={b.must ? { borderColor: "var(--accent)" } : undefined}>
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
          {!b.must && (
            <span className="badge" style={{ marginLeft: 6, opacity: 0.7, fontSize: "0.64rem" }}>BONUS</span>
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
              textDecoration: !b.chapters && done[b.id] ? "line-through" : "none",
            }}
          >
            {b.t}
          </div>
          {b.note && <p className="hint" style={{ margin: "3px 0 0" }}>{b.note}</p>}
          {b.auto && (
            <div className="row" style={{ gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              <PlanPractice auto={b.auto} title={b.t} />
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

export default function Gs30Page() {
  const [st, setSt] = useState(null);
  const [viewDay, setViewDay] = useState(null);
  const [dateIn, setDateIn] = useState("");

  useEffect(() => {
    setSt(getGs30());
    const t = new Date();
    setDateIn(`${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`);
  }, []);

  if (st === null) return <div className="placeholder">…</div>;

  if (!st.startDate) {
    return (
      <>
        <section className="hero">
          <span className="hero__eyebrow">🌍 GS · 1 Mahina</span>
          <h1 className="hero__title">
            {TOTAL_CHAPTERS} chapter, <span className="grad">6 baar</span>, 30 din
          </h1>
          <p className="hero__sub">
            Poori Parmar GK/GS book — {TOTAL_PAGES} page — chhe baar. Sirf GS, aur kuch nahi.
            Roz lagbhag <strong>1 ghanta 45 minute</strong>, teeso din barabar.
          </p>
        </section>
        <section className="section">
          <div className="glass-card" style={{ padding: 18 }}>
            <div className="card-hd">Chhe pass kaise fit hue</div>
            <p className="muted" style={{ fontSize: "0.88rem" }}>
              Kyunki chhe pass <strong>ek jaise nahi</strong> hain. Pass 1 mein page pe ~1.4 minute
              lagte hain, pass 6 mein 15 second. Jaise-jaise padhna tez hota hai, quiz badhte
              jaate hain — pehle roz 1, aakhir mein roz 3. Isliye din ka time barabar rehta hai
              aur kaam <strong>halka hota jaata hai</strong>, bhaari nahi.
            </p>
            <p className="hint">
              Din chhoot jaye to <strong>peeche mat jao</strong> — koi backlog nahi banega. Agle din
              bas us din ka kaam. Peeche jaana hi wo cheez hai jisne pichle do plan maare.
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
  const n = viewDay || Math.min(Math.max(today, 1), TOTAL_DAYS);
  const p = planFor(n);
  const isToday = n === today;
  const done = st.done[n] || {};
  const stats = dayStats(st, n);
  const streak = planStreak(st);
  const mustOK = mustComplete(st, n);
  const prog = passProgress(st);
  const pc = PASS_COLOR[p.pass - 1];
  const mustPct = stats.mustTotal ? Math.round((stats.mustDone / stats.mustTotal) * 100) : 0;
  const mustBlocks = p.blocks.filter((b) => b.must);
  const bonusBlocks = p.blocks.filter((b) => !b.must);
  const onToggle = (id) => setSt({ ...toggleItem(n, id) });
  const onWeak = (book, ch) => setSt({ ...toggleWeak(book, ch) });

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">🌍 GS · 1 Mahina</span>
          {streak > 1 && <span className="badge">🔥 {streak} din</span>}
        </div>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)" }}>
          {today > TOTAL_DAYS
            ? <>30 din <span className="grad">poore</span> 🎯</>
            : today < 1
              ? <>Day 1: <span className="grad">{fmtDate(st.startDate, 1)}</span></>
              : <>Day <span className="grad">{n} / {TOTAL_DAYS}</span></>}
        </h1>
        <p className="hero__sub">
          {fmtDate(st.startDate, n)}
          {!isToday && today >= 1 && today <= TOTAL_DAYS ? ` · (aaj Day ${today} hai)` : ""}
          {" · "}
          <span style={{ color: pc, fontWeight: 700 }}>Pass {p.pass} · {p.passName}</span>
        </p>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="glass-card" style={{ padding: "10px 14px", borderColor: pc }}>
          <span style={{ fontSize: "0.84rem", lineHeight: 1.5 }}>{p.how}</span>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <RevisionTodayCard />
      </section>

      <section className="section">
        {today > TOTAL_DAYS && (
          <div className="glass-card" style={{ padding: 16, marginBottom: 12 }}>
            <p className="muted" style={{ margin: 0 }}>
              30 din khatam, poori kitaab chhe baar. Ab sirf ⭐ waale chapters + Mistake Notebook. 💪
            </p>
          </div>
        )}

        {isToday && today > 1 && today <= TOTAL_DAYS && !mustComplete(st, today - 1) && (
          <div className="glass-card" style={{ padding: "10px 14px", marginBottom: 12 }}>
            <span className="muted" style={{ fontSize: "0.84rem" }}>
              Kal (Day {today - 1}) poora nahi hua. <strong>Usko chhod de</strong> — chapters chhe
              baar aa rahe hain, ek pass mein chhoot gaya to agle mein mil jayega. Aaj Day {today} karo.
            </span>
          </div>
        )}

        <div className="row between" style={{ marginBottom: 6 }}>
          <span style={{ fontSize: "0.8rem", fontWeight: 700, color: mustOK ? "var(--ok)" : "var(--accent)" }}>
            {stats.mustDone}/{stats.mustTotal} · ~{hrs(stats.mustMin)}
          </span>
          <span className="muted" style={{ fontSize: "0.8rem" }}>
            {weakCount(st) > 0 ? `⭐ ${weakCount(st)} weak chapter` : "koi ⭐ nahi"}
          </span>
        </div>
        <div className="progress" style={{ marginBottom: 12 }}>
          <div className="progress__bar" style={{ width: mustPct + "%" }} />
        </div>

        {mustOK && (
          <div className="glass-card" style={{ padding: "10px 14px", marginBottom: 12, borderColor: "var(--ok)" }}>
            <span style={{ color: "var(--ok)", fontWeight: 700, fontSize: "0.85rem" }}>
              ✓ Aaj ka din COUNT ho gaya. Band karo, so jao.
            </span>
          </div>
        )}

        {mustBlocks.map((b) => (
          <Block key={b.id} b={b} done={done} weak={st.weak} onToggle={onToggle} onWeak={onWeak} />
        ))}

        {bonusBlocks.length > 0 && (
          <>
            <h2 style={{ fontSize: "1rem", margin: "18px 0 2px" }}>Aur ho sakta hai?</h2>
            <p className="hint" style={{ margin: "0 0 10px" }}>
              Zaroori nahi. Din upar hi count ho chuka hai.
            </p>
            {bonusBlocks.map((b) => (
              <Block key={b.id} b={b} done={done} weak={st.weak} onToggle={onToggle} onWeak={onWeak} />
            ))}
          </>
        )}
      </section>

      <section className="section">
        <h2 style={{ fontSize: "1.05rem", margin: "0 0 4px" }}>Chhe pass · {TOTAL_CHAPTERS} chapter</h2>
        <p className="hint" style={{ margin: "0 0 10px" }}>
          Har pass poori kitaab. Har baar tez, aur har baar quiz zyada.
        </p>
        {PASS_META.map((pm) => {
          const cnt = prog[pm.pass - 1];
          return (
            <div key={pm.pass} style={{ marginBottom: 9 }}>
              <div className="row between" style={{ marginBottom: 3 }}>
                <span style={{ fontSize: "0.78rem", color: PASS_COLOR[pm.pass - 1], fontWeight: 700 }}>
                  {pm.pass}. {pm.name}
                  <span className="muted" style={{ fontWeight: 400, marginLeft: 6 }}>{pm.days} din</span>
                </span>
                <span className="muted" style={{ fontSize: "0.76rem" }}>{cnt}/{TOTAL_CHAPTERS}</span>
              </div>
              <div className="progress">
                <div
                  className="progress__bar"
                  style={{ width: Math.round((cnt / TOTAL_CHAPTERS) * 100) + "%", background: PASS_COLOR[pm.pass - 1] }}
                />
              </div>
            </div>
          );
        })}
      </section>

      <section className="section">
        <div className="row between">
          <h2 style={{ fontSize: "1.05rem", margin: 0 }}>30 din</h2>
          {viewDay && <button className="btn btn--ghost btn--sm" onClick={() => setViewDay(null)}>Aaj pe wapas</button>}
        </div>
        <p className="hint" style={{ margin: "4px 0 10px" }}>
          Cell ke neeche us din ka pass. Tap karke koi bhi din khol lo.
        </p>
        <div className="days-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(60px, 1fr))" }}>
          {DAYS.map((d) => {
            const comp = dayCompletion(st, d.day);
            const ok = mustComplete(st, d.day);
            return (
              <button
                key={d.day}
                className={"day-cell" + (ok ? " is-done" : comp > 0 ? " is-part" : "")}
                onClick={() => setViewDay(d.day === today ? null : d.day)}
                style={{
                  cursor: "pointer",
                  outline: d.day === n ? "2px solid var(--accent-2, #8ab4f8)" : "none",
                  borderBottom: `2px solid ${PASS_COLOR[d.pass - 1]}`,
                }}
              >
                <span className="day-cell__n">{d.day}</span>
                <span className="day-cell__c">{d.passName}</span>
                {ok && <span className="day-cell__tick">✓</span>}
              </button>
            );
          })}
        </div>
      </section>

      <section className="section">
        <div className="glass-card" style={{ padding: 14 }}>
          <div className="card-hd">Is plan ke bahar kya hai</div>
          <p className="muted" style={{ fontSize: "0.84rem", margin: "0 0 8px" }}>
            <strong>Maths</strong> — tera apna roz ka mock. Wo yahan schedule nahi hai kyunki wo
            already chal raha hai, aur wahi ek cheez hai jo chali (15.5 → 27). Usko mat todna.
            <strong> English aur Reasoning</strong> abhi is plan mein nahi hain — jab GS pakad mein
            aa jaye, English wapas daal denge. Tab tak{" "}
            <Link href="/pyq/pinnacle" style={{ color: "var(--accent-2, #8ab4f8)" }}>English bank</Link> aur{" "}
            <Link href="/today" style={{ color: "var(--accent-2, #8ab4f8)" }}>RBE ka menu</Link> jab man kare tab.
          </p>
          <p className="hint" style={{ margin: 0 }}>
            Har quiz ke galat questions apne aap{" "}
            <Link href="/mistakes" style={{ color: "var(--accent-2, #8ab4f8)" }}>Mistake Notebook</Link> mein
            jaate hain. GS ke marks{" "}
            <Link href="/mock-marks?cat=gk" style={{ color: "var(--accent-2, #8ab4f8)" }}>yahan</Link> likhte
            rehna — <strong>9-10 se 20</strong> hi is mahine ka poora maqsad hai.
          </p>
        </div>
        <button
          className="btn btn--ghost btn--sm mt-16"
          onClick={() => {
            if (confirm("Poora 30-din ka progress aur ⭐ marks mit jayenge. Pakka?")) setSt({ ...resetGs30() });
          }}
        >
          Plan reset karo
        </button>
      </section>
    </>
  );
}
