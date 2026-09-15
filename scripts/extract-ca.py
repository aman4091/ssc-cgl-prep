"""Turn the RBE Current Affairs magazine (Sept 2026) into atomic revision cards.

    python scripts/extract-ca.py [--pdf ca/rbe-ca-sept-2026.pdf] [--jobs 6]

Pipeline
  1. Text layer. pdftotext is run three ways and each page is cleaned:
       - reading order (xpdf default mode): detects the two columns and reads
         each column top to bottom, so prose pages come out in the right order;
       - -table: keeps every table row on one line;
       - -layout: the physical page, used only as a third view for checking.
     Cleaning repairs the broken fi/fl ligatures (scripts/ca-ligatures.json,
     built by scripts/ca_ligatures.py), unifies quotes, dashes and bullets,
     and drops footers, social handles and icon-font garbage.
  2. Part J (monthly one-liners, "Q12. question --> answer") is parsed
     directly from the text; DeepSeek only assigns tags there.
  3. Every other page goes to DeepSeek with both the reading-order and the
     table view and returns cards whose answers are copied from the page.
  4. Verification, on normalised text on both sides (case-folded, quotes and
     dashes unified, hyphens and whitespace collapsed): the answer must occur
     in one of the page's views, most trigger keywords must occur on the page,
     and at least one of them must sit near the answer. Anything that fails,
     and anything DeepSeek marked unclear, goes to needs_review.json.

Nothing is filled in from outside the PDF: a card either verifies against the
page text or it is not shipped.

Output
  public/carevision/index.json       manifest: version, part titles, bundle list
  public/carevision/core.json        the core tier (~800 cards) — loads first, offline
  public/carevision/ext-<part>.json  extended tier, one file per part, loaded on demand
  data/ca-needs-review.json         what failed verification, with the reason
DeepSeek replies are cached in scripts/.ca-cache/, so re-runs are free.
"""
import argparse
import collections
import concurrent.futures as cf
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import time
import unicodedata
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HERE = os.path.join(ROOT, "scripts")
CACHE = os.path.join(HERE, ".ca-cache")
LIGATURES = os.path.join(HERE, "ca-ligatures.json")
OUT_DIR = os.path.join(ROOT, "public", "carevision")
OUT_REVIEW = os.path.join(ROOT, "data", "ca-needs-review.json")
DEEPSEEK_CFG = r"D:\over\data\deepseek.json"

# Magazine's printed page numbers + 4 = PDF page numbers. Everything below
# (and every pdfPage in the output) uses PDF page numbers.
PAGE_OFFSET = 4

PARTS = {
    "A": "Polity, Government & Constitution",
    "B": "Schemes, Initiatives & Governance",
    "C": "National Events, Days & Milestones",
    "D": "Awards, Honours & Recognitions",
    "E": "Books, Authors & Personalities",
    "F": "Major Sports Events & Tournaments",
    "G": "Defence, Science, Technology & Space",
    "H": "International Affairs & Reports",
    "I": "Environment, Ecology & Geography",
    "J": "Monthly One Liner Current Affairs (2025-2026)",
}

# (part, section title, printed start page) — straight from the magazine's
# contents page.
TOC = [
    ("A", "Key Office Bearers of India 2025-26", 4),
    ("A", "Council Of Ministers Of 18th Lok Sabha", 6),
    ("A", "CMs and Governors/Lt. Governors of States and Union Territories", 7),
    ("A", "New Major Bills & Act 2025-26", 8),
    ("A", "New Major Laws 2024-25", 14),
    ("A", "Upcoming Targets of Indian Government", 18),
    ("A", "Union Budget 2026-27", 18),
    ("B", "2026 State-Wise Schemes", 20),
    ("B", "2025 State-wise Schemes", 22),
    ("B", "Ministry-wise Major Schemes", 26),
    ("B", "Viksit Bharat-Guarantee for Rozgar and Ajeevika Mission (VB-G RAM-G) Act, 2025", 34),
    ("B", "Major Initiatives Launched (2021-26)", 36),
    ("B", "Mobile Apps launched by Government", 39),
    ("B", "Government Web Portals", 42),
    ("C", "77th Republic Day of India 2026", 46),
    ("C", "80th Independence Day of India 2026", 47),
    ("C", "Major National Conference 2025-26", 47),
    ("C", "Major International Days & Themes 2025-26", 48),
    ("C", "First in India 2025-26 (Key-Milestone)", 50),
    ("D", "Bharat Ratna 2024", 54),
    ("D", "Padma Awards 2026", 55),
    ("D", "Popular Awards of The Year 2024-26", 59),
    ("D", "Awards & Honours Conferred to PM Narendra Modi (2024-2026)", 64),
    ("D", "National Sports Awards 2025", 64),
    ("D", "Nobel Prize Winners 2025", 65),
    ("E", "Month-Wise Books & Authors", 66),
    ("E", "Award Winning Books & Authors 2025-26", 68),
    ("E", "Notable Indian Obituaries (2025-2026)", 69),
    ("E", "Major Achievements by Indian Women (2025-26)", 70),
    ("F", "8th SAFF Women's Championship 2026", 71),
    ("F", "23rd FIFA World Cup 2026", 72),
    ("F", "2026 Commonwealth Games", 72),
    ("F", "World Yogasana Championship 2026", 73),
    ("F", "2026 World Para Athletics Grand Prix in New Delhi, India", 73),
    ("F", "First Khelo India Tribal Games 2026", 74),
    ("F", "6th Khelo India Winter Games 2026", 74),
    ("F", "2nd Khelo India Beach Games 2026", 75),
    ("F", "Winter Olympic 2026", 75),
    ("F", "ICC Men's T20 World Cup 2026", 75),
    ("F", "Men's T20 Asia Cup 2025", 76),
    ("F", "ICC Women's Cricket World Cup 2025", 76),
    ("F", "Grand Slam of the year 2026", 77),
    ("F", "38th National Games", 80),
    ("F", "7th Khelo India Games 2025", 81),
    ("F", "2nd Khelo India Para Games 2025", 81),
    ("F", "First Khelo India Water Sports Festival 2025", 82),
    ("F", "Upcoming Sports Events", 83),
    ("G", "Important Military Exercises", 83),
    ("G", "Operation Sindoor 2025", 86),
    ("G", "Indian Military & Government Operations (2025-26)", 88),
    ("G", "ISRO & Space Missions", 89),
    ("G", "2025-2026 Science & Technology Highlights", 105),
    ("H", "International Conferences & Summits 2025-2026", 112),
    ("H", "Index & Rankings (2024-26)", 120),
    ("I", "Important GI Tags", 127),
    ("I", "UNESCO World Heritage Sites in India", 128),
    ("I", "List of RAMSAR Sites in India", 129),
    ("I", "National Parks & Wildlife Sanctuaries in India", 130),
    ("I", "Project Cheetah (Cheetah Translocation)", 131),
    ("J", "May & June 2025", 132),
    ("J", "July 2025", 135),
    ("J", "August 2025", 137),
    ("J", "September-October 2025", 138),
    ("J", "November 2025", 143),
    ("J", "December 2025", 145),
    ("J", "January 2026", 147),
    ("J", "February & March 2026", 149),
    ("J", "April 2026", 153),
    ("J", "May 2026", 156),
    ("J", "June 2026", 158),
    ("J", "July 2026", 160),
    ("J", "August 2026", 162),
]
LAST_CONTENT_PAGE = 169   # 170-172 are adverts

