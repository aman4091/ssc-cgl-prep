"use client";

// 🤖 AI run — "is chapter ke agle 5 question AI se karwa do".
//
// Overlay ke button se yahi page khulta hai. Do kadam:
//
//   1. Kitne question (5 / 10 / 15 …) aur kahan se — PYQ bank ka chapter,
//      Answers ka subject, ya Vocab. Sirf naam ki list, aur kuch nahi.
//   2. Phir ek-ek karke: question clipboard par jata hai (tasveer wale bank
//      mein tasveer), AI site apne tab mein khulti hai, tum paste karte ho,
//      jawab copy karke yahan paste karte ho — jawab us question par save,
//      wo tab band, aur agla question apne aap khul jata hai.
//
// Utne hi question jitne tumne chune. Jinka jawab pehle se hai wo apne aap
// chhoot jaate hain (lib/airun).

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AI_SOURCES, loadList, loadJobs } from "@/lib/airun";
import { copyImageToClipboard } from "@/lib/imgclip";
import { promptFor, armPrompt } from "@/lib/geminiask";
import { aiSiteUrl, aiSiteLabel } from "@/lib/aisites";
import { getSettings } from "@/lib/storage";
import { overlayBase, overlayAsk, overlayAnswer, overlayStop, blobToB64 } from "@/lib/overlaylink";

const COUNTS = [5, 10, 15, 20, 30];

