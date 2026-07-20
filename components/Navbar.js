"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV_GROUPS, groupForPath } from "@/lib/nav";
import { getChapters } from "@/lib/grammar";

// The menu, and only the menu.
//
// One level of grouping: the subject name, and clicking it reveals the names
// inside. Nothing is pinned above the groups — the owner asked for everything to
// live inside a subject. The list of groups is lib/nav.js; this file only draws
// it.
//
// On a wide screen this <aside> is the left column of .shell and is always
// visible. On a phone it is a block at the top with a ☰ that expands it in
// place — it does not float and does not cover the page.
export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);          // phone: whole menu
  // Seeded from the URL rather than set in an effect, so the group you are
  // inside is already open in the first paint instead of flashing shut.
  const [group, setGroup] = useState(() => groupForPath(pathname));
  const [chapters, setChapters] = useState({});

  // The user's own chapters live in localStorage, so they can only be read after
  // mount — reading during render would not match the server-rendered markup.
  useEffect(() => {
    const map = {};
    for (const g of NAV_GROUPS) if (g.subject) map[g.subject] = getChapters(g.subject);
    setChapters(map);
  }, [pathname]);

  // Landing deep in the app should show you where you are.
  useEffect(() => { setGroup(groupForPath(pathname)); }, [pathname]);

  // On a phone the menu sits above the page it just navigated to, so leaving it
  // open would bury the content.
  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const isActive = (href) => pathname === href || pathname.startsWith(href + "/");

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
        {NAV_GROUPS.map((g) => {
          const isOpen = group === g.key;
          const own = (g.subject ? chapters[g.subject] : null) || [];
          const count = own.length + g.links.length;
          return (
            <div key={g.key} className={`drawer__group ${isOpen ? "is-open" : ""}`}>
              <button
                className="drawer__grouphd"
                aria-expanded={isOpen}
                onClick={() => setGroup(isOpen ? null : g.key)}
              >
                <span className="drawer__ico">{g.icon}</span>
                <span className="drawer__groupname">{g.name}</span>
                <span className="drawer__count">{count}</span>
                <span className="drawer__chev">{isOpen ? "▾" : "▸"}</span>
              </button>

              {isOpen && (
                <div className="drawer__children">
                  {own.map((c) => (
                    <Link
                      key={c.id}
                      href={`/study/${g.subject}/${c.id}`}
                      className={`drawer__link ${isActive(`/study/${g.subject}/${c.id}`) ? "is-active" : ""}`}
                    >
                      {c.name}
                    </Link>
                  ))}
                  {g.links.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      className={`drawer__link ${isActive(l.href) ? "is-active" : ""}`}
                    >
                      {l.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
