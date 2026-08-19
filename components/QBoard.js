"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { doneKeyFor, getDoneSet } from "@/lib/qdone";
import { getResume, setResume } from "@/lib/qprogress";
import { getCounts, bumpCount, COUNTER_SUBJECTS } from "@/lib/qcounter";

// 📚 Ek PYQ chapter/topic ka poora board — asli exam screen ki tarah:
// EK WAQT MEIN EK QUESTION, daayin taraf numbered palette, aur neeche
// Previous / Save & Next.
//
// Pehle ye lambi scroll list thi (25 card ek saath, "Show more" se aur).
// Owner ne Testbook ka screen dikha kar kaha ki attempt aisa nahi hota —
// wahan ek waqt par ek hi sawaal saamne hota hai. Isliye ab list slice nahi
// hoti, `cur` chalta hai: palette ka number, Prev/Next, ya ← → arrow key.
//
// Ek question dikhne ka ek aur fayda: 12,000 wali "All" list par bhi sirf ek
// card mount hota hai, isliye purana RESUME_MAX/Show-more wala jugaad ab
// zaroori nahi raha.
//
// Tabs jaan-boojh kar nahi hain: "Baaki / Ho gaye" do alag list banate the,
// jisse ho gaya question aankhon se GAYAB ho jata tha. Yahan wo bas list ke
// aakhir mein khisak jata hai aur palette mein hara ho jata hai.

// Palette har question ka ek box hai. Chapter-bhar (500-1000) tak theek hai,
// par "All" wali subject list 12,000 tak jaati hai — utne box banate hi phone
// atak jata hai. Itni badi list par palette sirf ek khidki dikhata hai jo
// abhi wale question ke aas-paas ki hai (number wahi ke wahi rehte hain).
const PALETTE_MAX = 1500;
const PALETTE_WINDOW = 300;

