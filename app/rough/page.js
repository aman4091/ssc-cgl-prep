"use client";

// ✍️ Rough pad — tablet par mock ke saath (owner: "rough work bhi record ho",
// phir: "us time itna sochne ka time nahi hota ki ye dabao"). Isliye:
//   • ek hi lamba kaagaz, bas likhte jao — koi button nahi. Har stroke ka
//     time (at) saath mein save hota hai (lib/ink encode/decode).
//   • review (PC par): Test Recorder (D:\over\testrec_app.py, 127.0.0.1:5030)
//     ka Q-timeline fetch → rough strokes time se Q-wise kat jaate hain, saath
//     mein PC ka screenshot + us Q ka time. Tablet par (ya recorder band) →
//     poora rough, aur chaho to ⏭ ke nishaan (optional) se kat-ta hai.
// Kaagaz lib/ink (IndexedDB + cloud), chaabi "rp:<session>.pad" — Saare IMP mein nahi.

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import InkCanvas, { PALETTE, PEN_SIZES } from "@/components/InkCanvas";
import { InkStatic } from "@/components/ImpView";
import { openInk, viewInk, saveLocalInk, pushInk, emptyDoc, isEmptyDoc } from "@/lib/ink";
import { inkSetter } from "@/lib/impink";
import { noteRec, noteKey, setImpNoteMeta, getImpNote, allImpNotes } from "@/lib/impnotes";
import { isInkWriter } from "@/lib/inkdevice";
import { setSyncPaused } from "@/lib/sync";
import "./rough.css";

const LOCAL_MS = 700;
const REC = "http://127.0.0.1:5030";
const K = (sid) => noteKey("rp", `${sid}.pad`);
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

function sessions() {
  const all = allImpNotes();
  return Object.entries(all)
    .filter(([k, v]) => k.startsWith("rp:") && v?.meta?.sid)
    .map(([k, v]) => ({ k, ...v.meta }))
    .sort((a, b) => (b.start || 0) - (a.start || 0));
}

function Index() {
  const router = useRouter();
  const [list, setList] = useState([]);
  const [name, setName] = useState("");
  useEffect(() => {
    const on = () => setList(sessions());
    on();
    window.addEventListener("cgl:impnotes", on);
    window.addEventListener("cgl:sync-applied", on);
    return () => { window.removeEventListener("cgl:impnotes", on); window.removeEventListener("cgl:sync-applied", on); };
  }, []);
  const start = () => {
    const d = new Date();
    const sid = `${d.toISOString().slice(0, 10)}-${Date.now().toString(36)}`;
    const nm = name.trim() || `Mock ${d.getDate()} ${d.toLocaleString("en", { month: "short" })}`;
    setImpNoteMeta(K(sid), { title: nm, src: nm, book: "rough", sid, start: Date.now(), marks: [] });
    router.push(`/rough?s=${sid}`);
  };
  return (
    <section className="section rg">
      <header className="rg-head">
        <div><div className="rg-eb">Tablet · mock ke saath</div><h1>✍️ Rough pad</h1>
          <p className="hint">PC par test + Test Recorder, yahan bas likhte jao — koi button nahi. Review PC par: rough apne aap Q-wise, screenshot ke saath.</p></div>
      </header>
      <div className="rg-new">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Test ka naam (jaise Mock 28 Oct Maths)" onKeyDown={(e) => e.key === "Enter" && start()} />
        <button type="button" className="btn btn--primary" onClick={start}>▶ Naya test</button>
      </div>
      {list.map((s) => (
        <article key={s.sid} className="rg-sess">
          <div className="rg-sess__top">
            <b>{s.title}</b>
            <span>{new Date(s.start).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}{s.end ? ` · ${fmt((s.end - s.start) / 1000)}` : " · chal raha"}</span>
            <span className="rg-sess__acts">
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => router.push(`/rough?s=${s.sid}&view=1`)}>📋 Review</button>
              {isInkWriter() && !s.end ? <button type="button" className="btn btn--ghost btn--sm" onClick={() => router.push(`/rough?s=${s.sid}`)}>✍️ Jaari</button> : null}
            </span>
          </div>
        </article>
      ))}
      {!list.length ? <p className="hint">Abhi koi session nahi.</p> : null}
    </section>
  );
}

