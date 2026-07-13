"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import AskModal from "./AskModal";
import PomodoroTimer from "./PomodoroTimer";
import ChecklistMenu from "./ChecklistMenu";

const LINKS = [
  { href: "/today", label: "Today's Targets", icon: "📅" },
  { href: "/checklist", label: "Checklist", icon: "✅" },
  { href: "/subjects", label: "Subjects", icon: "📚" },
  { href: "/vocab", label: "Vocab · OWS", icon: "🔤" },
  { href: "/pyq", label: "PYQ Bank", icon: "🎯" },
  { href: "/papers", label: "Full Papers", icon: "📄" },
  { href: "/current-affairs", label: "Current Affairs", icon: "📰" },
  { href: "/static-gk", label: "Static GK", icon: "📗" },
  { href: "/calculation", label: "Calculation", icon: "🧮" },
  { href: "/revision", label: "Smart Revision", icon: "🔁" },
  { href: "/bookmarks", label: "Bookmarked Qs", icon: "⭐" },
  { href: "/saved-answers", label: "Saved Answers", icon: "💾" },
  { href: "/external-tests", label: "External Tests", icon: "🌐" },
  { href: "/quizzes", label: "Quizzes", icon: "🗂️" },
  { href: "/mistakes", label: "Mistake Notebook", icon: "🔴" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(false);

  const isActive = (href) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  // lock body scroll while the drawer is open + close on Escape
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <header className="navbar">
      <div className="container">
        <div className="navbar__inner">
          <div className="navbar__left row" style={{ gap: 10, alignItems: "center" }}>
            <button className="hamburger" aria-label="Menu" onClick={() => setOpen(true)}>
              <span /><span /><span />
            </button>
            <Link href="/" className="brand" onClick={() => setOpen(false)}>
              <span className="brand__mark">CGL</span>
              <span className="brand__text">
                <strong>SSC CGL Pre</strong>
                <small>Prep Hub</small>
              </span>
            </Link>
          </div>

          <div className="navbar__center">
            <PomodoroTimer />
            <ChecklistMenu />
          </div>

          <div className="navbar__actions">
            <button className="btn btn--ghost btn--ask" onClick={() => setAskOpen(true)}>
              <span className="ask-ico">🤖</span>
              <span className="ask-label">Ask</span>
            </button>
            <Link href="/today" className="btn btn--today">
              <span className="dot" />
              Today
            </Link>
          </div>
        </div>
      </div>

      {/* Left drawer */}
      <div className={`drawer-overlay ${open ? "is-open" : ""}`} onClick={() => setOpen(false)} />
      <aside className={`drawer ${open ? "is-open" : ""}`}>
        <div className="drawer__head">
          <span className="brand__mark">CGL</span>
          <strong style={{ fontSize: "1rem" }}>Prep Hub</strong>
          <button className="drawer__x" aria-label="Close" onClick={() => setOpen(false)}>✕</button>
        </div>
        <nav className="drawer__nav">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={`drawer__link ${isActive(l.href) ? "is-active" : ""}`} onClick={() => setOpen(false)}>
              <span className="drawer__ico">{l.icon}</span>
              {l.label}
            </Link>
          ))}
        </nav>
      </aside>

      <AskModal open={askOpen} onClose={() => setAskOpen(false)} />
    </header>
  );
}
