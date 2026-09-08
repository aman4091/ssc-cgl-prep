"use client";

import AskElsewhere from "./AskElsewhere";
import { keyFor } from "@/lib/qstats";
import { getSettings } from "@/lib/storage";
import { aiSiteUrl, aiSiteLabel } from "@/lib/aisites";

// Pehle sirf Gemini tha. Ab Settings mein chuni hui koi bhi AI site khulti hai
// (lib/aisites.js) — button ka kaam wahi hai: prompt + question copy karke
// site kholo, phir jawab paste karo. "Copy & Ask" alag button hai (koi bhi
// URL, %s se pre-fill), ye wala hamesha ek pura chat-site kholta hai.
export default function AskButtons({ q, subject }) {
  const site = getSettings().askAiSite;
  const openPaste = () => {
    try { window.dispatchEvent(new CustomEvent("cgl:gemini-asked", { detail: { key: keyFor(q) } })); }
    catch { /* ignore */ }
  };
  return (
    <AskElsewhere
      q={q}
      subject={subject}
      url={aiSiteUrl(site)}
      label={`✨ ${aiSiteLabel(site)}`}
      promptKey="geminiPrompt"
      title={`Prompt + question copy karke ${aiSiteLabel(site)} kholo, phir answer paste karo`}
      onAsked={openPaste}
    />
  );
}