// Strokes ko time ke dabbon (segs: [[s,e],…] epoch s) mein baanto.
const sliceDoc = (doc, segs) => ({ ...doc, strokes: (doc?.strokes || []).filter((st) => st.at && segs.some(([s, e]) => st.at >= s * 1000 && st.at <= (e || 1e13) * 1000)) });

function Review({ sid }) {
  const router = useRouter();
  const meta = getImpNote(K(sid))?.meta || {};
  const [doc, setDoc] = useState(null);
  const [rec, setRec] = useState(null);     // PC recorder ka session (export)
  const [recList, setRecList] = useState(null);
  const [paste, setPaste] = useState("");
  useEffect(() => {
    let alive = true;
    viewInk(noteRec(K(sid)), { preferLocal: isInkWriter() }).then((d) => { if (alive) setDoc(d || emptyDoc()); }).catch(() => setDoc(emptyDoc()));
    fetch(`${REC}/api/sessions`).then((r) => r.json()).then((list) => {
      if (!alive) return;
      setRecList(list);
      // Jo session rough ke shuru hone ke 15 min ke andar shuru hua — wahi.
      const near = list.filter((x) => Math.abs(x.started * 1000 - (meta.start || 0)) < 15 * 60000).sort((a, b) => Math.abs(a.started * 1000 - meta.start) - Math.abs(b.started * 1000 - meta.start));
      if (near[0]) setRec(near[0]);
    }).catch(() => { if (alive) setRecList([]); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sid]);
  const usePaste = () => { try { setRec(JSON.parse(paste)); } catch { alert("JSON samajh nahi aaya"); } };
  if (!doc) return <section className="section rg"><p className="hint">Khul raha hai…</p></section>;
  const marks = meta.marks || [];
  // Q-timeline: PC recorder se, warna tablet ke ⏭ nishaan se
  const qs = rec ? rec.qs.map((q) => ({ n: q.n, dur: q.dur, segs: q.segs, tag: q.tag, result: q.result, topic: q.topic, img: `${REC}/s/${rec.id}/img/${q.n}` }))
    : marks.length ? [meta.start, ...marks, meta.end || Date.now()].slice(0, -1).map((t, i, arr) => ({ n: i + 1, dur: (([meta.start, ...marks, meta.end || Date.now()][i + 1]) - t) / 1000, segs: [[t / 1000, [meta.start, ...marks, meta.end || Date.now()][i + 1] / 1000]] }))
      : [];
  return (
    <section className="section rg">
      <header className="rg-head">
        <div><button type="button" className="btn btn--ghost btn--sm" onClick={() => router.push("/rough")}>← Saare</button>
          <h1>📋 {meta.title}</h1>
          <p className="hint">{doc.strokes.length} strokes{meta.end ? ` · ${fmt((meta.end - meta.start) / 1000)}` : ""}{rec ? ` · PC recorder: ${rec.name} (${rec.qs.length} Q)` : recList === null ? " · PC recorder dhoondh raha…" : recList?.length ? " · PC recorder mila par is waqt ka session nahi" : " · PC recorder nahi (tablet par ho, ya app band)"}</p></div>
      </header>
      {!rec && recList !== null ? (
        <details className="rg-paste"><summary>PC recorder ka session chuno / export.json paste karo</summary>
          {recList?.map((x) => <button key={x.id} type="button" className="btn btn--ghost btn--sm" onClick={() => setRec(x)}>{x.name} · {x.qs.length} Q</button>)}
          <textarea value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="export.json ka text" rows={4} />
          <button type="button" className="btn btn--ghost btn--sm" onClick={usePaste}>Lagao</button>
        </details>
      ) : null}
      {qs.length ? (
        <div className="rg-grid">
          {qs.map((q) => {
            const d = sliceDoc(doc, q.segs);
            return (
              <article key={q.n} className={`rg-q${(q.dur || 0) >= 90 ? " is-long" : ""}`}>
                <div className="rg-q__top"><b>Q{q.n} {q.result === "sahi" ? "✓" : q.result === "galat" ? "✗" : ""} <small>{q.topic || ""}{q.tag ? ` · ${q.tag}` : ""}</small></b><span>{q.dur != null ? fmt(q.dur) : "…"}</span></div>
                {q.img ? <img src={q.img} alt="" className="rg-shot" loading="lazy" onClick={(e) => e.target.classList.toggle("is-big")} /> : null}
                {isEmptyDoc(d) ? <p className="hint">is Q par rough nahi</p> : <div className="imp-box"><InkStatic doc={d} /></div>}
              </article>
            );
          })}
        </div>
      ) : (
        <article className="rg-q"><div className="rg-q__top"><b>Poora rough</b></div>{isEmptyDoc(doc) ? <p className="hint">khaali</p> : <div className="imp-box"><InkStatic doc={doc} /></div>}</article>
      )}
    </section>
  );
}

function Pad({ sid }) {
  const router = useRouter();
  const k = K(sid);
  const meta = getImpNote(k)?.meta || {};
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tool, setTool] = useState("pen");
  const [colorIdx, setColorIdx] = useState(0);
  const [sizeIdx, setSizeIdx] = useState(1);
  const [sec, setSec] = useState(0);
  const [marks, setMarks] = useState((meta.marks || []).length);
  const [state, setState] = useState("saved");
  const inkRef = useRef(null);
  const liveDoc = useRef(null);
  const localT = useRef(null);
  const writer = isInkWriter();

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    try { document.documentElement.requestFullscreen?.().catch(() => {}); } catch { /* ignore */ }
    setSyncPaused(true);
    return () => { document.body.style.overflow = prev; setSyncPaused(false); try { window.dispatchEvent(new CustomEvent("cgl:sync-kick")); } catch { /* SSR */ } };
  }, []);
  useEffect(() => {
    let alive = true;
    (async () => {
      const r = noteRec(k);
      const d = writer ? (await openInk(r, { localFirst: true }).catch(() => null))?.doc : await viewInk(r).catch(() => null);
      if (!alive) return;
      liveDoc.current = d || emptyDoc(2400);
      setDoc(liveDoc.current);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [k, writer]);
  useEffect(() => {
    const t = setInterval(() => { if (meta.start && !meta.end) setSec((Date.now() - meta.start) / 1000); }, 500);
    return () => clearInterval(t);
  }, [meta.start, meta.end]);

  const flushLocal = useCallback(async () => {
    if (!writer || !liveDoc.current) return;
    clearTimeout(localT.current);
    try { await saveLocalInk(noteRec(k).id, liveDoc.current); setState("saved"); } catch { setState("offline"); }
  }, [k, writer]);
  const flushCloud = useCallback(async () => {
    if (!writer || !liveDoc.current) return;
    try { await pushInk(noteRec(k), liveDoc.current, inkSetter); } catch { /* baad mein */ }
  }, [k, writer]);
  const onChange = useCallback((next) => {
    if (!writer) return;
    // Naye stroke par time ki mohar — review isi se Q-wise kaatta hai.
    const now = Date.now();
    for (const st of next.strokes || []) if (!st.at) st.at = now;
    liveDoc.current = next; setState("dirty");
    clearTimeout(localT.current);
    localT.current = setTimeout(() => flushLocal(), LOCAL_MS);
  }, [writer, flushLocal]);
  useEffect(() => () => { clearTimeout(localT.current); flushLocal(); flushCloud(); }, [flushLocal, flushCloud]);

  // Optional ⏭ nishaan — sirf tab jab PC recorder na ho.
  const mark = () => {
    const m = getImpNote(k)?.meta || meta;
    setImpNoteMeta(k, { ...m, marks: [...(m.marks || []), Date.now()] });
    setMarks((x) => x + 1);
  };
  const end = async () => {
    await flushLocal(); flushCloud();
    const m = getImpNote(k)?.meta || meta;
    setImpNoteMeta(k, { ...m, end: Date.now() });
    try { if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {}); } catch { /* ignore */ }
    router.push(`/rough?s=${sid}&view=1`);
  };
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "PageDown") { e.preventDefault(); if (!e.repeat) setTool((t) => (t === "eraser" ? "pen" : "eraser")); }
      if (e.key === "PageUp") { e.preventDefault(); inkRef.current?.undo(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="inkv rg-pad">
      <div className="inkv__top">
        <button className="btn btn--ghost btn--sm" onClick={end} title="Test khatam — review">⏹ End</button>
        <span className="inkv__title">✍️ {meta.title || sid}</span>
        <span className="rg-timer">⏱ {fmt(sec)}</span>
        <span style={{ marginLeft: "auto" }} />
        <button className="btn btn--ghost btn--sm" onClick={mark} title="Optional: naya sawaal ka nishaan (PC recorder ho to zaroorat nahi)">⏭ nishaan {marks ? `(${marks})` : ""}</button>
        {writer ? <span className="inkv__pill">{state === "saved" ? "💾" : state === "dirty" ? "✍️" : "⚠️"}</span> : null}
      </div>
      <div className="inkv__body">
        <div className="inkv__ink is-imp">
          {loading ? <div className="placeholder" style={{ margin: 16 }}>Khul raha hai…</div> : (
            <InkCanvas ref={inkRef} readOnly={!writer} initialDoc={doc} tool={tool} colorIdx={colorIdx} sizeIdx={sizeIdx} onChange={onChange} />
          )}
        </div>
      </div>
      <div className="inkv__tools">
        {writer ? (
          <>
            <button className="btn btn--ghost btn--sm" aria-pressed={tool === "pen"} onClick={() => setTool("pen")}>✏️</button>
            <button className="btn btn--ghost btn--sm" aria-pressed={tool === "hl"} onClick={() => setTool("hl")}>🖍️</button>
            <button className="btn btn--ghost btn--sm" aria-pressed={tool === "eraser"} onClick={() => setTool((t) => (t === "eraser" ? "pen" : "eraser"))}>🧽</button>
            <span className="inkv__sep" />
            {PALETTE.map((c, i) => <button key={i} className="inkv__swatch" aria-pressed={colorIdx === i} onClick={() => { setColorIdx(i); setTool((t) => (t === "eraser" ? "pen" : t)); }} title={c.name} style={{ background: c.hex }} />)}
            <span className="inkv__sep" />
            {PEN_SIZES.map((s, i) => <button key={i} className="btn btn--ghost btn--sm" aria-pressed={sizeIdx === i} onClick={() => setSizeIdx(i)}>{["·", "•", "⬤"][i]}</button>)}
            <span className="inkv__sep" />
            <button className="btn btn--ghost btn--sm" onClick={() => inkRef.current?.undo()}>↩</button>
            <button className="btn btn--ghost btn--sm" onClick={() => inkRef.current?.redo()}>↪</button>
            <button className="btn btn--ghost btn--sm" onClick={() => inkRef.current?.grow()}>➕ jagah</button>
          </>
        ) : <span className="inkv__ro">👁 Sirf dekhna — likhna tablet par</span>}
      </div>
    </div>
  );
}

function RoughInner() {
  const sp = useSearchParams();
  const sid = sp.get("s");
  if (!sid) return <Index />;
  if (sp.get("view")) return <Review sid={sid} />;
  return <Pad sid={sid} />;
}

export default function RoughPage() {
  return <Suspense fallback={<div className="placeholder">Loading…</div>}><RoughInner /></Suspense>;
}
