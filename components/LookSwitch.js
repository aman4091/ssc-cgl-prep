"use client";

import { useEffect, useState } from "react";
import { LOOKS, DEFAULT_LOOK, getLook, setLook } from "@/lib/look";

// 🎨 Roop badlo — upar ki patti mein. Owner options compare kar raha hai,
// isliye har roop ek tap ki doori par (lib/look.js).
//
// Pehli render DEFAULT maanti hai, asli haal mount ke baad — ThemeToggle jaisi
// hi wajah (server aur client ka HTML ek jaisa rahe).
export default function LookSwitch() {
  const [look, setLookState] = useState(DEFAULT_LOOK);
  useEffect(() => { setLookState(getLook()); }, []);

  return (
    <div className="lookswitch" role="group" aria-label="Site ka roop">
      <span className="lookswitch__lbl">Look</span>
      {LOOKS.map((l) => (
        <button
          key={l.id}
          type="button"
          className={`lookswitch__opt ${look === l.id ? "is-on" : ""}`}
          aria-pressed={look === l.id}
          title={l.name}
          onClick={() => setLookState(setLook(l.id))}
        >
          {l.short}
        </button>
      ))}
    </div>
  );
}
