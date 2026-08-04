"use client";

// Desktop ke Mock Test Helper overlay (F:\over, Flask on 127.0.0.1:5000) se
// wrong questions receive karta hai. Overlay har saved answer ko ek queue mein
// rakhta hai; ye component queue poll karke har item ko wrong-book mein daal
// deta hai (screenshot → R2/IndexedDB image, Gemini answer → detail), phir
// overlay ko ack bhejta hai. Overlay band ho to fetch chupchaap fail — no UI.

import { useEffect, useRef } from "react";
import { addWrong, setDetail, storeImages, isSubject, findByQid, dedupeByQid } from "@/lib/wrongbook";
import { shedOldQuizzes } from "@/lib/storage";

// localStorage full hone par purane generated quizzes shed karke retry — wahi
// self-heal jo saveQuiz mein hai, warna yaha addWrong chupchaap fail hota
// rehta aur overlay ke questions kabhi nahi dikhte.
function withSpace(fn) {
  for (;;) {
    try { return fn(); }
    catch (e) { if (!shedOldQuizzes()) throw e; }
  }
}

const PORTS = [5000, 5001, 5002]; // overlay ka pick_port 5000 busy hone par aage badhta hai
const POLL_MS = 5000;
const DONE_KEY = "overlayInbox.done"; // qids already added — ack fail par duplicate na bane

const readDone = () => {
  try { return new Set(JSON.parse(localStorage.getItem(DONE_KEY)) || []); }
  catch { return new Set(); }
};
const saveDone = (set) => {
  try { localStorage.setItem(DONE_KEY, JSON.stringify([...set].slice(-500))); }
  catch { /* ignore */ }
};

export default function OverlayInbox() {
  const busy = useRef(false);

  useEffect(() => {
    const tick = async () => {
      if (busy.current) return;
      busy.current = true;
      try {
        for (const port of PORTS) {
          const base = `http://127.0.0.1:${port}`;
          let items;
          try {
            const res = await fetch(`${base}/pending-wrong`, { cache: "no-store" });
            if (!res.ok) continue;
            items = await res.json();
          } catch { continue; } // overlay is port par nahi chal raha
          const done = readDone();
          for (const it of items || []) {
            const subject = isSubject(it.subject) ? it.subject : "math";
            try {
              // done-list ke saath book bhi check karo — dusri tab (apni
              // done-list ke saath) isse pehle hi add kar chuki ho sakti hai
              if (!done.has(it.qid) && !findByQid(it.qid)) {
                const imgRes = await fetch(`${base}/img/${it.qid}`, { cache: "no-store" });
                if (!imgRes.ok) continue;
                const blob = await imgRes.blob();
                const file = new File([blob], `${it.qid}.png`, { type: "image/png" });
                const { images } = await storeImages([file]);
                // upload ke seconds mein dusri tab race jeet sakti hai —
                // add se theek pehle aakhri baar check (duplicates ki wajah)
                if (!findByQid(it.qid)) {
                  // qid saath rakho — overlay ke answers page (q093...) se match hota hai
                  const rec = withSpace(() => addWrong({ subject, q: null, images, note: "", qid: it.qid }));
                  if (it.answer) withSpace(() => setDetail(rec.id, it.answer));
                }
                done.add(it.qid);
                saveDone(done);
              }
              await fetch(`${base}/ack-wrong/${it.qid}`, { method: "POST" });
            } catch { /* agla poll phir try karega */ }
          }
          // race se phir bhi ban gaye duplicates turant saaf ho jayen
          if ((items || []).length) await dedupeByQid().catch(() => {});
          break; // jis port par overlay mila, wahi kaafi hai
        }
      } finally {
        busy.current = false;
      }
    };
    // pehle se pade duplicates (do-tab race ke) ek baar saaf karo
    dedupeByQid().catch(() => {});
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => clearInterval(id);
  }, []);

  return null;
}
