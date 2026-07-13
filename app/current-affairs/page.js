"use client";

import { useState } from "react";
import FeedBucket from "@/components/FeedBucket";

const TABS = [
  { key: "daily", label: "🗓️ Daily", dateMode: "date", placeholder: "Date", note: "Today's current affairs PDF + video — saved under today's date." },
  { key: "weekly", label: "📆 Weekly", dateMode: "week", placeholder: "Week", note: "Weekly compilation PDF + video — pick the week." },
  { key: "monthly", label: "🗓️ Monthly", dateMode: "month", placeholder: "Month", note: "Monthly compilation PDF + video — pick the month." },
  { key: "yearly", label: "📅 Yearly", dateMode: "year", placeholder: "Year", note: "Yearly current affairs PDF + video — pick the year." },
];

export default function CurrentAffairsPage() {
  const [tab, setTab] = useState("daily");
  const active = TABS.find((t) => t.key === tab);

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
        <FeedBucket
          feed="current"
          bucket={active.key}
          dateMode={active.dateMode}
          datePlaceholder={active.placeholder}
          note={active.note}
        />
      </section>
    </>
  );
}
