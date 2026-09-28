"""Parmar Static notes (public/parmar_static_notes/notes.json) se
Folk Dances aur Festivals — rajya-wise — nikaal kar lib/sanskriti.json banao.

Har row: { t: "fd"|"fs", st, n, note, hook }   (hook = trick ka shabd)
Har rajya ki trick line bhi: tricks[t][st].
Chalana: python3 scripts/build-sanskriti.py
"""
import json, re

SRC = "public/parmar_static_notes/notes.json"
OUT = "lib/sanskriti.json"
STATE_NAMES = {
    "ANDHRA PRADESH": "AP", "ARUNACHAL PRADESH": "AR", "ASSAM": "AS", "BIHAR": "BR", "CHHATTISGARH": "CG",
    "GOA": "GA", "GUJARAT": "GJ", "HIMACHAL PRADESH": "HP", "HARYANA": "HR", "JAMMU & KASHMIR": "JK",
    "JHARKHAND": "JH", "KARNATAKA": "KA", "KERALA": "KL", "MADHYA PRADESH": "MP", "MANIPUR": "MN",
    "MEGHALAYA": "ML", "MIZORAM": "MZ", "MAHARASHTRA": "MH", "ODISHA": "OD", "NAGALAND": "NL",
    "RAJASTHAN": "RJ", "SIKKIM": "SK", "TAMIL NADU": "TN", "TELANGANA": "TG", "TRIPURA": "TR",
    "UTTAR PRADESH": "UP", "UTTARAKHAND": "UK", "WEST BENGAL": "WB", "PUNJAB": "PB", "LADAKH": "LA",
    "LAKSHADWEEP": "LD", "DELHI": "DL", "PUDUCHERRY": "PY",
}
TOPIC = {"Folk Dances of India": "fd", "Festivals of India": "fs"}

def clean(s):
    s = re.sub(r"\*\*|\*|__", "", str(s or ""))
    return re.sub(r"[ \t]+", " ", s).strip()

d = json.load(open(SRC))
rows = []          # (t, st, hook, name, note)
tricks = {"fd": {}, "fs": {}}
extra = {"similar": [], "martial": [], "important": [], "newyear": []}
cur = {"fd": None, "fs": None}
special = None
for pg in d["pages"]:
    t = TOPIC.get(pg["topic"])
    if not t:
        continue
    for b in pg["blocks"]:
        if b["type"] == "section":
            name = clean(b["text"]).upper()
            special = None
            if name in STATE_NAMES:
                cur[t] = STATE_NAMES[name]
            else:
                cur[t] = None
                special = {"SIMILAR SOUNDING DANCES": "similar", "MARTIAL ART DANCES": "martial",
                           "IMPORTANT FESTIVAL": "important", "INDIAN NEW YEAR": "newyear"}.get(name)
            continue
        if b["type"] == "note" and cur[t] and "TRICK" in b.get("text", "").upper():
            tricks[t][cur[t]] = clean(b["text"].split(":", 1)[1] if ":" in b["text"] else b["text"])
            continue
        if special == "similar" and b["type"] == "list":
            for it in b.get("items", []):
                extra["similar"].append(clean(it))
            continue
        if b["type"] != "table":
            continue
        for r in b.get("rows", []):
            cells = [str(c or "") for c in r]
            if special:
                extra[special].append([clean(c) for c in cells])
                continue
            if not cur[t]:
                continue
            if len(cells) >= 3:
                hook, name, note = cells[0], cells[1], " ".join(cells[2:])
            elif len(cells) == 2:
                # [naam, note] — ya [hook, naam]
                hook, name, note = "", cells[0], cells[1]
            else:
                continue
            if not clean(name):
                # "| | | **1. Puthari:** …" jaisi aage badhne wali row — pichhli ka hissa
                if rows and clean(note):
                    p = rows[-1]
                    rows[-1] = (p[0], p[1], p[2], p[3], (p[4] + " " + clean(note)).strip())
                continue
            rows.append((t, cur[t], clean(hook), clean(name), clean(note).replace("\n", " ")))

# PDF layout: Goa ke table mein Himachal ki rows. Hook dekh kar sahi rajya.
def owner(t, hook, st):
    if not hook:
        return st
    words = [w for w in re.split(r"\s+", hook.lower()) if len(w) > 2]
    if st in tricks[t] and all(w in tricks[t][st].lower() for w in words):
        return st
    for k, tr in tricks[t].items():
        if words and all(w in tr.lower() for w in words):
            return k
    return st

out, seen, moved = [], set(), None
for t, st, hook, name, note in rows:
    st2 = owner(t, hook, st)
    if st2 != st:
        moved = (t, st, st2)
    elif moved and moved[0] == t and moved[1] == st and not hook:
        st2 = moved[2]          # hook-less row jo moved rows ke beech thi
    else:
        moved = None
    # naam jo sirf rajya ka naam hai ("Goa", "Himachal Pradesh") — trick ka hissa
    if name.upper() in STATE_NAMES or name.lower() in ("mask", "goa"):
        continue
    key = (t, st2, name.lower())
    if key in seen:
        continue
    seen.add(key)
    out.append({"t": t, "st": st2, "n": name, "note": note, "hook": hook})

json.dump({"items": out, "tricks": tricks, "extra": extra}, open(OUT, "w"), ensure_ascii=False, indent=0)
from collections import Counter
print(len(out), Counter(x["t"] for x in out))
print(Counter(x["st"] for x in out if x["t"] == "fd"))
print({k: len(v) for k, v in extra.items()})
