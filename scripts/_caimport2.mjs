// PDF text -> cabank month JSON. lib/caparse.js ka regex poore 100 KB par
// backtrack karta hai, isliye yahan block-by-block: split par Q.N), phir
// har block mein options/answer. Safai wahi (cleanDetail) jo site karti hai.
import { readFileSync, writeFileSync } from "node:fs";

const clean = (s) => String(s || "").replace(/\s+/g, " ").trim();
function cleanDetail(s) {
  s = String(s || "");
  const b = s.indexOf("•");
  if (b > 0 && b < 90) s = s.slice(b); // drop the echoed answer text before the first bullet
  // PDF do tarah ki nayi line deta hai: bullet ke andar ka TOOT (page ki
  // chaudai khatam ho gayi) aur asli line (upar-heading jaise "Ram Nath
  // Kovind"). Dono ko waisa ka waisa rakhne par jawab tooti hui lines ka
  // dhher ban jata tha. Pehchan seedhi hai: pichhli line agar . : ! ? par
  // khatam nahi hui to wo toot thi — jod do; warna nayi line rehne do.
  const MARK = String.fromCharCode(1);
  const unwrap = (piece) => piece.split("\n").reduce((acc, raw) => {
    const ln = raw.replace(/[ \t]+/g, " ").trim();
    if (!ln) return acc;
    const prev = acc[acc.length - 1];
    if (prev && !/[.:!?—-]$/.test(prev)) acc[acc.length - 1] = prev + " " + ln;
    else acc.push(ln);
    return acc;
  }, []);
  return s
    .replace(/\r/g, "")
    .replace(/[ \t]*•[ \t]*/g, MARK)
    .split(MARK)
    .map((piece) => unwrap(piece))
    .filter((lines) => lines.length)
    .map((lines) => ["- " + lines[0], ...lines.slice(1)].join("\n"))
    .join("\n")
    .trim();
}

const [, , txt, period, out] = process.argv;
const blocks = readFileSync(txt, "utf8").split(/Q\.?\s*\d+\s*\)/).slice(1);
const rows = [];
for (const blk of blocks) {
  const m = /^([\s\S]*?)\ba\)([\s\S]*?)\bb\)([\s\S]*?)\bc\)([\s\S]*?)\bd\)([\s\S]*?)(?:Correct\s*Answer|Answer|Ans)\s*[:\-\u2013\u2014]?\s*([a-d])\s*\)?([\s\S]*)$/i.exec(blk);
  if (!m) continue;
  const question = clean(m[1]);
  const options = [clean(m[2]), clean(m[3]), clean(m[4]), clean(m[5])];
  const answer = "abcd".indexOf(m[6].toLowerCase());
  if (!question || !options.every(Boolean) || answer < 0) continue;
  rows.push({
    id: `ca-${period}-${String(rows.length + 1).padStart(3, "0")}`,
    question, options, answer, detail: cleanDetail(m[7]),
  });
}
writeFileSync(out, JSON.stringify(rows));
console.log(period, rows.length, "questions of", blocks.length, "blocks");
