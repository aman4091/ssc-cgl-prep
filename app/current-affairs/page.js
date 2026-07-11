"use client";

import { useState } from "react";
import FeedBucket from "@/components/FeedBucket";

const TABS = [
  { key: "daily", label: "🗓️ Daily", dateMode: "date", placeholder: "Date", note: "Today's current affairs PDF + video — saved under today's date." },
  { key: "weekly", label: "📆 Weekly", dateMode: "text", placeholder: "e.g. Week 28 · Jul 7–13", note: "Weekly compilation PDF + video." },
  { key: "yearly", label: "📅 Yearly", dateMode: "text", placeholder: "e.g. 2024 Yearly", note: "Yearly current affairs PDF + video." },
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
          Daily / weekly / yearly — each date's PDF quiz and video, all in one place.
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
