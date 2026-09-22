"use client";

// 🐋 Notes ke har page par: is page ke SSC wale facts, DeepSeek se.
//
// Owner ka tareeka: pehli baar button dabao to page ka poora text prompt ke
// saath DeepSeek ko jata hai; dobara dabao to jo jawab aaya wo popup mein
// khulta hai. Popup ke sabse upar ek button — "🧩 Fact log" — jo saare facts
// (aur CONFUSION wali lines) fact log mein daal deta hai, jahan se 1/3/7/14
// din wala revision khud chalu ho jata hai.
//
// Paisa sirf pehli baar: jawab `cgl.notesfacts` mein bach jata hai, isliye
// wahi page dobara kholne par popup muft mein khulta hai. Naya chahiye to
// popup ka "🔄 naya".

import { useEffect, useState } from "react";
import { notesFacts } from "@/lib/client-ai";
import {
  pageKey, getNotesFacts, saveNotesFacts, parseNotesFacts, factLines,
} from "@/lib/notesfacts";
import { addFact, getFacts } from "@/lib/missionfacts";
import Markdown from "./Markdown";

// Popup ka sar par wala button: saare facts → fact log. Jo line pehle se
// wahan hai wo dobara nahi jati (wahi page dobara kholo to button khud bata
// deta hai ki ja chuke hain).
function ToFactLog({ parsed, sec, onFlash }) {
  const [have, setHave] = useState(() => new Set());

  useEffect(() => {
    const load = () => {
      try { setHave(new Set(getFacts().map((f) => f.text))); }
      catch { setHave(new Set()); }
    };
    load();
    window.addEventListener("cgl:mission-changed", load);
    window.addEventListener("cgl:sync-applied", load);
    return () => {
      window.removeEventListener("cgl:mission-changed", load);
      window.removeEventListener("cgl:sync-applied", load);
    };
  }, []);

  const lines = factLines(parsed);
  if (!lines.length) return null;
  const left = lines.filter((l) => !have.has(l));
  const done = left.length === 0;

  return (
    <button
      className={"btn btn--sm " + (done ? "btn--ghost" : "btn--primary")}
      disabled={done}
      title={done ? "Ye facts pehle hi fact log mein ja chuke hain" : "Har fact alag line, fact log mein"}
      onClick={() => {
        for (const l of left) addFact({ sec, topic: parsed.topic, text: l });
        setHave((h) => new Set([...h, ...left]));
        onFlash && onFlash(`🧩 ${left.length} fact log mein — 1/3/7/14 din baad revision`);
      }}
    >
      {done
        ? `✓ Fact log mein hain (${lines.length})`
        : `🧩 Fact log → ${left.length}${left.length < lines.length ? " baaki" : ""}`}
    </button>
  );
}

export default function NotesFactsBtn({ book, page, text, onFlash }) {
  const key = pageKey(book, page);
  const [saved, setSaved] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => { setSaved(getNotesFacts(key)); }, [key]);

  // Esc se popup band.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const make = async (again) => {
    if (busy) return;
    setBusy(true); setErr("");
    try {
      const d = await notesFacts(String(text || ""), (page && page.topic) || "");
      saveNotesFacts(key, d.text);
      setSaved(d.text);
      if (again) setOpen(true);       // "🔄 naya" — popup khula hi rehta hai
      onFlash && onFlash("🐋 facts ban gaye — button dobara dabao");
    } catch (e) {
      setErr(e.message);
      onFlash && onFlash("⚠ " + e.message);
    } finally { setBusy(false); }
  };

  const parsed = saved ? parseNotesFacts(saved) : null;

  return (
    <>
      <button
        className="nt-gemini"
        disabled={busy}
        onClick={() => (saved ? setOpen(true) : make(false))}
        title={saved
          ? "Is page ke SSC facts dekho (DeepSeek se bane hue)"
          : "Is page ka text DeepSeek ko bhejo — SSC ke kaam ke facts nikalega"}
      >
        {busy ? "⏳" : saved ? "🐋✓" : "🐋"}
      </button>

      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)} style={{ zIndex: 500 }}>
          <div className="modal glass pocket-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pocket-modal__bar">
              <div className="row between" style={{ alignItems: "flex-start", gap: 10 }}>
                <div>
                  <span className="hero__eyebrow">🐋 DeepSeek · SSC facts</span>
                  <h2 style={{ marginTop: 4, fontSize: "1.15rem" }}>
                    {(parsed && parsed.topic) || (page && page.topic) || "Facts"}
                    {page && <span className="muted" style={{ fontSize: "0.8rem", fontWeight: 400 }}> · page {page.book_page}</span>}
                  </h2>
                </div>
                <button className="btn btn--ghost btn--sm" onClick={() => setOpen(false)} title="Band (Esc)">✕</button>
              </div>
              <div className="row mt-12" style={{ gap: 8, flexWrap: "wrap" }}>
                {parsed && <ToFactLog parsed={parsed} sec={(book && book.subject) === "english" ? "english" : "gs"} onFlash={onFlash} />}
                <button className="btn btn--ghost btn--sm" disabled={busy} onClick={() => make(true)}>
                  {busy ? "⏳ ban raha…" : "🔄 naya"}
                </button>
              </div>
              {err && <p style={{ color: "var(--danger)", fontSize: "0.85rem", marginTop: 10 }}>{err}</p>}
            </div>
            <div className="pocket-modal__body">
              {/* Ek fact = ek line. Markdown lagatar lines ko ek hi paragraph
                  bana deta hai, aur tab facts "paragraph ki tarah" dikhte hain
                  — isliye yahan parse karke list banai jati hai. Shakl na mile
                  (DeepSeek ne apni marzi kar di) to jaisa aaya waisa hi. */}
              {parsed && parsed.facts.length ? (
                <>
                  <div className="answer-box">
                    <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8 }}>
                      {parsed.facts.map((f, i) => (
                        <li key={i} style={{ fontSize: "1.02rem", lineHeight: 1.6 }}>
                          {f.star ? "⭐ " : ""}<Markdown inline>{f.text}</Markdown>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {parsed.confusion.length > 0 && (
                    <div className="answer-box mt-8" style={{ borderColor: "var(--warning)" }}>
                      <span className="vd-label" style={{ display: "block", marginBottom: 6 }}>⚠ Confusion</span>
                      <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 6 }}>
                        {parsed.confusion.map((c, i) => (
                          <li key={i} style={{ lineHeight: 1.6 }}><Markdown inline>{c}</Markdown></li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <div className="answer-box"><Markdown>{saved}</Markdown></div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
