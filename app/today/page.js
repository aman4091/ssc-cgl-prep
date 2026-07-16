"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getTargets, addTarget, toggleDone, deleteTarget, moveTarget } from "@/lib/targets";
import { getOws, buildMcq } from "@/lib/vocab";
import { getStatByParts } from "@/lib/qstats";
import { getAllEntries, getEntry } from "@/lib/feed";
import { SUBJECTS, subjectMeta, getChapters, getChapter, getChapterQuestions } from "@/lib/grammar";
import { buildCalcQuiz } from "@/lib/calc";
import { saveQuiz, makeId } from "@/lib/storage";

function shuffle(a) {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}
function newVocabWords() {
  return getOws().filter((it) => {
    const q = it.def || `One word for: ${it.word}`;
    const s = getStatByParts(q, it.word);
    return !s || !s.attempts;
  });
}

const TYPES = [
  { key: "vocab", label: "🔤 Vocab (new words)" },
  { key: "current", label: "📰 Current Affairs" },
  { key: "chapter", label: "📚 Chapter / Topic" },
  { key: "calc", label: "🧮 Calculation" },
  { key: "custom", label: "✍️ Custom" },
];

export default function TodayPage() {
  const router = useRouter();
  const [targets, setTargets] = useState([]);
  const [adding, setAdding] = useState(false);
  const [atype, setAtype] = useState("vocab");

  const [vCount, setVCount] = useState(50);
  const [entryId, setEntryId] = useState("");
  const [subject, setSubject] = useState("math");
  const [chapterId, setChapterId] = useState("");
  const [cCount, setCCount] = useState(20);
  const [cSec, setCSec] = useState(12);
  const [customTitle, setCustomTitle] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [durH, setDurH] = useState(0);
  const [durM, setDurM] = useState(0);

  const refresh = () => setTargets(getTargets());
  useEffect(() => {
    refresh();
    const onChanged = () => refresh();
    window.addEventListener("cgl:targets-changed", onChanged);
    return () => window.removeEventListener("cgl:targets-changed", onChanged);
  }, []);

  const currentEntries = getAllEntries().filter((e) => e.feed === "current");
  const chapters = getChapters(subject);

  const add = () => {
    let payload = null;
    if (atype === "vocab") {
      payload = { type: "vocab", title: `Vocab · ${vCount} new words`, ref: { count: vCount } };
    } else if (atype === "current") {
      const e = getEntry(entryId);
      if (!e) return;
      payload = { type: "current", title: `Current Affairs · ${e.date || e.title || e.bucket}`, ref: { entryId } };
    } else if (atype === "chapter") {
      const c = getChapter(chapterId);
      if (!c) return;
      payload = { type: "chapter", title: `${subjectMeta(subject).short} · ${c.name}`, ref: { subject, chapterId } };
    } else if (atype === "calc") {
      payload = { type: "calc", title: `Calculation drill (${cCount} Q)`, ref: { count: cCount, sec: cSec } };
    } else {
      if (!customTitle.trim()) return;
      payload = { type: "custom", title: customTitle.trim(), ref: { url: customUrl.trim() } };
    }
    const durationMin = (parseInt(durH) || 0) * 60 + (parseInt(durM) || 0);
    if (durationMin > 0) payload.ref = { ...payload.ref, durationMin };
    addTarget(payload);
    setAdding(false);
    setCustomTitle(""); setCustomUrl("");
    setDurH(0); setDurM(0);
    refresh();
  };

  const doneCount = targets.filter((t) => t.done).length;

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">📅 Today</span>
          <button className="btn btn--primary btn--sm" onClick={() => setAdding((v) => !v)}>{adding ? "✕ Close" : "➕ Add target"}</button>
        </div>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.7rem, 4vw, 2.6rem)" }}>
          Daily <span className="grad">Targets</span>
        </h1>
        <p className="hero__sub">
          What to do today — add targets and start right here. {targets.length > 0 && <strong>{doneCount}/{targets.length} done ✅</strong>}
        </p>
      </section>

      {adding && (
        <section className="section" style={{ marginTop: 12 }}>
          <div className="glass-card">
            <h3>➕ New target</h3>
            <div className="chips mt-16">
              {TYPES.map((t) => (
                <button key={t.key} className={`chip chip--btn chip--lg ${atype === t.key ? "is-active" : ""}`} onClick={() => setAtype(t.key)}>{t.label}</button>
              ))}
            </div>

            <div className="mt-16">
              {atype === "vocab" && (
                <div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <span className="muted" style={{ fontSize: "0.85rem" }}>How many new words:</span>
                  <select className="select" style={{ width: "auto", padding: "8px 12px" }} value={vCount} onChange={(e) => setVCount(parseInt(e.target.value))}>
                    {[25, 50, 100, 200].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <span className="muted" style={{ fontSize: "0.8rem" }}>{newVocabWords().length} new (0-attempts) words available now.</span>
                </div>
              )}
              {atype === "current" && (
                currentEntries.length === 0 ? (
                  <p className="muted" style={{ fontSize: "0.85rem" }}>First create an entry in <Link href="/current-affairs" className="link">Current Affairs</Link>.</p>
                ) : (
                  <select className="select" value={entryId} onChange={(e) => setEntryId(e.target.value)}>
                    <option value="">— Choose an entry —</option>
                    {currentEntries.map((e) => <option key={e.id} value={e.id}>{e.bucket} · {e.date || e.title} ({e.questions?.length || 0} Q)</option>)}
                  </select>
                )
              )}
              {atype === "chapter" && (
                <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
                  <select className="select" style={{ width: "auto" }} value={subject} onChange={(e) => { setSubject(e.target.value); setChapterId(""); }}>
                    {Object.keys(SUBJECTS).map((k) => <option key={k} value={k}>{SUBJECTS[k].label}</option>)}
                  </select>
                  {chapters.length === 0 ? (
                    <span className="muted" style={{ fontSize: "0.85rem", alignSelf: "center" }}>No chapters in this subject. <Link href={`/study/${subject}`} className="link">Create one</Link></span>
                  ) : (
                    <select className="select" style={{ flex: 1, minWidth: 180 }} value={chapterId} onChange={(e) => setChapterId(e.target.value)}>
                      <option value="">— Choose a chapter —</option>
                      {chapters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  )}
                </div>
              )}
              {atype === "calc" && (
                <div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <span className="muted" style={{ fontSize: "0.85rem" }}>Questions:</span>
                  <select className="select" style={{ width: "auto", padding: "8px 12px" }} value={cCount} onChange={(e) => setCCount(parseInt(e.target.value))}>
                    {[10, 20, 30, 50].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <span className="muted" style={{ fontSize: "0.85rem" }}>Time/Q:</span>
                  <select className="select" style={{ width: "auto", padding: "8px 12px" }} value={cSec} onChange={(e) => setCSec(parseInt(e.target.value))}>
                    <option value={8}>8s</option><option value={12}>12s</option><option value={20}>20s</option><option value={0}>No timer</option>
                  </select>
                </div>
              )}
              {atype === "custom" && (
                <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
                  <input className="input" style={{ flex: 1, minWidth: 200 }} placeholder="Target — e.g. Write 2 essays" value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} />
                  <input className="input" style={{ flex: 1, minWidth: 180 }} placeholder="Link (optional)" value={customUrl} onChange={(e) => setCustomUrl(e.target.value)} />
                </div>
              )}
            </div>

            {/* Optional focus timer for this target — runs on the navbar timer */}
            <div className="mt-16" style={{ borderTop: "1px solid var(--line)", paddingTop: 14 }}>
              <div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <span className="muted" style={{ fontSize: "0.85rem" }}>⏱️ Set a timer (optional):</span>
                <input className="input" type="number" min={0} style={{ width: 64 }} value={durH}
                  onChange={(e) => setDurH(e.target.value)} placeholder="0" />
                <span className="muted" style={{ fontSize: "0.85rem" }}>hr</span>
                <input className="input" type="number" min={0} max={59} style={{ width: 64 }} value={durM}
                  onChange={(e) => setDurM(e.target.value)} placeholder="0" />
                <span className="muted" style={{ fontSize: "0.85rem" }}>min</span>
                <div className="chips" style={{ gap: 6 }}>
                  {[{ h: 0, m: 30, l: "30m" }, { h: 1, m: 0, l: "1h" }, { h: 1, m: 30, l: "1½h" }, { h: 2, m: 0, l: "2h" }].map((p) => (
                    <button key={p.l} type="button" className="chip chip--btn chip--sm" onClick={() => { setDurH(p.h); setDurM(p.m); }}>{p.l}</button>
                  ))}
                </div>
              </div>
              <p className="muted mt-8" style={{ fontSize: "0.78rem" }}>
                Timer set karo toh card pe <strong>▶ Start timer</strong> button aayega — navbar wala timer isi target ke liye chalega, aur pura hote hi popup aayega.
              </p>
            </div>

            <div className="row mt-16" style={{ gap: 10 }}>
              <button className="btn btn--primary" onClick={add}>Add target</button>
              <button className="btn btn--ghost" onClick={() => setAdding(false)}>Cancel</button>
            </div>
          </div>
        </section>
      )}

      <section className="section" style={{ marginTop: 12 }}>
        {targets.length === 0 ? (
          <div className="placeholder">No targets for today. Start with <strong>➕ Add target</strong>. 🎯</div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {(() => {
              const pending = targets.filter((x) => !x.done);
              return targets.map((t) => (
                <TargetCard key={t.id} target={t} router={router} onChanged={refresh}
                  pIdx={pending.findIndex((x) => x.id === t.id)} pCount={pending.length} />
              ));
            })()}
          </div>
        )}
      </section>
    </>
  );
}

