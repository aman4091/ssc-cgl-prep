"use client";

import { useEffect, useState } from "react";
import { isEnrolled, toggleEnroll } from "@/lib/srs";

// 🔁 "Revise" toggle — daalo/hatao kisi bhi English/GS question, vocab word ya
// current-affairs item ko weak-pool (20x) mein. Bilkul DoneButton jaisa: q-act--keep
// class taaki mobile action-row pe dikhe. Marking = enroll (day0 = aaj, pehli baar
// bhi count), dobara tap = unenroll.
export default function ReviseButton({ item, kind = "q", category = "", subject = "", src = "mark", className = "" }) {
  const [on, setOn] = useState(false);

  useEffect(() => { setOn(isEnrolled(kind, item)); }, [item, kind]);
  useEffect(() => {
    const h = () => setOn(isEnrolled(kind, item));
    window.addEventListener("cgl:srs-changed", h);
    return () => window.removeEventListener("cgl:srs-changed", h);
  }, [item, kind]);

  const toggle = () => setOn(toggleEnroll({ kind, ref: item, src, category, subject }));

  return (
    <button
      className={`btn btn--ghost btn--sm q-act--keep ${className}`}
      onClick={toggle}
      title={on ? "Revision se hatao" : "Revision mein daalo — baar-baar dikhega (exam tak yaad)"}
      style={on ? { color: "var(--accent)", borderColor: "var(--accent)" } : {}}
      aria-pressed={on}
    >
      {on ? "🔁✓" : "🔁"}
    </button>
  );
}
