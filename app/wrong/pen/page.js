"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { localHash, setSyncPaused } from "@/lib/sync";

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

// Vercel ye env var har deploy par khud bharta hai. Local dev par khaali rehta
// hai, isliye "dev".
const BUILD = (process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || "dev").slice(0, 7);

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
  const [longTasks, setLongTasks] = useState([]);
  const [hashTest, setHashTest] = useState(null);

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
  const drawing = useRef(false); // stroke chal raha hai? gap sirf tab ginte hain
  const moves = useRef(0);       // is stroke mein kitne move — pehla wala chhodna hai

  useEffect(() => { setDpr(window.devicePixelRatio || 1); }, []);

  // Yahan bhi sync band — solve page ki tarah.
  //
  // Warna ye page apni maap kharab kar deta hai: sync ka poora-localStorage
  // hash/push (~1.2s) yahin theek stroke ke beech chal jata tha, aur numbers
  // pen ke bare mein kuch batane ke bajay sync ke bare mein batate the. Sync ka
  // kharcha alag se neeche wale hash test button se naapa jata hai.
  useEffect(() => {
    setSyncPaused(true);
    return () => setSyncPaused(false);
  }, []);

  // Screen 8 baar per second refresh — padhne ke liye kaafi, aur likhte waqt
  // main thread par bojh na ke barabar.
  useEffect(() => {
    const iv = setInterval(() => setS({ ...acc.current }), 125);
    return () => clearInterval(iv);
  }, []);

  // Long tasks — browser khud batata hai ki main thread 50ms se zyada kis kaam
  // mein atka. Coalesced ka bada number ISKA nateeja hota hai, wajah nahi;
  // asli wajah yahan dikhti hai.
  useEffect(() => {
    if (typeof PerformanceObserver === "undefined") return undefined;
    let po;
    try {
      po = new PerformanceObserver((list) => {
        // Page khulne se kitni der baad — ye batana zaroori hai. Load ke pehle
        // 2-3 second mein aaya bada task app ke boot ka hai (bundle parse +
        // hydration) aur likhne se uska koi lena-dena nahi. Likhte waqt aaya
        // task hi asli mujrim hai.
        const add = list.getEntries().map((en) => ({
          ms: Math.round(en.duration),
          since: (en.startTime / 1000).toFixed(1),
          at: new Date().toLocaleTimeString(),
        }));
        if (add.length) setLongTasks((v) => [...add.reverse(), ...v].slice(0, 10));
      });
      po.observe({ entryTypes: ["longtask"] });
    } catch { return undefined; }
    return () => { try { po.disconnect(); } catch { /* ignore */ } };
  }, []);

  // Shak ka sabse bada mulzim: SyncManager har 45 second par localHash() chalata
  // hai, jo POORA cgl.* localStorage stringify karke har character par ghoomta
  // hai — main thread par, sync. Agar tera data bhaari hai to wo theek beech
  // likhne mein thread rok sakta hai. Guess karne se behtar hai naap lena.
  const runHashTest = () => {
    let chars = 0;
    const rows = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) || "";
      const n = k.length + (localStorage.getItem(k) || "").length;
      chars += n;
      rows.push({ k, kb: n / 1024 });
    }
    rows.sort((a, b) => b.kb - a.kb);
    const t0 = performance.now();
    localHash();
    const ms = performance.now() - t0;
    setHashTest({
      ms: Math.round(ms),
      kb: Math.round(chars / 1024),
      // localStorage har character ko 2 byte mein rakhta hai, aur quota bytes
      // mein naapa jata hai — isliye asli kharcha lagbhag dugna hai.
      mb: (chars * 2 / 1048576).toFixed(1),
      top: rows.slice(0, 8).map((r) => ({ k: r.k, kb: Math.round(r.kb) })),
    });
  };

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
      // 120Hz par ~8ms hona chahiye.
      //
      // Sirf STROKE ke andar ginte hain. Pehle har event ke beech ginta tha, to
      // pen uthakar do second sochne par bhi "1233ms — thread atka" dikh jata
      // tha, jabki kuch atka hi nahi tha. Aur pointerdown ke turant baad wala
      // pehla move bhi chhod dete hain: usme browser down se ab tak ke saare
      // samples ek saath deta hai, wo normal hai.
      const a = acc.current;
      const live = drawing.current && moves.current > 0;
      const gap = live && lastAt.current ? now - lastAt.current : 0;
      lastAt.current = now;
      a.type = e.pointerType;
      a.pressure = e.pressure;
      a.maxPressure = Math.max(a.maxPressure, e.pressure);
      a.tiltX = e.tiltX || 0;
      a.tiltY = e.tiltY || 0;
      a.twist = e.twist || 0;
      a.buttons = e.buttons;
      a.coalesced = coalesced;
      if (live) a.maxCoalesced = Math.max(a.maxCoalesced, coalesced);
      a.predicted = predicted;
      a.hz = ticks.current.length;
      a.gap = Math.round(gap);
      if (gap > 0) a.maxGap = Math.max(a.maxGap, Math.round(gap));
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
      drawing.current = true;
      moves.current = 0;
      lastAt.current = 0;   // naya stroke — ginti yahin se shuru
      note(e, 1, 0);
    };
    const onMove = (e) => {
      if (!e.buttons) { note(e, 1, 0); return; } // hover — sirf numbers, likhna nahi
      e.preventDefault();
      const co = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      const pr = e.getPredictedEvents ? e.getPredictedEvents() : [];
      draw(co);
      note(e, co.length, pr.length);
      moves.current += 1;
    };
    const onUp = (e) => {
      last.current = null;
      drawing.current = false;
      note(e, 1, 0);
    };

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
        {/* Version stamp — bina iske pata hi nahi chalta ki tablet naya code
            chala raha hai ya service worker purana pakde baitha hai. Vercel
            NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA khud deta hai. */}
        <p className="muted" style={{ fontSize: "0.78rem", marginTop: 4 }}>
          build: <strong>{BUILD}</strong>
          <button
            className="btn btn--ghost btn--sm"
            style={{ marginLeft: 10 }}
            onClick={async () => {
              try {
                const rs = await navigator.serviceWorker?.getRegistrations?.();
                if (rs) await Promise.all(rs.map((r) => r.unregister()));
                if (window.caches) {
                  const ks = await caches.keys();
                  await Promise.all(ks.map((k) => caches.delete(k)));
                }
              } catch { /* ignore */ }
              window.location.reload();
            }}
            title="Service worker aur cache hata kar taaza code laao"
          >
            🔄 Purana cache hatao
          </button>
        </p>
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
          <h3 style={{ fontSize: "0.95rem" }}>⏱️ Thread kis kaam mein atka (long tasks)</h3>
          <p className="muted" style={{ fontSize: "0.8rem", marginTop: 4 }}>
            50ms se lambe kaam. Likhte waqt yahan kuch aata hai to wahi lag ki asli wajah hai.
          </p>
          {longTasks.length === 0 ? (
            <p className="muted" style={{ fontSize: "0.84rem", marginTop: 6 }}>Abhi tak kuch nahi ✅</p>
          ) : (
            <ul style={{ fontSize: "0.86rem", marginTop: 6, paddingLeft: 18 }}>
              {longTasks.map((t, i) => (
                <li key={i}>
                  <strong>{t.ms} ms</strong>{" "}
                  <span className="muted">
                    — page khulne ke {t.since}s baad
                    {Number(t.since) < 4 ? " (app ka boot — chinta ki baat nahi)" : " ⚠️"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="glass-card mt-16">
          <h3 style={{ fontSize: "0.95rem" }}>🧪 Sync hash test</h3>
          <p className="muted" style={{ fontSize: "0.8rem", marginTop: 4 }}>
            SyncManager har 45 second par yahi kaam karta hai — poora localStorage stringify
            karke hash. Agar ye 100ms se zyada leta hai, to likhte waqt beech-beech mein
            thread isi ki wajah se rukta hai.
          </p>
          <button className="btn btn--ghost btn--sm mt-8" onClick={runHashTest}>Chala kar dekho</button>
          {hashTest && (
            <>
              <p className="mt-8" style={{ fontSize: "0.9rem", fontWeight: 700 }}>
                {hashTest.ms} ms · localStorage {hashTest.kb} KB (~{hashTest.mb} MB){" "}
                <span style={{ color: hashTest.ms > 100 ? "var(--danger)" : "var(--success)" }}>
                  {hashTest.ms > 100 ? "⚠️" : "✅"}
                </span>
              </p>
              {Number(hashTest.mb) >= 4 && (
                <p style={{ fontSize: "0.84rem", color: "var(--danger)", marginTop: 6 }}>
                  ⚠️ localStorage bhar chuka hai. Browser ki limit yahi hai — iske aage naya
                  data <strong>chupchaap save hona band</strong> ho sakta hai. Neeche dekho
                  kis cheez ne jagah ghera hai.
                </p>
              )}
              <ul style={{ fontSize: "0.84rem", marginTop: 8, paddingLeft: 18 }}>
                {hashTest.top.map((r) => (
                  <li key={r.k}><strong>{r.kb} KB</strong> — {r.k}</li>
                ))}
              </ul>
            </>
          )}
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
