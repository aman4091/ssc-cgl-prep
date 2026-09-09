import { deepseekChat, parseJsonLoose } from "@/lib/deepseek";

// Vocab overlay ki patti ke liye chhota matlab.
//
// Overlay par sirf ek word aur uske neeche do line ki jagah hai — wahan lamba
// samjhaya hua jawab kaam nahi aata. Isliye yahan se sirf itna maanga jata
// hai: kya hai, aur ek chhota sa istemal, Hinglish mein — taaki ek nazar
// mein baith jaye.
//
// Ek hi call mein bahut saare word, kyunki ye background mein chalta hai aur
// har word par alag call karna na sasta hai na tez.
const PROMPT = `You write ultra-short vocabulary notes for an Indian SSC-CGL aspirant.

For EACH term you are given, write its meaning in HINGLISH (Roman script Hindi mixed with English) in AT MOST 2 short lines.

Style:
- Line 1: the meaning, plainly. Start directly with the meaning, never repeat the term.
- Line 2 (optional): a tiny example or a hook that makes it stick.
- Keep the whole thing under 160 characters. Short is the point.
- Hinglish, Roman script only. No Devanagari. No markdown, no bullets, no quotes.

A term may come with a reference meaning after a "|". That reference is the
truth — say the same thing in Hinglish, shorter and stickier. Do not invent a
different meaning, and do not put the "|" part in the key.

Return STRICT JSON only:
{ "lines": { "<the term itself>": "meaning line 1\\nline 2" } }

Every term you were given must appear as a key, spelled exactly as given.`;

export async function POST(req) {
  try {
    const { words, items, apiKey, model, baseUrl } = await req.json();
    // Do shakl chalti hain: sirf word ki list, ya {w, hint} — hint us word ki
    // apni definition hoti hai (OWS/idiom ke paas hoti hai), jisse AI apne
    // aap se matlab na gadhe.
    const src = Array.isArray(items) ? items : (Array.isArray(words) ? words : []);
    const list = src
      .map((x) => (typeof x === "string"
        ? { w: x.trim(), hint: "" }
        : { w: String(x?.w || "").trim(), hint: String(x?.hint || "").trim() }))
      .filter((x) => x.w)
      .slice(0, 40);
    if (!list.length) return Response.json({ lines: {} });

    const result = await deepseekChat({
      apiKey,
      model,
      baseUrl,
      temperature: 0.3,
      jsonMode: true,
      maxTokens: 4000,
      messages: [
        { role: "system", content: PROMPT },
        {
          role: "user",
          content: list.map((x) => (x.hint ? `${x.w} | ${x.hint}` : x.w)).join("\n"),
        },
      ],
    });

    if (!result.ok) return Response.json({ error: result.error }, { status: result.status });

    const parsed = parseJsonLoose(result.content);
    const raw = parsed?.lines && typeof parsed.lines === "object" ? parsed.lines : {};
    // Key ko sakhti se nahi milate.
    //
    // Maanga to yahi tha ki term hubahu wapas aaye, par model kabhi hint wala
    // hissa bhi key mein chipka deta hai ("Accede | To agree…"), kabhi case ya
    // spacing badal deta hai. Sakht milaan par aisa poora batch chupchaap gir
    // jata — isliye dono taraf ko saada karke milate hain.
    const norm = (x) => String(x).split("|")[0].trim().toLowerCase().replace(/\s+/g, " ");
    const byNorm = new Map(list.map((x) => [norm(x.w), x.w]));
    const lines = {};
    for (const [key, val] of Object.entries(raw)) {
      const w = byNorm.get(norm(key));
      if (!w) continue;
      // Do line se zyada aaye to baaki chhod do — patti par utni hi jagah hai.
      const v = String(val || "").trim();
      if (v) lines[w] = v.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 2).join("\n");
    }
    return Response.json({ lines });
  } catch (e) {
    return Response.json({ error: e.message || "failed" }, { status: 500 });
  }
}
