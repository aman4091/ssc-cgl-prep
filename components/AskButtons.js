"use client";

import AskElsewhere from "./AskElsewhere";
import { keyFor } from "@/lib/qstats";

// Just Gemini now. The configurable "Copy & Ask" site sat beside it and was the
// same gesture twice; pressing this one copies the prompt, opens Gemini, and
// opens the paste box for this question (PasteAnswer listens for
// cgl:gemini-asked) so the reply has somewhere to land.
export default function AskButtons({ q }) {
  const openPaste = () => {
    try { window.dispatchEvent(new CustomEvent("cgl:gemini-asked", { detail: { key: keyFor(q) } })); }
    catch { /* ignore */ }
  };
  return (
    <AskElsewhere
      q={q}
      url="https://gemini.google.com/app"
      label="✨ Gemini"
      promptKey="geminiPrompt"
      title="Prompt + question copy karke Gemini kholo, phir answer paste karo"
      onAsked={openPaste}
    />
  );
}
