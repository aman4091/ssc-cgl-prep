"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  SUBJECTS, getWrongBook, isSubject, imagesOf, dayLabel,
  storeImages, addWrong, removeWrong, isPracticeable,
  setDetail2, setShownDetail, shownDetail, cleanAnswer,
} from "@/lib/wrongbook";
import { getReview, removeReview, fixReviewAnswer } from "@/lib/qreview";
import { fixCAAnswer } from "@/lib/feed";
import { copyImageToClipboard, imageBlob } from "@/lib/imgclip";
import { localInkCounts } from "@/lib/ink";
import { getSettings } from "@/lib/storage";
import { toggleDone, pruneDone } from "@/lib/answersdone";
import {
  getDoneSet as getNbDone, toggleDone as toggleNbDone, pruneDone as pruneNbDone,
} from "@/lib/mistakesdone";
import { getCounts, bumpCount, countMark } from "@/lib/qcounter";
import { useImageUrls } from "@/lib/wrongimages";
import { imagesFromEvent, isImageFile } from "@/lib/pasteimg";
import { saveQuiz, makeId, freeRegenerableSpace, storageUsage } from "@/lib/storage";
import { precacheShelf } from "@/lib/inkoffline";
import Markdown from "@/components/Markdown";
import ZoomableImage from "@/components/ZoomableImage";
import NotebookCard from "@/components/NotebookCard";

// Answers + Mistake Notebook — ab EK page.
//
// Pehle do the, aur dono ek hi kaam karte the: "jo question mujhse nahi bana wo
// dobara saamne aaye." Farq sirf itna tha ki question aaya kahan se —
//   * External Mock : mock test ka screenshot, wrong book mein (lib/wrongbook)
//     — tasveer + Gemini ka answer.
//   * PYQ / Quiz    : app ke andar quiz mein galat ya chhoda hua (lib/qreview)
//     — sawaal apne asli card mein khulta hai.
// Do page rakhne ka matlab tha do jagah dekhna aur dono jagah alag aadat. Ab
// upar ek dropdown hai: Sab / External Mock / PYQ-Quiz.
//
// Question YAHAN se andar nahi aate — na pehle aate the. Screenshot paste karo
// to wo wrong book mein jata hai, aur quiz ka galat question qreview khud
// bharta hai. Wo dono raaste bilkul waise ke waise hain.
//
// "Ho gaya" ke do alag store jaan-boojh kar bache hain (answersdone aur
// mistakesdone): dono ki pehchaan alag hai — mock record ki `id`, notebook ki
// `key` — aur purane mark waise ke waise chalte rehne chahiye.

const POLL_MS = 5000; // overlay ka naya question khuli hui page par bhi dikhe

// "Sab" chip. isSubject("") false deta hai, isliye URL mein ?subject=all —
// purane /answers link (bina param) ab bhi Maths hi kholte hain.
const ALL_SUBJ = { key: "", label: "Sab", icon: "\u{1F4DA}" };

// Kaunsi shelf dikhani hai.
const SOURCES = [
  { key: "all", label: "\u{1F4DA} Sab (dono)" },
  { key: "mock", label: "\u{1F5BC}️ External Mock (screenshot)" },
  { key: "pyq", label: "\u{1F4DD} PYQ / Quiz ke galat" },
];
const isSource = (k) => SOURCES.some((s) => s.key === k);

// Notebook ka subject wahi shabd hai jo poore app mein chalta hai. Jinka
// subject darj hi nahi hua (purane record, ya bina subject wala quiz) wo
// "Other" mein aate hain — mock shelf mein aisa kuch hota hi nahi.
const KNOWN = new Set(SUBJECTS.map((s) => s.key));
const bucketOf = (r) => (KNOWN.has(r.subject) ? r.subject : "other");
const labelOf = (k) =>
  k === "other" ? "Other" : (SUBJECTS.find((s) => s.key === k) || ALL_SUBJ).label;