export default function AiRunPage() {
  const [count, setCount] = useState(5);
  const [open, setOpen] = useState("");          // khula hua source
  const [lists, setLists] = useState({});        // key -> [{slug,label,count}]
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  // chal raha run
  const [run, setRun] = useState(null);          // { name, jobs, total, pending }
  const [i, setI] = useState(0);
  const [answer, setAnswer] = useState("");
  const [blocked, setBlocked] = useState(false); // tab khul hi nahi paya
  const [viaOverlay, setViaOverlay] = useState(null);  // null = abhi pata nahi
  const win = useRef(null);
  const poll = useRef(null);
  // Har question ka apna number. ⏭ Chhodo dabate hi agla question chala
  // jata hai, par pichhle ka jawab tab bhi aa sakta hai — number se pata
  // chal jata hai ki wo jawab kiska tha, aur galat question par nahi lagta.
  const jobIdOf = (job) => `${job.id}`;
  const waitingFor = useRef("");

  // Overlay chal raha hai? Uske saath poora loop apne aap chalta hai: wo
  // clipboard, tab aur Ctrl+W sambhalta hai aur jawab yahan bhej deta hai.
  useEffect(() => {
    let alive = true;
    overlayBase().then((b) => { if (alive) setViaOverlay(!!b); });
    return () => { alive = false; };
  }, []);

  const site = getSettings().askAiSite;
  const label = aiSiteLabel(site);

  const expand = async (src) => {
    setErr("");
    if (open === src.key) { setOpen(""); return; }
    setOpen(src.key);
    if (lists[src.key]) return;
    setBusy(src.key);
    try {
      const items = await loadList(src);
      setLists((m) => ({ ...m, [src.key]: items }));
    } catch { setErr("Ye list load nahi hui."); } finally { setBusy(""); }
  };

  // Question clipboard par + AI site kholo.
  const send = useCallback(async (job) => {
    setBlocked(false);
    setAnswer("");
    const prompt = promptFor(job.subject, "geminiPrompt");
    let ok = true;

    // Overlay ke raaste: wahi clipboard par daalta hai, AI site kholta hai,
    // jawab copy hote hi tab band karke jawab yahan bhej deta hai.
    if (viaOverlay) {
      // Bank ki tasveer R2 par hai aur wahan CORS header nahi — browser use
      // padh hi nahi sakta. Isliye URL overlay ko dete hain, wo khud utha
      // leta hai. Jo tasveer sirf is browser mein hai (Answers ka
      // screenshot) wo base64 mein jati hai.
      let imageB64 = "";
      let imageUrl = "";
      if (job.kind === "image") {
        if (job.imgUrl) imageUrl = new URL(job.imgUrl, window.location.href).href;
        else if (job.blob) {
          try { imageB64 = await blobToB64(await job.blob()); } catch { imageB64 = ""; }
        }
      }
      const hasImg = !!(imageUrl || imageB64);
      const text = hasImg ? prompt : [prompt, job.text].filter(Boolean).join("\n\n");
      waitingFor.current = jobIdOf(job);
      const sent = await overlayAsk({
        text, imageB64, imageUrl, subject: job.subject, jobId: jobIdOf(job),
      });
      if (sent) return;
      setViaOverlay(false);          // overlay beech mein band ho gaya
    }
    if (job.kind === "image" && job.imgUrl) {
      ok = await copyImageToClipboard(async () => (await fetch(job.imgUrl)).blob());
      // Tasveer clipboard par hai to prompt saath nahi ja sakta — wapas aate
      // hi wo apne aap copy ho jata hai (lib/geminiask ka armPrompt).
      if (prompt) armPrompt(prompt);
    } else {
      const text = prompt ? `${prompt}\n\n${job.text}` : job.text;
      try { await navigator.clipboard.writeText(text); } catch { ok = false; }
    }
    // EK hi tab, baar-baar wahi.
    //
    // "noopener" jaan-boojh kar nahi: uske saath window.open null deta hai
    // aur tab ka haath hi nahi milta. Aur naam ("airun") se dobara wahi tab
    // milna bharose ka nahi — Gemini par jaate hi cross-origin navigation
    // window ka naam mita deti hai. Isliye haath pakad kar rakhte hain: agla
    // question usi khule tab ko naye pate par bhej deta hai, naya tab nahi
    // kholta (warna paanch question = paanch tab).
    const url = aiSiteUrl(site);
    try {
      if (win.current && !win.current.closed) {
        win.current.location.href = url;
        win.current.focus();
      } else {
        win.current = window.open(url, "airun");
        if (!win.current) setBlocked(true);
      }
    } catch { setBlocked(true); }
    if (!ok) setErr("Clipboard par copy nahi hua — question/tasveer khud copy karni padegi.");
  }, [site, viaOverlay]);

  const start = async (src, item) => {
    setErr("");
    setBusy(`${src.key}:${item.slug}`);
    try {
      const { jobs, total, pending } = await loadJobs(src, item.slug, count, item);
      if (!jobs.length) { setErr("Yahan koi question hi nahi hai."); return; }
      setRun({ name: `${src.icon} ${src.name} · ${item.label}`, jobs, total, pending });
      setI(0);
      await send(jobs[0]);
    } catch { setErr("Question load nahi hue."); } finally { setBusy(""); }
  };

  const closeTab = () => {
    try { win.current?.close(); } catch { /* ignore */ }
    win.current = null;
  };

  const next = async (saveText) => {
    const job = run.jobs[i];
    if (saveText) {
      try { job.save(saveText); } catch { setErr("Save nahi hua (jagah kam?)."); }
    }
    const n = i + 1;
    setI(n);
    setAnswer("");
    // Agla question usi tab mein; aakhri ke baad tab band.
    if (n < run.jobs.length) await send(run.jobs[n]);
    else closeTab();
  };

  const stop = () => {
    closeTab();
    if (viaOverlay) overlayStop();
    setRun(null); setI(0); setAnswer(""); setBlocked(false);
  };

  // Overlay ke saath: jawab copy hote hi wo yahan aa jata hai — save aur
  // agla question apne aap. Haath se paste karne ki zaroorat nahi.
  useEffect(() => {
    if (!run || !viaOverlay || i >= run.jobs.length) return undefined;
    let alive = true;
    poll.current = setInterval(async () => {
      const { ready, text, job } = await overlayAnswer();
      if (!alive || !ready || !text) return;
      // Chhode hue question ka purana jawab agle par nahi lagna chahiye.
      if (job && waitingFor.current && job !== waitingFor.current) return;
      await next(text);
    }, 1200);
    return () => { alive = false; clearInterval(poll.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, viaOverlay, i]);

  useEffect(() => () => { try { win.current?.close(); } catch { /* ignore */ } }, []);

  // ── chal raha hai ──────────────────────────────────────────────────────
  if (run) {
    const done = i >= run.jobs.length;
    const job = run.jobs[i];
    return (
      <section className="section airun">
        <div className="row between" style={{ gap: 10, flexWrap: "wrap" }}>
          <strong>{run.name}</strong>
          <button className="btn btn--ghost btn--sm" onClick={stop}>⏹ Band karo</button>
        </div>

        {done ? (
          <div className="airun__done">
            <div className="airun__big">{run.jobs.length}</div>
            <p>question ho gaye ✓</p>
            <button className="btn btn--primary" onClick={stop}>Theek hai</button>
          </div>
        ) : (
          <>
            <div className="airun__bar">
              <span>Question {i + 1} / {run.jobs.length}</span>
              <span className="muted">
                {job?.done ? "✨ pehle se jawab hai — naya isi ke upar" : `${run.pending} is list mein`}
              </span>
            </div>
            <div className="airun__q">{job.title}</div>

            {blocked && (
              <button className="btn btn--primary mt-8" onClick={() => send(job)}>
                ▶ {label} kholo (tab block ho gaya tha)
              </button>
            )}

            {viaOverlay ? (
              <p className="hint mt-8">
                🖥️ Overlay chal raha hai — {label} mein paste karo aur jawab COPY kar lo.
                Bas: tab apne aap band hoga, jawab yahan save hoga aur agla question khul jayega.
              </p>
            ) : null}

            <p className="hint mt-8">
              {job.kind === "image"
                ? `🖼️ Tasveer copy ho gayi — ${label} mein paste karo; wapas aate hi prompt apne aap copy hoga, usko bhi paste karo.`
                : `📋 Prompt + question copy ho gaya — ${label} mein paste karo.`}
              {" "}Jawab copy karke neeche paste karo.
            </p>

            <textarea
              className="textarea input mt-8"
              rows={6}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder={`${label} ka jawab yahan paste karo…`}
            />
            <div className="row mt-8" style={{ gap: 8, flexWrap: "wrap" }}>
              <button className="btn btn--primary" onClick={() => next(answer.trim())} disabled={!answer.trim()}>
                💾 Save aur agla
              </button>
              <button
                className="btn btn--ghost"
                onClick={() => next("")}
                title="Ye question chhod kar agla kholo (jawab save nahi hoga)"
              >⏭ Chhodo</button>
              <button className="btn btn--ghost" onClick={() => send(job)}>🔁 Phir se kholo</button>
            </div>
          </>
        )}
        {err && <p className="ansp__err mt-8">{err}</p>}
      </section>
    );
  }

  // ── chunav ─────────────────────────────────────────────────────────────
  return (
    <section className="section airun">
      <div className="row between" style={{ gap: 10, flexWrap: "wrap" }}>
        <strong>🤖 AI run</strong>
        <label className="row" style={{ gap: 6, alignItems: "center" }}>
          <span className="hint">Kitne question:</span>
          <select className="input airun__count" value={count} onChange={(e) => setCount(Number(e.target.value))}>
            {COUNTS.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>
      <p className="hint mt-8">
        Jagah chuno — utne question ek-ek karke {label} par khulenge, usi kram mein jo us page par hai
        (jahan tum pahunche ho wahin se). Jis par pehle se jawab hai wo bhi aata hai — naya jawab
        purane ki jagah le leta hai.
      </p>
      {err && <p className="ansp__err mt-8">{err}</p>}

      <div className="airun__list mt-12">
        {AI_SOURCES.map((src) => (
          <div key={src.key} className="airun__src">
            <button className="airun__head" onClick={() => expand(src)}>
              <span>{src.icon} {src.name}</span>
              <span className="muted">{open === src.key ? "▾" : "▸"}</span>
            </button>
            {open === src.key && (
              <div className="airun__items">
                {busy === src.key ? <span className="hint">Load ho raha hai…</span> : null}
                {(lists[src.key] || []).map((it) => (
                  <button
                    key={it.slug}
                    className="airun__item"
                    disabled={busy === `${src.key}:${it.slug}`}
                    onClick={() => start(src, it)}
                  >
                    {it.label}{it.count ? <span className="muted"> · {it.count}</span> : null}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="hint mt-12"><Link href="/" className="link">← Home</Link></p>
    </section>
  );
}
