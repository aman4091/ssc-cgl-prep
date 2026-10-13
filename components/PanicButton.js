"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import PanicPlayer from "./PanicPlayer";

// 🚨 Har page par — ek tap aur videos shuru (components/PanicPlayer).
// Daayein neeche Vocab Rush / ⬆️ pehle se baithe hain aur baayein neeche resume
// chip, isliye ye daayein thoda upar hai. /panic par khud player hi khula hai.
export default function PanicButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (pathname === "/panic") return null;

  return (
    <>
      {!open && (
        <button className="panic-fab" onClick={() => setOpen(true)} aria-label="Panic button" title="Panic button">
          🚨
        </button>
      )}
      {open && <PanicPlayer onClose={() => setOpen(false)} />}
    </>
  );
}
