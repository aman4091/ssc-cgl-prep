"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PlanPractice from "@/components/PlanPractice";
import PageQuizRow from "@/components/PageQuizRow";
import {
  SEC_META, CORE_KEYS,
  getRbe, setStartDate, toggleItem, planFor, advFor,
  currentDayNum, dayStats, dayCompletion, coreComplete, planStreak,
} from "@/lib/rbe50";
import { QA_TYPE_LIST, getPlanner, setQaRating } from "@/lib/planner";
import { parmarFor } from "@/lib/rbeparmar";

const RATINGS = [
  { val: "a", label: "Aata hai", color: "var(--ok, #6bd39a)" },
  { val: "r", label: "Rusty", color: "#fbbf24" },
  { val: "n", label: "Nahi aata", color: "var(--bad, #ff8a7a)" },
];

// /today — the RBE 50-Day plan (owner's paid test series) as a tracker.
//
// This REPLACED the authored 40-day plan on the owner's instruction ("usko edit
// maar de na") once they committed to following the RBE schedule: one active
// plan, one page. lib/rbe50.js carries the whole PDF — checklists AND the real
// links — so a day is: open page, tap Attempt Test, tick, repeat. The Maths
// 19-type inventory (self-ratings + auto-practice) stays: it's independent of
// which plan is active. FocusEnforcer still lands here after "Start now".

function fmtDate(startDate, n) {
  const [y, m, d] = startDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  dt.setUTCDate(dt.getUTCDate() + (n - 1));
  return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
}

function LinkBtns({ links }) {
  if (!links?.length) return null;
  return (
    <span className="row" style={{ gap: 6, flexWrap: "wrap", display: "inline-flex" }}>
      {links.map((L, i) => (
        <a key={i} href={L.u} target="_blank" rel="noopener noreferrer" className="btn btn--ghost btn--sm">
          {/rbelearning/.test(L.u) ? "▶ " : ""}{L.l} ↗
        </a>
      ))}
    </span>
  );
}

// Under a GK test item: the matching Parmar chapters, each expandable into its
// per-page 📝 quiz buttons (PageQuizRow — shared with /gs30, so the two pages
// share one quiz engine and one dedup memory).
function ParmarQuiz({ map }) {
  return (
    <div style={{ marginTop: 6 }}>
      {map.chapters.map((ch) => (
        <div key={ch} className="row" style={{ gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 4 }}>
          <span className="muted" style={{ fontSize: "0.74rem" }}>📔 Parmar · {ch}</span>
          <PageQuizRow book={map.book} chapter={ch} />
        </div>
      ))}
    </div>
  );
}

function ItemRow({ item, done, onToggle, parmar }) {
  return (
    <div className="row" style={{ gap: 10, alignItems: "flex-start", padding: "7px 0", opacity: done ? 0.55 : 1 }}>
      <button
        className={"chk__box" + (done ? " is-on" : "")}
        style={{ marginTop: 1, flexShrink: 0 }}
        onClick={onToggle}
        aria-label={done ? "Mark not done" : "Mark done"}
      >
        {done ? "✓" : ""}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "0.88rem", lineHeight: 1.45, textDecoration: done ? "line-through" : "none" }}>
          {item.t}
        </div>
        <div style={{ marginTop: item.links.length ? 5 : 0 }}>
          <LinkBtns links={item.links} />
        </div>
        {parmar && <ParmarQuiz map={parmar} />}
      </div>
    </div>
  );
}

function SecCard({ sec, si, done, onToggle, core }) {
  const meta = SEC_META[sec.k] || {};
  const total = sec.items.length;
  const dn = sec.items.reduce((a, _, ii) => a + (done[si + "-" + ii] ? 1 : 0), 0);
  return (
    <div className="glass-card target-card" style={core ? { borderColor: "var(--accent)" } : undefined}>
      <div className="row between" style={{ gap: 8, marginBottom: 4 }}>
        <span>
          <span className="badge" style={{
            color: meta.color, borderColor: "transparent",
            background: `color-mix(in srgb, ${meta.color} 14%, transparent)`,
            fontSize: "0.68rem", fontWeight: 700,
          }}>
            {meta.icon} {meta.name}{sec.sub ? " · " + sec.sub : ""}
          </span>
          {core && (
            <span className="badge" style={{ marginLeft: 6, color: "var(--accent)", background: "var(--accent-wash)", border: "none", fontSize: "0.66rem", fontWeight: 800 }}>
              CORE
            </span>
          )}
        </span>
        <span className="muted" style={{ fontSize: "0.72rem", whiteSpace: "nowrap" }}>{dn}/{total}</span>
      </div>
      {sec.items.map((it, ii) => (
        <ItemRow
          key={ii}
          item={it}
          done={!!done[si + "-" + ii]}
          onToggle={() => onToggle(si + "-" + ii)}
          parmar={(sec.k === "GK1" || sec.k === "GK2") ? parmarFor(sec.sub, it.t) : null}
        />
      ))}
    </div>
  );
}

