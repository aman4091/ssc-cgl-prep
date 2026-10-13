"use client";

// 🔁 WRONG SETS — PYQ ke set test mein jo galat hua ya chhoda, wo yahan
// 25-25 ke set mein judta jata hai (lib/wrongsets). Maths / Reasoning /
// English / GS — sab EK hi list (owner). Wrong Set ka test do — usme bhi jo
// galat/chhoda wo phir naye set mein. Chakkar chalta rehta hai.

import { useEffect, useState } from "react";
import PyqSets from "@/components/PyqSets";
import { getWrongSets, WRONG_KEY } from "@/lib/wrongsets";

export default function WrongSetsPage() {
  const [sets, setSets] = useState([]);
  useEffect(() => {
    const on = () => setSets(getWrongSets());
    on();
    window.addEventListener("cgl:wrongsets", on);
    window.addEventListener("cgl:sync-applied", on);
    return () => { window.removeEventListener("cgl:wrongsets", on); window.removeEventListener("cgl:sync-applied", on); };
  }, []);
  return (
    <section className="section" style={{ marginTop: 16 }}>
      <PyqSets
        sets={sets}
        sub="gs"
        resumeKey={WRONG_KEY}
        title="Wrong Sets"
        setName="Wrong Set"
        empty="Abhi koi galat / chhoda hua sawaal nahi. PYQ ke kisi set ka test do — jo galat ya chhoda, wo yahan aa jayega."
      />
    </section>
  );
}
