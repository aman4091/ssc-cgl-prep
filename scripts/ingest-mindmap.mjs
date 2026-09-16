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

// Kuch patte bina khinchi line ke chhapte hain (khaas kar bhare hue maps
// mein). Unhe girne nahi dete: sabse paas ka wo node dhoondo jo CENTRE ki
// taraf inse aage hai (yaani unka sambhavit parent), thodi si doori ke andar.
// Baar-baar chalate hain, kyunki ek juda hua orphan doosre ka parent ho
// sakta hai. Jo phir bhi na jude, unka card banta hai par "orphan" flag ke
// saath — adhoora raasta bhi gayab fact se behtar hai.
export const ORPHAN_DX = 150;    // centre ki taraf itni doori tak parent dhoondo
export const ORPHAN_DY = 34;     // aam taur par is oonchai ke andar
export const ORPHAN_DY_FAN = 90; // …par parent bilkul bagal mein ho to bachche
export const ORPHAN_DX_FAN = 70; //    uske upar-neeche failte hain
export const ORPHAN_STEP = 30;   // parent ka andar wala kinara itna aage ho, warna ek
                                 // hi column ke naam aapas mein hi jud jate hain

export function attachOrphans(root, nodes, orphans) {
  const cx = root.x + root.w / 2;
  const side = (n) => (n.x + n.w / 2 >= cx ? "r" : "l");
  // centre se doori: chhoti = centre ke zyada paas (dono taraf ke liye ek jaisi)
  const centreDist = (n) => (side(n) === "r" ? n.x - cx : cx - (n.x + n.w));
  const gapOf = (a, b) => [
    Math.max(b[0] - a[2], a[0] - b[2], 0),
    Math.max(b[1] - a[3], a[1] - b[3], 0),
  ];
  const bestFor = (o) => {
    let best = null;
    let bestCost = Infinity;
    for (const n of nodes) {
      if (n === o || n === root) continue;
      if (side(n) !== side(o)) continue;                // parent usi taraf ka
      // Parent ya to chhota sa shreni-naam hota hai ("Leaders", "Sites") ya
      // uske pehle se bachche hain. Lamba fact-node kisi ka parent nahi.
      if (!(n.kids && n.kids.length) && n.text.split(/\s+/).length > 4) continue;
      if (centreDist(o) - centreDist(n) < ORPHAN_STEP) continue;  // aur centre ki taraf itna aage
      const [dx, dy] = gapOf(o.box, n.box);
      const ok = (dx <= ORPHAN_DX && dy <= ORPHAN_DY) || (dx <= ORPHAN_DX_FAN && dy <= ORPHAN_DY_FAN);
      if (!ok) continue;
      const cost = dx + dy * 5;   // ek hi line mein hona sabse bada sanket hai
      if (cost < bestCost) { bestCost = cost; best = n; }
    }
    return best;
  };

  const join = (o, parent, how) => {
    o.parent = parent;
    o.depth = parent.depth + 1;
    o.attached = how;
    (parent.kids = parent.kids || []).push(o);
  };

  let left = [...orphans];
  const rootJoined = [];
  for (let round = 0; round < 60 && left.length; round++) {
    // 1) jo saaf taur par kisi jude hue node ke bagal mein hain
    for (let pass = 0; pass < 6 && left.length; pass++) {
      const still = [];
      for (const o of left) {
        const best = bestFor(o);
        // Sabse achha ummeedvaar khud orphan hai -> pehle usko jodne do, warna
        // bachcha galat parent (jo bas paas khada tha) ke neeche chipak jata hai.
        if (!best || best.depth === undefined) { still.push(o); continue; }
        join(o, best, "paas se joda");
      }
      if (still.length === left.length) { left = still; break; }
      left = still;
    }
    if (!left.length) break;
    // 2) ab bhi koi nahi mila: centre ke sabse paas wala orphan map ki apni
    // branch hai (uski line chhapi hi nahi) — use centre se jodo aur flag
    // karo; uske bachche agle round mein khud uske neeche aa jayenge.
    left.sort((a, b) => centreDist(a) - centreDist(b));
    const head = left.shift();
    join(head, root, "centre se joda (line nahi thi)");
    head.flag = "orphan — path incomplete";
    rootJoined.push(head);
  }
  const mid = (n) => (n.y + n.yLow) / 2;
  for (const n of nodes) if (n.kids) n.kids.sort((a, b) => mid(b) - mid(a));
  return left;
}

export function printTree(node, depth = 0, out = []) {
  out.push(`${"   ".repeat(depth)}${depth ? "› " : "# "}${node.text}`);
  for (const k of node.kids || []) printTree(k, depth + 1, out);
  return out;
}

