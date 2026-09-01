"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { rememberPath } from "@/lib/backto";

// ↩️ Har page par ek chhoti si parchi: "abhi yahan the".
//
// Layout mein baithta hai, kuch dikhata nahi. Quiz ke parde khud ko yaad nahi
// karate (lib/backto ki SKIP list), isliye quiz kholte waqt parchi par wahi
// jagah likhi rehti hai jahan se quiz shuru hua — aur Exit wahin lauta deta
// hai. Poori kahani lib/backto mein hai.

export default function PathMemo() {
  const path = usePathname();
  useEffect(() => {
    // Query bhi saath — /answers?subject=math se quiz khola to wapas usi
    // chhaanti par lautna chahiye, khaali /answers par nahi. usePathname sirf
    // raasta deta hai, isliye query seedhe location se.
    rememberPath(path + (typeof window === "undefined" ? "" : window.location.search));
  }, [path]);
  return null;
}
