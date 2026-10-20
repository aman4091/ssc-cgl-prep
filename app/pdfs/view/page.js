"use client";

// 📄 PDF ka ek page — stylus se (owner). Page 👻 Trace ki tarah kaagaz ke NEECHE
// (halkapan slider se, poora gaadha bhi — seedha page par likho), baayen wahi
// page saaf. Sirf ⭐ IMP ka kaagaz (owner: "normal vaala rehne de") —
// lib/impnotes pdfimp:<id>:<page>; purana "Notes" (pdfink) IMP mein jud jata
// hai (lib/pdfstore movePdfNotesToImp). ‹ › se agla / pichhla page.
// Likhna sirf tablet par (lib/inkdevice); baaki device par sirf dekhna. PDF
// khud sirf tablet par hoti hai — PC par page ki jagah sirf likha / IMP.

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import InkCanvas, { PALETTE, PEN_SIZES } from "@/components/InkCanvas";
import { openInk, viewInk, saveLocalInk, pushInk, emptyDoc, flushInkQueue } from "@/lib/ink";
import { inkRecord, inkSetter } from "@/lib/impink";
import { noteRec } from "@/lib/impnotes";
import { getPdf, getPdfBlob, openPdfDoc, renderPage, pdfImpKey, movePdfNotesToImp } from "@/lib/pdfstore";
import { allImpNotes } from "@/lib/impnotes";
import { localInkCounts } from "@/lib/ink";
import { isInkWriter, setInkWriter } from "@/lib/inkdevice";
import { setSyncPaused } from "@/lib/sync";
import { storeFlush } from "@/lib/bigstore";

const LOCAL_MS = 700;
const docCache = new Map();   // pdf id → pdf.js doc (is tab mein)
const pageCache = new Map();  // "<id>:<p>" → dataURL

// 📑 Saare page ki list — 200 page ki PDF mein 129 par jaane ke liye ek-ek
// "Agla" dabana na pade (owner). Chhoti tasveer (thumbnail) sirf tab banti
// hai jab wo page list mein saamne aata hai, aur ek baar bani to yaad rehti
// hai. PDF is device par na ho (PC) to sirf number dikhte hain.
const thumbCache = new Map();
function Thumb({ rec, id, n }) {
  const ref = useRef(null);
  const ck = `${id}:${n}`;
  const [src, setSrc] = useState(() => thumbCache.get(ck) || "");
  useEffect(() => {
    if (src || !rec) return undefined;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return undefined;
    let alive = true;
    const io = new IntersectionObserver(async (es) => {
      if (!es.some((e) => e.isIntersecting)) return;
      io.disconnect();
      try {
        let doc = docCache.get(id);
        if (!doc) { doc = await openPdfDoc(await getPdfBlob(rec)); docCache.set(id, doc); }
        const url = await renderPage(doc, n, 180);
        thumbCache.set(ck, url);
        if (alive) setSrc(url);
      } catch { /* PDF yahan nahi — sirf number */ }
    }, { rootMargin: "300px" });
    io.observe(el);
    return () => { alive = false; io.disconnect(); };
  }, [src, rec, id, n, ck]);
  return <span ref={ref} className="pgl__img">{src ? <img src={src} alt="" /> : null}</span>;
}

