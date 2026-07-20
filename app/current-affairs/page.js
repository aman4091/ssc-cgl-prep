"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import FeedBucket from "@/components/FeedBucket";
import { loadCaBankIndex, caBankId } from "@/lib/cabank";

// Newest first: days are stored newest-first, months oldest-first, so sort
// rather than trusting either end of the array.
const latest = (list) => (list || []).slice().sort((a, b) => (a.period < b.period ? 1 : -1))[0];

const TABS = [
  { key: "daily", label: "🗓️ Daily", dateMode: "date", placeholder: "Date", note: "Today's current affairs PDF + video — saved under today's date." },
  { key: "weekly", label: "📆 Weekly", dateMode: "week", placeholder: "Week", note: "Weekly compilation PDF + video — pick the week." },
  { key: "monthly", label: "🗓️ Monthly", dateMode: "month", placeholder: "Month", note: "Monthly compilation PDF + video — pick the month." },
  { key: "yearly", label: "📅 Yearly", dateMode: "year", placeholder: "Year", note: "Yearly current affairs PDF + video — pick the year." },
];

// The menu links straight to a tab (/current-affairs?tab=monthly), so the tab
// has to come from the URL rather than being local state only.
export default function CurrentAffairsPage() {
  return (
    <Suspense fallback={<section className="section"><p className="muted">Loading…</p></section>}>
      <CurrentAffairs />
    </Suspense>
  );
}

function CurrentAffairs() {
  const router = useRouter();
  const params = useSearchParams();
  const wanted = params.get("tab");
  // ?all=1 is the escape hatch: it shows this index instead of jumping to the
  // newest entry, which is how you reach the upload bucket for a tab.
  const showAll = params.get("all") === "1";
  const [tab, setTab] = useState(TABS.some((t) => t.key === wanted) ? wanted : "daily");
  const [bank, setBank] = useState(null);
  const active = TABS.find((t) => t.key === tab) || TABS[0];

  useEffect(() => {
    if (wanted && TABS.some((t) => t.key === wanted)) setTab(wanted);
  }, [wanted]);

  useEffect(() => { loadCaBankIndex().then(setBank); }, []);

  // Opening a tab should land on the newest entry, not a grid of dates you then
  // have to click. Yearly has no built-in entries, so it stays on the index.
  useEffect(() => {
    if (!bank || showAll) return;
    const list = tab === "daily" ? bank.days : tab === "monthly" ? bank.months : null;
    const top = latest(list);
    if (top) router.replace(`/current-affairs/${caBankId(top.period)}`);
  }, [bank, tab, showAll, router]);

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <span className="hero__eyebrow">📰 Current Affairs</span>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.7rem, 4vw, 2.6rem)" }}>
          Current <span className="grad">Affairs</span>
        </h1>
        <p className="hero__sub">
          Daily / weekly / monthly / yearly — each date's PDF quiz and video, all in one place.
        </p>
      </section>

      <section className="section" style={{ marginTop: 12 }}>
        <div className="chips" style={{ marginBottom: 16 }}>
          {TABS.map((t) => (
            <button key={t.key} className={`chip chip--btn chip--lg ${tab === t.key ? "is-active" : ""}`} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
        {/* Built-in daily compilations — read-only, shipped with the app */}
        {tab === "daily" && bank?.days?.length > 0 && (
          <div className="glass-card" style={{ marginBottom: 20 }}>
            <div className="row between" style={{ flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>
              <div>
                <h3>📚 Ready-made daily CA</h3>
                <p className="muted mt-8" style={{ fontSize: "0.85rem" }}>
                  Din-bhar ke current affairs, full explanations ke saath — already loaded, kuch upload nahi karna.
                </p>
              </div>
            </div>
            <div className="days-grid days-grid--ca mt-16">
              {bank.days.map((d) => (
                <div key={d.period} className="day-cell ca-card glass">
                  <Link href={`/current-affairs/${caBankId(d.period)}`} className="ca-card__link">
                    <span className="day-cell__n">{d.label}</span>
                    <span className="day-cell__c">{d.count} questions</span>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Built-in monthly compilations — read-only, shipped with the app */}
        {tab === "monthly" && bank?.months?.length > 0 && (
          <div className="glass-card" style={{ marginBottom: 20 }}>
            <div className="row between" style={{ flexWrap: "wrap", gap: 8, alignItems: "flex-end" }}>
              <div>
                <h3>📚 Ready-made monthly CA</h3>
                <p className="muted mt-8" style={{ fontSize: "0.85rem" }}>
                  <strong>{bank.total}</strong> questions with full explanations — already loaded, nothing to upload.
                  {bank.source ? <> Source: {bank.source}.</> : null}
                </p>
              </div>
            </div>
            <div className="days-grid days-grid--ca mt-16">
              {bank.months.map((m) => (
                <div key={m.period} className="day-cell ca-card glass">
                  <Link href={`/current-affairs/${caBankId(m.period)}`} className="ca-card__link">
                    <span className="day-cell__n">{m.label}</span>
                    <span className="day-cell__c">{m.count} questions</span>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        <FeedBucket
          feed="current"
          bucket={active.key}
          dateMode={active.dateMode}
          datePlaceholder={active.placeholder}
          note={active.note}
          cards
          hrefBase="/current-affairs"
        />
      </section>
    </>
  );
}
