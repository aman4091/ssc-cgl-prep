"use client";

// 🎬 Home = Reels. Ek screen par ek cheez, upar swipe (ya ↓) = agli.
// Mila-jula aata rehta hai, bina kuch chune:
//   📝 PYQ (Maths/Reasoning/English/GS — bank ka koi random chapter)
//   🐢 Maths 40+ (Skip drill mein jo 40 sec mein nahi hue)
//   🔴 Mistake Notebook
//   🪔 Bharat Sanskriti jodi (4 mein se rajya chuno)
//   🔤 Vocab (4 mein se matlab)
//   🧠 Fact log
// Tap/option dabao → jawab khule. Neeche aate-aate aur reel judti jaati hain.

import { useCallback, useEffect, useRef, useState } from "react";
import Markdown from "@/components/Markdown";
import { ALL_SUBJECTS, sourcesFor, partsOf, loadOnePart } from "@/lib/allbank";
import { getO40 } from "@/lib/mathdrill";
import { getWrongBook, isPracticeable, subjectLabel, imagesOf, shownDetail } from "@/lib/wrongbook";
import { useImageUrls } from "@/lib/wrongimages";
import { getUserTopics, getUserTopicQuestions, shelfBook, getUserBook } from "@/lib/userpyq";
import { vocabPool } from "@/lib/vocabpool";
import { getFacts, factView } from "@/lib/missionfacts";
import "./reels.css";
import PyqSplit from "@/components/PyqSplit";

const LETTER = ["A", "B", "C", "D", "E"];

