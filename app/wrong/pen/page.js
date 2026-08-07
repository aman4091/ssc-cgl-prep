"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// 🖊️ Pen test — ye page batata hai ki browser tere stylus se SACH MEIN kya dekh
// raha hai. Guess karne ke bajay yahan likh kar number padh lo.
//
// Do sawaal iska maqsad hain:
//  1. Pen ke side buttons kaam aa sakte hain ya nahi? Alag-alag pen alag tarah
//     se jude hote hain — S Pen ka barrel button digitizer se aata hai (pointer
//     event mein dikhta hai), jabki Mi Pen ke buttons Bluetooth se jude hain aur
//     aksar system shortcut ban kar reh jate hain, app tak pahunchte hi nahi.
//     Yahan dono raaste pakde jate hain: pointer ke `buttons`, aur keyboard ke
//     keydown (agar pen BLE keyboard ban kar keys bhejta ho).
//  2. Likhna slow kyun lag raha hai? "Events/sec" aur "coalesced" wale number
//     batate hain ki pen kitni tezi se sample kar raha hai aur hum kitne points
//     sach mein pakad rahe hain.

const btnNames = (b) => {
  const out = [];
  if (b & 1) out.push("tip");
  if (b & 2) out.push("barrel(2)");
  if (b & 4) out.push("middle(4)");
  if (b & 8) out.push("X1(8)");
  if (b & 16) out.push("X2(16)");
  if (b & 32) out.push("eraser(32)");
  return out.length ? out.join(" + ") : "koi nahi";
};

