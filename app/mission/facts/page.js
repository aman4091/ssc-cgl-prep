"use client";

import "@/app/carev.css";
import { useEffect, useRef, useState } from "react";
import { FACT_SECS, factView, getFacts, removeFact } from "@/lib/missionfacts";
import FactSrcBtn from "@/components/FactSrcBtn";
import { clearSession } from "@/lib/recallsession";
import Recall from "@/components/carevision/Recall";
import TrickButtons from "@/components/TrickButtons";
import FactTidyBtn from "@/components/FactTidyBtn";
import { autoTidyFacts } from "@/lib/facttidy";
import FactFolders from "@/components/FactFolders";
import "./folders.css";

// Bade card mein revise (CA Revision wala Recall, khula roop): upar naam,
// neeche uske baare mein — seedha dikhta hai, chhupa nahi. "Kerala dance:
// Kathakali, Mohiniyattam…" — ':' / '—' / '=' / '→' se pehle wala hissa
// naam, baad wala baaki. Alag karne wala na ho to topic naam hai.
// Har baar SAARE facts (naye kram mein). Aata tha -> sirf is round se bahar;
// Nahi aata tha -> isi round mein baar-baar, jab tak "aata tha" na dabe.
// Kuch save nahi hota — agli baar revise karo to sab phir aate hain. (1/3/7/14
// din wala schedule topic folders ke "✓ Aata tha / ✗ Nahi" ka hai, alag.)
const SPLIT = /^(.{3,90}?)\s*(?::|—|–|=|→|\s-\s)\s*([\s\S]{2,})$/;
const FACT_LABELS = { bad: "Nahi aata tha", good: "Aata tha", show: "Dikhao" };

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Card par kya dikhega — padaav ke hisaab se (lib/missionfacts factView):
// D+1 par poora prose, D+3 / D+7 / D+14 par sirf "⚡" wali line aur neeche
// "⌄ poora padho".
function toCard(f) {
  const sec = FACT_SECS.find((x) => x.k === f.sec);
  const v = factView(f);
  // "Naam – baat" ko sar aur jawab mein todna sirf EK line wale fact par.
  // Saaf ki hui shakl (🧹) kai line ki hoti hai — wahan pehli line ka naam
  // sar bana kar baaki facts ko usse alag kar dena galat hai; sar topic hi
  // rehna chahiye.
  const oneLine = String(v.main).trim().indexOf(String.fromCharCode(10)) < 0;
  const m = oneLine ? SPLIT.exec(String(v.main).trim()) : null;
  return {
    id: f.id,
    trigger: m ? m[1] : (f.topic || `${sec?.label || "Fact"} — yaad karo`),
    answer: m ? m[2] : v.main,
    more: v.more,
    extra: null,
    pdfPage: null,
    meta: `${sec?.icon || ""} ${sec?.label || ""}${f.topic ? ` · ${f.topic}` : ""}`,
  };
}

// /mission/facts — GS / CA / English / Maths ka fact log.
//
// Roop: TOPIC FOLDERS (components/FactFolders) — baayen topic, daayen us
// topic ke facts, due wale par ✓ / ✗. Owner ne 15 roop mein se yahi chuna.
// Upar ka lamba parichay aur "Naya fact jodo" ka dabba owner ke kehne par
// hata diye — facts ab notes / PYQ / overlay se hi aate hain. Pehle page
// khulte hi revise card chalta tha; ab folders dikhte hain aur revise card
// upar ke "▶ Revise karo" button se.

export default function MissionFactsPage() {
  const [facts, setFacts] = useState([]);
  const [revising, setRevising] = useState(null);
  // Recall apni qataar andar copy kar leta hai, isliye card ka text badalne
  // par prop se kuch nahi hota — remount karna padta hai. resumeKey ki wajah
  // se wo wahin se uthta hai jahan tha, isliye jhatka nahi lagta.
  const [rev, setRev] = useState(0);

  const load = () => setFacts(getFacts());
  // Fact log kholte hi seedha ▶ Revise (owner) — ek hi baar; band karo to list.
  const autoRev = useRef(false);
  useEffect(() => {
    load();
    if (!autoRev.current) {
      autoRev.current = true;
      const all = getFacts();
      if (all.length) setRevising(shuffle(all).map(toCard));
    }
    // 🧹 Chipke hue facts apne aap saaf — ek-ek karke, peechhe (lib/facttidy).
    autoTidyFacts();
    const on = () => { load(); autoTidyFacts(); };
    window.addEventListener("cgl:mission-changed", on);
    window.addEventListener("cgl:sync-applied", on);
    return () => { window.removeEventListener("cgl:mission-changed", on); window.removeEventListener("cgl:sync-applied", on); };
  }, []);

  if (revising) {
    return (
      <Recall
        key={`facts-${rev}`}
        queue={revising}
        labels={FACT_LABELS}
        open
        loop
        onRate={() => {}}
        tools={(c) => (
          <>
            {/* 🧹 Chipka hua cluster padhne layak — DeepSeek sirf shakl ke
                liye, fact ek bhi nahi badalta. Ek baar, phir save. */}
            <FactTidyBtn
              id={c.id}
              onDone={() => {
                load();
                const now = getFacts();
                setRevising((q) => (q ? q.map((x) => {
                  const f = now.find((y) => y.id === x.id);
                  return f ? toCard(f) : x;
                }) : q));
                setRev((n) => n + 1);
              }}
            />
            <TrickButtons card={c} subject="gs" />
            <FactSrcBtn src={(getFacts().find((f) => f.id === c.id) || {}).src} />
          </>
        )}
        onDelete={(c) => { removeFact(c.id); load(); }}
        resumeKey="facts"
        onExit={() => { setRevising(null); load(); window.scrollTo(0, 0); }}
      />
    );
  }

  return (
    <>
      {/* Sar aur ▶ Revise ab window ke andar — window menu se neeche tak. */}
      <FactFolders
        facts={facts}
        onChange={load}
        headExtra={facts.length > 0 ? (
          <button className="btn btn--primary btn--sm" onClick={() => { clearSession("facts"); setRevising(shuffle(facts).map(toCard)); }}>
            ▶ Revise karo · {facts.length}
          </button>
        ) : null}
      />
    </>
  );
}
