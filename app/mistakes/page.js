"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getReview, removeReview, fixReviewAnswer } from "@/lib/qreview";
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
// Subject ka naam wahi rakha jo poore app mein chalta hai (qcounter ke
// COUNTER_SUBJECTS) — question card, counter aur ye page sab ek hi shabd
// samajhte hain. Jinka subject darj hi nahi hua (purane record, ya bina
// subject wala quiz) wo "Other" mein aa jaate hain.
const SUBJECTS = [
  { key: "math", label: "🧮 Maths" },
  { key: "reasoning", label: "🧠 Reasoning" },
  { key: "english", label: "📚 English" },
  { key: "gs", label: "🌍 GS" },
];
const subjectLabel = (k) => SUBJECTS.find((s) => s.key === k)?.label || "📝 Other";

export default function MistakesPage() {
  const [all, setAll] = useState([]);
  const [subject, setSubject] = useState("");   // "" = sab

  // Notebook ek GHOOMTA hua katar hai, ghatti hui list nahi.
  //
  // Sabse upar wo question jise sabse zyada der se haath nahi lagaya. Jo abhi
  // kiya (sahi ya galat) uska `at` abhi ka ho jata hai, to wo sabse neeche
  // chala jata hai — aur baaki sab ek-ek khisak kar upar aa jaate hain, isliye
  // wahi question kuch din baad dobara saamne aa jata hai. Naya galat question
  // bhi `at` ke hisaab se sabse neeche hi lagta hai.
  //
  // Sahi ho jaane par question list se GAYAB nahi hota (pehle wo "mastered"
  // bucket mein chala jata tha aur dikhna band) — bas neeche chala jata hai.
  // Yaad rehna hi asli imtihaan hai, ek baar sahi kar lena nahi.
  //
  // Kram sirf page khulne par banta hai. Jawab dete hi list dobara chhantti to
  // jo card aap padh rahe ho wahi aankhon ke saamne se khisak jata.
  const refresh = () => setAll(
    getReview()
      .filter((r) => r.everWrong)
      .sort((a, b) => String(a.at || "").localeCompare(String(b.at || ""))),
  );
  useEffect(() => { refresh(); }, []);

  // Kis subject mein kitne pade hain — dropdown mein ginti ke saath dikhta hai,
  // taaki "Maths mein 40 galtiyaan" khole bina pata chal jaye.
  const counts = useMemo(() => {
    const c = {};
    for (const r of all) {
      const k = SUBJECTS.some((s) => s.key === r.subject) ? r.subject : "other";
      c[k] = (c[k] || 0) + 1;
    }
    return c;
  }, [all]);
  const items = useMemo(
    () => (subject
      ? all.filter((r) => (SUBJECTS.some((s) => s.key === r.subject) ? r.subject : "other") === subject)
      : all),
    [all, subject],
  );

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
          Affairs — yahan apne aap aa jata hai. Jo abhi kiya wo sabse neeche chala
          jata hai, isliye har question ghoom kar dobara saamne aata rahega.
          {items.length > 0 && <> <b>{items.length} pade hain.</b></>}
        </p>
      </section>

      <section className="section" style={{ marginTop: 12 }}>
        {all.length > 0 && (
          <div className="row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            <select
              className="input"
              style={{ maxWidth: 240 }}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            >
              <option value="">Saare subject ({all.length})</option>
              {SUBJECTS.map((sb) => (
                <option key={sb.key} value={sb.key} disabled={!counts[sb.key]}>
                  {sb.label} ({counts[sb.key] || 0})
                </option>
              ))}
              {counts.other > 0 && <option value="other">📝 Other ({counts.other})</option>}
            </select>
          </div>
        )}

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
                      <b>{subjectLabel(r.subject)}</b> · {r.category}
                      {r.sec > 0 && <span title="Pichhli baar is question par itna waqt laga"> · ⏱ {r.sec}s</span>}
                      {caEntry && <> · <Link href={`/current-affairs/${caEntry.id}`} className="link">📅 {caEntry.date}</Link></>}
                      {isCA(r) && !caEntry && <span title="Ye question ab kisi date entry mein nahi mila"> · 📅 date not found</span>}
                      {r.correct && <span title="Pichhli baar sahi hua tha — phir bhi ghoom kar aata rahega"> · ✅ pichhli baar sahi</span>}
                    </span>
                    {/* Book ki key hi galat ho to yahin se theek — ye tag nahi,
                        marammat ka auzaar hai, isliye bacha hua hai. */}
                    <FixAnswer q={r.q} onFix={(oi) => fixAnswer(r, oi)} />
                  </div>
                  {/* archiveOnAnswer se yahan diya hua jawab notebook mein wapas
                      darj hota hai — usi se `at` naya hota hai aur question
                      agli baar sabse neeche milta hai. */}
                  <PyqQuestionCard
                    q={r.q}
                    index={0}
                    subject={r.subject}
                    chapterName={r.category}
                    archiveOnAnswer
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
