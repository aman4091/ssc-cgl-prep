"use client";

import { useEffect, useState } from "react";

// Ek chhoti si patti jo `cgl:toast` event par neeche dikh jati hai.
//
// KYUN chahiye: ✨ Gemini do kadam mein chalta hai — pehle image copy, phir tab
// par wapas aane par prompt copy. Doosra kadam tab hota hai jab user kisi aur
// tab se laut raha hota hai, yaani us waqt kisi card ka apna flash dikhane ka
// koi tareeka nahi. Isliye ek jagah, poore app ke liye.
export default function Toast() {
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let timer;
    const on = (e) => {
      setMsg(String(e.detail || ""));
      clearTimeout(timer);
      timer = setTimeout(() => setMsg(""), 5000);
    };
    window.addEventListener("cgl:toast", on);
    return () => { window.removeEventListener("cgl:toast", on); clearTimeout(timer); };
  }, []);

  if (!msg) return null;
  return (
    <div
      role="status"
      onClick={() => setMsg("")}
      style={{
        position: "fixed", left: "50%", bottom: 18, transform: "translateX(-50%)",
        zIndex: 9999, maxWidth: "min(92vw, 520px)", cursor: "pointer",
        background: "var(--card)", color: "var(--text-1)",
        border: "1px solid var(--glass-border)", borderRadius: "var(--radius)",
        padding: "10px 16px", fontSize: 14, lineHeight: 1.4, textAlign: "center",
        boxShadow: "0 6px 24px rgba(0,0,0,.35)",
      }}
    >
      {msg}
    </div>
  );
}
