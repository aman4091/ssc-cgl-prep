"use client";

// Desktop ke Mock Test Helper overlay (F:\over, Flask on 127.0.0.1:5000) se
// wrong questions receive karta hai. Overlay har saved answer ko ek queue mein
// rakhta hai; ye component queue poll karke har item ko wrong-book mein daal
// deta hai (screenshot → R2/IndexedDB image, Gemini answer → detail), phir
// overlay ko ack bhejta hai. Overlay band ho to fetch chupchaap fail — no UI.

import { useEffect, useRef } from "react";
import {
  addWrong, setDetail, storeImages, isSubject, findByQid, dedupeByQid,
  getWrongBook, displayOrder, touchWrong, getDeletedQids, removeWrong,
} from "@/lib/wrongbook";
import { getDoneMap } from "@/lib/answersdone";
import { getUnder40, setUnder40 } from "@/lib/under40";
import { getHardSet } from "@/lib/hardq";
import { shedOldQuizzes, getSettings } from "@/lib/storage";

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
              // Sirf book dekho, apni done-list nahi.
              //
              // Pehle `done` (localStorage) bhi rok deti thi. Uska nateeja:
              // question ek baar bheja gaya, kisi wajah se book mein tika
              // nahi (purana push, ya book saaf ho gayi), aur dobara KABHI
              // nahi aaya — overlay par 234 maths the aur site par 142.
              // findByQid duplicate pehle hi rok deta hai, isliye wo guard
              // sirf nuksaan kar rahi thi.
              if (!findByQid(it.qid)) {
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
          //
          // `order` mein BILKUL wahi list jaati hai jo Answers page apni
          // Maths External Mock shelf par DIKHATA hai. Pehle yahan poori
          // math wrong-book jaati thi — usme 🔴 Hard wale question bhi the,
          // jo site par is shelf se bahar hain. Panel unhe nahi jaanta, to
          // wo unhe bhi ginta tha aur dono jagah ka "pehla question" alag ho
          // jata tha. Filter wahi teen hain jo AnswersBoard lagata hai:
          // subject maths, qid wala record, aur na Under-40 na 🔴 Hard.
          try {
            const doneMap = getDoneMap();
            const u40set = getUnder40();
            const hardSet = getHardSet();
            const mathBook = getWrongBook("math").filter((r) => r.qid);
            const shown = mathBook.filter(
              (r) => !u40set.has(r.qid) && !hardSet.has(r.id),
            );
            const order = displayOrder(shown, doneMap).map((r) => r.qid);
            const doneQids = shown
              .filter((r) => doneMap[r.id] !== undefined)
              .map((r) => r.qid);
            await fetch(`${base}/site-state`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                order,
                done: doneQids,
                // Site ke paas jo bhi maths qid hai — chhupe hue (Hard/U40)
                // samet. Overlay ka resend_missing isi se dekhta hai ki kya
                // sach mein site tak pahuncha hi nahi; warna Hard wale
                // question har 5 second par dobara-dobara bheje jate.
                known: mathBook.map((r) => r.qid),
                // Site par 🗑️ kiye hue — overlay inki file hata dega aur
                // dobara kabhi nahi bhejega.
                deleted: getDeletedQids(),
              }),
            });
          } catch { /* overlay band — agla poll phir bhej dega */ }

          // Ulta bhi: overlay se question HAT gaya (wahan delete hua) to site
          // se bhi jaana chahiye — warna site par ek aisa question pada rehta
          // jo panel mein hai hi nahi, aur ginti hamesha ke liye khisak jati.
          //
          // Sirf qid wale (yaani overlay se aaye) record hi is niyam mein
          // aate hain — haath se paste kiya hua question overlay jaanta hi
          // nahi, wo kabhi nahi chhua jata. Do aur taale: jawab khali aaya to
          // kuch nahi karte, aur overlay ka sabse bada qid site ke qid se
          // chhota ho (yaani overlay ka data purana/restore hua hai) to bhi
          // haath nahi lagate.
          try {
            const res = await fetch(`${base}/known-qids`, { cache: "no-store" });
            if (res.ok) {
              const qids = (await res.json()).qids || [];
              if (qids.length) {
                const have = new Set(qids);
                const num = (q) => Number(String(q).replace(/^q/, "")) || 0;
                const top = Math.max(...qids.map(num));
                for (const r of getWrongBook("math")) {
                  if (!r.qid || have.has(r.qid)) continue;
                  if (num(r.qid) > top) continue;   // overlay peeche hai — ruko
                  await removeWrong(r.id);
                }
              }
            }
          } catch { /* overlay band — kuch mat karo */ }

          // Overlay ko Supabase ke kaagaz de do — ek baar.
          //
          // Uske baad overlay khud cloud se kram aur ✅ padh leta hai, chahe
          // is PC par site ka tab khula ho ya na ho. Key wahi hai jo yahan
          // pehle se padi hai, aur ja rahi hai sirf 127.0.0.1 par — yaani
          // isi machine par.
          try {
            const st = getSettings();
            if (st.supabaseUrl && st.supabaseAnonKey && st.syncCode) {
              await fetch(`${base}/supabase-config`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  url: st.supabaseUrl, key: st.supabaseAnonKey, code: st.syncCode,
                }),
              });
            }
          } catch { /* purana overlay — ye route nahi hai */ }

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
