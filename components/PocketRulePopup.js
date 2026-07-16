"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ruleDetail, ruleQuiz } from "@/lib/client-ai";
import { saveQuiz, makeId } from "@/lib/storage";
import { ruleAsText } from "@/lib/pocketbank";
import Markdown from "./Markdown";
import AskElsewhere from "./AskElsewhere";

const QUIZ_COUNT = 20;

// A rule is paragraphs and tables. The book draws its tables with alignment
// rather than ruled lines, so they are rebuilt at build time into real rows
// (see the converter) — rendering them as markdown pipes would mean not
// escaping the pipes the grammar text itself uses.
function Blocks({ blocks }) {
  return blocks.map((b, i) =>
    b.table ? (
      <div key={i} className="md-tablewrap">
        <table>
          <tbody>
            {b.table.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) =>
                  ri === 0
                    ? <th key={ci}><Markdown inline>{cell}</Markdown></th>
                    : <td key={ci}><Markdown inline>{cell}</Markdown></td>,
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <div key={i} className="md" style={{ marginTop: i ? 8 : 0 }}>
        <Markdown inline>{b.p}</Markdown>
      </div>
    ),
  );
}

// One Pocket Rocket rule, opened from the list. The book's own explanation and
// examples are already here — the four buttons are for going further.
export default function PocketRulePopup({ rule, onClose }) {
  const router = useRouter();
  const [detail, setDetail] = useState(null);   // 📘 Explain — DeepSeek
  const [extra, setExtra] = useState([]);       // 📝 More examples — accumulates
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  const text = ruleAsText(rule);

  // Gemini gets the rule plus the ask, since the Settings gemini prompt is
  // written for solving MCQs and this is a rule to be taught.
  const geminiQ = {
    question:
      "Neeche diya gaya English grammar rule mujhe detail mein samjhao — Hinglish mein. " +
      "Ye kya hai, kaam kaise karta hai, kab lagta hai aur kab nahi, exam mein kaunsa trap aata hai, " +
      "aur 5 easy examples do.\n\n" + text,
    options: [],
  };

  const explain = async () => {
    setBusy("explain"); setErr("");
    try {
      const d = await ruleDetail(text, "english", "Pocket Rocket");
      setDetail(d);
    } catch (e) { setErr(e.message); } finally { setBusy(""); }
  };

  const moreExamples = async () => {
    setBusy("examples"); setErr("");
    try {
      const d = await ruleDetail(text, "english", "Pocket Rocket");
      // Append rather than replace — pressing it twice should give more, not
      // swap the ones already on screen.
      setExtra((p) => [...p, ...(d.examples || [])]);
    } catch (e) { setErr(e.message); } finally { setBusy(""); }
  };

  const quiz = async () => {
    setBusy("quiz"); setErr("");
    try {
      const d = await ruleQuiz([text], "english", "Pocket Rocket", QUIZ_COUNT);
      if (!d.questions?.length) throw new Error("Koi question nahi bana. Dobara try karo.");
      const q = {
        id: makeId(),
        title: d.title || `Pocket Rule ${rule.n} · ${QUIZ_COUNT} Q`,
        source: `Pocket Rocket · rule ${rule.n}`,
        createdAt: new Date().toISOString(),
        questions: d.questions,
      };
      saveQuiz(q);
      router.push(`/quizzes/${q.id}`);   // busy stays set — the page is leaving
    } catch (e) { setErr(e.message); setBusy(""); }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 500 }}>
      <div className="modal glass" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 680 }}>
        <div className="row between" style={{ alignItems: "flex-start", gap: 10 }}>
          <div>
            <span className="hero__eyebrow">📕 Pocket Rocket · page {rule.page}</span>
            <h2 style={{ marginTop: 6, fontSize: "1.3rem" }}>Rule {rule.n}</h2>
          </div>
          <button className="btn btn--ghost btn--sm" onClick={onClose} title="Close">✕</button>
        </div>

        {/* The four ways out of the book */}
        <div className="row mt-16" style={{ gap: 8, flexWrap: "wrap" }}>
          <AskElsewhere
            q={geminiQ}
            url="https://gemini.google.com/app"
            label="✨ Gemini"
            title="Rule copy karke Gemini kholo — wahan detail mein samajh lo"
          />
          <button className="btn btn--ghost btn--sm" onClick={explain} disabled={!!busy}>
            {busy === "explain" ? "Soch raha…" : "📘 Explain"}
          </button>
          <button className="btn btn--ghost btn--sm" onClick={moreExamples} disabled={!!busy}>
            {busy === "examples" ? "Bana raha…" : extra.length ? "📝 Aur examples" : "📝 More examples"}
          </button>
          <button className="btn btn--primary btn--sm" onClick={quiz} disabled={!!busy}>
            {busy === "quiz" ? "Bana raha…" : `🎯 ${QUIZ_COUNT} Quiz`}
          </button>
        </div>
        {err && <p style={{ color: "var(--danger)", fontSize: "0.85rem", marginTop: 10 }}>{err}</p>}

        {/* The book itself */}
        <div className="answer-box mt-16"><Blocks blocks={rule.explanation} /></div>

        {rule.examples.length > 0 && (
          <>
            <span className="vd-label" style={{ display: "block", marginTop: 18 }}>📝 Book ke examples</span>
            <div className="answer-box mt-8"><Blocks blocks={rule.examples} /></div>
          </>
        )}

        {detail && (
          <>
            <span className="vd-label" style={{ display: "block", marginTop: 18 }}>📘 Detail (AI)</span>
            <div className="answer-box mt-8"><Markdown>{detail.detail}</Markdown></div>
            {detail.trap && (
              <div className="answer-box mt-8" style={{ borderColor: "rgba(251,113,133,0.5)" }}>
                <strong style={{ color: "var(--danger)" }}>⚠️ Trap: </strong>
                <Markdown inline>{detail.trap}</Markdown>
              </div>
            )}
          </>
        )}

        {extra.length > 0 && (
          <>
            <span className="vd-label" style={{ display: "block", marginTop: 18 }}>
              📝 Aur examples (AI) · {extra.length}
            </span>
            <div className="answer-box mt-8">
              {extra.map((p, i) => (
                <div key={i} className="md" style={{ marginTop: i ? 8 : 0 }}>
                  <Markdown inline>{p}</Markdown>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
