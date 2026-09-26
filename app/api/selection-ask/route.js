import { deepseekChat } from "@/lib/deepseek";

// 💬 Site par kuch bhi select karke poochho.
//
// Isme jaan-boojh kar Settings WALA model chalta hai (sprint se ulta): yahan
// ek-do sawaal hote hain jinka jawab sahi chahiye, 100 call nahi. Reasoner
// (v4-pro / R1) ko sochne ke liye jagah bhi chahiye, warna uska jawab khaali
// aata hai — isliye uske liye token ki chhat badi hai.

const SYS = `Tum SSC CGL ke teacher ho. Student ne site par se kuch TEXT select kiya hai aur usi ke baare mein sawaal poochh raha hai.

Kaise jawab dena hai:
- Hinglish (Hindi + English, roman script) mein — simple, seedhi baat.
- Pehli line mein seedha jawab. Uske baad hi samjhao.
- Selected text se hi jude raho. Usme jawab na ho to apni jaankari se batao, par saaf likho ki "ye selected text mein nahi hai".
- MAATHS/REASONING: sabse tez tareeka do — kadam-dar-kadam, par chhota. Jahan trick lage wahan trick ka naam bhi.
- ENGLISH: rule ka naam pehle, phir example.
- GS: jawab ke saath ek-do aisi baat jo exam mein isi topic se poochhi ja sakti hai.
- Jo poochha gaya sirf wahi. Lambi bhoomika nahi, "ummeed hai samajh aaya" jaisa kuch nahi.
- Zaroorat ho to chhoti bullet list ya table theek hai.`;

const SUBJECTS = {
  math: "Quant / Maths",
  reasoning: "Reasoning",
  english: "English (grammar / vocab)",
  gs: "General Awareness / GS",
};

export async function POST(req) {
  try {
    const { selection, question, subject, history, apiKey, model, baseUrl } = await req.json();
    const q = String(question || "").trim();
    const sel = String(selection || "").trim();
    if (!q) return Response.json({ error: "Sawaal khaali hai." }, { status: 400 });

    let system = SYS;
    if (subject && SUBJECTS[subject]) {
      system = `Ye ${SUBJECTS[subject]} ka maamla hai — usi subject ke hisaab se jawab do.\n\n` + system;
    }

    // Selected text pehle sandesh mein jata hai, phir jitni baatcheet ho chuki
    // hai wo — isliye "iska matlab?" jaise chhote sawaal bhi samajh aate hain.
    const messages = [{ role: "system", content: system }];
    if (sel) {
      messages.push({ role: "user", content: `Maine ye text select kiya hai:\n\n"""\n${sel.slice(0, 6000)}\n"""` });
      messages.push({ role: "assistant", content: "Theek hai, isi par poochho." });
    }
    for (const m of Array.isArray(history) ? history.slice(-8) : []) {
      const role = m && m.role === "assistant" ? "assistant" : "user";
      const text = String((m && m.text) || "").trim();
      if (text) messages.push({ role, content: text.slice(0, 4000) });
    }
    messages.push({ role: "user", content: q });

    const isReasoner = String(model || "").includes("reasoner") || String(model || "").includes("pro");
    const result = await deepseekChat({
      apiKey,
      model,
      baseUrl,
      temperature: 0.2,
      maxTokens: isReasoner ? 8000 : 3000,
      messages,
    });

    if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
    const answer = String(result.content || "").trim();
    if (!answer) {
      return Response.json(
        { error: "Model ne khaali jawab diya (sochne mein saare token chale gaye). Dobara poochho, ya Settings mein deepseek-chat chuno." },
        { status: 502 },
      );
    }
    return Response.json({ answer });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
