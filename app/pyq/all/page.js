"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ALL_SUBJECTS, countsFor } from "@/lib/allbank";

// 🗂️ All — subject ke naam, aur har naam ke andar us subject ke SAARE question
// (jitne bhi bank mein hain), wahi PYQ wali shakl mein.
//
// Ginti index.json se aati hai, questions se nahi — isliye ye page turant
// khulta hai. Asli 30,000 question tabhi fetch hote hain jab koi subject khole.
export default function AllPyqPage() {
  const [counts, setCounts] = useState({});

  useEffect(() => {
    let alive = true;
    (async () => {
      for (const s of ALL_SUBJECTS) {
        const c = await countsFor(s.slug);
        if (!alive) return;
        setCounts((p) => ({ ...p, [s.slug]: c }));
      }
    })();
    return () => { alive = false; };
  }, []);

  const grand = ALL_SUBJECTS.reduce((a, s) => a + (counts[s.slug]?.total || 0), 0);

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">🗂️ All · subject-wise</span>
          <Link href="/pyq" className="btn btn--ghost btn--sm">← PYQ</Link>
        </div>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.7rem, 4vw, 2.6rem)" }}>
          Saare questions <span className="grad">ek jagah</span>
        </h1>
        <p className="hero__sub">
          Book-wise nahi, <b>subject-wise</b>. Ek subject khologe to uske saare bank ke saare
          chapter ek hi list mein — {grand ? <b>{grand.toLocaleString("en-IN")}</b> : "…"} questions.
          Card wahi PYQ wala hai, isliye ✅ ho-gaya, ★ bookmark aur paste kiya Gemini answer
          dono jagah ek hi rehte hain.
        </p>
      </section>

      <section className="section" style={{ marginTop: 20 }}>
        <div className="pyq-list">
          {ALL_SUBJECTS.map((s) => {
            const c = counts[s.slug];
            const from = c?.rows?.length
              ? c.rows.map((r) => `${r.label} ${r.count.toLocaleString("en-IN")}`).join(" · ")
              : s.desc;
            return (
              <Link key={s.slug} href={`/pyq/all/${s.slug}`} className="pyq-row">
                <span className="pyq-row__ico">{s.icon}</span>
                <span className="pyq-row__name">
                  {s.label}
                  <span className="pyq-row__sub">{from}</span>
                </span>
                <span className="pyq-row__meta">{c ? `${c.total.toLocaleString("en-IN")} Q` : "…"}</span>
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}
