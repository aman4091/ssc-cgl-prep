"use client";

// Recall (Pass 2) — trigger dikhao, socho, tap karke answer, khud ko rate karo.
// Ek angoothe se, khade-khade: saare button neeche, bade, aur answer aane par
// kuch bhi apni jagah se nahi hilta (answer ki jagah pehle se khali rakhi hai).
// Desktop par: Space = answer, 1 = Nahi aata, 2 = Aata hai, S = star.
//
// Fact log (/mission/facts) bhi isi ko use karta hai, apne schedule ke saath:
// `onRate(card, good)` diya ho to CA ka SRS nahi chhua jata, star band hota
// hai, aur card.meta (upar ki chhoti line) apni hoti hai.
//   open  — jawab shuru se khula (padho aur batao aata tha ya nahi)
//   loop  — "nahi aata" wala card isi round mein baar-baar aata hai, har baar
//           thoda aur door (3, 4, 5 … card baad), jab tak "aata tha" na dabe;
//           phir round ke aakhir mein ek pakki jaanch. Har jawab onRate tak.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { rate, toggleStar, getStars } from "@/lib/carevision/progress";
import { getSession, saveSession, clearSession } from "@/lib/recallsession";

const AGAIN_AFTER = 5;   // galat card itne card baad isi session mein phir
const LOOP_AFTER = 3;    // loop mode: jaldi wapas, jab tak aa na jaye

const DEFAULT_LABELS = { bad: "Nahi aata", good: "Aata hai", show: "Answer dikhao" };

// Lamba jawab (khaas kar fact log ka CLUSTER) ek hi saans mein likha hota
// hai: "Publisher – GlobalFirepower.com · Score ka naam – Power Index · …".
// Ek bade bold block mein wo deewar jaisa lagta hai aur padha hi nahi jata.
//
// Isliye yahan wahi line tod di jati hai: " · " (ya nayi line) par ek-ek
// point, aur point ke andar "naam – baaki" ho to naam bold. Koi AI nahi —
// ye bantwara PDF/prompt ne pehle hi kar rakha hai, bas dikhaya nahi ja raha
// tha. Chhota jawab (ek hi tukda) jaisa tha waisa hi rehta hai — CA Revision
// ke cards ka jawab ek hi naam hota hai aur wo bada dikhna chahiye.
const HEAD = /^(.{2,60}?)\s*(?:–|—|\s-\s|:)\s*([\s\S]+)$/;

// Chhoti line ke neeche chhupa hua poora prose.
function MoreLine({ text }) {
  const [open, setOpen] = useState(false);
  if (open) return <div className="carev-more is-open">{text}</div>;
  return (
    <button className="carev-more" onClick={(e) => { e.stopPropagation(); setOpen(true); }}>
      ⌄ poora padho
    </button>
  );
}

export function answerPoints(text) {
  const raw = String(text || "");
  const parts = raw
    .split(/\n+|\s+·\s+|\s+•\s+/)
    .map((x) => x.trim())
    .filter(Boolean);
  if (parts.length < 2) return null;
  return parts.map((p) => {
    const m = HEAD.exec(p);
    return m ? { head: m[1].trim(), rest: m[2].trim() } : { head: "", rest: p };
  });
}

