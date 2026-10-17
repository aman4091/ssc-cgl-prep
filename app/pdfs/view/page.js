"use client";

// 📄 PDF ka ek page — stylus se (owner). Page 👻 Trace ki tarah kaagaz ke NEECHE
// (halkapan slider se, poora gaadha bhi — seedha page par likho), baayen wahi
// page saaf. "✍️ Notes" aur "⭐ IMP" do alag kaagaz (lib/impnotes:
// pdfink:<id>:<page> / pdfimp:<id>:<page>). ‹ › se agla / pichhla page.
// Likhna sirf tablet par (lib/inkdevice); baaki device par sirf dekhna. PDF
// khud sirf tablet par hoti hai — PC par page ki jagah sirf likha / IMP.

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import InkCanvas, { PALETTE, PEN_SIZES } from "@/components/InkCanvas";
import { openInk, viewInk, saveLocalInk, pushInk, emptyDoc, flushInkQueue } from "@/lib/ink";
import { inkRecord, inkSetter } from "@/lib/impink";
import { noteRec } from "@/lib/impnotes";
import { getPdf, getPdfBlob, openPdfDoc, renderPage, pdfInkKey, pdfImpKey } from "@/lib/pdfstore";
import { isInkWriter, setInkWriter } from "@/lib/inkdevice";
import { setSyncPaused } from "@/lib/sync";
import { storeFlush } from "@/lib/bigstore";

const LOCAL_MS = 700;
const docCache = new Map();   // pdf id → pdf.js doc (is tab mein)
const pageCache = new Map();  // "<id>:<p>" → dataURL

function ViewInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const id = sp.get("id") || "";
  const p = Math.max(1, Number(sp.get("p")) || 1);
  const [mode, setMode] = useState("ink");     // "ink" (✍️ Notes) | "imp" (⭐ IMP)
  const modeRef = useRef("ink");
  modeRef.current = mode;
  const keyOf = (m = modeRef.current) => (m === "imp" ? pdfImpKey(id, p) : pdfInkKey(id, p));

  const [rec, setRec] = useState(null);
  useEffect(() => { setRec(getPdf(id)); }, [id]);
  const pages = rec?.pages || 1;

  // Page ki tasveer
  const [img, setImg] = useState("");
  const [msg, setMsg] = useState("");
  useEffect(() => {
    if (!rec) return undefined;
    let alive = true;
    const ck = `${id}:${p}`;
    if (pageCache.has(ck)) { setImg(pageCache.get(ck)); return undefined; }
    setImg("");
    (async () => {
      try {
        let doc = docCache.get(id);
        if (!doc) {
          const blob = await getPdfBlob(rec);
          doc = await openPdfDoc(blob);
          docCache.set(id, doc);
        }
        setMsg("📖 page bana raha…");
        const url = await renderPage(doc, p, 1400);
        pageCache.set(ck, url);
        if (alive) { setImg(url); setMsg(""); }
      } catch (e) { if (alive) setMsg(`📱 ${e.message || "PDF nahi khuli"}`); }
    })();
    return () => { alive = false; };
  }, [rec, id, p]);

  const [writer, setWriter] = useState(null);
  useEffect(() => { setWriter(isInkWriter()); }, []);
  const canRef = useRef(false);
  canRef.current = writer === true;
  const can = writer === true;

  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState("saved");
  const [tool, setTool] = useState("pen");
  const [colorIdx, setColorIdx] = useState(0);
  const [sizeIdx, setSizeIdx] = useState(1);
  const [slim, setSlim] = useState(false);
  const inkRef = useRef(null);
  const liveDoc = useRef(null);
  // Jo doc kaagaz par hai wo KIS kaagaz ka hai — save hamesha usi par (page / mode
  // badalte waqt doc aur pehchaan kabhi alag na hon).
  const docKey = useRef("");
  const localT = useRef(null);

  // 👻 Trace — PDF ke liye apna halkapan (page par seedha likhna ho to poora gaadha).
  const [trace, setTrace] = useState(true);
  const [traceOp, setTraceOp] = useState(0.35);
  useEffect(() => {
    try {
      const t = localStorage.getItem("pdf.trace");
      if (t != null) setTrace(t === "1");
      const o = Number(localStorage.getItem("pdf.traceOp"));
      if (o >= 0.05 && o <= 1) setTraceOp(o);
    } catch { /* ignore */ }
  }, []);
  const toggleTrace = () => setTrace((v) => { try { localStorage.setItem("pdf.trace", v ? "0" : "1"); } catch { /* ignore */ } return !v; });
  const putTraceOp = (o) => { setTraceOp(o); try { localStorage.setItem("pdf.traceOp", String(o)); } catch { /* ignore */ } };

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

  // Load — tablet: device ki copy final; baaki: cloud, sirf dekhna.
  useEffect(() => {
    if (!id || writer === null) return undefined;
    let alive = true;
    setLoading(true);
    (async () => {
      const kk = keyOf(mode);
      const r = noteRec(kk);
      const d = writer ? (await openInk(r, { localFirst: true }).catch(() => null))?.doc : await viewInk(r).catch(() => null);
      if (!alive) return;
      const next = d || emptyDoc();
      liveDoc.current = next;
      docKey.current = kk;
      setDoc(next);
      setLoading(false);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, p, mode, writer]);

  const flushLocal = useCallback(async () => {
    const kk = docKey.current;
    if (!canRef.current || !liveDoc.current || !kk) return;
    if (inkRef.current?.isDrawing?.()) { clearTimeout(localT.current); localT.current = setTimeout(() => flushLocal(), 350); return; }
    clearTimeout(localT.current);
    try { await saveLocalInk(noteRec(kk).id, liveDoc.current); setState("saved"); } catch { setState("offline"); }
  }, []);
  const flushCloud = useCallback(async () => {
    const kk = docKey.current;
    if (!canRef.current || !liveDoc.current || !kk) return;
    try { await pushInk(noteRec(kk), liveDoc.current, inkSetter); } catch { /* InkHeal baad mein */ }
  }, []);
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

  const save = async () => { await flushLocal(); flushCloud(); };
  const exit = async () => { await save(); router.push("/pdfs"); };
  const goPage = async (n) => {
    if (n < 1 || n > pages) return;
    await save();
    setMode("ink");
    router.replace(`/pdfs/view?id=${encodeURIComponent(id)}&p=${n}`);
  };
  const switchMode = async (m) => { if (m === modeRef.current) return; await save(); setMode(m); };

  const prevTool = useRef("pen");
  const toggleEraser = () => setTool((t) => { if (t === "eraser") return prevTool.current || "pen"; prevTool.current = t; return "eraser"; });
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "PageDown" || e.key === "PageUp") {
        e.preventDefault();
        if (e.repeat) return;
        if (e.key === "PageDown") toggleEraser(); else inkRef.current?.undo();
        return;
      }
      if (e.key === "ArrowRight") { goPage(p + 1); return; }
      if (e.key === "ArrowLeft") { goPage(p - 1); return; }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) inkRef.current?.redo(); else inkRef.current?.undo(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!rec) {
    return (
      <div className="inkv">
        <div className="inkv__top"><button className="btn btn--ghost btn--sm" onClick={() => router.push("/pdfs")}>←</button><span className="inkv__title">PDF nahi mili (shayad abhi sync nahi hui)</span></div>
      </div>
    );
  }

  return (
    <div className="inkv">
      <div className="inkv__top">
        <button className="btn btn--ghost btn--sm" onClick={exit} title="PDFs par wapas">←</button>
        <span className="inkv__title">📄 {rec.name} · page {p}</span>
        <span style={{ marginLeft: "auto" }} />
        <span className="inkv__nav">
          <button className="btn btn--ghost btn--sm" onClick={() => goPage(p - 1)} disabled={p <= 1}>‹ Pichhla</button>
          <span className="inkv__pill">{p}/{pages}</span>
          <button className="btn btn--ghost btn--sm" onClick={() => goPage(p + 1)} disabled={p >= pages}>Agla ›</button>
        </span>
        {can ? <span className="inkv__pill">{state === "saved" ? "💾 saved" : state === "dirty" ? "✍️ …" : "⚠️ offline"}</span> : null}
        {!isFs && typeof document !== "undefined" && document.fullscreenEnabled ? (
          <button className="inkv__pill inkv__fs" onClick={goFs} title="Poori screen par wapas">⛶ Full screen</button>
        ) : null}
      </div>

      <div className="inkv__body">
        <div className={`inkv__q${slim ? " inkv__q--slim" : ""}`}>
          <button className="btn btn--ghost btn--sm" onClick={() => setSlim((v) => !v)} style={{ marginBottom: 8 }}>{slim ? "▼" : "▲ Chhupao"}</button>
          {!slim ? (img ? <img src={img} alt={`page ${p}`} /> : <p className="hint">{msg || "…"}</p>) : null}
        </div>
        <div className={`inkv__ink${mode === "imp" ? " is-imp" : ""}`}>
          {mode === "imp" ? <div className="inkv__imphd">⭐ IMP — page {p} · jo zaroori hai yahan likho</div> : null}
          {loading ? (
            <div className="placeholder" style={{ margin: 16 }}>Khul raha hai… ✍️</div>
          ) : (
            <InkCanvas
              ref={inkRef}
              readOnly={!can}
              underlay={trace && img ? <img src={img} alt="" style={{ opacity: traceOp }} /> : null}
              underlayClass="ink-under--img"
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
        <button className="btn btn--ghost btn--sm" aria-pressed={trace} onClick={toggleTrace} title="PDF ka page kaagaz ke neeche">👻 Trace</button>
        {trace ? <input type="range" min="0.05" max="1" step="0.01" value={traceOp} onChange={(e) => putTraceOp(Number(e.target.value))} className="inkv__trace" aria-label="Page kitna gaadha" /> : null}
        <button className="btn btn--ghost btn--sm inkv__imp" aria-pressed={mode === "imp"} onClick={() => switchMode(mode === "imp" ? "ink" : "imp")}>{mode === "imp" ? "✍️ Notes" : "⭐ IMP"}</button>
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
            <button className="btn btn--ghost btn--sm" onClick={() => { if (confirm("Is page ki poori writing mita du?")) inkRef.current?.clear(); }} title="Sab mitao">🗑️</button>
            <button className="btn btn--ghost btn--sm" onClick={() => inkRef.current?.grow()} title="Aur jagah">➕ jagah</button>
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

export default function PdfViewPage() {
  return <Suspense fallback={<div className="placeholder">Loading…</div>}><ViewInner /></Suspense>;
}
