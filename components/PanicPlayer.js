"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  cachedList, fetchList, takeFromBag, logPress, logChoice, pressesThisWeek,
  CHOICES, SESSION_SIZE, PHOTO_MS, CAROUSEL_PHOTO_MS,
} from "@/lib/panic";

// 🚨 Panic player — poori screen, 5 post (lib/panic ki thaili se), ek ke baad
// ek. Video khatam -> agli; photo 8s (carousel ki 6s) -> agli. Upar stories
// jaisi patti, baayein tap = peeche, daayein = aage, beech = ruko.
//
// 5 ke baad "Ab kya karoge?" — yahi asli kaam hai. Videos sirf dhakka hain;
// agar ye screen na ho to panic button khud ek naya scroll ban jata.
//
// onClose(reason) — reason "nav" matlab player khud kisi page par bhej chuka
// hai (📋 Aaj ka kaam), bulane wala ab kuch na kare.
export default function PanicPlayer({ onClose }) {
  const router = useRouter();
  const [phase, setPhase] = useState("loading"); // loading | play | after | go | error
  const [error, setError] = useState("");
  const [session, setSession] = useState([]);
  const [idx, setIdx] = useState(0);
  const [part, setPart] = useState(0);
  const [partProgress, setPartProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [goText, setGoText] = useState("");
  const [weekN, setWeekN] = useState(0);

  const rootRef = useRef(null);
  const videoRef = useRef(null);
  const pressRef = useRef("");
  const listRef = useRef([]);
  const mutedRef = useRef(false);
  const elapsedRef = useRef(0);
  const startedRef = useRef(false);

  const post = session[idx];
  const media = post?.media?.[part];
  const nextMedia = post
    ? (post.media[part + 1] || session[idx + 1]?.media?.[0] || null)
    : null;

  const start = useCallback((items) => {
    const s = takeFromBag(items, SESSION_SIZE);
    if (!s.length) {
      setError("Abhi koi video nahi mili — npm run panic:upload chalao.");
      setPhase("error");
      return;
    }
    setSession(s);
    setIdx(0);
    setPart(0);
    setPaused(false);
    setPhase("play");
  }, []);

  // Dabate hi log, aur list — pichhli copy turant, taaza peeche se.
  useEffect(() => {
    if (startedRef.current) return;   // dev ka StrictMode effect do baar chalata hai
    startedRef.current = true;
    pressRef.current = logPress();
    const cached = cachedList();
    listRef.current = cached;
    if (cached.length) {
      start(cached);
      fetchList().then((l) => { if (l.length) listRef.current = l; }).catch(() => {});
    } else {
      fetchList()
        .then((l) => { listRef.current = l; start(l); })
        .catch((e) => { setError(String(e?.message || e)); setPhase("error"); });
    }
  }, [start]);

  // Peeche ka page na hile, aur ho sake to poori screen (button ka tap abhi
  // taaza hai, isliye browser maan jata hai; /panic seedha khule to chupchaap na).
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    try { rootRef.current?.requestFullscreen?.().catch(() => {}); } catch { /* ignore */ }
    return () => {
      document.body.style.overflow = prev;
      try { if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {}); } catch { /* ignore */ }
    };
  }, []);

  const next = useCallback(() => {
    if (!post) return;
    setPaused(false);
    if (part + 1 < post.media.length) setPart(part + 1);
    else if (idx + 1 < session.length) { setIdx(idx + 1); setPart(0); }
    else { setWeekN(pressesThisWeek()); setPhase("after"); }
  }, [post, part, idx, session.length]);

  const prev = useCallback(() => {
    setPaused(false);
    if (part > 0) { setPart(part - 1); return; }
    if (idx > 0) { setIdx(idx - 1); setPart(0); return; }
    // Pehli hi post par — shuru se.
    const v = videoRef.current;
    if (v) { v.currentTime = 0; v.play().catch(() => {}); }
    elapsedRef.current = 0;
    setPartProgress(0);
  }, [part, idx]);

  // Naya media = patti aur ghadi shunya se. (Timer wale effect se PEHLE rehna
  // chahiye — effects isi kram mein chalte hain.)
  useEffect(() => {
    elapsedRef.current = 0;
    setPartProgress(0);
  }, [media?.url]);

  // Video: awaaz ke saath chalao; browser mana kare to bina awaaz, aur 🔊 dikhao.
  useEffect(() => {
    if (phase !== "play" || media?.type !== "video") return;
    const v = videoRef.current;
    if (!v) return;
    v.muted = mutedRef.current;
    v.play()?.catch?.(() => {
      v.muted = true;
      mutedRef.current = true;
      setMuted(true);
      v.play().catch(() => {});
    });
  }, [phase, media?.url, media?.type]);

  // Photo: apni ghadi. Rukne par ruk jati hai, wahi se aage chalti hai.
  useEffect(() => {
    if (phase !== "play" || media?.type !== "image" || paused) return;
    const dur = post.media.length > 1 ? CAROUSEL_PHOTO_MS : PHOTO_MS;
    const t0 = Date.now() - elapsedRef.current;
    const id = setInterval(() => {
      const el = Date.now() - t0;
      elapsedRef.current = el;
      setPartProgress(Math.min(1, el / dur));
      if (el >= dur) { clearInterval(id); next(); }
    }, 100);
    return () => clearInterval(id);
  }, [phase, media?.url, media?.type, paused, post, next]);

  const togglePause = useCallback(() => {
    const v = videoRef.current;
    if (v) { if (paused) v.play().catch(() => {}); else v.pause(); }
    setPaused(!paused);
  }, [paused]);

  const unmute = (e) => {
    e.stopPropagation();
    mutedRef.current = false;
    setMuted(false);
    const v = videoRef.current;
    if (v) { v.muted = false; v.play().catch(() => {}); }
  };

  const close = useCallback(() => onClose?.(), [onClose]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      if (phase !== "play") return;
      if (e.key === "ArrowRight") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      else if (e.key === " ") { e.preventDefault(); togglePause(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, next, prev, togglePause, close]);

  const choose = (c) => {
    logChoice(pressRef.current, c.key);
    if (c.key === "more") {
      start(listRef.current.length ? listRef.current : cachedList());
      return;
    }
    if (c.href) {
      router.push(c.href);
      onClose?.("nav");
      return;
    }
    setGoText(c.key === "pushups"
      ? "Abhi. 10 pushups. Phone neeche rakh do."
      : "Uth jao — kamre se bahar, ek glass paani.");
    setPhase("go");
  };

  const postProgress = post ? (part + partProgress) / post.media.length : 0;

  return (
    <div className="panic" ref={rootRef} role="dialog" aria-modal="true" aria-label="Panic button">
      {phase === "play" && post && (
        <>
          <div className="panic__bars" aria-hidden="true">
            {session.map((p, i) => (
              <span key={p.id} className="panic__bar">
                <span style={{ width: `${(i < idx ? 1 : i > idx ? 0 : postProgress) * 100}%` }} />
              </span>
            ))}
          </div>

          <div className="panic__stage">
            {media.type === "video" ? (
              <video
                key={media.url}
                ref={videoRef}
                className="panic__media"
                src={media.url}
                playsInline
                preload="auto"
                onEnded={next}
                onError={next}
                onTimeUpdate={(e) => {
                  const v = e.currentTarget;
                  if (v.duration) setPartProgress(v.currentTime / v.duration);
                }}
              />
            ) : (
              <img key={media.url} className="panic__media" src={media.url} alt="" onError={next} />
            )}
          </div>

          {/* Agla media pehle se utar lo — beech mein kaala khaali screen na aaye. */}
          {nextMedia?.type === "video" && (
            <video key={"pre" + nextMedia.url} className="panic__preload" src={nextMedia.url} preload="auto" muted playsInline />
          )}
          {nextMedia?.type === "image" && (
            <img key={"pre" + nextMedia.url} className="panic__preload" src={nextMedia.url} alt="" />
          )}

          <div className="panic__taps">
            <button className="panic__tap panic__tap--prev" onClick={prev} aria-label="Peeche" />
            <button className="panic__tap panic__tap--mid" onClick={togglePause} aria-label={paused ? "Chalao" : "Roko"} />
            <button className="panic__tap panic__tap--next" onClick={next} aria-label="Aage" />
          </div>

          {paused && <div className="panic__paused" aria-hidden="true">▮▮</div>}
          {muted && media.type === "video" && (
            <button className="panic__unmute" onClick={unmute}>🔊 Awaaz ke liye tap karo</button>
          )}

          <div className="panic__meta">
            <span className="panic__count">{idx + 1}/{session.length}</span>
            {post.username && <span className="panic__user">@{post.username}</span>}
          </div>
        </>
      )}

      {phase === "loading" && <div className="panic__center">Laa raha hoon…</div>}

      {phase === "error" && (
        <div className="panic__center">
          <p>{error}</p>
          <button className="panic__btn" onClick={close}>Band karo</button>
        </div>
      )}

      {phase === "after" && (
        <div className="panic__center panic__after">
          <h2>Ab kya karoge?</h2>
          <p className="panic__week">Is hafte {weekN} baar dabaya.</p>
          <div className="panic__choices">
            {CHOICES.map((c) => (
              <button
                key={c.key}
                className={"panic__btn" + (c.key === "more" ? " panic__btn--ghost" : "")}
                onClick={() => choose(c)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {phase === "go" && (
        <div className="panic__center panic__after">
          <h2>{goText}</h2>
          <button className="panic__btn" onClick={close}>✓ Ho gaya</button>
        </div>
      )}

      <button className="panic__x" onClick={close} aria-label="Band karo">✕</button>
    </div>
  );
}
