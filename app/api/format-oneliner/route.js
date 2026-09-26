import { deepseekChat } from "@/lib/deepseek";

// 🐋 One-liner notes ko sirf SHAKL deta hai — ek bhi baat badle bina.
//
// Owner ki shikayat saaf thi: "Art 59 (Conditions…) — inn cheezon ko bold
// mein kaun karega?" AI se aaye notes mein wo shabd plain pade rehte hain
// jinpe nazar pehle padni chahiye. Ye route wahi karta hai: Article number,
// saal, naam, jagah, sankhya aur rule ka naam **bold** kar deta hai.
//
// Yahan model hamesha deepseek-chat hai (Settings ka reasoner nahi): ye
// sochne ka kaam hai hi nahi, sirf nishaan lagane ka — aur wo sasta hai.

const PROMPT = `Tum sirf FORMATTER ho. Tumhe SSC ke one-liner notes diye jayenge. Tumhara ek hi kaam hai: unhe padhne layak banana. Content bilkul mat badlo.

Pakke niyam:
1. Ek bhi fact mat badlo, mat jodo, mat hatao. Shabd wahi rakho jo diye gaye hain.
2. Point ki ginti aur unka kram wahi rehna chahiye. Numbering wahi.
3. Heading (jo poori line do-star ke beech hai) ko BILKUL mat chhuo — uske andar kuch bold mat karo, ek akshar mat badlo.
4. ⭐ jahan laga hai wahin laga rehne do. Naya ⭐ mat lagao.
5. "⚠️ Confusion:" wala hissa sabse aakhir mein waise hi rakho.

Sirf itna karna hai: har point ke andar wo shabd **bold** kar do jinpe nazar pehle padni chahiye —
- Article / Section ka number (jaise **Art 58**)
- saal aur tareekh (jaise **1757**)
- vyakti, jagah aur sanstha ke naam (jaise **Dr. Rajendra Prasad**)
- sankhya aur seemaayein (jaise **35 years**, **1/4 members**)
- rule ya concept ka naam (jaise **Office of Profit**)

Ek point mein 2-3 se zyada cheezein bold mat karo — sab bold ka matlab kuch bhi bold nahi.

Jawab mein SIRF sudhre hue notes do. Koi bhoomika nahi, koi "yeh raha" nahi, koi code block nahi.`;

export async function POST(req) {
  try {
    const { text, apiKey, baseUrl } = await req.json();
    const body = String(text || "").trim();
    if (!body) return Response.json({ error: "Text khali hai." }, { status: 400 });
    if (body.length > 8000) return Response.json({ error: "Note bahut lamba hai (8000 akshar se zyada)." }, { status: 400 });

    const result = await deepseekChat({
      apiKey,
      model: "deepseek-chat",
      baseUrl,
      temperature: 0,
      // Jawab input jitna hi lamba hoga — thodi jagah zyada.
      maxTokens: Math.min(4000, Math.ceil(body.length / 2) + 800),
      messages: [
        { role: "system", content: PROMPT },
        { role: "user", content: body },
      ],
    });

    if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
    let out = String(result.content || "").trim();
    // Kabhi-kabhi poora jawab ek code block mein lapet deta hai.
    out = out.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/, "").trim();
    if (!out) return Response.json({ error: "Model ne khaali jawab diya." }, { status: 502 });
    return Response.json({ text: out });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
