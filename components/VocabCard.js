"use client";

// Ek word ka card — fact log jaisa: upar word, neeche uska matlab, khula hua.
// "Socho phir tap karo" nahi (owner ka niyam): padho, aur neeche wale do
// button se batao aata tha ya nahi.
//
// Matlab na ho to ✨ wala button wahi prompt+word copy karke AI site kholta
// hai, aur paste kiya hua matlab usi word par (cgl.vocab.mine) bach jata hai
// — wahi jagah jahan se /new-words bhi padhta hai.

import { useEffect, useState } from "react";
import { getMine, setMine } from "@/lib/vocab";
import { getSettings } from "@/lib/storage";
import { aiSiteUrl, aiSiteLabel } from "@/lib/aisites";
import Markdown from "./Markdown";

const PROMPT = "Is word/idiom ko aasaan Hinglish mein detail se samjhao. "
  + "Kuch example sentences bhi do jisme ye sahi tarah use hua ho. "
  + "Aur aisa tarika ya trick batao ki ye hamesha ke liye yaad rah jaaye:";

export default function VocabCard({ item }) {
  const [mine, setMineState] = useState("");
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  useEffect(() => {
    setMineState(item ? getMine(item.word) : "");
    setOpen(false);
    setText("");
  }, [item?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!item) return null;
  const meaning = mine || item.meaning || "";
  const site = getSettings().askAiSite;

  const ask = async () => {
    try { await navigator.clipboard.writeText(`${PROMPT} ${item.word}`); } catch { /* ignore */ }
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
      <div className="vcard__meta">{item.icon} {item.label}</div>
      <h2 className="vcard__word">{item.word}</h2>

      {meaning ? (
        <div className="vcard__mean"><Markdown>{meaning}</Markdown></div>
      ) : (
        <div className="vcard__mean vcard__mean--empty">
          Is word ka matlab abhi nahi hai — ✨ se laa kar paste kar do.
        </div>
      )}

      <div className="vcard__acts">
        <button className="btn btn--sm btn--ghost" onClick={ask} title={`Word copy karke ${aiSiteLabel(site)} kholo`}>
          ✨ {aiSiteLabel(site)}
        </button>
        <button className="btn btn--sm btn--ghost" onClick={() => { setOpen((v) => !v); setText(mine || ""); }}>
          {meaning ? "✏️ Matlab badlo" : "📥 Matlab paste karo"}
        </button>
      </div>

      {open && (
        <div className="answer-box mt-8">
          <textarea
            className="textarea input"
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Yahan matlab paste karo…"
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
