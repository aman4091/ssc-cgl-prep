"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getFacts, dueFacts } from "@/lib/missionfacts";
import { getPoints } from "@/lib/sscpoints";

// Homepage ki sabse upar wali do patti — seedha revision mein: Fact log
// (cluster) aur Zaroori baatein (jawabon se uthayi ek-line baatein).
//
// Kyun sabse upar: har galat sawaal ka cluster yahin aata hai aur yahin se
// baar-baar dohrana hota hai. Menu khol kar dhoondhna ek kadam zyada tha, aur
// jo cheez roz chalni hai wo ek kadam door bhi nahi honi chahiye.
export default function FactLogTop() {
  const [n, setN] = useState(null);
  const [due, setDue] = useState(0);
  const [pts, setPts] = useState(0);

  useEffect(() => {
    const load = () => { setN(getFacts().length); setDue(dueFacts().length); setPts(getPoints().length); };
    load();
    window.addEventListener("cgl:mission-changed", load);
    window.addEventListener("cgl:points-changed", load);
    window.addEventListener("cgl:sync-applied", load);
    return () => {
      window.removeEventListener("cgl:mission-changed", load);
      window.removeEventListener("cgl:points-changed", load);
      window.removeEventListener("cgl:sync-applied", load);
    };
  }, []);

  return (
    <div className="section factop">
      <Link href="/mission/facts" className="btn btn--primary factop__btn">
        <span>🧠 Fact log — revise karo</span>
        <span className="factop__n">
          {n == null ? "…" : `${n} fact${due ? ` · ${due} due` : ""}`}
        </span>
      </Link>
      <Link href="/mission/points" className="btn btn--ghost factop__btn factop__btn--2">
        <span>🎯 Zaroori baatein</span>
        <span className="factop__n">{pts} baat</span>
      </Link>
    </div>
  );
}
