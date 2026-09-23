"use client";

// 🔒 Focus lock — top patti ka pill.
//
// Dabate hi PC par lock lag jata hai (over/focus.py): us dauran sirf apni
// site, overlay ke apne page aur Settings wali AI site khulti hain; koi aur
// khidki saamne aayi to chhoti ho jati hai aur poori screen par pardah.
//
// Yahan sirf teen kaam hain: chalu karo, ghadi dekho, aur hisaab dekho —
// aaj / is hafte / kul kitna waqt lock mein pada. Asli kaam PC wale app mein
// hota hai, isliye overlay band ho to pill khud bata deta hai.

import { useCallback, useEffect, useRef, useState } from "react";
import { focusStart, focusStop, focusState, focusLog } from "@/lib/overlaylink";

const MINS = [15, 25, 50];
const MIN_KEY = "focus.min";     // is device ki pasand — sync nahi

const mmss = (s) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;
function dur(sec) {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}

export default function FocusLock() {
  const [on, setOn] = useState(false);
  const [left, setLeft] = useState(0);
  const [here, setHere] = useState(true);      // overlay chal raha hai?
  const [open, setOpen] = useState(false);
  const [mins, setMins] = useState(25);
  const [log, setLog] = useState(null);
  const tick = useRef(null);

  useEffect(() => {
    try { setMins(Number(localStorage.getItem(MIN_KEY)) || 25); } catch { /* ignore */ }
  }, []);

  // Overlay se sach poochte raho — lock wahin chalta hai, yahan nahi.
  const ask = useCallback(async () => {
    const st = await focusState();
    setHere(!!st);
    setOn(!!(st && st.on));
    setLeft(st ? st.left : 0);
  }, []);

  useEffect(() => {
    ask();
    const id = setInterval(ask, 5000);
    return () => clearInterval(id);
  }, [ask]);

  // Beech ke second khud ginte hain — har second overlay ko poochna faltu hai.
  useEffect(() => {
    if (tick.current) clearInterval(tick.current);
    if (!on) return undefined;
    tick.current = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(tick.current);
  }, [on]);

  useEffect(() => {
    if (!open) return;
    focusLog().then(setLog);
  }, [open, on]);

  const go = async () => {
    const st = on ? await focusStop() : await focusStart(mins);
    setHere(!!st);
    setOn(!!(st && st.on));
    setLeft(st ? st.left : 0);
    focusLog().then(setLog);
  };

  return (
    <div className="flock">
      <button
        className={`flock__pill${on ? " is-on" : ""}`}
        onClick={() => setOpen((v) => !v)}
        title={on ? "Focus lock chalu hai" : "Focus lock — sirf site aur overlay"}
      >
        {on ? `🔒 ${mmss(left)}` : "🔒"}
      </button>

      {open && (
        <>
          <div className="pomo__scrim" onClick={() => setOpen(false)} />
          <div className="flock__panel" role="dialog">
            <div className="row between">
              <b>🔒 Focus lock</b>
              <button className="pomo__x" onClick={() => setOpen(false)}>✕</button>
            </div>

            {!here ? (
              <p className="hint" style={{ margin: "8px 0 0" }}>
                PC wala overlay band hai — lock wahin chalta hai. Pehle overlay chalu karo.
              </p>
            ) : (
              <>
                <div className="flock__big">{on ? mmss(left) : `${mins}:00`}</div>
                {!on && (
                  <div className="row" style={{ gap: 6, justifyContent: "center" }}>
                    {MINS.map((m) => (
                      <button
                        key={m}
                        className={`chip chip--btn chip--sm ${mins === m ? "is-active" : ""}`}
                        onClick={() => {
                          setMins(m);
                          try { localStorage.setItem(MIN_KEY, String(m)); } catch { /* ignore */ }
                        }}
                      >
                        {m}m
                      </button>
                    ))}
                  </div>
                )}
                <button className={`btn btn--sm mt-8 ${on ? "btn--ghost" : "btn--primary"}`} onClick={go}>
                  {on ? "⏹ Lock hatao" : "▶ Lock lagao"}
                </button>
                <p className="hint" style={{ margin: "8px 0 0", fontSize: "0.78rem" }}>
                  Lock ke dauran sirf ye site, overlay ke page aur Gemini khulenge.
                </p>
              </>
            )}

            {log && (
              <div className="flock__stats">
                <div><strong>{dur(log.today)}</strong><span>Aaj</span></div>
                <div><strong>{dur(log.week)}</strong><span>Is hafte</span></div>
                <div><strong>{dur(log.total)}</strong><span>Kul</span></div>
              </div>
            )}
            {log && log.sessions?.length > 0 && (
              <ul className="flock__list">
                {log.sessions.slice(0, 5).map((s, i) => (
                  <li key={i}>
                    <span>{String(s.at || "").slice(5, 16).replace("T", " ")}</span>
                    <span>{dur(s.secs)} {s.full ? "✓" : "· beech mein"}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
