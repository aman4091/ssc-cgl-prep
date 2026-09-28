import { deepseekChat, parseJsonLoose } from "@/lib/deepseek";

// 🧩 Notes ka page -> JODI MILAO ki jodiyan (notes page ka 🧩 popup).
//
// Har jodi: BAAYEN = naam/cheez, DAAYEN = uska jawab (rajya, devta, saal,
// vyakti, jagah…). Ek page se jitni SSC wali jodi bane — 5 ke set mein
// khelte hain, isliye 5 ke gunak mein koshish.
const PROMPT = `Tum SSC CGL Tier-1 ke GK expert ho. Neeche Parmar Sir ke notes ka ek page hai.
Is page se "MATCH THE FOLLOWING" ki jodiyan banao — SSC CGL mein jo poochha ja sakta hai.

NIYAM:
1. Sirf page par likhi baaton se. Apni taraf se kuch mat jodo.
2. Har jodi: l = ek naam / cheez (dance, tyohar, janjati, vyakti, kitaab, sanstha…),
   r = uska ek chhota pakka jawab (rajya, devta, saal, jagah, vyakti, khaasiyat).
   r chhota ho (1-6 shabd). Ek hi page mein do jodiyon ka r bilkul same na ho
   to behtar — alag cheez ka jawab chuno (jaise ek ka rajya, doosre ka devta/saal).
3. Chhoti-chhoti baatein bhi lo (saal, guinness record, kaun sa samudaay, kis mahine).
4. Jitni ban sakein utni — 5, 10, 15… (5 ke gunak mein ho to achha). Kam se kam 5.
5. note = 1 line Hinglish explanation, page ke hisaab se.

OUTPUT — sirf JSON, aur kuch nahi:
{"pairs":[{"l":"Bihu","r":"Assam","note":"Assam ka fasal tyohar ka nritya"}]}`;

// Model kabhi JSON deta hai, kabhi lines / markdown table / "A → B" — sab padh lo.
const clean = (x) => String(x ?? "").replace(/\*\*/g, "").replace(/^[\s"'`]+|[\s"'`,]+$/g, "").trim();

function parsePairs(content) {
  const raw = String(content || "");
  const out = [];
  const j = parseJsonLoose(raw.replace(/```(?:json)?/g, ""));
  const arr = Array.isArray(j) ? j : j && (j.pairs || j.jodiyan || Object.values(j).find(Array.isArray));
  if (Array.isArray(arr)) {
    for (const x of arr) {
      if (Array.isArray(x)) out.push({ l: clean(x[0]), r: clean(x[1]), note: clean(x[2]) });
      else if (x && typeof x === "object") {
        const v = Object.values(x);
        out.push({
          l: clean(x.l ?? x.left ?? x.baayen ?? v[0]),
          r: clean(x.r ?? x.right ?? x.daayen ?? v[1]),
          note: clean(x.note ?? x.explanation ?? v[2]),
        });
      }
    }
  }
  if (out.length < 2) {
    for (const line of raw.split(/\r?\n/)) {
      if (/^\s*\|?\s*:?-{3,}/.test(line)) continue; // table ki --- line
      const t = line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").replace(/^\s*\|/, "").replace(/\|\s*$/, "");
      const a = t.includes("||") ? t.split("||") : t.includes("|") ? t.split("|") : t.split(/\s*(?:→|->|=>|—|:)\s*/);
      if (a.length >= 2) out.push({ l: clean(a[0]), r: clean(a[1]), note: clean(a.slice(2).join(" — ")) });
    }
  }
  const seen = new Set();
  return out.filter((p) => {
    if (!p.l || !p.r || p.l.length > 160 || p.r.length > 160 || /^(baayen|left|l|naam)$/i.test(p.l)) return false;
    const k = p.l.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export async function POST(req) {
  try {
    const { text, topic, apiKey, model, baseUrl } = await req.json();
    const body = String(text || "").trim();
    if (!body) return Response.json({ error: "Page khaali hai." }, { status: 400 });
    const isReasoner = (model || "").includes("reasoner");
    let pairs = [];
    let last = "";
    // Ek baar kam bani to apne aap doosri koshish.
    for (let tryNo = 0; tryNo < 2 && pairs.length < 2; tryNo++) {
      const result = await deepseekChat({
        apiKey, model, baseUrl,
        temperature: tryNo ? 0.4 : 0.2,
        jsonMode: true,
        maxTokens: isReasoner ? 8000 : 4000,
        messages: [
          { role: "system", content: PROMPT },
          { role: "user", content: (topic ? `Page ka topic: ${topic}\n\n` : "") + `NOTES PAGE:\n${body.slice(0, 14000)}` },
        ],
      });
      if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
      last = result.content || "";
      pairs = parsePairs(last);
    }
    if (pairs.length < 2) {
      return Response.json(
        { error: `DeepSeek se jodiyan nahi bani — dobara try karo. (Jawab: ${last.slice(0, 120) || "khaali"})` },
        { status: 502 },
      );
    }
    return Response.json({ pairs });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
