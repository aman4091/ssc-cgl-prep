"use client";

// ⏱️ 1 ghante ke Revision batch — 27 Oct paper se pehle (owner: "poore pyq
// ke 1 ghante revision batch… priority se… sab cover ho jaye"). Notes
// (public/pyq_notes — PYQ 2025-26, GS Hot 22, Maths, English, Vocab) ka har
// <h3> hissa kisi na kisi batch mein hai; batch scripts/build-revision.py se
// bante hain (public/pyq_notes/revision.json). Priority: 🔴 must → 🟠 zaroor →
// 🟢 time bache to. Batch kholo to uske hisse yahin poore notes ki tarah
// dikhte hain (lib/pyqnotes cutSlides). Ho gaya → localStorage (cgl.rev.*).

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { cutSlides, PN_BASE } from "@/lib/pyqnotes";
import "../pyq-notes/notes-lib.css";
import "./revision.css";

const TIER = { 1: "🔴 Must", 2: "🟠 Zaroor", 3: "🟢 Time bache to" };
const load = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };
const hm = (m) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60 ? `${m % 60}m` : ""}`.trim() : `${m}m`);
const sname = (s) => s.name.replace(/^\S+\s/, "");
const bno = (b) => b.id.replace(/^\D+/, "");

// 📴 Offline (owner: "phone par bina internet ke chale") — /revision, uske
// chunks aur notes ki saari HTML/JSON seedhe "cgl-notes-v1" cache mein (public/sw.js
// isi se offline jawab deta hai). Batch kholna history.pushState se, taaki
// offline mein bhi server se kuch na maangna pade.
const OFF_CACHE = "cgl-notes-v1";
const OFF_KEY = "cgl.rev.offline";
function offlineUrls(idx) {
  const own = typeof performance === "undefined" ? [] : performance.getEntriesByType("resource")
    .map((e) => new URL(e.name)).filter((u) => u.origin === location.origin && u.pathname.startsWith("/_next/static/")).map((u) => u.pathname);
  return [...new Set(["/revision", `${PN_BASE}/index.json`, `${PN_BASE}/revision.json`, ...own,
    ...idx.books.flatMap((b) => b.topics.map((t) => `${PN_BASE}/${b.key}/${t.id}.html`))])];
}

function OfflineBox({ idx }) {
  const [st, setSt] = useState({ k: "idle" });
  const run = async () => {
    if (!idx || typeof caches === "undefined") { setSt({ k: "na" }); return; }
    const urls = offlineUrls(idx);
    setSt({ k: "dl", n: 0, of: urls.length });
    let ok = 0;
    try {
      const c = await caches.open(OFF_CACHE);
      for (let i = 0; i < urls.length; i += 6) {
        await Promise.all(urls.slice(i, i + 6).map(async (u) => {
          try { const r = await fetch(u, { cache: "no-cache" }); if (r.ok) { await c.put(u, r); ok += 1; } } catch { /* agli baar */ }
        }));
        setSt({ k: "dl", n: Math.min(i + 6, urls.length), of: urls.length });
      }
    } catch { /* cache band */ }
    const full = ok === urls.length;
    if (full) save(OFF_KEY, { at: Date.now(), n: ok });
    setSt({ k: full ? "ok" : "part", n: ok, of: urls.length });
  };
  useEffect(() => {
    if (!idx) return;
    const was = load(OFF_KEY, null);
    if (was) setSt({ k: "ok", n: was.n, of: was.n });
    // Pehli baar (ya 6 ghante baad) online ho to apne aap utaar lo.
    if (navigator.onLine && (!was || Date.now() - was.at > 6 * 36e5)) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);
  const txt = {
    idle: "📴 Offline taiyaar nahi",
    na: "📴 Is browser mein offline nahi ho sakta",
    dl: `⬇️ Offline utar raha hai… ${st.n}/${st.of}`,
    ok: "✅ Offline taiyaar — bina internet chalega",
    part: `⚠️ ${st.n}/${st.of} utre — internet par dobara dabao`,
  }[st.k];
  return (
    <div className={`rv-off is-${st.k}`}>
      <span>{txt}</span>
      {st.k !== "dl" ? <button type="button" onClick={run}>{st.k === "ok" ? "Taaza karo" : "⬇️ Utaaro"}</button> : null}
    </div>
  );
}

// Aaj ka kram: har tier mein chaaron subject baari-baari (GS, Maths, English,
// Vocab, GS…), taaki ek subject ke chakkar mein baaki na chhootein.
function planOrder(subjects) {
  const out = [];
  [1, 2, 3].forEach((tier) => {
    const q = subjects.map((s) => s.batches.filter((b) => b.tier === tier).map((b) => ({ s, b })));
    for (let i = 0; q.some((x) => x.length > i); i += 1) q.forEach((x) => { if (x[i]) out.push(x[i]); });
  });
  return out;
}

function BatchCard({ s, b, n, done, onOpen, onDone, sub }) {
  const secs = b.parts.reduce((a, p) => a + p.s.length, 0);
  return (
    <li className={`rv-card t${b.tier}${done ? " is-done" : ""}`}>
      <div className="rv-card__hd">
        <span className="rv-no">{n}</span>
        <div className="rv-card__t">
          <b>{sub ? `${s.name} · ` : ""}Batch {bno(b)}</b>
          <small>{TIER[b.tier]} · ~{b.min} min · {secs} hisse{b.pyq ? ` · ${b.pyq} PYQ tag` : ""}</small>
        </div>
        <label className="rv-chk" title="Ho gaya">
          <input type="checkbox" checked={done} onChange={() => onDone(b.id)} /> <span>{done ? "Ho gaya" : "Baaki"}</span>
        </label>
      </div>
      <ul className="rv-parts">
        {b.parts.map((p) => (
          <li key={`${p.b}${p.t}${p.s[0][0]}`}>
            <span>{p.tn}</span>
            <small>{p.s.length === 1 ? p.s[0][2] : `${p.s[0][2]} → ${p.s[p.s.length - 1][2]}`} · ~{p.m}m</small>
          </li>
        ))}
      </ul>
      <button type="button" className="rv-go" onClick={() => onOpen(b.id)}>▶ {done ? "Dobara padho" : "Shuru karo"}</button>
    </li>
  );
}

// Ghadi apne component mein — har second sirf ye badle. Pehle poora Reader
// har second dobara banta tha aur notes ki table ka side-scroll (owner:
// "wapas starting mein aa jata hai") 0 par chala jata tha.
function Clock({ t0, min, onRestart }) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    setNow(Date.now());
    return () => clearInterval(t);
  }, []);
  const el = t0 && now ? Math.max(0, Math.floor((now - t0) / 1000)) : 0;
  return (
    <button type="button" className={`rv-clock${el > min * 60 ? " is-over" : ""}`} onClick={onRestart} title="Ghadi dobara 0 se">
      {String(Math.floor(el / 60)).padStart(2, "0")}:{String(el % 60).padStart(2, "0")}
    </button>
  );
}

function Reader({ data, idx, id, done, onDone, onClose, onOpen }) {
  const flat = useMemo(() => data.subjects.flatMap((s) => s.batches.map((b) => ({ s, b }))), [data]);
  const at = flat.findIndex((x) => x.b.id === id);
  const { s, b } = flat[at] || {};
  const next = flat[at + 1] && flat[at + 1].s === s ? flat[at + 1] : null;
  const [blocks, setBlocks] = useState(null);
  const [t0, setT0] = useState(null);
  // ⛶ Poori screen (owner) — sirf notes, site ka menu nahi. Browser ka
  // fullscreen (Android par address bar bhi chhupe) + CSS se fixed parda,
  // kyunki iPhone Safari page ka fullscreen deta hi nahi.
  const [fs, setFs] = useState(false);
  const box = useRef(null);
  const setFull = (on) => {
    setFs(on);
    try {
      if (on && !document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
      if (!on && document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    } catch { /* ignore */ }
  };
  useEffect(() => {
    const on = () => { if (!document.fullscreenElement) setFs(false); };
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, []);
  useEffect(() => () => { try { if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {}); } catch { /* ignore */ } }, []);

  useEffect(() => {
    if (!b) return undefined;
    let alive = true;
    setBlocks(null);
    const st = load("cgl.rev.start", {});
    if (!st[id]) { st[id] = Date.now(); save("cgl.rev.start", st); }
    setT0(st[id]);
    const files = [...new Set(b.parts.map((p) => `${p.b}/${p.t}`))];
    Promise.all(files.map((f) => fetch(`${PN_BASE}/${f}.html`).then((r) => r.text()).then((h) => [f, cutSlides(h)]).catch(() => [f, []])))
      .then((all) => {
        if (!alive) return;
        const by = Object.fromEntries(all);
        setBlocks(b.parts.map((p) => {
          const want = new Set(p.s.map((x) => x[0]));
          const ss = (by[`${p.b}/${p.t}`] || []).filter((x) => want.has(x.key));
          // Chapter (h2) ke hisaab se jodo — notes jaisa.
          const secs = [];
          ss.forEach((x) => {
            const last = secs[secs.length - 1];
            if (last && last.id === x.sec) last.items.push(x);
            else secs.push({ id: x.sec, h2: x.h2, c: x.c, items: [x] });
          });
          return { p, secs };
        }));
      });
    window.scrollTo({ top: 0 });
    if (box.current) box.current.scrollTop = 0;
    return () => { alive = false; };
  }, [b, id]);

  // Notes ka DOM ek baar bane — Reader dobara bane (poori screen, ho gaya) to
  // bhi table ka side-scroll apni jagah rahe.
  const notes = useMemo(() => {
    if (!blocks) return null;
    const bookName = (k) => { const B = idx?.books.find((x) => x.key === k); return B ? `${B.icon} ${B.name}` : k; };
    return blocks.map(({ p, secs }) => (
      <div key={`${p.b}${p.t}${p.s[0][0]}`} className="rv-part">
        <div className="ntl-head">
          <div className="k">{bookName(p.b)}</div>
          <h2>{p.tn}</h2>
          <a className="rv-full" href={`/pyq-notes?b=${p.b}&t=${p.t}&s=${p.s[0][1]}`}>Notes page par kholo ›</a>
        </div>
        <div className="ntl-view">
          {secs.map((x) => (
            <section key={x.id} className={`chap ${x.c}`}>
              <div dangerouslySetInnerHTML={{ __html: x.h2 }} />
              {x.items.map((sl) => (
                <div key={sl.key} className="ntl-blk">
                  {sl.pre ? <div dangerouslySetInnerHTML={{ __html: sl.pre }} /> : null}
                  {sl.h3 ? <div className="ntl-h3"><div dangerouslySetInnerHTML={{ __html: sl.h3 }} /></div> : null}
                  <div dangerouslySetInnerHTML={{ __html: sl.rest }} />
                </div>
              ))}
            </section>
          ))}
        </div>
      </div>
    ));
  }, [blocks, idx]);

  if (!b) return <p className="hint">Ye batch nahi mila.</p>;
  const restart = () => { const st = load("cgl.rev.start", {}); st[id] = Date.now(); save("cgl.rev.start", st); setT0(st[id]); };

  return (
    <div className={`rv-read${fs ? " is-fs" : ""}`} ref={box}>
      <div className="rv-bar">
        <button type="button" className="rv-back" onClick={() => { setFull(false); onClose(); }}>‹ Batches</button>
        <div className="rv-bar__t"><b>{s.name} · Batch {bno(b)}</b><small>{TIER[b.tier]} · ~{b.min} min</small></div>
        <Clock t0={t0} min={b.min} onRestart={restart} />
        <button type="button" className="rv-fs" onClick={() => setFull(!fs)} aria-pressed={fs} title={fs ? "Poori screen band" : "Poori screen"} aria-label={fs ? "Poori screen band" : "Poori screen"}>{fs ? "⤡" : "⛶"}</button>
      </div>
      <div className="ntl-wrap">
        <div className="ntl rv-ntl">
          <main className="ntl-main">
            <div className="ntl-col">
              {!blocks ? <p className="hint">Notes khul rahe hain…</p> : notes}
              {blocks ? (
                <div className="rv-end">
                  <button type="button" className={`rv-done${done ? " is-on" : ""}`} onClick={() => onDone(id, true)}>
                    {done ? "✅ Batch ho gaya" : "✓ Batch khatam — ho gaya"}
                  </button>
                  {next ? <button type="button" className="rv-next" onClick={() => { onDone(id, true); onOpen(next.b.id); }}>Agla: {sname(s)} Batch {bno(next.b)} ›</button> : null}
                </div>
              ) : null}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function RevisionInner() {
  const sp = useSearchParams();
  const [data, setData] = useState(null);
  const [idx, setIdx] = useState(null);
  const [tab, setTab] = useState("plan");
  const [done, setDone] = useState([]);
  const open = sp.get("batch");

  useEffect(() => {
    setTab(load("cgl.rev.tab", "plan"));
    setDone(load("cgl.rev.done", []));
    fetch(`${PN_BASE}/revision.json`).then((r) => r.json()).then(setData).catch(() => setData({ subjects: [] }));
    fetch(`${PN_BASE}/index.json`).then((r) => r.json()).then(setIdx).catch(() => {});
  }, []);

  const plan = useMemo(() => (data ? planOrder(data.subjects) : []), [data]);
  const go = (t) => { setTab(t); save("cgl.rev.tab", t); };
  const setDoneId = (id, on) => setDone((p) => {
    const has = p.includes(id);
    const want = on == null ? !has : on;
    if (want === has) return p;
    const n = want ? [...p, id] : p.filter((x) => x !== id);
    save("cgl.rev.done", n);
    return n;
  });
  const nav = (u) => { window.history.pushState(null, "", u); window.scrollTo({ top: 0 }); };
  const openB = (id) => nav(`/revision?batch=${id}`);

  if (!data) return <div className="placeholder">Loading…</div>;
  if (open) return <Reader data={data} idx={idx} id={open} done={done.includes(open)} onDone={setDoneId} onOpen={openB} onClose={() => nav("/revision")} />;

  const all = data.subjects.flatMap((s) => s.batches);
  const leftMin = all.filter((b) => !done.includes(b.id)).reduce((a, b) => a + b.min, 0);
  const must = all.filter((b) => b.tier === 1);
  const mustLeft = must.filter((b) => !done.includes(b.id));
  const S = data.subjects.find((s) => s.key === tab);

  return (
    <div className="rv">
      <header className="rv-hd">
        <div>
          <small>SSC CGL · 27 Oct · Notes ka poora revision</small>
          <h1>⏱️ 1 ghante ke batch</h1>
        </div>
        <div className="rv-count"><b>{done.length}/{all.length}</b><span>batch ho gaye · {hm(leftMin)} baaki</span></div>
      </header>
      <OfflineBox idx={idx} />
      <div className="rv-prog" aria-hidden="true"><i style={{ width: `${(done.length / Math.max(1, all.length)) * 100}%` }} /></div>

      <nav className="rv-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "plan"} onClick={() => go("plan")}>🗓️ Aaj ka kram</button>
        {data.subjects.map((s) => {
          const d = s.batches.filter((b) => done.includes(b.id)).length;
          return <button key={s.key} type="button" role="tab" aria-selected={tab === s.key} onClick={() => go(s.key)}>{s.name} <em>{d}/{s.batches.length}</em></button>;
        })}
      </nav>

      {tab === "plan" ? (
        <>
          <div className="rv-rule">
            <b>Kaise chalna hai</b>
            Upar se neeche, ek-ek batch. Chaaron subject baari-baari aate hain taaki koi na chhoote.
            Pehle saare <b>🔴 Must</b> ({must.length} batch, ~{hm(must.reduce((a, b) => a + b.min, 0))}) — ye aaj zaroor.
            Phir <b>🟠 Zaroor</b>, phir <b>🟢</b>. Har batch ke baad 5 min break.
            Notes ke saare hisse in batches mein hain — kuch bahar nahi.
            {mustLeft.length ? <> Abhi <b>{mustLeft.length}</b> must batch baaki.</> : <> Saare must ho gaye 👏</>}
          </div>
          <ol className="rv-list">
            {plan.map(({ s, b }, i) => (
              <BatchCard key={b.id} s={s} b={b} n={i + 1} sub done={done.includes(b.id)} onOpen={openB} onDone={setDoneId} />
            ))}
          </ol>
        </>
      ) : S ? (
        <>
          <p className="rv-lead">{S.name}: {S.batches.length} batch, ~{hm(S.batches.reduce((a, b) => a + b.min, 0))}. Priority kram mein — upar wala pehle.</p>
          <ol className="rv-list">
            {S.batches.map((b, i) => (
              <BatchCard key={b.id} s={S} b={b} n={i + 1} done={done.includes(b.id)} onOpen={openB} onDone={setDoneId} />
            ))}
          </ol>
        </>
      ) : null}
      <p className="rv-foot">Reasoning ke notes is site par nahi hain — uske liye mock / PYQ practice rakho.</p>
    </div>
  );
}

export default function RevisionPage() {
  return <Suspense fallback={<div className="placeholder">Loading…</div>}><RevisionInner /></Suspense>;
}
