"use client";

// ⭐ IMP — tablet par stylus se likha hua "zaroori" page (lib/impink), natije
// mein sirf DEKHNE ke liye. Desktop par sawaal ke bagal mein, phone/tablet par
// sawaal aur jawab ke beech (CSS: .ansp__qrow).
//
// Poora page nahi kheenchte — sirf jitni jagah mein likha hai (strokes ka
// ghera) utna, dabbe ki chaudai mein fit. Isliye chhota likha bhi padhne layak.

import { useEffect, useRef, useState } from "react";
import { viewInk, isEmptyDoc, localInkCounts } from "@/lib/ink";
import { getImpNote, noteRec } from "@/lib/impnotes";
import { impRec, hasImp } from "@/lib/impink";
import { getWrongById } from "@/lib/wrongbook";
import { isInkWriter } from "@/lib/inkdevice";
import { PALETTE } from "./InkCanvas";

function widthOf(st, pr) {
  if (st.tool === "hl" || !st._hasPressure) return 1;
  const p = pr == null ? 0.5 : pr;
  return Math.max(0.35, Math.min(1.5, 0.55 + 0.9 * p));
}

function bboxOf(doc) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const st of doc.strokes) {
    const pad = (st.size || 4) * 1.5;
    for (const p of st.points) {
      if (p.x - pad < x0) x0 = p.x - pad;
      if (p.y - pad < y0) y0 = p.y - pad;
      if (p.x + pad > x1) x1 = p.x + pad;
      if (p.y + pad > y1) y1 = p.y + pad;
    }
  }
  return { x0: Math.max(0, x0 - 12), y0: Math.max(0, y0 - 12), x1: x1 + 12, y1: y1 + 12 };
}

export function InkStatic({ doc }) {
  const ref = useRef(null);
  const boxRef = useRef(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  const b = bboxOf(doc);
  const bw = Math.max(1, b.x1 - b.x0);
  const k = w ? Math.min(w / bw, 1.2) : 0;   // chhota likha bahut na phoole
  const h = Math.round((b.y1 - b.y0) * k);
  useEffect(() => {
    const c = ref.current;
    if (!c || !k) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
    const ctx = c.getContext("2d");
    ctx.setTransform(dpr * k, 0, 0, dpr * k, -b.x0 * dpr * k, -b.y0 * dpr * k);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const st of doc.strokes) {
      const pts = st.points || [];
      if (!pts.length) continue;
      const col = (PALETTE[st.color] || PALETTE[0]).hex;
      ctx.strokeStyle = col;
      ctx.fillStyle = col;
      ctx.globalAlpha = st.tool === "hl" ? 0.32 : 1;
      if (pts.length === 1) {
        ctx.beginPath();
        ctx.arc(pts[0].x, pts[0].y, (st.size * widthOf(st, pts[0].p)) / 2, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      for (let i = 1; i < pts.length; i++) {
        const p0 = pts[i - 1];
        const p1 = pts[i];
        const m0 = i === 1 ? p0 : { x: (pts[i - 2].x + p0.x) / 2, y: (pts[i - 2].y + p0.y) / 2 };
        const m1 = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
        ctx.beginPath();
        ctx.moveTo(m0.x, m0.y);
        ctx.quadraticCurveTo(p0.x, p0.y, m1.x, m1.y);
        ctx.lineWidth = st.size * widthOf(st, p1.p);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }, [doc, w, h, k, b.x0, b.y0]);
  return (
    <div ref={boxRef} className="imp-ink">
      {k ? <canvas ref={ref} style={{ width: `${w}px`, height: `${h}px` }} /> : null}
    </div>
  );
}

export default function ImpView({ rec }) {
  // Wrong Set wali copy purani ho sakti hai — asli record se padho.
  const [live, setLive] = useState(() => getWrongById(rec?.id) || rec);
  useEffect(() => {
    const on = () => setLive(getWrongById(rec?.id) || rec);
    on();
    window.addEventListener("cgl:sync-applied", on);
    return () => window.removeEventListener("cgl:sync-applied", on);
  }, [rec]);
  const [doc, setDoc] = useState(null);
  const rev = live?.impRev || 0;
  useEffect(() => {
    let alive = true;
    setDoc(null);
    if (!live?.id) return undefined;
    // Sirf dekhna — device par kuch nahi likhte (likhna sirf tablet par).
    viewInk(impRec(live), { preferLocal: isInkWriter() }).then((d) => { if (alive) setDoc(d || null); }).catch(() => {});
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live?.id, rev]);
  if (!doc || isEmptyDoc(doc)) {
    return hasImp(live) && !doc ? <aside className="imp-box imp-box--wait"><b>⭐ IMP</b><small>khul raha hai…</small></aside> : null;
  }
  return (
    <aside className="imp-box">
      <b className="imp-box__h">{label}</b>
      <InkStatic doc={doc} />
    </aside>
  );
}

// ⭐ Fact log / Vocab ki slide ka IMP (lib/impnotes) — slide par hi, sirf dekhne
// ko. Jis slide ka IMP hai hi nahi (na pata, na is device par likha) uske liye
// IndexedDB tak nahi jaate — Vocab mein hazaaron slides hain.
export function ImpNoteBox({ k, label = "⭐ IMP" }) {
  const [p, setP] = useState(null);
  const [doc, setDoc] = useState(null);
  useEffect(() => {
    const on = () => setP(getImpNote(k));
    on();
    window.addEventListener("cgl:impnotes", on);
    window.addEventListener("cgl:sync-applied", on);
    return () => { window.removeEventListener("cgl:impnotes", on); window.removeEventListener("cgl:sync-applied", on); };
  }, [k]);
  const rev = p?.impRev || 0;
  useEffect(() => {
    let alive = true;
    const r = noteRec(k);
    if (!r.inkUrl && !(localInkCounts()[r.id] > 0)) { setDoc(null); return undefined; }
    viewInk(r, { preferLocal: isInkWriter() }).then((d) => { if (alive) setDoc(d || null); }).catch(() => {});
    return () => { alive = false; };
  }, [k, rev]);
  if (!doc || isEmptyDoc(doc)) return null;
  return (
    <div className="imp-box imp-box--slide">
      <b className="imp-box__h">{label}</b>
      <InkStatic doc={doc} />
    </div>
  );
}
