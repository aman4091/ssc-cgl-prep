"use client";

// PYQ bank ka naya roop — test/sets nahi, ek-ek sawaal.
//
// Ek waqt par ek question: sawaal, options, neeche uska answer (khula hi),
// aur wahi purane buttons (✨ Gemini, 📥 paste…). Sabse neeche do button:
//
//   Aata hai      -> ye question 100 sawaal aage chala jata hai (1st par
//                    laga to 101ve number par phir aayega)
//   Nahi aata hai -> 3re sawaal baad phir aata hai; agli baar 4the, phir
//                    5ve … jab tak "Aata hai" na lage (gap har baar +1)
//
// Ginti lib/pyqdrill.js mein rehti hai, isliye chapter dobara kholne par
// gap wahin se aage badhta hai.

import { cloneElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import "@/app/ca-revision/carev.css";
import { getDrill, markDrill, qKeyOf, KNOWN_GAP, missGap } from "@/lib/pyqdrill";

export default function PyqDrill({ title, list, resumeKey, renderCard }) {
  const chapter = resumeKey || title || "pyq";
  const [queue, setQueue] = useState(() => [...list]);
  const [pos, setPos] = useState(0);
  const [done, setDone] = useState({ good: 0, bad: 0 });
  const stats = useRef({});

  useEffect(() => { stats.current = getDrill(chapter); }, [chapter]);
  useEffect(() => { setQueue([...list]); setPos(0); }, [list]);

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
    setQueue((old) => {
      const next = [...old];
      next.splice(pos, 1);
      next.splice(Math.min(pos + gap - 1, next.length), 0, q);
      return next;
    });
    setDone((d) => (good ? { ...d, good: d.good + 1 } : { ...d, bad: d.bad + 1 }));
    window.scrollTo(0, 0);
  }, [queue, pos, chapter]);

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
        <span className="carev-count">Sawaal {pos + 1}</span>
        <span className="carev-dim carev-small">
          {known}/{list.length} aata hai
          {st.m ? ` · ye ${st.m} baar galat` : ""}
          {done.good || done.bad ? ` · aaj ${done.good}✓ ${done.bad}✗` : ""}
        </span>
      </div>

      {cloneElement(card, { alwaysAnswer: true, key: `${qKeyOf(q)}:${pos}` })}

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
