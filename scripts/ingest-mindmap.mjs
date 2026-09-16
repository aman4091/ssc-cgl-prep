// Mind-map PDF -> revision cards (Mind Map Revision, /mindmap).
//
//   node scripts/ingest-mindmap.mjs --pdf "…/HISTORY.pdf" --page 1 --tree
//   node scripts/ingest-mindmap.mjs --pdf "…/HISTORY.pdf" --subject history --budget 240
//
// Mind map ek ped hai aur poori keemat RAASTE mein hai: akela patta ("16km
// west of Srinagar") bemaani hai, par "Stone Age › Neolithic › Sites ›
// Kashmir Valley › Burzahom → ?" asli sawaal hai.
//
// Ped kaise banta hai: pdfjs se do cheezein milti hain — text items (x, y,
// font) aur khinchi hui LINEIN (connectors). Sirf x-y se andaza lagane ke
// bajaye wahi linein padhte hain: har line ke dono sire jis node par baithe
// hain, un dono ke beech rishta hai. Phir sabse bade font wale node (centre)
// se BFS — isse parent-child wahi aata hai jo map mein dikhta hai, chahe
// branch daayen ho ya baayen.
//
// Koi AI nahi, koi nayi dependency nahi (pdfjs-dist package.json mein hai).

import { readFileSync } from "node:fs";
import { getDocument, OPS } from "pdfjs-dist/legacy/build/pdf.mjs";

export const SAME_LINE = 4;    // y ka itna farak = ek hi line
export const WORD_GAP = 9;     // ek line mein itne px tak = ek hi text
export const STACK_GAP = 1.8;  // font ki oonchai ka itna guna = usi node ki agli line
export const SNAP_X = 90;      // line ka sira node ke kinare se itni doori tak (chaudai mein)
export const SNAP_Y = 26;      // …aur itni oonchai mein — linein node ke kinare par lagti hain,
export const SNAP_COST = 140;  // isliye x mein dhil, y mein sakhti
export const SNAP_Y_WIDE = 70; // seedha node ke upar/neeche (centre ka bada box) — tab x mein sakhti

const N = Object.fromEntries(Object.entries(OPS).map(([k, v]) => [v, k]));
const mul = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
const apply = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

export async function openPdf(file) {
  return getDocument({ data: new Uint8Array(readFileSync(file)), useSystemFonts: true }).promise;
}

export async function readPage(doc, pageNo) {
  const page = await doc.getPage(pageNo);
  const [tc, ol] = await Promise.all([page.getTextContent(), page.getOperatorList()]);
  const items = tc.items.filter((i) => i.str.trim()).map((i) => ({
    s: i.str.replace(/\s+/g, " ").trim(),
    x: i.transform[4], y: i.transform[5], w: i.width, h: Math.round(i.height),
  }));

  // khinchi hui linein: CTM sambhaal kar, sirf stroke hone wale path
  const links = [];
  let ctm = [1, 0, 0, 1, 0, 0];
  const stack = [];
  let pending = null;
  for (let i = 0; i < ol.fnArray.length; i++) {
    const op = N[ol.fnArray[i]];
    const a = ol.argsArray[i];
    if (op === "save") stack.push([...ctm]);
    else if (op === "restore") ctm = stack.pop() || ctm;
    else if (op === "transform") ctm = mul(ctm, a);
    else if (op === "constructPath") {
      const [ops, coords] = a;
      const pts = [];
      let k = 0;
      for (const o of ops) {
        const name = N[o];
        const take = name === "curveTo" ? 6 : name === "curveTo2" || name === "curveTo3" ? 4 : name === "rectangle" ? 4 : 2;
        const c = Array.from(coords).slice(k, k + take);
        k += take;
        if (name === "rectangle") pts.push(apply(ctm, c[0], c[1]), apply(ctm, c[0] + c[2], c[1] + c[3]));
        else pts.push(apply(ctm, c[take - 2], c[take - 1]));
      }
      pending = pts.filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]));
    } else if (op === "stroke") {
      if (pending && pending.length >= 2) links.push([pending[0], pending[pending.length - 1]]);
      pending = null;
    } else if (op === "fill" || op === "eoFill" || op === "endPath") pending = null;
  }
  const vp = page.getViewport({ scale: 1 });
  return { items, links, width: vp.width, height: vp.height };
}

