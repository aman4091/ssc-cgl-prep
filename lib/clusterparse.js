// 🧩 AI ke jawab se CLUSTER nikalna — dono shaklon mein.
//
// GS prompt ka output format badal gaya (25 Sep). Purane answers jaise ke
// waise save hain, isliye dono padhne aate hain:
//
//   NAYA (v3)                          PURANA (v1/v2)
//   ## 🧩 Chemical aur unke use        🧩 CLUSTER (fact log ke liye)
//                                      **Lata ke samman** – Padma Bhushan 1969 · …
//   Sulphuric acid fertilizer …        **Ek aur group** – … · …
//   (prose, 70 shabd se kam)
//
//   **⚡** Sulphuric – fertilizer · …
//
// Naye format mein ek jawab mein KAI cluster ho sakte hain, aur har cluster
// ke do hisse hote hain: prose (seekhne ke liye) aur ⚡ line (revision ke
// liye). Purane format mein har "·" wali line apne आप mein ek cluster thi —
// prose tha hi nahi, isliye wahan prose khali rehta hai.
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

/** Jawab ke saare cluster — naya format pehle, na mile to purana. */
export function clustersOf(md) {
  const s = String(md || "");
  if (!s.includes("🧩")) return [];
  const fresh = parseNew(s);
  if (fresh.length) return fresh;
  return parseOld(s);
}

/** Fact log ki ek entry kaise banegi — dono jagah ek hi hisaab. */
export function factOf(c) {
  return {
    sec: "gs",
    topic: c.title || "",
    text: c.prose || c.zap || "",
    zap: c.zap || "",
  };
}

/** Do cluster ek hi hain ya nahi — dobara jodne se rokne ke liye. */
export function clusterKey(c) {
  return `${(c.title || "").toLowerCase()}|${(c.zap || c.prose || "").slice(0, 120).toLowerCase()}`;
}
