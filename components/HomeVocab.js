"use client";

// Homepage Vocab item — deliberately minimal (the user asked for a full-page,
// only-what-matters view): ONE word at a time, full width, no left word-list and
// NO auto-fetched meaning/trick/synonyms. You see the word, press ✨ Gemini (the
// same vocab prompt as before), paste the answer back, Save. Prev/Next move
// through the day. Pasted meanings live in their OWN store (cgl.vocab.mine) so
// the old DeepSeek meanings/tricks never leak back in.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getDayTypeItems, buildTypeQuiz, typeIcon, typeLabel, getMine, setMine } from "@/lib/vocab";
import { saveQuiz } from "@/lib/storage";
import { copyText } from "@/lib/notesrender";
import Markdown from "@/components/Markdown";

export default function HomeVocab({ day, type }) {
  const router = useRouter();
  const dayNum = parseInt(day);
  const [items, setItems] = useState([]);
  const [idx, setIdx] = useState(0);
  const [paste, setPaste] = useState("");
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [, setTick] = useState(0);

  useEffect(() => { setItems(getDayTypeItems(dayNum, type)); setIdx(0); }, [dayNum, type]);
  // New word → collapse the paste box and clear the draft.
  useEffect(() => { setPaste(""); setEditing(false); }, [idx]);

  const item = items[idx] || null;
  const meaning = item ? getMine(item.word) : "";

  const go = (d) => { const n = idx + d; if (n >= 0 && n < items.length) setIdx(n); };

  // Swipe the card left→next / right→prev. Only a clearly horizontal, clearly
  // long drag counts, so scrolling a long meaning never flicks the word.
  const touch = useRef(null);
  const onTouchStart = (e) => { const t = e.touches[0]; touch.current = { x: t.clientX, y: t.clientY }; };
  const onTouchEnd = (e) => {
    const start = touch.current; touch.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x, dy = t.clientY - start.y;
    if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    go(dx < 0 ? 1 : -1);
  };

  const askGemini = async () => {
    if (!item) return;
    const label = typeLabel(type);
    const base = `Is ${label} ko aasaan Hinglish mein detail se samjhao. Kuch example sentences bhi do jisme ye sahi tarah use hua ho. Aur aisa tarika ya trick batao ki ye hamesha ke liye yaad rah jaaye:`;
    const body = item.def ? `${item.word} — ${item.def}` : item.word;
    await copyText(`${base}\n\n${body}`);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
    try { window.open("https://gemini.google.com/app", "_blank", "noopener,noreferrer"); } catch { /* ignore */ }
  };

  const savePaste = () => {
    const t = String(paste || "").trim();
    if (!t || !item) return;
    try { setMine(item.word, t); } catch { /* quota — non-critical */ }
    setPaste(""); setEditing(false); setTick((n) => n + 1);
  };

  const startQuiz = () => {
    const quiz = buildTypeQuiz(dayNum, type, "day");
    if (!quiz.questions.length) return;
    saveQuiz(quiz);
    router.push(`/quizzes/${quiz.id}`);
  };

  if (!items.length) {
    return (
      <section className="section">
        <div className="home-head"><h1>Aage kya</h1></div>
        <p className="muted">Is type ke words nahi hain.</p>
        <Link href="/vocab" className="btn btn--primary mt-16">🔤 Vocab kholo</Link>
      </section>
    );
  }

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">{typeIcon(type)} Day {dayNum} · {typeLabel(type)}</span>
          <button className="btn btn--primary btn--sm" onClick={startQuiz}>🎯 Quiz · Day {dayNum}</button>
        </div>
      </section>

      <section className="section">
        <div className="glass-card" style={{ padding: 20 }} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <div className="row between" style={{ alignItems: "baseline" }}>
            <h1 className="grad" style={{ fontSize: "clamp(1.8rem, 6vw, 2.6rem)" }}>{item.word}</h1>
            <span className="muted" style={{ fontSize: "0.85rem" }}>{idx + 1}/{items.length}</span>
          </div>
          {item.def && <p className="muted mt-8" style={{ fontStyle: "italic" }}>{item.def}</p>}

          {meaning && !editing ? (
            // Saved meaning → render the Markdown nicely (### / ** / --- format,
            // no raw # symbols) and hide the paste box until you press Edit.
            <div className="mt-16">
              <span className="vd-label">Meaning</span>
              <div className="nx-hi-text"><Markdown>{meaning}</Markdown></div>
              <div className="row mt-8">
                <button className="btn btn--ghost btn--sm" onClick={() => { setPaste(meaning); setEditing(true); }}>
                  ✏️ Edit / dobara paste
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-16">
              <button className="btn btn--ghost btn--sm" onClick={askGemini} title="Is word ke liye Gemini kholo (prompt + word copy ho jayega)">
                {copied ? "✓ Copied" : "✨ Gemini"}
              </button>
              <textarea
                className="input mt-8"
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
                placeholder="✨ Gemini dabao, wahan se jawab yahan paste karo…"
                style={{ minHeight: 120 }}
              />
              <div className="row mt-8" style={{ justifyContent: "flex-end", gap: 8 }}>
                {meaning && (
                  <button className="btn btn--ghost btn--sm" onClick={() => { setEditing(false); setPaste(""); }}>Cancel</button>
                )}
                <button className="btn btn--primary btn--sm" onClick={savePaste} disabled={!paste.trim()}>💾 Save meaning</button>
              </div>
            </div>
          )}

          {/* Sticky so Prev/Next stay reachable while scrolling a long meaning. */}
          <div
            className="row between"
            style={{
              position: "sticky", bottom: 8, zIndex: 5, gap: 8,
              marginTop: 24, marginLeft: -20, marginRight: -20,
              padding: "10px 20px 4px",
              background: "var(--card)",
              borderTop: "1px solid var(--glass-border)",
            }}
          >
            <button className="btn btn--ghost" onClick={() => go(-1)} disabled={idx === 0}>← Prev</button>
            <button className="btn btn--ghost" onClick={() => go(1)} disabled={idx === items.length - 1}>Next →</button>
          </div>
        </div>
      </section>
    </>
  );
}
