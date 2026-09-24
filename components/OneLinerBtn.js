"use client";

import AskElsewhere from "./AskElsewhere";
import { getSettings } from "@/lib/storage";
import { aiSiteUrl, aiSiteLabel } from "@/lib/aisites";
import { ONELINER_PROMPT } from "@/lib/onelinerprompt";
import { overlayBase } from "@/lib/overlaylink";

// 📝 One-liner — kisi bhi PYQ card se.
//
// ✨ wala button sawaal ka POORA jawab maangta hai; ye wahi sawaal ek line
// mein maangta hai (wahi prompt jo PC overlay ke 📝 button par hai). Dabate hi:
// prompt + sawaal clipboard par, AI site khul jati hai.
//
// Wapas aane ka raasta overlay ka hai — uska 📝 switch ON ho to tum jo line
// copy karoge wo /oneliners ki list mein chali jati hai. Isliye dabate waqt
// overlay ko is card ka SUBJECT bhi bata dete hain (/site-here), warna line
// galat khaane (GS) mein chali jati hai. Overlay band ho to fetch chupchaap
// fail ho jata hai — button phir bhi kaam karta hai, bas line khud paste
// karni padegi.
const SUBS = { math: "math", maths: "math", reasoning: "reasoning", english: "english", gs: "gs" };

export default function OneLinerBtn({ q, subject }) {
  const site = getSettings().askAiSite;
  const tellOverlay = () => {
    const sub = SUBS[String(subject || "").toLowerCase()] || "gs";
    (async () => {
      try {
        const base = await overlayBase();
        if (!base) return;
        await fetch(`${base}/site-here`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject: sub }),
        });
      } catch { /* overlay band hai — koi baat nahi */ }
    })();
  };
  return (
    <AskElsewhere
      q={q}
      subject={subject}
      className="btn btn--sm q-act--keep"
      url={aiSiteUrl(site)}
      label="📝"
      prompt={ONELINER_PROMPT}
      title={`One-liner ka prompt + question copy karke ${aiSiteLabel(site)} kholo. Jo ek line aaye use copy karo — overlay ka 📝 ON ho to wo /oneliners mein chali jayegi.`}
      onAsked={tellOverlay}
    />
  );
}
