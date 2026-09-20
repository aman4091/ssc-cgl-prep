"use client";

// 🪄 "Iski trick bana do" — fact log aur Zaroori baatein ke card par.
//
// Do raaste, wahi jo baaki har card par hain:
//   ✨ <AI site>  — trick wala prompt + ye fact clipboard par, site khulti
//                   hai, aur paste ka dabba apne aap khul jata hai
//   🐋 DeepSeek   — seedha apni API se, mode "explain" (Gemini API kabhi nahi)
//
// Trick card ke saath bach jati hai (lib/tricks), isliye agli baar wahi card
// aaye to trick pehle se neeche padi hoti hai — dobara mangwane ki zaroorat
// nahi. Paste ki hui trick upar, DeepSeek wali uske baad.

import { useEffect, useState } from "react";
import { getSettings } from "@/lib/storage";
import { aiSiteUrl, aiSiteLabel } from "@/lib/aisites";
import { useDeepSeek, dsLabel, dsTitle } from "@/lib/usedeepseek";
import { getTrick, saveTrick, clearTrick, trickPromptFor, tidyTrick } from "@/lib/tricks";
import Markdown from "./Markdown";

export default function TrickButtons({ card, subject = "gs" }) {
  const id = card?.id;
  const text = [card?.trigger, card?.answer].filter(Boolean).join(" — ");
  const [mine, setMine] = useState("");
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");

  // DeepSeek ko wahi shakl chahiye jis se uska store chalta hai.
  const q = { question: `trick: ${text}`, options: [], answer: null };
  const dsq = useDeepSeek(q, subject, () => trickPromptFor(text));

  useEffect(() => {
    setMine(id ? getTrick(id) : "");
    setOpen(false);
    setDraft("");
  }, [id]);

  if (!id) return null;
  const site = getSettings().askAiSite;
  const trick = mine || dsq.ds || "";

  const ask = async (e) => {
    e.stopPropagation();
    try { await navigator.clipboard.writeText(trickPromptFor(text)); } catch { /* ignore */ }
    setDraft(mine || "");
    setOpen(true);
    try { window.open(aiSiteUrl(site), "_blank", "noopener,noreferrer"); } catch { /* ignore */ }
  };
  const save = () => {
    const t = draft.trim();
    if (!t) return;
    saveTrick(id, t);
    setMine(t);
    setOpen(false);
    setDraft("");
  };

  return (
    <div className="carev-trick" onClick={(e) => e.stopPropagation()}>
      <div className="carev-trick-acts">
        <button className="btn btn--sm btn--ghost" onClick={ask} title={`Trick ka prompt + ye fact copy karke ${aiSiteLabel(site)} kholo`}>
          ✨ {aiSiteLabel(site)}
        </button>
        <button className="btn btn--sm btn--ghost" onClick={(e) => { e.stopPropagation(); dsq.ask(); }} disabled={dsq.loading} title={dsTitle(dsq)}>
          {dsLabel(dsq)}
        </button>
        {trick && (
          <button
            className="btn btn--sm btn--ghost"
            title="Trick hatao"
            onClick={() => { clearTrick(id); setMine(""); if (dsq.ds) dsq.regen(); }}
          >🗑️ trick</button>
        )}
      </div>

      {trick ? (
        <div className="carev-trick-box">
          <div className="carev-trick-src">🪄 {mine ? "trick (tumhari)" : "trick · 🐋 DeepSeek"}</div>
          <Markdown>{tidyTrick(trick)}</Markdown>
        </div>
      ) : null}

      {dsq.err && <p className="carev-error">{dsq.err}</p>}

      {open && (
        <div className="answer-box mt-8">
          <span className="vd-label">🪄 Trick yahan paste karo</span>
          <textarea
            className="textarea input"
            rows={4}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="AI se copy ki hui trick…"
          />
          <div className="row mt-8" style={{ gap: 8 }}>
            <button className="btn btn--primary btn--sm" onClick={save} disabled={!draft.trim()}>💾 Save</button>
            <button className="btn btn--ghost btn--sm" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
