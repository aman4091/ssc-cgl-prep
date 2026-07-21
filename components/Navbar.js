"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV_GROUPS, NAV_DIRECT, groupForPath } from "@/lib/nav";

// The menu, and only the menu.
//
// A DRILL-DOWN, not a dropdown: the top level is names only. Tapping one
// replaces the list in place with that group's items and a "← back" row, rather
// than expanding underneath and pushing the rest of the menu down.
//
// It is the left column at every width. Below the breakpoint it just gets
// narrower; it never moves to the top of the page and there is no hamburger,
// because a drill-down is short enough not to need one.
export default function Navbar() {
  const pathname = usePathname();
  const params = useSearchParams();
  // Seeded from the URL during render so landing deep in the app already shows
  // that group, rather than flashing the top level first.
  const [group, setGroup] = useState(() => groupForPath(pathname));
  // A group can name a BANK instead of listing links — its rows are that bank's
  // chapters, fetched the first time the group is opened and then memoised by
  // the loader itself.
  const [bankLinks, setBankLinks] = useState({});
  // Phones only: the rail is off-canvas until the hamburger asks for it.
  const [open, setOpen] = useState(false);

  useEffect(() => { setGroup(groupForPath(pathname)); }, [pathname]);

  // A group can describe a BANK instead of listing links: which index to read,
  // which array in it holds the chapters, and what those rows link to. Fetched
  // the first time the group is opened, then kept.
  useEffect(() => {
    const g = NAV_GROUPS.find((x) => x.key === group);
    if (!g?.bank || bankLinks[g.key]) return;
    let alive = true;
    fetch(g.bank.url)
      .then((r) => (r.ok ? r.json() : null))
      .then((idx) => {
        if (!alive || !idx) return;
        let rows = idx[g.bank.list] || [];
        // gkbank is two shelves in one file, split by subject.
        if (g.bank.subject) rows = rows.filter((c) => c.subject === g.bank.subject);
        setBankLinks((prev) => ({
          ...prev,
          [g.key]: rows.map((c) => ({
            href: `${g.bank.href}/${c.slug}`,
            label: c.chapter || c.label || c.slug,
          })),
        }));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [group, bankLinks]);
  // Navigating means you are done with the menu — and on a phone it sits over
  // the page you just opened.
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Several rows can share a path and differ only by query — the three Current
  // Affairs tabs do — so matching on the path alone lights all of them up at
  // once. A row with a query must match that query as well; a row flagged
  // `isDefault` also matches when the query is absent, because that is the tab
  // its page opens on.
  const isActive = ({ href, isDefault }) => {
    const [p, q] = String(href).split("?");
    if (!(pathname === p || pathname.startsWith(p + "/"))) return false;
    if (!q) return true;
    for (const [k, v] of new URLSearchParams(q)) {
      const cur = params.get(k);
      if (cur === null ? !isDefault : cur !== v) return false;
    }
    return true;
  };
  const current = NAV_GROUPS.find((g) => g.key === group) || null;

  return (
    <>
      {/* Phone only — hidden by CSS once the rail is permanent. */}
      <button
        className={`navtoggle ${open ? "is-hidden" : ""}`}
        aria-label="Menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        ☰
      </button>
      {open && <div className="drawer__backdrop" onClick={() => setOpen(false)} />}
    <aside className={`drawer ${open ? "is-open" : ""}`}>
      <div className="drawer__head">
        <Link href="/" className="drawer__brand">
          {/* Inline, not a file: a strict-CSP-safe mark that also inherits the
              theme's two pens instead of being a fixed-colour image. */}
          <svg className="brand__mark" viewBox="0 0 32 32" aria-hidden="true">
            <rect x="1" y="1" width="30" height="30" rx="8"
                  fill="none" stroke="var(--accent)" strokeWidth="2" />
            <circle cx="16" cy="16" r="7.5" fill="none"
                    stroke="var(--accent2)" strokeWidth="2" />
            <circle cx="16" cy="16" r="2.5" fill="var(--accent)" />
          </svg>
          <span className="brand__text">
            <strong>SSC CGL Pre</strong>
            <span className="drawer__sub">Prep Hub · Prelims</span>
          </span>
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

            {(current.bank ? bankLinks[current.key] || [] : current.links).map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`drawer__link ${isActive(l) ? "is-active" : ""}`}
              >
                {l.label}
              </Link>
            ))}
            {current.bank && !bankLinks[current.key] && (
              <span className="drawer__link" style={{ color: "var(--dim)" }}>Loading…</span>
            )}
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
                className={`drawer__link drawer__link--top ${isActive(d) ? "is-active" : ""}`}
              >
                <span className="drawer__ico">{d.icon}</span>
                {d.label}
              </Link>
            ))}
          </>
        )}
      </nav>
    </aside>
    </>
  );
}
