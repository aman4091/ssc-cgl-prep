import { deepseekChat } from "@/lib/deepseek";

// 🧩 Notes ka page -> JODI MILAO ki jodiyan (Bharat Sanskriti page par sets).
//
// Har jodi ek line: BAAYEN || DAAYEN || explanation. Baayen = naam/cheez,
// daayen = uska jawab (rajya, devta, saal, vyakti, jagah…). Ek page se
// jitni SSC wali jodi bane — 5 ke set mein khelte hain, isliye 5 ke gunak
// mein koshish.
const PROMPT = `Tum SSC CGL Tier-1 ke GK expert ho. Neeche Parmar Sir ke notes ka ek page hai.
Is page se "MATCH THE FOLLOWING" ki jodiyan banao — SSC CGL mein jo poochha ja sakta hai.

NIYAM:
1. Sirf page par likhi baaton se. Apni taraf se kuch mat jodo.
2. Har jodi: BAAYEN = ek naam / cheez (dance, tyohar, janjati, vyakti, kitaab, sanstha…),
   DAAYEN = uska ek chhota pakka jawab (rajya, devta, saal, jagah, vyakti, khaasiyat).
   DAAYEN chhota ho (1-6 shabd). Ek hi page mein do jodiyon ka DAAYEN bilkul same na ho
   to behtar — alag cheez ka jawab chuno (jaise ek ka rajya, doosre ka devta/saal).
3. Chhoti-chhoti baatein bhi lo (saal, guinness record, kaun sa samudaay, kis mahine).
4. Jitni ban sakein utni — 5, 10, 15… (5 ke gunak mein ho to achha). Kam se kam 5.
5. Explanation 1 line Hinglish mein, page ke hisaab se.

OUTPUT — sirf lines, aur kuch nahi:
BAAYEN || DAAYEN || explanation`;

export async function POST(req) {
  try {
    const { text, topic, apiKey, model, baseUrl } = await req.json();
    const body = String(text || "").trim();
    if (!body) return Response.json({ error: "Page khaali hai." }, { status: 400 });
    const isReasoner = (model || "").includes("reasoner");
    const result = await deepseekChat({
      apiKey, model, baseUrl,
      temperature: 0.2,
      maxTokens: isReasoner ? 8000 : 3000,
      messages: [
        { role: "system", content: PROMPT },
        { role: "user", content: (topic ? `Page ka topic: ${topic}\n\n` : "") + `NOTES PAGE:\n${body}` },
      ],
    });
    if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
    const pairs = String(result.content || "").split(/\r?\n/)
      .map((l) => l.replace(/^\s*[-*\d.)]+\s*/, "").split("||").map((x) => x.replace(/\*\*/g, "").trim()))
      .filter((a) => a.length >= 2 && a[0] && a[1] && a[0].length < 120 && a[1].length < 120)
      .map(([l, r, note]) => ({ l, r, note: note || "" }));
    if (pairs.length < 2) return Response.json({ error: "DeepSeek se jodiyan nahi bani — dobara try karo." }, { status: 502 });
    return Response.json({ pairs });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
