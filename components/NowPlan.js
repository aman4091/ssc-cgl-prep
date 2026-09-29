"use client";

// ⏰ Upar ki patti ke dayein: 32 din wale CGL plan (lib/mission) mein ABHI
// kya karna hai — jaise "08:00–09:00 · 🌍 GS PYQ + CLUSTER". Dabao to Home
// (wahan poora ABHI card). Har 30 sec mein apne aap badalta hai.
// (Pehle yahan 🔒 PC lock tha — owner ne hatwaya.)

import Link from "next/link";
import { useEffect, useState } from "react";
import { getMission, currentDayNum, totalDays, buildTimeline, nowBlock, DEFAULT_START } from "@/lib/mission";

const name = (b) => String(b.nm || b.t || "").replace(/\s+—.*$/, "");

export default function NowPlan() {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    const calc = () => {
      try {
        const m0 = getMission();
        // Mission "shuru" na kiya ho to bhi plan ki apni tareekh se.
        const m = m0.startDate ? m0 : { ...m0, startDate: DEFAULT_START };
        const day = currentDayNum(m);
        if (day < 1 || day > totalDays(m)) { setInfo(null); return; }
        const { cur, next } = nowBlock(buildTimeline(day, m));
        setInfo({ day, cur, next });
      } catch { setInfo(null); }
    };
    calc();
    const id = setInterval(calc, 30000);
    const onSync = () => calc();
    window.addEventListener("cgl:sync-applied", onSync);
    return () => { clearInterval(id); window.removeEventListener("cgl:sync-applied", onSync); };
  }, []);

  if (!info) return null;
  if (!info.cur && !info.next) {
    return <Link href="/mission" className="nowplan" title={`Day ${info.day}`}><span className="nowplan__time">😴</span><span className="nowplan__what">Sone ka waqt — kal subah phir</span></Link>;
  }
  const b = info.cur || info.next;
  const tip = [`Day ${info.day}`, b.tg, b.how].filter(Boolean).join(" · ");
  return (
    <Link href="/mission" className="nowplan" title={tip}>
      <span className="nowplan__time">{info.cur ? "⏰ Abhi" : "⏭ Agla"} {b.start}–{b.end}</span>
      <span className="nowplan__what">{name(b)}</span>
    </Link>
  );
}
