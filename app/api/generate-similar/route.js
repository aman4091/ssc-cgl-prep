import { deepseekChat, parseJsonLoose } from "@/lib/deepseek";

// Pull complete {...} objects out of a (possibly TRUNCATED) "questions" array.
// A maths set is heavy — full LaTeX solution + an SVG diagram per question — so
// 20 of them can overrun the token limit and the JSON ends mid-array. Plain
// JSON.parse then fails and we'd throw away every question that DID come back.
// This brace-matches each object so a cut-off tail costs only its last item.
function salvageQuestions(content) {
  const at = content.indexOf('"questions"');
  const arr = at === -1 ? -1 : content.indexOf("[", at);
  if (arr === -1) return [];
  const out = [];
  let depth = 0, objStart = -1, inStr = false, esc = false;
  for (let i = arr + 1; i < content.length; i++) {
    const c = content[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{") { if (depth === 0) objStart = i; depth++; }
    else if (c === "}") {
      depth--;
      if (depth === 0 && objStart !== -1) {
        try { out.push(JSON.parse(content.slice(objStart, i + 1))); } catch { /* skip partial */ }
        objStart = -1;
      }
    } else if (c === "]" && depth === 0) break;
  }
  return out;
}

const SIMILAR_PROMPT = `You are an SSC CGL question setter AND an accurate solver. Given ONE sample question, generate a fresh practice set of NEW questions of the SAME type, topic and difficulty.

Output STRICT JSON only (no markdown, no commentary):
{
  "title": "short title describing the type",
  "questions": [
    {
      "question": "the question text",
      "diagram": "<svg ...>...</svg>  (only if a figure helps; else \\"\\")",
      "solution": "your full step-by-step working ending at the exact final value",
      "options": ["opt1","opt2","opt3","opt4"],
      "answer": 0,
      "explanation": "1-2 line reason / fastest trick"
    }
  ]
}

CORRECTNESS (most important — do NOT get this wrong):
- For EACH question, FIRST actually SOLVE it in "solution" and get the EXACT final value.
- Make ONE of the 4 options EQUAL to that computed value; the other 3 are plausible wrong results (distractors).
- Set "answer" to the 0-based index of the option that equals your computed value. Re-check the index before finalizing.
- "explanation" must reach the SAME value as options[answer]. The value in solution, explanation, and options[answer] must all be IDENTICAL.
- You MUST return the full requested number of questions — do NOT omit or skip any. If you are unsure of a value, simplify that question until you can solve it confidently, then include it. Returning fewer than requested (or an empty list) is a failure.

OTHER RULES:
- SAME CONCEPT (most important): First identify the EXACT rule/concept/topic the sample tests. For English grammar this is the specific rule (articles, tenses, subject-verb agreement, prepositions, etc.). EVERY generated question must test the SAME rule/concept — only different wording/words/numbers. Do NOT drift to other rules or topics.
- Same pattern/topic as the sample, but DIFFERENT numbers/wording. Do NOT repeat the sample.
- Provide exactly the requested number of questions, each with exactly 4 options.
- Put the four choices ONLY inside "options". The "question" text must END at the question mark — it must NOT contain any of the choices, option letters (a)(b), or a list of the candidate answers.
  WRONG question: "Who is the third heaviest? Jiya Priya Disha Shreya"
  RIGHT question:  "Who is the third heaviest person in the group?"   with options: ["Jiya","Priya","Disha","Shreya"]
- MATH: write all mathematics in LaTeX ($...$). Use x^{2}, \\frac{a}{b}, \\sqrt{x}, \\times, \\div. NEVER use a bare ^ caret. Applies to question, options, explanation.
- DIAGRAM: if the question needs a figure (height & distance, triangles, geometry, mensuration, angles), put a clean self-contained SVG in "diagram": use viewBox, thin strokes with stroke="#0f172a", small <text> labels for angles/lengths, NO <script>, NO external images. Keep it simple and geometrically correct. If no figure is needed, set "diagram" to "".`;

export async function POST(req) {
  try {
    const { sample, count = 20, subject, apiKey, model, baseUrl } = await req.json();
    if (!sample || !sample.question)
      return Response.json({ error: "Sample question missing." }, { status: 400 });

    const n = Math.min(Math.max(parseInt(count) || 20, 1), 30);

    const subjectLine = subject ? `Subject: ${subject}.\n` : "";
    const sampleText =
      subjectLine +
      `Sample question:\n${sample.question}\n` +
      (Array.isArray(sample.options) ? "Options: " + sample.options.join(" | ") + "\n" : "") +
      `\nIdentify the exact rule/concept this sample tests, then generate ${n} NEW questions testing the SAME rule/concept.`;

    const result = await deepseekChat({
      apiKey,
      model,
      baseUrl,
      temperature: 0.2,
      jsonMode: true,
      maxTokens: 8000,
      messages: [
        { role: "system", content: SIMILAR_PROMPT },
        { role: "user", content: sampleText },
      ],
    });

    if (!result.ok) return Response.json({ error: result.error }, { status: result.status });

    const parsed = parseJsonLoose(result.content);

    // Options sometimes come back as objects ({text}/{value}) or numbers — coerce
    // to plain strings so a shape quirk doesn't make a whole set look invalid.
    const normOpts = (o) =>
      Array.isArray(o)
        ? o.map((x) => (typeof x === "string" ? x : x?.text ?? x?.value ?? x?.option ?? x?.label ?? String(x)))
        : [];
    const norm = (x) => (x && x.question ? { ...x, options: normOpts(x.options) } : null);
    const keep = (x) => x && x.options.length >= 2;

    // The questions array can sit under "questions", be the top-level array, or
    // (rarely) under another key — take the first array of question-shaped items.
    const pickArray = (p) => {
      if (Array.isArray(p?.questions)) return p.questions;
      if (Array.isArray(p)) return p;
      if (p && typeof p === "object")
        for (const v of Object.values(p)) if (Array.isArray(v) && v.some((x) => x && x.question)) return v;
      return [];
    };

    let questions = pickArray(parsed).map(norm).filter(keep);
    // If the clean parse yielded nothing (truncated / malformed JSON), salvage
    // whatever complete question objects did come back rather than returning 0.
    if (questions.length === 0) questions = salvageQuestions(result.content).map(norm).filter(keep);

    if (questions.length === 0) {
      // Bake the actual reason into the message so a repeat failure is diagnosable
      // rather than opaque: empty reply vs. token-truncation vs. shape mismatch.
      const len = (result.content || "").length;
      const why =
        len === 0
          ? "model ne khaali jawab diya (model/balance check karo)"
          : result.finishReason === "length"
          ? "jawab token-limit pe kat gaya"
          : `jawab parse nahi hua (${len} chars, finish: ${result.finishReason || "?"})`;
      return Response.json(
        { error: `Similar generate nahi ho paye — ${why}. Dobara try karo.` },
        { status: 422 }
      );
    }

    const title =
      parsed?.title ||
      (result.content.match(/"title"\s*:\s*"([^"]+)"/) || [])[1] ||
      "Similar Practice";
    return Response.json({ title, questions });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
