"use client";

// Sprint ke dayein taraf ka hissa — jawab.
//
// Do tab: 🐋 DeepSeek (shuru mein yahi khula rehta hai) aur 📖 Asli, yaani
// book ka apna solution/explanation — wo khud daba kar dekhna hota hai.
//
// 📰 Current Affairs is niyam ka apwaad hai (onlyOrig): wahan DeepSeek ko
// bulaya hi nahi jata — uski jaankari purani hai aur naye current affairs par
// wo galat bata sakta hai. Source ka apna jawab hi sahi hai, wahi dikhta hai.

import { useEffect, useState } from "react";
import Markdown from "./Markdown";
import { answerMd } from "@/lib/sprint";

export default function SprintAnswer({ qKey, ds, original, solImg, loading, err, onlyOrig = false }) {
  const [tab, setTab] = useState("ds");
  // Agla question aaya to wapas DeepSeek par — har baar khud badalna padta to
  // 30 second wali daud mein wahi ek kaam reh jata.
  useEffect(() => { setTab("ds"); }, [qKey]);

  const hasOrig = !!(original || solImg);

  if (onlyOrig) {
    return (
      <div className="sp-ans">
        {solImg ? <img src={solImg} alt="solution" className="sp-img" /> : null}
        {original ? <Markdown>{original}</Markdown> : <div className="sp-wait">Is question ke saath jawab nahi aaya.</div>}
      </div>
    );
  }

  return (
    <>
      <div className="sp-tabs">
        <button type="button" className={`sp-tab${tab === "ds" ? " is-on" : ""}`} onClick={() => setTab("ds")}>
          🐋 DeepSeek
        </button>
        <button
          type="button"
          className={`sp-tab${tab === "orig" ? " is-on" : ""}`}
          onClick={() => setTab("orig")}
          disabled={!hasOrig}
          title={hasOrig ? "Book ka apna solution" : "Is question ke saath book ka solution nahi aaya"}
        >
          📖 Asli
        </button>
      </div>

      {tab === "ds" ? (
        ds ? <div className="sp-ans"><Markdown>{answerMd(ds)}</Markdown></div>
        : err ? <div className="sp-wait">⚠️ {err}</div>
        : <div className="sp-wait">{loading ? "🐋 ban raha hai…" : "🐋 line mein hai — thodi der mein aa jayega."}</div>
      ) : (
        <div className="sp-ans">
          {solImg ? <img src={solImg} alt="solution" className="sp-img" /> : null}
          {original ? <Markdown>{original}</Markdown> : null}
          {!solImg && !original ? <div className="sp-wait">Book ka solution is question ke saath nahi hai.</div> : null}
        </div>
      )}
    </>
  );
}
