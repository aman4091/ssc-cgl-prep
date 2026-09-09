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
  imagesOf, setQid,
} from "@/lib/wrongbook";
import { imageBlob } from "@/lib/imgclip";
import { getDoneMap, markDone } from "@/lib/answersdone";
import { getHardSet } from "@/lib/hardq";
import { countMark } from "@/lib/qcounter";
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
  // Jin paste-kiye question ki image is device par mili hi nahi — inhe
  // dobara-dobara nahi aazmate (neeche adopt wala hissa dekho).
  const badImg = useRef(new Set());

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
          // jata tha. Filter wahi hai jo AnswersBoard lagata hai: subject
          // maths, qid wala record, aur 🔴 Hard nahi.
          try {
            const doneMap = getDoneMap();
            const hardSet = getHardSet();
            const mathBook = getWrongBook("math").filter((r) => r.qid);
            const shown = mathBook.filter((r) => !hardSet.has(r.id));
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
                // Site ke paas jo bhi maths qid hai — 🔴 Hard samet. Overlay
                // ka resend_missing isi se dekhta hai ki kya sach mein site
                // tak pahuncha hi nahi; warna Hard wale question har 5
                // second par dobara-dobara bheje jate.
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

          // Haath se paste kiye hue purane maths question overlay tak pahuncha
          // do — taaki wahan bhi ho jayen.
          //
          // Ye July-August ke wo records hain jo site par seedhe paste hue the,
          // jab site se overlay ki taraf koi raasta tha hi nahi. Inka qid nahi
          // hota, isliye panel inhe dikha hi nahi sakta. Abhi ye sab "ho gaya"
          // hain to neeche pade hain — par list ghoomti hai: ek din inme se
          // koi sabse upar aayega aur us din site ka pehla question panel ke
          // pehle se alag ho jayega. Isliye ek baar inhe wahan bhej dete hain.
          //
          // Ek poll mein sirf teen — 150 question ~4 minute mein chale jaate
          // hain aur na network chokta hai na page. /adopt wahi rid dobara
          // aane par wahi qid lautata hai, isliye adhoora gaya request
          // duplicate nahi banata.
          try {
            const orphans = getWrongBook("math")
              .filter((r) => !r.qid && imagesOf(r).length && !badImg.current.has(r.id))
              .slice(0, 3);
            for (const r of orphans) {
              let blob;
              try { blob = await imageBlob(imagesOf(r)[0]); }
              catch {
                // Image is device par hai hi nahi (R2 se bhi nahi aayi). Ise
                // yaad rakh lo, warna ye pehle number par khadi rehti aur
                // uske peeche wale 148 kabhi apni baari tak pahunchte hi nahi.
                badImg.current.add(r.id);
                continue;
              }
              const buf = new Uint8Array(await blob.arrayBuffer());
              let bin = "";
              for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
              const res = await fetch(`${base}/adopt`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  rid: r.id,
                  answer: r.detail || r.answer || "",
                  image: btoa(bin),
                }),
              });
              if (!res.ok) break;        // purana overlay ya kuch gadbad — ruko
              const { qid } = await res.json();
              if (qid) withSpace(() => setQid(r.id, qid));
            }
          } catch { /* overlay band — agla poll phir koshish karega */ }

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

          // ⏱️ Overlay par 40 second ke andar nipta diya hua question.
          //
          // Pehle iski site par apni alag shelf thi. Ab nahi — wo baaki sabke
          // saath External Mock mein hi rehta hai, bas "ho gaya" ban kar list
          // mein sabse neeche chala jata hai (bilkul waise hi jaise yahan ✅
          // dabane par jata hai). Aur jaise ✅ dabane par aaj ki ginti +1 hoti
          // hai, waise hi overlay par 40 second mein nipta dene par bhi hoti
          // hai — kaam to wahi hua hai.
          //
          // Overlay har solve ki alag KHABAR bhejta hai (/solves), poori
          // solved-list nahi. Wajah: nipta hua question ghoom kar wapas upar
          // aata hai aur DOBARA solve ho sakta hai — list se farak nikalte to
          // dusri baar kuch hota hi nahi, kyunki wo us list mein pehle se
          // hota hai. Ack ke baad khabar hat jati hai, isliye ek solve ek hi
          // baar ginta hai.
          try {
            const res = await fetch(`${base}/solves`, { cache: "no-store" });
            if (res.ok) {
              const { solves } = await res.json();
              for (const qid of Object.keys(solves || {})) {
                const rec = findByQid(qid);
                if (rec) {
                  withSpace(() => markDone(rec.id));
                  countMark(rec.id, rec.subject, true);
                }
                await fetch(`${base}/ack-solve/${qid}`, { method: "POST" });
              }
            }
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