// 🔁 Galat hui reel 50 reel baad wapas. Line is device + sync (cgl.*) mein
// bachti hai, taaki Home band karke kholne par bhi yaad rahe.
const RETRY_KEY = "cgl.reels.retry";
const RETRY_GAP = 50;
const readRetry = () => { try { const v = JSON.parse(localStorage.getItem(RETRY_KEY) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; } };
const writeRetry = (v) => { try { localStorage.setItem(RETRY_KEY, JSON.stringify(v.slice(-300))); } catch { /* quota */ } };
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const clip = (s, n) => { const t = String(s || "").replace(/\s+/g, " ").trim(); return t.length > n ? t.slice(0, n - 1) + "…" : t; };

// 4 option: sahi + 3 alag galat (same pool se). Laut-ta { options, answer }.
function mcq(right, pool) {
  const wrong = shuffle(pool.filter((x) => x && x !== right)).filter((x, i, a) => a.indexOf(x) === i).slice(0, 3);
  const options = shuffle([right, ...wrong]);
  return { options, answer: options.indexOf(right) };
}

// ── pool bharna ──────────────────────────────────────────────────────────
// PYQ ek-ek random chapter karke — poora bank ek saath utaarna Home ke liye
// bhaari hai.
async function randomPart(slug) {
  const srcs = sourcesFor(slug);
  if (!srcs.length) return [];
  const src = pick(srcs);
  // English ke Cloze test / RC (comprehension) Home par nahi — passage ke bina
  // unka sawaal adhoora hai (owner).
  const RC = /cloze|comprehension|reading|passage|\brc\b/i;
  const parts = (await partsOf(slug, src.id)).filter((p) => (p.count || 0) > 0 && !RC.test(`${p.slug || ""} ${p.label || ""}`));
  if (!parts.length) return [];
  const qs = await loadOnePart(slug, src.id, pick(parts).slug);
  return qs.filter((q) => !q.passage && !RC.test(String(q._chapter || "")) && (q.question || q.qText || q.qImg) && ((q.options || q.optText || []).length >= 2 || q.optImgs) && q.answer != null);
}

function toQ(q, kind, tag) {
  return {
    kind, tag,
    question: q.question || q.qText || "",
    options: q.options || q.optText || [],
    answer: q.answer,
    qImg: q.qImg || "", figImg: q.img || "", optImgs: Array.isArray(q.optImgs) ? q.optImgs : null,
    explanation: String(q.explanation || q.solution || ""),
    solImg: q.solImg || "",
    method: q.method || "",
  };
}

export default function Reels() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const pools = useRef({ pyq: {}, mine: [], o40: [], wrong: [], ans: [], jodi: [], vocab: [], facts: [], states: [], means: [] });
  const busy = useRef(false);

  // Galat → line mein, 50 reel baad wapas. Wahi dobara galat → phir 50 baad.
  const onWrong = useCallback((r) => {
    const { id, ...item } = r; // eslint-disable-line no-unused-vars
    const q = readRetry().filter((x) => x.key !== r.key);
    q.push({ key: r.key, item, left: RETRY_GAP });
    writeRetry(q);
  }, []);

  const refillPyq = useCallback(async (slug) => {
    const qs = await randomPart(slug).catch(() => []);
    const meta = ALL_SUBJECTS.find((s) => s.slug === slug);
    // Ek chapter se sirf 4 — phir naya random chapter, taaki wahi topic
    // baar-baar na aaye.
    pools.current.pyq[slug] = shuffle(qs).slice(0, 4).map((q) => ({ ...toQ(q, "pyq", `${meta?.icon || "📝"} ${meta?.label || ""} PYQ${q._chapter ? " · " + q._chapter : ""}`), _ask: meta?.subject || "" }));
  }, []);

  // Agli 8 reel — har baar alag kism, jo pool khaali ho wo chhoot jaata.
  const more = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    const P = pools.current;
    for (const s of ALL_SUBJECTS) if (!(P.pyq[s.slug] || []).length) await refillPyq(s.slug);
    const pyqSubs = () => ALL_SUBJECTS.filter((x) => (P.pyq[x.slug] || []).length);
    // [kism, wazan, kuch bacha hai?, banao]
    const makers = [
      ["pyq", 34, () => pyqSubs().length > 0, () => {
        let subs = pyqSubs();
        if (subs.length > 1) subs = subs.filter((x) => x.slug !== P.lastSub);
        const sub = pick(subs).slug;
        P.lastSub = sub;
        return (P.pyq[sub] || []).shift();
      }],
      // 📘 Khud jode hue question (GKTricks ke andar wale topic bhi).
      ["mine", 14, () => P.mine.length > 0, () => pick(P.mine)],
      ["o40", 12, () => P.o40.length > 0, () => { const q = pick(P.o40); return { ...toQ(q, "o40", `🐢 Maths 40+ · ${q._chapter || ""}`), _ask: "math" }; }],
      ["wrong", 12, () => P.wrong.length > 0, () => { const r = pick(P.wrong); return { ...toQ(r.q, "wrong", `🔴 Galti · ${subjectLabel(r.subject)}${r.category ? " · " + r.category : ""}`), _ask: r.subject || "" }; }],
      // 📖 Answers page ke screenshot wale (bina options) — tasveer + jawab.
      ["ans", 12, () => P.ans.length > 0, () => {
        const r = pick(P.ans);
        return { kind: "ans", _ask: r.subject || "", tag: `📖 Answers · ${subjectLabel(r.subject)}${r.category ? " · " + r.category : ""}`, images: imagesOf(r), note: r.note || "", explanation: r.answer || shownDetail(r) || "", question: r.q?.question || "" , qImg: "" };
      }],
      ["jodi", 16, () => P.jodi.length > 0, () => {
        const x = pick(P.jodi);
        const m = mcq(x.st, P.states);
        return { kind: "jodi", _ask: "gs", tag: x.t === "fd" ? "🪔 Folk dance → Rajya" : "🪔 Tyohar → Rajya", question: `**${x.n}** — kis rajya ka?`, ...m, explanation: x.note || "" };
      }],
      ["vocab", 14, () => P.vocab.length > 3, () => {
        const v = pick(P.vocab);
        const m = mcq(clip(v.meaning, 90), P.means);
        return { kind: "vocab", _ask: "english", tag: `🔤 ${v.label || "Vocab"}`, question: `**${v.word}** — matlab?`, ...m, explanation: v.meaning };
      }],
      ["fact", 12, () => P.facts.length > 0, () => { const f = pick(P.facts); const v = factView(f); return { kind: "fact", _ask: f.sec || "gs", tag: `🧠 Fact${f.topic ? " · " + f.topic : ""}`, text: v.main, more: v.more }; }],
    ];
    const out = [];
    for (let guard = 0; out.length < 8 && guard < 40; guard++) {
      // Wahi kism lagataar do baar nahi (jab doosri maujood ho).
      let live = makers.filter((m) => m[2]());
      if (live.length > 1) live = live.filter((m) => m[0] !== P.last);
      if (!live.length) break;
      const total = live.reduce((a, m) => a + m[1], 0);
      let r = Math.random() * total;
      const mk = live.find((m) => (r -= m[1]) < 0) || live[0];
      const item = mk[3]();
      if (item && (item.kind === "fact" || item.kind === "ans" || item.question || item.qImg)) {
        P.last = mk[0];
        const key = `${item.kind}:${String(item.question || item.qImg || item.text || (item.images || []).map((x) => x.url || x.id).join(",")).slice(0, 120)}`;
        out.push({ ...item, key, id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}` });
      }
    }
    // 50 poore ho gaye wali galat reels — is jatthe mein beech mein kahin
    // (max 3). Isliye wo 50 ke thoda baad aati hai (lagbhag 50–64).
    // Har nayi reel par line ki ginti ek ghatao (ab scroll ki jagah jattha bante hi).
    const q = readRetry().map((x) => ({ ...x, left: x.left - out.length }));
    writeRetry(q);
    const due = q.filter((x) => x.left <= 0).slice(0, 3);
    if (due.length) {
      writeRetry(q.filter((x) => !due.includes(x)));
      for (const d of due) {
        const it = { ...d.item, id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}` };
        out.splice(Math.floor(Math.random() * (out.length + 1)), 0, it);
      }
    }
    setList((l) => [...l, ...out]);
    setLoading(false);
    busy.current = false;
  }, [refillPyq]);

  useEffect(() => {
    let ok = true;
    (async () => {
      const P = pools.current;
      try { P.o40 = getO40(); } catch { /* ignore */ }
      try {
        for (const t of getUserTopics()) {
          const b = shelfBook(t.bookId) || getUserBook(t.bookId);
          const tag = `${b?.icon || "📘"} ${b?.name || "Meri book"} · ${t.name || ""}`;
          for (const q of getUserTopicQuestions(t.id)) if (q && q.question && Array.isArray(q.options) && q.answer != null) P.mine.push({ ...toQ(q, "mine", tag), _ask: b?.subject || "gs" });
        }
      } catch { /* ignore */ }
      try {
        const wb = getWrongBook("");
        P.wrong = wb.filter(isPracticeable);
        P.ans = wb.filter((r) => !isPracticeable(r) && imagesOf(r).length);
      } catch { /* ignore */ }
      try { P.vocab = vocabPool().filter((v) => v.word && v.meaning); P.means = P.vocab.map((v) => clip(v.meaning, 90)); } catch { /* ignore */ }
      try { P.facts = getFacts().filter((f) => f && (f.text || f.zap)); } catch { /* ignore */ }
      try {
        // Parmar ka bada JSON — sirf Home par, aur baad mein.
        const S = await import("@/lib/sanskriti");
        const name = (k) => S.STATE_NAME[k] || k;
        P.jodi = S.allItems().map((x) => ({ ...x, st: name(x.st) }));
        P.states = [...new Set(P.jodi.map((x) => x.st))];
      } catch { /* ignore */ }
      if (ok) more();
    })();
    return () => { ok = false; };
  }, [more]);

  return (
    loading ? <div className="placeholder">🎬 Taiyaar ho raha hai…</div> : (
      <PyqSplit
        title="Home"
        list={list}
        storeKey="home"
        noJump
        fullscreen
        onNeedMore={more}
        renderCard={(r) => <HomeCard r={r} onWrong={onWrong} />}
      />
    )
  );
}

