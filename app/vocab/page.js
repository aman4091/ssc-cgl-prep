"use client";

// 🔤 Vocab — COVER METHOD (components/VocabLayouts, roop "11"): word aur
// matlab ki table, ek column dhaka; row dabao to khule.
//
// Din wale words (OWS / Idiom / Vocab) aur khud pakde hue New Words ek saath
// (lib/vocabpool). Upar type ki chhaanti (OWS / Idiom / Vocab / New — "Sab" hataya).
// Owner ne 15 tareekon mein se Cover method final kiya — baaki tareeke aur
// pehle wala Jodi milao (components/VocabMatch) backup mein hain (backup/README.md).
//
// Purana wala page (import, din, quiz) /vocab/manage par hai.

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { vocabPool } from "@/lib/vocabpool";
import { storeGet, storeSet } from "@/lib/bigstore";
import { hashStr } from "@/lib/syncitems";
import { SlideRow } from "@/components/OneLinerLayouts";
import { getHindiMap, hindiOf, getEnMap, enOf, ensureHindi } from "@/lib/vocabhindi";
import "./layouts15.css";
import "./layouts.css";
import "@/app/notes/paste/layouts.css";

// 🎞️ FINAL (owner): Fact log jaisi SLIDES — OWS / Idiom / Vocab / New sab
// mila-jula, RANDOM kram (ek baar bana, phir pakka; jahan chhoda wahin se). Ek slide = ek word: matlab +
// (jhanda nahi — Windows par 🇮🇳 "IN" dikhta tha)
// Hindi (DeepSeek, peechhe — lib/vocabhindi; New ka chhota English bhi).
// Cover method (VocabLayouts "11") code mein pada hai.
const TYPE_LABEL = { ows: "🔤 OWS", idiom: "💬 Idiom", vocab: "📖 Vocab", new: "📋 New" };
const plainLine = (s) => String(s || "").replace(/\*\*|__|`/g, "").split("\n").map((x) => x.trim()).find(Boolean) || "";

// Random jaisa kram — par PAKKA, har device par ek (owner: "har refresh par naye nahi —
// number same, fix"). Naye word aakhir mein (unka apna random), hate hue
// nikal jaate hain. Kahan tak pahunche — cgl.vocab.slideat, wahin se shuru.
//
// Kram { ids: "id1\nid2…" } — EK lambi line mein (lib/bigstore, IndexedDB).
// Pehle ye ["id1","id2",…] list thi: sync list ke har tukde ko alag jodta
// hai aur KRAM nahi rakhta — refresh / sync ke baad sab ulat-pulat ho jata
// tha (owner: "pehle jo 1st tha, refresh ke baad koi aur").
// hashStr milte-julte naam (Word001, Word002) ko paas-paas rakhta hai — upar
// se murmur ka "fmix" chala kar achha bikhra hua (random jaisa) number.
function mixOf(id) {
  let h = parseInt(hashStr(`vocab-slides|${id}`), 36) >>> 0;
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}
const SORDER = "cgl.vocab.slideord";
const OLD_SORDER = "cgl.vocab.slideorder";
const SAT = "cgl.vocab.slideat";
function readOrder() {
  try { const v = JSON.parse(storeGet(SORDER) || "null"); if (v && typeof v.ids === "string") return v.ids ? v.ids.split("\n") : []; } catch { /* ignore */ }
  return null;
}
function slideOrder(pool) {
  let saved = readOrder();
  if (!saved) {
    // Purani (bigdi hui, har device ki alag) list nahi uthate — har device
    // naye pakke kram se shuru kare. Bas jagah khali karo.
    saved = [];
    try { localStorage.removeItem(OLD_SORDER); } catch { /* ignore */ }
  }
  const byId = new Map(pool.map((p) => [p.id, p]));
  const kept = saved.filter((id) => byId.has(id));
  const seen = new Set(kept);
  // Naye word ka kram bhi PAKKA — word ke naam ke hash se. Har device (phone /
  // laptop) bina sync ke bhi BILKUL wahi kram banata hai, to number har jagah
  // ek (owner: "mobile mein padhu to kram badal jayega").
  const fresh = pool.filter((p) => !seen.has(p.id)).map((p) => p.id).sort((x, y) => mixOf(x) - mixOf(y) || (x < y ? -1 : 1));
  const order = [...kept, ...fresh];
  if (fresh.length || kept.length !== saved.length || !readOrder()) {
    try { storeSet(SORDER, JSON.stringify({ ids: order.join("\n") })); } catch { /* quota */ }
  }
  return order.map((id) => byId.get(id));
}
const readAt = () => { try { return Math.max(0, Number(localStorage.getItem(SAT)) || 0); } catch { return 0; } };

function VocabSlides({ pool }) {
  const list = useMemo(() => slideOrder(pool), [pool]);
  const [start] = useState(readAt);
  const [hi, setHi] = useState(() => getHindiMap());
  const [en, setEn] = useState(() => getEnMap());
  useEffect(() => {
    const on = () => { setHi(getHindiMap()); setEn(getEnMap()); };
    window.addEventListener("cgl:vocab-hindi", on);
    window.addEventListener("cgl:sync-applied", on);
    return () => { window.removeEventListener("cgl:vocab-hindi", on); window.removeEventListener("cgl:sync-applied", on); };
  }, []);
  // Saamne wali slide se aage ke 20 tak ka Hindi (aur New ka English). Aage
  // badhte ho to bas naya EK judta hai — jo ban chuke wo dobara nahi maangte.
  const onAt = useCallback((at) => {
    try { localStorage.setItem(SAT, String(at)); } catch { /* ignore */ }
    ensureHindi(list.slice(at, at + 21).map((p) => ({ word: p.word, def: p.def || p.meaning || "", en: p.type === "new" })));
  }, [list]);
  const secs = list.map((p) => {
    const mean = p.type === "new" ? (enOf(en, p.word) || plainLine(p.mine || p.meaning)) : plainLine(p.def || p.meaning);
    const h = hindiOf(hi, p.word);
    return {
      key: p.id, kind: "topic", title: p.word,
      points: [{ text: mean || "⏳", star: false }, { text: h || "⏳", star: false }],
      meta: TYPE_LABEL[p.type] || "",
    };
  });
  return <SlideRow secs={secs} onAt={onAt} start={start} empty="Abhi koi word nahi." />;
}

export default function VocabPage() {
  const [pool, setPool] = useState(null);
  useEffect(() => {
    const load = () => setPool(vocabPool());
    load();
    window.addEventListener("cgl:sync-applied", load);
    return () => window.removeEventListener("cgl:sync-applied", load);
  }, []);

  if (!pool) return null;

  return (
    <>
      <section className="section vocab-top">
        <div className="row between" style={{ gap: 10, flexWrap: "wrap" }}>
          <span className="ca-eyebrow">🔤 Vocab · {pool.length} word · Slides (random)</span>
          <Link href="/vocab/manage" className="btn btn--sm btn--ghost">⚙️ Import / din</Link>
        </div>
      </section>

      {!pool.length ? (
        <div className="placeholder">
          Abhi koi word nahi. <Link href="/vocab/manage" className="link">Import karo</Link>.
        </div>
      ) : (
        <VocabSlides pool={pool} />
      )}
    </>
  );
}
