"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getReviewBucket, removeReview, fixReviewAnswer } from "@/lib/qreview";
import { findCAEntryForQuestion, fixCAAnswer } from "@/lib/feed";
import PyqQuestionCard from "@/components/PyqQuestionCard";
import FixAnswer from "@/components/FixAnswer";

// 🔴 Mistake Notebook — jo galat hua aur jo chhoot gaya, sab yahan.
//
// Page jaan-boojh kar khaali hai. Pehle yahan bucket ke tabs (Wrong / Mastered
// / Attempted), "Re-attempt all wrong", "This week's wrong", "Practice all",
// "Clear", weak-area tracker, hafte wali strip aur har question par
// Silly/Concept/Time-Laga/Guess ke tag — sab the. Owner ne sab hataane ko kaha:
// notebook padhne ki jagah hai, dashboard nahi. Ek hi kaam bacha — galat
// question dekho, solution padho, aur galti ki wajah samajho.
//
// Data waisa ka waisa hai (lib/qreview): mastered/attempted bucket aur
// errorType ab bhi bharte rehte hain, bas yahan dikhte nahi. Wapas chahiye to
// sirf ye page badalna hai.
export default function MistakesPage() {
  const [items, setItems] = useState([]);

  const refresh = () => setItems(getReviewBucket("wrong"));
  useEffect(() => { refresh(); }, []);

  const remove = (key) => { removeReview(key); refresh(); };
  // Galat sanjoya hua answer theek karo: notebook ka record AUR jahan se aaya
  // (Current Affairs entry) dono.
  const fixAnswer = (r, oi) => { fixReviewAnswer(r.key, oi); fixCAAnswer(r.q, oi); refresh(); };
  const isCA = (r) => r.category === "Current Affairs" || /ca|current/i.test(String(r.source || ""));

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">🔴 Mistake Notebook</span>
          <Link href="/answers" className="btn btn--ghost btn--sm">📖 Answers</Link>
        </div>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.7rem, 4vw, 2.6rem)" }}>
          Galat <span className="grad">questions</span>
        </h1>
        <p className="hero__sub">
          Har galat aur chhoda hua question — chahe Vocab ho, Calculation, PYQ ya Current
          Affairs — yahan apne aap aa jata hai. {items.length > 0 && <b>{items.length} pade hain.</b>}
        </p>
      </section>

      <section className="section" style={{ marginTop: 12 }}>
        {items.length === 0 ? (
          <div className="placeholder">
            Abhi koi galti nahi — bahut badhiya. Koi test do, galat ya chhoda hua question
            apne aap yahan aa jayega.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {items.map((r) => {
              const caEntry = isCA(r) ? findCAEntryForQuestion(r.q) : null;
              return (
                <div key={r.key}>
                  <div className="row" style={{ gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 6 }}>
                    <span className="muted" style={{ fontSize: "0.78rem" }}>
                      {r.category}
                      {caEntry && <> · <Link href={`/current-affairs/${caEntry.id}`} className="link">📅 {caEntry.date}</Link></>}
                      {isCA(r) && !caEntry && <span title="Ye question ab kisi date entry mein nahi mila"> · 📅 date not found</span>}
                    </span>
                    {/* Book ki key hi galat ho to yahin se theek — ye tag nahi,
                        marammat ka auzaar hai, isliye bacha hua hai. */}
                    <FixAnswer q={r.q} onFix={(oi) => fixAnswer(r, oi)} />
                  </div>
                  <PyqQuestionCard
                    q={r.q}
                    index={0}
                    subject={r.subject}
                    onDelete={() => remove(r.key)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
