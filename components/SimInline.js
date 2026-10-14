"use client";

// 🎯 Ek galat sawaal ke 5 similar — Answers page par WAHIN (lib/anssim).
// Na bane hon to "🎯 5 similar banao": likha hua text ho (q / OCR) to seedha
// 🐋 DeepSeek ko; sirf tasveer ho to pehle apne aap padh kar (lib/anssim).
// Har similar ek chhota MCQ: option dabao → sahi / galat + samjhaana.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Markdown from "./Markdown";
import Gemini20 from "./Gemini20";
import "./answers-play.css";
import { imagesOf } from "@/lib/wrongbook";
import { simItems, simGroups, makeSimAuto, linkSim, simBusy, simError, getPicks, setPick, SIM_PER } from "@/lib/anssim";
import { useExamMode } from "./ExamMode";

// Similar ka haal badle (bana / option laga) → dobara padho.
export function useSimTick() {
  const [t, setT] = useState(0);
  useEffect(() => {
    const on = () => setT((x) => x + 1);
    window.addEventListener("cgl:simpool", on);
    window.addEventListener("cgl:sync-applied", on);
    return () => { window.removeEventListener("cgl:simpool", on); window.removeEventListener("cgl:sync-applied", on); };
  }, []);
  return t;
}

// 🎯 5 similar — tasveer ho to bhi Gemini nahi: lib/anssim makeSimAuto apne
// aap padh leta hai. Padh na paye tabhi Gemini wala purana raasta.
export function SimMake({ r, label = `🎯 ${SIM_PER} similar banao`, className = "ansp__btn ansp__btn--go", onDone }) {
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  useSimTick();
  // Ban gaye (line khaali) → "ban rahe hain" ki likhawat hatao.
  const shownBusy = busy && (busy.startsWith("📖") || busy === "…" || simBusy()) ? busy : "";
  const go = async () => {
    setErr(""); setBusy("…");
    try {
      await makeSimAuto(r, (p) => setBusy(`📖 tasveer padh raha ${Math.round(p * 100)}%`));
      setBusy(`🐋 ${SIM_PER} ban rahe hain…`);
      onDone && onDone();
    } catch (e) { setBusy(""); setErr(e.message || "Nahi bana"); }
  };
  return (
    <span className="sim-make">
      <button type="button" className={className} onClick={go} disabled={!!busy && busy !== `🐋 ${SIM_PER} ban rahe hain…`} title="Isi type ke 5 naye sawaal — yahin">{busy && busy.startsWith("📖") ? "📖…" : label}</button>
      {shownBusy ? <small>{shownBusy}</small> : null}
      {err ? <><small className="sim-err">{err}</small><Gemini20 q={{ images: imagesOf(r) }} subject={r.subject} onGroup={(g) => linkSim(r.id, g)} className={className} label="✨ Gemini se" /></> : null}
    </span>
  );
}

// Ek similar sawaal — option dabao, turant sahi/galat.
export function SimQ({ x, n, picks, onPick }) {
  const pick = picks[x.id];
  const done = pick != null;
  return (
    <div className={`sim-q${done ? (pick === x.answer ? " is-y" : " is-n") : ""}`}>
      <div className="sim-q__t"><b>{n}.</b> <Markdown inline>{x.question}</Markdown></div>
      <div className="sim-q__o">
        {x.options.map((o, k) => {
          const st = done ? (k === x.answer ? " is-y" : k === pick ? " is-n" : " is-dim") : "";
          return (
            <button key={k} type="button" className={st} disabled={done} onClick={() => { setPick(x.id, k, k === x.answer); onPick && onPick(k === x.answer, x); }}>
              <i>{String.fromCharCode(65 + k)}</i><Markdown inline>{o}</Markdown>
            </button>
          );
        })}
      </div>
      {done && x.explanation ? <div className="sim-q__x"><Markdown>{x.explanation}</Markdown></div> : null}
      {done ? <button type="button" className="sim-q__re" onClick={() => setPick(x.id, null)}>↺ dobara</button> : null}
    </div>
  );
}