# Priority mapping from the spec (PDF pages):
#   1  131-136  Part I — GI Tags, Ramsar, UNESCO, National Parks
#   1   58-68   Part D — Awards (Padma 2026, Nobel 2025, sports awards, popular)
#   1   75-87   Part F — Sports (winner, host city, venue)
#   1   24-43   Part B — Schemes (2026 state-wise + ministry-wise)
#   1   54-58   First in India 2025-26
#   1  151-168  Part J — one-liners, Jan 2026 -> Aug 2026 only
#   2  124-131  Index & Rankings — India rank, rank 1, issuing body only
#   2   87-92   Defence exercises + Operation Sindoor
#   2   8-9, 22-24  Key Office Bearers (top 15 only) + Budget 2026-27
#   2   70-75   Books/Authors + Obituaries (2026 first)
#   2  116-124  Summits — host city + theme only
#   2   93-109  ISRO — 2026 launches only, skip the rest
#   3   10-11   Full Council of Ministers, all CMs/Governors
#   3   43-50   Mobile Apps + Web Portals
#   3   12-22   Bills & Acts detail (name + one line kept as priority 2)
#   3  109-116  Science & Tech highlights
#   3  136-151  Part J one-liners, May 2025 - Dec 2025
#   3   68      Awards conferred to PM Modi
# The page rows overlap at their edges (58, 68, 131...), so the table is
# applied by section — each section takes the row its pages fall in:
SECTION_PRIORITY = {
    "Key Office Bearers of India 2025-26": 2,   # top 15 cards; the rest drop to 3
    "Council Of Ministers Of 18th Lok Sabha": 3,
    "CMs and Governors/Lt. Governors of States and Union Territories": 3,
    "New Major Bills & Act 2025-26": 2,         # name + one line only
    "New Major Laws 2024-25": 2,                # name + one line only
    "Upcoming Targets of Indian Government": 2,
    "Union Budget 2026-27": 2,
    "Mobile Apps launched by Government": 3,
    "Government Web Portals": 3,
    # pages 50-53 are in no row of the table; kept visible at medium
    "77th Republic Day of India 2026": 2,
    "80th Independence Day of India 2026": 2,
    "Major National Conference 2025-26": 2,
    "Major International Days & Themes 2025-26": 2,
    "First in India 2025-26 (Key-Milestone)": 1,
    "Awards & Honours Conferred to PM Narendra Modi (2024-2026)": 3,
    "Important Military Exercises": 2,
    "Operation Sindoor 2025": 2,
    "Indian Military & Government Operations (2025-26)": 2,
    "ISRO & Space Missions": 2,                 # 2026 launches; the rest drop to 3
    "2025-2026 Science & Technology Highlights": 3,
    "International Conferences & Summits 2025-2026": 2,
    "Index & Rankings (2024-26)": 2,
}
PART_PRIORITY = {"B": 1, "D": 1, "E": 2, "F": 1, "I": 1}   # whole-part rows
OFFICE_BEARERS_TOP = 15

# Old events that still define the year (spec: Nobel 2025, Asia Cup 2025,
# Padma, national awards) stay "secondary" instead of "stale".
YEAR_DEFINING = {
    "Nobel Prize Winners 2025", "Men's T20 Asia Cup 2025", "Padma Awards 2026",
    "Bharat Ratna 2024", "National Sports Awards 2025",
}

# What DeepSeek should and should not turn into cards, per section.
RULES = {
    "Key Office Bearers of India 2025-26":
        "One card per post: trigger = the post exactly as printed (e.g. 'President of India (15th)'), "
        "answer = the person's name as printed. Sub-points under a post go into extra (one at most).",
    "Council Of Ministers Of 18th Lok Sabha":
        "One card per minister: trigger = the ministry/portfolio, answer = the minister's name.",
    "CMs and Governors/Lt. Governors of States and Union Territories":
        "Separate cards: 'Chief Minister of <State/UT>' -> name, 'Governor of <State/UT>' (or Lt. Governor) -> name.",
    "New Major Bills & Act 2025-26":
        "ONE card per bill/act and nothing more: trigger = the bill/act name, answer = one short phrase copied "
        "from its description that says what it does. No cards for individual clauses, sections or amendments.",
    "New Major Laws 2024-25":
        "ONE card per law and nothing more: trigger = the law's name, answer = one short phrase copied from its "
        "description that says what it replaces or does. No cards for clauses or sections.",
    "_scheme":
        "Separate atomic cards for each scheme, each only if the page states it: scheme -> state (or who launched it); "
        "scheme -> ministry; scheme -> purpose/objective (a short phrase copied from the page); scheme -> its headline "
        "number (outlay, amount, target). Put the launch date in `date`.",
    "Mobile Apps launched by Government":
        "Separate cards: app -> ministry/organisation that launched it; app -> purpose (short phrase).",
    "Government Web Portals":
        "Separate cards: portal -> ministry/organisation; portal -> purpose (short phrase).",
    "Major International Days & Themes 2025-26":
        "Separate cards: day -> date; day -> theme (the theme copied in full).",
    "First in India 2025-26 (Key-Milestone)":
        "Each line is 'achievement -- answer': trigger = the achievement text, answer = the text after the dashes.",
    "Padma Awards 2026":
        "One card per awardee row: trigger = '<award> 2026 — <field>, <state>' using the row's own words, "
        "answer = the person's name as printed. Also cards for the headline counts (total awardees, each award's count).",
    "Index & Rankings (2024-26)":
        "For each index/report make ONLY these cards: India's rank, the rank-1 country, and the issuing body. "
        "When India's rank is printed for several years, the answer is only the latest year's part, copied as "
        "printed (e.g. '44 (2026)'). Nothing else from this section.",
    "International Conferences & Summits 2025-2026":
        "For each summit/conference make ONLY: host city/venue card and theme card (if a theme is printed). Nothing else.",
    "ISRO & Space Missions":
        "One card per mission fact (mission -> launch vehicle, -> launch date, -> purpose, -> launch site). "
        "Add the tag 'launch' for launch events. Put the launch date in `date`.",
    "Month-Wise Books & Authors":
        "One card per book: trigger = the book's title, answer = its author.",
    "Award Winning Books & Authors 2025-26":
        "Separate cards: book -> author; book -> award it won.",
    "Notable Indian Obituaries (2025-2026)":
        "One card per person: trigger = the person's name, answer = what they were known as/for (short phrase).",
}
for _s in ("2026 State-Wise Schemes", "2025 State-wise Schemes", "Ministry-wise Major Schemes",
           "Viksit Bharat-Guarantee for Rozgar and Ajeevika Mission (VB-G RAM-G) Act, 2025",
           "Major Initiatives Launched (2021-26)"):
    RULES[_s] = RULES["_scheme"]
