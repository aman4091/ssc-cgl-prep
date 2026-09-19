// Deterministic parser for the standard current-affairs MCQ PDF format used by
// most daily/monthly CA compilations:
//
//   Q.1)  <question text>
//   a) opt   b) opt   c) opt   d) opt
//   Correct Answer: c) <opt>      (ya "Correct Answer - c)" — dono chalte hain)
//   • explanation bullet
//   • explanation bullet
//
// No AI — so it never silently returns "no questions" on a PDF that clearly has
// them. Returns [{ question, options[4], answer(index), detail(markdown) }].
// If the PDF isn't in this format, returns [] and the caller falls back to AI.

function clean(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

// Turn the "• …" explanation blob into tidy markdown bullet lines.
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

export function parseCaMcqs(text) {
  const RE =
    /Q\.?\s*\d+\s*\)\s*([\s\S]*?)\s*\ba\)\s*([\s\S]*?)\s*\bb\)\s*([\s\S]*?)\s*\bc\)\s*([\s\S]*?)\s*\bd\)\s*([\s\S]*?)\s*(?:Correct\s*Answer|Answer|Ans)\s*[:\-\u2013\u2014]?\s*([a-d])\s*\)?\s*([\s\S]*?)(?=Q\.?\s*\d+\s*\)|$)/gi;
  const out = [];
  let m;
  while ((m = RE.exec(String(text || "")))) {
    const question = clean(m[1]);
    const options = [clean(m[2]), clean(m[3]), clean(m[4]), clean(m[5])];
    const answer = "abcd".indexOf(m[6].toLowerCase());
    const detail = cleanDetail(m[7]);
    if (question && options.every(Boolean) && answer >= 0) {
      out.push({ question, options, answer, detail });
    }
  }
  return out;
}
