import { geminiVision } from "@/lib/gemini";

// Plain OCR via Gemini vision — reads ALL text from an image (handwriting,
// two-column layouts, tables, math) far more reliably than tesseract. Returns
// raw text so the Ask box can then solve/explain it. Used only when Gemini is ON.
const PROMPT = `You are an OCR engine. Read EVERYTHING written in the image(s) and output it as clean plain text.
- Preserve the natural reading order and line breaks.
- Keep options/choices (A, B, C, D / 1,2,3,4) on their own lines.
- Transcribe math and symbols faithfully as plain text (e.g. x^2, √, ÷, ×, %).
- Do NOT solve, explain, translate, or add anything — output ONLY the text that is visibly present.
- If the image has no readable text, output an empty string.`;

export async function POST(req) {
  try {
    const { images, geminiApiKey, geminiModel } = await req.json();
    if (!geminiApiKey || !geminiApiKey.trim())
      return Response.json({ error: "Gemini OCR ke liye Settings mein Gemini API key add karo." }, { status: 400 });
    if (!Array.isArray(images) || images.length === 0)
      return Response.json({ error: "Koi image nahi mili." }, { status: 400 });

    const g = await geminiVision({
      apiKey: geminiApiKey.trim(),
      model: geminiModel,
      system: PROMPT,
      userText: "Is image ka saara text plain text mein padho. Kuch solve mat karo — sirf jo likha hai wahi do.",
      images,
      temperature: 0,
      responseMimeType: "text/plain",
    });

    if (!g.ok) return Response.json({ error: g.error }, { status: g.status || 502 });
    return Response.json({ text: (g.content || "").trim() });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
