import { deepseekChat } from "@/lib/deepseek";

// ⚡ Sprint ka jawab — ek question, CHHOTA jawab.
//
// Sprint mein ek question par 30 second hain, aur ek baar mein 100 call jaate
// hain. Isliye yahan /api/ask wala lamba tutor-prompt NAHI chalta:
//
//   • Model hamesha deepseek-chat — Settings mein reasoner (v4-pro / R1) pada
//     ho to wo soch-vichar mein hi 900+ token kha jata hai. 100 question par
//     wo kharcha bewajah hai, aur jawab bhi lamba aata hai jo 30 second mein
//     padha hi nahi jayega.
//   • max_tokens 450 — jawab teen line ka hi chahiye.
//   • Sahi option BOOK se bheja jata hai, taaki jawab usse ulta na ho.

const SPRINT_PROMPT = `Tum SSC CGL ke teacher ho. Student ko ye jawab 30 SECOND mein padhna hai, isliye chhota aur kaam ka likho.

Bilkul is dhaanche mein likho, isse zyada kuch nahi:

**✅ Answer:** <sahi option ka text>
**Kyun:** <2-3 chhoti line>
**⚡ Yaad rakho:** <ek line — trick, rule, ya yaad rakhne wali baat>

Niyam:
- Hinglish (Hindi + English, roman script) mein likho.
- MAATHS/REASONING: "Kyun" mein sabse tez tareeka do — lambi calculation nahi, bas wo kadam jisse seconds mein ho jaye.
- ENGLISH: "Kyun" ki pehli line mein grammar RULE ka naam do (subject-verb agreement, article, preposition, tense…), phir ye option kyun sahi hai.
- GS: "Kyun" mein sahi jawab ke saath ek aisi baat jo exam mein isi topic se poochhi ja sakti hai.
- 120 shabd se zyada mat likho. Koi bullet list nahi, koi bhoomika nahi.
- Tumhe sahi option bata diya gaya hai — usi ko sahi maan kar samjhao. Agar wo saaf galat lage, tabhi "⚠️ book ka answer shak wala lagta hai" ek line mein likh dena.`;

export async function POST(req) {
  try {
    const { question, options, correct, subject, apiKey, baseUrl } = await req.json();
    const q = String(question || "").trim();
    if (!q) return Response.json({ error: "Question is empty." }, { status: 400 });

    const opts = Array.isArray(options) ? options : [];
    const lines = [q];
    if (opts.length) {
      lines.push("");
      opts.forEach((o, i) => lines.push(`${"ABCD"[i] || i + 1}) ${o}`));
    }
    if (correct) lines.push("", `Book ke hisaab se sahi option: ${correct}`);
    if (subject) lines.push(`Subject: ${subject}`);

    const result = await deepseekChat({
      apiKey,
      // Jaan-boojh kar Settings ka model nahi — upar wali tippani dekho.
      model: "deepseek-chat",
      baseUrl,
      temperature: 0.2,
      maxTokens: 450,
      messages: [
        { role: "system", content: SPRINT_PROMPT },
        { role: "user", content: lines.join("\n") },
      ],
    });

    if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
    const answer = String(result.content || "").trim();
    if (!answer) return Response.json({ error: "Model ne khaali jawab diya." }, { status: 502 });
    return Response.json({ answer });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