export default function Recall({
  queue: initial, today, onExit, onRate, labels = DEFAULT_LABELS, open = false, loop = false,
  onDelete, resumeKey, tools,
}) {
  const withStar = !onRate;
  // Adhoora round wapas (lib/recallsession): qataar ka kram — dobara-aane
  // wali copy samet — kahan tak pahunche the, aur kis card par is round mein
  // kitni galti ho chuki (agla gap usi se banta hai).
  const saved = useMemo(() => (resumeKey ? getSession(resumeKey) : null), [resumeKey]);
  const [queue, setQueue] = useState(() => {
    if (!saved) return initial;
    const byId = new Map(initial.map((c) => [c.id, c]));
    const q = [];
    const used = new Set();
    for (const e of saved.ids) {
      const c = byId.get(e.id);
      if (!c) continue;                     // card beech mein hata diya gaya
      used.add(e.id);
      q.push(e.r ? { ...c, __retry: true, __check: !!e.c } : c);
    }
    // Jo card is beech naya juda wo aakhir mein — round se bahar na reh jaye.
    for (const c of initial) if (!used.has(c.id)) q.push(c);
    return q.length ? q : initial;
  });
  const [pos, setPos] = useState(() => (saved ? Math.max(0, saved.pos || 0) : 0));
  const [shown, setShown] = useState(open);
  const [stars, setStars] = useState(() => getStars());
  const [tally, setTally] = useState(() => (saved?.tally ? { ...saved.tally } : { good: 0, bad: 0 }));
  const again = useRef(new Set());       // jo card pehle se dobara lagaya ja chuka
  const misses = useRef(new Map(Object.entries(saved?.miss || {})));  // loop: card id -> is round ki galtiyan

  const card = queue[pos];
  const done = pos >= queue.length;

  // Har badlav par round likh do — tab band ho jaye, phone rakh do, kuch bhi
  // ho, agli baar wahi card saamne hota hai aur gap wahi se aage badhta hai.
  // Round poora hote hi khabar saaf: agli baar SAB card phir se aate hain.
  useEffect(() => {
    if (!resumeKey) return;
    if (done) { clearSession(resumeKey); return; }
    saveSession(resumeKey, {
      ids: queue.map((c) => (c.__retry ? { id: c.id, r: 1, ...(c.__check ? { c: 1 } : {}) } : { id: c.id })),
      pos,
      miss: Object.fromEntries(misses.current),
      tally,
    });
  }, [resumeKey, queue, pos, done, tally]);

  const answer = useCallback((good) => {
    if (!card || !shown) return;
    const retry = !!card.__retry;          // dobara aaya card — tally pehli baar ka hi
    if (loop || !retry) {
      if (onRate) onRate(card, good);
      else rate(card.id, good, today);
    }
    if (!retry) setTally((t) => (good ? { ...t, good: t.good + 1 } : { ...t, bad: t.bad + 1 }));
    if (loop) {
      // Har galti par gap badhta hai (3, 4, 5, …) — 3 card baad wapas aaya
      // card "aata hai" lagta hai, par wo abhi-abhi dekha hua hota hai.
      // Jo card ek baar bhi galat hua, uska pehla "aata tha" kaafi nahi: wo
      // round ke aakhir mein ek baar aur aata hai (pakki jaanch).
      const miss = misses.current;
      if (!good) {
        miss.set(card.id, (miss.get(card.id) || 0) + 1);
        const gap = LOOP_AFTER + miss.get(card.id) - 1;
        setQueue((q) => {
          const next = [...q];
          next.splice(Math.min(pos + 1 + gap, next.length), 0, { ...card, __retry: true, __check: false });
          return next;
        });
      } else if (miss.get(card.id) && !card.__check) {
        // aakhir mein tabhi, jab beech mein kam se kam LOOP_AFTER aur card
        // hon — warna wo turant dobara aata, jaanch ka koi matlab nahi
        setQueue((q) => (q.length - (pos + 1) >= LOOP_AFTER ? [...q, { ...card, __retry: true, __check: true }] : q));
      }
    } else if (!good && !again.current.has(card.id)) {
      again.current.add(card.id);
      setQueue((q) => {
        const next = [...q];
        next.splice(Math.min(pos + 1 + AGAIN_AFTER, next.length), 0, { ...card, __retry: true });
        return next;
      });
    }
    setShown(open);
    setPos((p) => p + 1);
  }, [card, shown, today, pos, onRate, loop, open]);

  // 🗑️ Is card ko hamesha ke liye hatao (fact log / Zaroori baatein).
  // Card qataar se nikal jata hai — uski dobara-aane wali copy bhi — aur
  // agla card wahin aa jata hai, isliye pos wahi rehta hai.
  const del = useCallback(() => {
    if (!card || !onDelete) return;
    onDelete(card);
    setQueue((q) => q.filter((c) => c.id !== card.id));
    setShown(open);
  }, [card, onDelete, open]);

  const star = useCallback(() => {
    if (!card || !withStar) return;
    const on = toggleStar(card.id);
    setStars((s) => ({ ...s, [card.id]: on ? 1 : 0 }));
  }, [card, withStar]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!shown) setShown(true);
      } else if (e.key === "1") answer(false);
      else if (e.key === "2") answer(true);
      else if (e.key === "s" || e.key === "S") star();
      else if (e.key === "Escape") onExit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shown, answer, star, onExit]);

  if (done) {
    const total = tally.good + tally.bad;
    return (
      <div className="carev-recall">
        <div className="carev-done">
          <div className="carev-done-big">{loop ? "Sab aa gaye ✓" : "Ho gaya ✓"}</div>
          <p>{total} card · <b>{tally.good}</b> {labels.good.toLowerCase()} · <b>{tally.bad}</b> {labels.bad.toLowerCase()}</p>
          <p className="carev-dim">{loop ? "Jo pehli baar nahi aaye the, wo bhi ab ho gaye." : "Jo nahi aaye wo kal phir aayenge."}</p>
          <button className="carev-btn carev-btn-primary" onClick={onExit}>Wapas</button>
        </div>
      </div>
    );
  }

  const starred = !!stars[card.id];
  return (
    <div className="carev-recall">
      <div className="carev-bar">
        <button className="carev-link" onClick={onExit} aria-label="Wapas">← Wapas</button>
        <span className="carev-count">{pos + 1} / {queue.length}</span>
        {onDelete ? (
          <button className="carev-del" onClick={del} aria-label="Ye hata do" title="Ye hamesha ke liye hata do">🗑️</button>
        ) : null}
        {withStar ? (
          <button
            className={`carev-star${starred ? " on" : ""}`}
            onClick={star}
            aria-pressed={starred}
            aria-label={starred ? "Star hatao" : "Star karo"}
          >{starred ? "★" : "☆"}</button>
        ) : <span />}
      </div>
      <div className="carev-progress" aria-hidden="true">
        <div style={{ width: `${(pos / queue.length) * 100}%` }} />
      </div>

      <div className="carev-card" onClick={() => !shown && setShown(true)}>
        <div className="carev-meta">
          {card.meta ? <span>{card.meta}</span> : <><span>Part {card.part}</span> · <span>{card.section}</span></>}
          {card.__retry ? <span className="carev-again"> · {card.__check ? "pakki jaanch" : "phir se"}</span> : null}
        </div>
        <div className="carev-trigger">{card.trigger}</div>
        <div className={`carev-answer${shown ? " shown" : ""}`} aria-live="polite">
          {shown ? (
            <>
              {(() => {
                const pts = answerPoints(card.answer);
                if (!pts) return <div className="carev-answer-text">{card.answer}</div>;
                return (
                  <ul className="carev-points">
                    {pts.map((p, i) => (
                      <li key={i}>
                        {p.head ? <b>{p.head}</b> : null}
                        {p.head ? " — " : ""}
                        {p.rest}
                      </li>
                    ))}
                  </ul>
                );
              })()}
              {/* ⌄ poora padho — D+3 se aage card par sirf "⚡" wali chhoti
                  line hoti hai (120 cluster 15 min mein nikalne ke liye).
                  Poora prose yahin ek tap door rehta hai. */}
              {card.more ? <MoreLine text={card.more} /> : null}
              {card.extra ? <div className="carev-extra">{card.extra}</div> : null}
              {card.pdfPage ? <div className="carev-src">PDF p.{card.pdfPage}</div> : null}
              {/* Card ke apne auzaar — fact log / Zaroori baatein yahan
                  "iski trick bana do" wale button dete hain. */}
              {tools ? tools(card) : null}
            </>
          ) : (
            <div className="carev-hint">Socho… phir tap karo</div>
          )}
        </div>
      </div>

      <div className="carev-actions">
        {shown ? (
          <>
            <button className="carev-btn carev-btn-bad" onClick={() => answer(false)}>
              {labels.bad} <kbd>1</kbd>
            </button>
            <button className="carev-btn carev-btn-good" onClick={() => answer(true)}>
              {labels.good} <kbd>2</kbd>
            </button>
          </>
        ) : (
          <button className="carev-btn carev-btn-primary carev-wide" onClick={() => setShown(true)}>
            {labels.show} <kbd>Space</kbd>
          </button>
        )}
      </div>
    </div>
  );
}
