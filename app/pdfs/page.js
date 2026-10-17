"use client";

// 📄 Meri PDFs (owner) — jitni chahe upload karo, grid mein. Kholo → tablet par
// har page stylus se (app/pdfs/view: ✍️ Notes + ⭐ IMP + 👻 Trace). Har PDF ke
// IMP aur saare IMP ek saath: app/pdfs/imp. Data: lib/pdfstore (sync).

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { listPdfs, addPdf, removePdf, hasPdfHere } from "@/lib/pdfstore";
import { isInkWriter } from "@/lib/inkdevice";
import { storeGet } from "@/lib/bigstore";
import "./pdfs.css";

// Har PDF ke kitne pages par IMP hai (lib/impnotes ka pata).
function impCounts() {
  try {
    const all = JSON.parse(storeGet("cgl.impnotes") || "{}") || {};
    const out = {};
    for (const [k, v] of Object.entries(all)) {
      const m = /^pdfimp:(.+):(\d+)$/.exec(k);
      if (m && v && (v.impUrl || v.impStrokes)) out[m[1]] = (out[m[1]] || 0) + 1;
    }
    return out;
  } catch { return {}; }
}

export default function PdfsPage() {
  const [list, setList] = useState([]);
  const [imps, setImps] = useState({});
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const inp = useRef(null);
  // PDF sirf tablet par — upload bhi wahin; PC par list + likha / IMP.
  const [writer, setWriter] = useState(false);
  useEffect(() => { setWriter(isInkWriter()); }, []);
  const [here, setHere] = useState({});
  useEffect(() => {
    let alive = true;
    Promise.all(list.map(async (r) => [r.id, await hasPdfHere(r.id)])).then((xs) => { if (alive) setHere(Object.fromEntries(xs)); });
    return () => { alive = false; };
  }, [list]);
  useEffect(() => {
    const on = () => { setList(listPdfs()); setImps(impCounts()); };
    on();
    window.addEventListener("cgl:pdfs", on);
    window.addEventListener("cgl:impnotes", on);
    window.addEventListener("cgl:sync-applied", on);
    return () => { window.removeEventListener("cgl:pdfs", on); window.removeEventListener("cgl:impnotes", on); window.removeEventListener("cgl:sync-applied", on); };
  }, []);

  const upload = async (files) => {
    setErr("");
    const fs = [...(files || [])].filter((f) => /pdf$/i.test(f.type) || /\.pdf$/i.test(f.name));
    for (let i = 0; i < fs.length; i++) {
      try { await addPdf(fs[i], (m) => setBusy(`${fs.length > 1 ? `${i + 1}/${fs.length} · ` : ""}${fs[i].name}: ${m}`)); }
      catch (e) { setErr(`${fs[i].name}: ${e.message || "upload nahi hui"}`); }
    }
    setBusy("");
    if (inp.current) inp.current.value = "";
  };
  const del = async (r) => { if (confirm(`"${r.name}" hatau? Tablet se PDF bhi chali jayegi.`)) await removePdf(r.id); };

  return (
    <section className="section pdfs">
      <header className="pdfs-head">
        <div>
          <h1>📄 Meri PDFs</h1>
          <p className="hint">PDF sirf tablet par rehti hai — wahan har page par stylus se likho (✍️ Notes / ⭐ IMP), page 👻 Trace mein neeche. Baaki device par likha hua / IMP dikhta hai.</p>
        </div>
        <div className="pdfs-acts">
          <Link href="/pdfs/imp" className="btn btn--ghost btn--sm">⭐ Saare IMP</Link>
          {writer ? (
            <label className="btn btn--primary btn--sm">
              ⬆️ PDF daalo
              <input ref={inp} type="file" accept="application/pdf,.pdf" multiple hidden onChange={(e) => upload(e.target.files)} />
            </label>
          ) : <span className="hint">📱 PDF tablet se daalo</span>}
        </div>
      </header>
      {busy ? <p className="pdfs-busy">⏳ {busy}</p> : null}
      {err ? <p className="pdfs-err">⚠️ {err}</p> : null}
      {!list.length ? <p className="hint">Abhi koi PDF nahi — tablet par upar se daalo (ek saath kai bhi).</p> : null}
      <div className="pdfs-grid">
        {list.map((r) => (
          <article key={r.id} className="pdfs-card">
            <Link href={`/pdfs/view?id=${encodeURIComponent(r.id)}&p=1`} className="pdfs-thumb">
              {r.thumb ? <img src={r.thumb} alt="" /> : <span>📄</span>}
            </Link>
            <b className="pdfs-name" title={r.name}>{r.name}</b>
            <small className="pdfs-meta">{r.pages} page · {(r.size / 1024 / 1024).toFixed(1)} MB{here[r.id] === false ? " · 📱 tablet par" : ""}</small>
            <div className="pdfs-row">
              <Link href={`/pdfs/view?id=${encodeURIComponent(r.id)}&p=1`} className="btn btn--sm">✍️ Kholo</Link>
              <Link href={`/pdfs/imp?id=${encodeURIComponent(r.id)}`} className="btn btn--ghost btn--sm">⭐ IMP{imps[r.id] ? ` · ${imps[r.id]}` : ""}</Link>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => del(r)} title="Hatao">🗑️</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