function AnsCard({ rec, n, done, inkN, fresh, onToggle, onDelete, onOpen, onChange, prompt, onArm, onFlash, highlight }) {
  const { urls, missing } = useImageUrls(imagesOf(rec));
  const [lb, setLb] = useState(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState("");

  const a1 = cleanAnswer(rec.detail || rec.q?.solution || "");
  const a2 = cleanAnswer(rec.detail2 || "");

  const ping = (k) => { setCopied(k); setTimeout(() => setCopied(""), 1600); };

  // Gemini — question ki TASVEER clipboard par daal kar Gemini khol do.
  //
  // Image bhejna OCR se behtar hai: fractions aur figures jaise-ke-taise jaate
  // hain. Prompt saath mein nahi ja sakta (clipboard par ek waqt mein ek hi
  // cheez), isliye overlay wali chaal: yahan wapas aate hi prompt apne aap copy
  // ho jata hai — phir Gemini mein dobara paste kar do.
  const askGemini = async () => {
    const imgs = imagesOf(rec);
    if (imgs.length) {
      const ok = await copyImageToClipboard(() => imageBlob(imgs[0]));
      if (ok) {
        ping("gem");
        onArm();
        onFlash("🖼️ Image copy ho gayi — Gemini mein paste karo, phir yahan wapas aao (prompt apne aap copy hoga)");
      } else {
        onFlash("Is browser mein image copy support nahi — 📋 Prompt se kaam chalao");
      }
    }
    window.open("https://gemini.google.com/app", "_blank", "noopener,noreferrer");
    setPasteText("");
    setEditing(false);
    setPasteOpen(true);
  };

  const copyPrompt = async () => {
    try { await navigator.clipboard.writeText(prompt); ping("pr"); }
    catch { onFlash("Copy nahi hua — dobara try karo"); }
  };

  // 📥 = naya DUSRA answer (pehla fold mein bach jata hai). ✏️ = jo abhi dikh
  // raha hai usi ko sudharo.
  const openPaste = () => { setEditing(false); setPasteText(""); setPasteOpen(true); };
  const openEdit = () => { setEditing(true); setPasteText(shownDetail(rec)); setPasteOpen(true); };
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
      className={`ansp__card${done ? " is-done" : ""}${highlight ? " is-hit" : ""}${fresh ? " is-new" : ""}`}
      id={`ans-${rec.id}`}
    >
      <h2>
        {fresh ? "🆕 " : ""}{done ? "✅ " : ""}Question {n}
        <span className="ansp__qid">
          {" · "}🖼️ {rec.qid || "—"}{rec.at ? ` · ${dayLabel(rec.at)}` : ""}
        </span>
        {inkN > 0 && (
          <span className="ansp__ink" title="Is device par is question ki handwriting hai">✍️ {inkN}</span>
        )}
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

      <div className="ansp__acts">
        <label className="ansp__mark">
          <input type="checkbox" checked={done} onChange={() => onToggle(rec)} />
          Ho gaya
        </label>
        <button className="ansp__btn ansp__btn--go" onClick={() => onOpen(rec)}>✍️ Solve</button>
        <button className="ansp__btn" onClick={askGemini}>{copied === "gem" ? "🖼️ ✓" : "✨ Gemini"}</button>
        <button className="ansp__btn" onClick={copyPrompt}>{copied === "pr" ? "✓" : "📋 Prompt"}</button>
        <button className="ansp__btn" onClick={openPaste}>📥 Answer paste</button>
        {shownDetail(rec) && <button className="ansp__btn" onClick={openEdit}>✏️ Edit</button>}
        <button className="ansp__btn" onClick={() => onDelete(rec)}>🗑️ Delete</button>
      </div>

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

      {/* Dusra answer aane par wahi dikhta hai; pehla mitta nahi — fold mein
          bach jata hai, taaki dono padhe ja sakein. Overlay par bhi aisa hi tha. */}
      {a2 ? (
        <>
          <div className="ansp__answer"><Markdown>{a2}</Markdown></div>
          <details className="ansp__old">
            <summary>Pehla answer dekho</summary>
            <div className="ansp__answer"><Markdown>{a1}</Markdown></div>
          </details>
        </>
      ) : a1 ? (
        <div className="ansp__answer"><Markdown>{a1}</Markdown></div>
      ) : (
        <div className="ansp__answer ansp__answer--empty">Is question ka answer abhi nahi hai.</div>
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
  const urlSubject = sp.get("subject");
  const subject = isSubject(urlSubject)
    ? urlSubject
    : urlSubject === "all" || urlSubject === "other"
      ? (urlSubject === "other" ? "other" : "")
      : (isSubject(defaultSubject) ? defaultSubject : "");
  const urlSrc = sp.get("src");
  const src = isSource(urlSrc) ? urlSrc : defaultSrc;
  const urlQid = sp.get("qid");

  const [mock, setMock] = useState([]);      // wrong book (screenshot wale)
  const [nb, setNb] = useState([]);          // quiz/PYQ ke galat
  const [done, setDone] = useState(() => new Set());     // mock ke id
  const [nbDone, setNbDone] = useState(() => new Set()); // notebook ke key
  // Aaj kis subject ke kitne question hue (raat 3 baje reset) — mark karte hi
  // apne aap badhta hai, overlay ke counter jaisa hi hisaab.
  const [counts, setCounts] = useState({});
  // Ink badge — is DEVICE par kis question ki handwriting hai. Ink cloud par
  // nahi jati (lib/ink.js ka CLOUD switch), isliye ginti bhi device-local hai.
  const [inkCounts, setInkCounts] = useState({});
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
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

  // Kram ka `at` ek baar dekh kar JAMA kar lete hain.
  //
  // Notebook ka question andar hi answer karne par uska `at` abhi ka ho jata
  // hai — aur ye page har 5 second par dobara padhta hai. Bina is jamaav ke wo
  // card aapke padhte-padhte apni jagah se khisak kar sabse neeche chala jata.
  // Ab kram sirf page khulne par banta hai; nayi baari agli baar milegi.
  const atRef = useRef(new Map());
  const atOf = useCallback((r) => {
    const m = atRef.current;
    if (!m.has(r.uid)) m.set(r.uid, String(r.at || ""));
    return m.get(r.uid);
  }, []);

  const refresh = useCallback(() => {
    const mockRows = getWrongBook().map((r) => ({ ...r, __src: "mock", uid: `mock:${r.id}` }));
    // Notebook: sirf wahi jo galat hua aur abhi tak sudhra nahi. Sahi kar diya
    // to record mitta nahi (stats uspar tike hain), bas yahan nahi dikhta —
    // dobara galat hua to apne aap wapas aa jayega.
    const nbRows = getReview()
      .filter((r) => r.everWrong && !r.correct)
      .map((r) => ({ ...r, __src: "pyq", uid: `pyq:${r.key}` }));

    const ids = new Set(mockRows.map((r) => r.id));
    if (seenIds.current) {
      const added = [...ids].filter((id) => !seenIds.current.has(id));
      if (added.length) setFreshIds((prev) => new Set([...prev, ...added]));
    }
    seenIds.current = ids;

    setMock(mockRows);
    setNb(nbRows);
    setDone(pruneDone(ids));
    setNbDone(pruneNbDone(new Set(nbRows.map((r) => r.key))));
    setCounts(getCounts()); // 5s poll — 3 baje din badla to yahin pata chal jata hai
    setInkCounts(localInkCounts());
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

  const isDone = useCallback(
    (r) => (r.__src === "mock" ? done.has(r.id) : nbDone.has(r.key)),
    [done, nbDone],
  );

  const pool = useMemo(
    () => (src === "mock" ? mock : src === "pyq" ? nb : [...mock, ...nb]),
    [mock, nb, src],
  );

  const rows = useMemo(
    () => pool.filter((r) => (subject ? bucketOf(r) === subject : true)),
    [pool, subject],
  );

  // Kram: pehle bina-tick wale, phir tick wale; dono ke andar purana upar.
  // Yahi hisaab dono purane pages ka tha, isliye kisi bhi shelf ka kram badla
  // nahi — bas ab ek hi jagah lagta hai.
  const list = useMemo(() => {
    const qnum = (r) => {
      const m = /^q(\d+)$/.exec(r.qid || "");
      return m ? Number(m[1]) : 0;
    };
    const cmp = (a, b) => {
      const ta = atOf(a);
      const tb = atOf(b);
      if (ta !== tb) return ta < tb ? -1 : 1;
      return qnum(a) - qnum(b);
    };
    return [...rows.filter((r) => !isDone(r)).sort(cmp), ...rows.filter((r) => isDone(r)).sort(cmp)];
  }, [rows, isDone, atOf]);

  const doneCount = list.filter(isDone).length;

  // Chips par ginti — chuni hui shelf ki, taaki "Maths (12)" ka matlab wahi ho
  // jo neeche dikhega.
  const chipCounts = useMemo(() => {
    const c = { "": pool.length };
    for (const r of pool) c[bucketOf(r)] = (c[bucketOf(r)] || 0) + 1;
    return c;
  }, [pool]);

  const gotoFresh = () => {
    const first = list.find((r) => r.__src === "mock" && freshIds.has(r.id));
    if (first) document.getElementById(`ans-${first.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    setFreshIds(new Set());
  };

  // Subject ya shelf badli to nayi list ke saare records "naye" nahi hain —
  // ginti shuru se karo.
  useEffect(() => { seenIds.current = null; setFreshIds(new Set()); }, [subject, src]);

  const go = (next) => {
    const s = next.subject !== undefined ? next.subject : subject;
    const v = next.src !== undefined ? next.src : src;
    router.push(`/answers?subject=${s || "all"}&src=${v}`);
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
  const armed = useRef(false);
  const promptText = useMemo(() => {
    const st = getSettings();
    const perSubject = String((st.shortcutPrompts || {})[subject] || "").trim();
    return perSubject || String(st.geminiPrompt || "").trim()
      || "Is question ko solve karke sahi answer aur short steps do. Hinglish mein.";
  }, [subject]);

  useEffect(() => {
    const onFocus = async () => {
      if (!armed.current) return;
      armed.current = false;
      try {
        await navigator.clipboard.writeText(promptText);
        setFlash("📋 Prompt copy ho gaya — Gemini mein paste karke bhejo");
        setTimeout(() => setFlash(""), 4000);
      } catch { /* user 📋 Prompt button use kar lega */ }
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [promptText]);

  const flashNow = useCallback((msg) => {
    setFlash(msg);
    setTimeout(() => setFlash(""), 5000);
  }, []);

  const onToggle = (rec) => {
    const now = toggleDone(rec.id);
    setDone((prev) => {
      const next = new Set(prev);
      if (now) next.add(rec.id);
      else next.delete(rec.id);
      return next;
    });
    // Tick lagate hi aaj ka counter +1, hatate hi -1 (wahi question dobara
    // mark karo to ginti dobara nahi badhti — qcounter ids yaad rakhta hai)
    setCounts(countMark(rec.id, rec.subject || subject, now));
  };

  // Notebook ka mark alag store mein — tick lagate hi card apni jagah se hat
  // kar sabse neeche chala jata hai (list yahin dobara banti hai).
  const onToggleNb = (rec) => {
    const now = toggleNbDone(rec.key);
    setNbDone(getNbDone());
    setCounts(countMark(rec.key, bucketOf(rec), now));
  };

  const nudge = (delta) => {
    if (!subject || subject === "other") return;
    setCounts({ ...counts, [subject]: bumpCount(subject, delta) });
  };

  const onDelete = async (rec) => {
    if (!confirm("Ye question hata du? Iski writing aur image bhi jayegi.")) return;
    await removeWrong(rec.id);
    refresh();
  };

  const onDeleteNb = (rec) => {
    if (!confirm("Ye question notebook se hata du?")) return;
    removeReview(rec.key);
    refresh();
  };

  // Galat sanjoya hua answer theek karo: notebook ka record AUR jahan se aaya
  // (Current Affairs entry) dono.
  const onFixNb = (rec, oi) => { fixReviewAnswer(rec.key, oi); fixCAAnswer(rec.q, oi); refresh(); };

  // `d` (date filter) jaan-boojh kar NAHI bhej rahe.
  //
  // Wo purane /wrong page ka hissa tha. Yahan koi date filter hai hi nahi, par
  // link us question ki date bhej raha tha — jisse solve page ki list sirf USI
  // din tak sikud jati thi. Har question alag din ka ho to har baar "1/1", aur
  // timer khatam hone par agla question hota hi nahi tha.
  //
  // Bina `d` ke solve page poori shelf leta hai — wahi list, wahi kram jo yahan
  // dikh raha hai.
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

  // Is shelf ko tablet par utaar lo — images service worker ke cache mein,
  // handwriting IndexedDB mein. Sirf mock records ke paas image hai, isliye
  // ginti bhi unhi ki.
  const shelf = useMemo(() => list.filter((r) => r.__src === "mock"), [list]);
  const [dl, setDl] = useState("");
  const downloadOffline = async () => {
    if (!shelf.length) return;
    setDl("⬇️ 0%");
    try {
      const res = await precacheShelf(shelf, (n, total) => setDl(`⬇️ ${Math.round((n / total) * 100)}%`));
      setDl("");
      setFlash(
        res.images
          ? `✅ ${shelf.length} question offline ke liye tayar (${res.ink} par writing bhi).`
          : "✅ Writing utar gayi. Images offline tabhi chalengi jab app HTTPS par khuli ho."
      );
      setTimeout(() => setFlash(""), 6000);
    } catch {
      setDl("");
      setErr("Offline download nahi ho paya.");
    }
  };

  // 🎯 Practice sirf mock shelf ka — quiz player ko poore options chahiye, aur
  // notebook ke tasveer-wale question (image bank) usme theek se khulte nahi.
  // Unke liye already quiz ka apna raasta hai.
  const practiceable = shelf.filter(isPracticeable);
  const practice = () => {
    if (!practiceable.length) return;
    const quiz = {
      id: makeId(),
      title: `${active.icon} ${active.label} · Answers`,
      source: "wrongbook",
      createdAt: new Date().toISOString(),
      questions: practiceable.map((r) => r.q),
    };
    saveQuiz(quiz);
    router.push(`/quizzes/${quiz.id}`);
  };

  const chips = [ALL_SUBJ, ...SUBJECTS];

  return (
    <div className="ansp">
      {list.length > 0 && (
        <nav className="ansp__side">
          {list.map((r, i) => (
            <a
              key={r.uid}
              href={r.__src === "mock" ? `#ans-${r.id}` : `#mq-${i + 1}`}
              className={isDone(r) ? "is-done" : ""}
            >
              {i + 1}
            </a>
          ))}
        </nav>
      )}

      <div className="ansp__main">
        <div className="ansp__stats">
          {/* Aaj ka counter — mark karne se apne aap badhta hai, aur haath se
              bhi (mock ke question jo yahan nahi hain, wo bhi gin lo). */}
          <span className="cnt" title="Aaj is subject ke kitne question hue (raat 3 baje reset)">
            🔢 {active.label} aaj: {subject && subject !== "other"
              ? (counts[subject] || 0)
              : SUBJECTS.reduce((n, s) => n + (counts[s.key] || 0), 0)}
            {subject && subject !== "other" && (
              <>
                <button type="button" onClick={() => nudge(-1)} aria-label="ek kam">−</button>
                <button type="button" onClick={() => nudge(1)} aria-label="ek zyada">+</button>
              </>
            )}
          </span>
          <span className="tot">📊 Total: {list.length}</span>
          <span className="did">✅ Ho gaye: {doneCount}</span>
          <span className="left">⏳ Baaki: {list.length - doneCount}</span>
        </div>

        <h1>{active.icon} {active.label} Questions</h1>

        {/* Kaunsi shelf — screenshot wale mock, quiz ke galat, ya dono. */}
        <div className="ansp__acts ansp__acts--top">
          <label className="ansp__hint" htmlFor="ansp-src">Kahan se aaye:</label>
          <select
            id="ansp-src"
            className="input"
            style={{ maxWidth: 280 }}
            value={src}
            onChange={(e) => go({ src: e.target.value })}
          >
            {SOURCES.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
          <span className="ansp__hint">
            {src === "mock"
              ? "Mock test ke screenshot — tasveer aur uska answer."
              : src === "pyq"
                ? "Quiz/PYQ mein jo galat ya chhoda — sawaal apne asli card mein."
                : "Dono shelf ek saath — screenshot wale bhi, quiz ke galat bhi."}
          </span>
        </div>

        <div className="ansp__chips">
          {chips.map((s) => (
            <a
              key={s.key || "all"}
              href="#"
              onClick={(e) => { e.preventDefault(); go({ subject: s.key }); }}
              className={s.key === subject ? "is-active" : ""}
            >
              {s.icon} {s.label} ({chipCounts[s.key] || 0})
            </a>
          ))}
          {/* Sirf notebook mein aisa hota hai — jis question ka subject darj hi
              nahi hua. Chip tabhi dikhta hai jab aisa koi ho. */}
          {chipCounts.other > 0 && (
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); go({ subject: "other" }); }}
              className={subject === "other" ? "is-active" : ""}
            >
              📝 Other ({chipCounts.other})
            </a>
          )}
        </div>

        <div className="ansp__acts ansp__acts--top">
          <span className="ansp__hint">
            {busy ? "⏳ Image save ho rahi hai…" : "📥 Screenshot paste karo (Ctrl+V) — naya question add ho jayega"}
          </span>
          {practiceable.length > 0 && (
            <button className="ansp__btn" onClick={practice}>🎯 Practice ({practiceable.length})</button>
          )}
          {shelf.length > 0 && (
            <button className="ansp__btn" onClick={downloadOffline} disabled={!!dl}
              title="In questions ki images aur writing tablet par utaar lo">
              {dl || `⬇️ Offline (${shelf.length})`}
            </button>
          )}
          <button
            className="ansp__btn"
            onClick={() => {
              const bytes = freeRegenerableSpace();
              refresh();
              flashNow(bytes > 0 ? `🧹 ${(bytes / 1024).toFixed(0)} KB saf ho gayi` : "🧹 Abhi koi safai nahi hui");
            }}
            title="Purane quizzes aur feed caches hatao — save ke liye jagah banao"
          >
            🧹 Free space
          </button>
          {/* Baaki do shelf jo abhi alag hain — dono ek hi aadat ke hisse hain:
              kya galat hua, aur kya mehnga pada. */}
          <Link href="/slow" className="ansp__btn">⏱️ Slow Questions</Link>
          <Link href="/gemini" className="ansp__btn">✨ Gemini Answers</Link>
        </div>

        {/* Naya question list ke ANT mein judta hai, isliye wo screen se bahar
            ho sakta hai — ye patti batati hai ki aaya hai aur wahan le jaati hai. */}
        {freshIds.size > 0 && (
          <button className="ansp__newbar" onClick={gotoFresh}>
            ➕ {freshIds.size} naya question aaya — neeche dekho ↓
          </button>
        )}

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
          list.map((r, i) => (r.__src === "mock" ? (
            <AnsCard
              key={r.uid}
              rec={r}
              n={i + 1}
              done={done.has(r.id)}
              inkN={inkCounts[r.id] || 0}
              fresh={freshIds.has(r.id)}
              onToggle={onToggle}
              onDelete={onDelete}
              onOpen={onOpen}
              onChange={refresh}
              prompt={promptText}
              onArm={() => { armed.current = true; }}
              onFlash={flashNow}
              highlight={!!urlQid && r.qid === urlQid}
            />
          ) : (
            <NotebookCard
              key={r.uid}
              rec={r}
              n={i + 1}
              done={nbDone.has(r.key)}
              bucket={bucketOf(r)}
              subjectLabel={labelOf(bucketOf(r))}
              onToggle={() => onToggleNb(r)}
              onDelete={() => onDeleteNb(r)}
              onFix={(oi) => onFixNb(r, oi)}
            />
          )))
        )}
      </div>
    </div>
  );
}
