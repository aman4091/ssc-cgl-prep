"use client";

// 🔁 WRONG SETS — PYQ ke set test mein jo galat hua ya chhoda, wo yahan
// 25-25 ke set mein judta jata hai (lib/wrongsets). Wrong Set ka test do —
// usme bhi jo galat/chhoda wo phir naye set mein. Chakkar chalta rehta hai.
// Subject-wise (Maths / Reasoning / English / GS).

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PyqSets, { SUB_LABEL } from "@/components/PyqSets";
import { getWrongSets, wrongCounts, wrongKey } from "@/lib/wrongsets";

const SUBS = ["math", "reasoning", "english", "gs"];

function WrongSetsInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const counts0 = typeof window === "undefined" ? {} : wrongCounts();
  const first = SUBS.find((s) => counts0[s]) || "gs";
  const sub = SUBS.includes(sp.get("sub")) ? sp.get("sub") : first;
  const [sets, setSets] = useState([]);
  const [counts, setCounts] = useState({});
  useEffect(() => {
    const on = () => { setSets(getWrongSets(sub)); setCounts(wrongCounts()); };
    on();
    window.addEventListener("cgl:wrongsets", on);
    window.addEventListener("cgl:sync-applied", on);
    return () => { window.removeEventListener("cgl:wrongsets", on); window.removeEventListener("cgl:sync-applied", on); };
  }, [sub]);
  return (
    <section className="section" style={{ marginTop: 16 }}>
      <div className="row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {SUBS.map((s) => (
          <button key={s} type="button" className={`subj-chip${s === sub ? " is-active" : ""}`} onClick={() => router.replace(`/wrong-sets?sub=${s}`)}>
            {SUB_LABEL[s]} · {counts[s] || 0}
          </button>
        ))}
      </div>
      <PyqSets
        key={sub}
        sets={sets}
        sub={sub}
        resumeKey={wrongKey(sub)}
        title={`Wrong Sets · ${SUB_LABEL[sub]}`}
        setName="Wrong Set"
        empty="Abhi koi galat / chhoda hua sawaal nahi. PYQ ke kisi set ka test do — jo galat ya chhoda, wo yahan aa jayega."
      />
    </section>
  );
}

export default function WrongSetsPage() {
  return (
    <Suspense fallback={<div className="placeholder">…</div>}>
      <WrongSetsInner />
    </Suspense>
  );
}