RULES["Important Military Exercises"] = (
    "Separate cards per exercise: exercise -> participating countries/forces; exercise -> venue; "
    "exercise -> edition number. Only what the page states.")
PART_RULES = {
    "D": "Award -> winner cards; for lists one card per winner.",
    "F": "Separate cards: event -> winner, -> runner-up, -> host country/city, -> venue, -> mascot, -> edition, "
         "-> top of medal table. Only what the page states.",
    "I": "One card per item: GI product -> state; Ramsar site -> state; UNESCO site -> state/year; "
         "national park/sanctuary -> state.",
}

KINDS = ["person", "state", "country", "city", "place", "organisation", "ministry", "scheme",
         "number", "rank", "date", "event", "award", "book", "sport", "field", "phrase"]

SYSTEM = """You turn one page of an SSC CGL current-affairs magazine into atomic flashcards for revision.

HARD RULES
1. Use ONLY the page text given. Never add a fact from your own knowledge, never correct the magazine, never guess.
2. `answer` is copied EXACTLY from the page text — same words, spelling and numbers. It is the fact only: a name, place, number, date or short phrase (at most ~15 words). Never paraphrase it.
3. `trigger` is the cue a student sees before the answer. Build it from the page's own words (you may add small connecting words like "of", "in", "who", "which"). It must not contain the answer.
4. One card = one testable fact. A line with three facts becomes three cards. A list becomes one card per item.
5. `extra`: at most one supporting detail copied exactly from the page, else null.
6. `date`: the date / month / year the page prints for that fact, copied exactly, else null.
7. `kind`: the shape of the answer, one of: KINDS.
8. `tags`: 2-5 lowercase topic words (e.g. "award", "padma", "cricket", "scheme", "ranking", "defence", "space", "wetland", "2026").
9. `section`: exactly one of the section names listed for the page.
10. If a fact is cut off at the page edge, or the text is scrambled so you cannot be sure which answer belongs to which cue, do NOT make a card — put it in "unclear" with the snippet and why.
11. Skip headers, footers, social handles, page numbers, adverts and garbled watermark letters.

The page comes in two extractions of the same text. VIEW 1 is the order the text was written in: each column is complete before the next one starts and table rows come one after another, but a table cell may wrap over several short lines. VIEW 2 is the physical page: each table row stays on one line, but on a two-column page both columns are printed side by side — never join words across that gap. Use whichever view makes each fact unambiguous.

Reply with JSON only:
{"cards":[{"section":"...","trigger":"...","answer":"...","extra":null,"date":null,"kind":"...","tags":["..."]}],
 "unclear":[{"section":"...","text":"...","why":"..."}]}""".replace("KINDS", ", ".join(KINDS))

TAG_SYSTEM = """You label SSC CGL current-affairs one-liners for a quiz engine. For each item you get a question and its answer (both from a magazine). Do NOT change or judge the facts — only label them.
For each item return:
- "kind": the shape of the answer, one of: KINDS
- "tags": 2-4 lowercase topic words (e.g. "sports", "cricket", "award", "scheme", "ranking", "defence", "space", "summit", "appointment", "gi-tag", "economy", "environment").
Reply with JSON only: {"items":[{"i":1,"kind":"...","tags":["..."]}]}""".replace("KINDS", ", ".join(KINDS))


# ----------------------------------------------------------------- text layer

def find_pdftotext():
    for p in (shutil.which("pdftotext"), r"C:\Program Files\Git\mingw64\bin\pdftotext.exe"):
        if p and os.path.exists(p):
            return p
    sys.exit("pdftotext not found (xpdf 4.x, ships with Git for Windows)")


def pdf_pages(pdf, mode):
    args = [find_pdftotext(), "-enc", "UTF-8"] + ([mode] if mode else []) + [pdf, "-"]
    out = subprocess.run(args, capture_output=True, check=True).stdout.decode("utf-8", "replace")
    return out.split("\f")


_LIG = None


def fix_ligatures(text):
    global _LIG
    if _LIG is None:
        _LIG = json.load(open(LIGATURES, encoding="utf-8"))
    text = re.sub(r"[A-Za-z]+", lambda m: _LIG.get(m.group(0), m.group(0)), text)
    # a capital U glued inside a lowercase word is always the broken glyph
    return re.sub(r"(?<=[a-z])U(?=[il][a-z])", "f", text)


BULLETS = "\u2022\u25cf\u25aa\u25a0\u25c6\u25ca\u00d8\u00a7\u27a2\u27a4\u25ba\u25b6\u2713\u2714\u2756"
_SYMBOL_RUN = re.compile(r"(?:(?<!\S)\S(?:[ \t]+|$)){5,}", re.M)
_HANDLE = re.compile(r"@RBE\w*|@rbe_ssc")


