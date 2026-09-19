"use client";

// PYQ bank ka naya roop — test/sets nahi, ek-ek sawaal.
//
// Ek waqt par ek question: sawaal aur options. Answer CHHUPA rehta hai —
// pehle option chuno (ya 👁️ dabao), tab khulta hai. Upar wahi buttons:
// ✨ Gemini, 🐋 DeepSeek, 📥 paste. Sabse neeche do button:
//
//   Aata hai      -> ye question 100 sawaal aage chala jata hai (1st par
//                    laga to 101ve number par phir aayega)
//   Nahi aata hai -> 3re sawaal baad phir aata hai; agli baar 4the, phir
//                    5ve … jab tak "Aata hai" na lage (gap har baar +1)
//
// Ginti AUR qataar ka kram, dono lib/pyqdrill.js mein bachte hain. Isliye
// site band karke kholne par wahi se shuru hota hai jahan chhoda tha —
// question 5 par "nahi aata" dabaya to agli baar 6 se shuru, aur 5 apne
// 3/4/5… wale gap ke baad wahin wapas.

import { cloneElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import "@/app/ca-revision/carev.css";
import { getDrill, getOrder, saveOrder, markDrill, qKeyOf, KNOWN_GAP, missGap } from "@/lib/pyqdrill";

function shuffled(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function PyqDrill({ title, list, resumeKey, renderCard, shuffleFirst = false, unit = "Q" }) {
  const chapter = resumeKey || title || "pyq";
  const [queue, setQueue] = useState(() => [...list]);
  const [pos, setPos] = useState(0);
  // Question -> chapter ki asli list mein uska number. Kram isi shakl mein
  // bachta hai, aur card ke sar par "Q 5/387" bhi yahi se aata hai.
  const idxOf = useMemo(() => {
    const m = new Map();
    list.forEach((q, i) => m.set(qKeyOf(q), i));
    return m;
  }, [list]);
  const [done, setDone] = useState({ good: 0, bad: 0 });
  const stats = useRef({});

  useEffect(() => { stats.current = getDrill(chapter); }, [chapter]);

  // Pichhli baar ka kram wapas. Adhoora ya purana ho to jo mila wo aage,
  // baaki list ke apne kram mein peechhe — koi question gum na ho.
  useEffect(() => {
    const saved = getOrder(chapter, list.length);
    if (!saved) {
      // Pehli baar: vocab jaisi jagah par kram RANDOM chahiye (owner:
      // "koisa bhi aaye"), question bank mein kitaab ka apna kram.
      setQueue(shuffleFirst ? shuffled(list) : [...list]);
      setPos(0);
      return;
    }
    const seen = new Set();
    const q = [];
    for (const i of saved) {
      const item = list[i];
      if (item && !seen.has(i)) { seen.add(i); q.push(item); }
    }
    list.forEach((item, i) => { if (!seen.has(i)) q.push(item); });
    setQueue(q);
    setPos(0);
  }, [list, chapter, shuffleFirst]);

  const known = useMemo(() => {
    const s = stats.current || {};
    return list.filter((q) => (s[qKeyOf(q)]?.k || 0) > 0).length;
  }, [list, done]); // eslint-disable-line react-hooks/exhaustive-deps

  const answer = useCallback((good) => {
    const q = queue[pos];
    if (!q) return;
    const st = markDrill(chapter, q, good);
    stats.current = { ...stats.current, [qKeyOf(q)]: st };
    const gap = good ? KNOWN_GAP : missGap(st.m || 1);
    const next = [...queue];
    next.splice(pos, 1);
    next.splice(Math.min(pos + gap - 1, next.length), 0, q);
    setQueue(next);
    // Naya kram wahin likh do — tab ab band ho jaye to bhi yahi se chalega.
    saveOrder(chapter, next.map((x) => idxOf.get(qKeyOf(x))).filter((i) => i != null), list.length);
    setDone((d) => (good ? { ...d, good: d.good + 1 } : { ...d, bad: d.bad + 1 }));
    window.scrollTo(0, 0);
  }, [queue, pos, chapter, idxOf, list.length]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
      if (e.key === "1") answer(false);
      else if (e.key === "2") answer(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answer]);

  if (!queue.length) return <div className="placeholder">Is chapter mein koi question nahi. 🤔</div>;

  const q = queue[pos % queue.length];
  const st = stats.current?.[qKeyOf(q)] || {};
  const card = renderCard(q, pos, queue);

  return (
    <div className="pyqd">
      <div className="pyqd-bar">
        <span className="carev-count">{unit} {(idxOf.get(qKeyOf(q)) ?? 0) + 1}/{list.length}</span>
        <span className="carev-dim carev-small">
          {known}/{list.length} aata hai
          {st.m ? ` · ye ${st.m} baar galat` : ""}
          {done.good || done.bad ? ` · aaj ${done.good}✓ ${done.bad}✗` : ""}
        </span>
      </div>

      {/* key badalne par card naya bana hai — pichhla chuna hua option saaf,
          taaki wahi question dobara aaye to phir se khud attempt ho. */}
      {cloneElement(card, { key: `${qKeyOf(q)}:${pos}` })}

      <div className="carev-actions pyqd-actions">
        <button className="carev-btn carev-btn-bad" onClick={() => answer(false)}>
          Nahi aata hai <kbd>1</kbd>
        </button>
        <button className="carev-btn carev-btn-good" onClick={() => answer(true)}>
          Aata hai <kbd>2</kbd>
        </button>
      </div>
    </div>
  );
}