export default function QBoard({
  list,                       // page ki apni list (uske filters ke BAAD)
  subject,                    // counter kis subject mein ginega
  resumeKey,                  // reload par wahin lautne ke liye
  renderCard,                 // (q, index, orderedList) => <Card/>
  emptyText = "Yahan koi question nahi.",
}) {
  const [cur, setCur] = useState(0);
  const [ver, setVer] = useState(0);           // qdone badla to dobara chhaanto
  const [counts, setCounts] = useState({});

  useEffect(() => { setCounts(getCounts()); }, []);
  useEffect(() => {
    const h = () => { setVer((v) => v + 1); setCounts(getCounts()); };
    // Dono sunte hain: qdone se list dobara chhantti hai, aur counter apna
    // event mark ke BAAD bhejta hai — usse "🔢 Aaj" wahin ka wahin badh jata
    // hai (pehle wo agli baar page kholne par hi badalta tha).
    window.addEventListener("cgl:qdone-changed", h);
    window.addEventListener("cgl:counter-changed", h);
    return () => {
      window.removeEventListener("cgl:qdone-changed", h);
      window.removeEventListener("cgl:counter-changed", h);
    };
  }, []);

  // Kram: pehle baaki (apne asli kram mein), phir ho gaye. Answers page ka
  // displayOrder yahi karta hai. Dono taraf kram sthir hai, isliye ek question
  // mark karne par aage-peeche wale apni jagah nahi badalte.
  const { ordered, doneSet, doneCount } = useMemo(() => {
    const set = getDoneSet();
    const pend = [];
    const dn = [];
    for (const q of list || []) (set.has(doneKeyFor(q)) ? dn : pend).push(q);
    return { ordered: [...pend, ...dn], doneSet: set, doneCount: dn.length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, ver]);

  const total = ordered.length;

  // Nayi list (chapter badla ya filter) aayi to pehle question par. Dep mein
  // list ki IDENTITY nahi li ja sakti — jo page apna filter inline karta hai
  // wahan har render par nayi array banti hai aur position turant reset ho
  // jaati.
  const listLen = (list || []).length;
  useEffect(() => { setCur(0); }, [resumeKey, listLen]);

  // Reload karne par wahin wapas jahan chhoda tha.
  useEffect(() => {
    if (!resumeKey || !total) return;
    const at = getResume(resumeKey);
    if (at >= 0 && at < total) setCur(at);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeKey, total]);

  const go = useCallback((i) => {
    setCur((c) => {
      const next = Math.max(0, Math.min(i, total - 1));
      if (next !== c && resumeKey) setResume(resumeKey, next);
      return next;
    });
    // Naya question upar se shuru ho — warna lamba question padhne ke baad
    // agla beech se khulta hua lagta hai.
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 40);
  }, [total, resumeKey]);

  // ← → se agla/pichla. Input/textarea mein type karte waqt nahi (warna
  // answer paste karte hi question badal jata).
  useEffect(() => {
    const h = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target;
      const tag = t?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t?.isContentEditable) return;
      if (e.key === "ArrowRight") { e.preventDefault(); go(cur + 1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); go(cur - 1); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [cur, go]);

  const nudge = (delta) => setCounts((c) => ({ ...c, [subject]: bumpCount(subject, delta) }));

  // Palette apne aap abhi wale number par aa jaye. Bina iske 30ve question par
  // pahunchne ke baad bhi patti 1-10 hi dikhati rehti hai (phone par to wo ek
  // hi horizontal line hai) aur "main kahan hoon" ka jawab hi nahi milta.
  // offsetTop kaam nahi karta — desktop par rail sticky hai aur phone par
  // static, to offsetParent badal jata hai; isliye rect ka fark liya hai.
  const railRef = useRef(null);
  useEffect(() => {
    const r = railRef.current;
    const el = r?.querySelector("a.is-cur");
    if (!r || !el) return;
    const cr = r.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    r.scrollTop += (er.top - cr.top) - (cr.height - er.height) / 2;
    r.scrollLeft += (er.left - cr.left) - (cr.width - er.width) / 2;
  });

  // Badi list par palette ki khidki — number asli hi rehte hain.
  const [from, to] = total > PALETTE_MAX
    ? [Math.max(0, cur - PALETTE_WINDOW / 2), Math.min(total, Math.max(PALETTE_WINDOW, cur + PALETTE_WINDOW / 2))]
    : [0, total];

  if (!total) return <div className="placeholder">{emptyText}</div>;

  const at = Math.min(cur, total - 1);
  const q = ordered[at];

  return (
    <div className="qboard">
      <nav className="qboard__side" ref={railRef}>
        {ordered.slice(from, to).map((it, k) => {
          const i = from + k;
          const done = doneSet.has(doneKeyFor(it));
          return (
            <a
              key={it._uid ?? it.id ?? i}
              onClick={() => go(i)}
              className={`${done ? "is-done" : ""}${i === at ? " is-cur" : ""}`}
              title={done ? "Ho gaya" : undefined}
            >
              {i + 1}
            </a>
          );
        })}
      </nav>

      <div className="qboard__main">
        <div className="qboard__stats">
          {COUNTER_SUBJECTS.includes(subject) && (
            <span className="cnt" title="Aaj is subject ke kitne question hue (raat 3 baje reset)">
              🔢 Aaj: {counts[subject] || 0}
              <button type="button" onClick={() => nudge(-1)} aria-label="ek kam">−</button>
              <button type="button" onClick={() => nudge(1)} aria-label="ek zyada">+</button>
            </span>
          )}
          <span className="tot">📊 Total: {total}</span>
          <span className="did">✅ Ho gaye: {doneCount}</span>
          <span className="left">⏳ Baaki: {total - doneCount}</span>
        </div>

        {/* Exam wali patti — screenshot mein bhi ye question ke UPAR hai. */}
        <div className="qboard__nav">
          <button className="btn btn--ghost" onClick={() => go(at - 1)} disabled={at === 0}>← Previous</button>
          <span className="qboard__pos">
            Question <b>{at + 1}</b> / {total}
          </span>
          <button className="btn" onClick={() => go(at + 1)} disabled={at === total - 1}>Save &amp; Next →</button>
        </div>

        <div className="qboard__cards">
          {renderCard(q, at, ordered)}
        </div>

        <div className="qboard__nav qboard__nav--bottom">
          <button className="btn btn--ghost" onClick={() => go(at - 1)} disabled={at === 0}>← Previous</button>
          <span className="qboard__pos qboard__pos--hint">← → arrow key se bhi</span>
          <button className="btn" onClick={() => go(at + 1)} disabled={at === total - 1}>Save &amp; Next →</button>
        </div>
      </div>
    </div>
  );
}
