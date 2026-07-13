"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

// Browses the imported Quiz Bank index (public/quizbank/index.json) for one group
// ("topic" or "mock"), grouped into a searchable category accordion. Each quiz links
// straight into the normal quiz runner, which fetches its JSON on demand.
export default function QuizBankBrowser({ group, eyebrow, heading, blurb }) {
  const [index, setIndex] = useState(null);
  const [open, setOpen] = useState(null);
  const [qy, setQy] = useState("");

  useEffect(() => {
    let on = true;
    fetch("/quizbank/index.json")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => on && setIndex(Array.isArray(d) ? d : []))
      .catch(() => on && setIndex([]));
    return () => { on = false; };
  }, []);

  const searching = qy.trim().length > 0;

  const { cats, total } = useMemo(() => {
    const list = (index || []).filter((e) => e.group === group);
    const q = qy.trim().toLowerCase();
    const filt = q
      ? list.filter((e) => e.title.toLowerCase().includes(q) || e.category.toLowerCase().includes(q))
      : list;
    const map = new Map();
    for (const e of filt) {
      if (!map.has(e.category)) map.set(e.category, []);
      map.get(e.category).push(e);
    }
    const cats = [...map.entries()]
      .map(([name, items]) => ({ name, items, count: items.length }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return { cats, total: filt.length };
  }, [index, group, qy]);

  if (index === null)
    return <section className="section"><p className="muted">Loading quiz bank…</p></section>;

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <span className="hero__eyebrow">{eyebrow}</span>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)" }}>{heading}</h1>
        <p className="hero__sub">{blurb}</p>
        <input
          className="input mt-16"
          placeholder="🔍 Search by name or category…"
          value={qy}
          onChange={(e) => setQy(e.target.value)}
          style={{ maxWidth: 440 }}
        />
        <p className="muted mt-8" style={{ fontSize: "0.82rem" }}>
          {total} quizzes{searching ? " match" : ""} · {cats.length} categories
        </p>
      </section>

      <section className="section home-acc-wrap" style={{ marginTop: 8 }}>
        <div className="home-acc">
          {cats.length === 0 && <p className="muted">No quizzes found.</p>}
          {cats.map((c) => {
            const isOpen = searching || open === c.name;
            return (
              <div key={c.name} className={`home-acc__item ${isOpen ? "is-open" : ""}`}>
                <button className="home-acc__row" onClick={() => setOpen(open === c.name ? null : c.name)}>
                  <span className="home-acc__name">
                    <span className="home-acc__ico">🗂️</span>{c.name}
                  </span>
                  <span className="home-acc__meta">
                    <span className="home-acc__count">{c.count}</span>
                    <span className="home-acc__chev">{isOpen ? "▲" : "▼"}</span>
                  </span>
                </button>
                {isOpen && (
                  <div className="home-acc__panel">
                    {c.items.map((e) => (
                      <Link key={e.id} href={`/quizzes/${e.id}`} className="home-acc__link home-acc__chrow">
                        <span className="home-acc__chname">{e.title}</span>
                        <span className="qbank-count">{e.count} Q</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
