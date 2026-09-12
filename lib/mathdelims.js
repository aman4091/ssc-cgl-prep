// DeepSeek (aur kabhi Gemini) math ko \( … \) aur \[ … \] mein likhta hai, par
// site ka markdown (remark-math) sirf $ … $ / $$ … $$ samajhta hai — isliye
// answer mein "6\left(3\sqrt3-\frac{22}{7}\right) \approx196(…)" jaisa kachcha
// LaTeX dikhta tha. Render se pehle dono ko $ wale roop mein badal dete hain.
//
//  • \( … \)                → $ … $
//  • line ki shuruat par \[  → $$ block — usi indentation par, taaki bullet /
//    numbered list ke andar wala formula list ke andar hi rahe
//  • line ke beech \[ … \]   → inline $$ … $$
//
// Code (``` … ``` ya `…`) ko nahi chhedte.

export function normalizeMath(src) {
  const s = typeof src === "string" ? src : String(src ?? "");
  if (s.indexOf("\\(") < 0 && s.indexOf("\\[") < 0) return s;
  return s
    .split(/(```[\s\S]*?```|`[^`\n]*`)/g)
    .map((part, i) => (i % 2 === 1 ? part : convert(part)))
    .join("");
}

const oneLine = (t) => t.trim().split(/\s*\n\s*/).join(" ");

function convert(part) {
  const display = /\\\[([\s\S]+?)\\\]/g;
  let out = "";
  let last = 0;
  let m;
  while ((m = display.exec(part)) !== null) {
    const off = m.index;
    const before = part.slice(last, off);
    // Is line par \[ se pehle sirf khali jagah hai? To ye block formula hai.
    const lineHead = /(^|\n)([ \t]*)$/.exec(part.slice(0, off));
    out += before;
    if (lineHead) {
      const ind = lineHead[2];
      const body = m[1].trim().split("\n").map((l) => ind + l.trim()).join("\n");
      out += `$$\n${body}\n${ind}$$`;
    } else {
      out += `$$${oneLine(m[1])}$$`;
    }
    last = off + m[0].length;
  }
  out += part.slice(last);
  return out.replace(/\\\(([\s\S]+?)\\\)/g, (_, a) => `$${oneLine(a)}$`);
}
