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
import { hashStr } from "@/lib/syncitems";

function shuffled(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function PyqDrill({
  title, list, resumeKey, renderCard, shuffleFirst = false, unit = "Q", keyOf, onAnswer,
}) {
  const chapter = resumeKey || title || "pyq";
  // Har item ki pehchaan. Bank ke question ka apna id hota hai; Answers
  // board ke record do alag duniya se aate hain (mock screenshot aur
  // quiz ka galat question) jahan `id` takra sakta hai, isliye wahan se
  // apna `uid` bheja jata hai.
  const keyFor = keyOf || qKeyOf;
  // Kram isi chhoti pehchaan se bachta hai (lib/pyqdrill dekho).
  const hashOf = useCallback((q) => hashStr(keyFor(q)), [keyFor]);
  const [queue, setQueue] = useState(() => [...list]);
  const [pos, setPos] = useState(0);
  // Question -> chapter ki asli list mein uska number. Kram isi shakl mein
  // bachta hai, aur card ke sar par "Q 5/387" bhi yahi se aata hai.
  const idxOf = useMemo(() => {
    const m = new Map();
    list.forEach((q, i) => m.set(keyFor(q), i));
    return m;
  }, [list, keyFor]);
  const [done, setDone] = useState({ good: 0, bad: 0 });
  const stats = useRef({});
  // Ginti aane par sar ki line ("12/72 aata hai") bhi taza ho jaye —
  // warna wo chapter khulte hi 0 dikhata rehta tha.
  const [statsTick, setStatsTick] = useState(0);

  useEffect(() => { stats.current = getDrill(chapter); setStatsTick((t) => t + 1); }, [chapter]);

  // Pichhli baar ka kram wapas. Adhoora ya purana ho to jo mila wo aage,
  // baaki list ke apne kram mein peechhe — koi question gum na ho.
  useEffect(() => {
    const saved = getOrder(chapter, list.length);
    if (!saved) {
      // Pehli baar: vocab jaisi jagah par kram RANDOM chahiye (owner:
      // "koisa bhi aaye"), question bank mein kitaab ka apna kram.
      let base = shuffleFirst ? shuffled(list) : [...list];
      // Kram to nahi bacha par GINTI bachi hai — to jahan tak pahunche the
      // wahin se shuru karo: jin par "Aata hai" laga tha wo peechhe chale
      // jaate hain, baaki apne kram mein aage. (Ye tab kaam aata hai jab
      // kram kisi wajah se gir gaya ho — warna ginti khali hoti hai aur
      // kuch badalta hi nahi.)
      const st = getDrill(chapter);
      if (st && Object.keys(st).length) {
        const known = (q) => ((st[keyFor(q)] || {}).k || 0) > 0;
        base = base.map((q, idx) => ({ q, idx }))
          .sort((x, y) => (known(x.q) ? 1 : 0) - (known(y.q) ? 1 : 0) || x.idx - y.idx)
          .map((x) => x.q);
      }
      setQueue(base);
      setPos(0);
      return;
    }
    // Do shakl: naya kram hash ka hai, purana list ke number ka (wo tabhi
    // aata hai jab list ki lambai wahi ho — lib/pyqdrill dekh leta hai).
    const byHash = new Map();
    list.forEach((item) => { const h = hashOf(item); if (!byHash.has(h)) byHash.set(h, item); });
    const seen = new Set();
    const q = [];
    for (const e of saved) {
      const item = typeof e === "number" ? list[e] : byHash.get(e);
      if (!item) continue;
      const h = hashOf(item);
      if (seen.has(h)) continue;
      seen.add(h);
      q.push(item);
    }
    // Beech mein juda NAYA question (overlay se aaya, ya quiz ka taza galat)
    // qataar ke ANT mein nahi jata — 400 question ki list mein uska matlab
    // hota "mahine bhar baad". Wo bhi lagbhag 100 question aage lagta hai,
    // yaani ek-do din mein saamne.
    //
    // THEEK 100 par nahi: "Aata hai" wala card khud KNOWN_GAP-1 (99) par
    // wapas ghusta hai, isliye 99 ya uske aage baitha card har jawab par ek
    // kadam aage khisak kar wahin ka wahin reh jata hai — kabhi saamne aata
    // hi nahi. Us lakeer se thoda pehle rakhne par wo har jawab ke saath ek
    // kadam paas aata hai.
    //
    // Ek se zyada naye hon to line mein: pehla sabse pehle, uske baad wala
    // uske peechhe — koi kisi ki jagah nahi leta.
    const fresh = list.filter((item) => !seen.has(hashOf(item)));
    if (fresh.length) {
      const at = Math.max(0, Math.min(q.length, KNOWN_GAP - 2 - (fresh.length - 1)));
      q.splice(at, 0, ...fresh);
    }
    setQueue(q);
    setPos(0);
  }, [list, chapter, shuffleFirst, hashOf, keyFor]);

  const known = useMemo(() => {
    const s = stats.current || {};
    return list.filter((q) => (s[keyFor(q)]?.k || 0) > 0).length;
  }, [list, done, statsTick]); // eslint-disable-line react-hooks/exhaustive-deps

  const answer = useCallback((good) => {
    const q = queue[pos];
    if (!q) return;
    const st = markDrill(chapter, { id: keyFor(q) }, good);
    stats.current = { ...stats.current, [keyFor(q)]: st };
    const gap = good ? KNOWN_GAP : missGap(st.m || 1);
    const next = [...queue];
    next.splice(pos, 1);
    next.splice(Math.min(pos + gap - 1, next.length), 0, q);
    setQueue(next);
    // Naya kram wahin likh do — tab ab band ho jaye to bhi yahi se chalega.
    saveOrder(chapter, next.map(hashOf), list.length);
    setDone((d) => (good ? { ...d, good: d.good + 1 } : { ...d, bad: d.bad + 1 }));
    // Bahar wale ko khabar — Answers page ki 15-minute wali ghadi isi se
    // chalu hoti hai aur ginti rakhti hai.
    if (onAnswer) onAnswer(good);
    window.scrollTo(0, 0);
  }, [queue, pos, chapter, list.length, keyFor, hashOf, onAnswer]);

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
  const st = stats.current?.[keyFor(q)] || {};
  const card = renderCard(q, pos, queue);

  return (
    <div className="pyqd">
      <div className="pyqd-bar">
        <span className="carev-count">{unit} {(idxOf.get(keyFor(q)) ?? 0) + 1}/{list.length}</span>
        <span className="carev-dim carev-small">
          {known}/{list.length} aata hai
          {st.m ? ` · ye ${st.m} baar galat` : ""}
          {done.good || done.bad ? ` · aaj ${done.good}✓ ${done.bad}✗` : ""}
        </span>
      </div>

      {/* key badalne par card naya bana hai — pichhla chuna hua option saaf,
          taaki wahi question dobara aaye to phir se khud attempt ho. */}
      {cloneElement(card, { key: `${keyFor(q)}:${pos}` })}

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
