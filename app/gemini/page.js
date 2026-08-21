"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getGeminiQs, removeGeminiQ } from "@/lib/geminiq";
import Markdown from "@/components/Markdown";
import PyqQuestionCard from "@/components/PyqQuestionCard";
import MathQuestionCard from "@/components/MathQuestionCard";
import ReasonQuestionCard from "@/components/ReasonQuestionCard";

// ✨ Gemini Answers — jin question ka answer maine khud Gemini se laa kar
// quiz ke andar paste kiya, wo sab yahan.
//
// Kuch daalne ki jagah ye page NAHI hai. Daalna wahin hota hai jahan question
// milta hai — quiz/PYQ card ka ✨ Gemini wala paste-box. Wahan save dabate hi
// question apne aap yahan aa jata hai (lib/geminiq). Ye page padhne ki jagah
// hai: ek hi chhat ke neeche har wo sawaal jiska jawab tumne khud khoja tha.
//
// Har subject — Maths, Reasoning, English, GS, Current Affairs.
//
// Shakl Answers/Slow page wali hi (.ansp): kinare numbered rail, upar stats,
// chips, phir cards. Rang aur layout app/exam.css ke .ansp rules se, isliye
// yahan apna koi CSS nahi.
//
// Question apne ASLI card mein khulta hai — `kind` isi ke liye sambhala jata
// hai. Maths/Reasoning ka sawaal tasveer mein hota hai; use aam text card mein
// kholne se sirf "[id] qText" dikhta aur asli sawaal gayab rehta.

const SUBJECTS = [
  { key: "", label: "📚 Sab" },
  { key: "math", label: "🧮 Maths" },
  { key: "reasoning", label: "🧠 Reasoning" },
  { key: "english", label: "📘 English" },
  { key: "gs", label: "🌍 GS" },
];
const KNOWN = new Set(["math", "reasoning", "english", "gs"]);
const bucketOf = (r) => (KNOWN.has(r.subject) ? r.subject : "other");
const labelOf = (k) => SUBJECTS.find((s) => s.key === k)?.label || "📝 Other";

const dayLabel = (iso) => {
  const d = new Date(iso || "");
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
};

export default function GeminiPage() {
  const [all, setAll] = useState([]);
  const [ready, setReady] = useState(false);
  const [subject, setSubject] = useState("");
  const [q, setQ] = useState("");

  // Naya sabse upar — lib/geminiq pehle hi usi kram mein rakhta hai (dobara
  // paste karo to wahi record upar aa jata hai), isliye yahan dobara chhantne
  // ki zaroorat nahi.
  const refresh = () => { setAll(getGeminiQs()); setReady(true); };
  useEffect(() => {
    refresh();
    const h = () => refresh();
    window.addEventListener("cgl:geminiq-changed", h);
    return () => window.removeEventListener("cgl:geminiq-changed", h);
  }, []);

  const counts = useMemo(() => {
    const c = {};
    for (const r of all) c[bucketOf(r)] = (c[bucketOf(r)] || 0) + 1;
    return c;
  }, [all]);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return all
      .filter((r) => (subject ? bucketOf(r) === subject : true))
      .filter((r) => !needle
        || String(r.answer || "").toLowerCase().includes(needle)
        || String(r.q?.question || "").toLowerCase().includes(needle)
        || String(r.category || "").toLowerCase().includes(needle));
  }, [all, subject, q]);

  const remove = (key) => {
    if (!confirm("Ye question aur uska Gemini answer yahan se hata du?")) return;
    removeGeminiQ(key);
    refresh();
  };

  return (
    <div className="ansp">
      {list.length > 0 && (
        <nav className="ansp__side">
          {list.map((r, i) => (
            <a key={r.key} href={`#gq-${i + 1}`}>{i + 1}</a>
          ))}
        </nav>
      )}

      <div className="ansp__main">
        <div className="ansp__stats">
          <span className="tot">📊 Total: {all.length}</span>
          <span className="did">👀 Dikh rahe: {list.length}</span>
        </div>

        <h1>✨ Gemini Answers</h1>

        <p className="ansp__hint" style={{ display: "block", marginBottom: 10 }}>
          Quiz ya PYQ ke kisi bhi question par <b>✨ Gemini</b> dabao, answer laa kar
          uske paste-box mein daalo aur Save karo — wo question apne aap yahan aa jayega.
          Har subject ke liye.
        </p>

        <div className="ansp__chips">
          {SUBJECTS.map((s) => (
            <a
              key={s.key || "all"}
              href="#"
              onClick={(e) => { e.preventDefault(); setSubject(s.key); }}
              className={s.key === subject ? "is-active" : ""}
            >
              {s.label}
              {s.key ? ` (${counts[s.key] || 0})` : ` (${all.length})`}
            </a>
          ))}
          {counts.other > 0 && (
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); setSubject("other"); }}
              className={subject === "other" ? "is-active" : ""}
            >
              📝 Other ({counts.other})
            </a>
          )}
        </div>

        <div className="ansp__acts ansp__acts--top">
          <input
            className="input"
            style={{ maxWidth: 280 }}
            placeholder="🔍 Answer ya question mein khojo…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Link href="/mistakes" className="ansp__btn">🔴 Mistake Notebook</Link>
          <Link href="/slow" className="ansp__btn">⏱️ Slow Questions</Link>
        </div>

        {!ready ? (
          <p className="ansp__empty">Khul raha hai…</p>
        ) : all.length === 0 ? (
          <p className="ansp__empty">
            Abhi yahan kuch nahi. Kisi bhi quiz mein question ke ✨ Gemini wale box mein
            answer paste karke Save karo — wo question yahin aa jayega.
          </p>
        ) : list.length === 0 ? (
          <p className="ansp__empty">Is chhaanti mein kuch nahi mila.</p>
        ) : (
          list.map((r, i) => (
            <div key={r.key} id={`gq-${i + 1}`} className="ansp__card">
              <h2>
                #{i + 1} · {labelOf(bucketOf(r))}
                <span className="ansp__qid">
                  {r.category ? ` · ${r.category}` : ""}
                  {r.at ? ` · ${dayLabel(r.at)}` : ""}
                </span>
              </h2>

              {/* Question apne asli card mein — usi shakl mein jismein quiz ke
                  andar dikha tha. Tasveer wale bank ke liye yahi ek tareeka hai. */}
              {r.kind === "math" ? (
                <MathQuestionCard q={r.q} index={0} subject="math" chapterName={r.category} />
              ) : r.kind === "reason" ? (
                <ReasonQuestionCard q={r.q} index={0} subject="reasoning" chapterName={r.category} />
              ) : (
                <PyqQuestionCard q={r.q} index={0} subject={r.subject} chapterName={r.category} />
              )}

              {/* Card apna "Show answer" khud sambhalta hai, par wahan ye jawab
                  tabhi khulta hai jab question attempt ho. Yahan wo hamesha
                  khula rehta hai — isi ke liye to page hai. */}
              <div className="ansp__answer">
                <b>✨ Gemini ka answer</b>
                <Markdown>{r.answer}</Markdown>
              </div>

              <div className="ansp__acts">
                <span className="ansp__hint">
                  Ye jawab question ke &quot;Show answer&quot; mein bhi hai — wahi ek hi jagah se aata hai.
                </span>
                <button className="ansp__btn" onClick={() => remove(r.key)}>🗑️ Hatao</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
