"use client";

import { useEffect, useMemo, useState } from "react";
import { addFact, getFacts } from "@/lib/missionfacts";

// 🧩 GS answer ka CLUSTER section (lib/answerprompts / overlay ai_prompts) —
// "poora group ek line mein". Us line(s) ko nikaalo taaki ek click mein CGL
// Mission ke fact log mein chali jaye (wahan se 1/3/7/14 din baad revision).
// Dono shakl chalti hain: v1 ("## 🧩 CLUSTER (…)" ke baad "## 📌 …") aur v2
// ("🧩 CLUSTER" bina ## ke, uske baad "🎯 SSC EXTRA" / "📝 ONE-LINER").
const NEXT_SECTION = /^[#*\s]*(?:🎯|📝|✅|📌|🔍|📚|🧠)/m;
function clusterOf(md) {
  const s = String(md || "");
  const h = /^[#*\s]*🧩\s*\**\s*CLUSTER[^\n]*\n/m.exec(s);
  if (!h) return null;
  const rest = s.slice(h.index + h[0].length);
  const nx = NEXT_SECTION.exec(rest);
  const body = nx ? rest.slice(0, nx.index) : rest;
  const raw = body.split("\n").filter((l) => /·/.test(l));
  const lines = raw
    .map((l) => l.replace(/\*\*/g, "").replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").trim())
    .filter(Boolean);
  if (!lines.length) return null;
  // Topic: "**Topic:**" line (v1) → warna pehli line ka bold label (v2:
  // "**Label** – facts") → warna ":" se pehle ka hissa.
  const label = (/\*\*([^*]+?)\*\*/.exec(raw[0]) || [])[1];
  const topic = (/\*\*Topic:\*\*\s*([^\n]+)/.exec(s) || [])[1] || label || (lines[0].split(/:| – /)[0] || "");
  return { lines, topic: topic.replace(/\*\*|:$/g, "").trim().slice(0, 60) };
}

export { clusterOf };

// Ek click: answer ka CLUSTER → fact log.
//
// Ja chuka hai ya nahi, ye har baar naye sire se dekha jata hai — wahi
// question dobara saamne aaye (PYQ drill mein aata hi hai) to button khud
// bata deta hai ki ye cluster pehle hi fact log mein chala gaya tha. Fact
// log badalte hi (yahan se, ya doosre device se sync hokar) line badal
// jati hai.
export default function ClusterButton({ md, onFlash }) {
  const cl = useMemo(() => clusterOf(md), [md]);
  const [have, setHave] = useState(() => new Set());

  useEffect(() => {
    const load = () => {
      try { setHave(new Set(getFacts().map((f) => f.text))); }
      catch { setHave(new Set()); }
    };
    load();
    window.addEventListener("cgl:mission-changed", load);
    window.addEventListener("cgl:sync-applied", load);
    return () => {
      window.removeEventListener("cgl:mission-changed", load);
      window.removeEventListener("cgl:sync-applied", load);
    };
  }, []);

  if (!cl) return null;
  // Sirf wahi line jodni hai jo pehle se nahi hai — warna ek hi cluster do
  // baar fact log mein chadh jata.
  const left = cl.lines.filter((l) => !have.has(l));
  const done = left.length === 0;

  return (
    <button
      className={"btn btn--sm " + (done ? "btn--ghost" : "btn--primary")}
      style={{ margin: "4px 0 8px" }}
      disabled={done}
      title={done ? "Ye cluster pehle hi fact log mein ja chuka hai" : "Cluster ki har line fact log mein"}
      onClick={() => {
        for (const l of left) addFact({ sec: "gs", topic: cl.topic, text: l });
        setHave((h) => new Set([...h, ...left]));
        onFlash && onFlash(`🧩 ${left.length} cluster fact log mein — 1/3/7/14 din baad revision`);
      }}
    >
      {done
        ? `✓ Cluster fact log mein hai${cl.lines.length > 1 ? ` (${cl.lines.length})` : ""}`
        : `🧩 Cluster → Fact log${left.length > 1 ? ` (${left.length})` : ""}${left.length < cl.lines.length ? " — baaki" : ""}`}
    </button>
  );
}
