"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { stats, syncWrongBook } from "@/lib/srs";

// CORE-style Revision reminder for /today — "Aaj ka Revision: N cards" → /review.
export default function RevisionTodayCard() {
  const [s, setS] = useState(null);
  useEffect(() => {
    const refresh = () => { syncWrongBook(); setS(stats()); };
    refresh();
    window.addEventListener("cgl:srs-changed", refresh);
    return () => window.removeEventListener("cgl:srs-changed", refresh);
  }, []);

  if (!s) return null;
  const due = s.dueExposures;

  return (
    <Link href="/review" className="glass-card target-card mt-16" style={{ display: "block", borderColor: due > 0 ? "var(--accent)" : "var(--glass-border)" }}>
      <div className="row between">
        <span style={{ fontWeight: 700 }}>🔁 Aaj ka Revision</span>
        <span className="badge">CORE</span>
      </div>
      <p className="muted" style={{ margin: "6px 0 0" }}>
        {due > 0
          ? <><strong style={{ color: "var(--accent)" }}>{due}</strong> cards due · {s.enrolled} enrolled · {s.done20} pakka →</>
          : s.enrolled > 0
            ? <>Aaj ke due poore! {s.done20} pakka. Bank coverage jaari rakho →</>
            : <>Koi galti karo ya 🔁 dabao — flashcards yahaan aayenge →</>}
      </p>
    </Link>
  );
}
