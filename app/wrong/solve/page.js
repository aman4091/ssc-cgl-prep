"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  getWrongBook, getWrongById, isSubject, imagesOf, dayKey, dayLabel,
  subjectLabel, setInk,
} from "@/lib/wrongbook";
import {
  openInk, saveLocalInk, pushInk, emptyDoc, flushInkQueue,
  getConflictInk, clearConflictInk,
} from "@/lib/ink";
import { useImageUrls } from "@/lib/wrongimages";
import { setSyncPaused } from "@/lib/sync";
import InkCanvas, { PALETTE, PEN_SIZES } from "@/components/InkCanvas";
import WrongAnswerBlock from "@/components/WrongAnswerBlock";

// ✍️ Solve — tablet par stylus se Wrong Notebook ke question ke neeche solution
// likhne ki jagah.
//
// Alag route isliye, /wrong ke card ke andar canvas thoos-ne ke bajay:
//  • Canvas ko apne poore area par `touch-action: none` chahiye. Card ki
//    scrolling list ke andar wo list ke apne scroll se ladta — "canvas ke paas
//    page scroll hi nahi hota" ya "likhne par page bhagta hai", dono kharab.
//  • Yahan poori screen chahiye: Navbar, Footer, orbs — kuch nahi.
//  • Prev/next ko viewport aur back button dono chahiye.
//
// URL wahi convention leta hai jo /wrong pehle se leta hai (?subject, ?d), taaki
// dono ke beech aana-jaana seedha rahe.

const LOCAL_MS = 700;    // IndexedDB — sasta, isliye jaldi
const CLOUD_MS = 6000;   // R2 upload — mehnga, isliye ruk kar

function SolveInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const urlSubject = sp.get("subject");
  const subject = isSubject(urlSubject) ? urlSubject : "reasoning";
  const d = sp.get("d") || "all";
  const id = sp.get("id") || "";

  // Wahi shelf jo /wrong par khuli thi — subject + date filter.
  //
  // List effect mein bharti hai, render ke dauraan nahi: getWrongBook()
  // localStorage padhta hai, jo server par hai hi nahi. Render mein padhte to
  // server khaali HTML bhejta aur client bhara hua — hydration mismatch, aur
  // React poora tree phenk kar dobara banata. /wrong bhi isi wajah se apne
  // items useEffect mein load karta hai.
  const [list, setList] = useState([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const all = getWrongBook(subject);
    setList(d === "all" ? all : all.filter((r) => dayKey(r.at) === d));
    setReady(true);
  }, [subject, d]);

  const found = list.findIndex((r) => r.id === id);
  const idx = Math.max(0, found);
  const rec = list[idx] || null;

  const [doc, setDoc] = useState(null);       // InkCanvas ko diya jane wala initial doc
  const [loading, setLoading] = useState(true);
  const [shown, setShown] = useState(false);  // answer reveal
  const [slim, setSlim] = useState(false);    // question pane collapse
  const [conflict, setConflict] = useState(null);
  const [state, setState] = useState("saved"); // saved | dirty | uploading | offline
  const [tool, setTool] = useState("pen");
  const [colorIdx, setColorIdx] = useState(0);
  const [sizeIdx, setSizeIdx] = useState(1);
  const [dark, setDark] = useState(false);
  const [, setStats] = useState({ strokes: 0 });

  const inkRef = useRef(null);
  const liveDoc = useRef(null);      // canvas ka latest doc
  const localT = useRef(null);
  const cloudT = useRef(null);
  const recRef = useRef(null);
  recRef.current = rec;

  const { urls, missing } = useImageUrls(rec ? imagesOf(rec) : []);

  // ── overlay: fullscreen + body lock ───────────────────────────────────────
  useEffect(() => {
    setDark(document.documentElement.getAttribute("data-theme") === "dark");
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Fullscreen best-effort — wahi pattern jo FullscreenRunner use karta hai.
    // Fail ho jaye to bhi .inkv overlay poori screen leta hi hai.
    try { document.documentElement.requestFullscreen?.().catch(() => {}); } catch { /* ignore */ }
    // IndexedDB storage pressure mein evict ho sakti hai — handwriting ke liye
    // ye maang lena zaroori hai, warna tablet ki jagah bharne par likha hua ja
    // sakta hai.
    try { navigator.storage?.persist?.(); } catch { /* ignore */ }
    return () => {
      document.body.style.overflow = prev;
      try { if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {}); } catch { /* ignore */ }
    };
  }, []);

  // Jab tak yahan likh rahe ho, background sync band. Uska poora-localStorage
  // hash main thread par chalta hai aur stroke ke beech aa jaye to nib rok deta
  // hai. Bahar niklte hi wapas chalu — tab wo pointer bhi le jayega.
  useEffect(() => {
    setSyncPaused(true);
    return () => setSyncPaused(false);
  }, []);

  // Ruki hui uploads — khulte hi aur online wapas aate hi.
  useEffect(() => {
    const flush = () => { flushInkQueue(getWrongById, setInk).catch(() => {}); };
    flush();
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  }, []);

  // ── current record ka ink load ────────────────────────────────────────────
  useEffect(() => {
    if (!rec) { setLoading(false); return undefined; }
    let alive = true;
    setLoading(true);
    setShown(false);
    setConflict(null);
    (async () => {
      const r = await openInk(rec).catch(() => null);
      if (!alive) return;
      const next = r?.doc || emptyDoc();
      liveDoc.current = next;
      setDoc(next);
      setLoading(false);
      if (r?.conflict) setConflict(await getConflictInk(rec.id).catch(() => null));
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rec?.id]);

  // ── saving ────────────────────────────────────────────────────────────────

  // Pen kaagaz par ho to bhaari kaam mat karo — thodi der baad dobara try karo.
  //
  // Ye lag ki asli jad thi. onChange stroke KHATAM hone par 700ms ka timer
  // lagata hai. Agla stroke 500ms par shuru hua, to 700ms par save theek us
  // stroke ke BEECH chal padta tha. Aur saveLocalInk ke andar encodeDoc har
  // stroke ka har point ghoomta hai — yaani page jitna bharta jata, ye jhatka
  // utna hi bada hota jata. Isliye "shuru mein theek tha, baad mein atakne
  // laga".
  const deferIfDrawing = useCallback((fn, timerRef, ms = 350) => {
    if (inkRef.current?.isDrawing?.()) {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(fn, ms);
      return true;
    }
    return false;
  }, []);

  const flushLocal = useCallback(async () => {
    const r = recRef.current;
    if (!r || !liveDoc.current) return;
    if (deferIfDrawing(() => flushLocal(), localT)) return;
    clearTimeout(localT.current);
    await saveLocalInk(r.id, liveDoc.current).catch(() => {});
  }, [deferIfDrawing]);

  const flushCloud = useCallback(async () => {
    const r = recRef.current;
    if (!r || !liveDoc.current) return;
    // Upload aur bhaari hai (encode + gzip), isliye ye bhi pen uthne ka intezaar
    // karta hai.
    if (deferIfDrawing(() => flushCloud(), cloudT, 600)) return;
    clearTimeout(cloudT.current);
    setState("uploading");
    try {
      await pushInk(r, liveDoc.current, setInk);
      setState("saved");
    } catch {
      // pushInk khud queue mein daal chuka hai — online aate hi chala jayega.
      setState("offline");
    }
  }, [deferIfDrawing]);

  const onChange = useCallback((next) => {
    liveDoc.current = next;
    setState((s) => (s === "offline" ? s : "dirty"));
    clearTimeout(localT.current);
    localT.current = setTimeout(() => { flushLocal(); }, LOCAL_MS);
    clearTimeout(cloudT.current);
    cloudT.current = setTimeout(() => { flushCloud(); }, CLOUD_MS);
  }, [flushLocal, flushCloud]);

  // App background mein gaya / tab band — jo pending hai turant likh do.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") { flushLocal(); flushCloud(); }
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
      clearTimeout(localT.current);
      clearTimeout(cloudT.current);
    };
  }, [flushLocal, flushCloud]);

  // ── navigation ────────────────────────────────────────────────────────────
  // Local save ka INTEZAAR karke hi agla question kholte hain. "Next dabaya aur
  // page chala gaya" ek baar bhi ho gaya to is feature par bharosa khatam.
  const go = useCallback(async (nextIdx) => {
    const target = list[nextIdx];
    if (!target) return;
    await flushLocal();
    flushCloud();
    router.replace(`/wrong/solve?subject=${subject}&d=${encodeURIComponent(d)}&id=${target.id}`);
  }, [list, flushLocal, flushCloud, router, subject, d]);

  // Wapas Answers page par — /wrong hata diya gaya hai, ab wahi list yahan
  // dikhti hai. Date filter uske paas nahi hai, isliye sirf subject le jaate hain.
  const exit = useCallback(async () => {
    await flushLocal();
    flushCloud();
    router.push(`/answers?subject=${subject}`);
  }, [flushLocal, flushCloud, router, subject]);

  // Eraser toggle karte waqt wapas usi tool par jaana hai jispar tha (pen ya
  // highlighter), isliye pichhla tool yaad rakhte hain.
  const prevTool = useRef("pen");
  const toggleEraser = useCallback(() => {
    setTool((t) => {
      if (t === "eraser") return prevTool.current || "pen";
      prevTool.current = t;
      return "eraser";
    });
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      // Mi Pen ke side buttons Bluetooth se PageUp/PageDown bhejte hain — wo
      // digitizer se nahi aate, isliye pointer event ke `buttons` mein kabhi
      // nahi dikhte. Yahi unhe pakadne ka ekmatra raasta hai.
      //
      // Is pen mein eraser waala ulta sira bhi nahi hai, isliye eraser ko
      // button par daalna sabse zyada kaam ka hai; dusra button undo.
      //
      // preventDefault zaroori hai — warna ye keys likhne wale kaagaz ko hi
      // scroll kar dengi. repeat wale ignore, warna button dabaye rakhne par
      // eraser jhilmilata rahega aur undo ka dhher lag jayega.
      if (e.key === "PageDown" || e.key === "PageUp") {
        e.preventDefault();
        if (e.repeat) return;
        if (e.key === "PageDown") toggleEraser();
        else inkRef.current?.undo();
        return;
      }
      if (e.key === "ArrowRight") go(idx + 1);
      else if (e.key === "ArrowLeft") go(idx - 1);
      else if (e.key === "Escape") exit();
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) inkRef.current?.redo();
        else inkRef.current?.undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, exit, idx, toggleEraser]);

  if (!rec) {
    return (
      <div className="inkv">
        <div className="inkv__top">
          <button className="btn btn--ghost btn--sm" onClick={() => router.push("/answers")}>← Wapas</button>
          <span className="inkv__title">Solve</span>
        </div>
        <div className="placeholder" style={{ margin: 20 }}>
          {ready ? "Is shelf mein koi question nahi mila. 🤔" : "Khul raha hai…"}
        </div>
      </div>
    );
  }

  const stateLabel = { saved: "💾 saved", dirty: "✍️ …", uploading: "⏳ upload", offline: "📴 device par" }[state];

  return (
    <div className="inkv">
      <div className="inkv__top">
        <button className="btn btn--ghost btn--sm" onClick={exit} title="Wrong Notebook par wapas">←</button>
        <span className="inkv__title">
          {subjectLabel(rec.subject)} · {dayLabel(rec.at)}{rec.qid ? ` · 🔖 ${rec.qid}` : ""}
        </span>
        <span className="inkv__pill" style={{ marginLeft: "auto" }}>{stateLabel}</span>
        <span className="inkv__pill">{idx + 1}/{list.length}</span>
      </div>

      <div className="inkv__body">
        <div className={`inkv__q${slim ? " inkv__q--slim" : ""}`}>
          <div className="row" style={{ gap: 6, marginBottom: slim ? 0 : 8 }}>
            <button className="btn btn--ghost btn--sm" onClick={() => setSlim((v) => !v)}>
              {slim ? "▼ Question" : "▲ Chhupao"}
            </button>
            {!slim && (
              <button className="btn btn--ghost btn--sm" onClick={() => setShown((v) => !v)}>
                {shown ? "🙈 Hide" : "👁️ Check karo"}
              </button>
            )}
          </div>

          {!slim && (
            <>
              {urls.map((u, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={u} alt={`Question ${i + 1}`} />
              ))}
              {missing > 0 && (
                <p className="muted" style={{ fontSize: "0.8rem" }}>
                  📷 {missing} image is device par nahi hai (R2 par upload nahi hui thi).
                </p>
              )}
              {/* Answer jaan-boojh kar chhupa hai — /wrong ke card par wo hamesha
                  dikhta hai, par yahan pehle likhna hai, phir check karna hai. */}
              <WrongAnswerBlock rec={rec} shown={shown} hideAnswer />
            </>
          )}
        </div>

        <div className="inkv__ink">
          {conflict && (
            <div className="answer-box" style={{ position: "absolute", inset: "8px 8px auto", zIndex: 3 }}>
              <p style={{ fontSize: "0.84rem", fontWeight: 600 }}>
                ⚠️ Dusre device ki nayi writing aa gayi. Is device ka bina-save kiya kaam bacha liya gaya hai.
              </p>
              <div className="row mt-8" style={{ gap: 8 }}>
                <button
                  className="btn btn--primary btn--sm"
                  onClick={() => {
                    liveDoc.current = conflict.doc;
                    setDoc(conflict.doc);
                    onChange(conflict.doc);
                    clearConflictInk(rec.id);
                    setConflict(null);
                  }}
                >
                  ↩ Mera waala wapas lao
                </button>
                <button
                  className="btn btn--ghost btn--sm"
                  onClick={() => { clearConflictInk(rec.id); setConflict(null); }}
                >
                  Rehne do
                </button>
              </div>
            </div>
          )}
          {loading ? (
            <div className="placeholder" style={{ margin: 16 }}>Writing load ho rahi hai… ✍️</div>
          ) : (
            <InkCanvas
              ref={inkRef}
              initialDoc={doc}
              tool={tool}
              colorIdx={colorIdx}
              sizeIdx={sizeIdx}
              dark={dark}
              onChange={onChange}
              onStats={setStats}
            />
          )}
        </div>
      </div>

      <div className="inkv__tools">
        <button className="btn btn--ghost btn--sm" aria-pressed={tool === "pen"} onClick={() => setTool("pen")} title="Pen">✏️</button>
        <button className="btn btn--ghost btn--sm" aria-pressed={tool === "hl"} onClick={() => setTool("hl")} title="Highlighter">🖍️</button>
        <button className="btn btn--ghost btn--sm" aria-pressed={tool === "eraser"} onClick={toggleEraser} title="Eraser — pen ka NEECHE wala button bhi yahi karta hai">🧽</button>

        <span className="inkv__sep" />
        {PALETTE.map((c, i) => (
          <button
            key={i}
            className="inkv__swatch"
            aria-pressed={colorIdx === i}
            onClick={() => { setColorIdx(i); setTool((t) => (t === "eraser" ? "pen" : t)); }}
            title={c.name}
            style={{ background: dark ? c.dark : c.light }}
          />
        ))}

        <span className="inkv__sep" />
        {PEN_SIZES.map((s, i) => (
          <button key={i} className="btn btn--ghost btn--sm" aria-pressed={sizeIdx === i} onClick={() => setSizeIdx(i)} title={`Size ${i + 1}`}>
            {["·", "•", "⬤"][i]}
          </button>
        ))}

        <span className="inkv__sep" />
        <button className="btn btn--ghost btn--sm" onClick={() => inkRef.current?.undo()} disabled={!inkRef.current?.canUndo()} title="Undo — pen ka UPAR wala button bhi yahi karta hai">↩</button>
        <button className="btn btn--ghost btn--sm" onClick={() => inkRef.current?.redo()} disabled={!inkRef.current?.canRedo()} title="Redo">↪</button>
        <button
          className="btn btn--ghost btn--sm"
          onClick={() => { if (confirm("Poori writing mita du?")) inkRef.current?.clear(); }}
          title="Sab mitao"
        >
          🗑️
        </button>
        <button className="btn btn--ghost btn--sm" onClick={() => inkRef.current?.grow()} title="Aur jagah jodo">➕ jagah</button>

        <span className="inkv__sep" />
        <button className="btn btn--ghost btn--sm" onClick={() => go(idx - 1)} disabled={idx <= 0}>← Q</button>
        <button className="btn btn--ghost btn--sm" onClick={() => go(idx + 1)} disabled={idx >= list.length - 1}>Q →</button>
      </div>
    </div>
  );
}

export default function WrongSolvePage() {
  // useSearchParams ko Suspense chahiye, warna poora route static rendering se
  // bahar ho jata hai — /wrong bhi yahi karta hai.
  return (
    <Suspense fallback={<div className="placeholder">Loading…</div>}>
      <SolveInner />
    </Suspense>
  );
}