function PageList({ rec, id, pages, cur, impPages, onPick, onClose }) {
  const [q, setQ] = useState("");
  const box = useRef(null);
  // Khulte hi abhi wala page saamne.
  useEffect(() => {
    const el = box.current?.querySelector(`[data-pg="${cur}"]`);
    if (el) el.scrollIntoView({ block: "center" });
  }, [cur]);
  const go = (e) => {
    e.preventDefault();
    const x = Math.round(Number(q));
    if (x >= 1 && x <= pages) onPick(x);
  };
  return (
    <div className="pgl" onClick={onClose}>
      <div className="pgl__box" onClick={(e) => e.stopPropagation()}>
        <div className="pgl__hd">
          <b>📑 Saare page · {pages}</b>
          <form onSubmit={go} className="pgl__go">
            <input
              type="number" inputMode="numeric" min="1" max={pages}
              value={q} onChange={(e) => setQ(e.target.value)} placeholder="Page no."
            />
            <button type="submit" className="btn btn--primary btn--sm">Jao</button>
          </form>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>✕</button>
        </div>
        <div className="pgl__grid" ref={box}>
          {Array.from({ length: pages }, (_, i) => i + 1).map((x) => (
            <button
              key={x}
              type="button"
              data-pg={x}
              className={`pgl__it${x === cur ? " is-cur" : ""}`}
              onClick={() => onPick(x)}
            >
              <Thumb rec={rec} id={id} n={x} />
              <span className="pgl__n">{x}{impPages.has(x) ? " ⭐" : ""}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ViewInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const id = sp.get("id") || "";
  const p = Math.max(1, Number(sp.get("p")) || 1);
  // ⭐ Ek page par kai IMP — kaunsa khula hai (1, 2, 3…). URL mein hai, isliye
  // reload / wapas aane par wahi khulta hai.
  const n = Math.max(1, Number(sp.get("n")) || 1);
  const keyOf = () => pdfImpKey(id, p, n);

  const [rec, setRec] = useState(null);
  useEffect(() => { setRec(getPdf(id)); }, [id]);

  // Is page par kitne IMP ban chuke hain (jiska pata cloud par hai ya jiska
  // kaagaz is device par pada hai). Saath mein ek khaali jagah aur — ➕.
  const [slots, setSlots] = useState(1);
  const [listOpen, setListOpen] = useState(false);
  const [impPages, setImpPages] = useState(() => new Set());
  useEffect(() => {
    const scan = () => {
      const pre = pdfImpKey(id, p);
      let top = 1;
      const seen = (k, has) => {
        if (!has || !k.startsWith(pre)) return;
        const tail = k.slice(pre.length);
        if (tail === "") top = Math.max(top, 1);
        else if (/^#\d+$/.test(tail)) top = Math.max(top, Number(tail.slice(1)));
      };
      try {
        const notes = allImpNotes();
        for (const k of Object.keys(notes)) { const v = notes[k]; seen(k, !!(v && (v.impStrokes > 0 || (v.impUrl && v.impStrokes === undefined)))); }
        const local = localInkCounts();
        for (const idk of Object.keys(local)) if (idk.startsWith("imp:")) seen(idk.slice(4), local[idk] > 0);
      } catch { /* ignore */ }
      setSlots(Math.max(top, n));
      // List ke liye: is PDF ke kin page par IMP hai
      try {
        const pre2 = `pdfimp:${id}:`;
        const got = new Set();
        const mark = (k, has) => { if (has && k.startsWith(pre2)) { const pg = Number(k.slice(pre2.length).split("#")[0]); if (pg) got.add(pg); } };
        const notes = allImpNotes();
        for (const k of Object.keys(notes)) { const v = notes[k]; mark(k, !!(v && (v.impStrokes > 0 || (v.impUrl && v.impStrokes === undefined)))); }
        const local = localInkCounts();
        for (const idk of Object.keys(local)) if (idk.startsWith("imp:")) mark(idk.slice(4), local[idk] > 0);
        setImpPages(got);
      } catch { /* ignore */ }
    };
    scan();
    window.addEventListener("cgl:impnotes", scan);
    window.addEventListener("cgl:sync-applied", scan);
    return () => { window.removeEventListener("cgl:impnotes", scan); window.removeEventListener("cgl:sync-applied", scan); };
  }, [id, p, n]);
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
      if (writer) await movePdfNotesToImp().catch(() => {});   // purane Notes → IMP (ek baar)
      const kk = keyOf();
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
    // `n` bhi: ek page par kai IMP hain, aur slot badalne par naya kaagaz
    // khulna chahiye. Ye chhoot gaya tha — ➕ dabane par URL to badal jata
    // tha par kaagaz wahi purana rehta (owner: "2 nahi aa raha, wahi 1 hai").
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, p, n, writer]);

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
  const goPage = async (x) => {
    if (x < 1 || x > pages) return;
    await save();
    router.replace(`/pdfs/view?id=${encodeURIComponent(id)}&p=${x}`);   // naye page par pehla IMP
  };
  // Usi page ka doosra IMP — pehle jo likha hai wo sambhal kar.
  const goSlot = async (x) => {
    if (x === n) return;
    await save();
    router.replace(`/pdfs/view?id=${encodeURIComponent(id)}&p=${p}&n=${x}`);
  };

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
      {listOpen ? (
        <PageList
          rec={rec} id={id} pages={pages} cur={p} impPages={impPages}
          onPick={(x) => { setListOpen(false); if (x !== p) goPage(x); }}
          onClose={() => setListOpen(false)}
        />
      ) : null}
      <div className="inkv__top">
        <button className="btn btn--ghost btn--sm" onClick={exit} title="PDFs par wapas">←</button>
        <span className="inkv__title">📄 {rec.name} · page {p}</span>
        <span style={{ marginLeft: "auto" }} />
        <span className="inkv__nav">
          <button className="btn btn--ghost btn--sm" onClick={() => goPage(p - 1)} disabled={p <= 1}>‹ Pichhla</button>
          <button className="btn btn--ghost btn--sm" onClick={() => setListOpen(true)} title="Saare page — kisi par bhi seedha jao">📑 {p}/{pages}</button>
          <button className="btn btn--ghost btn--sm" onClick={() => goPage(p + 1)} disabled={p >= pages}>Agla ›</button>
        </span>
        {/* ⭐ Is page ke IMP — pehle ye IMP ke sar par thi, par wahan canvas ke
            neeche dab jati thi aur tap pahunchta hi nahi tha (owner: "plus
            dab hi nahi raha"). Ab wahin jahan page ke button hain. */}
        <span className="inkv__nav inkv__slots">
          {Array.from({ length: slots }, (_, i) => i + 1).map((x) => (
            <button
              key={x}
              className={`btn btn--sm ${x === n ? "btn--primary" : "btn--ghost"}`}
              onClick={() => goSlot(x)}
              title={`IMP ${x}`}
            >⭐{x}</button>
          ))}
          {can ? (
            <button className="btn btn--ghost btn--sm" onClick={() => goSlot(slots + 1)} title="Is page par ek aur IMP">➕ IMP</button>
          ) : null}
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
        <div className="inkv__ink is-imp">
          <div className="inkv__imphd">⭐ IMP {n > 1 ? `${n} ` : ""}— page {p} · jo zaroori hai yahan likho</div>
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
