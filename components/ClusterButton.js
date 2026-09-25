"use client";

import { useEffect, useMemo, useState } from "react";
import { addFact, getFacts } from "@/lib/missionfacts";
import { clustersOf, factOf, clusterKey } from "@/lib/clusterparse";

// 🧩 GS answer ke CLUSTER → fact log.
//
// Naya GS prompt ek jawab mein KAI cluster deta hai, har ek do hisson ka:
// naam + prose (seekhne ke liye) + "⚡" line (revision ke liye). Isliye ab
// har cluster ka APNA button hai — pehle ek hi button tha jo sab ek saath
// (aur ek hi entry mein) thons deta tha. Do se zyada hon to upar "sab" ka
// ek button bhi, par tab bhi har cluster ALAG entry banta hai.
//
// Purane format ke saved answers bhi chalte hain (lib/clusterparse dono
// padhta hai) — wahan prose hota hi nahi tha, sirf ⚡ jaisi ek line.

export default function ClusterButton({ md, onFlash }) {
  const list = useMemo(() => clustersOf(md), [md]);
  const [have, setHave] = useState(() => new Set());

  useEffect(() => {
    const load = () => {
      try {
        // Ja chuka hai ya nahi — har baar naye sire se. Wahi question dobara
        // saamne aaye (drill mein aata hi hai) to button khud bata deta hai.
        setHave(new Set(getFacts().map((f) => clusterKey({ title: f.topic, zap: f.zap, prose: f.text }))));
      } catch { setHave(new Set()); }
    };
    load();
    window.addEventListener("cgl:mission-changed", load);
    window.addEventListener("cgl:sync-applied", load);
    return () => {
      window.removeEventListener("cgl:mission-changed", load);
      window.removeEventListener("cgl:sync-applied", load);
    };
  }, []);

  if (!list.length) return null;

  const add = (arr) => {
    const fresh = arr.filter((c) => !have.has(clusterKey(c)));
    if (!fresh.length) return;
    for (const c of fresh) addFact(factOf(c));
    setHave((h) => new Set([...h, ...fresh.map(clusterKey)]));
    onFlash && onFlash(
      fresh.length === 1
        ? `🧩 "${fresh[0].title || "cluster"}" fact log mein — D+1, 3, 7, 14 par wapas`
        : `🧩 ${fresh.length} cluster fact log mein — har ek apni alag entry`,
    );
  };

  const left = list.filter((c) => !have.has(clusterKey(c)));

  return (
    <div className="clbtns">
      {list.length > 1 && (
        <button
          className={"btn btn--sm " + (left.length ? "btn--primary" : "btn--ghost")}
          disabled={!left.length}
          title={left.length ? "Saare cluster fact log mein — har ek alag entry" : "Saare cluster pehle hi ja chuke hain"}
          onClick={() => add(list)}
        >
          {left.length ? `🧩 Saare ${left.length} cluster → Fact log` : `✓ Saare ${list.length} cluster fact log mein`}
        </button>
      )}
      {list.map((c, i) => {
        const done = have.has(clusterKey(c));
        const name = (c.title || `Cluster ${i + 1}`).slice(0, 34);
        return (
          <button
            key={clusterKey(c) + i}
            className={"btn btn--sm " + (done ? "btn--ghost" : list.length > 1 ? "" : "btn--primary")}
            disabled={done}
            title={done ? "Ye cluster pehle hi fact log mein hai" : `"${c.title}" fact log mein daalo`}
            onClick={() => add([c])}
          >
            {done ? `✓ ${name}` : `🧩 ${name} → Fact log`}
          </button>
        );
      })}
    </div>
  );
}
