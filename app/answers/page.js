"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  SUBJECTS, getWrongBook, isSubject, imagesOf, dayKey, dayLabel,
  storeImages, addWrong, removeWrong, isPracticeable,
} from "@/lib/wrongbook";
import { getDoneSet, toggleDone, pruneDone } from "@/lib/answersdone";
import { useImageUrls } from "@/lib/wrongimages";
import { imagesFromEvent, isImageFile } from "@/lib/pasteimg";
import { saveQuiz, makeId } from "@/lib/storage";
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

// Gemini har jawab ke shuru mein apni hi file ka naam likh deta hai —
// "File **image_afc044.png** mein diye gaye question ka sahi answer..." — jo
// padhne mein kachra hai. Overlay ka storage.clean_answer() bhi aisi hi safai
// karta hai.
function cleanAnswer(s) {
  const t = String(s || "").replace(/\r/g, "").trim();
  return t.replace(/^[^\n]*image_[0-9a-f]{4,}\.(?:png|jpe?g|webp)[^\n]*\n+/i, "").trim();
}

// qid ka number (q093 -> 93). Overlay list ko qid ke hisaab se chadhte kram
// mein rakhta hai, isliye Question 1 hamesha wahi rehta hai. Bina qid wale
// (haath se paste kiye) records ke liye 0 — wo apne time se lagte hain.
const qnum = (r) => {
  const m = /^q(\d+)$/.exec(r.qid || "");
  return m ? Number(m[1]) : 0;
};

// Bina-mark wale pehle (chadhte kram mein), ✅ wale sabse neeche — mark karte hi
// question neeche chala jata hai aur agla upar aa jata hai. Bilkul overlay jaisa.
function order(items, done) {
  const cmp = (a, b) => {
    const na = qnum(a);
    const nb = qnum(b);
    if (na && nb) return na - nb;
    if (na || nb) return na ? -1 : 1; // qid wale pehle
    return (a.at || "") < (b.at || "") ? -1 : 1;
  };
  const pending = items.filter((r) => !done.has(r.id)).sort(cmp);
  const marked = items.filter((r) => done.has(r.id)).sort(cmp);
  return [...pending, ...marked];
}

function AnsCard({ rec, n, done, onToggle, onDelete, onOpen, highlight }) {
  const { urls, missing } = useImageUrls(imagesOf(rec));
  const [lb, setLb] = useState(null);
  const answer = cleanAnswer(rec.detail || rec.q?.solution || "");

  return (
    <div
      className={`ansp__card${done ? " is-done" : ""}${highlight ? " is-hit" : ""}`}
      id={`ans-${rec.id}`}
    >
      <h2>
        {done ? "✅ " : ""}Question {n}
        <span className="ansp__qid">
          {" ("}{rec.qid || "—"}{rec.at ? ` · ${dayLabel(rec.at)}` : ""}{")"}
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

      <div className="ansp__acts">
        <label className="ansp__mark">
          <input type="checkbox" checked={done} onChange={() => onToggle(rec)} />
          Ho gaya
        </label>
        <button className="ansp__btn ansp__btn--go" onClick={() => onOpen(rec)}>
          ✍️ Solve
        </button>
        <button className="ansp__btn" onClick={() => onDelete(rec)}>🗑️ Delete</button>
      </div>

      {answer ? (
        <div className="ansp__answer"><Markdown>{answer}</Markdown></div>
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
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState("");
  const [err, setErr] = useState("");
  const active = SUBJECTS.find((s) => s.key === subject) || SUBJECTS[0];

  // localStorage effect mein padho, render ke dauraan nahi — warna server khaali
  // HTML bhejta hai aur client bhara hua, aur React poora tree phenk deta hai.
  const refresh = useCallback(() => {
    const list = getWrongBook(subject);
    setItems(list);
    setDone(pruneDone(new Set(getWrongBook().map((r) => r.id))));
    setReady(true);
  }, [subject]);

  useEffect(() => {
    refresh();
    // Overlay har 5 second par naya question wrong book mein daalta hai
    // (OverlayInbox, layout mein mounted). Page khula ho to use bhi dikhna
    // chahiye bina reload ke — /new-words theek isi wajah se aisa karta hai.
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  const list = useMemo(() => order(items, done), [items, done]);
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

  const onToggle = (rec) => {
    const now = toggleDone(rec.id);
    setDone((prev) => {
      const next = new Set(prev);
      if (now) next.add(rec.id);
      else next.delete(rec.id);
      return next;
    });
  };

  const onDelete = async (rec) => {
    if (!confirm("Ye question hata du? Iski writing aur image bhi jayegi.")) return;
    await removeWrong(rec.id);
    refresh();
  };

  const onOpen = (rec) => {
    router.push(`/wrong/solve?subject=${rec.subject}&d=${encodeURIComponent(dayKey(rec.at))}&id=${rec.id}`);
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
        </div>

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
              onToggle={onToggle}
              onDelete={onDelete}
              onOpen={onOpen}
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
