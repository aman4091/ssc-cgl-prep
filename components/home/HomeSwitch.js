"use client";

// 🏠 Home ka roop — dropdown se. "0" = abhi wala (Sprint jaisa sawaal-jawab,
// components/reels/Reels). Baaki purane roop try karne ke liye:
//   "old"   — Mission ka ABHI card + ⚡ Sprint + "Aaj ka kaam"
//   a–n     — chaudah purane roop (components/home/old)
// Chunaav is device par `cgl.home2`.

import { useEffect, useState } from "react";
import Link from "next/link";
import Reels from "@/components/reels/Reels";
import MissionToday from "@/components/MissionToday";
import TodayGate from "@/components/TodayGate";
import useMissionHomeOld from "./old/useMissionHome";
import { HOMES } from "./old/registry";
import "./old/home.css";

const KEY = "cgl.home2";

function OldHome() {
  return (
    <>
      <MissionToday />
      <div className="section" style={{ marginTop: 14 }}>
        <Link href="/pyq/sprint" className="btn btn--primary">⚡ Sprint — 100 Q, 1 ghanta</Link>
      </div>
      <div className="section" style={{ marginTop: 18 }}>
        <details className="fold">
          <summary className="fold__hd">Aaj ka kaam — question ki ginti</summary>
          <div className="fold__body"><TodayGate /></div>
        </details>
      </div>
    </>
  );
}

function OldRoop({ id }) {
  const d = useMissionHomeOld();
  const H = HOMES.find((h) => h.id === id);
  if (!H || !d || d.setup) return <OldHome />;
  const C = H.C;
  return <C d={d} />;
}

export default function HomeSwitch() {
  const [v, setV] = useState("0");
  useEffect(() => {
    try { const x = localStorage.getItem(KEY) || ""; if (x === "old" || HOMES.some((h) => h.id === x)) setV(x); } catch { /* ignore */ }
  }, []);
  const pick = (x) => { setV(x); try { localStorage.setItem(KEY, x); } catch { /* ignore */ } };

  const sel = (
    <select className="home-pick" value={v} onChange={(e) => pick(e.target.value)} aria-label="Home ka roop">
      <option value="0">🎨 0 · Abhi wala (sawaal-jawab)</option>
      <option value="old">🎨 Purana Home (Mission + Sprint)</option>
      {HOMES.map((h) => <option key={h.id} value={h.id}>🎨 {h.id.toUpperCase()} · {h.name}</option>)}
    </select>
  );

  if (v === "0") return <Reels headExtra={sel} />;
  return (
    <>
      <div className="home-pickbar">{sel}</div>
      {v === "old" ? <OldHome /> : <OldRoop id={v} />}
    </>
  );
}