// Text items -> nodes (ek node = ek line ya usi jagah ki 2-3 linein).
export function buildNodes(items) {
  const rows = [];
  for (const it of [...items].sort((a, b) => b.y - a.y || a.x - b.x)) {
    const row = rows.find((r) => Math.abs(r.y - it.y) <= SAME_LINE && it.x >= r.x - WORD_GAP && it.x <= r.x + r.w + WORD_GAP);
    if (row) {
      const right = Math.max(row.x + row.w, it.x + it.w);
      row.x = Math.min(row.x, it.x);
      row.w = right - row.x;
      row.h = Math.max(row.h, it.h);
      row.parts.push(it);
    } else rows.push({ x: it.x, y: it.y, w: it.w, h: it.h, parts: [it] });
  }
  for (const r of rows) r.text = r.parts.sort((a, b) => a.x - b.x).map((p) => p.s).join(" ").replace(/\s+/g, " ").trim();

  const nodes = [];
  for (const r of rows.sort((a, b) => b.y - a.y)) {
    const prev = nodes.find((n) => Math.abs(n.x - r.x) <= 10 && Math.abs(n.h - r.h) <= 2
      && n.yLow - r.y > 0 && n.yLow - r.y <= r.h * STACK_GAP);
    if (prev) {
      prev.lines.push(r.text);
      prev.yLow = r.y;
      prev.w = Math.max(prev.w, r.w);
    } else nodes.push({ x: r.x, y: r.y, yLow: r.y, w: r.w, h: r.h, lines: [r.text] });
  }
  return nodes.map((n, i) => ({
    ...n, i, text: n.lines.join(" "), box: [n.x - 3, n.yLow - 4, n.x + n.w + 3, n.y + n.h + 4],
  }));
}

const gapTo = ([x, y], [x0, y0, x1, y1]) =>
  [Math.max(x0 - x, 0, x - x1), Math.max(y0 - y, 0, y - y1)];

// Linein -> rishte -> centre se BFS -> ped.
export function buildTree(nodes, links) {
  const root = nodes.reduce((a, b) => (b.h > a.h ? b : a), nodes[0]);
  const near = (pt) => {
    let best = null;
    let bestCost = SNAP_COST;
    for (const n of nodes) {
      const [dx, dy] = gapTo(pt, n.box);
      const ok = (dx <= SNAP_X && dy <= SNAP_Y) || (dx <= 12 && dy <= SNAP_Y_WIDE);
      if (!ok) continue;
      const cost = dx + dy * 1.5;        // line node ke daayen/baayen kinare par lagti hai
      if (cost < bestCost) { bestCost = cost; best = n; }
    }
    return best;
  };
  const adj = new Map(nodes.map((n) => [n.i, new Set()]));
  let joined = 0;
  for (const [a, b] of links) {
    const na = near(a);
    const nb = near(b);
    if (na && nb && na !== nb) { adj.get(na.i).add(nb.i); adj.get(nb.i).add(na.i); joined += 1; }
  }
  if (process.env.MM_DEBUG) console.error("links joined:", joined, "of", links.length);
  root.depth = 0;
  const seen = new Set([root.i]);
  const queue = [root];
  while (queue.length) {
    const n = queue.shift();
    for (const j of adj.get(n.i)) {
      if (seen.has(j)) continue;
      seen.add(j);
      const kid = nodes[j];
      kid.parent = n;
      kid.depth = n.depth + 1;
      (n.kids = n.kids || []).push(kid);
      queue.push(kid);
    }
  }
  const mid = (n) => (n.y + n.yLow) / 2;
  for (const n of nodes) if (n.kids) n.kids.sort((a, b) => mid(b) - mid(a));
  return { root, orphans: nodes.filter((n) => !seen.has(n.i)) };
}

export function printTree(node, depth = 0, out = []) {
  out.push(`${"   ".repeat(depth)}${depth ? "› " : "# "}${node.text}`);
  for (const k of node.kids || []) printTree(k, depth + 1, out);
  return out;
}

const args = Object.fromEntries(process.argv.slice(2).reduce((a, x, i, arr) => {
  if (x.startsWith("--")) a.push([x.slice(2), arr[i + 1] && !arr[i + 1].startsWith("--") ? arr[i + 1] : true]);
  return a;
}, []));


// ---------------------------------------------------------------- cards

// Coaching maps mein aam galat spelling — ek jagah, taaki har subject mein
// wahi sudhre. (Fact ki galtiyan yahan NAHI: unke liye flag hota hai.)
export const SPELLING = [
  [/\bVadic\b/g, "Vedic"], [/\bChacolithics?\b/g, "Chalcolithic"], [/\bPanjab\b/g, "Punjab"],
  [/\bMarraige\b/g, "Marriage"], [/\bPrantaka\b/g, "Parantaka"], [/\bYoshoda\b/g, "Yashoda"],
  [/\bJanshi\b/g, "Jhansi"], [/\blitrature\b/g, "literature"], [/\bComminitty\b/g, "Community"],
  [/\bRular\b/g, "Rural"], [/\bEarlist\b/g, "Earliest"], [/\bdomestiction\b/g, "domestication"],
];

