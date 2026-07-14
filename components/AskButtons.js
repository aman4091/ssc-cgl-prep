"use client";

import AskElsewhere from "./AskElsewhere";

// Both ask buttons together: the configurable "Copy & Ask" site (Settings) and a
// dedicated Gemini one. Drop this wherever a question is shown.
export default function AskButtons({ q }) {
  return (
    <>
      <AskElsewhere q={q} />
      <AskElsewhere q={q} url="https://gemini.google.com/app" label="✨ Gemini" promptKey="geminiPrompt"
        title="Copy your prompt + question & open Gemini (paste to ask)" />
    </>
  );
}
