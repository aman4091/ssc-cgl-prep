"use client";

// ⚡ Stylus page ke baayen taraf: is question ki 40-second wali trick.
//
// Trick chhoti hoti hai (DeepSeek se) — utni hi jitni question nipatane ke
// liye chahiye. Poora samjhaane wala answer "📖 Poora answer" ke peeche hai:
// jo Gemini/DeepSeek ka answer pehle se record par hai wahi, aur na ho to
// tabhi naya banta hai.
//
// Aage ke 5 question ki trick peeche se banti rehti hai (lib/quicktrick ka
// prefetch), isliye agle question par pahunchte hi trick pehle se maujood
// hoti hai.

import { useEffect, useState } from "react";
import { getTrick, makeTrick, makeFull, prefetch } from "@/lib/quicktrick";
import Markdown from "./Markdown";

export default function QuickTrick({ rec, list, idx, openByDefault = false }) {
  const [trick, setTrick] = useState("");
  const [full, setFull] = useState("");
  const [showFull, setShowFull] = useState(false);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  // Is question ki trick: bani hui ho to turant, warna abhi bana lo.
  useEffect(() => {
    let dead = false;
    setFull(""); setShowFull(false); setErr("");
    // "👁 Answer hamesha" ON hai to poora answer bhi bina dabaye khule.
    if (openByDefault) setShowFull(true);
    if (!rec) { setTrick(""); return undefined; }
    const have = getTrick(rec.id);
    setTrick(have);
    if (!have) {
      setBusy("trick");
      makeTrick(rec)
        .then((t) => { if (!dead) setTrick(t); })
        .catch((e) => { if (!dead) setErr(e.message); })
        .finally(() => { if (!dead) setBusy(""); });
    }
    // Aur peeche se aage ke 5 taiyar karo.
    prefetch(list, idx);
    return () => { dead = true; };
  }, [rec, list, idx, openByDefault]);

  // Doosre device par bani trick (sync) — aate hi dikh jaye.
  useEffect(() => {
    if (!rec) return undefined;
    const on = () => setTrick((t) => t || getTrick(rec.id));
    window.addEventListener("cgl:trick-ready", on);
    window.addEventListener("cgl:sync-applied", on);
    return () => {
      window.removeEventListener("cgl:trick-ready", on);
      window.removeEventListener("cgl:sync-applied", on);
    };
  }, [rec]);

  useEffect(() => {
    if (!showFull || full || busy === "full" || !rec) return;
    setBusy("full");
    makeFull(rec)
      .then(setFull)
      .catch((e) => setErr(e.message))
      .finally(() => setBusy(""));
  }, [showFull, full, busy, rec]);

  const openFull = () => setShowFull((v) => !v);

  const again = async () => {
    setBusy("trick"); setErr("");
    try { setTrick(await makeTrick(rec, true)); }
    catch (e) { setErr(e.message); }
    finally { setBusy(""); }
  };

  if (!rec) return null;

  return (
    <div className="qtrick">
      <div className="row between" style={{ gap: 8, flexWrap: "nowrap" }}>
        <b className="qtrick__t">⚡ 40-sec trick</b>
        <span className="row" style={{ gap: 6, flexWrap: "nowrap" }}>
          <button className="btn btn--ghost btn--sm" onClick={openFull} disabled={busy === "full"}>
            {busy === "full" ? "⏳" : showFull ? "🙈 Chhupao" : "📖 Poora answer"}
          </button>
          {trick && (
            <button className="btn btn--ghost btn--sm" onClick={again} disabled={!!busy} title="Nayi trick banwao">
              {busy === "trick" ? "⏳" : "🔄"}
            </button>
          )}
        </span>
      </div>

      {busy === "trick" && !trick
        ? <p className="hint" style={{ margin: "6px 0 0" }}>⏳ trick ban rahi hai…</p>
        : trick
          ? <div className="qtrick__body"><Markdown>{trick}</Markdown></div>
          : !err && <p className="hint" style={{ margin: "6px 0 0" }}>Is question ki trick abhi nahi hai.</p>}

      {err && <p style={{ color: "var(--danger)", fontSize: "0.82rem", margin: "6px 0 0" }}>⚠ {err}</p>}

      {showFull && (
        <div className="qtrick__full">
          {busy === "full" && !full
            ? <p className="hint" style={{ margin: 0 }}>⏳ poora answer aa raha hai…</p>
            : full
              ? <Markdown>{full}</Markdown>
              : <p className="hint" style={{ margin: 0 }}>Poora answer nahi mila.</p>}
        </div>
      )}
    </div>
  );
}
