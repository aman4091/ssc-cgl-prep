"""Build the ligature repair map for the RBE Current Affairs magazine.

The magazine's fonts map the "fi" / "fl" ligature glyphs to the wrong code
points, so pdftotext prints "Uirst", "nirst", "yirst" for "first" and
"conUlict", "innlation" for "conflict", "inflation". This script finds every
damaged word in the extracted text and writes scripts/ca-ligatures.json, a
plain {damaged: repaired} map that extract-ca.py applies. The map is
committed, so the extractor itself needs no spell-check library.

A word is repaired only when the original is NOT a dictionary word and the
repaired form IS one, and all-caps tokens (IIT, CAPF, MLA) are never touched.
Only the six glyph patterns seen in this PDF are tried.

    pip install pyspellchecker
    python scripts/ca_ligatures.py text1.txt [text2.txt ...]
"""
import itertools
import json
import os
import re
import sys

from spellchecker import SpellChecker

# damaged glyph pair -> real letters
PATTERNS = [("Ui", "fi"), ("ni", "fi"), ("yi", "fi"),
            ("Ul", "fl"), ("nl", "fl"), ("yl", "fl")]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ca-ligatures.json")

# Damaged words the dictionary can't confirm (names and newer terms), each
# checked by hand against the page.
MANUAL = {
    "bioreyinery": "biorefinery", "Nayithromycin": "Nafithromycin",
    "Julinlora": "Juliflora", "Juliylora": "Juliflora", "JuliUlora": "Juliflora",
    "Uintech": "fintech",
}


def candidates(word):
    """Every way of repairing some of the damaged pairs in the word."""
    spots = []
    for bad, good in PATTERNS:
        for m in re.finditer(bad, word):
            spots.append((m.start(), bad, good))
    spots.sort()
    for n in range(1, len(spots) + 1):
        for combo in itertools.combinations(spots, n):
            starts = [s for s, _, _ in combo]
            # two repairs may not overlap ("nil" has only one pair to fix)
            if any(b - a < 2 for a, b in zip(starts, starts[1:])):
                continue
            out, last = [], 0
            for s, bad, good in combo:
                out.append(word[last:s])
                out.append(good)
                last = s + len(bad)
            out.append(word[last:])
            yield "".join(out)


def build(texts):
    spell = SpellChecker()
    known = lambda w: w.lower() in spell  # noqa: E731
    fixes = {}
    for word in set(re.findall(r"[A-Za-z]+", "\n".join(texts))):
        if len(word) < 3 or word.isupper() or known(word):
            continue
        good = [c for c in candidates(word) if known(c)]
        if good:
            # fewest repairs wins when several forms are words
            fixes[word] = min(good, key=lambda c: sum(a != b for a, b in zip(c, word)))
    fixes.update(MANUAL)
    return dict(sorted(fixes.items(), key=lambda kv: kv[0].lower()))


if __name__ == "__main__":
    texts = [open(p, encoding="utf-8", errors="replace").read() for p in sys.argv[1:]]
    fixes = build(texts)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(fixes, f, ensure_ascii=False, indent=1)
    print(len(fixes), "repairs ->", OUT)
