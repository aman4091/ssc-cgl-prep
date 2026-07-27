"use client";

import { useState } from "react";
import { getSettings } from "@/lib/storage";
import { getFile } from "@/lib/filestore";

// ✨ Gemini button for the Revision flashcards.
//
// Text questions/words: normal copy-paste — prompt + question clipboard pe, Gemini
// khulta hai (jaise baaki jagah). Wrong-Book IMAGE questions (jinke answer nahi
// hote): IMAGE khud clipboard pe copy hoti hai taaki Gemini mein paste karke answer
// nikaal sako. CORS/local dono handle: R2 url -> fetch, local blob -> IndexedDB.

const GEMINI = "https://gemini.google.com/app";

function textOf(card) {
  const q = card.ref || {};
  if (card.kind === "vocab") {
    const w = q.word || "", d = q.def || "";
    return `"${w}"${d ? ` (${d})` : ""} — iska matlab, ek easy yaad-rakhne wala trick, example sentence, aur synonyms/antonyms Hinglish mein samjhao.`;
  }
  const clean = (s) => String(s || "").replace(/!\[\]\((<[^>]+>|[^)]+)\)/g, (_, u) => " " + String(u).replace(/^<|>$/g, "") + " ").replace(/\s+/g, " ").trim();
  const opts = (q.options || []).map((o, i) => `${String.fromCharCode(65 + i)}) ${clean(o)}`).join("\n");
  return `${clean(q.question || "")}${opts ? "\n" + opts : ""}`.trim();
}

async function blobFromCard(card) {
  const imgs = Array.isArray(card.ref?.images) ? card.ref.images : [];
  for (const im of imgs) {
    if (im.id) {
      try { const b = await getFile(im.id); if (b) return b; } catch { /* next */ }
      continue;
    }
    if (im.url) {
      // r2.dev sends no CORS header, so a direct fetch fails — go through our own
      // same-origin proxy (/api/r2/image) first, then fall back to direct.
      const tries = [`/api/r2/image?url=${encodeURIComponent(im.url)}`, im.url];
      for (const u of tries) {
        try { const r = await fetch(u); if (r.ok) return await r.blob(); } catch { /* next */ }
      }
    }
  }
  return null;
}

async function toPng(blob) {
  if (blob.type === "image/png") return blob;
  const bmp = await createImageBitmap(blob);
  const cv = document.createElement("canvas");
  cv.width = bmp.width; cv.height = bmp.height;
  cv.getContext("2d").drawImage(bmp, 0, 0);
  const png = await new Promise((res) => cv.toBlob(res, "image/png"));
  return png || blob;
}

const firstUrl = (card) => (card.ref?.images || []).find((i) => i.url)?.url || "";

export default function GeminiFlashButton({ card }) {
  const [flash, setFlash] = useState("");
  const isImg = card.kind === "wb" && Array.isArray(card.ref?.images) && card.ref.images.length > 0;

  const go = async () => {
    if (isImg) {
      let copied = false;
      try {
        // Promise-valued ClipboardItem keeps the user-gesture alive across the
        // async fetch+convert — the reliable way to copy an image in Chrome.
        const item = new ClipboardItem({
          "image/png": (async () => {
            const blob = await blobFromCard(card);
            if (!blob) throw new Error("no image");
            return await toPng(blob);
          })(),
        });
        await navigator.clipboard.write([item]);
        copied = true;
      } catch { copied = false; }
      if (!copied) {
        // CORS blocked / no blob: open the image so you can copy it by hand.
        const url = firstUrl(card);
        if (url) { try { await navigator.clipboard.writeText(url); } catch { /* ignore */ } try { window.open(url, "_blank", "noopener,noreferrer"); } catch { /* ignore */ } }
      }
      setFlash(copied ? "🖼️ Image copied" : "🖼️ Image tab khula");
      try { window.open(GEMINI, "_blank", "noopener,noreferrer"); } catch { /* ignore */ }
    } else {
      const st = getSettings();
      const pre = String(st.geminiPrompt || "").trim();
      const text = (pre ? pre + "\n\n" : "") + textOf(card);
      try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }
      setFlash("📋 Copied");
      try { window.open(GEMINI, "_blank", "noopener,noreferrer"); } catch { /* ignore */ }
    }
    setTimeout(() => setFlash(""), 2000);
  };

  return (
    <button
      className="btn btn--ghost btn--sm"
      onClick={go}
      title={isImg ? "Image copy karke Gemini kholo — wahaan paste karke answer maango" : "Question copy karke Gemini kholo"}
    >
      {flash || "✨ Gemini"}
    </button>
  );
}
