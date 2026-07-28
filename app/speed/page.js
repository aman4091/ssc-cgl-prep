"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SPEED_BUCKETS, SPEED_SUBJECTS, getBuckets, speedCounts, wrongToQuestion } from "@/lib/qspeed";
import { imagesOf } from "@/lib/wrongbook";
import MathQuestionCard from "@/components/MathQuestionCard";
import ReasonQuestionCard from "@/components/ReasonQuestionCard";
import FullscreenTestButton from "@/components/FullscreenTestButton";
import GeminiFlashButton from "@/components/GeminiFlashButton";
import FlashAnswer from "@/components/FlashAnswer";

// ⏱ Speed Buckets — Maths & Reasoning.
//
// Har question ka time fullscreen test se aata hai (lib/qspeed). Question apne
// LATEST time+correctness ke hisaab se ek bucket mein baithta hai; dobara tez +
// sahi karo to apne-aap tez bucket mein aa jaata hai. Skip/galat aur Wrong Book
// ke us subject ke questions "over 2 min" bucket mein.

export default function SpeedPageWrapper() {
  return (
    <Suspense fallback={<section className="section"><div className="placeholder">Loading…</div></section>}>
      <SpeedPage />
    </Suspense>
  );
}

function SpeedPage() {
  const sp = useSearchParams();
  const [subject, setSubject] = useState("math");
  const [buckets, setBuckets] = useState(null);
  const [counts, setCounts] = useState({ total: 0 });
  const [open, setOpen] = useState(null); // expanded bucket key
  const [ver, setVer] = useState(0);

  // Nav se aane par seedha us subject + bracket pe khulo.
  useEffect(() => {
    const s = sp.get("subject");
    const b = sp.get("bucket");
    if (s === "math" || s === "reasoning") setSubject(s);
    if (b) setOpen(b);
  }, [sp]);

  useEffect(() => {
    setBuckets(getBuckets(subject));
    setCounts(speedCounts(subject));
  }, [subject, ver]);

  // Re-attempt anywhere on the site re-buckets the question live.
  useEffect(() => {
    const h = () => setVer((v) => v + 1);
    window.addEventListener("cgl:qspeed-changed", h);
    return () => window.removeEventListener("cgl:qspeed-changed", h);
  }, []);

  const Card = subject === "math" ? MathQuestionCard : ReasonQuestionCard;
  const subMeta = SPEED_SUBJECTS.find((s) => s.key === subject);

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">⏱️ Speed Buckets</span>
          <Link href="/pyq" className="btn btn--ghost btn--sm">← PYQ</Link>
        </div>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.5rem, 4vw, 2.2rem)" }}>
          Kis question mein kitna time <span className="grad">· {counts.total} tracked</span>
        </h1>
        <p className="hero__sub">
          Fullscreen (⛶) test mein jo bhi Maths/Reasoning question lagate ho, uska time apne-aap yahaan
          bucket mein baith jaata hai. Slow waale dobara tez karo → apne-aap upar chad jaate hain.
        </p>

        {/* Maths | Reasoning */}
        <div className="done-tabs" role="tablist" style={{ marginTop: 14 }}>
          {SPEED_SUBJECTS.map((s) => (
            <button
              key={s.key}
              role="tab"
              aria-selected={subject === s.key}
              className={`done-tab${subject === s.key ? " done-tab--on" : ""}`}
              onClick={() => { setSubject(s.key); setOpen(null); }}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>
      </section>

      <section className="section">
        {!buckets ? (
          <div className="placeholder">Loading…</div>
        ) : counts.total === 0 ? (
          <div className="placeholder">
            Abhi tak koi {subMeta?.label} question timed nahi. Kisi PYQ chapter mein ⛶ (full-screen) se
            question lagao — time yahaan aa jaayega.
          </div>
        ) : (
          <div className="speed-buckets">
            {SPEED_BUCKETS.map((b) => {
              const items = buckets[b.key] || [];
              const isOpen = open === b.key;
              // questions in this bucket, for the "re-attempt in fullscreen" set
              const qs = items.filter((it) => it.kind === "timed").map((it) => it.rec.q);
              // Wrong-Book items -> ek fullscreen set, taaki ⛶ se Next-Next karke
              // poore bucket ke wrong questions nipta sako (sirf ek nahi).
              const wbItems = items.filter((it) => it.kind === "wb");
              const wbQs = wbItems.map((it) => wrongToQuestion(it.wb));
              return (
                <div key={b.key} className={`speed-bucket speed-bucket--${b.tone}${isOpen ? " is-open" : ""}`}>
                  <button
                    className="speed-bucket__head"
                    onClick={() => setOpen(isOpen ? null : b.key)}
                    aria-expanded={isOpen}
                  >
                    <span className="speed-bucket__dot" aria-hidden />
                    <span className="speed-bucket__label">{b.label}</span>
                    <span className="speed-bucket__n">{items.length}</span>
                    <span className="speed-bucket__chev">{isOpen ? "▲" : "▼"}</span>
                  </button>

                  {isOpen && (
                    <div className="speed-bucket__body">
                      {items.length === 0 ? (
                        <div className="placeholder" style={{ padding: 16 }}>Is bucket mein kuch nahi.</div>
                      ) : (
                        <>
                          {/* Fullscreen ab har question card ke action-row mein (⛶,
                              Gemini ke bagal, chota) — bada bucket-button hata diya. */}
                          <div className="grid" style={{ gap: 14, gridTemplateColumns: "minmax(0, 1fr)" }}>
                            {items.map((it, i) =>
                              it.kind === "wb" ? (
                                <WrongBookRef key={it.key} rec={it.wb} subject={subject}
                                  questions={wbQs} startIndex={wbItems.indexOf(it)} />
                              ) : (
                                <Card
                                  key={it.key}
                                  q={it.rec.q}
                                  index={i}
                                  subject={subject}
                                  chapterName={`Speed · ${b.short}`}
                                  allQuestions={qs}
                                />
                              )
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}

// A hand-kept Wrong Book question (image, no options). Ab attemptable: ⛶ full-screen
// mein "Show answer" dabao -> time record -> apne time-bucket mein chala jayega. Sath
// mein ✨ Gemini (image copy) aur 📥 answer paste (Wrong Book mein bhi save hota).
function WrongBookRef({ rec, subject, questions, startIndex = 0 }) {
  const imgs = imagesOf(rec);
  const card = { uid: "wb:" + rec.id, kind: "wb", ref: rec, subject };
  // Poore bucket ke wrong questions ek set mein, taaki Next se aage bhi jaa sako.
  const fsQs = Array.isArray(questions) && questions.length ? questions : [wrongToQuestion(rec)];
  const fsStart = Array.isArray(questions) && questions.length ? startIndex : 0;
  return (
    <article className="glass-card">
      <div className="q-head">
        <span className="badge">📕 Wrong Book</span>
        <div className="q-head__actions">
          <FullscreenTestButton
            questions={fsQs}
            startIndex={fsStart}
            subject={subject}
            title="Wrong Book"
            label="⛶"
            titleAttr="Full-screen mein solve karo — Show answer dabate hi time record hoga, Next se aage jao"
          />
          <GeminiFlashButton card={card} />
          <Link href="/wrong" className="btn btn--ghost btn--sm">Kholo →</Link>
        </div>
      </div>
      {imgs.map((im) => (
        <a key={im.url || im.id} href={im.url || undefined} target="_blank" rel="noreferrer" className="math-img-wrap">
          {im.url ? <img src={im.url} alt="wrong question" className="math-img" /> : <span className="muted">📱 local image</span>}
        </a>
      ))}
      {rec.note && <p className="muted" style={{ marginTop: 4 }}>{rec.note}</p>}
      <FlashAnswer card={card} />
    </article>
  );
}
