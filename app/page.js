"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { nextUp } from "@/lib/vocab";

// The home page is one thing: what to do next.
//
// It used to be a wall of shortcuts, which is a menu — and the menu is already
// the left column. So instead this asks lib/vocab where you actually stopped and
// shows only that. Finish its quiz and the card rolls forward on its own:
// OWS -> Idiom -> Vocab -> the next day's OWS.
export default function Home() {
  const [next, setNext] = useState(undefined); // undefined = not read yet

  // localStorage, so it can only be read after mount.
  useEffect(() => { setNext(nextUp()); }, []);

  return (
    <section className="section">
      <div className="home-head">
        <h1>Aage kya</h1>
      </div>

      {next === undefined ? (
        <div className="placeholder">…</div>
      ) : next === null ? (
        <div className="nextup nextup--empty">
          <p className="muted">
            Sab ho gaya — ya abhi koi word add nahi kiya.
          </p>
          <Link href="/vocab" className="btn btn--primary mt-16">🔤 Vocab kholo</Link>
        </div>
      ) : (
        <Link href={`/vocab/${next.day}/${next.type}`} className="nextup">
          <span className="nextup__day">Day {next.day} <span className="muted">/ {next.totalDays}</span></span>
          <span className="nextup__title">
            <span className="nextup__ico">{next.icon}</span>
            {next.label}
          </span>
          <span className="nextup__meta">{next.count} words · quiz baaki hai</span>
          <span className="nextup__go">Shuru karo →</span>
        </Link>
      )}
    </section>
  );
}
