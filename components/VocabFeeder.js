"use client";

// Desktop ke Mock Test Helper overlay (F:\over) ke 📚 Vocab auto-loop ka
// site-side hissa. Teen kaam, teeno OverlayInbox jaise 5s poll par:
//
// 1. Overlay ko words dena: /vocab-need bole "active hoon, words chahiye" to
//    homepage wale day (nextUp) se shuru karke pehla aisa day dhundo jisme
//    bina-meaning wale words bache hon (teeno types: ows/idiom/vocab), aur
//    unhe /vocab-words par bhej do. Ek day khatam → agli baar khud agla day
//    milta hai (meanings save hone se filter aage badh jata hai).
// 2. Meanings lena: /pending-vocab se copy hui Gemini meanings utha kar
//    cgl.vocab.mine mein save karo (homepage par turant dikhti hain) aur
//    /ack-vocab bhejo.
// 3. One-liner lena: /pending-oneliners se overlay ke 📝 button wali line
//    apne 📝 One-liners page (/oneliners) mein daal do, phir /ack-oneliner.
//
// Overlay band ho to fetch chupchaap fail — no UI.

import { useEffect, useRef } from "react";
import { TYPES, nextUp, totalDays, getDayTypeItems, getDayProgress, getMine, setMine, addNewWord } from "@/lib/vocab";
import { addOneLiner } from "@/lib/oneliners";
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

// Day ke words jinki apni (Gemini) meaning abhi nahi hai — sirf un types ke
// jinka is day ka quiz ABHI NAHI hua. Jo type quiz-done hai wo "ho chuka" —
// uske bache words dobara nahi bhejne (warna already-done cheez baar-baar aati).
function pendingWords(day) {
  const done = new Set(getDayProgress(day).doneTypes);
  const out = [];
  for (const t of TYPES) {
    if (done.has(t.key)) continue;
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

            // 3. 📝 One-liner: subject ka answer copy karne ke baad overlay
            //    se aayi ek-line, seedhe /oneliners ki list mein (apna alag
            //    page — fact log ka revision isse nahi bharta).
            const ol = await fetch(`${base}/pending-oneliners`, { cache: "no-store" });
            if (ol.ok) {
              for (const it of (await ol.json()) || []) {
                if (!it.id) continue;
                if (it.text) {
                  withSpace(() => addOneLiner({ subject: it.subject, text: it.text }));
                }
                await fetch(`${base}/ack-oneliner`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id: it.id }),
                });
              }
            }

            const res = await fetch(`${base}/pending-vocab`, { cache: "no-store" });
            if (res.ok) {
              for (const it of (await res.json()) || []) {
                if (!it.word) continue;
                // overlay ke 📋 button ka apna word -> New Words list mein bhi
                if (it.new) withSpace(() => addNewWord(it.word));
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