export default function PenTestPage() {
  const boxRef = useRef(null);
  const cvsRef = useRef(null);
  const [s, setS] = useState({
    type: "—", pressure: 0, maxPressure: 0, tiltX: 0, tiltY: 0, twist: 0,
    buttons: 0, coalesced: 0, maxCoalesced: 0, predicted: 0, hz: 0, gap: 0, maxGap: 0,
  });
  const [seenButtons, setSeenButtons] = useState([]);
  const [keys, setKeys] = useState([]);
  const [dpr, setDpr] = useState(1);

  const ticks = useRef([]);
  const last = useRef(null);
  // Stats ref mein jama hote hain aur sirf 8 baar per second screen par jate
  // hain. Pehle har pointermove par setState hota tha — 120 React render per
  // second — aur wo khud main thread ko itna atkata tha ki browser samples
  // jama karke ek saath deta. Yaani page apni hi slowness naap raha tha aur
  // "coalesced 79" jaise number de raha tha. Maapne wali cheez ko halka hona
  // hi padta hai.
  const acc = useRef({
    type: "—", pressure: 0, maxPressure: 0, tiltX: 0, tiltY: 0, twist: 0,
    buttons: 0, coalesced: 0, maxCoalesced: 0, predicted: 0, hz: 0, gap: 0, maxGap: 0,
  });
  const lastAt = useRef(0);

  useEffect(() => { setDpr(window.devicePixelRatio || 1); }, []);

  // Screen 8 baar per second refresh — padhne ke liye kaafi, aur likhte waqt
  // main thread par bojh na ke barabar.
  useEffect(() => {
    const iv = setInterval(() => setS({ ...acc.current }), 125);
    return () => clearInterval(iv);
  }, []);

  // Pen ke buttons agar BLE keyboard ki tarah keys bhejte hain to yahan pakde
  // jayenge. Mi Pen aksar kuch nahi bhejta — tab ye list khaali rahegi, aur
  // wahi jawab hai.
  useEffect(() => {
    const onKey = (e) => {
      setKeys((k) => [`${e.key} (code: ${e.code || "—"})`, ...k].slice(0, 6));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const box = boxRef.current;
    const cvs = cvsRef.current;
    if (!box || !cvs) return undefined;

    const fit = () => {
      const r = box.getBoundingClientRect();
      const d = Math.min(window.devicePixelRatio || 1, 3);
      cvs.width = Math.round(r.width * d);
      cvs.height = Math.round(r.height * d);
      cvs.style.width = `${r.width}px`;
      cvs.style.height = `${r.height}px`;
      const ctx = cvs.getContext("2d");
      ctx.setTransform(d, 0, 0, d, 0, 0);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box);

    const rect = () => box.getBoundingClientRect();

    const note = (e, coalesced, predicted) => {
      const now = performance.now();
      ticks.current.push(now);
      while (ticks.current.length && now - ticks.current[0] > 1000) ticks.current.shift();
      // Do event ke beech ka faasla — main thread atakne ka sabse seedha saboot.
      // 120Hz par ~8ms hona chahiye; 50ms+ ka matlab kuch block kar raha hai.
      const gap = lastAt.current ? now - lastAt.current : 0;
      lastAt.current = now;
      const a = acc.current;
      a.type = e.pointerType;
      a.pressure = e.pressure;
      a.maxPressure = Math.max(a.maxPressure, e.pressure);
      a.tiltX = e.tiltX || 0;
      a.tiltY = e.tiltY || 0;
      a.twist = e.twist || 0;
      a.buttons = e.buttons;
      a.coalesced = coalesced;
      a.maxCoalesced = Math.max(a.maxCoalesced, coalesced);
      a.predicted = predicted;
      a.hz = ticks.current.length;
      a.gap = Math.round(gap);
      if (gap > 0 && gap < 2000) a.maxGap = Math.max(a.maxGap, Math.round(gap));
      if (e.buttons > 1) {
        setSeenButtons((v) => (v.some((x) => x.b === e.buttons)
          ? v
          : [{ b: e.buttons, at: new Date().toLocaleTimeString() }, ...v].slice(0, 8)));
      }
    };

    const draw = (evs) => {
      const ctx = cvs.getContext("2d");
      const r = rect();
      ctx.strokeStyle = "#ff8a7a";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (const ev of evs) {
        const x = ev.clientX - r.left;
        const y = ev.clientY - r.top;
        if (last.current) {
          ctx.beginPath();
          ctx.moveTo(last.current.x, last.current.y);
          ctx.lineTo(x, y);
          ctx.lineWidth = 1 + 7 * (ev.pressure || 0.5);
          ctx.stroke();
        }
        last.current = { x, y };
      }
    };

    const onDown = (e) => {
      e.preventDefault();
      try { box.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      last.current = null;
      note(e, 1, 0);
    };
    const onMove = (e) => {
      if (!e.buttons) { note(e, 1, 0); return; } // hover — sirf numbers, likhna nahi
      e.preventDefault();
      const co = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      const pr = e.getPredictedEvents ? e.getPredictedEvents() : [];
      draw(co);
      note(e, co.length, pr.length);
    };
    const onUp = (e) => { last.current = null; note(e, 1, 0); };

    box.addEventListener("pointerdown", onDown, { passive: false });
    box.addEventListener("pointermove", onMove, { passive: false });
    box.addEventListener("pointerup", onUp);
    box.addEventListener("pointercancel", onUp);
    const noMenu = (ev) => ev.preventDefault();
    box.addEventListener("contextmenu", noMenu);

    return () => {
      ro.disconnect();
      box.removeEventListener("pointerdown", onDown);
      box.removeEventListener("pointermove", onMove);
      box.removeEventListener("pointerup", onUp);
      box.removeEventListener("pointercancel", onUp);
      box.removeEventListener("contextmenu", noMenu);
    };
  }, []);

  const row = (k, v, hint) => (
    <div style={{ display: "flex", gap: 10, padding: "5px 0", borderBottom: "1px solid var(--glass-border)" }}>
      <span className="muted" style={{ minWidth: 130, fontSize: "0.8rem" }}>{k}</span>
      <strong style={{ fontSize: "0.86rem" }}>{v}</strong>
      {hint && <span className="muted" style={{ fontSize: "0.75rem", marginLeft: "auto" }}>{hint}</span>}
    </div>
  );

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">🖊️ Pen test</span>
          <Link href="/wrong" className="btn btn--ghost btn--sm">← Wrong Questions</Link>
        </div>
        <h1 className="hero__title" style={{ fontSize: "clamp(1.4rem, 4vw, 2rem)" }}>
          Pen kya <span className="grad">bhej raha hai</span>
        </h1>
        <p className="hero__sub" style={{ fontSize: "0.86rem" }}>
          Neeche wale kaagaz par pen se likho. Phir pen ke <strong>dono buttons</strong> dabakar
          likho — agar wo browser tak pahunchte hain to &quot;Buttons jo dekhe&quot; mein dikhenge.
        </p>
      </section>

      <section className="section">
        <div
          ref={boxRef}
          className="glass-card"
          style={{
            position: "relative", height: "38vh", minHeight: 220, padding: 0,
            overflow: "hidden", background: "#fbf8f0",
            touchAction: "none", userSelect: "none", WebkitUserSelect: "none",
          }}
        >
          <canvas ref={cvsRef} style={{ position: "absolute", inset: 0 }} />
        </div>

        <div className="glass-card mt-16">
          {row("Pointer type", s.type, s.type === "pen" ? "✅ stylus" : s.type === "eraser" ? "✅ eraser sira" : "")}
          {row("Pressure", s.pressure.toFixed(3), `max dekha: ${s.maxPressure.toFixed(3)}`)}
          {row("Tilt X / Y", `${s.tiltX}° / ${s.tiltY}°`)}
          {row("Buttons (abhi)", `${s.buttons} — ${btnNames(s.buttons)}`)}
          {row("Coalesced / move", s.coalesced,
            s.maxCoalesced > 8 ? `max: ${s.maxCoalesced} ⚠️ thread atak raha hai` : `max: ${s.maxCoalesced}`)}
          {row("Predicted / move", s.predicted)}
          {row("Events per second", s.hz, s.hz > 90 ? "✅ tez" : s.hz ? "dheema" : "")}
          {row("Do event ka faasla", `${s.gap} ms`,
            s.maxGap > 50 ? `max: ${s.maxGap} ms ⚠️` : `max: ${s.maxGap} ms ✅`)}
          {row("Device pixel ratio", dpr, dpr >= 3 ? "bahut pixel" : "")}
        </div>

        <div className="glass-card mt-16">
          <h3 style={{ fontSize: "0.95rem" }}>Buttons jo dekhe (pointer se)</h3>
          {seenButtons.length === 0 ? (
            <p className="muted" style={{ fontSize: "0.84rem", marginTop: 6 }}>
              Abhi tak sirf nib. Agar pen ke buttons dabane par bhi yahan kuch nahi aata,
              to wo buttons browser tak pahunchte hi nahi — unka use nahi ho sakta.
            </p>
          ) : (
            <ul style={{ fontSize: "0.86rem", marginTop: 6, paddingLeft: 18 }}>
              {seenButtons.map((x) => (
                <li key={x.b}><strong>{x.b}</strong> — {btnNames(x.b)} <span className="muted">({x.at})</span></li>
              ))}
            </ul>
          )}
        </div>

        <div className="glass-card mt-16">
          <h3 style={{ fontSize: "0.95rem" }}>Keyboard events (Bluetooth pen ka doosra raasta)</h3>
          {keys.length === 0 ? (
            <p className="muted" style={{ fontSize: "0.84rem", marginTop: 6 }}>
              Kuch nahi aaya. Buttons dabakar dekho — agar yahan koi key aati hai to hum
              use eraser/undo ka shortcut bana sakte hain.
            </p>
          ) : (
            <ul style={{ fontSize: "0.86rem", marginTop: 6, paddingLeft: 18 }}>
              {keys.map((k, i) => <li key={i}>{k}</li>)}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