// 💬 Ek card — PYQ wali chat window jaisa: upar tag, daayen sawaal + options,
// neeche jawab (pehle chhupa). 👁️ khole, 🙈 chhupaye, 🧹 sab hataye.
function HomeCard({ r, onWrong }) {
  const [picked, setPicked] = useState(null);
  // Sprint jaisa — jawab hamesha daayen dikhta hai; option chunne par sirf rang.
  const shown = picked != null;
  const ansShown = true;
  // Sprint jaisa: baayen sawaal, daayen sar + button + jawab.
  const split = (left, right) => (
    <div className="qsplit">
      <div className="qsplit__l"><article className="qcard">{left}</article></div>
      <div className="qsplit__r">
        <h2 className="qcard__h">{r.tag}</h2>
        {right}
      </div>
    </div>
  );
  const acts = shown ? (
    <div className="qcard__acts" style={{ marginTop: 0, marginBottom: 12 }}>
      <button className="btn" onClick={() => setPicked(null)}>🧹 Clear</button>
    </div>
  ) : null;
  if (r.kind === "fact") {
    return split(
      <div className="qcard__stem"><Markdown>{r.text}</Markdown></div>,
      r.more ? <div className="qcard__answer"><Markdown>{r.more}</Markdown></div> : null,
    );
  }
  if (r.kind === "ans") {
    return split(
      <AnsReel r={r} />,
      <>
        {acts}
        {ansShown && (
          <div className="qcard__answer">{r.explanation ? <Markdown>{r.explanation}</Markdown> : <p>Is question ka jawab Answers page par likha nahi hai.</p>}</div>
        )}
      </>,
    );
  }
  return split(
    <>
      {r.qImg ? (
        <div className="math-img-wrap"><img src={r.qImg} alt="question" className="math-img" /></div>
      ) : (
        <div className="qcard__stem"><Markdown>{r.question}</Markdown></div>
      )}
      {r.figImg ? <div className="math-img-wrap"><img src={r.figImg} alt="figure" className="math-img" /></div> : null}
      <div className="qcard__opts">
        {(r.optImgs || r.options).map((o, k) => {
          const right = shown && k === r.answer;
          const wrong = shown && k === picked && k !== r.answer;
          return (
            <button
              key={k}
              type="button"
              className={`qcard__opt${picked === null ? " is-pick" : ""}${picked === k ? " is-picked" : ""}${right ? " is-right" : ""}${wrong ? " is-wrong" : ""}`}
              onClick={() => { if (picked != null) return; setPicked(k); if (k !== r.answer) onWrong(r); }}
            >
              <b>{LETTER[k] || k + 1}</b>
              {r.optImgs ? <img src={o} alt={LETTER[k]} className="math-opt-img" /> : <Markdown inline>{String(o ?? "")}</Markdown>}
              {right && <span style={{ color: "var(--ok)", marginLeft: 8 }}>✓</span>}
            </button>
          );
        })}
      </div>
    </>,
    <>
      {acts}
      {ansShown && (
        <div className="qcard__answer">
          {r.answer != null && (r.optImgs || r.options)?.[r.answer] != null && (
            <p style={{ margin: "0 0 8px", color: "var(--ok)", fontWeight: 700 }}>
              ✓ Sahi jawab: {LETTER[r.answer]}{!r.optImgs && r.options[r.answer] ? ` — ${r.options[r.answer]}` : ""}
            </p>
          )}
          {r.method ? <p className="reel__method">🧠 Tumhara method: <b>{r.method}</b></p> : null}
          {r.solImg ? <img src={r.solImg} alt="solution" style={{ maxWidth: "100%" }} /> : null}
          {r.explanation ? <Markdown>{r.explanation}</Markdown> : null}
        </div>
      )}
    </>,
  );
}

// 📖 Answers page ka screenshot wala question — tasveer(ein), sawaal ke bubble mein.
function AnsReel({ r }) {
  const { urls } = useImageUrls(r.images);
  return (
    <>
      {r.question ? <div className="qcard__stem"><Markdown inline>{r.question}</Markdown></div> : null}
      {urls.map((u) => <div key={u} className="math-img-wrap"><img src={u} alt="question" loading="lazy" className="math-img" /></div>)}
      {r.note ? <p className="reel__method">{r.note}</p> : null}
    </>
  );
}
