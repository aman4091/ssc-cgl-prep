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
import { noteRec, getImpCtx, putImpCtx, getImpNote, setImpNoteMeta, allImpNoteKeys } from "@/lib/impnotes";
import { isInkWriter, setInkWriter } from "@/lib/inkdevice";
import { setSyncPaused } from "@/lib/sync";
import { loadSlide, findSlide } from "@/lib/pyqnotes";
import "../pyq-notes/pn.css";
import { storeFlush } from "@/lib/bigstore";

const LOCAL_MS = 700;

function ImpInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const k = sp.get("k") || "";
  const back = sp.get("back") || "/";
  const [ctx, setCtx] = useState(null);
  // ‹ › — Fact log / Vocab ki poori list (slide ne jaate waqt rakhi, sessionStorage).
  const [list, setList] = useState(null);
  useEffect(() => {
    try { const l = JSON.parse(sessionStorage.getItem("imp.list") || "null"); if (l && Array.isArray(l.items)) setList(l); } catch { /* ignore */ }
  }, []);
  // ➕ Ek slide par kai IMP (Notes — owner: "extra imp bhi add kar sakte").
  // Pehla IMP = slide ki chaabi, baaki usi ke aage #2, #3… (PDF ke ➕ IMP jaisa).
  const base = k.replace(/#\d+$/, "");
  const slotN = /#(\d+)$/.test(k) ? Number(k.match(/#(\d+)$/)[1]) : 1;
  const multi = base.startsWith("pn:");
  // ✍️ Maths ka Rough (kind "pnr") — IMP se alag: na ⭐ naam, na ➕ IMP.
  const rough = base.startsWith("pnr:");
  const head = rough ? "✍️ Rough" : "⭐ IMP";
  const [slots, setSlots] = useState(1);
  useEffect(() => {
    if (!multi) return;
    let n = slotN;
    for (const x of allImpNoteKeys()) {
      const m = x.startsWith(base + "#") ? x.slice(base.length + 1) : null;
      if (m && /^\d+$/.test(m)) n = Math.max(n, Number(m));
    }
    setSlots(n);
  }, [k, base, slotN, multi]);
  const pos = list ? list.items.findIndex((x) => x.k === k || x.k === base) : -1;
  // 📘 Notes ki slide: upar (aur 👻 Trace mein) POORI slide — table, diagram
  // sab — sirf text ki lines nahi (owner: shabd jude hue aa rahe the).
  const [slideHtml, setSlideHtml] = useState("");
  useEffect(() => {
    setSlideHtml("");
    const m = base.match(/^pnr?:([^.]+)\.(.+)$/);
    if (!m) return undefined;
    let alive = true;
    let t = "";
    try { t = new URL(getImpNote(base)?.meta?.href || "", window.location.origin).searchParams.get("t") || ""; } catch { /* ignore */ }
    // ‹ › se aayi slide / purana IMP — topic list se, warna poori book mein dhoondo.
    if (!t && list?.book === m[1] && list.items.some((x) => x.k === base)) t = list.t || "";
    (async () => {
      let s = t ? await loadSlide(m[1], t, m[2]).catch(() => null) : null;
      if (!s) s = (await findSlide(m[1], m[2]).catch(() => null))?.slide || null;
      if (alive && s) setSlideHtml(s.body);
    })();
    return () => { alive = false; };
  }, [base, list]);
  useEffect(() => {
    const it = list && pos >= 0 ? list.items[pos] : null;
    setCtx(it ? { title: it.title, points: it.points } : getImpCtx(k));
  }, [k, list, pos]);

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
  // ‹ › se aayi slide par pehli baar likha — Saare IMP mein book / link ke saath dikhe.
  const metaFor = () => {
    if (!list?.book || getImpNote(base)?.meta) return;
    const it = list.items.find((x) => x.k === base);
    if (!it) return;
    setImpNoteMeta(base, { title: it.title, src: list.src || "", book: list.book, bookName: list.bookName || "", href: `/pyq-notes?b=${list.book}&t=${list.t}&s=${it.s ?? 0}` });
  };
  const onChange = useCallback((next) => {
    if (!canRef.current) return;
    if (/^pnr?:/.test(base)) metaFor();
    liveDoc.current = next;
    setState("dirty");
    clearTimeout(localT.current);
    localT.current = setTimeout(() => { flushLocal(); }, LOCAL_MS);
  }, [flushLocal, base, list]); // eslint-disable-line react-hooks/exhaustive-deps
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
  // Agli / pichhli slide ka IMP — pehle abhi wala bacha lo; lautne par wahi slide khule.
  const goTo = async (i) => {
    if (!list || i < 0 || i >= list.items.length) return;
    await flushLocal();
    flushCloud();
    try { sessionStorage.setItem("slide.back", JSON.stringify({ kind: list.kind, at: i })); } catch { /* ignore */ }
    router.replace(`/imp?k=${encodeURIComponent(list.items[i].k)}&back=${encodeURIComponent(back)}`);
  };

  // Isi slide ka doosra IMP — naya khaali kaagaz (ya pehle wala), wapas usi slide par.
  const goSlot = async (n) => {
    await flushLocal();
    flushCloud();
    const nk = n <= 1 ? base : `${base}#${n}`;
    const c = ctx || getImpCtx(base);
    if (c) putImpCtx(nk, c);
    const m = getImpNote(base)?.meta;
    if (m && n > 1) setImpNoteMeta(nk, { ...m, title: `${(m.title || "").replace(/ · IMP \d+$/, "")} · IMP ${n}` });
    router.replace(`/imp?k=${encodeURIComponent(nk)}&back=${encodeURIComponent(back)}`);
  };

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
      if (e.key === "ArrowRight" && pos >= 0) { goTo(pos + 1); return; }
      if (e.key === "ArrowLeft" && pos >= 0) { goTo(pos - 1); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) inkRef.current?.redo(); else inkRef.current?.undo(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="inkv">
      <div className="inkv__top">
        <button className="btn btn--ghost btn--sm" onClick={exit} title="Wapas slide par">←</button>
        <span className="inkv__title">{head} · {ctx?.title || ""}</span>
        <span style={{ marginLeft: "auto" }} />
        {list && pos >= 0 ? (
          <span className="inkv__nav">
            <button className="btn btn--ghost btn--sm" onClick={() => goTo(pos - 1)} disabled={pos <= 0} title={`Pichhli slide ka ${head}`}>‹ Pichhla</button>
            <span className="inkv__pill">{pos + 1}/{list.items.length}</span>
            <button className="btn btn--ghost btn--sm" onClick={() => goTo(pos + 1)} disabled={pos >= list.items.length - 1} title={`Agli slide ka ${head}`}>Agla ›</button>
          </span>
        ) : null}
        {multi ? (
          <span className="inkv__nav">
            {Array.from({ length: slots }, (_, i) => i + 1).map((n) => (
              <button key={n} className="btn btn--ghost btn--sm" aria-pressed={n === slotN} onClick={() => n !== slotN && goSlot(n)} title={`Is slide ka IMP ${n}`}>⭐{n}</button>
            ))}
            {can ? <button className="btn btn--ghost btn--sm" onClick={() => goSlot(slots + 1)} title="Isi slide par ek aur IMP">➕ IMP</button> : null}
          </span>
        ) : null}
        {can ? <span className="inkv__pill">{state === "saved" ? "💾 saved" : state === "dirty" ? "✍️ …" : "⚠️ offline"}</span> : null}
        {!isFs && typeof document !== "undefined" && document.fullscreenEnabled ? (
          <button className="inkv__pill inkv__fs" onClick={goFs} title="Poori screen par wapas">⛶ Full screen</button>
        ) : null}
      </div>

      <div className="inkv__body">
        {ctx ? (
          <div className="inkv__q">
            <h3 style={{ margin: "0 0 8px" }}>{ctx.title}</h3>
            {slideHtml ? (
              <div className="pn pn-imp-slide"><div className="pn-body" dangerouslySetInnerHTML={{ __html: slideHtml }} /></div>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 20 }}>{(ctx.points || []).map((p, i) => <li key={i}><Markdown>{p}</Markdown></li>)}</ul>
            )}
          </div>
        ) : null}
        <div className="inkv__ink is-imp">
          {loading ? (
            <div className="placeholder" style={{ margin: 16 }}>Khul raha hai… ✍️</div>
          ) : (
            <InkCanvas
              ref={inkRef}
              readOnly={!can}
              underlay={trace && traceMd ? (
                <div style={{ opacity: traceOp }}>
                  {slideHtml ? (
                    <div className="pn pn-imp-slide"><h3>{ctx?.title}</h3><div className="pn-body" dangerouslySetInnerHTML={{ __html: slideHtml }} /></div>
                  ) : <Markdown>{traceMd}</Markdown>}
                </div>
              ) : null}
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
            <button className="btn btn--ghost btn--sm" onClick={() => { if (confirm(`Poora ${rough ? "Rough" : "IMP"} mita du?`)) inkRef.current?.clear(); }} title="Sab mitao">🗑️</button>
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
