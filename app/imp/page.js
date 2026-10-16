"use client";

// ⭐ IMP — Fact log / Vocab ki ek slide ka stylus page (owner). Answers wale
// writing view (app/wrong/solve) ka chhota bhai: sirf ek page, slide ka text
// upar, aur 👻 Trace mein wahi text kaagaz ke neeche halka — dekh-dekh kar
// zaroori baatein likho. Likha hua slide par hi dikhta hai (components/ImpView
// ImpNoteBox), har device par. Likhna sirf tablet par (lib/inkdevice).
//
// Save: likhte hi device par (IndexedDB), nikalte / app chhupte hi cloud par
// (lib/ink pushInk → lib/impnotes ka pata, jo sync hota hai).

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import InkCanvas, { PALETTE, PEN_SIZES } from "@/components/InkCanvas";
import Markdown from "@/components/Markdown";
import { openInk, viewInk, saveLocalInk, pushInk, emptyDoc, flushInkQueue } from "@/lib/ink";
import { inkRecord, inkSetter } from "@/lib/impink";
import { noteRec, getImpCtx } from "@/lib/impnotes";
import { isInkWriter, setInkWriter } from "@/lib/inkdevice";
import { setSyncPaused } from "@/lib/sync";
import { storeFlush } from "@/lib/bigstore";

const LOCAL_MS = 700;

function ImpInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const k = sp.get("k") || "";
  const back = sp.get("back") || "/";
  const [ctx, setCtx] = useState(null);
  useEffect(() => { setCtx(getImpCtx(k)); }, [k]);

  const [writer, setWriter] = useState(null);
  useEffect(() => { setWriter(isInkWriter()); }, []);
  const canRef = useRef(false);
  canRef.current = writer === true;

  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState("saved");
  const [tool, setTool] = useState("pen");
  const [colorIdx, setColorIdx] = useState(0);
  const [sizeIdx, setSizeIdx] = useState(1);
  const inkRef = useRef(null);
  const liveDoc = useRef(null);
  const localT = useRef(null);

  // 👻 Trace — wahi pasand jo solution page par (is device ki).
  const [trace, setTrace] = useState(true);
  const [traceOp, setTraceOp] = useState(0.22);
  useEffect(() => {
    try {
      const t = localStorage.getItem("ink.trace");
      if (t != null) setTrace(t === "1");
      const o = Number(localStorage.getItem("ink.traceOp"));
      if (o >= 0.05 && o <= 0.6) setTraceOp(o);
    } catch { /* ignore */ }
  }, []);
  const toggleTrace = () => setTrace((v) => { try { localStorage.setItem("ink.trace", v ? "0" : "1"); } catch { /* ignore */ } return !v; });
  const putTraceOp = (o) => { setTraceOp(o); try { localStorage.setItem("ink.traceOp", String(o)); } catch { /* ignore */ } };
  const traceMd = ctx ? [`**${ctx.title || ""}**`, ...(ctx.points || []).map((p) => `- ${p}`)].join("\n\n") : "";

  // Poori screen + likhte waqt sync band (solution page jaisa).
  const [isFs, setIsFs] = useState(true);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    try { document.documentElement.requestFullscreen?.().catch(() => {}); } catch { /* ignore */ }
    const on = () => setIsFs(!!document.fullscreenElement);
    on();
    document.addEventListener("fullscreenchange", on);
    setSyncPaused(true);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("fullscreenchange", on);
      try { if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {}); } catch { /* ignore */ }
      setSyncPaused(false);
      setTimeout(() => {
        storeFlush().catch(() => {});
        try { window.dispatchEvent(new CustomEvent("cgl:sync-kick")); } catch { /* SSR */ }
      }, 0);
    };
  }, []);
  const goFs = () => { try { document.documentElement.requestFullscreen?.().catch(() => {}); } catch { /* ignore */ } };

  useEffect(() => { if (isInkWriter()) flushInkQueue(inkRecord, inkSetter).catch(() => {}); }, []);

  // Load — tablet: device ki copy final; baaki: cloud ka latest, sirf dekhna.
  useEffect(() => {
    if (!k || writer === null) return undefined;
    let alive = true;
    setLoading(true);
    (async () => {
      const r = noteRec(k);
      const d = writer ? (await openInk(r, { localFirst: true }).catch(() => null))?.doc : await viewInk(r).catch(() => null);
      if (!alive) return;
      const next = d || emptyDoc();
      liveDoc.current = next;
      setDoc(next);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [k, writer]);

  const flushLocal = useCallback(async () => {
    if (!canRef.current || !liveDoc.current || !k) return;
    if (inkRef.current?.isDrawing?.()) { clearTimeout(localT.current); localT.current = setTimeout(() => flushLocal(), 350); return; }
    clearTimeout(localT.current);
    try { await saveLocalInk(noteRec(k).id, liveDoc.current); setState("saved"); } catch { setState("offline"); }
  }, [k]);
  const flushCloud = useCallback(async () => {
    if (!canRef.current || !liveDoc.current || !k) return;
    try { await pushInk(noteRec(k), liveDoc.current, inkSetter); } catch { /* device par pada hai — InkHeal baad mein */ }
  }, [k]);
  const onChange = useCallback((next) => {
    if (!canRef.current) return;
    liveDoc.current = next;
    setState("dirty");
    clearTimeout(localT.current);
    localT.current = setTimeout(() => { flushLocal(); }, LOCAL_MS);
  }, [flushLocal]);
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === "hidden") { flushLocal(); flushCloud(); } };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
      clearTimeout(localT.current);
      flushLocal();
      flushCloud();
    };
  }, [flushLocal, flushCloud]);

  const exit = async () => { await flushLocal(); flushCloud(); router.push(back); };

  const prevTool = useRef("pen");
  const toggleEraser = () => setTool((t) => { if (t === "eraser") return prevTool.current || "pen"; prevTool.current = t; return "eraser"; });
  const can = writer === true;

  // Mi Pen ke side button (Bluetooth PageDown/PageUp) — eraser / undo, solution page jaisa.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "PageDown" || e.key === "PageUp") {
        e.preventDefault();
        if (e.repeat) return;
        if (e.key === "PageDown") toggleEraser(); else inkRef.current?.undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) inkRef.current?.redo(); else inkRef.current?.undo(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="inkv">
      <div className="inkv__top">
        <button className="btn btn--ghost btn--sm" onClick={exit} title="Wapas slide par">←</button>
        <span className="inkv__title">⭐ IMP · {ctx?.title || ""}</span>
        <span style={{ marginLeft: "auto" }} />
        {can ? <span className="inkv__pill">{state === "saved" ? "💾 saved" : state === "dirty" ? "✍️ …" : "⚠️ offline"}</span> : null}
        {!isFs && typeof document !== "undefined" && document.fullscreenEnabled ? (
          <button className="inkv__pill inkv__fs" onClick={goFs} title="Poori screen par wapas">⛶ Full screen</button>
        ) : null}
      </div>

      <div className="inkv__body">
        {ctx ? (
          <div className="inkv__q">
            <h3 style={{ margin: "0 0 8px" }}>{ctx.title}</h3>
            <ul style={{ margin: 0, paddingLeft: 20 }}>{(ctx.points || []).map((p, i) => <li key={i}><Markdown>{p}</Markdown></li>)}</ul>
          </div>
        ) : null}
        <div className="inkv__ink is-imp">
          {loading ? (
            <div className="placeholder" style={{ margin: 16 }}>Khul raha hai… ✍️</div>
          ) : (
            <InkCanvas
              ref={inkRef}
              readOnly={!can}
              underlay={trace && traceMd ? <div style={{ opacity: traceOp }}><Markdown>{traceMd}</Markdown></div> : null}
              initialDoc={doc}
              tool={tool}
              colorIdx={colorIdx}
              sizeIdx={sizeIdx}
              onChange={onChange}
            />
          )}
        </div>
      </div>

      <div className="inkv__tools">
        <button className="btn btn--ghost btn--sm" aria-pressed={trace} onClick={toggleTrace} disabled={!traceMd} title="Slide ka text kaagaz ke neeche halka">👻 Trace</button>
        {trace && traceMd ? (
          <input type="range" min="0.05" max="0.6" step="0.01" value={traceOp} onChange={(e) => putTraceOp(Number(e.target.value))} className="inkv__trace" aria-label="Trace kitna halka" />
        ) : null}
        <span className="inkv__sep" />
        {can ? (
          <>
            <button className="btn btn--ghost btn--sm" aria-pressed={tool === "pen"} onClick={() => setTool("pen")} title="Pen">✏️</button>
            <button className="btn btn--ghost btn--sm" aria-pressed={tool === "hl"} onClick={() => setTool("hl")} title="Highlighter">🖍️</button>
            <button className="btn btn--ghost btn--sm" aria-pressed={tool === "eraser"} onClick={toggleEraser} title="Eraser">🧽</button>
            <span className="inkv__sep" />
            {PALETTE.map((c, i) => (
              <button key={i} className="inkv__swatch" aria-pressed={colorIdx === i} onClick={() => { setColorIdx(i); setTool((t) => (t === "eraser" ? "pen" : t)); }} title={c.name} style={{ background: c.hex }} />
            ))}
            <span className="inkv__sep" />
            {PEN_SIZES.map((s, i) => (
              <button key={i} className="btn btn--ghost btn--sm" aria-pressed={sizeIdx === i} onClick={() => setSizeIdx(i)} title={`Size ${i + 1}`}>{["·", "•", "⬤"][i]}</button>
            ))}
            <span className="inkv__sep" />
            <button className="btn btn--ghost btn--sm" onClick={() => inkRef.current?.undo()} title="Undo">↩</button>
            <button className="btn btn--ghost btn--sm" onClick={() => inkRef.current?.redo()} title="Redo">↪</button>
            <button className="btn btn--ghost btn--sm" onClick={() => { if (confirm("Poora IMP mita du?")) inkRef.current?.clear(); }} title="Sab mitao">🗑️</button>
            <button className="btn btn--ghost btn--sm" onClick={() => inkRef.current?.grow()} title="Aur jagah jodo">➕ jagah</button>
          </>
        ) : writer === false ? (
          <span className="inkv__ro">
            👁 Sirf dekhna — likhna / mitana tablet par
            <button className="btn btn--ghost btn--sm" onClick={() => { if (confirm("Is device par likhna chalu karu? Yahan ka likha bhi final maana jayega.")) { setInkWriter(true); setWriter(true); } }}>✍️ Ye mera tablet hai</button>
          </span>
        ) : null}
      </div>
    </div>
  );
}

export default function ImpPage() {
  return (
    <Suspense fallback={<div className="placeholder">Loading…</div>}>
      <ImpInner />
    </Suspense>
  );
}