def clean(text, page):
    # icon-font garbage prints as runs of lone symbols ("z { | } ~ ...")
    text = _SYMBOL_RUN.sub(lambda m: " " if sum(not c.isalnum() for c in m.group(0).split()) >= 2 else m.group(0), text)
    text = unicodedata.normalize("NFKC", text)
    text = fix_ligatures(text)
    text = re.sub("[\u2018\u2019\u201a\u201b`\u00b4\u2032]", "'", text)
    text = re.sub("[\u201c\u201d\u201e\u201f\u2033]", '"', text)
    text = re.sub("[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]", "-", text)
    text = re.sub("[%s]" % re.escape(BULLETS), "\u2022", text)
    text = text.replace("\ufffd", "\u2022")
    text = re.sub("[\U0001F000-\U0001FFFF\u2600-\u27BF\uFE0F]", "", text)
    lines = [_HANDLE.sub("", ln).rstrip() for ln in text.splitlines()]
    # the printed page number: footer in the layout views, first line in -raw
    filled = [i for i, ln in enumerate(lines) if ln.strip()]
    for i in filled[:2] + filled[-3:]:
        if lines[i].strip() == str(page - PAGE_OFFSET):
            lines[i] = ""
    return re.sub(r"\n{3,}", "\n\n", "\n".join(lines)).strip()


def norm(s):
    """Comparison form: case-folded, quotes/dashes unified, hyphens dropped
    (the reading-order view de-hyphenates 'solar-\\npowered' to 'solarpowered'),
    whitespace collapsed."""
    s = unicodedata.normalize("NFKC", s or "").lower()
    s = re.sub(r"[‘’‚‛`´′]", "'", s)
    s = re.sub(r"[“”„‟″]", '"', s)
    s = re.sub(r"[‐‑‒–—―−-]", "", s)
    s = s.replace("•", " ")
    s = re.sub(r"\s+", " ", s).strip()
    return s


def squash(s):
    return re.sub(r"[\s\"'.,;:()\[\]]", "", norm(s))


STOP = set("""a an the of in on at to for by from with and or as is was were be been has have had its it this that
these those which who whom what when where why how india indian india's recently recent new first become became
name named called known following country state states under per about into than also their there over during
year years launched launch held won win winner list number among total many much count awardee awardees
recipient recipients theme objective purpose aim related associated organised organized observed celebrated
located situated conferred honoured honored appointed receive received product tag rank ranked ranking
does did provide provides stand stands belong belongs completed linked two three second listed can give gives
between runs besides full form expand refers mean means part type main key major role used use""".split())
NEAR = 1200   # squashed characters, roughly 200 words


def keywords(s):
    return [w for w in re.findall(r"[a-z0-9]+", norm(s)) if (len(w) >= 3 or w.isdigit()) and w not in STOP]


# ------------------------------------------------------------------ sections

def section_spans():
    """PDF page -> sections whose text can be on that page (a section runs from
    its start page to the next section's start page, both inclusive)."""
    rows = [(p, s, pp + PAGE_OFFSET) for p, s, pp in TOC]
    spans = []
    for i, (part, sec, start) in enumerate(rows):
        end = rows[i + 1][2] if i + 1 < len(rows) else LAST_CONTENT_PAGE
        spans.append((part, sec, start, end))
    return spans


SPANS = section_spans()
SECTION_PART = {s: p for p, s, _, _ in SPANS}
SECTION_ORDER = {s: i for i, (_, s, _, _) in enumerate(SPANS)}


J_FIRST_PAGE = min(a for p, _, a, _ in SPANS if p == "J")


def sections_on(page):
    # Part J opens on a fresh page and is parsed without DeepSeek
    if page >= J_FIRST_PAGE:
        return []
    return [(p, s) for p, s, a, b in SPANS if a <= page <= b and p != "J"]


# -------------------------------------------------------------------- dates

