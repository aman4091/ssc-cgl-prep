"use client";

// Ek word ka card — fact log jaisa: upar word, neeche uska matlab, khula hua.
// "Socho phir tap karo" nahi (owner ka niyam): padho, aur neeche wale do
// button se batao aata tha ya nahi.
//
// Upar wahi do button jo baaki har card par hain:
//   ✨ <AI site>  — prompt + word copy, site khulti hai, aur paste ka dabba
//                   apne aap khul jata hai (paste kiya matlab cgl.vocab.mine
//                   mein — wahi jagah jahan se /new-words padhta hai)
//   🐋 DeepSeek   — seedha apni API se matlab, apne store mein (lib/dsanswers)
//
// Kaunsa matlab dikhega, wahi kram jo question card par hai:
//   tumhara apna (paste kiya hua) > 🐋 DeepSeek > word ki apni angrezi def.

import { useEffect, useState } from "react";
import { getMine, setMine } from "@/lib/vocab";
import { getSettings } from "@/lib/storage";
import { aiSiteUrl, aiSiteLabel } from "@/lib/aisites";
import { useDeepSeek, dsLabel, dsTitle } from "@/lib/usedeepseek";
import Markdown from "./Markdown";

const PROMPT = "Is word/idiom ko aasaan Hinglish mein detail se samjhao. "
  + "Kuch example sentences bhi do jisme ye sahi tarah use hua ho. "
  + "Aur aisa tarika ya trick batao ki ye hamesha ke liye yaad rah jaaye:";

export default function VocabCard({ item }) {
  const [mine, setMineState] = useState("");
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  // DeepSeek ko wahi shakl chahiye jis se baaki store chalte hain.
  const q = { question: item?.word || "", options: [], answer: null };
  const dsq = useDeepSeek(q, "english", () => `${PROMPT} ${item?.word || ""}`);

  useEffect(() => {
    setMineState(item ? getMine(item.word) : "");
    setOpen(false);
    setText("");
  }, [item?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!item) return null;
  const dsUp = dsq.shown && dsq.ds;
  const meaning = dsUp ? dsq.ds : (mine || dsq.ds || item.meaning || "");
  const src = dsUp ? "🐋 DeepSeek" : mine ? "✨ paste kiya hua" : dsq.ds ? "🐋 DeepSeek" : "";
  const site = getSettings().askAiSite;

  const ask = async () => {
    try { await navigator.clipboard.writeText(`${PROMPT} ${item.word}`); } catch { /* ignore */ }
    setText(mine || "");
    setOpen(true);
    try { window.open(aiSiteUrl(site), "_blank", "noopener,noreferrer"); } catch { /* ignore */ }
  };
  const save = () => {
    const t = text.trim();
    if (!t) return;
    setMine(item.word, t);
    setMineState(t);
    setOpen(false);
    setText("");
  };

  return (
    <article className="vcard">
      <div className="vcard__top">
        <span className="vcard__meta">{item.icon} {item.label}</span>
        <span className="vcard__hacts">
          <button className="btn btn--sm btn--ghost" onClick={ask} title={`Word copy karke ${aiSiteLabel(site)} kholo, phir matlab paste karo`}>
            ✨ {aiSiteLabel(site)}
          </button>
          <button className="btn btn--sm btn--ghost" onClick={dsq.ask} disabled={dsq.loading} title={dsTitle(dsq)}>
            {dsLabel(dsq)}
          </button>
        </span>
      </div>

      <h2 className="vcard__word">{item.word}</h2>

      {meaning ? (
        <div className="vcard__mean">
          {src && <div className="qcard__ansrc">{src}</div>}
          <Markdown>{meaning}</Markdown>
        </div>
      ) : (
        <div className="vcard__mean vcard__mean--empty">
          Is word ka matlab abhi nahi hai — ✨ ya 🐋 se laa lo.
        </div>
      )}

      {dsq.err && <p style={{ color: "var(--danger)", fontSize: "0.85rem", marginTop: 8 }}>{dsq.err}</p>}

      {open && (
        <div className="answer-box mt-8">
          <span className="vd-label">📥 Matlab yahan paste karo</span>
          <textarea
            className="textarea input"
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="AI se copy kiya hua matlab…"
          />
          <div className="row mt-8" style={{ gap: 8 }}>
            <button className="btn btn--primary btn--sm" onClick={save} disabled={!text.trim()}>💾 Save</button>
            <button className="btn btn--ghost btn--sm" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
    </article>
  );
}
