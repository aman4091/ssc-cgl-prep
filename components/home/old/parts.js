"use client";

// Chhote saajhe tukde — sab homepage roop inhe istemal karte hain.

import Link from "next/link";
import PlanPractice from "@/components/PlanPractice";
import { splitTitle, secOf } from "./useMissionHome";

// ▶ Shuru — block ka apna practice (auto) ho to wahi, warna uska link.
export function Go({ b, label }) {
  if (!b) return null;
  if (b.auto && b.auto.n) return <PlanPractice auto={b.auto} title={b.t} />;
  if (b.href) return <Link href={b.href} className="btn btn--primary btn--sm">{label || b.hrefLabel || "▶ Kholo"}</Link>;
  return null;
}

export function Tick({ ok, onClick, big }) {
  return (
    <button type="button" className={`hx-tick${ok ? " is-on" : ""}${big ? " hx-tick--big" : ""}`} onClick={onClick} aria-label={ok ? "Undo" : "Ho gaya"}>
      {ok ? "✓" : ""}
    </button>
  );
}

// Aaj ke teen subject — plan ke g / m / e topic.
export function subjectsOf(d) {
  const p = d.plan || {};
  const find = (id) => d.tl.find((b) => b.id === id);
  return [
    p.g && { k: "gs", icon: "🌍", label: "GS", t: p.g.t, b: find("gs1"), c: "#2f9e6e" },
    p.m && { k: "maths", icon: "🧮", label: "Maths", t: p.m.t, b: find("math"), c: "#3b6cff" },
    p.e && { k: "english", icon: "📘", label: "English", t: p.e.t, b: find("eng"), c: "#a855f7" },
  ].filter(Boolean);
}

export function BlockName({ b }) {
  const [name, topic] = splitTitle(b);
  return (
    <>
      <span className="hx-bname">{name}</span>
      {topic ? <span className="hx-btopic">{topic}</span> : null}
    </>
  );
}

export { splitTitle, secOf };