export const clean = (t) => SPELLING.reduce((s2, [re, to]) => s2.replace(re, to), t)
  .replace(/\s+/g, " ").replace(/\s+([,;:])/g, "$1").trim();

const words = (t) => t.split(/\s+/).filter(Boolean).length;
const SPLIT = /^(.{2,60}?)\s+[-–—]\s+(.+)$/;   // "Didwana - Rajasthan"

// Ek patta -> ek card. Naam aur jawab alag karne ke teen tareeke:
//   do line ka node  -> pehli line naam, baaki jawab (Burzahom / 16km West…)
//   "A - B"          -> A naam, B jawab
//   warna            -> poora text jawab, sawaal sirf raasta
export function cardFromLeaf(leaf) {
  const path = [];
  for (let n = leaf.parent; n; n = n.parent) path.unshift(clean(n.text));
  const lines = leaf.lines.map(clean);
  let name = null;
  let answer = clean(leaf.text);
  if (lines.length > 1 && (words(lines[0]) <= 3 || /[-:]$/.test(lines[0].trim()))) {
    name = lines[0].replace(/[-–—:]\s*$/, "").trim();
    answer = lines.slice(1).join(" ");
  } else {
    const m = SPLIT.exec(answer);
    if (m && words(m[1]) <= 6) { name = m[1].trim(); answer = m[2].trim(); }
  }
  const full = name ? [...path, name] : path;
  return { path: full, answer, depth: full.length, leafText: clean(leaf.text) };
}

export function leavesOf(root) {
  const out = [];
  const walk = (n) => {
    if (n.parent && !(n.kids || []).length) out.push(n);
    for (const k of n.kids || []) walk(k);
  };
  walk(root);
  return out;
}

// Jo card recall ke laayak nahi: lamba jawab (padhne ka maal), jawab jo
// apne hi parent ko dohra raha ho, ya khaali shreni ka naam.
export function cardTier(c) {
  if (words(c.answer) > 12) return "extended";
  const parent = (c.path[c.path.length - 1] || "").toLowerCase();
  if (c.answer.toLowerCase() === parent) return "extended";
  if (/^(sites?|facts?|types?|features?|others?|points?|notes?)$/i.test(c.answer)) return "extended";
  return "core";
}

export const breadcrumb = (path) => path.join(" › ");

export async function readMap(doc, pageNo) {
  const { items, links, width } = await readPage(doc, pageNo);
  const nodes = buildNodes(items);
  const { root, orphans } = buildTree(nodes, links);
  return { root, nodes, orphans, links, width, pageNo };
}

// Har page ka centre node = us map ka naam.
if (args.pdf && args.titles) {
  const doc = await openPdf(args.pdf);
  for (let p = 1; p <= doc.numPages; p++) {
    const { root, nodes, orphans } = await readMap(doc, p);
    const leaves = nodes.filter((n) => n.parent && !(n.kids || []).length).length;
    console.log(`${String(p).padStart(2)}  ${root.text.slice(0, 44).padEnd(46)} nodes ${String(nodes.length).padStart(3)}  leaves ${String(leaves).padStart(3)}  orphan ${orphans.length}`);
  }
}

if (args.pdf && args.cards) {
  const doc = await openPdf(args.pdf);
  const pageNo = Number(args.page || 1);
  const { root, orphans } = await readMap(doc, pageNo);
  const cards = leavesOf(root).map(cardFromLeaf);
  const keep = cards.filter((c) => cardTier(c) === "core");
  console.log(`map "${clean(root.text)}" · page ${pageNo} · leaves ${cards.length} · core ${keep.length} · extended ${cards.length - keep.length} · orphan ${orphans.length}`);
  const limit = Number(args.limit || 10);
  const step = Math.max(1, Math.floor(keep.length / limit));
  for (let i = 0, shown = 0; i < keep.length && shown < limit; i += step, shown++) {
    const c = keep[i];
    console.log(`
Q: ${breadcrumb(c.path)} → ?`);
    console.log(`A: ${c.answer}`);
  }
}

if (args.pdf && args.tree) {
  const doc = await openPdf(args.pdf);
  const pageNo = Number(args.page || 1);
  const { items, links, width } = await readPage(doc, pageNo);
  const nodes = buildNodes(items);
  const { root, orphans } = buildTree(nodes, links);
  console.log(`page ${pageNo}/${doc.numPages} · width ${Math.round(width)} · items ${items.length} · nodes ${nodes.length} · links ${links.length}`);
  console.log(printTree(root).join("\n"));
  if (orphans.length) console.log(`\n! kisi line se nahi jude (${orphans.length}):\n` + orphans.map((n) => "  - " + n.text).join("\n"));
}