// Poora khaana: banao / ban rahe / 5 sawaal + score.
export default function SimInline({ r, title = true, onPick }) {
  useSimTick();
  const items = simItems(r.id);
  const linked = simGroups(r.id).length > 0;
  const picks = getPicks();
  const right = items.filter((x) => picks[x.id] === x.answer).length;
  const tried = items.filter((x) => picks[x.id] != null).length;
  return (
    <section className="sim">
      {title ? (
        <h4 className="sim-h">🎯 Iske jaise {SIM_PER} {items.length ? <span>✓ {right}/{items.length}{tried < items.length ? ` · ${items.length - tried} baaki` : ""}</span> : null}</h4>
      ) : null}
      {!linked ? <SimMake r={r} />
        : !items.length ? (
          <p className="sim-wait">{simBusy() ? `⏳ 🐋 ${SIM_PER} similar ban rahe hain…` : `Abhi bane nahi${simError() ? ` (⚠️ ${simError()})` : ""} — `}{!simBusy() ? <SimMake r={r} label="🔁 Dobara banao" /> : null}</p>
        ) : (
          <div className="sim-list">
            {items.map((x, k) => <SimQ key={x.id} x={x} n={k + 1} picks={picks} onPick={onPick} />)}
            {items.length < SIM_PER && simBusy() ? <p className="sim-wait">⏳ baaki ban rahe hain…</p> : null}
          </div>
        )}
    </section>
  );
}

// 🎯 5 — PYQ card par (Maths / Reasoning / GS / English). /similar page hata
// diya (owner), isliye bane hue 5 YAHIN ek dabbe mein: isi sawaal ke saath
// jude (lib/anssim, id "pq:<sawaal id>"), dobara kholo to wahi.
// PYQ sawaal → similar ka record (id "pq:<sawaal id>"). Wahi sawaal kahin
// bhi aaye (chapter, set, Wrong Set) — similar wahi jude hue.
export function simRecOf(q, id, subject) {
  const text = String(q?.question || q?.qText || "").trim();
  const img = q?.qImg || q?.img || "";
  return {
    id: `pq:${id || text.slice(0, 80)}`,
    subject: subject === "maths" ? "math" : subject,
    q: text ? { question: text, options: (q?.options || []).map(String) } : null,
    images: img ? [{ url: img }] : [],
  };
}

export function SimHere({ q, id, subject, className = "btn btn--sm q-act--keep" }) {
  const [open, setOpen] = useState(false);
  const exam = useExamMode();
  useSimTick();
  const r = simRecOf(q, id, subject);
  const made = simItems(r.id).length;
  // Set test chal raha — similar nahi (owner: "result screen par hi, test par nahi").
  if (exam && exam.locked) return null;
  // Natije ke parde par: dabao → 5 aur, daayen numbers ke neeche (SimSide).
  const click = exam && exam.simSide ? () => { makeSimAuto(r).catch(() => {}); } : () => setOpen(true);
  return (
    <>
      <button type="button" className={className} onClick={click} title="Isi type ke 5 naye sawaal — yahin">🎯 {SIM_PER}{made ? <sup>{made}</sup> : null}</button>
      {open && typeof document !== "undefined" ? createPortal(
        <div className="si-ov" onClick={() => setOpen(false)}>
          <div className="si-box sim-box" onClick={(e) => e.stopPropagation()}>
            <div className="si-hd"><b>🎯 Iske jaise {SIM_PER}</b><button type="button" className="si-x" onClick={() => setOpen(false)} aria-label="Band karo">✕</button></div>
            <SimInline r={r} title={false} />
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}

// 🎯 Set ke NATIJE par daayen, numbers ke neeche — sirf abhi wale sawaal ke
// similar (owner). Har baar "5 similar" → 5 aur, pehle walon ke neeche.
export function SimSide({ r, n }) {
  useSimTick();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const items = simItems(r.id);
  const picks = getPicks();
  const right = items.filter((x) => picks[x.id] === x.answer).length;
  const want = simGroups(r.id).length * SIM_PER;
  const waiting = simBusy() && items.length < want;
  const go = async () => {
    setErr(""); setBusy("…");
    try { await makeSimAuto(r, (p) => setBusy(`📖 ${Math.round(p * 100)}%`)); } catch (e) { setErr(e.message || "Nahi bana"); }
    setBusy("");
  };
  return (
    <section className="tbt-sim">
      <div className="tbt-sim__h">
        <b>🎯 Similar · Q{n}</b>
        {items.length ? <small>✓ {right}/{items.length}</small> : null}
      </div>
      {items.length ? <div className="sim-list">{items.map((x, k) => <SimQ key={x.id} x={x} n={k + 1} picks={picks} />)}</div> : null}
      {waiting ? <p className="sim-wait">⏳ 🐋 ban rahe hain…</p> : null}
      {err || (!waiting && simError() && items.length < want) ? <p className="sim-err">⚠️ {err || simError()}</p> : null}
      <button type="button" className="tbt-sim__go" onClick={go} disabled={!!busy}>{busy || (items.length ? `🎯 ${SIM_PER} aur similar` : `🎯 ${SIM_PER} similar`)}</button>
    </section>
  );
}
