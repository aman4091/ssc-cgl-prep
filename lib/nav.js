// The one place the site's navigation is defined.
//
// The menu is a DRILL-DOWN, not an accordion: the top level is names only, and
// opening one REPLACES the list with that group's items plus a back row.
//
// The four subject groups (Maths / Reasoning / English / General Studies) were
// removed at the owner's request — they were shells around the "add / manage
// chapters" pages. What was useful inside them moved out: Pocket Rules into
// Notes, Static GK into Notes, Current Affairs up to its own group, Calculation
// up to a one-tap row.

export const NAV_GROUPS = [
  {
    key: "ca",
    name: "Current Affairs",
    icon: "📰",
    links: [
      // These three share a path and differ only by ?tab, so the menu has to
      // compare the query too — otherwise all three highlight at once.
      // `isDefault` marks the tab the page opens on when there is no ?tab.
      { href: "/current-affairs?tab=daily", label: "Daily", isDefault: true },
      { href: "/current-affairs?tab=monthly", label: "Monthly" },
      { href: "/current-affairs?tab=yearly", label: "Yearly" },
    ],
  },
  {
    key: "pyq",
    name: "PYQ Bank",
    icon: "🎯",
    links: [
      { href: "/pyq/math", label: "Maths PYQs" },
      { href: "/pyq/reasoning", label: "Reasoning PYQs" },
      { href: "/pyq/english", label: "English PYQs" },
      { href: "/pyq/gs", label: "General Awareness PYQs" },
      { href: "/pyq/mathbank", label: "Mathbank · chapter-wise" },
      { href: "/pyq/reasonbank", label: "Reasonbank · chapter-wise" },
      { href: "/pyq/pinnacle", label: "Pinnacle · chapter-wise" },
      { href: "/pyq/war", label: "War · subject-wise" },
    ],
  },
  {
    key: "notes",
    name: "Notes",
    icon: "📔",
    links: [
      { href: "/notes/polity", label: "Polity · SIMPLICRACK" },
      { href: "/notes/static-gk", label: "Static GK · Rojgar" },
      { href: "/english/pocket", label: "Pocket Rules" },
      { href: "/static-gk", label: "Static GK · topics" },
    ],
  },
  {
    key: "practice",
    name: "Practice & Tests",
    icon: "📝",
    links: [
      { href: "/daily", label: "Daily Quiz" },
      { href: "/quiz-bank", label: "Quiz Bank · topic-wise" },
      { href: "/mock-tests", label: "Mock Tests" },
      { href: "/quizzes", label: "My Quizzes" },
      { href: "/external-tests", label: "External Tests" },
    ],
  },
];

// Reached in one tap from the top level — no group to open first.
//
// Track & Revise is gone: Today's Targets, AI Roadmap, Checklist and Saved
// Answers were deleted, and the two rows worth keeping — Bookmarks and Settings
// — came out here rather than sitting alone behind a group.
export const NAV_DIRECT = [
  { href: "/vocab", label: "Vocab · OWS", icon: "🔤" },
  { href: "/calculation", label: "Calculation", icon: "🧮" },
  { href: "/bookmarks", label: "Bookmarked Questions", icon: "⭐" },
  { href: "/mistakes", label: "Mistake Notebook", icon: "🔴" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

// Menu hrefs may carry a query (Current Affairs opens a tab), but a pathname
// never does — so always compare on the path half.
export const pathOf = (href) => String(href || "").split("?")[0];

// Which group a path belongs to — used to open the right level on load, so
// landing deep in the app still shows you where you are.
export function groupForPath(pathname) {
  if (!pathname || pathname === "/") return null;
  if (NAV_DIRECT.some((d) => pathname === d.href || pathname.startsWith(d.href + "/"))) return null;

  let best = null;
  let bestLen = 0;
  for (const g of NAV_GROUPS) {
    for (const l of g.links) {
      const p = pathOf(l.href);
      if ((pathname === p || pathname.startsWith(p + "/")) && p.length > bestLen) {
        best = g.key;
        bestLen = p.length;
      }
    }
  }
  return best;
}
