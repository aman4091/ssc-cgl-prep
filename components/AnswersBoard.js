"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  SUBJECTS, getWrongBook, isSubject, imagesOf, dayLabel,
  storeImages, addWrong, removeWrong, isPracticeable,
  setDetail2, setShownDetail, cleanAnswer, newGeminiAnswer, newGemini1, newGemini2,
} from "@/lib/wrongbook";
import { copyImageToClipboard, imageBlob } from "@/lib/imgclip";
import { getSettings } from "@/lib/storage";
import { markDone, pruneDone, getDoneMap } from "@/lib/answersdone";
import { getCounts, bumpCount, countMark } from "@/lib/qcounter";
import { useImageUrls } from "@/lib/wrongimages";
import { imagesFromEvent, isImageFile } from "@/lib/pasteimg";
import { saveQuiz, makeId, storageUsage } from "@/lib/storage";
import Markdown, { LazyMarkdown } from "@/components/Markdown";
import ZoomableImage from "@/components/ZoomableImage";
import ChapterReport, { textOf } from "@/components/ChapterReport";
import {
  loadTaxonomy, chaptersFor, categoryChapter, chapterLabel,
  getTags, setTags, pruneTags, autoOn,
} from "@/lib/qchapter";
import { generateSimilar, tagChaptersByText } from "@/lib/client-ai";
import { getHardSet, toggleHard, pruneHard } from "@/lib/hardq";
import { aiSiteUrl, aiSiteLabel } from "@/lib/aisites";
import { ANSWER_PROMPTS } from "@/lib/answerprompts";
import ClusterButton from "./ClusterButton";
import PointsButton from "./PointsButton";

// Answers — mock test ke screenshot, aur unke jawab.
//
// "Jo question mujhse nahi bana wo dobara saamne aaye." Yahan sirf SCREENSHOT
// wale question hain (lib/wrongbook): overlay se aayi tasveer aur uska
// Gemini/DeepSeek answer.
//
// PYQ/quiz ke galat question pehle isi page par doosri shelf mein aate the.
// Owner ne wo hata diya — unka apna ghar unka chapter hai (PYQ bank ka drill,
// jahan galat question waise bhi laut kar aata hai), aur yahan do alag shakl
// ke card ek hi qataar mein milane ka koi fayda nahi tha. lib/qreview ka
// record wahi ka wahi banta rehta hai (weak-area report usi se banti hai).
//
// Question YAHAN se andar nahi aate — na pehle aate the. Screenshot paste
// karo to wo wrong book mein jata hai, overlay se bhi wahi raasta hai.
//
// Layout wahi purana hai: daayen kinare saare question ki ginti, aur beech
// mein neeche tak card ki list — 25 ek saath, neeche pahunchte hi aur jud
// jaate hain. Beech mein kuch din ye page ek-ek question
// wala drill ban gaya tha ("Nahi aata hai / Aata hai" ke saath) — owner ne
// wapas list maangi. Drill ki jagah PYQ bank aur PC overlay ka /q page hai;
// yahan ye shelf padhne ki cheez hai, na ki practice ki qataar.

const POLL_MS = 5000; // overlay ka naya question khuli hui page par bhi dikhe

// Ek baar mein kitne card banayein.
//
// Shelf 469 question ki ho sakti hai, aur har mock card apni image IndexedDB
// se padhta hai (lib/wrongimages). Sab ek saath banane par page seconds ke
// liye jam jata tha — chip dabao to kuch hota hi nahi lagta tha. Ab pehle
// itne bante hain, aur neeche pahunchte hi apne aap aur jud jaate hain.
const PAGE = 25;

// Bina poochhe ek page-visit mein itne se zyada question AI ko nahi bhejte.
const AUTO_CAP = 20;

// Chapter dropdown ki wo entry jo "jinka chapter abhi pata nahi" dikhati hai.
// Slug jaisa dikhne wala koi bhi naam is jagah takra sakta tha, isliye ye
// do underscore wala naam — kisi chapter ka slug aisa nahi ho sakta.
const NO_CHAPTER = "__none";

// "Sab" chip. isSubject("") false deta hai, isliye URL mein ?subject=all —
// purane /answers link (bina param) ab bhi Maths hi kholte hain.
const ALL_SUBJ = { key: "", label: "Sab", icon: "\u{1F4DA}" };

// Kaunsi shelf dikhani hai.
//
// "Under 40" ki apni shelf hua karti thi. Ab nahi: overlay par 40 second ke
// andar nipta diya hua question bhi baaki sabke saath External Mock mein hi
// rehta hai — bas "abhi ho gaya" hone ki wajah se list mein sabse neeche
// chala jata hai, jaise koi bhi nipta hua question jata hai. Ek hi list,
// dhoondhne ke liye ek hi jagah.
const SOURCES = [
  { key: "all", label: "📚 Sab" },
  // "External Mock (screenshot)" aur "PYQ / Quiz ke galat" wali chhaanti
  // owner ne hata di — dono ek hi list hain aur alag-alag chhaantne ka
  // kaam nahi pad raha tha. Record dono jagah se waise hi aate rahenge.
  { key: "hard", label: "🔴 Hard" },
];
const isSource = (k) => SOURCES.some((s) => s.key === k);

