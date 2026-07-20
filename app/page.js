"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { nextUp } from "@/lib/vocab";
import VocabDayType from "@/components/VocabDayType";

// The home page IS wherever you stopped in Vocab — not a card pointing at it.
//
// lib/vocab's nextUp() walks days in order and, within a day, TYPES in order,
// returning the first type that has words and has not been quizzed yet. Whatever
// it names is rendered here in full, words and all, by the same component the
// /vocab/[day]/[type] route uses. Finish that quiz and this page moves on by
// itself: OWS -> Idiom -> Vocab -> the next day's OWS.
export default function Home() {
  const [next, setNext] = useState(undefined); // undefined = not read yet

  // localStorage, so it can only be read after mount.
  useEffect(() => { setNext(nextUp()); }, []);

  if (next === undefined) return <section className="section"><div className="placeholder">…</div></section>;

  if (next === null) {
    return (
      <section className="section">
        <div className="home-head"><h1>Aage kya</h1></div>
        <p className="muted">Sab ho gaya — ya abhi koi word add nahi kiya.</p>
        <Link href="/vocab" className="btn btn--primary mt-16">🔤 Vocab kholo</Link>
      </section>
    );
  }

  return <VocabDayType day={next.day} type={next.type} />;
}
