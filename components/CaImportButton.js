"use client";

// A "+" on the Current Affairs page: pick a current-affairs PDF, extract the
// questions in it, rewrite each question + answer in HINGLISH (matching how CA
// answers already look), save them as a NEW dated CA entry, and open it.
// Works everywhere — even on a read-only built-in date — because it always
// creates the user's own entry rather than editing the current one.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSettings } from "@/lib/storage";
import { extractPdfTextSmart, caFromText } from "@/lib/client-ai";
import { addEntry, addEntryQuestions } from "@/lib/feed";

export default function CaImportButton({ bucket = "daily" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [err, setErr] = useState("");

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!getSettings().apiKey) { setErr("Pehle Settings mein DeepSeek API key daalo."); return; }

    setBusy(true); setErr(""); setStatus("PDF padh raha hoon…");
    try {
      const { text } = await extractPdfTextSmart(file, (p) => {
        setStatus(
          p.phase === "text"
            ? `PDF padh raha hoon… page ${p.page}/${p.total}`
            : `📷 Scan OCR… page ${p.page}/${p.total}`
        );
      });
      if (!text || text.trim().length < 20) throw new Error("Is PDF se text nahi nikla (shayad scanned/locked hai).");

      setStatus("Questions nikaal raha hoon…");
      const { questions } = await caFromText(text, (phase, done, total) => {
        if (phase === "hinglish") setStatus(`Hinglish bana raha hoon… ${done}/${total}`);
        else setStatus(`AI se nikaal raha hoon… ${done}/${total || "?"}`);
      });
      if (!questions.length) throw new Error("Is PDF mein koi question nahi mila.");

      const title = file.name.replace(/\.pdf$/i, "").slice(0, 80) || "Current Affairs";
      const date = new Date().toISOString().slice(0, 10);
      const entry = addEntry("current", bucket, { date, title });
      addEntryQuestions(entry.id, questions);
      router.push(`/current-affairs/${entry.id}`);
    } catch (e2) {
      setErr(e2.message || "Kuch gadbad ho gayi.");
    } finally {
      setBusy(false); setStatus("");
    }
  };

  return (
    <>
      <label
        className="btn btn--primary btn--sm"
        style={{ opacity: busy ? 0.6 : 1, pointerEvents: busy ? "none" : "auto" }}
        title="Current-affairs PDF import karo (question + answer Hinglish mein)"
      >
        {busy ? "⏳ …" : "➕ PDF import"}
        <input type="file" accept="application/pdf" hidden onChange={onFile} />
      </label>
      {(status || err) && (
        <span style={{ flexBasis: "100%", fontSize: "0.8rem", color: err ? "var(--bad)" : "var(--dim)" }}>
          {err || status}
        </span>
      )}
    </>
  );
}
