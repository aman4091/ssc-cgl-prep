"""⏱️ 1-ghante revision batches (app/revision) — public/pyq_notes ke saare
topic ko lib/pyqnotes cutSlides jaisa har <h3> par kaat kar, har hisse ka
padhne ka time (shabd / WPM + table ki rows) nikaal kar, priority kram mein
~60 min ke batch mein bharta hai. Har hissa kisi na kisi batch mein — kuch
nahi chhootta. Chalao: python scripts/build-revision.py
Nikalta hai: public/pyq_notes/revision.json"""
import json, math, re, sys
from pathlib import Path
from bs4 import BeautifulSoup, Tag

ROOT = Path(__file__).resolve().parent.parent / "public" / "pyq_notes"
IDX = json.loads((ROOT / "index.json").read_text(encoding="utf-8"))
BOOKS = {b["key"]: b for b in IDX["books"]}

# Revision ki raftaar (shabd / minute) — notes pehle padhe hue hain, ab doharana.
WPM = {"pyq": 600, "hot22": 600, "maths": 1000, "english": 900, "vocab": 1100}
CAP = 60  # batch ka time (min)

# Subject → kis kram mein (pehle sabse zaroori). (book, topic, tier)
# tier: 1 = must, 2 = zaroor, 3 = time bache to.
SUBJECTS = [
  ("gs", "🌍 GS", [
    ("hot22", "t12", 1), ("hot22", "t01", 1), ("hot22", "t08", 1), ("hot22", "t09", 1),
    ("hot22", "t05", 1), ("hot22", "t03", 1), ("hot22", "t04", 1), ("hot22", "t02", 1),
    ("hot22", "t06", 1), ("hot22", "t07", 1), ("hot22", "t10", 1), ("hot22", "t11", 1),
    ("pyq", "t16", 2), ("pyq", "t17", 2), ("pyq", "t19", 2), ("pyq", "t18", 2), ("pyq", "t20", 2),
    ("pyq", "t12", 2), ("pyq", "t13", 2), ("pyq", "t14", 2), ("pyq", "t15", 2),
    ("pyq", "t01", 3), ("pyq", "t07", 3), ("pyq", "t09", 3), ("pyq", "t10", 3), ("pyq", "t11", 3),
    ("pyq", "t03", 3), ("pyq", "t02", 3), ("pyq", "t05", 3), ("pyq", "t06", 3), ("pyq", "t08", 3),
    ("pyq", "t04", 3),
  ]),
  ("maths", "🧮 Maths", [
    ("maths", "t16", 1), ("maths", "t18", 1), ("maths", "t19", 1), ("maths", "t15", 1), ("maths", "t14", 1),
    ("maths", "t04", 1), ("maths", "t07", 1), ("maths", "t08", 1), ("maths", "t10", 1), ("maths", "t05", 1),
    ("maths", "t06", 2), ("maths", "t12", 2), ("maths", "t13", 2), ("maths", "t01", 2), ("maths", "t09", 2),
    ("maths", "t11", 2), ("maths", "t02", 2),
    ("maths", "t17", 3), ("maths", "t20", 3), ("maths", "t03", 3),
  ]),
  ("english", "📘 English", [
    ("english", "t14", 1), ("english", "t13", 1), ("english", "t06", 1), ("english", "t05", 1),
    ("english", "t07", 1), ("english", "t03", 1), ("english", "t09", 1), ("english", "t10", 1),
    ("english", "t04", 2), ("english", "t01", 2), ("english", "t02", 2), ("english", "t08", 2),
    ("english", "t11", 3), ("english", "t12", 3),
  ]),
  ("vocab", "🔤 Vocab", [
    ("vocab", "t01", 1), ("vocab", "t06", 1), ("vocab", "t07", 1), ("vocab", "t08", 1), ("vocab", "t09", 1),
    ("vocab", "t10", 1), ("vocab", "t13", 1),
    ("vocab", "t02", 2), ("vocab", "t03", 2), ("vocab", "t04", 2), ("vocab", "t05", 2), ("vocab", "t14", 2),
    ("vocab", "t15", 3), ("vocab", "t11", 3), ("vocab", "t12", 3),
  ]),
]

def cls(el):
  return el.get("class") or []

