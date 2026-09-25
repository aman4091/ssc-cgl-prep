"use client";

import { useEffect, useState } from "react";
import { formatFact } from "@/lib/client-ai";
import { getFacts, setFactFmt, clearFactFmt } from "@/lib/missionfacts";

// 🧹 "Saaf karo" — fact log ka chipka hua cluster padhne layak banao.
//
// Cluster kabhi-kabhi ek hi paragraph mein aa jata hai — revision card par
// wo 6-7 lakeeron ka deewar ban jata hai aur aankh usme se kuch nahi utha
// pati. Ye button use DeepSeek se SIRF shakl ke liye bhejta hai
// (app/api/format-fact): har fact apni line par, shuru mein uska naam.
// Fact ek bhi nahi badalta — prompt mein wahi ek kaam likha hai.
//
// Paise ka hisaab: call SIRF is button se jati hai, aur ek cluster par sirf
// EK BAAR — jawab fact ke saath save ho jata hai (fmt). Dobara kholne par
// wahi saved shakl dikhti hai. "↩ asli" se hata bhi sakte ho.
// Jo pehle se theek hai use bhejna hi nahi — ek chhoti ya pehle se
// line-dar-line entry par button aata hi nahi, to uska paisa bhi nahi lagta.
function needsTidy(f) {
  const t = String((f && f.text) || "").trim();
  if (!t || t.length < 140) return false;                       // chhota hai, padh lo
  if (t.indexOf(String.fromCharCode(10)) >= 0) return false;    // pehle se alag lines
  return true;                                                  // ek chipka hua paragraph
}

export default function FactTidyBtn({ id, onDone }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [has, setHas] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!id) return;
    try {
      const f = getFacts().find((x) => x.id === id) || {};
      setHas(!!f.fmt);
      setShow(!!f.fmt || needsTidy(f));
    } catch { setHas(false); setShow(false); }
  }, [id]);

  if (!id || !show) return null;

  const go = async () => {
    if (busy) return;
    setBusy(true); setErr("");
    try {
      const f = getFacts().find((x) => x.id === id);
      if (!f) throw new Error("Ye fact mila hi nahi.");
      const { text } = await formatFact(f.text || "");
      setFactFmt(id, text);
      setHas(true);
      onDone && onDone();
    } catch (e) {
      setErr(String(e.message || e).slice(0, 120));
    } finally {
      setBusy(false);
    }
  };

  const undo = () => { clearFactFmt(id); setHas(false); onDone && onDone(); };

  return (
    <>
      <button
        className="btn btn--ghost btn--sm"
        onClick={has ? undo : go}
        disabled={busy}
        title={has
          ? "Wapas wahi shakl jo AI ne di thi"
          : "DeepSeek se sirf shakl sudhrwao — har fact apni line par. Fact koi nahi badlega."}
      >
        {busy ? "…" : has ? "↩ asli" : "🧹 Saaf karo"}
      </button>
      {err && <span className="hint" style={{ color: "var(--danger)" }}>{err}</span>}
    </>
  );
}
