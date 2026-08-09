"use client";

// "+" on the Current Affairs page: pick a current-affairs PDF, extract its
// questions (code-parsed for the standard Q.N/a-d/Correct Answer format, AI
// fallback otherwise), save them as a NEW dated CA entry, and open it.
// Two explicit buttons — Daily / Monthly — so the entry lands in the right tab
// (guessing from the page you happened to be on filed monthlies under daily).

import { useState } from "react";
import { useRouter } from "next/navigation";
import { extractPdfTextSmart, caFromText } from "@/lib/client-ai";
import { addEntry, addEntryQuestions, updateEntry } from "@/lib/feed";

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

// Read the period the PDF is ABOUT from its filename, so a July compilation is
// dated "July 2026" — not the day it happened to be imported.
//   "July Month 2026.pdf"            -> { date: "July 2026",   period: "2026-07" }
//   "10th July Current Affairs 2026" -> { date: "10 July 2026", period: "2026-07-10" } (daily)
function inferMeta(name, bucket) {
  const s = String(name || "").toLowerCase();
  const yr = (s.match(/\b(20\d{2})\b/) || [])[1];
  let mi = MONTHS.findIndex((m) => s.includes(m));
  if (mi < 0) mi = MONTHS.findIndex((m) => new RegExp(`\\b${m.slice(0, 3)}\\b`).test(s));
  if (mi < 0 || !yr) return null;
  const mm = String(mi + 1).padStart(2, "0");
  const monthName = MONTHS[mi][0].toUpperCase() + MONTHS[mi].slice(1);
  if (bucket === "daily") {
    const d = (s.match(/\b([0-3]?\d)(?:st|nd|rd|th)\b/) || s.match(/\b([0-3]?\d)\b(?!\d)/) || [])[1];
    const dn = Number(d);
    if (dn >= 1 && dn <= 31) return { date: `${dn} ${monthName} ${yr}`, period: `${yr}-${mm}-${String(dn).padStart(2, "0")}` };
  }
  return { date: `${monthName} ${yr}`, period: `${yr}-${mm}` };
}

export default function CaImportButton() {
  const router = useRouter();
  const [busy, setBusy] = useState("");   // "" | "daily" | "monthly"
  const [status, setStatus] = useState("");
  const [err, setErr] = useState("");

  const onFile = async (e, bucket) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || busy) return;
    // No upfront key gate: parsing is AI-free; the key only makes answers
    // Hinglish (the page's auto-explainer fills those in progressively).

    setBusy(bucket); setErr(""); setStatus("PDF padh raha hoon…");
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
        if (phase === "ai") setStatus(`AI se nikaal raha hoon… ${done}/${total || "?"}`);
      });
      if (!questions.length) throw new Error("Is PDF mein koi question nahi mila.");

      const title = file.name.replace(/\.pdf$/i, "").slice(0, 80) || "Current Affairs";
      // Date the entry by what the PDF is about (from its name), like the
      // built-in bank does ("July 2026") — import-day only as a last resort.
      const meta = inferMeta(file.name, bucket);
      const entry = addEntry("current", bucket, { date: meta?.date || new Date().toISOString().slice(0, 10), title });
      if (meta?.period) updateEntry(entry.id, { period: meta.period });
      addEntryQuestions(entry.id, questions);
      router.push(`/current-affairs/${entry.id}`);
    } catch (e2) {
      setErr(e2.message || "Kuch gadbad ho gayi.");
    } finally {
      setBusy(""); setStatus("");
    }
  };

  const btn = (bucket, label) => (
    <label
      className={`btn btn--sm ${bucket === "daily" ? "btn--primary" : "btn--ghost"}`}
      style={{ opacity: busy ? 0.6 : 1, pointerEvents: busy ? "none" : "auto" }}
      title={`${bucket === "daily" ? "Daily" : "Monthly"} current-affairs PDF import karo (questions Hinglish answers ke saath)`}
    >
      {busy === bucket ? "⏳ …" : label}
      <input type="file" accept="application/pdf" hidden onChange={(e) => onFile(e, bucket)} />
    </label>
  );

  return (
    <>
      {btn("daily", "➕ Daily PDF")}
      {btn("monthly", "➕ Monthly PDF")}
      {(status || err) && (
        <span style={{ flexBasis: "100%", fontSize: "0.8rem", color: err ? "var(--bad)" : "var(--dim)" }}>
          {err || status}
        </span>
      )}
    </>
  );
}
