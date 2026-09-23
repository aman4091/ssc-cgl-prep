"use client";

// 🔁 Answers ka saajha drill — wahi kram jo PC overlay ke page par hai.
//
// PyqDrill se shakl mein ek jaisa (upar ginti, beech mein card, neeche do
// button), par hisaab apna nahi rakhta: sab kuch lib/answerdrill ke saajha
// faislon se banta hai (cgl.answersdrill, jo sync hota hai). Isliye jo
// question yahan #1 hai wahi PC ke overlay par bhi #1 hota hai.
//
//   Nahi aata hai -> 15 question baad wapas
//   Aata hai      -> 100 question baad wapas
//
// Koi "main yahan tha" wala nishaan nahi rakha jata: kram hi bata deta hai
// ki agla kaun hai, aur dono jagah wahi kram banta hai.

import { cloneElement, useCallback, useEffect, useMemo, useState } from "react";
import { addMark, orderOf, countsOf, MISS_GAP, OK_GAP } from "@/lib/answerdrill";

export default function SharedDrill({ sub, list, keyOf, renderCard, onAnswer, unit = "Q" }) {
  const key = useCallback((q) => String((keyOf ? keyOf(q) : q?.qid) || ""), [keyOf]);
  const [tick, setTick] = useState(0);        // faisla lagte hi kram naya

  // Doosre device ka faisla sync hokar aaye to kram wahin taza ho jaye.
  useEffect(() => {
    const on = () => setTick((t) => t + 1);
    window.addEventListener("cgl:answerdrill", on);
    window.addEventListener("cgl:sync-applied", on);
    return () => {
      window.removeEventListener("cgl:answerdrill", on);
      window.removeEventListener("cgl:sync-applied", on);
    };
  }, []);

  const queue = useMemo(
    () => orderOf(sub, list, key),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sub, list, key, tick],
  );
  const counts = useMemo(
    () => countsOf(sub, list, key),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sub, list, key, tick],
  );
  const [today, setToday] = useState({ good: 0, bad: 0 });

  const answer = useCallback((ok) => {
    const q = queue[0];
    if (!q) return;
    addMark(sub, key(q), ok);
    setToday((d) => ({ good: d.good + (ok ? 1 : 0), bad: d.bad + (ok ? 0 : 1) }));
    if (onAnswer) onAnswer(ok, q);
    setTick((t) => t + 1);
    window.scrollTo(0, 0);
  }, [queue, sub, key, onAnswer]);

  // 1 / 2 — wahi shortcut jo baaki drill mein hai.
  useEffect(() => {
    const onKey = (e) => {
      if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
      if (e.key === "1") answer(false);
      else if (e.key === "2") answer(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answer]);

  if (!queue.length) return <div className="placeholder">Yahan koi question nahi. 🤔</div>;

  const q = queue[0];
  const card = renderCard(q, 0, queue);

  return (
    <div className="pyqd">
      <div className="pyqd-bar">
        <span className="carev-count">{unit} 1/{list.length}</span>
        <span className="carev-dim carev-small">
          {counts.done}/{list.length} aata hai
          {today.good || today.bad ? ` · aaj ${today.good}✓ ${today.bad}✗` : ""}
          {` · PC ke saath ek hi kram (${MISS_GAP}/${OK_GAP})`}
        </span>
      </div>

      {cloneElement(card, { key: key(q) })}

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
