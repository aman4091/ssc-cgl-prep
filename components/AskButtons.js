"use client";

import AskElsewhere from "./AskElsewhere";
import { keyFor } from "@/lib/qstats";

// Both ask buttons together: the configurable "Copy & Ask" site (Settings) and a
// dedicated Gemini one. Pressing Gemini also opens the paste-answer box for this
// question (PasteAnswer listens for cgl:gemini-asked) so you can paste the reply.
export default function AskButtons({ q }) {
  const openPaste = () => {
    try { window.dispatchEvent(new CustomEvent("cgl:gemini-asked", { detail: { key: keyFor(q) } })); }
    catch { /* ignore */ }
  };
  return (
    <>
      <AskElsewhere q={q} />
      <AskElsewhere q={q} url="https://gemini.google.com/app" label="✨ Gemini" promptKey="geminiPrompt"
        title="Copy your prompt + question & open Gemini, phir answer paste karo" onAsked={openPaste} />
    </>
  );
}
