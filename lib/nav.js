// The one place the site's navigation is defined.
//
// It used to live in three places that disagreed with each other: a flat list of
// 20 links in the sidebar, a 9-group accordion on the home page, and a third set
// of cards on /subjects. Now there is one list, and the sidebar draws it.
//
// The menu is a DRILL-DOWN, not an accordion: the top level is names only, and
// opening one REPLACES the list with that group's items plus a back row. The
// owner asked for it that way — a dropdown that pushes the rest of the menu down
// is the thing being avoided.
//
// Groups carrying a `subject` key also get the user's own chapters (from
// lib/grammar's localStorage store) spliced in ABOVE their static links, which
// is why the menu has to be built on the client.

export const NAV_GROUPS = [
  {
    key: "math",
    name: "Maths",
    icon: "🧮",
    subject: "math",
    links: [{ href: "/study/math", label: "＋ Add / manage chapters" }],
  },
  {
    key: "reasoning",
    name: "Reasoning",
    icon: "🧠",
    subject: "reasoning",
    links: [{ href: "/study/reasoning", label: "＋ Add / manage chapters" }],
  },
  {
    key: "english",
    name: "English",
    icon: "📚",
    subject: "english",
    links: [
      { href: "/english/pocket", label: "Pocket Rules" },
      { href: "/study/english", label: "＋ Add / manage chapters" },
    ],
  },
  {
    key: "gs",
    name: "General Studies",
    icon: "🌍",
    subject: "gs",
    links: [
      { href: "/current-affairs", label: "Current Affairs" },
      { href: "/static-gk", label: "Static GK" },
      { href: "/study/gs", label: "＋ Add / manage chapters" },
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
      { href: "/papers", label: "Full Papers" },
      { href: "/calculation", label: "Calculation" },
      { href: "/quizzes", label: "My Quizzes" },
      { href: "/external-tests", label: "External Tests" },
    ],
  },
  {
    key: "track",
    name: "Track & Revise",
    icon: "📊",
    links: [
      { href: "/today", label: "Today's Targets" },
      { href: "/roadmap", label: "AI Roadmap" },
      { href: "/checklist", label: "Checklist" },
      { href: "/bookmarks", label: "Bookmarked Questions" },
      { href: "/saved-answers", label: "Saved Answers" },
      { href: "/settings", label: "Settings" },
    ],
  },
];

// Reached in one tap from the top level — no group to open first. These are the
// three the owner opens daily.
export const NAV_DIRECT = [
  { href: "/vocab", label: "Vocab · OWS", icon: "🔤" },
  { href: "/mistakes", label: "Mistake Notebook", icon: "🔴" },
];

// Which group a path belongs to — used to open the right level on load, so
// landing deep in the app still shows you where you are.
export function groupForPath(pathname) {
  if (!pathname || pathname === "/") return null;
  if (NAV_DIRECT.some((d) => pathname === d.href || pathname.startsWith(d.href + "/"))) return null;

  let best = null;
  let bestLen = 0;
  for (const g of NAV_GROUPS) {
    for (const l of g.links) {
      if ((pathname === l.href || pathname.startsWith(l.href + "/")) && l.href.length > bestLen) {
        best = g.key;
        bestLen = l.href.length;
      }
    }
    // a chapter page such as /study/math/<id> belongs to its subject's group
    if (g.subject && pathname.startsWith(`/study/${g.subject}`)) {
      const len = `/study/${g.subject}`.length;
      if (len > bestLen) {
        best = g.key;
        bestLen = len;
      }
    }
  }
  return best;
}
