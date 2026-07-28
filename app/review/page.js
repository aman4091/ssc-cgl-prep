"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  todayIndex, weakDue, getConfig, stats, getBookmarked, getHistory, getDone20, syncWrongBook,
} from "@/lib/srs";
import { pullFreshCoverage, coverageQuota, coverageProgress } from "@/lib/coverage";
import { importTelegramWrong, getTelegramWrong } from "@/lib/tgimport";
import RevisionDeck from "@/components/RevisionDeck";

// Round-robin expand weak-due items into individual exposure cards (an item with
// deficit 3 shows 3 times, never back-to-back), capped at `cap`.
function interleaveWeak(due, cap) {
  const pools = due.map((d) => ({ d, left: d.deficit }));
  const out = [];
  let any = true;
  while (any && out.length < cap) {
    any = false;
    for (const p of pools) {
      if (out.length >= cap) break;
      if (p.left > 0) { out.push(p.d); p.left--; any = true; }
    }
  }
  return out;
}

const subjOf = (item) => item.subject || (item.kind === "vocab" ? "english" : "");

export default function ReviewPage() {
  const [tab, setTab] = useState("due");
  const [deck, setDeck] = useState(null);   // null = building
  const [running, setRunning] = useState(false);
  const [st, setSt] = useState({ enrolled: 0, due: 0, dueExposures: 0, done20: 0, bookmarked: 0 });
  const [cov, setCov] = useState({ pct: 0, pass: 1, passes: 4, total: 0, served: 0 });
  const [ver, setVer] = useState(0);
  const tgWrong = getTelegramWrong(); // Telegram quiz misses (re-reads on ver bump)

  const refreshStats = useCallback(() => {
    syncWrongBook(); // Wrong-Book GS/English -> weak pool
    // Telegram quiz misses -> revision (naye galat answers pull karo)
    importTelegramWrong().then((n) => { if (n) setVer((v) => v + 1); }).catch(() => {});
    setSt(stats());
    coverageProgress().then(setCov).catch(() => {});
  }, []);

  useEffect(() => { refreshStats(); }, [refreshStats, ver]);
  useEffect(() => {
    const h = () => setVer((v) => v + 1);
    window.addEventListener("cgl:srs-changed", h);
    return () => window.removeEventListener("cgl:srs-changed", h);
  }, []);

  const buildDeck = useCallback(async () => {
    setDeck(null);
    const today = todayIndex();
    const { budget } = getConfig();
    const due = weakDue(today);
    const weak = interleaveWeak(due, budget);
    const weakCards = weak.map((w, idx) => ({
      uid: `w${idx}:${w.key}`, kind: w.item.kind, ref: w.item.ref,
      weak: true, srsKey: w.key, subject: subjOf(w.item),
    }));
    const coverN = Math.max(0, budget - weakCards.length);
    let coverCards = [];
    if (coverN > 0) {
      const excl = new Set(due.map((d) => d.key));
      const quota = await coverageQuota().catch(() => coverN);
      const cover = await pullFreshCoverage(Math.min(coverN, quota), excl).catch(() => []);
      coverCards = cover.map((c, idx) => ({
        uid: `c${idx}:${c.coverKey}`, kind: c.kind, ref: c.ref,
        weak: false, srsKey: null, subject: c.subject,
      }));
    }
    // Deck order (user): pehle VOCAB, phir PYQ (q/ca), last mein WRONG questions (wb).
    // Stable sort within each group weak-then-coverage / deficit order preserve karta.
    const rankOf = (k) => (k === "vocab" ? 0 : k === "wb" ? 2 : 1);
    const full = [...weakCards, ...coverCards];
    full.sort((a, b) => rankOf(a.kind) - rankOf(b.kind));
    setDeck(full);
  }, []);

  const start = async () => { setRunning(true); await buildDeck(); };
  const finishDeck = () => { setRunning(false); setDeck(null); setVer((v) => v + 1); };

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">🔁 Aaj ka Revision</span>
          <Link href="/today" className="btn btn--ghost btn--sm">← Plan</Link>
        </div>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.5rem, 4vw, 2.2rem)" }}>
          Baar-baar dekho, <span className="grad">exam tak yaad</span>
        </h1>

        <div className="srs-stats">
          <div className="srs-stat"><span className="srs-stat__n">{st.enrolled}</span><span className="srs-stat__l">Enrolled</span></div>
          <div className="srs-stat"><span className="srs-stat__n">{st.dueExposures}</span><span className="srs-stat__l">Aaj due</span></div>
          <div className="srs-stat"><span className="srs-stat__n">{st.done20}</span><span className="srs-stat__l">Pakka (20+)</span></div>
        </div>

        <div className="mt-16">
          <div className="row between mb-8">
            <span className="muted">📚 Bank coverage · pass {cov.pass}/{cov.passes}</span>
            <span className="muted">{cov.pct}%</span>
          </div>
          <div className="progress"><div className="progress__bar" style={{ width: `${cov.pct}%` }} /></div>
        </div>
      </section>

      {running ? (
        <section className="section">
          {deck === null ? (
            <div className="placeholder">Deck ban raha hai… 🧠</div>
          ) : (
            <RevisionDeck deck={deck} onDone={finishDeck} />
          )}
          <div className="row mt-16" style={{ justifyContent: "center" }}>
            <button className="btn btn--ghost btn--sm" onClick={finishDeck}>⏹ Rok do (baad mein)</button>
          </div>
        </section>
      ) : (
        <section className="section">
          <div className="done-tabs" role="tablist">
            {[
              ["due", `📝 Aaj (${st.dueExposures})`],
              ["saved", `🔖 Saved (${st.bookmarked})`],
              ["history", "🕘 History"],
              ["telegram", `📲 Telegram (${tgWrong.length})`],
              ["done", `✅ Pakka (${st.done20})`],
            ].map(([k, label]) => (
              <button key={k} role="tab" aria-selected={tab === k}
                className={`done-tab${tab === k ? " done-tab--on" : ""}`} onClick={() => setTab(k)}>
                {label}
              </button>
            ))}
          </div>

          {tab === "due" && (
            <div className="mt-16">
              {st.dueExposures === 0 && st.enrolled === 0 ? (
                <div className="placeholder">
                  Abhi tak kuch enroll nahi. Kisi English/GS question par 🔁 dabao, ya koi galti karo —
                  wo yahaan revision mein aa jaayega. Bank coverage bhi shuru kar sakte ho.
                </div>
              ) : (
                <div className="glass-card">
                  <p style={{ marginBottom: 10 }}>
                    Aaj <strong>{st.dueExposures}</strong> revision-cards due hain
                    {st.enrolled > 0 && <> · <strong>{st.enrolled}</strong> items enrolled</>}.
                    Naye bank-questions bhi is deck mein flashcard ban ke aayenge (coverage).
                  </p>
                  <button className="btn btn--primary btn--block" onClick={start}>▶ Revision shuru karo</button>
                </div>
              )}
            </div>
          )}

          {tab === "saved" && <ItemList items={getBookmarked()} empty="Koi flashcard save nahi. Deck mein 🔖 dabao." />}
          {tab === "history" && <HistoryList />}
          {tab === "telegram" && <TelegramList items={tgWrong} />}
          {tab === "done" && <ItemList items={getDone20()} empty="Abhi kuch 'pakka' (20+ baar) nahi hua." />}
        </section>
      )}
    </>
  );
}