MONTHS = {m: i + 1 for i, m in enumerate(
    ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"])}


def parse_date(s):
    """-> (year, month or None) of the first date in s, else (None, None)."""
    if not s:
        return None, None
    t = s.lower()
    m = re.search(r"\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?,?\s*(?:\d{1,2},?\s*)?(20\d\d)\b", t)
    if m:
        return int(m.group(2)), MONTHS[m.group(1)]
    m = re.search(r"\b\d{1,2}[/.-](\d{1,2})[/.-](20\d\d)\b", t)
    if m and 1 <= int(m.group(1)) <= 12:
        return int(m.group(2)), int(m.group(1))
    m = re.search(r"\b(20\d\d)\s*-\s*(\d\d)\b", t)          # "2025-26" -> 2026
    if m:
        return 2000 + int(m.group(2)), None
    m = re.search(r"\b(20\d\d)\b", t)
    if m:
        return int(m.group(1)), None
    return None, None


def window_of(year, month, section):
    """primary = Jan-Aug 2026 (and anything later), secondary = Sep-Dec 2025,
    stale = before Sep 2025, except year-defining sections."""
    if year is None:
        return None
    if year >= 2026:
        w = "primary"
    elif year == 2025 and (month is None or month >= 9):
        w = "secondary"
    else:
        w = "stale"
    if w == "stale" and section in YEAR_DEFINING:
        w = "secondary"
    return w


# Sections whose undated facts are history, not this year's news: a mission or
# exercise with no date on the page (Chandrayaan-1, Yudh Abhyas background)
# must not pass as 2026.
UNDATED_IS_STALE = {"ISRO & Space Missions", "Important Military Exercises"}


def section_window(section):
    y, m = parse_date(section)
    if y is None and section in UNDATED_IS_STALE:
        return "stale"
    return window_of(y, m, section) or "primary"   # undated sections (GI tags...) are timeless


# ----------------------------------------------------------------- DeepSeek

def deepseek_cfg():
    cfg = json.load(open(DEEPSEEK_CFG, encoding="utf-8"))
    if not cfg.get("key"):
        sys.exit("DeepSeek key missing in " + DEEPSEEK_CFG)
    return cfg


def ask(cfg, system, user, max_tokens=16000):
    """One DeepSeek call, cached on disk by its exact input."""
    os.makedirs(CACHE, exist_ok=True)
    h = hashlib.sha1((cfg.get("model", "") + "\0" + system + "\0" + user).encode("utf-8")).hexdigest()
    path = os.path.join(CACHE, h + ".json")
    if os.path.exists(path):
        return json.load(open(path, encoding="utf-8"))
    body = json.dumps({
        "model": cfg.get("model") or "deepseek-chat",
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        "temperature": 0,
        "max_tokens": max_tokens,
        "response_format": {"type": "json_object"},
    }).encode("utf-8")
    url = cfg["base_url"].rstrip("/") + "/chat/completions"
    last = None
    for attempt in range(4):
        req = urllib.request.Request(url, data=body, method="POST", headers={
            "Content-Type": "application/json", "Authorization": "Bearer " + cfg["key"]})
        try:
            with urllib.request.urlopen(req, timeout=600) as r:
                data = json.loads(r.read().decode("utf-8"))
            choice = (data.get("choices") or [{}])[0]
            if choice.get("finish_reason") == "length":
                return {"_cut": True}
            out = json.loads((choice.get("message") or {}).get("content") or "{}")
            with open(path, "w", encoding="utf-8") as f:
                json.dump(out, f, ensure_ascii=False)
            return out
        except urllib.error.HTTPError as e:
            if e.code in (401, 402):
                sys.exit("DeepSeek HTTP %d (key/balance)" % e.code)
            last = "HTTP %d" % e.code
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError) as e:
            last = repr(e)
        time.sleep(5 * (attempt + 1))
    raise RuntimeError("DeepSeek failed: " + str(last))


def page_prompt(page, secs, ro, tb):
    part = secs[0][0]
    names = [s for _, s in secs]
    rules = []
    for s in names:
        r = RULES.get(s) or PART_RULES.get(SECTION_PART[s])
        if r:
            rules.append("- %s: %s" % (s, r))
    return "\n".join([
        "PDF page %d. Part %s: %s." % (page, part, PARTS[part]),
        "Sections that can appear on this page (use exactly one of these names per card):",
        *["- " + s for s in names],
        "Section rules:" if rules else "",
        *rules,
        "",
        "VIEW 1 - written order:", "<<<", ro, ">>>",
        "",
        "VIEW 2 - physical page:", "<<<", tb, ">>>",
    ])


def halves(text):
    lines = text.splitlines()
    mid = len(lines) // 2
    return "\n".join(lines[:mid]), "\n".join(lines[mid:])


def extract_page(cfg, page, secs, ro, tb, depth=0):
    out = ask(cfg, SYSTEM, page_prompt(page, secs, ro, tb))
    if out.get("_cut"):
        if depth >= 2:
            return {"cards": [], "unclear": [{"section": secs[0][1], "text": ro[:300],
                                              "why": "page too dense for one reply"}]}
        (ro1, ro2), (tb1, tb2) = halves(ro), halves(tb)
        a = extract_page(cfg, page, secs, ro1, tb1, depth + 1)
        b = extract_page(cfg, page, secs, ro2, tb2, depth + 1)
        return {"cards": a.get("cards", []) + b.get("cards", []),
                "unclear": a.get("unclear", []) + b.get("unclear", [])}
    return out


# -------------------------------------------------------------------- Part J

J_SECTIONS = [s for p, s, _ in TOC if p == "J"]
_Q = re.compile(r"(?:^|\s)(?:Q\s*)?(\d{1,3})\s*[.)]\s+")


def part_j(ro_pages):
    """Deterministic parse of the monthly one-liners: 'Q12. question --> answer'."""
    cards, review = [], []
    first = min(a for p, _, a, _ in SPANS if p == "J")
    heads = {norm(s): s for s in J_SECTIONS}
    section = None
    buf = []   # (page, text)
    for page in range(first, LAST_CONTENT_PAGE + 1):
        for line in ro_pages[page - 1].splitlines():
            if norm(line) in heads:
                if buf:
                    cards_j(section, buf, cards, review)
                section, buf = heads[norm(line)], []
                continue
            if norm(line).startswith("part j"):
                continue
            buf.append((page, line))
    if buf:
        cards_j(section, buf, cards, review)
    return cards, review


def cards_j(section, buf, cards, review):
    # one string for the month, remembering on which page each character sits
    text, pages = "", []
    for page, line in buf:
        text += line + " "
        pages += [page] * (len(line) + 1)
    starts = [m for m in _Q.finditer(text)]
    # keep the numbering monotonic so "2. " inside a question is not a new item
    items, want = [], 1
    for m in starts:
        n = int(m.group(1))
        if want <= n <= want + 2:      # tolerate a skipped number in the magazine
            items.append(m)
            want = n + 1
    for i, m in enumerate(items):
        end = items[i + 1].start() if i + 1 < len(items) else len(text)
        chunk = re.sub(r"\s+", " ", text[m.end():end]).strip()
        page = pages[min(m.start() + 1, len(pages) - 1)]
        parts = re.split(r"\s*(?:-+\s*>|→)\s*", chunk, maxsplit=1)   # "-->", "->", "--->", arrow
        entry = {"section": section, "n": int(m.group(1)), "pdfPage": page, "text": chunk}
        if len(parts) != 2 or not parts[0].strip() or not parts[1].strip():
            review.append(dict(entry, why="no '-->' answer found"))
            continue
        cards.append(dict(entry, trigger=parts[0].strip(), answer=parts[1].strip()))


def tag_part_j(cfg, cards, jobs):
    batches = [cards[i:i + 60] for i in range(0, len(cards), 60)]

    def run(batch):
        user = "\n".join('%d. Q: %s\n   A: %s' % (k + 1, c["trigger"], c["answer"]) for k, c in enumerate(batch))
        out = ask(cfg, TAG_SYSTEM, user, max_tokens=12000)
        got = {int(x.get("i", 0)): x for x in out.get("items", []) if isinstance(x, dict)}
        for k, c in enumerate(batch):
            x = got.get(k + 1) or {}
            c["kind"] = x.get("kind") if x.get("kind") in KINDS else "phrase"
            c["tags"] = [t for t in (x.get("tags") or []) if isinstance(t, str)][:4]

    with cf.ThreadPoolExecutor(jobs) as ex:
        list(ex.map(run, batches))


# -------------------------------------------------------------- verification

def verify(card, views, section, own_words=False):
    """-> None if the card is backed by the page text, else the reason.
    own_words: the trigger is the magazine's own question (Part J), so it may
    legitimately mention the answer."""
    ans = card.get("answer")
    trig = card.get("trigger")
    if not isinstance(ans, str) or not ans.strip() or not isinstance(trig, str) or not trig.strip():
        return "missing trigger or answer"
    a = squash(ans)
    if len(a) < 1:
        return "empty answer"
    hits = [(v, m.start()) for v in views for m in re.finditer(re.escape(a), v)]
    if not hits:
        return "answer not found verbatim on the page"
    keys = keywords(trig)
    sec_keys = set(keywords(section))
    page = " ".join(views)
    if keys:
        # the section title counts as context: a continuation page (Padma
        # list, page 2 of a tournament) doesn't repeat its heading
        present = [k for k in keys if k in page or k in sec_keys]
        if len(present) / len(keys) < 0.6:
            return "trigger words not on the page: " + ", ".join(k for k in keys if k not in page)
        own = [k for k in present if k not in sec_keys and k not in a]
        if own:
            # wide enough for a state heading followed by its list of items
            near = any(k in v[max(0, i - NEAR): i + len(a) + NEAR] for v, i in hits for k in own)
            if not near:
                return "trigger and answer are far apart on the page"
    if not own_words and len(a) > 3:
        # a name quoted in the cue may carry the answer ('Assam Bihu Dhol' -> Assam)
        outside = re.sub(r"'[^']*'|\"[^\"]*\"", " ", norm(trig))
        if a in squash(outside):
            return "trigger contains the answer"
    return None


def slug(s, n=48):
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", norm(s))).strip("-")[:n].strip("-")


# ---------------------------------------------------------------------- main

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf", default=os.path.join(ROOT, "ca", "rbe-ca-sept-2026.pdf"))
    ap.add_argument("--jobs", type=int, default=6)
    ap.add_argument("--pages", help="only these PDF pages, e.g. 8-12 (for trying the prompt)")
    args = ap.parse_args()

    print("reading PDF ...")
    got = {m: [clean(p, i + 1) for i, p in enumerate(pdf_pages(args.pdf, m))]
           for m in ("-raw", "", "-table", "-layout")}
    # -raw (content order) is what DeepSeek reads and what Part J is parsed
    # from; all four views back the verification
    ro, tb = got["-raw"], got["-table"]
    COMMON_WORDS.update(w for t in got["-raw"] for w in re.findall(r"(?<![A-Za-z])[a-z]{3,}(?![A-Za-z])", t))
    squashed = [[squash(got[m][i]) for m in got] for i in range(len(ro))]

    cfg = deepseek_cfg()
    pages = list(range(1, LAST_CONTENT_PAGE + 1))
    if args.pages:
        pages = []
        for chunk in args.pages.split(","):
            a, _, b = chunk.partition("-")
            pages += range(int(a), int(b or a) + 1)

    todo = [(p, sections_on(p)) for p in pages if sections_on(p)]
    print("DeepSeek: %d pages ..." % len(todo))
    raw = {}
    with cf.ThreadPoolExecutor(args.jobs) as ex:
        futs = {ex.submit(extract_page, cfg, p, secs, ro[p - 1], tb[p - 1]): (p, secs) for p, secs in todo}
        for k, f in enumerate(cf.as_completed(futs), 1):
            p, secs = futs[f]
            raw[p] = f.result()
            print("  page %3d  %3d cards  (%d/%d)" % (p, len(raw[p].get("cards", [])), k, len(todo)), flush=True)

    cards, review = [], []
    for p, secs in todo:
        names = [s for _, s in secs]
        byname = {norm(s): s for s in names}
        out = raw[p]
        for u in out.get("unclear", []) or []:
            if isinstance(u, dict):
                review.append({"pdfPage": p, "section": byname.get(norm(u.get("section", "")), names[0]),
                               "why": "DeepSeek: " + str(u.get("why") or "unclear"), "text": u.get("text")})
        for c in out.get("cards", []) or []:
            if not isinstance(c, dict):
                continue
            sec = byname.get(norm(c.get("section") or "")) or names[0]
            views = list(squashed[p - 1])
            why = verify(c, views, sec)
            if why == "answer not found verbatim on the page":
                # a fact can wrap onto the next page
                nb = [v for q in (p - 1, p + 1) if 1 <= q <= len(squashed) for v in squashed[q - 1]]
                if verify(c, views + nb, sec) is None:
                    why = None
            if why:
                review.append({"pdfPage": p, "section": sec, "why": why,
                               "trigger": c.get("trigger"), "answer": c.get("answer")})
                continue
            extra = c.get("extra")
            if isinstance(extra, str) and extra.strip():
                if squash(extra) not in "".join(views):
                    extra = None     # an unverified side detail is dropped, the card stays
            else:
                extra = None
            cards.append({"part": SECTION_PART[sec], "section": sec, "pdfPage": p,
                          "trigger": c["trigger"].strip(), "answer": c["answer"].strip(),
                          "extra": extra, "date": c.get("date") if isinstance(c.get("date"), str) else None,
                          "kind": c.get("kind") if c.get("kind") in KINDS else "phrase",
                          "tags": [t.lower() for t in (c.get("tags") or []) if isinstance(t, str)][:5]})

    # Part J — parsed, not generated; DeepSeek only labels kind/tags
    if not args.pages or any(p >= min(a for pt, _, a, _ in SPANS if pt == "J") for p in pages):
        jc, jr = part_j(ro)
        jc = [c for c in jc if c["pdfPage"] in pages]
        print("Part J: %d one-liners parsed, tagging ..." % len(jc))
        tag_part_j(cfg, jc, args.jobs)
        for c in jc:
            why = verify(c, squashed[c["pdfPage"] - 1] + [v for q in (c["pdfPage"] + 1,)
                                                          if q <= len(squashed) for v in squashed[q - 1]],
                         c["section"], own_words=True)
            if why:
                review.append({"pdfPage": c["pdfPage"], "section": c["section"], "why": why,
                               "trigger": c["trigger"], "answer": c["answer"]})
                continue
            cards.append({"part": "J", "section": c["section"], "pdfPage": c["pdfPage"],
                          "trigger": c["trigger"], "answer": c["answer"], "extra": None, "date": None,
                          "kind": c["kind"], "tags": c["tags"]})
        review += [r for r in jr if r["pdfPage"] in pages]

    finish(cards, review)


# ------------------------------------------------------------- core deck

# Hard budget: ~70 min/day for 17 days can't carry 2900 cards, so every card
# gets tier "core" or "extended" (nothing is deleted). Caps per group:
CORE_GROUPS = [
    ("Part I (GI/Ramsar/UNESCO/Nat.Parks)", 120, lambda s, p: p == "I"),
    ("Part D (Awards)", 120, lambda s, p: p == "D"),
    ("Part B (Schemes)", 120, lambda s, p: p == "B"),
    ("Part F (Sports)", 100, lambda s, p: p == "F"),
    ("Part J one-liners (Jan-Aug 2026)", 150, lambda s, p: p == "J" and parse_date(s)[0] == 2026),
    ("First in India", 50, lambda s, p: s == "First in India 2025-26 (Key-Milestone)"),
    ("Index & Rankings", 50, lambda s, p: s == "Index & Rankings (2024-26)"),
    ("Defence exercises + Op Sindoor", 40, lambda s, p: s in ("Important Military Exercises", "Operation Sindoor 2025")),
    ("Office bearers + Budget 2026-27", 30, lambda s, p: s in ("Key Office Bearers of India 2025-26", "Union Budget 2026-27")),
    ("Republic Day 2026 + misc C", 20, lambda s, p: p == "C" and s != "First in India 2025-26 (Key-Milestone)"),
]
WINDOW_RANK = {"primary": 0, "secondary": 1, "stale": 2}


def kind_of(c):
    return next((t[4:] for t in c["tags"] if t.startswith("ans:")), "phrase")


def core_eligible(c):
    """Card types that may enter core at all (rules 3 and 4)."""
    t = norm(c["trigger"])
    if c["part"] == "B":
        # SSC asks scheme -> state / ministry; purpose cards stay extended
        k = kind_of(c)
        return k in ("state", "ministry") or (k == "organisation" and re.search(r"ministry|department", c["answer"], re.I))
    if c["section"] == "Index & Rankings (2024-26)":
        return rank_card(t) is not None
    return True


def rank_card(t):
    """'india' = India's rank, 'top' = rank-1 country, 'body' = issuing body."""
    if re.search(r"issu|releas|publish|prepared|compiled", t):
        return "body"
    if re.search(r"india'?s?\b.*\brank|\brank\b.*\bindia", t):
        return "india"
    if re.search(r"rank ?1\b|rank1|first rank|top (country|rank|position)|first (country|position)|1st|topped", t):
        return "top"
    return None


def pick_core(deck):
    """Within each group: window primary > secondary > stale, then 2026 > undated
    > 2025 > older, then round-robin across the group's sections in PDF order
    (so GI Tags can't eat Ramsar's share), cards in PDF order inside a section."""
    chosen, shape = set(), []
    for name, cap, member in CORE_GROUPS:
        pool = [c for c in deck if member(c["section"], c["part"]) and c["priority"] <= 2 and core_eligible(c)]
        forced = [c for c in pool if "core-pin" in c["tags"]]
        levels = collections.defaultdict(lambda: collections.OrderedDict())
        for c in pool:
            if c in forced:
                continue
            y = c.get("_year")
            yr = 0 if y and y >= 2026 else 1 if y is None else 2 if y == 2025 else 3
            lvl = (WINDOW_RANK[c["window"]], yr)
            levels[lvl].setdefault(c["section"], []).append(c)
        take = forced[:cap]
        for lvl in sorted(levels):
            queues = [list(q) for q in levels[lvl].values()]
            while len(take) < cap and any(queues):
                for q in queues:
                    if q and len(take) < cap:
                        take.append(q.pop(0))
            if len(take) >= cap:
                break
        chosen.update(c["id"] for c in take)
        shape.append((name, cap, take))
    return chosen, shape


# ------------------------------------------------------ giveaway triggers

GENERIC = set("""ministry department national india indian government scheme yojana mission world international
day award awards prize shri smt prof prime minister president chief state union bharat pradhan mantri cup games
championship index report bank first global organisation organization council authority institute centre center
programme program policy portal act bill commission board committee corporation limited university college
school district city north south east west central force army navy air sri rashtriya abhiyan
january february march april june july august september october november december kumar singh""".split())


# Words the magazine also prints in lower case mid-sentence ("edition",
# "operation", "days") are ordinary words, not names — sharing one with the
# trigger gives nothing away. Filled from the PDF text in main().
COMMON_WORDS = set()


def distinctive_word(answer):
    """First word of a short answer that is a name (Kerala, Gavai), or None."""
    words = [w for w in re.findall(r"[a-z0-9]+", norm(answer)) if len(w) >= 3 and w not in STOP]
    if not 0 < len(words) <= 3:
        return None
    return next((w for w in words if len(w) >= 4 and not w.isdigit()
                 and w not in GENERIC and w not in COMMON_WORDS), None)


def giveaway(c):
    """'full' when the whole answer sits in the trigger, 'word' when the
    answer's first distinctive word (a name) does, else None."""
    a, t = squash(c["answer"]), squash(c["trigger"])
    if len(a) >= 3 and a in t:
        return "full"
    # People share first names and surnames by chance (John Clarke / John M.
    # Martinis, Padma Awards / Dr. Padma Gurmet), and the section's own title
    # words are context the student already has.
    if kind_of(c) == "person":
        return None
    w = distinctive_word(c["answer"])
    if w and w not in keywords(c["section"]) and re.search(r"\b%s\b" % re.escape(w), norm(c["trigger"])):
        return "word"
    return None


def mask(trigger, answer, how):
    """Blank the answer out of the trigger. None if it can't be done cleanly."""
    if how == "full":
        letters = [ch for ch in norm(answer) if ch.isalnum()]
        pat = r"(?<![A-Za-z0-9])" + r"[\W_]*".join(re.escape(ch) for ch in letters) + r"(?![A-Za-z0-9])"
    else:
        pat = r"\b%s\b" % re.escape(distinctive_word(answer))
    out, n = re.subn(pat, "____", trigger, flags=re.I)
    return out if n else None


def write_bundles(final):
    """core.json (every core card, ~300 KB) loads first and works offline;
    extended cards are split per part (ext-A.json ...) and fetched only when
    asked for. partTitle lives once in index.json, the app puts it back."""
    os.makedirs(OUT_DIR, exist_ok=True)
    for name in os.listdir(OUT_DIR):
        if name.endswith(".json"):
            os.remove(os.path.join(OUT_DIR, name))

    def slim(c):
        return {k: v for k, v in c.items() if k != "partTitle"}

    def dump(name, rows):
        body = json.dumps(rows, ensure_ascii=False, separators=(",", ":"))
        with open(os.path.join(OUT_DIR, name), "w", encoding="utf-8") as f:
            f.write(body)
        return len(body.encode("utf-8"))

    core = [slim(c) for c in final if c["tier"] == "core"]
    files = {"core": {"file": "core.json", "cards": len(core), "bytes": dump("core.json", core)}}
    for part in PARTS:
        ext = [slim(c) for c in final if c["tier"] == "extended" and c["part"] == part]
        if ext:
            files["ext-" + part] = {"file": "ext-%s.json" % part, "cards": len(ext),
                                    "bytes": dump("ext-%s.json" % part, ext)}
    version = hashlib.sha1(json.dumps(final, ensure_ascii=False, sort_keys=True).encode("utf-8")).hexdigest()[:10]
    index = {
        "version": version,
        "exam": "2026-10-01",
        "parts": dict(PARTS),
        "sections": [{"part": p, "section": s} for p, s, _, _ in SPANS],
        "files": files,
    }
    with open(os.path.join(OUT_DIR, "index.json"), "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=1)
    for k, v in files.items():
        print("  %-8s %5d cards  %6.0f KB" % (k, v["cards"], v["bytes"] / 1024))


def finish(cards, review):
    # de-duplicate identical facts inside a section
    seen, deck = set(), []
    for c in sorted(cards, key=lambda c: (SECTION_ORDER[c["section"]], c["pdfPage"])):
        key = (c["section"], squash(c["trigger"]), squash(c["answer"]))
        if key in seen:
            continue
        seen.add(key)
        deck.append(c)

    count_in = collections.Counter()
    ids = collections.Counter()
    final = []
    for c in deck:
        sec = c["section"]
        count_in[sec] += 1
        if c["part"] == "J":
            y, m = parse_date(sec)
            win = window_of(y, m if m else None, sec)
            if sec.startswith("May & June 2025") or sec in ("July 2025", "August 2025"):
                win = "stale"
            pri = 1 if y and y >= 2026 else 3
        else:
            y, m = parse_date(c.get("date"))
            win = window_of(y, m, sec) or section_window(sec)
            pri = SECTION_PRIORITY.get(sec) or PART_PRIORITY.get(c["part"], 2)
            if sec == "Key Office Bearers of India 2025-26" and count_in[sec] > OFFICE_BEARERS_TOP:
                pri = 3
            if sec == "ISRO & Space Missions" and y != 2026:   # 2026 missions only
                pri = 3
            if sec == "2025 State-wise Schemes":
                pri = 2
            if sec == "Major International Days & Themes 2025-26" and "theme" in norm(c["trigger"]):
                pri = 3                                        # dates stay at 2
            if y is None:
                y = parse_date(sec)[0]
        # P1 means this year's news: an older P1 fact drops a level
        if pri == 1 and win != "primary":
            pri = 2 if win == "secondary" else 3
        tags = list(dict.fromkeys(c["tags"] + ["ans:" + c["kind"]]))
        if not c.get("date") and c["part"] != "J" and parse_date(sec)[0] is None:
            tags.append("undated")
        if sec == "77th Republic Day of India 2026" and re.search(r"chief guest", c["trigger"], re.I) \
                and re.search(r"2026|77th", c["trigger"]):
            tags.append("core-pin")
        base = "%s-%s" % (c["part"].lower(), slug(c["trigger"]))
        h = hashlib.sha1((sec + "|" + c["trigger"] + "|" + c["answer"]).encode("utf-8")).hexdigest()[:6]
        cid = "%s-%s" % (base, h)
        ids[cid] += 1
        if ids[cid] > 1:
            cid += "-%d" % ids[cid]
        card = {"id": cid, "part": c["part"], "partTitle": PARTS[c["part"]], "section": sec,
                "priority": pri, "window": win, "trigger": c["trigger"], "answer": c["answer"]}
        if c.get("extra"):
            card["extra"] = c["extra"]
        card["pdfPage"] = c["pdfPage"]
        card["tags"] = tags
        card["_year"] = y
        final.append(card)

    # Cards whose trigger gives the answer away — a class, so the whole deck
    # is scanned; the fix blanks the answer out of the trigger ("____").
    flagged = [(c, giveaway(c)) for c in final]
    flagged = [(c, how) for c, how in flagged if how]
    fixed, unfixable, audit = 0, 0, []
    for c, how in flagged:
        m = mask(c["trigger"], c["answer"], how)
        audit.append({"id": c["id"], "how": how, "before": c["trigger"], "after": m, "answer": c["answer"]})
        if m and m.strip("_ ?"):
            c["trigger"] = m
            fixed += 1
        else:
            c["tags"].append("giveaway")       # left as is, kept out of core
            unfixable += 1
    with open(os.path.join(ROOT, "data", "ca-giveaway.json"), "w", encoding="utf-8") as f:
        json.dump(audit, f, ensure_ascii=False, indent=1)

    chosen, shape = pick_core([c for c in final if "giveaway" not in c["tags"]])
    for c in final:
        c["tier"] = "core" if c["id"] in chosen else "extended"
        c["tags"] = [t for t in c["tags"] if t != "core-pin"]
        del c["_year"]

    write_bundles(final)
    os.makedirs(os.path.dirname(OUT_REVIEW), exist_ok=True)
    with open(OUT_REVIEW, "w", encoding="utf-8") as f:
        json.dump(review, f, ensure_ascii=False, indent=1)

    total = len(final)
    print("\n=== %d cards  ->  %s" % (total, os.path.relpath(OUT_DIR, ROOT)))
    for title, key in (("part", "part"), ("priority", "priority"), ("window", "window"), ("tier", "tier")):
        cnt = collections.Counter(c[key] for c in final)
        print("by %-8s " % title + "  ".join("%s:%d" % (k, cnt[k]) for k in sorted(cnt)))
    by = collections.Counter(how for _, how in flagged)
    print("giveaway triggers: %d (whole answer in trigger: %d, first word: %d; Part J: %d)"
          % (len(flagged), by["full"], by["word"], sum(1 for c, _ in flagged if c["part"] == "J")))
    print("   fixed by blanking: %d   left + kept out of core: %d" % (fixed, unfixable))
    print("\ncore deck by group / section:")
    for name, cap, take in shape:
        print("  %-38s %3d / %d" % (name, len(take), cap))
        for s, n in collections.Counter(c["section"] for c in take).items():
            print("      %-50s %3d" % (s[:50], n))
    whys = collections.Counter(r["why"].split(":")[0] for r in review)
    share = 100.0 * len(review) / max(1, total + len(review))
    print("needs_review: %d (%.1f%% of %d extracted)  ->  %s" % (
        len(review), share, total + len(review), os.path.relpath(OUT_REVIEW, ROOT)))
    for k, v in whys.most_common():
        print("   %4d  %s" % (v, k))


if __name__ == "__main__":
    main()
