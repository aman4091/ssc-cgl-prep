"use client";

import Link from "next/link";
import { useState } from "react";
import AskModal from "@/components/AskModal";

// The home page used to carry a 9-group accordion that was the real menu, while
// the sidebar showed a different, flat list of 20 links and /subjects showed a
// third set of cards. The accordion moved into the sidebar (lib/nav.js), so this
// page no longer navigates the whole site — it is just the place you land.
//
// What is left is the handful of things worth starting from a standing start.
const QUICK = [
  { href: "/daily", icon: "🗓️", name: "Daily Quiz", note: "Aaj ke questions" },
  { href: "/quiz-bank", icon: "🗂️", name: "Quiz Bank", note: "Topic-wise sets" },
  { href: "/mistakes", icon: "🔴", name: "Mistake Notebook", note: "Galtiyan dobara karo" },
  { href: "/calculation", icon: "🧮", name: "Calculation", note: "Speed maths" },
];

export default function Home() {
  const [askOpen, setAskOpen] = useState(false);

  return (
    <section className="section">
      <div className="home-head">
        <h1>SSC CGL Prep</h1>
        <p className="muted">
          Left menu se subject chuno — andar uske chapters, PYQs aur notes hain.
        </p>
        <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <button className="btn btn--primary btn--sm" onClick={() => setAskOpen(true)}>
            🤖 Ask AI
          </button>
        </div>
      </div>

      <div className="home-quick">
        {QUICK.map((q) => (
          <Link key={q.href} href={q.href} className="home-quick__item">
            <span className="home-quick__ico">{q.icon}</span>
            <span className="home-quick__text">
              <strong>{q.name}</strong>
              <span className="muted">{q.note}</span>
            </span>
            <span className="home-quick__go">→</span>
          </Link>
        ))}
      </div>

      <AskModal open={askOpen} onClose={() => setAskOpen(false)} />
    </section>
  );
}
