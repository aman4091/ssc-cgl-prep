// 🧩 AI ke jawab se CLUSTER nikalna — teeno shaklon mein.
//
// GS prompt ka output format badal gaya (25 Sep). Purane answers jaise ke
// waise save hain, aur AI kabhi-kabhi format bhool bhi jata hai — isliye
// teeno padhne aate hain:
//
//   1. NAYA (v3)                        2. PURANA (v1/v2)
//      ## 🧩 Chemical aur unke use         🧩 CLUSTER (fact log ke liye)
//                                          **Lata ke samman** – Padma Bhushan 1969 · …
//      Sulphuric acid fertilizer …
//      (prose, 70 shabd se kam)         3. SIRF PROSE — koi heading nahi, koi ⚡ nahi.
//                                          Bas paragraph. Yahan naam aur ⚡ line
//      **⚡** Sulphuric – fertilizer · …    hum khud bana lete hain.
//
// Naye format mein ek jawab mein KAI cluster ho sakte hain, aur har cluster
// ke do hisse hote hain: prose (seekhne ke liye) aur ⚡ line (revision ke
// liye). Purane format mein har "·" wali line apne aap mein ek cluster thi.
//
// -> [{ title, prose, zap }] — jo mila wahi, khali hisse "" rehte hain.

// Naye cluster ka sar: "## 🧩 <naam>" (##, ###, ya bina bhi — bas 🧩 se shuru).
const HEAD_NEW = /^[ \t]*#{0,4}[ \t]*🧩[ \t]*(.+?)[ \t]*$/gm;
// ⚡ wali compact line: "**⚡** …" ya "⚡ …"
const ZAP = /^[ \t]*(?:\*\*)?⚡(?:\*\*)?[ \t:–-]*(.+)$/;
// Purana sar: "🧩 CLUSTER …" — iske baad wali "·" lines hi cluster thin.
const HEAD_OLD = /^[#*\s]*🧩\s*\**\s*CLUSTER[^\n]*$/m;
// Purane format mein agla section (yahan cluster khatam).
const NEXT_OLD = /^[#*\s]*(?:🎯|📝|✅|📌|🔍|📚|🧠)/m;

const clean = (s) => String(s || "").replace(/\*\*/g, "").replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").trim();

function parseNew(md) {
  const heads = [];
  HEAD_NEW.lastIndex = 0;
  let m;
  while ((m = HEAD_NEW.exec(md)) !== null) {
    // "🧩 CLUSTER" purane format ka sar hai, cluster ka naam nahi.
    if (/^\**\s*CLUSTER\b/i.test(m[1])) continue;
    heads.push({ at: m.index, end: m.index + m[0].length, title: clean(m[1]) });
  }
  if (!heads.length) return [];
  const out = [];
  for (let i = 0; i < heads.length; i++) {
    const body = md.slice(heads[i].end, i + 1 < heads.length ? heads[i + 1].at : undefined);
    // Doosra section (## 🎯 …) aa gaya to cluster wahin khatam.
    const cut = /^[ \t]*#{1,4}[ \t]*(?!🧩)\S/m.exec(body);
    const text = cut ? body.slice(0, cut.index) : body;
    let zap = "";
    const prose = [];
    for (const raw of text.split("\n")) {
      const z = ZAP.exec(raw);
      if (z) { zap = clean(z[1]); continue; }
      const t = raw.trim();
      if (t) prose.push(clean(raw));
    }
    const title = heads[i].title;
    if (!title && !zap && !prose.length) continue;
    out.push({ title: title.slice(0, 80), prose: prose.join(" ").trim(), zap });
  }
  return out.filter((c) => c.prose || c.zap);
}

function parseOld(md) {
  const h = HEAD_OLD.exec(md);
  if (!h) return [];
  const rest = md.slice(h.index + h[0].length);
  const nx = NEXT_OLD.exec(rest);
  const body = nx ? rest.slice(0, nx.index) : rest;
  const out = [];
  for (const raw of body.split("\n")) {
    if (!/·/.test(raw)) continue;
    const line = clean(raw);
    if (!line) continue;
    const label = (/\*\*([^*]+?)\*\*/.exec(raw) || [])[1] || line.split(/ – | - |:/)[0] || "";
    out.push({ title: label.replace(/[:–-]\s*$/, "").trim().slice(0, 80), prose: "", zap: line });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────
// ⚡ line KHUD banana — jab AI ne sirf prose diya ho.
//
// Hota ye hai ki jawab format bhool kar seedha paragraph de deta hai:
// "Sulphuric acid ko 'King of Chemicals' kehte hain, yeh fertilizer … mein
// use hota hai. Soda ash glass, soap aur detergent banane mein kaam aata
// hai." — pehle us par button hi nahi aata tha.
//
// Ab har vaakya se "naam – cheezein" ban jata hai: filler kriya (use hota
// hai / kaam aata hai / lagta hai / kehte hain) hatao, shuru ka naam alag
// karo, baaki ko "/" se jodo. Ye AI nahi hai, seedha niyam hai — isliye
// line kabhi-kabhi thodi kachchi rahegi. Prose poora saath rehta hai
// ("⌄ poora padho"), isliye kuch khota nahi.
const FILLERS = [
  /\b(?:use|istemal|istemaal)\s+(?:hota|hoti|hote)\s+(?:hai|hain)\b/gi,
  /\bkaam\s+(?:aata|aati|aate)\s+(?:hai|hain)\b/gi,
  /\b(?:lagta|lagti|lagte|banta|banti|bante|banata|banati|banate|hota|hoti|hote|milta|milti|milte|kehlata|kehlati)\s+(?:hai|hain)\b/gi,
  /\bkehte\s+hain\b/gi,
  /\b(?:kaha|jana|mana)\s+jata\s+hai\b/gi,
  /\bbanane\s+(?:mein|ke\s+liye)\b/gi,
  /\bke\s+liye\b/gi,
  /\b(?:yeh|ye|iska|iski|isko|inka|inki)\b/gi,
];
// Naam ke saath chalne wale shabd — inko subject mein rehne do.
const HEADWORD = /^(acid|soda|powder|gas|oxide|chloride|sulphate|nitrate|carbonate|ash|water|salt|metal|ore|dioxide|dynasty|empire|hub|plant|port|river|valley|sabha|pradesh|nadu|bengal)$/i;

function stripFiller(sent) {
  let t = " " + String(sent).replace(/[.।!?]+\s*$/, "") + " ";
  for (const re of FILLERS) t = t.replace(re, " ");
  t = t.replace(/\s+\b(?:hai|hain)\b\s*$/i, " ");
  return t.replace(/\s+/g, " ").replace(/\s+([,.])/g, "$1").trim();
}

function joinItems(s) {
  return String(s || "")
    .replace(/\s*\bmein\b\s*$/i, "")
    .replace(/\s*,\s*aur\s+/gi, "/")
    .replace(/\s+aur\s+/gi, "/")
    .replace(/\s*,\s*/g, "/")
    .replace(/\s*\/\s*/g, "/")
    .replace(/^[/\s]+|[/\s]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function lineOf(sent) {
  const s = stripFiller(sent).replace(/^[-*•]\s*/, "");
  if (!s) return "";
  let subject = "";
  let rest = s;
  const ko = /^(.{2,40}?)\s+ko\s+(.+)$/i.exec(s);
  if (ko) { subject = ko[1]; rest = ko[2]; }
  else {
    const w = s.split(" ");
    let n = 1;
    while (n < w.length && n < 5) {
      if (w[n].startsWith("(")) break;
      const bare = w[n].replace(/[(),.]/g, "");
      if (HEADWORD.test(bare) || /^[A-Z]/.test(bare)) { n++; continue; }
      if (/^(aur|evam|and)$/i.test(bare) && n + 1 < w.length && /^[A-Z]/.test(w[n + 1])) { n += 2; continue; }
      break;
    }
    subject = w.slice(0, n).join(" ");
    rest = w.slice(n).join(" ");
  }
  rest = joinItems(rest.replace(/^ne\s+/i, ""));
  if (!rest) return "";
  return `${subject.replace(/[,:]+$/, "").trim()} – ${rest}`;
}

/** Prose se "⚡" wali compact line. AI ne di ho to ye chalti hi nahi. */
export function zapFromProse(prose) {
  return String(prose || "")
    .split(/(?<=[.।!?])\s+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .map(lineOf)
    .filter(Boolean)
    .join(" · ")
    .slice(0, 600);
}

/** Naam na ho to pehle do vaakyon ke naam se ek bana do. */
export function titleFromProse(prose) {
  const names = zapFromProse(prose)
    .split(" · ")
    .map((x) => x.split(" – ")[0].trim())
    .filter(Boolean);
  if (names.length >= 2) return `${names[0]} · ${names[1]}${names.length > 2 ? " …" : ""}`.slice(0, 60);
  if (names.length === 1) return names[0].slice(0, 60);
  return String(prose || "").split(/\s+/).slice(0, 6).join(" ").slice(0, 60);
}

// Bina "🧩" wala jawab: har paragraph apne aap mein ek cluster. Sirf wahi
// paragraph jo sach mein facts jaisa ho — do vaakya se bada, heading/list
// nahi, aur maths/table nahi.
function parseProse(md) {
  const out = [];
  for (const raw of String(md).split(/\n\s*\n/)) {
    const t = raw.trim();
    if (!t || t.length < 90) continue;
    if (/^[#>|]/.test(t)) continue;
    if (/^\s*(?:[-*•]|\d+[.)])\s/.test(t)) continue;
    if (t.includes("$$") || t.includes("\\frac") || t.includes("|---")) continue;
    const sentences = t.split(/(?<=[.।!?])\s+/).filter((x) => x.trim().length > 12);
    if (sentences.length < 2) continue;
    const zap = zapFromProse(t);
    if (!zap) continue;
    out.push({ title: titleFromProse(t), prose: t.replace(/\s+/g, " ").trim(), zap });
  }
  return out;
}

/** Jawab ke saare cluster. opts.prose = bina 🧩 wale paragraph bhi lo. */
export function clustersOf(md, opts) {
  const s = String(md || "");
  if (s.includes("🧩")) {
    const fresh = parseNew(s);
    if (fresh.length) return fresh;
    const old = parseOld(s);
    if (old.length) return old;
  }
  // 🧩 hai hi nahi — AI format bhool gaya. GS ke jawab par tab bhi cluster
  // banta hai: har paragraph ek, naam aur ⚡ line khud se.
  return opts && opts.prose ? parseProse(s) : [];
}

/** Fact log ki ek entry kaise banegi — dono jagah ek hi hisaab. */
export function factOf(c) {
  const prose = c.prose || "";
  // AI ne ⚡ line na di ho to prose se khud bana lo — revision (D+3 se aage)
  // usi par chalta hai.
  const zap = c.zap || (prose ? zapFromProse(prose) : "");
  return {
    sec: "gs",
    topic: c.title || (prose ? titleFromProse(prose) : ""),
    text: prose || c.zap || "",
    zap,
  };
}

/** Do cluster ek hi hain ya nahi — dobara jodne se rokne ke liye. */
export function clusterKey(c) {
  return `${(c.title || "").toLowerCase()}|${(c.zap || c.prose || "").slice(0, 120).toLowerCase()}`;
}
