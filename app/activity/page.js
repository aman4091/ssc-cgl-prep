"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getActivityDays, kindLabel, dayKey, clearActivity } from "@/lib/activity";

// Activity — one row per topic per day.
//
// Topics ONLY. It briefly carried question counts and a per-day accuracy; that
// was never asked for and turned a list of what you touched into a scorecard,
// which the Mistake Notebook already is.
//
// It only knows about work done from here on: nothing in the app recorded topics
// before lib/activity existed, and inventing a history from qstats would be a
// guess (it keeps a last-attempted time per question, but no topic).
function pretty(day) {
  const today = dayKey();
  if (day === today) return "Aaj";
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (day === dayKey(y)) return "Kal";
  const [Y, M, D] = day.split("-").map(Number);
  return new Date(Y, M - 1, D).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export default function ActivityPage() {
  const [days, setDays] = useState(null);

  useEffect(() => { setDays(getActivityDays()); }, []);

  const wipe = () => {
    if (confirm("Poora record mita dein?")) { clearActivity(); setDays(getActivityDays()); }
  };

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">🗒️ Activity</span>
          {days?.length > 0 && (
            <button className="btn btn--ghost btn--sm" onClick={wipe}>Clear</button>
          )}
        </div>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)" }}>
          <span className="grad">Activity</span>
        </h1>
        <p className="hero__sub">Din ke hisaab se — jo bhi kiya, uska topic.</p>
      </section>

      <section className="section">
        {days === null ? (
          <div className="placeholder">…</div>
        ) : days.length === 0 ? (
          <div className="placeholder">
            Abhi kuch nahi. Koi quiz ya chapter karo — yahan apne aap aa jayega.
            <div className="mt-16">
              <Link href="/" className="btn btn--primary btn--sm">Shuru karo</Link>
            </div>
          </div>
        ) : (
          days.map((d) => (
            <div key={d.day} className="act-day">
              <div className="act-day__hd">
                <span className="act-day__name">{pretty(d.day)}</span>
              </div>
              <div className="pyq-list">
                {d.items.map((r) => (
                  <div key={r.key} className="pyq-row" style={{ cursor: "default" }}>
                    <span className="pyq-row__ico">{kindLabel(r.kind).split(" ")[0]}</span>
                    <span className="pyq-row__name">{r.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </section>
    </>
  );
}
