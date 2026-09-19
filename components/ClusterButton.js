"use client";

import { useMemo, useState } from "react";
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

// Ek click: answer ka CLUSTER → fact log. Pehle se pada ho to "✓ fact log mein".
export default function ClusterButton({ md, onFlash }) {
  const cl = useMemo(() => clusterOf(md), [md]);
  const [added, setAdded] = useState(() => {
    if (!cl) return false;
    try { const have = new Set(getFacts().map((f) => f.text)); return cl.lines.every((l) => have.has(l)); } catch { return false; }
  });
  if (!cl) return null;
  return (
    <button
      className={"btn btn--sm " + (added ? "btn--ghost" : "btn--primary")}
      style={{ margin: "4px 0 8px" }}
      disabled={added}
      onClick={() => {
        for (const l of cl.lines) addFact({ sec: "gs", topic: cl.topic, text: l });
        setAdded(true);
        onFlash && onFlash(`🧩 ${cl.lines.length} cluster fact log mein — 1/3/7/14 din baad revision`);
      }}
    >
      {added ? "✓ Cluster fact log mein" : `🧩 Cluster → Fact log${cl.lines.length > 1 ? ` (${cl.lines.length})` : ""}`}
    </button>
  );
}
