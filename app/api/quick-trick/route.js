import { deepseekChat } from "@/lib/deepseek";

// ⚡ 40-second trick — stylus wale page ke liye.
//
// Poora solution nahi chahiye: sirf WO tareeka jisse YE question 40 second
// mein ho jaye. Isliye prompt chhota aur sakht hai — theory, derivation aur
// "concept samjhao" sab mana hai.
const PROMPT = `Tum SSC CGL ke maths/reasoning ke expert ho — wo wale jo exam mein 40 second mein question uda dete hain.

Neeche ek question hai (ya uska answer). Mujhe SIRF us question ki 40-SECOND WALI TRICK chahiye.

NIYAM (sakht):
- Poora jawab 80 SHABD se kam. Lamba jawab GALAT hai.
- Theory, derivation, "concept" — kuch nahi. Sirf wo raasta jo exam mein sabse tez hai.
- Agar options se ya approximation/elimination/unit-digit/digit-sum/ratio se jaldi ho jata hai, to WAHI batao.
- Number wahi lo jo question mein hain. Koi naya fact mat ghadho.
- Hinglish (Roman script), chhoti lines.

Bilkul is shakl mein do, aur kuch nahi:

⚡ TRICK
[1-3 line: kya karna hai, seedhe shabdon mein.]

🧮 40 SEC MEIN
[2-4 chhote step, har step ek line — asli numbers ke saath.]

✅ ANSWER
[sirf answer]`;

export async function POST(req) {
  try {
    const { question, options, answer, apiKey, model, baseUrl } = await req.json();
    const q = String(question || "").trim();
    if (!q) return Response.json({ error: "Question ka text nahi hai." }, { status: 400 });

    const opts = (options || []).filter(Boolean).map(String);
    const user = [
      "Question:",
      q,
      opts.length ? "Options: " + opts.map((o, i) => `${"ABCD"[i] || i + 1}) ${o}`).join("  ") : "",
      answer ? "\nIska poora answer (reference ke liye, isse trick nikaalo):\n" + String(answer).slice(0, 4000) : "",
    ].filter(Boolean).join("\n");

    const isReasoner = (model || "").includes("reasoner");
    const result = await deepseekChat({
      apiKey,
      model,
      baseUrl,
      temperature: 0.2,
      maxTokens: isReasoner ? 4000 : 700,
      messages: [
        { role: "system", content: PROMPT },
        { role: "user", content: user },
      ],
    });
    if (!result.ok) return Response.json({ error: result.error }, { status: result.status });

    const text = String(result.content || "").trim();
    if (!text) return Response.json({ error: "DeepSeek ne khali jawab diya." }, { status: 502 });
    return Response.json({ text });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
