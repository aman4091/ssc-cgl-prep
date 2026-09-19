"use client";

// 🎯 Zaroori baatein → ek page.
//
// ClusterButton ka jodidaar: wo jawab ka 🧩 CLUSTER fact log mein daalta
// hai, ye "🎯 SSC EXTRA" ke bullet aur "📝 ONE-LINER" uthata hai aur
// /mission/points par jama karta hai — ek-ek line, jaise answer mein hoti
// hai (owner: "one liner hi rehne dio").
//
// Ja chuki baat dobara nahi jaati: wahi question phir saamne aaye to button
// khud bata deta hai, aur adhoori list ho to sirf bachi hui line jodta hai.

import { useEffect, useMemo, useState } from "react";
import { addPoint, getPoints, pointsOf } from "@/lib/sscpoints";

export default function PointsButton({ md, src = "", onFlash }) {
  const got = useMemo(() => pointsOf(md), [md]);
  const [have, setHave] = useState(() => new Set());

  useEffect(() => {
    const load = () => {
      try { setHave(new Set(getPoints().map((p) => p.text))); }
      catch { setHave(new Set()); }
    };
    load();
    window.addEventListener("cgl:points-changed", load);
    window.addEventListener("cgl:sync-applied", load);
    return () => {
      window.removeEventListener("cgl:points-changed", load);
      window.removeEventListener("cgl:sync-applied", load);
    };
  }, []);

  if (!got) return null;
  const left = got.lines.filter((l) => !have.has(l));
  const done = left.length === 0;

  return (
    <button
      className={"btn btn--sm " + (done ? "btn--ghost" : "btn--primary")}
      style={{ margin: "4px 0 8px 8px" }}
      disabled={done}
      title={done ? "Ye baatein pehle hi Zaroori baatein mein hain" : "Jawab ki SSC wali ek-line baatein ek jagah"}
      onClick={() => {
        for (const l of left) addPoint({ text: l, topic: got.topic, src });
        setHave((h) => new Set([...h, ...left]));
        onFlash && onFlash(`🎯 ${left.length} baat Zaroori baatein mein`);
      }}
    >
      {done
        ? `✓ Zaroori baatein mein hai${got.lines.length > 1 ? ` (${got.lines.length})` : ""}`
        : `🎯 Zaroori baatein${left.length > 1 ? ` (${left.length})` : ""}${left.length < got.lines.length ? " — baaki" : ""}`}
    </button>
  );
}
