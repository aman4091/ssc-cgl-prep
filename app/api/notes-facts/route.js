import { deepseekChat } from "@/lib/deepseek";

// 🐋 Notes ka page -> SSC ke kaam ke facts.
//
// Owner ka apna prompt, jaisa unhone diya waisa hi. Kuch aur nahi maangna:
// na kahani, na trick — sirf wahi jo page par likha hai, ek-do line ke fact
// mein, aur jo cheezein aapas mein confuse hoti hain wo alag.
//
// Jawab ki shakl fix hai (TOPIC / FACTS / CONFUSION), kyunki site usi shakl
// se fact log wala button banati hai (lib/notesfacts.js).
const PROMPT = `Tum SSC CGL Tier-1 ke GK expert ho. Neeche Parmar Sir ke notes ka ek page hai.
Is page se SIRF wo cheezein nikalo jo SSC CGL mein poochi ja sakti hain.

NIYAM:
1. Sirf page par likhi baatein lo. Apni taraf se kuch mat jodo, koi kahani ya
   trick mat banao.
2. Har fact aasaan Hinglish mein, 1-2 line ka ho. Ek hi cheez ki saari baatein
   (naam, saal, jagah, kya hota hai) usi ek fact mein saath likho.
   Jaise: "Perupalem Beach Festival 2020 mein shuru hua, 2 din chalta hai
   (Mogalthur, West Godavari). Yahan beach volleyball aur Burrakatha hota hai."
3. Naam, saal, number, jagah bilkul waise hi likho jaise page par hain.
4. Lambi explanation aur faltu background chhod do.
5. Jo cheezein aapas mein confuse hoti hain, unhe alag "CONFUSION" hisse mein
   ek line mein farak ke saath likho.
6. Jo fact SSC mein aa chuka hai ya aane layak hai, uske aage ⭐ lagao.

OUTPUT (bas ye, aur kuch nahi):

TOPIC: <page ka topic>

FACTS:
⭐ FACT: ...
FACT: ...

CONFUSION:
A vs B — farak`;

export async function POST(req) {
  try {
    const { text, topic, apiKey, model, baseUrl } = await req.json();
    const body = String(text || "").trim();
    if (!body) return Response.json({ error: "Page khaali hai." }, { status: 400 });

    const isReasoner = (model || "").includes("reasoner");
    const result = await deepseekChat({
      apiKey,
      model,
      baseUrl,
      temperature: 0.2,      // facts hain, kalpana nahi
      maxTokens: isReasoner ? 8000 : 3000,
      messages: [
        { role: "system", content: PROMPT },
        {
          role: "user",
          content: (topic ? `Page ka topic: ${topic}\n\n` : "") + `NOTES PAGE:\n${body}`,
        },
      ],
    });
    if (!result.ok) return Response.json({ error: result.error }, { status: result.status });

    const out = String(result.content || "").trim();
    if (!out) return Response.json({ error: "DeepSeek ne khali jawab diya." }, { status: 502 });
    return Response.json({ text: out });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