function fmtDur(min) {
  const h = Math.floor(min / 60), m = min % 60;
  return [h ? `${h}h` : "", m ? `${m}m` : ""].filter(Boolean).join(" ") || "0m";
}

function TargetCard({ target, router, onChanged, pIdx = -1, pCount = 0 }) {
  const t = target;
  const durationMin = t.ref?.durationMin || 0;
  const isPending = pIdx >= 0;
  const isTop = pIdx === 0;
  const move = (dir) => { moveTarget(t.id, dir); onChanged(); window.dispatchEvent(new CustomEvent("cgl:targets-changed")); };

  const startTimer = () => {
    window.dispatchEvent(new CustomEvent("cgl:start-task-timer", {
      detail: { minutes: durationMin, label: t.title, targetId: t.id },
    }));
  };

  const startQuiz = (title, questions, extra = {}) => {
    if (!questions.length) return;
    const quiz = { id: makeId(), title, source: "target", createdAt: new Date().toISOString(), questions: shuffle(questions).slice(0, 25), ...extra };
    saveQuiz(quiz);
    router.push(`/quizzes/${quiz.id}`);
  };

  const actions = [];
  if (t.type === "vocab") {
    const fresh = newVocabWords();
    const n = Math.min(t.ref.count || 25, fresh.length);
    actions.push(
      <span key="c" className="muted" style={{ fontSize: "0.82rem", alignSelf: "center" }}>{fresh.length} new words left</span>,
      <button key="q" className="btn btn--primary btn--sm" disabled={fresh.length === 0} onClick={() => {
        const pool = getOws();
        const items = shuffle(fresh).slice(0, t.ref.count || 25);
        startQuiz("New vocab words", items.map((it) => buildMcq(it, pool)));
      }}>🎯 New words quiz ({n})</button>,
      <Link key="v" href="/vocab" className="btn btn--ghost btn--sm">📖 Open Vocab</Link>,
    );
  } else if (t.type === "current") {
    const e = getEntry(t.ref.entryId);
    if (!e) actions.push(<span key="x" className="muted" style={{ fontSize: "0.82rem" }}>Entry was deleted.</span>);
    else {
      if (e.videoUrl) actions.push(<button key="v" className="btn btn--ghost btn--sm" onClick={() => window.open(e.videoUrl, "_blank", "noopener")}>▶ Video</button>);
      if (e.questions?.length) actions.push(<button key="q" className="btn btn--primary btn--sm" onClick={() => startQuiz(`${e.date || "Current Affairs"} · Quiz`, e.questions)}>🎯 Quiz ({e.questions.length})</button>);
      actions.push(<Link key="c" href="/current-affairs" className="btn btn--ghost btn--sm">📰 Open</Link>);
    }
  } else if (t.type === "chapter") {
    const c = getChapter(t.ref.chapterId);
    if (!c) actions.push(<span key="x" className="muted" style={{ fontSize: "0.82rem" }}>Chapter was deleted.</span>);
    else {
      const qs = getChapterQuestions(c.id);
      actions.push(<Link key="o" href={`/study/${t.ref.subject}/${c.id}`} className="btn btn--primary btn--sm">📖 Open chapter</Link>);
      if (qs.length) actions.push(<button key="p" className="btn btn--ghost btn--sm" onClick={() => startQuiz(`${c.name} · Practice`, qs)}>🎯 Practice ({Math.min(25, qs.length)})</button>);
    }
  } else if (t.type === "calc") {
    actions.push(<button key="d" className="btn btn--primary btn--sm" onClick={async () => {
      const quiz = await buildCalcQuiz(undefined, t.ref.count || 20, t.ref.sec ?? 12);
      saveQuiz(quiz); router.push(`/quizzes/${quiz.id}`);
    }}>🚀 Start drill</button>);
  } else if (t.type === "custom") {
    if (t.ref.url) actions.push(<a key="u" href={t.ref.url} target="_blank" rel="noreferrer" className="btn btn--primary btn--sm">🔗 Open</a>);
  }

  return (
    <article className={`glass-card target-card ${t.done ? "is-done" : ""}`}>
      <div className="row between" style={{ alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <label className="row" style={{ gap: 10, alignItems: "center", cursor: "pointer" }}>
          <input type="checkbox" checked={t.done} onChange={() => { toggleDone(t.id); onChanged(); window.dispatchEvent(new CustomEvent("cgl:targets-changed")); }} />
          {isTop && <span className="badge badge--ok" title="Top priority — Strict mode isi ko force karega">#1</span>}
          <span style={{ fontWeight: 600, textDecoration: t.done ? "line-through" : "none", opacity: t.done ? 0.6 : 1 }}>{t.title}</span>
          {isPending && t.startedAt && <span className="muted" style={{ fontSize: "0.74rem" }}>▶ started</span>}
        </label>
        {isPending && pCount > 1 && (
          <div className="row" style={{ gap: 4 }}>
            <button className="btn btn--ghost btn--sm" title="Priority upar" disabled={pIdx === 0} onClick={() => move(-1)}>↑</button>
            <button className="btn btn--ghost btn--sm" title="Priority neeche" disabled={pIdx === pCount - 1} onClick={() => move(1)}>↓</button>
          </div>
        )}
        <div className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {durationMin > 0 && (
            <button className="btn btn--primary btn--sm" onClick={startTimer} title="Navbar timer isi target ke liye chalega">
              ▶ Start timer ({fmtDur(durationMin)})
            </button>
          )}
          {actions}
          <button className="btn btn--ghost btn--sm" onClick={() => { deleteTarget(t.id); onChanged(); }}>✕</button>
        </div>
      </div>
    </article>
  );
}
