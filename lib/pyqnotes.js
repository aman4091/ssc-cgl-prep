// 📘 Notes (app/pyq-notes) ke slides — topic ka HTML (public/pyq_notes) har
// chapter ke har <h3> par kat kar. Notes page aur stylus page (app/imp) dono
// yahi use karte hain, taaki IMP likhte waqt upar POORI slide dikhe — table,
// diagram sab — sirf jude hue shabd nahi (owner: "committeechairman aise aare").

export const PN_BASE = "/pyq_notes";

// Akshar beech mein jagah ke saath: table ke khaane " · " se, block cheezein
// alag, aur <b>/<mark> jaisi inline cheezein bina jagah ke.
const INLINE = new Set(["B", "STRONG", "I", "EM", "MARK", "SPAN", "SMALL", "SUP", "SUB", "A", "CODE", "U"]);
function textOf(n) {
  if (n.nodeType === 3) return n.nodeValue;
  if (n.nodeType !== 1 || n.tagName === "svg" || n.tagName === "SVG") return "";
  const kids = [...n.childNodes];
  if (n.tagName === "TR") return kids.filter((k) => k.nodeType === 1).map(textOf).map((t) => t.trim()).filter(Boolean).join(" · ");
  const inner = kids.map(textOf).join("");
  return INLINE.has(n.tagName) ? inner : ` ${inner} `;
}
const clean = (t) => t.replace(/\s+/g, " ").trim();

// Ek topic ka HTML → slides. Chapter ka kholne wala hissa (sirf eyebrow / meta)
// akela patla lagta hai — use pehli asli slide ke saath jod dete hain.
export function cutSlides(html) {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const out = [];
  [...doc.querySelectorAll("section.chap")].forEach((sec, ci) => {
    const h2 = sec.querySelector("h2");
    const chap = h2 ? clean(h2.textContent) : "";
    const c = `c${(ci % 3) + 1}`;
    let n = 0;
    let cur = { chap, title: chap, c, nodes: [], key: `${sec.id}.0` };
    for (const el of [...sec.children]) {
      if (el.tagName === "H3") {
        const thin = cur.nodes.every((x) => /(^| )(eyebrow|meta)( |$)/.test(x.className || ""));
        if (cur.nodes.length && !thin) out.push(cur);
        n += 1;
        cur = { chap, title: clean(el.textContent), c, nodes: thin ? cur.nodes : [], key: `${sec.id}.${n}` };
      } else if (el !== h2) cur.nodes.push(el);
    }
    if (cur.nodes.length) out.push(cur);
  });
  return out.map((s) => {
    const body = s.nodes.map((x) => x.outerHTML).join("");
    // Chhota text-roop (purane / bina-HTML jagah ke liye) — har line alag.
    const lines = [];
    for (const x of s.nodes) {
      x.querySelectorAll("li, p, tr, .box, .trick, figcaption").forEach((y) => {
        if (y.parentElement && y.parentElement.closest("li, tr, .box, .trick")) return;
        const t = clean(textOf(y));
        if (t && lines.length < 40) lines.push(t);
      });
    }
    return { key: s.key, chap: s.chap, title: s.title, c: s.c, body, points: lines };
  });
}

// Stylus page ke liye: "pn:<book>.<section>.<n>" (#2… hata kar) wali slide
// dhoondo — topic Notes ke link (?b=&t=) se.
export async function loadSlide(book, topic, slideKey) {
  const r = await fetch(`${PN_BASE}/${book}/${topic}.html`);
  if (!r.ok) return null;
  return cutSlides(await r.text()).find((s) => s.key === slideKey) || null;
}

// Topic pata na ho (purana IMP, ‹ › se aayi slide, Saare IMP) — book ke saare
// topics mein dhoondo. Ek baar mila to yaad (is tab ke liye).
const found = new Map();
export async function findSlide(book, slideKey) {
  const ck = `${book}.${slideKey}`;
  if (found.has(ck)) return found.get(ck);
  const idx = await fetch(`${PN_BASE}/index.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const bk = idx?.books?.find((b) => b.key === book);
  const sec = slideKey.split(".")[0];
  for (const t of bk?.topics || []) {
    const r = await fetch(`${PN_BASE}/${book}/${t.id}.html`).catch(() => null);
    if (!r?.ok) continue;
    const html = await r.text();
    if (!html.includes(`id="${sec}"`)) continue;
    const s = cutSlides(html).find((x) => x.key === slideKey);
    if (s) { const v = { slide: s, t: t.id }; found.set(ck, v); return v; }
  }
  return null;
}
