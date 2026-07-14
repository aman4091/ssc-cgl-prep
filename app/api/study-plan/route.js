import { geminiChat } from "@/lib/gemini";
import { parseJsonLoose } from "@/lib/deepseek";

// Ruthless SSC CGL Tier-1 coach that outputs a concrete, resource-linked study
// plan as STRICT JSON. It only references resources present in the catalog it is
// given (mock/sectional categories, vocab days, subjects/chapters, CA buckets).
const SYSTEM = `You are a RUTHLESS, professional SSC CGL Tier-1 coach building a day-by-day plan for a student.
Your job: maximise their Tier-1 (Pre) marks in the days left. Be strict, specific and demanding — like a top coaching mentor who accepts no excuses. Write all human-readable text (theme, coachNote, task title/detail) in friendly Hinglish (Hindi+English in roman script). Push the student on their WEAK sections hardest, but keep strong sections warm.

OUTPUT: return ONLY a JSON object (no markdown, no prose outside JSON) with this exact shape:
{
  "macro": [ { "weekLabel": "Week 1 (Day 1-7)", "phase": "Foundation | Practice | Mock-blitz | Revision", "focus": "short Hinglish focus", "targetScore": "e.g. 150+" } ],
  "days": {
    "<planDayNumber>": {
      "theme": "short Hinglish theme for the day",
      "coachNote": "1-2 line strict Hinglish push for the day",
      "tasks": [
        { "kind": "mock|sectional|topic|vocab|theory|ca|calc|revision|custom",
          "title": "short Hinglish title",
          "detail": "1 line what/why (Hinglish)",
          "durationMin": <integer minutes>,
          "priority": <1=do first, higher=later>,
          "ref": { ...see below } }
      ]
    }
  },
  "coachNote": "one overall strict Hinglish message"
}

REF by kind (use ONLY categories/values that appear in the catalog):
- mock / sectional: { "category": "<exact category string from catalog.mocks>" }
- topic: { "category": "<exact category from catalog.topics>" }
- vocab: { "day": <int, start at catalog.vocab.startFromDay and increase over days>, "type": "ows|idiom|vocab" (optional; omit = all types) }
- theory: { "subject": "english|math|gs|reasoning", "chapter": "<a name from that subject's suggested/yourChapters>" }
- ca: { "bucket": "daily|weekly|monthly|yearly" }
- calc: { "count": <int>, "sec": <int seconds per q> }
- revision / custom: { "url": "<optional internal path>" }

RULES:
- Respect the student's daily study hours: total task durationMin per day must fit hoursWeekday/hoursWeekend (roughly). Don't overload.
- Sequence sensibly: theory before its practice; build vocab day-by-day; daily CA; regular mocks with a heavier mock-blitz in the last ~10 days; insert 'revision' (Mistake Notebook / previous vocab) every few days.
- Only schedule mocks/sectionals from categories with remaining > 0 in the catalog.
- Every day needs at least 2-3 non-negotiable tasks even on low-hour days.
- Number days with ABSOLUTE plan-day numbers as requested (fromDayIndex..fromDayIndex+numDays-1).`;

export async function POST(req) {
  try {
    const body = await req.json();
    const { mode, geminiApiKey, geminiModel } = body;
    if (!geminiApiKey || !geminiApiKey.trim()) {
      return Response.json({ error: "Gemini API key chahiye — Settings mein daalo." }, { status: 400 });
    }

    const payload = {
      mode,
      examDate: body.examDate,
      daysLeft: body.daysLeft,
      totalPlanDays: body.totalPlanDays,
      fromDayIndex: body.fromDayIndex || 1,
      numDays: body.numDays || 3,
      profile: body.profile || {},
      catalog: body.catalog || {},
      history: body.history || [],   // recent days: {dayNumber, done:[titles], missed:[titles]}
      metrics: body.metrics || {},   // { mockScores:[...], weakAccuracy:{...} }
    };

    const user =
      (mode === "full"
        ? `Build the FULL plan. First return a weekly "macro" skeleton covering all ${payload.totalPlanDays} days, then concrete "days" for plan-day numbers ${payload.fromDayIndex}..${payload.fromDayIndex + payload.numDays - 1}.`
        : `RE-PLAN. Keep what's working, fix what's not. Return concrete "days" for plan-day numbers ${payload.fromDayIndex}..${payload.fromDayIndex + payload.numDays - 1} (macro optional). Use the history (missed tasks must be re-scheduled) and metrics (push weak sections shown by low mock scores/accuracy).`) +
      `\n\nDATA:\n` + JSON.stringify(payload);

    const g = await geminiChat({
      apiKey: geminiApiKey.trim(),
      model: geminiModel,
      system: SYSTEM,
      user,
      temperature: 0.3,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
    });
    if (!g.ok) return Response.json({ error: g.error }, { status: g.status || 502 });
    if (!g.content) return Response.json({ error: "Gemini ne khaali jawab diya — model id check karo." }, { status: 502 });

    const parsed = parseJsonLoose(g.content);
    if (!parsed || typeof parsed !== "object") {
      return Response.json({ error: "Plan parse nahi hua. Dobara try karo." }, { status: 502 });
    }
    return Response.json({ macro: parsed.macro || null, days: parsed.days || {}, coachNote: parsed.coachNote || "" });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
