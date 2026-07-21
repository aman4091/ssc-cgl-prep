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
    // A third level: PYQ Bank -> a bank -> that bank's chapters. Flattening the
    // banks to the top level (briefly) buried Current Affairs and Notes under a
    // wall of shelves and lost the grouping entirely.
    children: [
      { key: "warbank", name: "WAR", icon: "🎯",
        bank: { url: "/warbank/index.json", list: "subjects", href: "/pyq/war" },
        match: "/pyq/war" },
      { key: "pinnacle", name: "Pinnacle English", icon: "📚",
        bank: { url: "/engbank/index.json", list: "chapters", href: "/pyq/pinnacle" },
        match: "/pyq/pinnacle" },
      { key: "pinmaths", name: "Pinnacle Maths", icon: "🧮",
        bank: { url: "/mathbank/index.json", list: "chapters", href: "/pyq/mathbank" },
        match: "/pyq/mathbank" },
      { key: "maths2025", name: "Maths 2025", icon: "🧮",
        bank: { url: "/sscmaths2025/index.json", list: "chapters", href: "/pyq/maths2025" },
        match: "/pyq/maths2025" },
      { key: "pinreason", name: "Pinnacle Reasoning", icon: "🧠",
        bank: { url: "/reasonbank/index.json", list: "chapters", href: "/pyq/reasonbank" },
        match: "/pyq/reasonbank" },
      { key: "gktricks", name: "GKTricks", icon: "🧠",
        bank: { url: "/gkbank/index.json", list: "topics", href: "/pyq/gk", subject: "gs" },
        match: ["/pyq/gktricks", "/pyq/gk/polity", "/pyq/gk/ancient-history"] },
      { key: "mirror", name: "Mirror of Common Errors", icon: "🪞",
        bank: { url: "/gkbank/index.json", list: "topics", href: "/pyq/gk", subject: "english" },
        match: ["/pyq/mirror", "/pyq/gk/english-noun"] },
    ],
  },
  {
    key: "notes",
    name: "Notes",
    icon: "📔",
    // A notes book names a BANK like the PYQ shelves do, so its chapters are menu
    // rows instead of a dropdown sitting on the page. The chapter list lives in
    // the book's own notes.json under meta.topics (hence the dotted `list`), and
    // the reader filters by ?topic= rather than by a path segment (hence `param`)
    // — one route serves every chapter, exactly as it did before.
    children: [
      { key: "notes-english", name: "English · Aman Vashishth Sir", icon: "📘",
        bank: { url: "/english_notes/notes.json", list: "meta.topics",
                href: "/notes/english", param: "topic" },
        match: "/notes/english" },
      { key: "notes-polity", name: "Polity · SIMPLICRACK", icon: "📔",
        bank: { url: "/polity_notes/notes.json", list: "meta.topics",
                href: "/notes/polity", param: "topic" },
        match: "/notes/polity" },
      { key: "notes-static", name: "Static GK · Rojgar", icon: "📗",
        bank: { url: "/static_notes/notes.json", list: "meta.topics",
                href: "/notes/static-gk", param: "topic" },
        match: "/notes/static-gk" },
    ],
    links: [
      { href: "/english/pocket", label: "Pocket Rules" },
      { href: "/static-gk", label: "Static GK · topics" },
    ],
  },
  {
    key: "practice",
    name: "Practice & Tests",
    icon: "📝",
    links: [
      { href: "/quiz-bank", label: "Quiz Bank · topic-wise" },
      { href: "/mock-tests", label: "Mock Tests" },
      { href: "/quizzes", label: "My Quizzes" },
    ],
  },
];

// Reached in one tap from the top level — no group to open first.
//
// Track & Revise is gone: Today's Targets, AI Roadmap, Checklist and Saved
// Answers were deleted, and the two rows worth keeping — Bookmarks and Settings
// — came out here rather than sitting alone behind a group.
export const NAV_DIRECT = [
  { href: "/activity", label: "Activity", icon: "🗒️" },
  { href: "/vocab", label: "Vocab · OWS", icon: "🔤" },
  { href: "/calculation", label: "Calculation", icon: "🧮" },
  { href: "/bookmarks", label: "Bookmarked Questions", icon: "⭐" },
  { href: "/wrong", label: "Wrong Questions", icon: "❌" },
  { href: "/mistakes", label: "Mistake Notebook", icon: "🔴" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

// Menu hrefs may carry a query (Current Affairs opens a tab), but a pathname
// never does — so always compare on the path half.
export const pathOf = (href) => String(href || "").split("?")[0];

// The trail of keys leading to the group a path belongs to — ["pyq","pinmaths"]
// for a Pinnacle Maths chapter — so landing deep in the app opens the right
// level rather than the top of the menu.
export function trailForPath(pathname) {
  if (!pathname || pathname === "/") return [];
  if (NAV_DIRECT.some((d) => pathname === d.href || pathname.startsWith(d.href + "/"))) return [];

  let best = [];
  let bestLen = 0;
  const walk = (nodes, trail) => {
    for (const n of nodes) {
      for (const m of [].concat(n.match || [])) {
        if ((pathname === m || pathname.startsWith(m + "/")) && m.length > bestLen) {
          best = [...trail, n.key];
          bestLen = m.length;
        }
      }
      for (const l of n.links || []) {
        const p = pathOf(l.href);
        if ((pathname === p || pathname.startsWith(p + "/")) && p.length > bestLen) {
          best = [...trail, n.key];
          bestLen = p.length;
        }
      }
      if (n.children) walk(n.children, [...trail, n.key]);
    }
  };
  walk(NAV_GROUPS, []);
  return best;
}

// Resolve a trail to the node it names.
export function nodeAt(trail) {
  let nodes = NAV_GROUPS;
  let node = null;
  for (const k of trail) {
    node = (nodes || []).find((n) => n.key === k) || null;
    if (!node) return null;
    nodes = node.children;
  }
  return node;
}
