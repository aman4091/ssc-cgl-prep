"use client";

// New Words — user ke apne pakde hue words (overlay ka 📋 button + WordPopup
// ka "Add this word"). HomeVocab jaisa hi card: ek word full-width, uski
// pasted Gemini meaning (cgl.vocab.mine), Prev/Next. Naya word sabse pehle.
// Overlay se meaning VocabFeeder ke through aati hai — 5s refresh usse page
// khula hone par bhi utha leta hai.

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getNewWordEntries, newWordDayKey, newWordDayLabel, getOws, getMine, setMine,
  removeNewWord, renameNewWord,
} from "@/lib/vocab";
import { copyText } from "@/lib/notesrender";
import { startChapterQuiz } from "@/lib/notesquiz";
import Markdown from "@/components/Markdown";

// useSearchParams (sidebar ?w= sync) ko Suspense boundary chahiye, warna
// pura page static rendering se opt-out ho jata hai.
export default function NewWordsPage() {
  return (
    <Suspense fallback={null}>
      <NewWordsInner />
    </Suspense>
  );
}

function NewWordsInner() {
  const [entries, setEntries] = useState([]);
  const [idx, setIdx] = useState(0);
  const [paste, setPaste] = useState("");
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [, setTick] = useState(0);
  const [defs, setDefs] = useState({});

  const refresh = () => {
    setEntries([...getNewWordEntries()].reverse()); // naya word sabse aage
    const map = {};
    for (const it of getOws()) map[String(it.word).toLowerCase()] = it.def || "";
    setDefs(map);
  };
  useEffect(() => {
    refresh();
    const id = setInterval(() => { refresh(); setTick((n) => n + 1); }, 5000);
    return () => clearInterval(id);
  }, []);
  // Word ka apna edit (rename) mode.
  const [renaming, setRenaming] = useState(false);
  const [renameText, setRenameText] = useState("");

  // New word -> collapse the paste box, clear the draft, rename band.
  useEffect(() => { setPaste(""); setEditing(false); setRenaming(false); }, [idx]);

  // Left sidebar (Navbar) se jodta hai: ?day= us din ke words, ?w= wahi card.
  const router = useRouter();
  const sp = useSearchParams();
  const sel = sp.get("w");
  const dayParam = sp.get("day");
  const words = useMemo(() => {
    const list = dayParam
      ? entries.filter((e) => newWordDayKey(e.at) === dayParam)
      : entries;
    return list.map((e) => e.w);
  }, [entries, dayParam]);
  useEffect(() => {
    if (!sel || !words.length) return;
    const i = words.findIndex((w) => String(w).toLowerCase() === sel.toLowerCase());
    if (i >= 0 && i !== idx) setIdx(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel, words]);
  // Date badli to pehle word se shuru.
  useEffect(() => { setIdx(0); }, [dayParam]);
  // Prev/Next se badla to URL bhi saath (day preserve) — sidebar highlight sahi rahe.
  useEffect(() => {
    const w = words[idx];
    if (!w || sel === w) return;
    // Pehli load (koi w chuna nahi, pehla card) par URL mat chhedo — w judte
    // hi phone ka drawer band ho jata hai, jabki user abhi date ke words ki
    // list dekh raha hota hai. Sidebar bina w ke bhi pehla word highlight
    // karta hai.
    if (!sel && idx === 0) return;
    const dayBit = dayParam ? `day=${encodeURIComponent(dayParam)}&` : "";
    router.replace(`/new-words?${dayBit}w=${encodeURIComponent(w)}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, words]);

  const word = words[idx] || null;
  const def = word ? defs[String(word).toLowerCase()] || "" : "";
  const meaning = word ? getMine(word) : "";
  const curAt = word ? (entries.find((e) => e.w === word) || {}).at : "";

  const go = (d) => { const n = idx + d; if (n >= 0 && n < words.length) setIdx(n); };

  // 🗑️ word hatao (meaning samet) — confirm ke baad.
  const delWord = () => {
    if (!word) return;
    if (!confirm(`"${word}" ko New Words se hata dein? Iski saved meaning bhi hat jayegi.`)) return;
    removeNewWord(word);
    setIdx((i) => Math.max(0, Math.min(i, words.length - 2)));
    refresh();
  };
  // ✏️ word ka naam/spelling badlo — meaning naye naam par chali jati hai.
  const saveRename = () => {
    const t = renameText.trim();
    if (!t || !word || t === word) { setRenaming(false); return; }
    renameNewWord(word, t);
    setRenaming(false);
    refresh();
    const dayBit = dayParam ? `day=${encodeURIComponent(dayParam)}&` : "";
    router.replace(`/new-words?${dayBit}w=${encodeURIComponent(t)}`, { scroll: false });
  };

  // Swipe left→next / right→prev (HomeVocab jaisa hi).
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
    if (!word) return;
    const base = "Is word/idiom ko aasaan Hinglish mein detail se samjhao. Kuch example sentences bhi do jisme ye sahi tarah use hua ho. Aur aisa tarika ya trick batao ki ye hamesha ke liye yaad rah jaaye:";
    const body = def ? `${word} — ${def}` : word;
    await copyText(`${base}\n\n${body}`);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
    try { window.open("https://gemini.google.com/app", "_blank", "noopener,noreferrer"); } catch { /* ignore */ }
  };

  const savePaste = () => {
    const t = String(paste || "").trim();
    if (!t || !word) return;
    try { setMine(word, t); } catch { /* quota — non-critical */ }
    setPaste(""); setEditing(false); setTick((n) => n + 1);
  };

  // 📝 Quiz — jo view khula hai usi ke words se (ek date chuni hai to us date
  // ke, warna saare). Har word ka blob (word + def + pasted meaning) notes-quiz
  // engine mein jata hai, jo 50 questions SAB words par spread karta hai. Nayi
  // date apne aap cover — button hamesha current view par chalta hai.
  const [quizBusy, setQuizBusy] = useState(false);
  const [quizErr, setQuizErr] = useState("");
  const makeQuiz = async () => {
    if (quizBusy) return;
    const list = dayParam ? entries.filter((e) => newWordDayKey(e.at) === dayParam) : entries;
    const texts = list
      .map((e) => {
        const d = defs[String(e.w).toLowerCase()] || "";
        const m = getMine(e.w) || "";
        return [`Word: ${e.w}`, d, m].filter(Boolean).join("\n");
      })
      .filter((t) => t.length >= 30); // bina meaning wale word se question nahi ban sakta
    if (!texts.length) {
      setQuizErr("Pehle in words ki meaning paste karo — tabhi quiz banega.");
      setTimeout(() => setQuizErr(""), 3000);
      return;
    }
    setQuizBusy(true); setQuizErr("");
    try {
      const label = dayParam ? (dayParam === "old" ? "Purane words" : newWordDayLabel(curAt)) : "Saare words";
      const { quizId } = await startChapterQuiz({
        texts,
        pk: `newwords#${dayParam || "all"}`,
        title: `New Words · ${label} quiz`,
      });
      router.push(`/quizzes/${quizId}`);
    } catch (e) {
      setQuizErr(e.message === "nahi bana" ? "Quiz nahi bana — dobara try karo." : (e.message || "Error"));
      setQuizBusy(false);
      setTimeout(() => setQuizErr(""), 3000);
    }
  };

  if (!words.length) {
    return (
      <section className="section">
        <div className="home-head"><h1>🆕 New Words</h1></div>
        <p className="muted">
          Abhi koi word nahi. Overlay ka 📋 Word button dabao (word copy karke),
          ya kisi word popup mein &quot;Add this word&quot; karo — wo yahan aa jayega.
        </p>
      </section>
    );
  }

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between" style={{ alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span className="hero__eyebrow">
            🆕 New Words · {words.length}
            {dayParam && ` · 📅 ${dayParam === "old" ? "Purane words" : newWordDayLabel(curAt)}`}
          </span>
          <span className="row" style={{ gap: 6, alignItems: "center" }}>
            {quizErr && <span className="nt-meta" style={{ color: "var(--accent)" }}>{quizErr}</span>}
            <button
              className="btn btn--primary btn--sm"
              onClick={makeQuiz}
              disabled={quizBusy}
              title={dayParam ? "Is date ke words se quiz banao" : "Saare new words se quiz banao"}
            >
              {quizBusy ? "…" : "📝 Quiz"}
            </button>
          </span>
        </div>
      </section>

      <section className="section">
        <div className="glass-card" style={{ padding: 20 }} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <div className="row between" style={{ alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            {renaming ? (
              <div className="row" style={{ gap: 6, flex: 1, minWidth: 220 }}>
                <input
                  className="input"
                  value={renameText}
                  onChange={(e) => setRenameText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveRename()}
                  autoFocus
                  style={{ flex: 1 }}
                />
                <button className="btn btn--primary btn--sm" onClick={saveRename}>💾</button>
                <button className="btn btn--ghost btn--sm" onClick={() => setRenaming(false)}>✕</button>
              </div>
            ) : (
              <h1 className="grad" style={{ fontSize: "clamp(1.8rem, 6vw, 2.6rem)" }}>{word}</h1>
            )}
            <span className="row" style={{ gap: 6, alignItems: "center" }}>
              <span className="muted" style={{ fontSize: "0.85rem" }}>
                {curAt ? `📅 ${newWordDayLabel(curAt)} · ` : ""}{idx + 1}/{words.length}
              </span>
              <button
                className="btn btn--ghost btn--sm"
                title="Word ka naam/spelling badlo"
                onClick={() => { setRenameText(word); setRenaming(true); }}
              >
                ✏️
              </button>
              <button className="btn btn--ghost btn--sm" title="Word delete karo" onClick={delWord}>
                🗑️
              </button>
            </span>
          </div>
          {def && <p className="muted mt-8" style={{ fontStyle: "italic" }}>{def}</p>}

          {meaning && !editing ? (
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
            <button className="btn btn--ghost" onClick={() => go(1)} disabled={idx === words.length - 1}>Next →</button>
          </div>
        </div>
      </section>
    </>
  );
}
