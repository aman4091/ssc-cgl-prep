"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV_GROUPS, NAV_DIRECT, groupForPath } from "@/lib/nav";
import { getChapters } from "@/lib/grammar";

// The menu, and only the menu.
//
// A DRILL-DOWN, not a dropdown: the top level is subject names only. Tapping one
// replaces the list in place with that subject's items and a "← back" row. The
// owner asked for exactly this — an accordion that expands inline pushes the
// rest of the menu down the screen, which is what made the old menu feel long.
//
// It is always the left column, at every width. Below the breakpoint it just
// gets narrower; it never moves to the top of the page and there is no
// hamburger, because a drill-down is short enough not to need one.
export default function Navbar() {
  const pathname = usePathname();
  // null = top level. Seeded from the URL during render so landing deep in the
  // app already shows that group, rather than flashing the top level first.
  const [group, setGroup] = useState(() => groupForPath(pathname));
  const [chapters, setChapters] = useState({});

  // The user's own chapters live in localStorage, so they can only be read after
  // mount — reading during render would not match the server-rendered markup.
  useEffect(() => {
    const map = {};
    for (const g of NAV_GROUPS) if (g.subject) map[g.subject] = getChapters(g.subject);
    setChapters(map);
  }, [pathname]);

  useEffect(() => { setGroup(groupForPath(pathname)); }, [pathname]);

  const isActive = (href) => pathname === href || pathname.startsWith(href + "/");
  const current = NAV_GROUPS.find((g) => g.key === group) || null;

  return (
    <aside className="drawer">
      <div className="drawer__head">
        <Link href="/" className="drawer__brand">
          <strong style={{ fontSize: "0.95rem", display: "block" }}>SSC CGL Pre</strong>
          <span className="drawer__sub">Prep Hub · Prelims</span>
        </Link>
      </div>

      <nav className="drawer__nav">
        {current ? (
          /* ---- level 2: one group, in place of the list ---- */
          <>
            <button className="drawer__back" onClick={() => setGroup(null)}>
              <span className="drawer__chev">←</span>
              <span className="drawer__groupname">{current.name}</span>
            </button>

            {((current.subject ? chapters[current.subject] : null) || []).map((c) => (
              <Link
                key={c.id}
                href={`/study/${current.subject}/${c.id}`}
                className={`drawer__link ${isActive(`/study/${current.subject}/${c.id}`) ? "is-active" : ""}`}
              >
                {c.name}
              </Link>
            ))}

            {current.links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`drawer__link ${isActive(l.href) ? "is-active" : ""}`}
              >
                {l.label}
              </Link>
            ))}
          </>
        ) : (
          /* ---- level 1: names only ---- */
          <>
            {NAV_GROUPS.map((g) => (
              <button key={g.key} className="drawer__grouphd" onClick={() => setGroup(g.key)}>
                <span className="drawer__ico">{g.icon}</span>
                <span className="drawer__groupname">{g.name}</span>
                <span className="drawer__chev">›</span>
              </button>
            ))}

            <div className="drawer__rule" />

            {NAV_DIRECT.map((d) => (
              <Link
                key={d.href}
                href={d.href}
                className={`drawer__link drawer__link--top ${isActive(d.href) ? "is-active" : ""}`}
              >
                <span className="drawer__ico">{d.icon}</span>
                {d.label}
              </Link>
            ))}
          </>
        )}
      </nav>
    </aside>
  );
}
