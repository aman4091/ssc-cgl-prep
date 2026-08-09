// Deterministic parser for the standard current-affairs MCQ PDF format used by
// most daily/monthly CA compilations:
//
//   Q.1)  <question text>
//   a) opt   b) opt   c) opt   d) opt
//   Correct Answer: c) <opt>
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
  return s
    .replace(/\s*•\s*/g, "\n- ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

export function parseCaMcqs(text) {
  const RE =
    /Q\.?\s*\d+\s*\)\s*([\s\S]*?)\s*\ba\)\s*([\s\S]*?)\s*\bb\)\s*([\s\S]*?)\s*\bc\)\s*([\s\S]*?)\s*\bd\)\s*([\s\S]*?)\s*(?:Correct\s*Answer|Answer|Ans)\s*:?\s*([a-d])\s*\)?\s*([\s\S]*?)(?=Q\.?\s*\d+\s*\)|$)/gi;
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