function label(item) {
  if (item.kind === "vocab") return item.ref?.word || "word";
  const q = item.ref || {};
  return (q.question || q.qText || q.note || "question").slice(0, 90);
}

function ItemList({ items, empty }) {
  if (!items.length) return <div className="placeholder mt-16">{empty}</div>;
  return (
    <div className="grid mt-16" style={{ gap: 10, gridTemplateColumns: "minmax(0,1fr)" }}>
      {items.map((it) => (
        <div key={it.key} className="glass-card srs-row">
          <span className="badge">{it.kind === "vocab" ? "🔤" : it.subject === "gs" ? "🌍" : "📘"}</span>
          <span className="srs-row__t">{label(it)}</span>
          <span className="muted">{it.seen}×</span>
        </div>
      ))}
    </div>
  );
}

function TelegramList({ items }) {
  if (!items.length) {
    return (
      <div className="placeholder mt-16">
        Abhi tak Telegram se koi galat answer nahi aaya. Group ke quiz mein jo galat karoge
        wo yahaan (aur revision deck mein) apne-aap aa jayega.
      </div>
    );
  }
  const subIcon = (s) => (s === "vocab" ? "🔤" : s === "gs" ? "🌍" : "📘");
  return (
    <div className="grid mt-16" style={{ gap: 10, gridTemplateColumns: "minmax(0,1fr)" }}>
      {items.map((it) => (
        <div key={it.key + it.at} className="glass-card">
          <div className="row between" style={{ marginBottom: 6 }}>
            <span className="badge">{subIcon(it.subject)} {it.subject}</span>
            <span className="muted" style={{ fontSize: ".8rem" }}>
              {(() => { try { return new Date(it.at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }); } catch { return ""; } })()}
            </span>
          </div>
          <p style={{ fontWeight: 600, marginBottom: 8 }}>{it.question}</p>
          <div className="grid" style={{ gap: 4 }}>
            {(it.options || []).map((o, oi) => (
              <div
                key={oi}
                className="muted"
                style={{
                  fontSize: ".9rem",
                  color: oi === it.answer ? "#7ee787" : oi === it.chosen ? "#ff9a9a" : undefined,
                }}
              >
                {oi === it.answer ? "✅ " : oi === it.chosen ? "❌ " : "• "}{o}
              </div>
            ))}
          </div>
          {it.solution && <p className="muted" style={{ marginTop: 8, fontSize: ".85rem" }}>📖 {it.solution}</p>}
        </div>
      ))}
    </div>
  );
}

function HistoryList() {
  const items = getHistory();
  if (!items.length) return <div className="placeholder mt-16">Abhi tak kuch nahi dekha.</div>;
  return (
    <div className="grid mt-16" style={{ gap: 10, gridTemplateColumns: "minmax(0,1fr)" }}>
      {items.map((h, i) => (
        <div key={h.key + i} className="glass-card srs-row">
          <span className="badge">{h.item.kind === "vocab" ? "🔤" : h.item.subject === "gs" ? "🌍" : "📘"}</span>
          <span className="srs-row__t">{label(h.item)}</span>
          <span className="muted">{h.item.seen}×</span>
        </div>
      ))}
    </div>
  );
}
