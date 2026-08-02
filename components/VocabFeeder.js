"use client";

// Desktop ke Mock Test Helper overlay (F:\over) ke 📚 Vocab auto-loop ka
// site-side hissa. Do kaam, dono OverlayInbox jaise 5s poll par:
//
// 1. Overlay ko words dena: /vocab-need bole "active hoon, words chahiye" to
//    homepage wale day (nextUp) se shuru karke pehla aisa day dhundo jisme
//    bina-meaning wale words bache hon (teeno types: ows/idiom/vocab), aur
//    unhe /vocab-words par bhej do. Ek day khatam → agli baar khud agla day
//    milta hai (meanings save hone se filter aage badh jata hai).
// 2. Meanings lena: /pending-vocab se copy hui Gemini meanings utha kar
//    cgl.vocab.mine mein save karo (homepage par turant dikhti hain) aur
//    /ack-vocab bhejo.
//
// Overlay band ho to fetch chupchaap fail — no UI.

import { useEffect, useRef } from "react";
import { TYPES, nextUp, totalDays, getDayTypeItems, getMine, setMine } from "@/lib/vocab";
import { shedOldQuizzes } from "@/lib/storage";

// localStorage full → purane generated quizzes shed karke retry (OverlayInbox
// wala hi self-heal) — meaning kabhi chupchaap na khoye.
function withSpace(fn) {
  for (;;) {
    try { return fn(); }
    catch (e) { if (!shedOldQuizzes()) throw e; }
  }
}

const PORTS = [5000, 5001, 5002];
const POLL_MS = 5000;

// Day ke words jinki apni (Gemini) meaning abhi nahi hai.
function pendingWords(day) {
  const out = [];
  for (const t of TYPES) {
    for (const it of getDayTypeItems(day, t.key)) {
      if (!getMine(it.word).trim()) out.push({ word: it.word, def: it.def || "", type: t.key });
    }
  }
  return out;
}

export default function VocabFeeder() {
  const busy = useRef(false);

  useEffect(() => {
    const tick = async () => {
      if (busy.current) return;
      busy.current = true;
      try {
        for (const port of PORTS) {
          const base = `http://127.0.0.1:${port}`;
          let need;
          try {
            const res = await fetch(`${base}/vocab-need`, { cache: "no-store" });
            if (!res.ok) continue;
            need = await res.json();
          } catch { continue; } // overlay is port par nahi chal raha

          try {
            if (need.active && !need.have_words) {
              // homepage day se aage tak pehla day jisme naye words bache hain
              const startDay = nextUp()?.day || 1;
              const last = totalDays();
              let payload = { day: null, items: [] }; // khali = sab done
              for (let d = startDay; d <= last; d++) {
                const items = pendingWords(d);
                if (items.length) { payload = { day: d, items }; break; }
              }
              await fetch(`${base}/vocab-words`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });
            }

            const res = await fetch(`${base}/pending-vocab`, { cache: "no-store" });
            if (res.ok) {
              for (const it of (await res.json()) || []) {
                if (!it.word) continue;
                // khali meaning save nahi karni, par ack zaroor — queue clear rahe
                if (it.meaning) withSpace(() => setMine(it.word, it.meaning));
                await fetch(`${base}/ack-vocab`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ word: it.word }),
                });
              }
            }
          } catch { /* agla poll phir try karega */ }
          break; // jis port par overlay mila, wahi kaafi hai
        }
      } finally {
        busy.current = false;
      }
    };
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => clearInterval(id);
  }, []);

  return null;
}
