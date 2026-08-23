"use client";

// Desktop ke Mock Test Helper overlay (F:\over, Flask on 127.0.0.1:5000) se
// wrong questions receive karta hai. Overlay har saved answer ko ek queue mein
// rakhta hai; ye component queue poll karke har item ko wrong-book mein daal
// deta hai (screenshot → R2/IndexedDB image, Gemini answer → detail), phir
// overlay ko ack bhejta hai. Overlay band ho to fetch chupchaap fail — no UI.

import { useEffect, useRef } from "react";
import {
  addWrong, setDetail, storeImages, isSubject, findByQid, dedupeByQid,
  getWrongBook, displayOrder, touchWrong,
} from "@/lib/wrongbook";
import { getDoneMap } from "@/lib/answersdone";
import { setUnder40 } from "@/lib/under40";
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

          // ── ab ULTA raasta: site -> overlay ────────────────────────────
          //
          // Overlay ke right-edge panel par wahi list, usi kram mein dikhni
          // chahiye jo Answers page par hai. Kram ka hisaab yahan hai (record
          // ka waqt + ✅ ka waqt), overlay ke paas nahi — isliye kram aur
          // marks yahan se wahan bheje jate hain, ulta nahi.
          //
          // Tablet par lagaya hua ✅ bhi isi raaste se overlay tak pahunchta
          // hai: tablet -> Supabase -> is PC ka khula hua site page -> yahan.
          // Yaani overlay tabhi taaza rehta hai jab site is PC par khuli ho —
          // aur wahi to har waqt khuli rehti hai (question yahin se aate hain).
          try {
            const doneMap = getDoneMap();
            const order = displayOrder(getWrongBook("math"), doneMap)
              .map((r) => r.qid)
              .filter(Boolean);
            const doneQids = getWrongBook("math")
              .filter((r) => r.qid && doneMap[r.id] !== undefined)
              .map((r) => r.qid);
            await fetch(`${base}/site-state`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ order, done: doneQids }),
            });
          } catch { /* overlay band — agla poll phir bhej dega */ }

          // ⏱️ Under 40 ki list overlay ke paas hai (wahi timer chalata hai) —
          // yahan uski nakal, taaki wo question aam list se hat jayein.
          try {
            const res = await fetch(`${base}/under40`, { cache: "no-store" });
            if (res.ok) setUnder40((await res.json()).qids);
          } catch { /* ignore */ }

          // Overlay par khola gaya par nipta nahi — us question ko yahan
          // "abhi hua" bana do, taaki wo dono jagah sabse neeche chala jaye.
          try {
            const res = await fetch(`${base}/bumps`, { cache: "no-store" });
            if (res.ok) {
              const { bumps } = await res.json();
              for (const qid of Object.keys(bumps || {})) {
                withSpace(() => touchWrong(qid));
                await fetch(`${base}/ack-bump/${qid}`, { method: "POST" });
              }
            }
          } catch { /* ignore */ }

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
