"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// The menu, and only the menu.
//
// There used to be a fixed bar across the top carrying a hamburger, the
// Pomodoro timer, the checklist, Ask and Today. The owner asked for it gone:
// Ask moved to the home page, and the timer/checklist/Today pills were dropped
// (Checklist and Today already have their own pages, listed below).
//
// What is left is the notes theme's layout: on a wide screen this <aside> is
// simply the left column of .shell and is always open. On a phone it is a block
// at the top of the page — the app name plus a ☰ that expands the list inline.
// It is not fixed and it does not float; with 20 links, expanding on demand is
// what keeps it from pushing every page a screen and a half down.
const LINKS = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/today", label: "Today's Targets", icon: "📅" },
  { href: "/roadmap", label: "AI Roadmap", icon: "🧠" },
  { href: "/daily", label: "Daily Quiz", icon: "🗓️" },
  { href: "/checklist", label: "Checklist", icon: "✅" },
  { href: "/subjects", label: "Subjects", icon: "📚" },
  { href: "/notes/polity", label: "Polity Notes", icon: "📔" },
  { href: "/vocab", label: "Vocab · OWS", icon: "🔤" },
  { href: "/pyq", label: "PYQ Bank", icon: "🎯" },
  { href: "/papers", label: "Full Papers", icon: "📄" },
  { href: "/current-affairs", label: "Current Affairs", icon: "📰" },
  { href: "/static-gk", label: "Static GK", icon: "📗" },
  { href: "/calculation", label: "Calculation", icon: "🧮" },
  { href: "/bookmarks", label: "Bookmarked Qs", icon: "⭐" },
  { href: "/saved-answers", label: "Saved Answers", icon: "💾" },
  { href: "/external-tests", label: "External Tests", icon: "🌐" },
  { href: "/quiz-bank", label: "Quiz Bank", icon: "🗃️" },
  { href: "/mock-tests", label: "Mock Tests", icon: "🧪" },
  { href: "/quizzes", label: "My Quizzes", icon: "🗂️" },
  { href: "/mistakes", label: "Mistake Notebook", icon: "🔴" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  // Collapse the list again on navigation — on a phone the menu sits above the
  // page it just navigated to, so leaving it open buries the content.
  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <aside className={`drawer ${open ? "is-open" : ""}`}>
      <div className="drawer__head">
        <Link href="/" className="drawer__brand">
          <strong style={{ fontSize: "0.95rem", display: "block" }}>SSC CGL Pre</strong>
          <span className="drawer__sub">Prep Hub · Prelims</span>
        </Link>
        {/* Phone only — the wide layout has nothing to expand. */}
        <button
          className="drawer__toggle"
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          ☰
        </button>
      </div>
      <nav className="drawer__nav">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={`drawer__link ${isActive(l.href) ? "is-active" : ""}`}>
            <span className="drawer__ico">{l.icon}</span>
            {l.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
