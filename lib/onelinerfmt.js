"use client";

// 📝 Paste kiye hue one-liner ko padhne layak shakl mein.
//
// Jo shakl AI deta hai wo hamesha ek jaisi hoti hai:
//
//   **President: Election (Art 54 - 55)**
//   4. ⭐ Art 54 – Sirf ELECTED MPs aur MLAs vote karte hain.
//   5. Art 55 – Election indirect, PR + STV se hota hai.
//
//   ⚠️ **Confusion:**
//   Election mein ELECTED, Impeachment mein ALL members.
//
// Yahan uske teen hisse alag kiye jaate hain — TOPIC ka naam, uske neeche
// numbered point, aur aakhir ka ⚠️ Confusion — taaki page par wo list ki
// tarah dikhe, ek chipke hue paragraph ki tarah nahi.
//
// Ismein koi AI nahi lagta: shakl tay hai, isliye seedha padh lete hain.
// (Muft, turant, aur har baar ek jaisa.)

const NL = String.fromCharCode(10);

// Kabhi-kabhi paste karte waqt khali lines gir jaati hain aur sab ek line
// mein chipak jata hai. Heading aur har numbered point se pehle nayi line
// laga dete hain — phir sab theek padha jata hai.
export function tidyOneLiner(text) {
  return String(text || "")
    .split(String.fromCharCode(13)).join("")
    // SABSE PEHLE ⚠️ / 🧠 wali line — unke andar bhi "**Confusion:**" jaisa
    // bold hota hai, aur neeche wala topic-wala niyam use alag line par kaat
    // deta tha (isse "Confusion" ka ek nakli topic bhi ban jata tha). Yahan
    // unke stars abhi hata dete hain, phir wo niyam unhe chhuta hi nahi.
    .replace(/(⚠️|🧠)[ \t]*\*\*([^*\n]+?)\*\*:?/g, NL + "$1 $2")
    .replace(/([^\n])[ \t]*(⚠️|🧠)/g, "$1" + NL + "$2")
    // "…hai. **Agla Topic** 2. Art 52…" → topic se pehle nayi line.
    //
    // Do shartein jaan-boojh kar: pehle SPACE hona chahiye, aur uske baad
    // ya to line khatam ho ya agla numbered point shuru ho. Bina inke ye
    // niyam heading ke ANDAR ke bold ko bhi kaat deta tha —
    // "**President: Election (**Art 54** - 55)**" do tukdon mein bant kar
    // heading hi kho deti thi.
    .replace(/([^\n])[ \t]+(\*\*[^*\n]{2,80}\*\*)(?=[ \t]*(?:\d{1,3}\.|$|\n))/g, "$1" + NL + "$2")
    // "…hai. 7. MLA Vote…" → point se pehle nayi line
    .replace(/([^\n])[ \t]+(\d{1,3}\.\s)/g, "$1" + NL + "$2")
    .trim();
}

// Heading wo line hai jo ** se shuru aur ** par khatam ho. Andar aur bhi **
// ho sakte hain — AI kabhi-kabhi heading ke ANDAR ka Article number bhi bold
// kar deta hai ("**President: Election (**Art 54** - 55)**"). Sakht jaanch
// (andar koi * na ho) aisi line ko heading maanne se mana kar deti thi aur wo
// ek adhoore point ki tarah list mein aa jati thi.
const isHeading = (l) => /^\*\*.+\*\*:?$/.test(l);
const stripStars = (l) => l.replace(/\*\*/g, "").replace(/:$/, "").trim();

// -> [{ kind: "topic"|"warn"|"tip", title, points: [{ n, text, star }] }]
export function parseOneLiner(text) {
  const lines = tidyOneLiner(text).split(NL).map((l) => l.trim()).filter(Boolean);
  const out = [];
  let cur = null;
  const open = (kind, title) => { cur = { kind, title, points: [] }; out.push(cur); return cur; };

  for (const line of lines) {
    // ⚠️ Confusion aur 🧠 Yaad rakhne ki trick — dono ka apna khaana, aur
    // uske baad jo bhi aaye wo usi ke andar.
    if (/^(⚠️|🧠)/.test(line)) {
      const tip = line.startsWith("🧠");
      // "⚠️ Confusion: <poori baat>" ek hi line mein bhi aa sakta hai (jab
      // paste karte waqt khali lines gir jayein). Pehle colon tak ka hissa
      // naam hai, uske aage ki baat point.
      const rest = stripStars(line.replace(/^(⚠️|🧠)\s*/, ""));
      const at = rest.indexOf(":");
      const title = (at > 0 && at <= 40 ? rest.slice(0, at) : rest.replace(/:$/, ""))
        || (tip ? "Yaad rakhne ki trick" : "Confusion");
      const tail = at > 0 && at <= 40 ? rest.slice(at + 1).trim() : "";
      open(tip ? "tip" : "warn", title);
      if (tail) cur.points.push({ n: "", text: tail, star: false });
      continue;
    }
    if (isHeading(line)) { open("topic", stripStars(line)); continue; }

    const m = /^(\d{1,3})\.\s*(.*)$/.exec(line);
    const body = m ? m[2] : line;
    const star = /⭐/.test(body);
    const clean = body.replace(/⭐/g, "").trim();
    if (!cur) open("topic", "");
    cur.points.push({ n: m ? m[1] : "", text: clean, star });
  }
  return out.filter((s) => s.points.length || s.title);
}

// Kitne point aur kitne ⭐ — list ke sar par dikhane ke liye.
export function countOneLiner(text) {
  const secs = parseOneLiner(text);
  let n = 0, star = 0;
  for (const s of secs) for (const p of s.points) { n += 1; if (p.star) star += 1; }
  return { n, star, topics: secs.filter((s) => s.kind === "topic").length };
}