// ------------------------------------------------------------- emit

import { mkdirSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";

export const SUBJECT_BUDGET = {
  polity: 260, geography: 240, history: 240, static: 220,
  biology: 180, economics: 160, physics: 160, chemistry: 140,
};
export const TIER_SHARE = { A: 0.45, B: 0.35, C: 0.20 };
export const OUT_DIR = "public/mindmap";

const slug = (s) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);

// Ek subject ki poori PDF -> cards (deck: core/extended, flags ke saath).
export async function ingestSubject(file, subject) {
  const doc = await openPdf(file);
  const tiers = MAP_TIERS[subject] || {};
  const tierOf = (page) => (tiers.A?.includes(page) ? "A" : tiers.B?.includes(page) ? "B" : "C");
  const maps = [];
  for (let page = 1; page <= doc.numPages; page++) {
    const { root, orphans, attached } = await readMap(doc, page);
    const mapTitle = clean(root.text);
    const cards = [];
    for (const leaf of leavesOf(root)) {
      const c = cardFromLeaf(leaf);
      const flags = [];
      // raasta anuman: is shaakha ki line PDF mein chhapi hi nahi thi
      for (let n = leaf; n; n = n.parent) if (n.attached && n.attached.startsWith("centre")) flags.push("path anuman — PDF mein is shaakha ki line nahi thi");
      const fixedA = applyFixes(c.answer, mapTitle, c.path);
      const fixedP = c.path.map((p) => applyFixes(p, mapTitle, c.path));
      const notes = [...new Set([...flags, ...fixedA.notes, ...fixedP.flatMap((f) => f.notes)])];
      const path = fixedP.map((f) => f.text);
      const answer = fixedA.text;
      const id = `${subject}-${slug(path[path.length - 1] || mapTitle)}-${createHash("sha1").update(`${subject}|${path.join(">")}|${answer}`).digest("hex").slice(0, 6)}`;
      cards.push({
        id, subject, mapTitle, page, tier: tierOf(page), path, trigger: breadcrumb(path),
        answer, depth: path.length, pdfPage: page, keep: cardTier(c) === "core",
        ...(notes.length ? { flagged: notes.join(" · ") } : {}),
      });
    }
    maps.push({ page, mapTitle, tier: tierOf(page), cards, orphans: orphans.length, attached });
  }
  return maps;
}

