"use client";

import { useEffect, useState } from "react";
import { LOOKS, DEFAULT_LOOK, getLook, setLook } from "@/lib/look";

// 🎨 Roop badlo — upar ki patti mein. Owner options compare kar raha hai,
// isliye har roop ek chunaav ki doori par (lib/look.js). Roop bahut ho gaye
// to buttons ki jagah ek chhota dropdown.
//
// Pehli render DEFAULT maanti hai, asli haal mount ke baad — ThemeToggle jaisi
// hi wajah (server aur client ka HTML ek jaisa rahe).
export default function LookSwitch() {
  const [look, setLookState] = useState(DEFAULT_LOOK);
  useEffect(() => { setLookState(getLook()); }, []);

  return (
    <label className="lookswitch" title="Site ka roop">
      <span className="lookswitch__lbl">🎨 Look</span>
      <select
        className="lookswitch__sel"
        value={look}
        onChange={(e) => setLookState(setLook(e.target.value))}
        aria-label="Site ka roop"
      >
        {LOOKS.map((l) => (
          <option key={l.id} value={l.id}>
            {l.id === "0" ? "Old" : `${l.id} · ${l.name}`}
          </option>
        ))}
      </select>
    </label>
  );
}
