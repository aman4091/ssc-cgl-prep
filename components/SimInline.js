"use client";

// 🎯 Ek galat sawaal ke 5 similar — Answers page par WAHIN (lib/anssim).
// Na bane hon to "🎯 5 similar banao": likha hua text ho (q / OCR) to seedha
// 🐋 DeepSeek ko; sirf tasveer ho to Gemini wala raasta (components/Gemini20).
// Har similar ek chhota MCQ: option dabao → sahi / galat + samjhaana.

import { useEffect, useState } from "react";
import Markdown from "./Markdown";
import Gemini20 from "./Gemini20";
import { imagesOf } from "@/lib/wrongbook";
import { simItems, simGroups, makeSim, linkSim, recText, simBusy, getPicks, setPick, SIM_PER } from "@/lib/anssim";

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

export function SimMake({ r, label = `🎯 ${SIM_PER} similar banao` }) {
  const [msg, setMsg] = useState("");
  if (recText(r)) {
    return (
      <span className="sim-make">
        <button type="button" className="ansp__btn ansp__btn--go" onClick={() => { makeSim(r); setMsg(`🐋 ${SIM_PER} ban rahe hain…`); }}>{label}</button>
        {msg ? <small>{msg}</small> : null}
      </span>
    );
  }
  return <Gemini20 q={{ images: imagesOf(r) }} subject={r.subject} onGroup={(g) => linkSim(r.id, g)} className="ansp__btn ansp__btn--go" label={label} />;
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
          <p className="sim-wait">{simBusy() ? `⏳ 🐋 ${SIM_PER} similar ban rahe hain…` : "Abhi bane nahi — "}{!simBusy() ? <SimMake r={r} label="🔁 Dobara banao" /> : null}</p>
        ) : (
          <div className="sim-list">
            {items.map((x, k) => <SimQ key={x.id} x={x} n={k + 1} picks={picks} onPick={onPick} />)}
            {items.length < SIM_PER && simBusy() ? <p className="sim-wait">⏳ baaki ban rahe hain…</p> : null}
          </div>
        )}
    </section>
  );
}