// Budget: tier ke hisse, aur tier ke andar maps baari-baari (taaki ek hi map
// apne tier ka saara hissa na kha jaye).
export function allocate(maps, budget) {
  const chosen = new Set();
  for (const [tier, share] of Object.entries(TIER_SHARE)) {
    const cap = Math.round(budget * share);
    const queues = maps.filter((m) => m.tier === tier).map((m) => m.cards.filter((c) => c.keep));
    let taken = 0;
    while (taken < cap && queues.some((q) => q.length)) {
      for (const q of queues) {
        if (taken >= cap) break;
        const c = q.shift();
        if (c) { chosen.add(c.id); taken += 1; }
      }
    }
  }
  return chosen;
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

// ------------------------------------------------------- tiers & fixes

// Har subject ke maps ka tier (exam mein kitna poocha jata hai). Page number
// se, kyunki ek page = ek map. A 45% / B 35% / C 20% budget ka.
export const MAP_TIERS = {
  history: {
    A: [21, 22, 23, 25, 26, 27],                    // 1857, Socio-Religious, INC, Gandhi, CDM, Quit India
    B: [2, 3, 4, 5, 7, 10, 17, 18, 24],             // IVC, Vedic, Jain, Buddh, Maurya, Gupta, Mughal x2, Bengal Partition
    C: [1, 6, 8, 9, 11, 12, 13, 14, 15, 16, 19, 20, 28],
  },
};

// Maps ki apni factual galtiyan — sirf ye paanch, owner ne ginwayi hain.
// Baaki kuch bhi chupke se nahi badalta: shak ho to card flag hota hai.
export const FACT_FIXES = [
  { map: /plassey/i, from: /Shuja-?ud-?(Daulah|Aullah)/gi, to: "Siraj-ud-Daulah",
    note: "PDF: Shuja-ud-Daulah" },
  { map: /navratna|akbar/i, from: /(Varahamihira[^,;]{0,20}?)Grammarian/gi, to: "$1Astronomer",
    note: "PDF: Varahamihira = Grammarian" },
  { map: /navratna|akbar/i, from: /(Vararuchi[^,;]{0,20}?)Magician/gi, to: "$1Grammarian",
    note: "PDF: Vararuchi = Magician" },
  { map: /qutub|delhi sultanate/i, from: /later in 12th century/gi, to: "later in 13th century",
    note: "PDF: 12th century" },
  { map: /sambhaji|maratha/i, from: /Akbar II/g, to: "Prince Akbar",
    note: "PDF: Akbar II" },
];

export function applyFixes(text, mapTitle, path) {
  let out = text;
  const notes = [];
  const where = `${mapTitle} ${path.join(" ")}`;
  for (const f of FACT_FIXES) {
    if (!f.map.test(where) && !f.map.test(out)) continue;
    const next = out.replace(f.from, f.to);
    if (next !== out) { notes.push(f.note); out = next; }
  }
  return { text: out, notes };
}

export async function readMap(doc, pageNo) {
  const { items, links, width } = await readPage(doc, pageNo);
  const nodes = buildNodes(items);
  const { root, orphans } = buildTree(nodes, links);
  const loose = attachOrphans(root, nodes, orphans);
  return { root, nodes, orphans: loose, attached: orphans.length - loose.length, links, width, pageNo };
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
  const { root, nodes, orphans, attached, links, width } = await readMap(doc, pageNo);
  console.log(`page ${pageNo}/${doc.numPages} · width ${Math.round(width)} · items ${nodes.length} nodes · links ${links.length} · paas se jode ${attached} · bache orphan ${orphans.length}`);
  const only = args.branch ? String(args.branch).toLowerCase() : null;
  const start = only
    ? (root.kids || []).filter((k) => k.text.toLowerCase().includes(only))
    : [root];
  for (const n of start) console.log(printTree(n).join("\n"));
  if (orphans.length) console.log(`\n! ab bhi bina raaste ke (${orphans.length}):\n` + orphans.map((n) => "  - " + n.text).join("\n"));
}

// Poori PDF ingest karo: node scripts/ingest-mindmap.mjs --pdf … --subject history [--budget 240]
if (args.pdf && args.subject && !args.tree && !args.titles && !args.cards) {
  const subject = String(args.subject);
  const budget = Number(args.budget || SUBJECT_BUDGET[subject] || 200);
  const maps = await ingestSubject(args.pdf, subject);
  const all = maps.flatMap((m) => m.cards);
  const chosen = allocate(maps, budget);
  for (const c of all) { c.deck = chosen.has(c.id) ? "core" : "extended"; delete c.keep; }

  mkdirSync(OUT_DIR, { recursive: true });
  const core = all.filter((c) => c.deck === "core");
  const ext = all.filter((c) => c.deck === "extended");
  const wr = (name, rows) => {
    const body = JSON.stringify(rows);
    writeFileSync(`${OUT_DIR}/${name}`, body);
    return Math.round(body.length / 1024);
  };
  const kbCore = wr(`${subject}-core.json`, core);
  const kbExt = wr(`${subject}-ext.json`, ext);

  let index = {};
  try { index = JSON.parse(readFileSync(`${OUT_DIR}/index.json`, "utf8")); } catch { index = { subjects: {} }; }
  index.subjects = index.subjects || {};
  index.subjects[subject] = {
    budget, core: core.length, extended: ext.length,
    maps: maps.map((m) => ({ page: m.page, title: m.mapTitle, tier: m.tier, cards: m.cards.length })),
  };
  index.version = createHash("sha1").update(JSON.stringify(index.subjects)).digest("hex").slice(0, 10);
  writeFileSync(`${OUT_DIR}/index.json`, JSON.stringify(index, null, 1));

  console.log(`${subject}: ${all.length} cards · core ${core.length} (budget ${budget}) · extended ${ext.length}`);
  console.log(`files: ${subject}-core.json ${kbCore} KB · ${subject}-ext.json ${kbExt} KB`);
  for (const t of ["A", "B", "C"]) {
    const inTier = maps.filter((m) => m.tier === t);
    const c = inTier.reduce((n, m) => n + m.cards.filter((x) => x.deck === "core").length, 0);
    console.log(`  tier ${t}: ${inTier.length} maps · core ${c} · total ${inTier.reduce((n, m) => n + m.cards.length, 0)}`);
  }
  const flagged = all.filter((c) => c.flagged);
  console.log(`flagged: ${flagged.length} (core mein ${flagged.filter((c) => c.deck === "core").length})`);
  const byNote = {};
  for (const c of flagged) byNote[c.flagged.split(" · ")[0]] = (byNote[c.flagged.split(" · ")[0]] || 0) + 1;
  for (const [k, v] of Object.entries(byNote)) console.log(`   ${String(v).padStart(4)}  ${k}`);
  const orph = maps.filter((m) => m.orphans);
  console.log(orph.length ? `bina raaste ke nodes: ${orph.map((m) => `p${m.page}:${m.orphans}`).join(" ")}` : "bina raaste ke nodes: 0");
}
