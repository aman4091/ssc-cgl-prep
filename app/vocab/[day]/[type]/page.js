"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getDayTypeItems, getDetail, setDetail, clearDetail, buildTypeQuiz,
  typeIcon, typeLabel, isBookmarked, toggleBookmark,
  setEntryType, moveAllType, TYPES,
} from "@/lib/vocab";
import { saveQuiz } from "@/lib/storage";
import { vocabDetail } from "@/lib/client-ai";
import { getStatByParts } from "@/lib/qstats";
import WordPopup from "@/components/WordPopup";

// same question text buildMcq uses, so counts line up with what was attempted
function vocabCount(it) {
  const qText = it.def || `One word for: ${it.word}`;
  const st = getStatByParts(qText, it.word);
  return st ? st.attempts : 0;
}

export default function VocabTypePage() {
  const { day, type } = useParams();
  const router = useRouter();
  const dayNum = parseInt(day);
  const [items, setItems] = useState([]);
  const [sel, setSel] = useState(null);
  const [detail, setDet] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [bm, setBm] = useState(false);
  const [popup, setPopup] = useState(null);

  useEffect(() => { setItems(getDayTypeItems(dayNum, type)); }, [dayNum, type]);

  // force = ignore the cache and ask the AI again (the 🔄 button), for when a
  // word came back with a blank//wrong meaning.
  const openWord = async (idx, force = false) => {
    setSel(idx); setError(""); setDet(null);
    const list = getDayTypeItems(dayNum, type);
    const w = list[idx];
    if (!w) return;
    setBm(isBookmarked(w.word));
    if (force) clearDetail(w.word);
    else {
      const cached = getDetail(w.word);
      if (cached) { setDet(cached); return; }
    }
    setLoading(true);
    try {
      const d = await vocabDetail(w.word, w.def);
      if (String(d?.meaning || "").trim()) { setDetail(w.word, d); setDet(d); }
      else setError("Meaning nahi aaya — 🔄 dabaa ke dobara try karo.");
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const go = (delta) => {
    const next = sel + delta;
    if (next >= 0 && next < items.length) openWord(next);
  };
  const toggleBm = () => { const on = toggleBookmark(items[sel].word); setBm(on); };

  // Keyboard ↑/↓ moves the selection up/down the left word list.
  useEffect(() => {
    const onKey = (e) => {
      if (!items.length) return;
      const tag = (e.target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = Math.min(items.length - 1, (sel === null ? -1 : sel) + 1);
        if (next !== sel) openWord(next);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const next = Math.max(0, (sel === null ? items.length : sel) - 1);
        if (next !== sel) openWord(next);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel, items]);

  // Keep the highlighted word visible while navigating with the keyboard.
  useEffect(() => {
    if (sel === null) return;
    document.querySelector(".vocab-list .vocab-item.is-active")?.scrollIntoView({ block: "nearest" });
  }, [sel]);

  // Reclassify the current word to another type. It leaves this filtered view,
  // so refresh the list and keep a sensible selection.
  const moveCurrent = (toType) => {
    if (item === null || toType === type) return;
    setEntryType(item.word, toType);
    const next = getDayTypeItems(dayNum, type);
    setItems(next);
    if (next.length === 0) { setSel(null); setDet(null); }
    else {
      const ni = Math.min(sel, next.length - 1);
      setSel(ni); setDet(getDetail(next[ni].word));
      setBm(isBookmarked(next[ni].word));
    }
  };

  // Bulk: move EVERY word of this type into another type.
  const moveAll = (toType) => {
    if (toType === type || items.length === 0) return;
    if (!confirm(`Move all ${items.length} "${typeLabel(type)}" words to "${typeLabel(toType)}"?\n(Every "${typeLabel(type)}" entry across your data will be moved.)`)) return;
    moveAllType(type, toType);
    const next = getDayTypeItems(dayNum, type);
    setItems(next); setSel(null); setDet(null);
  };

  const startQuiz = (scope) => {
    const quiz = buildTypeQuiz(dayNum, type, scope);
    if (quiz.questions.length < 1) { setError("No words of this type."); return; }
    saveQuiz(quiz);
    router.push(`/quizzes/${quiz.id}`);
  };

  const item = sel !== null ? items[sel] : null;

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">{typeIcon(type)} Day {dayNum} · {typeLabel(type)}</span>
          <Link href={`/vocab/${dayNum}`} className="btn btn--ghost btn--sm">← Day {dayNum}</Link>
        </div>
        <div className="row between mt-8">
          <h1 className="hero__title" style={{ fontSize: "clamp(1.5rem, 4vw, 2.2rem)" }}>
            {typeLabel(type)} <span className="grad">· {items.length}</span>
          </h1>
          <div className="row" style={{ gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <button className="btn btn--primary" onClick={() => startQuiz("day")}>🎯 Quiz · Day {dayNum} only</button>
            {dayNum > 1 && (
              <button className="btn btn--ghost" onClick={() => startQuiz("cum")}>🎯 Quiz · Day 1–{dayNum}</button>
            )}
          </div>
        </div>
        {items.length > 0 && (
          <div className="row mt-16" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span className="muted" style={{ fontSize: "0.82rem" }}>Wrong category? Move all {typeLabel(type)} words →</span>
            {TYPES.filter((t) => t.key !== type).map((t) => (
              <button key={t.key} className="btn btn--ghost btn--sm" onClick={() => moveAll(t.key)}>
                {t.icon} → {t.label}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="section" style={{ marginTop: 12 }}>
        <div className="vocab-layout">
          {/* Word list */}
          <div className="glass-card vocab-list">
            {items.length === 0 ? (
              <p className="muted">No words of this type.</p>
            ) : (
              items.map((it, i) => (
                <button key={i} className={`vocab-item ${sel === i ? "is-active" : ""}`} onClick={() => openWord(i)}>
                  <span className="vocab-item__word">
                    {isBookmarked(it.word) && <span style={{ color: "var(--warning)" }}>★ </span>}
                    {it.word}
                    {vocabCount(it) > 0 && <span className="done-badge" title={`attempted ${vocabCount(it)} times`}>🔁 {vocabCount(it)}</span>}
                  </span>
                  <span className="vocab-item__def">{it.def}</span>
                </button>
              ))
            )}
          </div>

          {/* Detail (inline on desktop, pop-up modal on mobile) */}
          <div className={`glass-card vocab-detail ${item !== null ? "is-open" : ""}`}>
            {item === null ? (
              <p className="muted center" style={{ padding: "40px 0" }}>Click any word — meaning, trick and synonyms will show up. 👈</p>
            ) : (
              <>
                <div className="row between vocab-detail__head">
                  <h2 className="grad" style={{ fontSize: "1.6rem" }}>{item.word}</h2>
                  <div className="row" style={{ gap: 8 }}>
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={() => openWord(sel, true)}
                      disabled={loading}
                      title="Meaning dobara laao (AI se fresh)"
                      aria-label="Reload meaning"
                    >
                      {loading ? "⏳" : "🔄"}
                    </button>
                    <button className="btn btn--ghost btn--sm" onClick={toggleBm} title="Bookmark">
                      {bm ? "★ Saved" : "☆ Bookmark"}
                    </button>
                    <span className="muted" style={{ fontSize: "0.8rem" }}>{sel + 1}/{items.length}</span>
                    <button className="btn btn--ghost btn--sm vocab-detail__close" onClick={() => { setSel(null); setDet(null); }} title="Close" aria-label="Close">✕</button>
                  </div>
                </div>
                <div className="vocab-detail__body">
                <p className="muted mt-8" style={{ fontStyle: "italic" }}>{item.def}</p>

                <div className="row mt-8" style={{ gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  <span className="muted" style={{ fontSize: "0.78rem" }}>Move to:</span>
                  {TYPES.filter((t) => t.key !== type).map((t) => (
                    <button key={t.key} className="btn btn--ghost btn--sm" onClick={() => moveCurrent(t.key)}>
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>

                {loading && <p className="mt-16" style={{ color: "var(--accent-2)" }}>Loading meaning, trick, synonyms…</p>}
                {error && <p className="mt-16" style={{ color: "var(--danger)" }}>{error}</p>}

                {detail && !loading && (
                  <div className="mt-16" style={{ display: "grid", gap: 14 }}>
                    <div><span className="vd-label">Meaning</span><p>{detail.meaning}</p></div>
                    {detail.trick && <div><span className="vd-label">💡 Memory trick</span><p>{detail.trick}</p></div>}
                    {detail.example && <div><span className="vd-label">Example</span><p style={{ fontStyle: "italic" }}>{detail.example}</p></div>}
                    {detail.synonyms?.length > 0 && (
                      <div><span className="vd-label">Synonyms (click for detail)</span>
                        <div className="chips">{detail.synonyms.map((s, i) => (
                          <button key={i} className="chip chip--syn chip--lg chip--btn" onClick={() => setPopup(s)}>{s}</button>
                        ))}</div>
                      </div>
                    )}
                    {detail.antonyms?.length > 0 && (
                      <div><span className="vd-label">Antonyms (click for detail)</span>
                        <div className="chips">{detail.antonyms.map((s, i) => (
                          <button key={i} className="chip chip--ant chip--lg chip--btn" onClick={() => setPopup(s)}>{s}</button>
                        ))}</div>
                      </div>
                    )}
                  </div>
                )}
                </div>

                <div className="row between mt-24 vocab-detail__nav">
                  <button className="btn btn--ghost" onClick={() => go(-1)} disabled={sel === 0}>← Prev</button>
                  <button className="btn btn--ghost" onClick={() => go(1)} disabled={sel === items.length - 1}>Next →</button>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Mobile-only backdrop behind the pop-up word detail */}
      {item !== null && <div className="vocab-detail__backdrop" onClick={() => { setSel(null); setDet(null); }} />}

      <WordPopup word={popup} onClose={() => setPopup(null)} />
    </>
  );
}
