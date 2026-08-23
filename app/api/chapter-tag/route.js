import { deepseekChat, parseJsonLoose } from "@/lib/deepseek";
import { geminiChat, geminiVision } from "@/lib/gemini";

// Question kis chapter ka hai — AI se.
//
// Do raaste, kyunki do tarah ke question hain:
//   * texts : jinke paas padhne layak text hai (notebook ka sawaal, ya mock ka
//     paste kiya hua Gemini answer). Ek call mein KAI question — chapter
//     batana chhota kaam hai, aur alag-alag call sirf paise aur waqt jalate.
//   * image : mock test ka screenshot, jismein text hai hi nahi. Iske liye
//     vision chahiye, aur wo ek baar mein ek hi question.
//
// Dono mein model ko chapter ki LIST di jaati hai aur usi mein se chunne ko
// kaha jata hai. Khula chhodne par wo "Mensuration (2D)", "mensuration-2d" aur
// "Area & Perimeter" teen alag naam de deta hai, aur report teen tukdon mein
// bat jaati hai. Na chun paye to khaali — wo question owner se poocha jayega,
// galat chapter mein daalne se behtar hai.

const guide = (chapters) => `You label SSC CGL exam questions with the chapter they belong to.

Allowed chapter ids (choose EXACTLY one of these strings, never invent a new one):
${chapters.join(", ")}

Rules:
- Pick the single chapter the question is actually testing.
- If the text is not a question, is unreadable, or you are not reasonably sure, return "" (empty string) for it. A wrong chapter is worse than none.
- Return ONLY JSON. No prose, no markdown fences.`;

const TEXT_SHAPE = `Return: {"tags":[{"id":"<the id you were given>","chapter":"<chapter id or empty string>"}]}
Include every id you were given, exactly once.`;

const IMG_SHAPE = `Return: {"chapter":"<chapter id or empty string>"}`;

function pick(chapter, allowed) {
  const c = String(chapter || "").trim().toLowerCase();
  if (!c) return "";
  if (allowed.includes(c)) return c;
  // Model kabhi-kabhi label lauta deta hai ("Time And Work") — usse slug bana
  // kar dobara dekh lo.
  const s = c.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return allowed.includes(s) ? s : "";
}

export async function POST(req) {
  try {
    const {
      chapters, texts, image,
      apiKey, model, baseUrl, geminiApiKey, geminiModel,
    } = await req.json();

    const allowed = (Array.isArray(chapters) ? chapters : []).map((c) => String(c).toLowerCase());
    if (!allowed.length) return Response.json({ error: "Chapter ki list nahi mili." }, { status: 400 });

    // ── screenshot: vision ────────────────────────────────────────────────
    if (image) {
      if (!geminiApiKey || !geminiApiKey.trim()) {
        return Response.json(
          { error: "Screenshot ka chapter Gemini se pata chalta hai — Settings mein Gemini key add karo." },
          { status: 400 },
        );
      }
      const g = await geminiVision({
        apiKey: geminiApiKey.trim(),
        model: geminiModel,
        system: `${guide(allowed)}\n${IMG_SHAPE}`,
        userText: "Is screenshot mein jo question hai wo kis chapter ka hai?",
        images: Array.isArray(image.images) ? image.images : [],
        temperature: 0,
      });
      if (!g.ok) return Response.json({ error: g.error }, { status: g.status || 502 });
      const j = parseJsonLoose(g.content) || {};
      return Response.json({ tags: [{ id: image.id, chapter: pick(j.chapter, allowed) }] });
    }

    // ── text: ek call mein poora jattha ───────────────────────────────────
    const rows = (Array.isArray(texts) ? texts : [])
      .map((t) => ({ id: String(t?.id || ""), text: String(t?.text || "").replace(/\s+/g, " ").trim().slice(0, 700) }))
      .filter((t) => t.id && t.text.length > 12);
    if (!rows.length) return Response.json({ tags: [] });

    const user = `Label each question below.\n\n${rows
      .map((r) => `id: ${r.id}\n${r.text}`)
      .join("\n---\n")}`;
    const system = `${guide(allowed)}\n${TEXT_SHAPE}`;

    // DeepSeek pehle — ye text ka kaam hai aur wahi is app ka rozmarra ka
    // model hai. Uski key na ho to Gemini se kaam chala lo.
    let content = "";
    if (apiKey && apiKey.trim()) {
      const d = await deepseekChat({
        apiKey, model, baseUrl,
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        temperature: 0,
        jsonMode: true,
      });
      if (!d.ok) return Response.json({ error: d.error }, { status: d.status || 502 });
      content = d.content;
    } else if (geminiApiKey && geminiApiKey.trim()) {
      const g = await geminiChat({
        apiKey: geminiApiKey.trim(),
        model: geminiModel,
        system,
        user,
        temperature: 0,
        responseMimeType: "application/json",
      });
      if (!g.ok) return Response.json({ error: g.error }, { status: g.status || 502 });
      content = g.content;
    } else {
      return Response.json({ error: "Settings mein DeepSeek ya Gemini key add karo." }, { status: 400 });
    }

    const j = parseJsonLoose(content) || {};
    const out = Array.isArray(j.tags) ? j.tags : [];
    const known = new Set(rows.map((r) => r.id));
    return Response.json({
      tags: out
        .filter((t) => known.has(String(t?.id)))
        .map((t) => ({ id: String(t.id), chapter: pick(t.chapter, allowed) })),
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