export default function TodayPage() {
  const [st, setSt] = useState(null);           // cgl.rbe50 state
  const [pl, setPl] = useState(null);           // cgl.planner state (19-type ratings)
  const [viewDay, setViewDay] = useState(null); // board pe khola hua din (null = aaj)
  const [dateIn, setDateIn] = useState("");
  const [showTypes, setShowTypes] = useState(false);

  useEffect(() => {
    setSt(getRbe());
    setPl(getPlanner());
    const today = new Date();
    setDateIn(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`);
  }, []);

  if (st === null || pl === null) return <div className="placeholder">…</div>;

  // ---- first run: pick Day 1 ----
  if (!st.startDate) {
    return (
      <>
        <section className="hero">
          <span className="hero__eyebrow">🎯 RBE 50-Day Plan</span>
          <h1 className="hero__title">50 Days <span className="grad">Intense</span></h1>
          <p className="hero__sub">
            RBE Combo Test Series ka poora 50-din ka schedule — PDF kholne ki zaroorat nahi.
            Roz ki checklist yahin, har test ka LINK yahin (naye tab mein khulta hai). Karo, tick karo.
          </p>
        </section>
        <section className="section">
          <div className="glass-card" style={{ padding: 18 }}>
            <div className="card-hd">Din COUNT kab hota hai</div>
            <p className="muted" style={{ fontSize: "0.88rem" }}>
              CORE = Maths Mock + Maths Topic + GK-1 + GK-2 + English Vocab. Yeh poore hue = din
              jeeta. Reasoning/Grammar bonus hain (Reasoning already 35-44 pe hai). Aur roz ek
              ⚡ Advance Booster milega — Algebra/Trigo/Geometry PDF mein day 38 ke baad aate
              hain, wahan tak rukna nahi hai.
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
  const n = viewDay || Math.min(Math.max(today, 1), 50);
  const p = planFor(n);
  const isToday = n === today;
  const done = st.done[n] || {};
  const stats = dayStats(st, n);
  const streak = planStreak(st);
  const pct = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;
  const adv = advFor(n);
  const coreSecs = p.secs.map((s, si) => ({ s, si })).filter(({ s }) => CORE_KEYS.includes(s.k));
  const bonusSecs = p.secs.map((s, si) => ({ s, si })).filter(({ s }) => !CORE_KEYS.includes(s.k));
  const coreOK = coreComplete(st, n);
  const onToggle = (id) => setSt({ ...toggleItem(n, id) });

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">🎯 RBE 50-Day Plan</span>
          {streak > 1 && <span className="badge">🔥 {streak} din</span>}
        </div>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)" }}>
          {today > 50
            ? <>50 din <span className="grad">poore</span> 🎯</>
            : today < 1
              ? <>Day 1: <span className="grad">{fmtDate(st.startDate, 1)}</span></>
              : <>Day <span className="grad">{n} / 50</span></>}
        </h1>
        <p className="hero__sub">
          {fmtDate(st.startDate, n)}{!isToday && today >= 1 && today <= 50 ? " · (aaj Day " + today + " hai)" : ""}
        </p>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
      </section>

      <section className="section">
        {today > 50 && (
          <div className="glass-card mt-16" style={{ padding: 16 }}>
            <p className="muted" style={{ margin: 0 }}>
              50 din khatam. Ab Mistake Notebook + revision + neend. All the best. 💪
            </p>
          </div>
        )}

        {isToday && today > 1 && today <= 50 && dayCompletion(st, today - 1) < 0.4 && (
          <div className="glass-card" style={{ padding: "10px 14px", marginBottom: 12 }}>
            <span className="muted" style={{ fontSize: "0.84rem" }}>
              Kal (Day {today - 1}) adhoora reh gaya. Peeche MAT jao — aaj Day {today} ka hi kaam karo.
            </span>
          </div>
        )}

        <div className="row between" style={{ marginBottom: 6 }}>
          <span className="muted" style={{ fontSize: "0.8rem" }}>{stats.done}/{stats.total} items</span>
          <span className="muted" style={{ fontSize: "0.8rem" }}>{pct}%</span>
        </div>
        <div className="progress" style={{ marginBottom: 10 }}>
          <div className="progress__bar" style={{ width: pct + "%" }} />
        </div>
        <p className="hint" style={{ marginBottom: 4 }}>
          <strong style={{ color: coreOK ? "var(--ok)" : "var(--accent)" }}>
            CORE {stats.coreDone}/{stats.coreTotal}
          </strong>
          {" — Mock · Maths · GK-1 · GK-2 · Vocab. Yeh poore = din COUNT. Reasoning/Grammar bonus."}
        </p>
        <p className="hint" style={{ marginBottom: 14 }}>
          Har test ke baad 2 minute: galat + slow questions{" "}
          <Link href="/answers?subject=all&src=pyq" style={{ color: "var(--accent-2, #8ab4f8)" }}>Mistake Notebook</Link> mein.
          Wahi cheez marks badhati hai — test khud nahi.
        </p>

        {coreOK && stats.done < stats.total && (
          <div className="glass-card" style={{ padding: "10px 14px", marginBottom: 12, borderColor: "var(--ok)" }}>
            <span style={{ color: "var(--ok)", fontWeight: 700, fontSize: "0.85rem" }}>
              ✓ CORE poora — aaj ka din COUNT ho gaya. Ab jo karega, upar se hai.
            </span>
          </div>
        )}

        {coreSecs.map(({ s, si }) => (
          <SecCard key={si} sec={s} si={si} done={done} onToggle={onToggle} core />
        ))}

        {adv && (
          <div className="glass-card target-card" style={{ borderColor: SEC_META.ADV.color }}>
            <div className="row between" style={{ gap: 8, marginBottom: 4 }}>
              <span className="badge" style={{
                color: SEC_META.ADV.color, borderColor: "transparent",
                background: `color-mix(in srgb, ${SEC_META.ADV.color} 14%, transparent)`,
                fontSize: "0.68rem", fontWeight: 700,
              }}>
                ⚡ Advance Booster · PDF ke Day {adv.from} se aage khincha
              </span>
            </div>
            <p className="hint" style={{ margin: "0 0 2px" }}>
              Algebra/Trigo/Geometry = paper ka ~40%. PDF inko last 13 din pe rakhti hai — risky.
              Roz ek yahan milega, sequence se.
            </p>
            <ItemRow item={adv} done={!!done.adv} onToggle={() => onToggle("adv")} />
          </div>
        )}

        {bonusSecs.map(({ s, si }) => (
          <SecCard key={si} sec={s} si={si} done={done} onToggle={onToggle} core={false} />
        ))}

        {stats.done === stats.total && stats.total > 0 && (
          <div className="glass-card center" style={{ padding: 18, borderColor: "var(--ok)" }}>
            <div style={{ fontSize: "1.8rem" }}>💪</div>
            <div style={{ fontWeight: 700 }}>Day {n} POORA{today <= 50 ? ` — aise hi ${50 - n} din aur` : ""}.</div>
            <p className="muted" style={{ fontSize: "0.84rem", margin: "4px 0 0" }}>Ab so ja — neend bhi tayari hai.</p>
          </div>
        )}
      </section>

      <section className="section">
        <div className="row between">
          <h2 style={{ fontSize: "1.05rem", margin: 0 }}>Poora naksha</h2>
          {viewDay && (
            <button className="btn btn--ghost btn--sm" onClick={() => setViewDay(null)}>Aaj pe wapas</button>
          )}
        </div>
        <p className="hint" style={{ margin: "4px 0 10px" }}>
          Kisi din pe tap karke uska kaam dekho. Cell ke neeche us din ka GK subject.
        </p>
        <div className="days-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))" }}>
          {Array.from({ length: 50 }, (_, i) => i + 1).map((d) => {
            const comp = dayCompletion(st, d);
            const dp = planFor(d);
            const cap = dp?.secs.find((s) => s.k === "GK2")?.sub || dp?.secs.find((s) => s.k === "GK1")?.sub || "";
            const cls = "day-cell" + (coreComplete(st, d) ? " is-done" : comp > 0 ? " is-part" : "");
            return (
              <button
                key={d}
                className={cls}
                onClick={() => setViewDay(d === today ? null : d)}
                style={{ cursor: "pointer", outline: d === n ? "2px solid var(--accent-2, #8ab4f8)" : "none" }}
              >
                <span className="day-cell__n">{d}</span>
                <span className="day-cell__c">{cap.slice(0, 7)}</span>
                {coreComplete(st, d) && <span className="day-cell__tick">✓</span>}
              </button>
            );
          })}
        </div>
      </section>

      <section className="section">
        <div className="row between">
          <h2 style={{ fontSize: "1.05rem", margin: 0 }}>Maths ke 19 types</h2>
          <button className="btn btn--ghost btn--sm" onClick={() => setShowTypes((v) => !v)}>
            {showTypes ? "Band karo" : "List kholo"}
          </button>
        </div>
        <p className="hint" style={{ margin: "4px 0 10px" }}>
          Har type pe imaandari se tap karo: Aata / Rusty / Nahi aata. Rusty + Nahi-aata wale
          types pe hi asli mehnat lagegi — ▶ se apne PYQ bank ke questions turant.
        </p>
        {showTypes && QA_TYPE_LIST.map((u, i) => {
          const cur = pl.qaRating?.[u.key] || null;
          return (
            <div key={u.key} className="glass-card" style={{ padding: "12px 14px", marginBottom: 8 }}>
              <div className="row between" style={{ gap: 8 }}>
                <div style={{ fontWeight: 700, fontSize: "0.92rem" }}>{i + 1}. {u.name}</div>
                <div className="row" style={{ gap: 4, flexShrink: 0 }}>
                  {RATINGS.map((r) => (
                    <button
                      key={r.val}
                      className="btn btn--ghost btn--sm"
                      style={cur === r.val
                        ? { color: r.color, borderColor: r.color, background: `color-mix(in srgb, ${r.color} 12%, transparent)`, fontWeight: 700 }
                        : { opacity: 0.75 }}
                      onClick={() => setPl({ ...setQaRating(u.key, r.val) })}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
              <p className="muted" style={{ fontSize: "0.82rem", lineHeight: 1.5, margin: "4px 0 0" }}>{u.tip}</p>
              <div className="row" style={{ gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                {u.auto && <PlanPractice auto={{ n: 15, specs: u.auto }} title={u.name} />}
                {u.links.map((l, j) => (
                  <Link key={j} href={l.href} className="btn btn--ghost btn--sm">{l.label} →</Link>
                ))}
              </div>
            </div>
          );
        })}
        {showTypes && (() => {
          const vals = Object.values(pl.qaRating || {});
          const c = { a: 0, r: 0, n: 0 };
          vals.forEach((v) => { if (c[v] != null) c[v]++; });
          return vals.length > 0 ? (
            <p className="hint" style={{ marginTop: 4 }}>
              {vals.length}/19 marked — 🟢 {c.a} aata · 🟡 {c.r} rusty · 🔴 {c.n} nahi aata.
            </p>
          ) : null;
        })()}
      </section>

      <section className="section">
        <div className="glass-card" style={{ padding: 14 }}>
          <div className="card-hd">Baseline → Target</div>
          <p className="muted" style={{ fontSize: "0.84rem", margin: 0 }}>
            Maths 15-20 → <strong>34</strong> (2 Aug: sectional <strong>27</strong> aa chuka) ·
            Reasoning 35-44 → <strong>42</strong> · English 19-25 → <strong>32</strong> ·
            GS 9-10 → <strong>22</strong> · Full 80-95 → <strong>~130-150</strong>.
            Har mock ke baad <Link href="/mock-marks?cat=full" style={{ color: "var(--accent-2, #8ab4f8)" }}>Mock Marks</Link> mein entry zaroor.
          </p>
        </div>
      </section>
    </>
  );
}
