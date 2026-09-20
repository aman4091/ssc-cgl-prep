"use client";

// ⏱ 15 minute ka stretch — Answers page par Maths/Reasoning ke liye.
//
// Ghadi khud se shuru nahi hoti: page khol kar dekhte rehne ka waqt ginna
// bekaar hai. Pehla jawab (Aata hai / Nahi aata hai) dete hi chalu, aur
// poore 15 minute par ruk kar batati hai ki us stretch mein kitne question
// hue — kitne aate the, kitne nahi.
//
// Kuch bachta NAHI: na waqt, na ginti. Site dobara kholo, ya doosre subject
// se wapas aao — ghadi phir se 15:00 se, ginti phir 0 se. Owner ka niyam:
// "har baar 1 se hi chalu hoga".

import { useCallback, useEffect, useRef, useState } from "react";

export const fmtLeft = (sec) => {
  const s = Math.max(0, Math.round(sec));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

export function useDrillTimer(minutes = 15, enabled = true) {
  const total = minutes * 60;
  const [left, setLeft] = useState(total);
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState(null);   // { good, bad } — waqt poora
  const tally = useRef({ good: 0, bad: 0 });
  const endAt = useRef(0);

  // Subject badla (ya timer band) to sab shuru se.
  useEffect(() => {
    setRunning(false);
    setReport(null);
    setLeft(total);
    tally.current = { good: 0, bad: 0 };
    endAt.current = 0;
  }, [enabled, total]);

  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => {
      const sec = (endAt.current - Date.now()) / 1000;
      if (sec <= 0) {
        setLeft(0);
        setRunning(false);
        setReport({ ...tally.current });
      } else {
        setLeft(sec);
      }
    }, 500);
    return () => clearInterval(id);
  }, [running]);

  /** Ek jawab hua. Pehle jawab par ghadi chalu ho jati hai. */
  const mark = useCallback((good) => {
    if (!enabled) return;
    const t = tally.current;
    tally.current = good ? { ...t, good: t.good + 1 } : { ...t, bad: t.bad + 1 };
    setRunning((on) => {
      if (on) return true;
      endAt.current = Date.now() + total * 1000;
      setLeft(total);
      return true;
    });
  }, [enabled, total]);

  /** Popup band \u2014 ghadi aur ginti dono phir se shuru se. */
  const close = useCallback(() => {
    setReport(null);
    setLeft(total);
    tally.current = { good: 0, bad: 0 };
    endAt.current = 0;
    setRunning(false);
  }, [total]);

  return { left, running, report, mark, close, done: tally.current };
}