def cut(html):
  """lib/pyqnotes cutSlides ka Python roop: [{key, i, title, chap, nodes}]."""
  soup = BeautifulSoup(f"<div>{html}</div>", "html.parser")
  out = []
  for sec in soup.select("section.chap"):
    h2 = sec.find("h2")
    chap = " ".join(h2.get_text(" ").split()) if h2 else ""
    n = 0
    cur = {"chap": chap, "title": chap, "nodes": [], "key": f"{sec.get('id')}.0"}
    for el in [c for c in sec.children if isinstance(c, Tag)]:
      if el.name == "h3":
        thin = all(("eyebrow" in cls(x) or "meta" in cls(x)) for x in cur["nodes"])
        if cur["nodes"] and not thin: out.append(cur)
        n += 1
        cur = {"chap": chap, "title": " ".join(el.get_text(" ").split()), "nodes": cur["nodes"] if thin else [], "key": f"{sec.get('id')}.{n}"}
      elif el is not h2:
        cur["nodes"].append(el)
    if cur["nodes"]: out.append(cur)
  for i, s in enumerate(out): s["i"] = i
  return out

def minutes(book, s):
  words = sum(len(x.get_text(" ").split()) for x in s["nodes"])
  rows = sum(len(x.find_all("tr")) for x in s["nodes"])
  pyq = sum(len(x.select(".tag.p")) for x in s["nodes"])
  return words / WPM[book] + rows * 0.02 + 0.15, words, pyq

def main():
  res = {"cap": CAP, "subjects": []}
  seen = set()
  for sk, sname, order in SUBJECTS:
    items = []
    for book, t, tier in order:
      seen.add((book, t))
      tname = next(x["name"] for x in BOOKS[book]["topics"] if x["id"] == t)
      for s in cut((ROOT / book / f"{t}.html").read_text(encoding="utf-8")):
        m, w, p = minutes(book, s)
        items.append({"b": book, "t": t, "tn": tname, "tier": tier, "k": s["key"], "i": s["i"], "h": s["title"], "c": s["chap"], "m": m, "p": p})
    # Bharo: tier badalne par naya batch (must aur bonus ek batch mein na milein).
    batches, cur, tot = [], [], 0.0
    for it in items:
      if cur and (tot + it["m"] > CAP + 3 or it["tier"] != cur[-1]["tier"]):
        batches.append(cur); cur, tot = [], 0.0
      cur.append(it); tot += it["m"]
    if cur: batches.append(cur)
    # Tier ka bahut chhota aakhri batch (<20 min) usi tier ke pichhle mein jod do.
    j = 1
    while j < len(batches):
      b, a = batches[j], batches[j - 1]
      last = j + 1 == len(batches) or batches[j + 1][0]["tier"] != b[0]["tier"]
      if last and a[0]["tier"] == b[0]["tier"] and sum(x["m"] for x in b) < 20:
        a += batches.pop(j)
      else:
        j += 1
    out = []
    for bi, b in enumerate(batches):
      parts = []
      for it in b:
        last = parts[-1] if parts else None
        if last and last["b"] == it["b"] and last["t"] == it["t"]:
          last["s"].append([it["k"], it["i"], it["h"]]); last["m"] += it["m"]; last["p"] += it["p"]
        else:
          parts.append({"b": it["b"], "t": it["t"], "tn": it["tn"], "s": [[it["k"], it["i"], it["h"]]], "m": it["m"], "p": it["p"]})
      for p in parts: p["m"] = round(p["m"])
      out.append({"id": f"{sk}{bi + 1}", "tier": b[0]["tier"], "min": round(sum(x["m"] for x in b)), "pyq": sum(x["p"] for x in b), "parts": parts})
    res["subjects"].append({"key": sk, "name": sname, "batches": out})
  missing = [(b["key"], t["id"]) for b in IDX["books"] for t in b["topics"] if (b["key"], t["id"]) not in seen]
  if missing: sys.exit(f"Ye topic kisi subject mein nahi: {missing}")
  (ROOT / "revision.json").write_text(json.dumps(res, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
  for s in res["subjects"]:
    print(s["name"], len(s["batches"]), [f'{b["id"]}:{b["min"]}m/t{b["tier"]}' for b in s["batches"]])

main()
