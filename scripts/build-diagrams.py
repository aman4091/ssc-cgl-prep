# 🖼️ Saare Diagrams — Notes (app/pyq-notes) ki har book ke har topic se sirf
# diagram (<figure>) nikaal kar ek alag book "diagrams" banata hai (owner: "jo
# notes ke beech images dikh rahi hain, vaise hi ek jagah chahiye, revision ke
# liye"). Har topic ka apna page, chapter (h2) aur heading (h3) saath mein.
# Notes badlein to dobara chalao:  python scripts/build-diagrams.py
import json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "public" / "pyq_notes"
KEY = "diagrams"
SHORT = {"pyq": "PYQ", "hot22": "GS Hot 22", "maths": "Maths", "english": "English", "vocab": "Vocab"}

idx_path = ROOT / "index.json"
idx = json.loads(idx_path.read_text(encoding="utf-8"))
books = [b for b in idx["books"] if b["key"] != KEY]

out_dir = ROOT / KEY
out_dir.mkdir(exist_ok=True)
for old in out_dir.glob("t*.html"):
    old.unlink()

SEC = re.compile(r'(<section class="chap[^"]*"[^>]*>)(.*?)</section>', re.S)
PART = re.compile(r'<h3[^>]*>.*?</h3>|<figure.*?</figure>', re.S)
EYEBROW = re.compile(r'<div class="eyebrow">.*?</div>', re.S)
H2 = re.compile(r'<h2[^>]*>.*?</h2>', re.S)

topics, total = [], 0
for b in books:
    for t in b["topics"]:
        src = ROOT / b["key"] / f'{t["id"]}.html'
        if not src.exists():
            continue
        html = src.read_text(encoding="utf-8")
        secs, n = [], 0
        for m in SEC.finditer(html):
            open_tag, body = m.group(1), m.group(2)
            parts, h3, shown = [], None, None
            for p in PART.finditer(body):
                x = p.group(0)
                if x.startswith("<h3"):
                    h3 = x
                    continue
                if h3 and h3 is not shown:
                    parts.append(h3)
                    shown = h3
                parts.append(x)
                n += 1
            if n and any(x.startswith("<figure") for x in parts):
                eb = EYEBROW.search(body)
                h2 = H2.search(body)
                secs.append(open_tag + (eb.group(0) if eb else "") + (h2.group(0) if h2 else "") + "".join(parts) + "</section>")
        if not secs:
            continue
        tid = f"t{len(topics) + 1:02d}"
        link = f'<p class="dg-src"><a href="/pyq-notes?b={b["key"]}&amp;t={t["id"]}">{b["icon"]} Poore notes mein ye topic kholo ›</a></p>'
        (out_dir / f"{tid}.html").write_text("\n".join(secs) + "\n" + link + "\n", encoding="utf-8")
        topics.append({"id": tid, "name": f'{SHORT.get(b["key"], b["name"])} · {t["name"]} ({n})'})
        total += n

books.append({"key": KEY, "name": "Saare Diagrams", "icon": "🖼️", "rough": False, "topics": topics})
idx["books"] = books
idx_path.write_text(json.dumps(idx, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(f"{total} diagrams in {len(topics)} topics -> public/pyq_notes/{KEY}/")
