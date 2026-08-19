"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  SUBJECTS, getWrongBook, isSubject, imagesOf, dayKey, dayLabel,
  storeImages, addWrong, removeWrong, isPracticeable,
  setDetail2, setShownDetail, shownDetail, displayOrder, cleanAnswer,
} from "@/lib/wrongbook";
import { copyImageToClipboard, imageBlob } from "@/lib/imgclip";
import { localInkCounts } from "@/lib/ink";
import { getSettings } from "@/lib/storage";
import { getDoneSet, toggleDone, pruneDone } from "@/lib/answersdone";
import { getCounts, bumpCount, countMark } from "@/lib/qcounter";
import { useImageUrls } from "@/lib/wrongimages";
import { imagesFromEvent, isImageFile } from "@/lib/pasteimg";
import { saveQuiz, makeId, freeRegenerableSpace, storageUsage } from "@/lib/storage";
import { precacheShelf } from "@/lib/inkoffline";
import Markdown from "@/components/Markdown";
import ZoomableImage from "@/components/ZoomableImage";

// 📖 Answers — overlay (F:\over) ka answers page, ab site par.
//
// Wahan ye page sirf usi PC par khulta tha jahan Flask chal raha ho. Yahan wahi
// shakl hai (Catppuccin dark, kinare numbered rail, upar stats, phir image +
// answer ke cards) par data wrong book se aata hai — kyunki OverlayInbox pehle
// se har question ko wahin daal chuka hai: image R2 par aur Gemini ka answer
// `detail` mein. Isliye koi naya store nahi, koi import nahi, aur overlay se
// aaya har naya question yahan apne aap dikh jata hai.

const POLL_MS = 5000; // overlay ka naya question khuli hui page par bhi dikhe

// cleanAnswer (Gemini ke "File **image_abc.png** …" wale kachre ki safai) ab
// lib/wrongbook.js mein hai — solve page ko bhi wahi chahiye thi.

// Kram lib/wrongbook.js ke displayOrder() se aata hai — solve page bhi wahi
// use karta hai, warna dono lists alag-alag kram mein lag jati hain (aur ek
// baar lag chuki thi: yahan ka pehla question wahan aakhri nikla).

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

  // ✨ Gemini — question ki TASVEER clipboard par daal kar Gemini khol do.
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
          {" ("}{rec.qid || "—"}{rec.at ? ` · ${dayLabel(rec.at)}` : ""}{")"}
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

function AnswersInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const urlSubject = sp.get("subject");
  const subject = isSubject(urlSubject) ? urlSubject : "math";
  const urlQid = sp.get("qid");

  const [items, setItems] = useState([]);
  const [done, setDone] = useState(() => new Set());
  // 🔢 aaj kis subject ke kitne question hue (raat 3 baje reset) — mark karte
  // hi apne aap badhta hai, overlay ke counter jaisa hi hisaab.
  const [counts, setCounts] = useState({});
  // ✍️ badge — is DEVICE par kis question ki handwriting hai. Ink cloud par
  // nahi jati (lib/ink.js ka CLOUD switch), isliye ginti bhi device-local hai.
  const [inkCounts, setInkCounts] = useState({});
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");
  const [err, setErr] = useState("");
  const active = SUBJECTS.find((s) => s.key === subject) || SUBJECTS[0];

  // localStorage effect mein padho, render ke dauraan nahi — warna server khaali
  // HTML bhejta hai aur client bhara hua, aur React poora tree phenk deta hai.
  // Naye question ka pata — kyunki wo sabse NEECHE judta hai.
  //
  // Purana upar / naya neeche wala kram padhne ke liye theek hai, par uska ek
  // nuksaan hai: overlay se question aata hai to wo screen ke bahar, list ke ant
  // mein chupchaap jud jata hai. Isliye jo ids pehle nahi thi unhe yaad rakhte
  // hain — upar ek patti aa jati hai aur us card par nishaan lag jata hai.
  const seenIds = useRef(null);
  const [freshIds, setFreshIds] = useState(() => new Set());

  const refresh = useCallback(() => {
    const list = getWrongBook(subject);
    const ids = new Set(list.map((r) => r.id));
    if (seenIds.current) {
      const added = [...ids].filter((id) => !seenIds.current.has(id));
      if (added.length) setFreshIds((prev) => new Set([...prev, ...added]));
    }
    seenIds.current = ids;
    setItems(list);
    setDone(pruneDone(new Set(getWrongBook().map((r) => r.id))));
    setCounts(getCounts()); // 5s poll — 3 baje din badla to yahin pata chal jata hai
    setInkCounts(localInkCounts());
    setReady(true);
  }, [subject]);

  // Subject badla to nayi shelf ke saare records "naye" nahi hain — ginti
  // shuru se karo.
  useEffect(() => { seenIds.current = null; setFreshIds(new Set()); }, [subject]);

  const gotoFresh = () => {
    const first = list.find((r) => freshIds.has(r.id));
    if (first) document.getElementById(`ans-${first.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    setFreshIds(new Set());
  };

  useEffect(() => {
    refresh();
    // Overlay har 5 second par naya question wrong book mein daalta hai
    // (OverlayInbox, layout mein mounted). Page khula ho to use bhi dikhna
    // chahiye bina reload ke — /new-words theek isi wajah se aisa karta hai.
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const list = useMemo(() => displayOrder(items, done), [items, done]);
  const doneCount = list.filter((r) => done.has(r.id)).length;

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

  // ✨ Gemini ke saath prompt clipboard par nahi ja sakta (ek waqt mein ek hi
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
    // ✅ lagate hi aaj ka counter +1, hatate hi −1 (wahi question dobara
    // mark karo to ginti dobara nahi badhti — qcounter ids yaad rakhta hai)
    setCounts(countMark(rec.id, rec.subject || subject, now));
  };

  const nudge = (delta) => setCounts({ ...counts, [subject]: bumpCount(subject, delta) });

  const onDelete = async (rec) => {
    if (!confirm("Ye question hata du? Iski writing aur image bhi jayegi.")) return;
    await removeWrong(rec.id);
    refresh();
  };

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
  // bhi haath se question daala ja sake.
  const takeFiles = useCallback(async (files) => {
    const imgs = (files || []).filter(isImageFile);
    if (!imgs.length) return;
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
  // handwriting IndexedDB mein. Ye button pehle /wrong par tha.
  const [dl, setDl] = useState("");
  const downloadOffline = async () => {
    if (!list.length) return;
    setDl("⬇️ 0%");
    try {
      const res = await precacheShelf(list, (n, total) => setDl(`⬇️ ${Math.round((n / total) * 100)}%`));
      setDl("");
      setFlash(
        res.images
          ? `✅ ${list.length} question offline ke liye tayar (${res.ink} par writing bhi).`
          : "✅ Writing utar gayi. Images offline tabhi chalengi jab app HTTPS par khuli ho."
      );
      setTimeout(() => setFlash(""), 6000);
    } catch {
      setDl("");
      setErr("Offline download nahi ho paya.");
    }
  };

  const practiceable = list.filter(isPracticeable);
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

  return (
    <div className="ansp">
      {list.length > 0 && (
        <nav className="ansp__side">
          {list.map((r, i) => (
            <a key={r.id} href={`#ans-${r.id}`} className={done.has(r.id) ? "is-done" : ""}>
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
            🔢 {active.label} aaj: {counts[subject] || 0}
            <button type="button" onClick={() => nudge(-1)} aria-label="ek kam">−</button>
            <button type="button" onClick={() => nudge(1)} aria-label="ek zyada">+</button>
          </span>
          <span className="tot">📊 Total: {list.length}</span>
          <span className="did">✅ Ho gaye: {doneCount}</span>
          <span className="left">⏳ Baaki: {list.length - doneCount}</span>
        </div>

        <h1>{active.icon} {active.label} Questions</h1>

        <div className="ansp__chips">
          {SUBJECTS.map((s) => (
            <a
              key={s.key}
              href={`/answers?subject=${s.key}`}
              className={s.key === subject ? "is-active" : ""}
            >
              {s.icon} {s.label}
            </a>
          ))}
        </div>

        <div className="ansp__acts ansp__acts--top">
          <span className="ansp__hint">
            {busy ? "⏳ Image save ho rahi hai…" : "📥 Screenshot paste karo (Ctrl+V) — naya question add ho jayega"}
          </span>
          {practiceable.length > 0 && (
            <button className="ansp__btn" onClick={practice}>🎯 Practice ({practiceable.length})</button>
          )}
          {list.length > 0 && (
            <button className="ansp__btn" onClick={downloadOffline} disabled={!!dl}
              title="In questions ki images aur writing tablet par utaar lo">
              {dl || `⬇️ Offline (${list.length})`}
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
          <p className="ansp__empty">Yaha abhi koi question nahi hai.</p>
        ) : (
          list.map((r, i) => (
            <AnsCard
              key={r.id}
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
          ))
        )}
      </div>
    </div>
  );
}

export default function AnswersPage() {
  // useSearchParams ko Suspense chahiye, warna poora route static rendering se
  // bahar ho jata hai.
  return (
    <Suspense fallback={<div className="ansp"><div className="ansp__main" /></div>}>
      <AnswersInner />
    </Suspense>
  );
}
