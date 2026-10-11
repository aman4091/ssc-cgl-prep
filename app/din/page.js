"use client";

// 🕒 Din ki Timeline — purane Home ka roop "B" (components/din). Poora din
// 05:30 → 23:00 ek khadi samay-rekha par, abhi wala block bada, har kaam ke
// aage tick. Homepage wahi hai jo tha; ye alag page.

import Link from "next/link";
import DinTimeline from "@/components/din/DinTimeline";
import useMissionHome from "@/components/din/useMissionHome";
import "@/components/din/din.css";

export default function DinPage() {
  const d = useMissionHome();
  if (!d) return null;
  if (d.setup) {
    return (
      <section className="section" style={{ marginTop: 24 }}>
        <div className="placeholder">
          CGL Mission abhi shuru nahi hua — <Link href="/mission" className="link">🚀 CGL Mission</Link> par start date daalo, phir yahan poora din dikhega.
        </div>
      </section>
    );
  }
  return <section className="section"><DinTimeline d={d} /></section>;
}
