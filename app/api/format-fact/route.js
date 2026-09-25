import { deepseekChat } from "@/lib/deepseek";

// 🧹 Fact log ka cluster PADHNE LAYAK banana — aur bas itna.
//
// Owner ne revision card ka screenshot bhej kar kaha: "padhne layak aa hi
// nahi rha hai … deepseek ka use kar formatting ke liye, bas formatting ke
// liye, aur kahi nahi". Jo cluster AI ne ek chipke hue paragraph mein de
// diya (do-teen lakeeron ka deewar), wo revision mein aankh se nikal hi
// nahi pata.
//
// Isliye ye route SIRF shakl badalta hai:
//   • ek bhi fact jodna, hatana ya badalna mana hai
//   • koi heading, bhoomika, summary, trick — kuch nahi
//   • har fact apni alag line par, shuru mein uska naam, phir " – "
//
// "Naam – baat" wali shakl jaan-boojh kar hai: revision card (Recall ka
// answerPoints) usi se har line ko alag point banata hai aur naam ko bold
// kar deta hai. Yahi wo "sahi dhang se dikhna" hai.
//
// Ek baar bana kar fact ke saath save ho jata hai (lib/missionfacts ka
// `fmt`), isliye ek cluster par ye kaam — aur uske paise — sirf EK BAAR.
const PROMPT = `Tum ek FORMATTER ho. Tumhara kaam sirf shakl sudharna hai.

SAKHT NIYAM:
1. Neeche jo likha hai usme se ek bhi fact mat hatao, mat badlo, aur apni
   taraf se ek bhi naya fact mat jodo. Naam, saal, number, jagah, bracket
   ka matlab — sab hubahu wahi rehna chahiye.
2. Ek bhi shabd ka arth mat badlo. Shak ho to jaisa hai waisa hi rakho.
3. Koi heading, koi bhoomika, koi summary, koi trick, koi "yaad rakho" —
   kuch NAHI. Sirf line-dar-line facts.

SHAKL:
- Har alag fact apni ALAG LINE par.
- Line aise: <naam ya cheez> – <uski baat>
  Jaise: Sulphuric acid – King of Chemicals; fertilizer, plastics, dyes
- Ek hi cheez ki saari baatein usi ek line mein rakho, alag-alag mat todo.
- Line ki shuruat mein koi bullet, dash ya number mat lagao — seedha naam.
- Jitne fact hain utni hi line. Khali line mat do.

Sirf ye lines lautao, aur kuch nahi.`;

// 💰 Kharche ki kataai — owner: "api calls hone de pr jyede na khaaye".
//
//  • Model yahan JAAN-BOOJH kar "deepseek-chat" — Settings ka nahi.
//    Naapa hua farak: owner ka chuna hua model (deepseek-v4-pro) isi chhote
//    se kaam par 734 SOCHNE ke token jala deta hai — 941 token kul. Wahi
//    kaam deepseek-chat 131 token mein kar deta hai (0 sochne ke token).
//    Shakl sudharne mein sochne ko kuch hai hi nahi, isliye 7 guna kharcha
//    bekaar tha. Baaki har jagah Settings ka model waise ka waisa chalta
//    hai — ye chhoot sirf is ek route ki hai.
//  • Bhejne ki hadd 2000 akshar (ek cluster itna hota hi nahi; isse bada
//    aaya to kuch aur hai).
//  • Lautne ki hadd 600 token — saaf ki hui shakl input se chhoti hi hoti
//    hai, isliye isse zyada ka matlab hai AI bhatak gaya.
const FORMAT_MODEL = "deepseek-chat";   // bina soche wala, sasta
const MAX_IN = 2000;
const MAX_OUT = 600;

export async function POST(req) {
  try {
    const { text, apiKey, baseUrl } = await req.json();
    const body = String(text || "").trim();
    if (!body) return Response.json({ error: "Kuch hai hi nahi." }, { status: 400 });
    if (body.length > MAX_IN) {
      return Response.json({ error: `Bahut lamba hai (${body.length} akshar) — ${MAX_IN} tak hi.` }, { status: 400 });
    }

    const result = await deepseekChat({
      apiKey,
      model: FORMAT_MODEL,
      baseUrl,
      temperature: 0,          // shakl ka kaam hai, kalpana ka nahi
      maxTokens: MAX_OUT,
      messages: [
        { role: "system", content: PROMPT },
        { role: "user", content: body },
      ],
    });
    if (!result.ok) return Response.json({ error: result.error }, { status: result.status });

    const out = String(result.content || "")
      .replace(/^\s*(?:[-*•]|\d+[.)])\s+/gm, "")   // bullet laga diya ho to hata do
      .replace(/^#{1,6}\s*.*$/gm, "")              // heading bhi
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .join("\n")
      .trim();
    if (!out) return Response.json({ error: "DeepSeek ne khali jawab diya." }, { status: 502 });
    return Response.json({ text: out });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