// Notebook ka subject wahi shabd hai jo poore app mein chalta hai. Jinka
// subject darj hi nahi hua (purane record, ya bina subject wala quiz) wo
// "Other" mein aate hain — mock shelf mein aisa kuch hota hi nahi.
const KNOWN = new Set(SUBJECTS.map((s) => s.key));
const bucketOf = (r) => (KNOWN.has(r.subject) ? r.subject : "other");
const labelOf = (k) =>
  k === "other" ? "Other" : (SUBJECTS.find((s) => s.key === k) || ALL_SUBJ).label;

function AnsCard({ rec, n, fresh, onDone, onDelete, onOpen, onChange, prompt, onArm, onFlash, highlight, isHardQ, onToggleHard }) {
  const router = useRouter();
  const { urls, missing } = useImageUrls(imagesOf(rec));
  const [lb, setLb] = useState(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState("");

  // Har subject ka MUKHYA answer ab DeepSeek ka hai (PC ka overlay likhta hai).
  // Purane Gemini answer record mein pade hain par dikhte nahi; Gemini wala
  // sirf tab dikhta hai jab NAYA ho — 📥 se paste, ✏️ se sudhara, ya overlay se
  // copy hokar aaya (`ansAt`, lib/wrongbook). ✨ / 📋 / 📥 buttons pehle jaise.
  // Kaunsa jawab dikhega — owner ka kram, wahi jo baaki har card par hai:
  //   paste kiya hua (✨) > 🐋 DeepSeek > jo pehle se record mein tha.
  // Pehle Gemini aur DeepSeek dono ek saath neeche-upar dikhte the; ek hi
  // question ke do lambe jawab padhne mein sirf uljhan thi. Ab ek dikhta hai
  // aur baaki fold mein baithe rehte hain.
  const g2 = cleanAnswer(newGemini2(rec));
  const g1 = cleanAnswer(newGemini1(rec));
  // "Jo pehle se hai": record ka apna solution, ya wo purana jawab jo bina
  // ✨ ke aaya tha (ans1At nahi hai — DeepSeek ke daur ka `detail`).
  const legacy = cleanAnswer(!rec?.ans1At ? rec.detail || "" : "");
  const own = cleanAnswer(rec.q?.solution || "") || legacy;
  const ai = String(rec.aiNotes || "").trim();
  const gem = g2 || g1;
  const main = gem || ai || own;
  const mainSrc = gem ? "✨ paste kiya hua" : ai ? "🐋 DeepSeek" : own ? "📘 record ka apna" : "";
  // Jo dikh nahi raha par maujood hai — fold mein.
  const folds = [
    gem && g2 && g1 ? { key: "g1", label: "Pehla Gemini answer dekho", md: g1 } : null,
    gem && ai ? { key: "ai", label: "🐋 DeepSeek ka answer dekho", md: ai } : null,
    main !== own && own ? { key: "own", label: "Record ka apna answer dekho", md: own } : null,
  ].filter(Boolean);

  const ping = (k) => { setCopied(k); setTimeout(() => setCopied(""), 1600); };

  // Gemini (ya Settings mein chuni koi aur AI site) — question ki TASVEER
  // clipboard par daal kar site khol do.
  //
  // Image bhejna OCR se behtar hai: fractions aur figures jaise-ke-taise jaate
  // hain. Prompt saath mein nahi ja sakta (clipboard par ek waqt mein ek hi
  // cheez), isliye overlay wali chaal: yahan wapas aate hi prompt apne aap copy
  // ho jata hai — phir wahin dobara paste kar do.
  // 🎯 20 — isi type ke 20 naye question (wahi jo PYQ card par hai).
  // Sirf un record par jinke paas asli options hain; screenshot-only wale
  // ko quiz player khol hi nahi sakta.
  const [simLoading, setSimLoading] = useState(false);
  const canMake20 = isPracticeable(rec);
  const make20 = async () => {
    setSimLoading(true);
    try {
      const data = await generateSimilar({ question: rec.q.question, options: rec.q.options }, 20, rec.subject);
      const quiz = {
        id: makeId(),
        title: data.title || "Similar (20)",
        source: "similar",
        createdAt: new Date().toISOString(),
        questions: data.questions,
      };
      saveQuiz(quiz);
      router.push(`/quizzes/${quiz.id}`);
    } catch (e) {
      onFlash(`❌ 20 nahi bane — ${e.message}`);
      setSimLoading(false);
    }
  };

  const aiSite = getSettings().askAiSite;
  const askGemini = async () => {
    const imgs = imagesOf(rec);
    if (imgs.length) {
      const ok = await copyImageToClipboard(() => imageBlob(imgs[0]));
      if (ok) {
        ping("gem");
        onArm(prompt);
        onFlash(`🖼️ Image copy ho gayi — ${aiSiteLabel(aiSite)} mein paste karo, phir yahan wapas aao (prompt apne aap copy hoga)`);
      } else {
        onFlash("Is browser mein image copy support nahi — 📋 Prompt se kaam chalao");
      }
    }
    window.open(aiSiteUrl(aiSite), "_blank", "noopener,noreferrer");
    setPasteText("");
    setEditing(false);
    setPasteOpen(true);
  };

  const savePaste = () => {
    const t = pasteText.trim();
    if (!t) return;
    try {
      if (editing) setShownDetail(rec.id, t);
      else setDetail2(rec.id, t);
      setPasteOpen(false);
      setPasteText("");
      onChange();
      onFlash("✅ Answer save ho gaya");
    } catch (e) {
      console.error("savePaste failed:", e);
      const top = storageUsage().slice(0, 4);
      const lines = top.map((x) => `${x.key}: ${(x.bytes / 1024).toFixed(1)} KB`).join(" | ");
      onFlash(`❌ Save nahi hua — localStorage full. Top: ${lines}`);
    }
  };

  return (
    <div
      className={`ansp__card${highlight ? " is-hit" : ""}${fresh ? " is-new" : ""}`}
      id={`ans-${rec.id}`}
    >
      <h2>
        {fresh ? "🆕 " : ""}Question {n}
        {/* Card ke saare button yahin, sar ke daayen — owner ka niyam.
            ✨ paste ka dabba bhi khol deta hai, isliye uska alag button nahi. */}
        <span className="ansp__hacts">
          <button className="ansp__btn ansp__btn--go" onClick={() => onDone(rec)} title="Ho gaya — ye question sabse neeche">✅</button>
          <button className="ansp__btn ansp__btn--go" onClick={() => onOpen(rec)} title="Writing tablet par solve karo">✍️</button>
          <button className="ansp__btn" onClick={askGemini} title={`Image copy karke ${aiSiteLabel(aiSite)} kholo, phir answer paste karo`}>
            {copied === "gem" ? "🖼️ ✓" : `✨ ${aiSiteLabel(aiSite)}`}
          </button>
          {canMake20 && (
            <button className="ansp__btn" onClick={make20} disabled={simLoading}
              title="Isi type ke 20 naye questions generate karo">
              {simLoading ? "…" : "🎯 20"}
            </button>
          )}
          <button className="ansp__btn" onClick={() => onToggleHard(rec)} title={isHardQ ? "Hard se hatao" : "Hard mein daalo"}>
            {isHardQ ? "✅🔴" : "🔴"}
          </button>
          <button className="ansp__btn" onClick={() => onDelete(rec)} title="Hatao">🗑️</button>
        </span>
      </h2>

      {urls.map((u, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={i} src={u} alt={`question ${n}`} onClick={() => setLb(i)} title="Tap to enlarge" />
      ))}
      {missing > 0 && (
        <p className="ansp__note">
          📷 {missing} image is device par nahi hai — R2 par upload nahi hui thi.
        </p>
      )}

      {pasteOpen && (
        <div className="ansp__paste">
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            autoFocus
            placeholder={editing
              ? "Answer sudhaar kar Save dabao"
              : "Gemini ka answer yahan paste karo (Ctrl+V), phir Save — pehla answer mitega nahi"}
          />
          <div className="ansp__acts">
            <button className="ansp__btn ansp__btn--go" onClick={savePaste} disabled={!pasteText.trim()}>💾 Save</button>
            <button className="ansp__btn" onClick={() => setPasteOpen(false)}>Cancel</button>
          </div>
        </div>
      )}

      {main ? (
        <>
          <div className="ansp__answer">
            <div className="ansp__gemhead">{mainSrc}</div>
            <ClusterButton md={main} onFlash={onFlash} />
            <PointsButton md={main} src={rec.subject} onFlash={onFlash} />
            <LazyMarkdown>{main}</LazyMarkdown>
          </div>
          {folds.map((f) => (
            <details key={f.key} className="ansp__old">
              <summary>{f.label}</summary>
              <div className="ansp__answer"><LazyMarkdown>{f.md}</LazyMarkdown></div>
            </details>
          ))}
        </>
      ) : (
        <div className="ansp__answer ansp__answer--empty">
          ⏳ Abhi koi answer nahi — ✨ se laa kar paste karo.
        </div>
      )}

      {lb !== null && urls[lb] && (
        <div className="lightbox" onClick={() => setLb(null)}>
          <button className="lightbox__x" onClick={() => setLb(null)}>✕</button>
          <div className="lightbox__body" onClick={(e) => e.stopPropagation()}>
            <ZoomableImage key={lb} src={urls[lb]} alt={`question ${n}`} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function AnswersBoard({ defaultSrc = "all", defaultSubject = "math" }) {
  const router = useRouter();
  const sp = useSearchParams();
  const urlQid = sp.get("qid");

  // Chip aur dropdown ab URL se NAHI chalte.
  //
  // Pehle har click router.push karta tha. Uska matlab tha poora route dobara
  // banna — 469 card wali shelf par wo seconds le leta tha, aur lagta tha ki
  // chip dab hi nahi raha. Ab chunav yahin state mein hai (turant), aur URL
  // sirf history.replaceState se peechhe-peechhe badal jata hai taaki reload
  // aur bookmark wahi chhaanti kholein.
  const [subject, setSubject] = useState(() => {
    const u = sp.get("subject");
    if (isSubject(u)) return u;
    if (u === "all") return "";
    if (u === "other") return "other";
    return isSubject(defaultSubject) ? defaultSubject : "";
  });
  const [src, setSrc] = useState(() => {
    const u = sp.get("src");
    return isSource(u) ? u : defaultSrc;
  });

  const [mock, setMock] = useState([]);      // wrong book (screenshot wale)
  const [done, setDone] = useState(() => new Set());     // mock ke id
  // Wahi mark, par waqt ke saath — kram inhi se banta hai.
  const [doneMap, setDoneMap] = useState({});
  // Aaj kis subject ke kitne question hue (raat 3 baje reset) — mark karte hi
  // apne aap badhta hai, overlay ke counter jaisa hi hisaab.
  const [counts, setCounts] = useState({});
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  // Chapter ke tag + report ka panel + "sirf is chapter ke" wali chhaanti.
  const [tags, setTagMap] = useState({});
  const [taxReady, setTaxReady] = useState(false);
  const [hard, setHard] = useState(() => new Set());
  const [report, setReport] = useState(false);
  const [chapter, setChapter] = useState(() => sp.get("ch") || "");
  const [flash, setFlash] = useState("");
  const [err, setErr] = useState("");
  const active = subject && subject !== "other"
    ? SUBJECTS.find((s) => s.key === subject)
    : subject === "other" ? { key: "other", label: "Other", icon: "\u{1F4DD}" } : ALL_SUBJ;

  // Naye question ka pata — kyunki wo sabse NEECHE judta hai.
  //
  // Purana upar / naya neeche wala kram padhne ke liye theek hai, par uska ek
  // nuksaan hai: overlay se question aata hai to wo screen ke bahar, list ke ant
  // mein chupchaap jud jata hai. Isliye jo ids pehle nahi thi unhe yaad rakhte
  // hain — upar ek patti aa jati hai aur us card par nishaan lag jata hai.
  const seenIds = useRef(null);
  const [freshIds, setFreshIds] = useState(() => new Set());

  // ── Kram: ek GHOOMTA hua katar ──────────────────────────────────────────
  //
  // Ek hi list, koi dher nahi. Sabse upar wo jise sabse zyada der se haath
  // nahi lagaya; sabse neeche wo jo abhi-abhi hua. Naya galat question bhi
  // "abhi hua" hai, isliye wo sabse neeche lagta hai — yaani kal ka naya
  // question aaj nipte hue ke NEECHE aayega, uske upar nahi. Phir jo bhi tum
  // niptaoge wo uske neeche chala jayega, aur katar ghoomti rahegi.
  //
  // "Aakhri baar kab kuch hua" do jagah se aata hai, jo bhi baad ka ho:
  //   • record ka apna waqt — mock ke liye `at` (banne ka waqt); PYQ/notebook
  //     ke liye `firstAt` (PEHLI baar galat hua tha tab ka waqt), `at` nahi.
  //   • ✅ "Ho gaya" ka waqt — lib/answersdone
  //
  // Pehle yahan nb ke liye `at` istemal hota tha, jo har attempt par naya ho
  // jata hai — is board ke andar hi option chunte hi (PyqQuestionCard ka
  // archiveOnAnswer) `at` abhi ka ban jata, aur agle poll (5s) mein sawaal
  // jawab padhte-padhte hi neeche bhaag jata, "Ho gaya" dabaye bina. `firstAt`
  // reattempt se nahi badalta, isliye ab sawaal apni jagah tabhi chhodta hai
  // jab ✅ "Ho gaya" khud dabaya jaye.
  //
  // Pehle yahan `at` ko page khulte hi JAMA kar diya jata tha aur list do
  // dheron mein bantti thi (pehle baaki, phir ho gaye). Usme naya question
  // hamesha nipte hue question ke UPAR aa jata tha — jo ghoomti katar nahi,
  // do alag list thi.
  const doneAt = useCallback((r) => doneMap[r.id] || "", [doneMap]);
  const baseAt = (r) => String(r.at || "");
  const sortAt = useCallback((r) => {
    const a = baseAt(r);
    const d = doneAt(r);
    return d > a ? d : a;
  }, [doneAt]);

  // Har 5 second par sab kuch dobara set karna mehnga tha: naye array matlab
  // nayi list, naya sort, aur saare card dobara. 99% baar kuch badla hi nahi
  // hota. Isliye pehle ek sasta nishaan bana kar milaate hain — badla ho tabhi
  // state chhoote hain, warna poll chupchaap nikal jata hai.
  const sigRef = useRef({});
  const refresh = useCallback(() => {
    const put = (name, sig, value, setter) => {
      if (sigRef.current[name] === sig) return false;
      sigRef.current[name] = sig;
      setter(value);
      return true;
    };

    const rawMock = getWrongBook();

    // Notebook: jo kabhi galat hua, wo yahan REHTA hai — bilkul mock shelf ki
    // tarah, jahan record kabhi apne aap nahi hatta.
    //
    // Pehle list `everWrong && !correct` par bani thi. Uska matlab tha: card
    // par sahi option dabate hi question agle poll par chupchaap gayab. Jis
    // sawaal par tum abhi kaam kar rahe the wahi screen se hat jata tha —
    // Gemini se answer laa kar wapas aane par to aur bura. Ab sahi hone par wo
    // sirf sabse NEECHE chala jata hai aur kinare wali list mein uska number
    // hara ho jata hai. Hatana ho to 🗑️ hai.
    const mSig = rawMock
      .map((r) => `${r.id}~${r.at}~${r.subject}~${(r.detail || "").length}~${(r.detail2 || "").length}~${(r.aiNotes || "").length}~${r.aiWant ? 1 : 0}`)
      .join("|");

    const ids = new Set(rawMock.map((r) => r.id));
    if (sigRef.current.mock !== undefined && sigRef.current.mock !== mSig && seenIds.current) {
      const added = [...ids].filter((id) => !seenIds.current.has(id));
      if (added.length) setFreshIds((prev) => new Set([...prev, ...added]));
    }
    seenIds.current = ids;

    const mChanged = put("mock", mSig, rawMock.map((r) => ({ ...r, __src: "mock", uid: `mock:${r.id}` })), setMock);

    // List badli tabhi — delete ho chuke record ke chapter-tag saaf kar do.
    if (mChanged) pruneTags(new Set(rawMock.map((r) => `mock:${r.id}`)));

    const d = pruneDone(ids);
    if (put("done", [...d].sort().join("|"), d, setDone)) setDoneMap(getDoneMap());
    const hd = pruneHard(ids);
    put("hard", [...hd].sort().join("|"), hd, setHard);

    // 5s poll — 3 baje din badla to yahin pata chal jata hai
    const c = getCounts();
    put("counts", JSON.stringify(c), c, setCounts);

    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
    // Overlay har 5 second par naya question wrong book mein daalta hai
    // (OverlayInbox, layout mein mounted). Page khula ho to use bhi dikhna
    // chahiye bina reload ke — /new-words theek isi wajah se aisa karta hai.
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  // Chapter ki list (public/*/index.json) ek baar — iske bina category ko
  // chapter maana ja hi nahi sakta.
  useEffect(() => { loadTaxonomy().then(() => setTaxReady(true)); }, []);

  // 🔴 Hard — khud is page se dabaya hua, isliye button hi likhta hai (koi
  // overlay poll nahi chahiye), par doosra tab khula ho to bhi sunte hain.
  useEffect(() => {
    const h = () => setHard(getHardSet());
    h();
    window.addEventListener("cgl:hard-changed", h);
    return () => window.removeEventListener("cgl:hard-changed", h);
  }, []);

  // Tag store: panel se ya auto-tag se badalta hai, dono jagah se sunte hain.
  useEffect(() => {
    const h = () => setTagMap(getTags());
    h();
    window.addEventListener("cgl:qchapter-changed", h);
    return () => window.removeEventListener("cgl:qchapter-changed", h);
  }, []);

  // Chapter kahan se aaya, isi kram mein: khud bataya hua > AI > quiz ki apni
  // category. Category tabhi chalti hai jab wo asli chapter ho (lib/qchapter) —
  // "SSC CGL 2023 Shift 2" chapter nahi hai.
  const chapterOf = useCallback((r) => {
    const t = tags[r.uid];
    if (t?.ch) return { ch: t.ch, by: t.by || "me" };
    const c = taxReady ? categoryChapter(bucketOf(r), r.category) : "";
    return c ? { ch: c, by: "quiz" } : { ch: "", by: "" };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tags, taxReady]);

  // "Ho gaya" ab koi HAALAT nahi hai — ek kaam hai. Dabate hi question neeche
  // chala jata hai aur nishaan khud hat jata hai, taaki ghoom kar wapas upar
  // aaye to dobara bina-nishaan ke mile. Isliye yahan na koi hara rang bachta
  // hai, na koi tick jo laga reh jaye.
  //
  // Pehle hara rang tha, aur uske saath ek gali-band: nipta hua question ghoom
  // kar upar aa jata tha par uspar tick laga hota tha — use neeche bhejne ka
  // koi tareeka hi nahi bachta tha (tick dabao to wo UT-tick hota tha).

  // Naye question apne aap tag ho jayein — panel ka checkbox is par lagta hai.
  //
  // Sirf TEXT wale, aur ek page-visit mein girah bhar. Screenshot ke liye har
  // question ek alag vision call hai; use chupchaap chalane se paise aur waqt
  // dono jalte, isliye wo sirf panel ke button se hota hai.
  const autoRan = useRef(false);
  useEffect(() => {
    if (!ready || !taxReady || autoRan.current) return;
    if (!autoOn()) return;
    const s = getSettings();
    if (!s.apiKey && !s.geminiApiKey) return;
    const todo = mock.filter((r) => !tags[r.uid] && !categoryChapter(bucketOf(r), r.category) && textOf(r));
    if (!todo.length) return;
    autoRan.current = true;
    (async () => {
      const bySubject = new Map();
      for (const r of todo.slice(0, AUTO_CAP)) {
        const k = bucketOf(r);
        if (!bySubject.has(k)) bySubject.set(k, []);
        bySubject.get(k).push(r);
      }
      for (const [subj, list] of bySubject) {
        const chapters = chaptersFor(subj).map((c) => c.slug);
        if (!chapters.length) continue;
        try {
          const out = await tagChaptersByText({
            chapters,
            texts: list.map((r) => ({ id: r.uid, text: textOf(r) })),
          });
          const rowsOut = out.filter((t) => t.chapter).map((t) => ({ uid: t.id, ch: t.chapter, by: "ai" }));
          if (rowsOut.length) setTags(rowsOut);
        } catch (e) {
          // Chupchaap chal raha kaam hai — fail ho to bas ruk jao.
          console.warn("auto chapter tag failed", e);
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, taxReady, mock]);

  // 🔴 Hard aam shelf se BAHAR — khud dabaya hua, isliye qid ki zaroorat
  // nahi, record ki apni id se.
  const isHardQ = useCallback((r) => hard.has(r.id), [hard]);
  const pool = useMemo(() => {
    if (src === "hard") return mock.filter(isHardQ);
    return mock.filter((r) => !isHardQ(r));
  }, [mock, src, isHardQ]);

  const rows = useMemo(
    () => pool
      .filter((r) => (subject ? bucketOf(r) === subject : true))
      .filter((r) => {
        if (!chapter) return true;
        const ch = chapterOf(r).ch;
        return chapter === NO_CHAPTER ? !ch : ch === chapter;
      }),
    [pool, subject, chapter, chapterOf],
  );

  // Report ke liye: chapter wali chhaanti chhod kar baaki sab lagi hui —
  // warna "Geometry ke 12" khol kar report kholne par report bhi sirf 12 ki
  // ban jaati, aur agla chapter dikhta hi nahi.
  const reportRows = useMemo(
    () => pool.filter((r) => (subject ? bucketOf(r) === subject : true)),
    [pool, subject],
  );

  // Dropdown ki list — sirf wahi chapter jinka koi question yahan hai, aur
  // sabse zyada galat wala sabse upar. Poori 29 chapter ki list dena bekaar
  // hai: aadhe khaali honge aur jispar kaam chahiye wo beech mein dab jayega.
  const chapterOpts = useMemo(() => {
    const c = new Map();
    let none = 0;
    for (const r of reportRows) {
      const ch = chapterOf(r).ch;
      if (!ch) { none += 1; continue; }
      c.set(ch, (c.get(ch) || 0) + 1);
    }
    return {
      list: [...c.entries()]
        .map(([ch, n]) => ({ ch, n, label: chapterLabel(ch) }))
        .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label)),
      none,
    };
  }, [reportRows, chapterOf]);

  // Kram: pehle bina-tick wale, phir tick wale; dono ke andar purana upar.
  // Yahi hisaab dono purane pages ka tha, isliye kisi bhi shelf ka kram badla
  // nahi — bas ab ek hi jagah lagta hai.
  const list = useMemo(() => {
    const qnum = (r) => {
      const m = /^q(\d+)$/.exec(r.qid || "");
      return m ? Number(m[1]) : 0;
    };
    const cmp = (a, b) => {
      const ta = sortAt(a);
      const tb = sortAt(b);
      if (ta !== tb) return ta < tb ? -1 : 1;
      return qnum(a) - qnum(b);
    };
    return [...rows].sort(cmp);
  }, [rows, sortAt]);

  // Kitne card abhi bane hue hain. Chhaanti badalte hi shuru se.
  const [visible, setVisible] = useState(PAGE);
  useEffect(() => { setVisible(PAGE); }, [subject, src]);
  const shown = useMemo(() => list.slice(0, visible), [list, visible]);

  // Neeche pahunchte hi agla jattha apne aap. Button bhi hai — jinke browser
  // mein observer na chale unke liye.
  const tail = useRef(null);
  useEffect(() => {
    const el = tail.current;
    if (!el || typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) setVisible((v) => Math.min(v + PAGE, list.length));
    }, { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [list.length]);

  // ⬆️ Sabse upar.
  //
  // Kinare wali list apne andar scroll hoti hai (86vh se lambi ho jati hai),
  // isliye neeche pahunchte-pahunchte 1 se 5 uske apne scroll mein chhup jate
  // hain — Question 1 par jaane ke liye pehle poora page upar laana padta tha.
  // Ye button dono ko ek saath upar le aata hai: page bhi, aur list bhi.
  const railRef = useRef(null);
  const [showTop, setShowTop] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const toTop = () => {
    try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch { window.scrollTo(0, 0); }
    const el = railRef.current;
    if (!el) return;
    try { el.scrollTo({ top: 0, behavior: "smooth" }); } catch { el.scrollTop = 0; }
  };

  // Rail ka number us card par le jata hai — chahe wo abhi bana hi na ho.
  // Isliye pehle utne card khol do, phir agle frame mein scroll.
  const jumpTo = (i, id) => {
    const needsMore = i >= visible;
    if (needsMore) setVisible(Math.min(i + PAGE, list.length));
    const go = () => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(go, needsMore ? 120 : 0);
    // Naye card banne mein oonchai badalti rehti hai (answer ka markdown baad
    // mein khulta hai), isliye ek baar aur — warna nishaana 3-4 card aage
    // reh jata hai.
    if (needsMore) setTimeout(go, 500);
  };

  // Chips par ginti — chuni hui shelf ki, taaki "Maths (12)" ka matlab wahi ho
  // jo neeche dikhega.
  const chipCounts = useMemo(() => {
    const c = { "": pool.length };
    for (const r of pool) c[bucketOf(r)] = (c[bucketOf(r)] || 0) + 1;
    return c;
  }, [pool]);

  // Subject ya shelf badli to nayi list ke saare records "naye" nahi hain —
  // ginti shuru se karo.
  useEffect(() => { seenIds.current = null; setFreshIds(new Set()); }, [subject, src]);

  // Chhaanti badlo: state turant, URL chupchaap peechhe. replaceState Next ko
  // dobara render karne par majboor nahi karta — isliye ye ek frame ka kaam
  // hai, poore route ka nahi.
  // Menu se subject dabane par URL badalta hai par route wahi (/answers) —
  // component dobara nahi banta, isliye pehle kuch hota hi nahi tha: state
  // sirf pehli baar URL se padhi jati thi. Ab URL badle to chhaanti badalti
  // hai. Jo URL humne KHUD likha (go() ka replaceState) use chhod dete hain,
  // warna wahi state dobara set hoti rehti.
  const selfUrl = useRef("");
  useEffect(() => {
    const q = sp.toString();
    if (q === selfUrl.current) return;
    const u = sp.get("subject");
    const nextSubject = isSubject(u) ? u : u === "all" ? "" : u === "other" ? "other" : null;
    if (nextSubject !== null) setSubject(nextSubject);
    const v = sp.get("src");
    if (isSource(v)) setSrc(v);
    setChapter(sp.get("ch") || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp]);

  const go = (next) => {
    const s = next.subject !== undefined ? next.subject : subject;
    const v = next.src !== undefined ? next.src : src;
    // Subject ya shelf badle to chapter apne aap chhoot jata hai — "Maths ka
    // Geometry" chun kar English par jaane ka koi matlab nahi.
    const c = next.chapter !== undefined ? next.chapter
      : (next.subject !== undefined || next.src !== undefined) ? "" : chapter;
    if (next.subject !== undefined) setSubject(s);
    if (next.src !== undefined) setSrc(v);
    setChapter(c);
    try {
      // Pathname wahi rehta hai jispar ho (/answers ya /mistakes) — Next ko
      // uske neeche se route nahi badalna chahiye, sirf query.
      const base = window.location.pathname;
      const q = `subject=${s || "all"}&src=${v}${c ? `&ch=${encodeURIComponent(c)}` : ""}`;
      selfUrl.current = q;
      window.history.replaceState(null, "", `${base}?${q}`);
    } catch { /* purana browser — chhaanti phir bhi chal rahi hai */ }
  };

  // Deep-link: overlay ke local page ka per-question link yahan aata hai.
  useEffect(() => {
    if (!urlQid || !list.some((r) => r.qid === urlQid)) return undefined;
    const rec = list.find((r) => r.qid === urlQid);
    const t = setTimeout(() => {
      document.getElementById(`ans-${rec.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlQid, list.length]);

  // Gemini ke saath prompt clipboard par nahi ja sakta (ek waqt mein ek hi
  // cheez, aur image jaa chuki hai). Overlay wali chaal: Gemini kholte waqt ek
  // nishaan laga do, aur user jab is tab par WAPAS aata hai to prompt apne aap
  // copy kar do — phir wo Gemini mein dobara paste kar deta hai.
  // Nishaan mein prompt ka TEXT hi rakhte hain — "Sab" wali list mein har card
  // alag subject ka ho sakta hai, aur wapas aane par usi card ka prompt chahiye.
  const armed = useRef("");
  const promptFor = useCallback((subj) => {
    const st = getSettings();
    const perSubject = String((st.shortcutPrompts || {})[subj] || "").trim();
    return perSubject || ANSWER_PROMPTS[subj] || String(st.geminiPrompt || "").trim()
      || ANSWER_PROMPTS.gs;
  }, []);

  useEffect(() => {
    const onFocus = async () => {
      if (!armed.current) return;
      const text = armed.current;
      armed.current = "";
      try {
        await navigator.clipboard.writeText(text);
        setFlash("📋 Prompt copy ho gaya — Gemini mein paste karke bhejo");
        setTimeout(() => setFlash(""), 4000);
      } catch { /* user 📋 Prompt button use kar lega */ }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // 🔍 Popup mode — ek waqt mein EK question, poori screen par; ◀ ▶ se
  // aage-peechhe, upar se subject badlo. Dhyaan sirf sawaal par rahe.
  const flashNow = useCallback((msg) => {
    setFlash(msg);
    setTimeout(() => setFlash(""), 5000);
  }, []);

  // Ek card — list mein bhi aur 🔍 popup mein bhi wahi (saare button samet).
  const renderCard = (r, i, inPopup) => (
    <AnsCard
      key={r.uid}
      rec={r}
      n={i + 1}
      fresh={freshIds.has(r.id)}
      onDone={onDone}
      onDelete={onDelete}
      onChange={refresh}
      prompt={promptFor(r.subject)}
      onArm={(text) => { armed.current = text; }}
      onOpen={onOpen}
      onFlash={flashNow}
      highlight={!inPopup && !!urlQid && r.qid === urlQid}
      isHardQ={hard.has(r.id)}
      onToggleHard={onToggleHard}
    />
  );

  const onDone = (rec) => {
    markDone(rec.id);
    const next = new Set(done).add(rec.id);
    // Nishaan bhi saath mein — warna agla poll wahi set dobara bana kar poori
    // list ko bekaar mein dobara render kara deta.
    sigRef.current.done = [...next].sort().join("|");
    setDone(next);
    const m = getDoneMap();
    sigRef.current.doneMapSig = JSON.stringify(m);
    setDoneMap(m);
    // Tick lagate hi aaj ka counter +1, hatate hi -1 (wahi question dobara
    // mark karo to ginti dobara nahi badhti — qcounter ids yaad rakhta hai)
    const c = countMark(rec.id, rec.subject || subject, true);
    sigRef.current.counts = JSON.stringify(c);
    setCounts(c);
  };

  // 🔴 Hard — dabate hi turant list se hat jaye, agle 5s poll ka intezaar
  // nahi (sigRef bhi saath, warna refresh() wahi purana set dekh kar kuch
  // badla-nahi maan leta).
  const onToggleHard = (rec) => {
    toggleHard(rec.id);
    const h = getHardSet();
    sigRef.current.hard = [...h].sort().join("|");
    setHard(h);
  };

  // Notebook ka nishaan alag store mein — par kaam wahi: neeche bhej do.
  const onDelete = async (rec) => {
    if (!confirm("Ye question hata du? Iski writing aur image bhi jayegi.")) return;
    await removeWrong(rec.id);
    refresh();
  };

  // `d` (date filter) jaan-boojh kar NAHI bhej rahe.
  //
  // Wo purane /wrong page ka hissa tha. Yahan koi date filter hai hi nahi, par
  // ✍️ Solve — writing tablet wala page.
  //
  // `d` (date filter) jaan-boojh kar NAHI bhej rahe. Wo purane /wrong page ka
  // hissa tha; link us question ki date bhejta to solve page ki list sirf USI
  // din tak sikud jati (har baar "1/1", aur timer khatam hone par agla
  // question hota hi nahi). Bina `d` ke wahi poori shelf milti hai jo yahan
  // dikh rahi hai.
  const onOpen = (rec) => {
    router.push(`/wrong/solve?subject=${rec.subject}&id=${rec.id}`);
  };

  // Paste = question add. Wahi flow jo pehle /wrong par tha — overlay band ho to
  // bhi haath se question daala ja sake. Ye hamesha wrong book (mock shelf) mein
  // jata hai, chahe screen par kaunsi bhi shelf khuli ho.
  const takeFiles = useCallback(async (files) => {
    const imgs = (files || []).filter(isImageFile);
    if (!imgs.length) return;
    if (!subject || subject === "other") {
      // Bina subject ke record kis shelf mein jayega ye tay hi nahi hota —
      // isliye chupchaap kahin daalne se behtar hai poochh lena.
      setErr("Pehle subject chuno (Maths / Reasoning / English / GS) — phir screenshot paste karo.");
      return;
    }
    setBusy(true); setErr("");
    try {
      const { images, localOnly } = await storeImages(imgs);
      addWrong({ subject, q: null, images, note: "" });
      refresh();
      setFlash(`✅ ${active.icon} ${active.label} mein add ho gaya`);
      setTimeout(() => setFlash(""), 2200);
      if (localOnly) {
        setErr(`${localOnly} image cloud par upload nahi hui — sirf is device par rahegi.`);
      }
    } catch {
      setErr("Image save nahi ho payi — dobara try karo.");
    } finally {
      setBusy(false);
    }
  }, [subject, active, refresh]);

  useEffect(() => {
    const onPaste = (e) => {
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || e.target?.isContentEditable) return;
      const imgs = imagesFromEvent(e);
      if (!imgs.length) return;
      e.preventDefault();
      takeFiles(imgs);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [takeFiles]);

  const chips = [ALL_SUBJ, ...SUBJECTS];

  return (
    <div className="ansp">
      {/* Daayen kinare poori list — har question ka number. Tap karo to wahi
          card saamne. Card abhi bana na ho (25-25 karke bante hain) to pehle
          utne khul jate hain, phir scroll. */}
      {list.length > 0 && (
        <nav className="ansp__side" ref={railRef}>
          {list.map((r, i) => {
            const id = `ans-${r.id}`;
            return (
              <a
                key={r.uid}
                href={`#${id}`}
                onClick={(e) => { e.preventDefault(); jumpTo(i, id); }}
              >
                {i + 1}
              </a>
            );
          })}
        </nav>
      )}

      <div className="ansp__main">
        <div className="ansp__acts ansp__acts--top">
          {/* Upar ab bas yahi — owner ne baaki sab hata diya. Question ke
              apne button (✨ Gemini, 🐋 DeepSeek, 🎯 20) card par hi hain. */}
          <button
            className="ansp__btn"
            onClick={() => setReport(true)}
            title="Kis chapter mein sabse zyada galat ho raha hai"
          >
            📊 Chapter report
          </button>
        </div>

        {flash && <p className="ansp__flash">{flash}</p>}
        {err && <p className="ansp__err">{err}</p>}

        {!ready ? (
          <p className="ansp__empty">Khul raha hai…</p>
        ) : list.length === 0 ? (
          <p className="ansp__empty">
            {src === "pyq"
              ? "Is chhaanti mein koi galti nahi. Koi quiz do — galat ya chhoda hua question apne aap yahan aa jayega."
              : "Yaha abhi koi question nahi hai."}
          </p>
        ) : (
          shown.map((r, i) => renderCard(r, i, false))
        )}

        {/* Aur card — neeche pahunchte hi apne aap khul jate hain. */}
        {ready && visible < list.length && (
          <div ref={tail} className="ansp__acts">
            <button className="ansp__btn" onClick={() => setVisible((v) => Math.min(v + PAGE, list.length))}>
              ⬇️ Aur {Math.min(PAGE, list.length - visible)} dikhao ({visible}/{list.length})
            </button>
          </div>
        )}

        {showTop && (
          <button className="ansp__top" onClick={toTop} title="Sabse upar — Question 1 par" aria-label="Sabse upar jao">
            ⬆️
          </button>
        )}

        {report && (
          <ChapterReport
            records={reportRows}
            chapterOf={chapterOf}
            subjectOf={bucketOf}
            onClose={() => setReport(false)}
            onPick={(ch) => { go({ chapter: ch }); setReport(false); window.scrollTo({ top: 0 }); }}
          />
        )}

      </div>
    </div>
  );
}
