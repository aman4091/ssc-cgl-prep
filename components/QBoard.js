"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { doneKeyFor, getDoneSet } from "@/lib/qdone";
import { getResume } from "@/lib/qprogress";
import { getCounts, bumpCount, COUNTER_SUBJECTS } from "@/lib/qcounter";

// 📚 Ek PYQ chapter/topic ka poora board — bilkul /answers page ke dhaanche
// mein: baayen numbered rail, upar aaj ka counter + ginti, aur neeche cards
// jisme "ho gaye" question sabse aakhir mein chale jaate hain.
//
// Pehle har page khud yahi kaam kar raha tha (useDoneTabs + DoneTabBar + apna
// slice + apna "Show more"), saat jagah copy hoke. Ab ek hi jagah hai, isliye
// saare PYQ pages ek jaise chalte hain — aur agli baar shakl badalni ho to ek
// hi file chhedni padegi.
//
// Tabs jaan-boojh kar hata diye: "Baaki / Ho gaye" do alag list banate the,
// jisse ho gaya question aankhon se GAYAB ho jata tha. Answers page par wo bas
// neeche khisak jata hai aur dhundhla ho jata hai — owner ne wahi maanga.

const DEFAULT_PAGE = 25;
// Rail har question ka ek link hai. Chapter-bhar (500-1000) tak ye theek hai,
// par "All" wali subject list 12,000 tak jaati hai — utne anchor banate hi
// phone atak jata hai. Itni badi list par rail sirf utni lambi hoti hai jitne
// card abhi khule hain, aur "Show more" ke saath badhti jaati hai.
const RAIL_MAX = 1500;
// Aur isi wajah se resume par bhi ek hadd: slice hamesha shuru se banti hai, to
// "5,000ve question par chhoda tha" ka matlab hai 5,000 card ek saath mount —
// phone wahin baith jayega. Itni badi list par resume utna hi chalta hai jitna
// mount karna theek hai; usse aage chhoda ho to list upar se hi khulti hai.
const RESUME_MAX = 200;

export default function QBoard({
  list,                       // page ki apni list (uske filters ke BAAD)
  subject,                    // counter kis subject mein ginega
  resumeKey,                  // reload par wahin lautne ke liye
  pageSize = DEFAULT_PAGE,
  renderCard,                 // (q, index, orderedList) => <Card/>
  emptyText = "Yahan koi question nahi.",
}) {
  const [shown, setShown] = useState(pageSize);
  const [ver, setVer] = useState(0);           // qdone badla to dobara chhaanto
  const [counts, setCounts] = useState({});

  useEffect(() => { setCounts(getCounts()); }, []);
  useEffect(() => {
    const h = () => { setVer((v) => v + 1); setCounts(getCounts()); };
    window.addEventListener("cgl:qdone-changed", h);
    return () => window.removeEventListener("cgl:qdone-changed", h);
  }, []);

  // Nayi list (chapter badla) aayi to slice shuru se. Dep mein list ki IDENTITY
  // nahi li ja sakti — jo page apna filter inline karta hai wahan har render par
  // nayi array banti hai aur "Show more" turant reset ho jata.
  const listLen = (list || []).length;
  useEffect(() => { setShown(pageSize); }, [resumeKey, listLen, pageSize]);

  // Kram: pehle baaki (apne asli kram mein), phir ho gaye. Answers page ka
  // displayOrder yahi karta hai. Dono taraf kram sthir hai, isliye ek question
  // mark karne par baaki cards apni jagah nahi badalte.
  const { ordered, doneSet, doneCount } = useMemo(() => {
    const set = getDoneSet();
    const pend = [];
    const dn = [];
    for (const q of list || []) (set.has(doneKeyFor(q)) ? dn : pend).push(q);
    return { ordered: [...pend, ...dn], doneSet: set, doneCount: dn.length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, ver]);

  // Reload lands you back where you stopped: the slice is grown past the last
  // question you answered, and the page scrolls to it.
  useEffect(() => {
    if (!resumeKey || !ordered.length) return undefined;
    const at = getResume(resumeKey);
    if (at < 0) return undefined;
    if (ordered.length > RAIL_MAX && at + pageSize > RESUME_MAX) return undefined;
    setShown((n) => Math.max(n, at + pageSize));
    const t = setTimeout(() => {
      document.getElementById(`q-${at}`)?.scrollIntoView({ block: "start" });
    }, 120);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeKey, ordered.length]);

  // Rail ka number abhi render hi na hua ho (slice chhoti hai) to pehle slice
  // badhao, phir scroll karo — warna link chupchaap kuch nahi karta.
  const jump = useCallback((i) => {
    setShown((n) => Math.max(n, i + 1));
    setTimeout(() => {
      document.getElementById(`q-${i}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }, []);

  const nudge = (delta) => setCounts((c) => ({ ...c, [subject]: bumpCount(subject, delta) }));

  if (!ordered.length) return <div className="placeholder">{emptyText}</div>;

  return (
    <div className="qboard">
      <nav className="qboard__side">
        {(ordered.length > RAIL_MAX ? ordered.slice(0, shown) : ordered).map((q, i) => (
          <a
            key={q._uid ?? q.id ?? i}
            onClick={() => jump(i)}
            className={doneSet.has(doneKeyFor(q)) ? "is-done" : ""}
            title={doneSet.has(doneKeyFor(q)) ? "Ho gaya" : undefined}
          >
            {i + 1}
          </a>
        ))}
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
          <span className="tot">📊 Total: {ordered.length}</span>
          <span className="did">✅ Ho gaye: {doneCount}</span>
          <span className="left">⏳ Baaki: {ordered.length - doneCount}</span>
        </div>

        <div className="qboard__cards">
          {ordered.slice(0, shown).map((q, i) => renderCard(q, i, ordered))}
        </div>

        {shown < ordered.length && (
          <button className="btn btn--ghost btn--block mt-16" onClick={() => setShown((n) => n + pageSize)}>
            ▼ Show {Math.min(pageSize, ordered.length - shown)} more ({shown} / {ordered.length})
          </button>
        )}
      </div>
    </div>
  );
}
