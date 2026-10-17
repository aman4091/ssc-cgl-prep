"use client";

// ⭐ PDF ke IMP — ek PDF ke (?id=) ya saari PDFs ke ek saath. Har page ka IMP
// (tablet par likha) yahan sirf dekhne ko; page par dabao to wahi page khule.

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { listPdfs, pdfImpKey } from "@/lib/pdfstore";
import { storeGet } from "@/lib/bigstore";
import { localInkCounts } from "@/lib/ink";
import { ImpNoteBox } from "@/components/ImpView";
import "../pdfs.css";

// { pdfId: [page, …] } — jin pages ka IMP hai (pata, ya is device par likha).
function impPages() {
  const out = {};
  const add = (id, p) => { (out[id] ||= new Set()).add(Number(p)); };
  try {
    const all = JSON.parse(storeGet("cgl.impnotes") || "{}") || {};
    for (const [k, v] of Object.entries(all)) {
      const m = /^pdfimp:(.+):(\d+)$/.exec(k);
      if (m && v && (v.impUrl || v.impStrokes)) add(m[1], m[2]);
    }
  } catch { /* ignore */ }
  for (const k of Object.keys(localInkCounts())) {
    const m = /^imp:pdfimp:(.+):(\d+)$/.exec(k);
    if (m) add(m[1], m[2]);
  }
  return Object.fromEntries(Object.entries(out).map(([k, s]) => [k, [...s].sort((a, b) => a - b)]));
}

function ImpInner() {
  const sp = useSearchParams();
  const only = sp.get("id") || "";
  const [pdfs, setPdfs] = useState([]);
  const [pages, setPages] = useState({});
  useEffect(() => {
    const on = () => { setPdfs(listPdfs()); setPages(impPages()); };
    on();
    window.addEventListener("cgl:impnotes", on);
    window.addEventListener("cgl:sync-applied", on);
    return () => { window.removeEventListener("cgl:impnotes", on); window.removeEventListener("cgl:sync-applied", on); };
  }, []);
  const shown = pdfs.filter((r) => (only ? r.id === only : (pages[r.id] || []).length));
  return (
    <section className="section pdfs">
      <header className="pdfs-head">
        <div>
          <h1>⭐ {only ? `IMP · ${shown[0]?.name || "PDF"}` : "Saare IMP"}</h1>
          <p className="hint">Tablet par likhe IMP — page par dabao to wahi page khule.</p>
        </div>
        <div className="pdfs-acts">
          {only ? <Link href="/pdfs/imp" className="btn btn--ghost btn--sm">⭐ Saare IMP</Link> : null}
          <Link href="/pdfs" className="btn btn--ghost btn--sm">📄 PDFs</Link>
        </div>
      </header>
      {!shown.length || !shown.some((r) => (pages[r.id] || []).length) ? <p className="hint">Abhi koi IMP nahi — PDF kholo aur ⭐ IMP par likho (tablet).</p> : null}
      {shown.map((r) => (
        <div key={r.id} className="pdfs-impgroup">
          {!only ? <h2>📄 {r.name}</h2> : null}
          <div className="pdfs-impgrid">
            {(pages[r.id] || []).map((p) => (
              <div key={p} className="pdfs-imp">
                <Link href={`/pdfs/view?id=${encodeURIComponent(r.id)}&p=${p}`} className="pdfs-imp__p">Page {p} ›</Link>
                <ImpNoteBox k={pdfImpKey(r.id, p)} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

export default function PdfImpPage() {
  return <Suspense fallback={<div className="placeholder">Loading…</div>}><ImpInner /></Suspense>;
}
