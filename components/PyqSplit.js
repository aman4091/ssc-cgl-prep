"use client";

// ⚡ PYQ / Home — SPRINT jaisa roop: poori screen, upar patti, BAAYEN sawaal +
// options, DAAYEN sar ke saare button (✨ Gemini, 📝, 🐋, ✍️, 🎯 …) aur unke
// neeche jawab. Neeche ← pichhla / aage →. Ek waqt mein ek question.
//
// Site ka menu chhupa rehta hai (sprint ki tarah window sab dhak leti hai);
// upar ☰ dabao to menu dikhta hai aur window uske bagal mein khisak jati hai.
//
// Laga hua option / 🙈 / kahan tak pahunche — sab yaad (cgl.qfeed.<key>,
// cgl.pyqs.pos.<key>), chat wali window jaisa hi.

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import "../app/pyq/sprint/sprint.css";

const idOf = (q, i) => String(q && q.id != null ? q.id : i);
function readObj(k) {
  try { const v = JSON.parse(localStorage.getItem(k) || "{}"); return v && typeof v === "object" ? v : {}; } catch { return {}; }
}
const MENU_KEY = "cgl.pyqs.menu";

export default function PyqSplit({ title, list, renderCard, storeKey = "default", onNeedMore, noJump = false, headExtra = null, fullscreen = true }) {
  const KEY = `cgl.qfeed.${storeKey}`;
  const HKEY = `${KEY}.hid`;
  const PKEY = `cgl.pyqs.pos.${storeKey}`;
  const [picks, setPicks] = useState(() => (typeof window === "undefined" ? {} : readObj(KEY)));
  const [hid, setHid] = useState(() => (typeof window === "undefined" ? {} : readObj(HKEY)));
  const [pos, setPos] = useState(() => {
    // Home ki list har baar nayi bante hai — wahan "kahan the" yaad rakhna bekaar.
    if (typeof window === "undefined" || onNeedMore) return 0;
    const n = Number(localStorage.getItem(PKEY) || 0);
    return Number.isFinite(n) && n > 0 ? n : 0;
  });
  const at = Math.min(pos, Math.max(0, list.length - 1));

  const savePick = useCallback((id, oi) => {
    const all = readObj(KEY);
    if (oi == null) delete all[id]; else all[id] = oi;
    try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* quota */ }
    setPicks(all);
  }, [KEY]);
  const saveHid = useCallback((id, on) => {
    const all = readObj(HKEY);
    if (on) all[id] = 1; else delete all[id];
    try { localStorage.setItem(HKEY, JSON.stringify(all)); } catch { /* quota */ }
    setHid(all);
  }, [HKEY]);

  const go = useCallback((i) => {
    const j = Math.max(0, Math.min(list.length - 1, i));
    setPos(j);
    if (!onNeedMore) { try { localStorage.setItem(PKEY, String(j)); } catch { /* quota */ } }
  }, [list.length, PKEY, onNeedMore]);
  // Khatam na hone wali list (Home) — aakhri ke paas pahunche to aur maango.
  useEffect(() => { if (onNeedMore && at >= list.length - 3) onNeedMore(); }, [at, list.length, onNeedMore]);

  useEffect(() => {
    const k = (e) => {
      if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
      if (e.key === "ArrowRight") { e.preventDefault(); go(at + 1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); go(at - 1); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [at, go]);

  // 💬 Poochho panel ko saamne wala question — wahan ⭐ isi par lagta hai.
  const cur = list[at];
  useEffect(() => {
    try { window.dispatchEvent(new CustomEvent("cgl:sprint-q", { detail: { q: cur || null } })); } catch { /* ignore */ }
  }, [cur]);
  useEffect(() => () => {
    try { window.dispatchEvent(new CustomEvent("cgl:sprint-q", { detail: { q: null } })); } catch { /* ignore */ }
  }, []);

  // ⏭ Jahan chhoda — sabse aage wala laga hua question, uske baad wala.
  const jump = () => {
    let last = -1;
    list.forEach((q, i) => { if (picks[idOf(q, i)] != null) last = i; });
    go(last + 1);
  };

  // ☰ Menu — band (default) to window sab dhak leti hai; on to topbar /
  // sidebar ke bagal mein.
  const [menu, setMenu] = useState(() => { try { return localStorage.getItem(MENU_KEY) === "1"; } catch { return false; } });
  const [inset, setInset] = useState({ top: 0, left: 0 });
  useLayoutEffect(() => {
    if (!menu) { setInset({ top: 0, left: 0 }); return undefined; }
    const place = () => {
      const tb = document.querySelector(".topbar");
      const tr = tb ? tb.getBoundingClientRect() : null;
      const top = tr && tr.height ? Math.max(0, Math.round(tr.bottom + 6)) : 0;
      // Baayen ki menu patti (desktop par hamesha khuli) — uske bagal se.
      let left = 0;
      for (const el of document.querySelectorAll(".mnu, .drawer")) {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        if (r.width && r.left <= 0 && r.right > 0 && r.right < window.innerWidth / 2 && cs.display !== "none" && cs.visibility !== "hidden" && r.height > window.innerHeight / 2) {
          left = Math.max(left, Math.round(r.right));
        }
      }
      setInset((p) => (p.top === top && p.left === left ? p : { top, left }));
    };
    place();
    window.addEventListener("resize", place);
    const t = setInterval(place, 700);
    return () => { window.removeEventListener("resize", place); clearInterval(t); };
  }, [menu]);
  const toggleMenu = () => setMenu((m) => { const n = !m; try { localStorage.setItem(MENU_KEY, n ? "1" : "0"); } catch { /* quota */ } return n; });

  // ⛶ Poori screen (Home par) — Sprint wala hi tarika.
  const [fs, setFs] = useState(false);
  useEffect(() => {
    const h = () => setFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);
  const toggleFs = () => {
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen();
    } catch { /* ignore */ }
  };

  if (!list.length) return <div className="placeholder">Abhi koi question nahi.</div>;
  const id = idOf(cur, at);
  const done = list.reduce((n, q, i) => n + (picks[idOf(q, i)] != null ? 1 : 0), 0);
  return (
    <div className={`sp-wrap pyqs${menu ? " is-menu" : ""}`} style={menu ? { top: inset.top, left: inset.left } : undefined}>
      <div className="sp-top">
        <button type="button" className={`sp-ibtn${menu ? " is-on" : ""}`} onClick={toggleMenu} title="Site ka menu dikhao / chhupao">☰</button>
        <span className="sp-top__n">{at + 1}/{list.length}{onNeedMore ? "+" : ""}</span>
        <span className="sp-top__dim pyqs-title">{title}{onNeedMore ? "" : ` · ✓ ${done}`}</span>
        <span className="sp-top__sp" />
        {headExtra}
        {noJump ? null : <button type="button" className="sp-ibtn" onClick={jump} title="Jahan tak lagaye, uske baad wala question">⏭</button>}
        {fullscreen ? <button type="button" className="sp-ibtn" onClick={toggleFs} title="Poori screen">{fs ? "⤡" : "⛶"}</button> : null}
      </div>
      <div className="sp-bar"><div className="sp-bar__fill" style={{ width: `${((at + 1) / list.length) * 100}%` }} /></div>
      <div className="pyqs-body" key={id}>
        {renderCard(cur, at, {
          savedPick: picks[id] ?? null,
          savedHidden: !!hid[id],
          onPickSave: (oi) => savePick(id, oi),
          onClearSave: () => { savePick(id, null); saveHid(id, false); },
          onHideSave: (on) => saveHid(id, on),
        })}
      </div>
      <div className="sp-foot">
        <button type="button" className="sp-ibtn" onClick={() => go(at - 1)} disabled={at === 0}>← pichhla</button>
        <button type="button" className="sp-ibtn" onClick={() => go(at + 1)} disabled={at >= list.length - 1 && !onNeedMore}>aage →</button>
        <span className="sp-keys">← → = question · ☰ = menu</span>
      </div>
    </div>
  );
}
