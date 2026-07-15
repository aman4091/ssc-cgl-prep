"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getChapter, getRules, addRules, subjectMeta,
  addVideo, removeVideo, getPdfs, addPdfMeta, removePdf,
  getNotes, addNoteMeta, removeNote, setNoteCaption,
  getChapterQuestions, addChapterQuestions, removeChapterQuestionByKey,
  chapterQuestionKey, updateChapterQuestion, clearChapterQuestions,
} from "@/lib/grammar";
import {
  extractRules, extractPdfTextSmart, ocrImage, ruleQuiz,
  renderPdfToImages, generateQuizText, generateQuizChunked, generateMcqChunked,
  generateMcqFromImages,
} from "@/lib/client-ai";
import { saveQuiz, makeId, getSettings, geminiActive } from "@/lib/storage";
import { gkTopicFor, loadGkTopic } from "@/lib/gkbank";
import { buildChapterQuiz } from "@/lib/chapterquiz";
import { saveFile, getFile, openFile } from "@/lib/filestore";
import RuleCard from "@/components/RuleCard";
import PyqQuestionCard from "@/components/PyqQuestionCard";
import YouTubePlayer from "@/components/YouTubePlayer";
import ZoomableImage from "@/components/ZoomableImage";

const GK_PAGE = 50; // how many ready-made questions to add per "show more"

export default function ChapterPage() {
  const { subject, chapterId } = useParams();
  const router = useRouter();
  const meta = subjectMeta(subject);
  const isEnglish = subject === "english"; // english uses grammar RULES; others use THEORY + QUESTIONS
  const isPyq = typeof subject === "string" && subject.startsWith("pyq-"); // PYQ quizzes get a 15min/25Q timer

  const [chapter, setChapter] = useState(null);
  const [rules, setRules] = useState([]);
  const [pdfs, setPdfs] = useState([]);
  const [notes, setNotes] = useState([]);
  const [noteUrls, setNoteUrls] = useState({});
  const [questions, setQuestions] = useState([]);
  const [noteFilter, setNoteFilter] = useState("");
  const [lbIndex, setLbIndex] = useState(null); // lightbox index into filteredNotes
  const [paperFilter, setPaperFilter] = useState(""); // filter questions by paper/shift

  // Ready-made bank for this chapter, if one ships with the app (see lib/gkbank).
  const [gkTopic, setGkTopic] = useState(null);
  const [gkQs, setGkQs] = useState([]);
  const [gkReady, setGkReady] = useState(false); // lookup done — tells "no bank" apart from "not looked yet"
  const [gkShown, setGkShown] = useState(GK_PAGE); // render in slices — 1,000+ cards at once janks

  const [manual, setManual] = useState("");
  const [paperInput, setPaperInput] = useState(""); // PYQ: which paper these questions are from
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [chapterQuizBusy, setChapterQuizBusy] = useState(false);

  const [vUrl, setVUrl] = useState("");
  const [vTitle, setVTitle] = useState("");
  const [play, setPlay] = useState({ url: "", start: 0, k: 0 });
  const [videoIdx, setVideoIdx] = useState(0);

  const pdfRef = useRef(null);
  const imgRef = useRef(null);
  const theoryPdfRef = useRef(null);
  const notesImgRef = useRef(null);
  const qImgRef = useRef(null);
  const olPdfRef = useRef(null);
  const olImgRef = useRef(null);

  const refresh = () => {
    const c = getChapter(chapterId);
    setChapter(c);
    setRules(getRules(chapterId));
    setPdfs(getPdfs(chapterId));
    setNotes(getNotes(chapterId));
    setQuestions(getChapterQuestions(chapterId));
    if (c?.videos?.length && !play.url) setPlay({ url: c.videos[0].url, start: 0, k: 0 });
  };
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [chapterId]);

  // Theory / Questions / GK Tricks split — "📝 Questions" opens straight into the questions view.
  const [view, setView] = useState("theory"); // "theory" | "questions" | "gk"
  const [showAdd, setShowAdd] = useState(false); // the "add content" card is hidden until asked
  const [showLinks, setShowLinks] = useState(false); // the "chapter links" card is hidden until asked
  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search).get("view");
    setView(p === "questions" || p === "gk" ? p : "theory");
  }, [chapterId]);
  const switchView = (v) => {
    setView(v);
    setGkShown(GK_PAGE);
    try {
      const url = new URL(window.location.href);
      if (v === "questions" || v === "gk") url.searchParams.set("view", v);
      else url.searchParams.delete("view");
      window.history.replaceState(null, "", url);
    } catch { /* ignore */ }
  };

  // Pull in the ready-made bank matching this chapter's name, if there is one.
  useEffect(() => {
    let alive = true;
    setGkTopic(null); setGkQs([]); setGkReady(false);
    if (!chapter?.name) return undefined;
    (async () => {
      const t = await gkTopicFor(subject, chapter.name);
      if (!alive) return;
      setGkTopic(t);
      if (t) {
        const qs = await loadGkTopic(t.slug);
        if (!alive) return;
        setGkQs(qs);
      }
      setGkReady(true);
    })();
    return () => { alive = false; };
  }, [subject, chapter?.name]);

  // Load note-image blobs -> object URLs for inline display
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const add = {};
      for (const n of notes) {
        if (noteUrls[n.id]) continue;
        try { const blob = await getFile(n.id); if (blob) add[n.id] = URL.createObjectURL(blob); } catch { /* ignore */ }
      }
      if (!cancelled && Object.keys(add).length) setNoteUrls((prev) => ({ ...prev, ...add }));
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes]);

  // keyboard nav for the notes lightbox
  useEffect(() => {
    if (lbIndex === null) return;
    const onKey = (e) => {
      if (e.key === "Escape") setLbIndex(null);
      else if (e.key === "ArrowRight") setLbIndex((i) => (i === null ? i : Math.min(filterNotes().length - 1, i + 1)));
      else if (e.key === "ArrowLeft") setLbIndex((i) => (i === null ? i : Math.max(0, i - 1)));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lbIndex, notes, noteFilter]);

  function filterNotes() {
    const f = noteFilter.trim().toLowerCase();
    return f ? notes.filter((n) => (n.caption || n.name || "").toLowerCase().includes(f)) : notes;
  }
  const saveCaption = (id, caption) => { setNoteCaption(chapterId, id, caption); refresh(); };

  const chapterName = chapter?.name || "";
  // Tag each question with its paper. Priority: typed paper field > the question's
  // own extracted source > a fallback source detected anywhere in the batch (so a
  // paper named once in a header carries across all chunks).
  const tagPaper = (qs) => {
    const manual = paperInput.trim();
    let fallback = manual;
    if (!fallback) {
      const found = (qs || []).find((q) => (q.source || "").trim());
      fallback = found ? found.source.trim() : "";
    }
    return (qs || []).map((q) => ({ ...q, paper: (manual || (q.source || "").trim() || fallback || "") }));
  };
  const requireKey = () => {
    if (!getSettings().apiKey) { setError("Add your DeepSeek API key in Settings first."); return false; }
    return true;
  };

  // ---------- ENGLISH: rules from PDF / image / text ----------
  const handlePdf = async (e) => {
    const file = e.target.files?.[0];
    if (pdfRef.current) pdfRef.current.value = "";
    if (!file || !requireKey()) return;
    setBusy(true); setError(""); setStatus("Saving PDF…");
    try {
      const pdfId = addPdfMeta(chapterId, file.name);
      await saveFile(pdfId, file);
      setStatus("Extracting text from PDF…");
      const { text, ocr } = await extractPdfTextSmart(file, (p) => {
        if (p.phase === "text") setStatus(`Reading PDF… page ${p.page}/${p.total}`);
        else setStatus(`📷 Scanned PDF — running OCR… page ${p.page}/${p.total}`);
      });
      if (!text || text.trim().length < 15) throw new Error("Couldn't extract text from this PDF. Try a better scan.");
      setStatus(`Extracting rules with AI…${ocr ? " (from OCR)" : ""}`);
      const { rules: extracted } = await extractRules(text, subject, chapterName);
      const added = addRules(chapterId, extracted);
      setStatus(`Done! Added ${added.length} rules. PDF saved too.`);
      refresh();
    } catch (err) { setError(err.message); setStatus(""); }
    finally { setBusy(false); }
  };

  const handleImages = async (e) => {
    const files = Array.from(e.target.files || []);
    if (imgRef.current) imgRef.current.value = "";
    if (!files.length || !requireKey()) return;
    setBusy(true); setError(""); setStatus("");
    try {
      let all = [];
      for (let i = 0; i < files.length; i++) {
        setStatus(`📷 Reading image ${i + 1}/${files.length} (OCR)…`);
        let text = "";
        try { text = await ocrImage(files[i]); } catch { /* skip */ }
        if (text && text.trim().length > 10) {
          setStatus(`Image ${i + 1}/${files.length}: extracting rules…`);
          try { const { rules: ex } = await extractRules(text, subject, chapterName); all = all.concat(ex); } catch (err) { console.warn(err); }
        }
      }
      if (all.length === 0) throw new Error("No rules could be extracted from these images.");
      const added = addRules(chapterId, all);
      setStatus(`Done! Added ${added.length} rules.`);
      refresh();
    } catch (err) { setError(err.message); setStatus(""); }
    finally { setBusy(false); }
  };

  const addManualLines = () => {
    const lines = manual.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return;
    addRules(chapterId, lines); setManual(""); refresh();
    setStatus(`${lines.length} rule add ho gaye.`);
  };
  const extractFromManual = async () => {
    if (!manual.trim() || !requireKey()) return;
    setBusy(true); setError(""); setStatus("Extracting rules with AI…");
    try {
      const { rules: ex } = await extractRules(manual, subject, chapterName);
      const added = addRules(chapterId, ex);
      setStatus(`Done! Added ${added.length} rules.`); setManual(""); refresh();
    } catch (err) { setError(err.message); setStatus(""); }
    finally { setBusy(false); }
  };

  // ---------- MATHS/GS/PYQ: theory pages (images) + questions ----------
  const handleTheoryPdf = async (e) => {
    const file = e.target.files?.[0];
    if (theoryPdfRef.current) theoryPdfRef.current.value = "";
    if (!file) return;
    if (!requireKey()) return;
    setBusy(true); setError(""); setStatus("Saving PDF…");
    try {
      const pdfId = addPdfMeta(chapterId, file.name);
      await saveFile(pdfId, file);

      // PYQ = questions only (NO theory pages). Other subjects also render theory images.
      let imgCount = 0;
      if (!isPyq) {
        const imgs = await renderPdfToImages(file, (p) => setStatus(`📄 Rendering theory pages… page ${p.page}/${p.total}`));
        for (const im of imgs) { const id = addNoteMeta(chapterId, im.name); await saveFile(id, im.blob); }
        imgCount = imgs.length;
      }

      setStatus("Reading PDF text…");
      const { text } = await extractPdfTextSmart(file, (p) => {
        if (p.phase === "text") setStatus(`Reading PDF… page ${p.page}/${p.total}`);
        else setStatus(`📷 Scanned PDF — running OCR… page ${p.page}/${p.total}`);
      });
      let qMsg = "";
      if (text && text.trim().length > 20) {
        const { questions: qs } = await generateQuizChunked(text, (i, n, sofar) =>
          setStatus(`Extracting questions… part ${i}/${n} (${sofar} so far)`));
        const added = addChapterQuestions(chapterId, tagPaper(qs));
        const dupes = qs.length - added;
        qMsg = `${added} new questions${dupes > 0 ? ` (${dupes} duplicates skipped)` : ""}`;
      } else {
        qMsg = "no text found for questions";
      }
      setStatus(`Done! ${isPyq ? "" : `${imgCount} theory pages · `}${qMsg}. PDF saved too.`);
      refresh();
    } catch (err) { setError(err.message); setStatus(""); }
    finally { setBusy(false); }
  };

  const handleNotesImages = async (e) => {
    const files = Array.from(e.target.files || []);
    if (notesImgRef.current) notesImgRef.current.value = "";
    if (!files.length) return;
    setBusy(true); setError(""); setStatus("Saving note images…");
    try {
      for (const f of files) { const id = addNoteMeta(chapterId, f.name || "note"); await saveFile(id, f); }
      setStatus(`Added ${files.length} note image(s).`);
      refresh();
    } catch (err) { setError(err.message); setStatus(""); }
    finally { setBusy(false); }
  };

  const handleQuestionImages = async (e) => {
    const files = Array.from(e.target.files || []);
    if (qImgRef.current) qImgRef.current.value = "";
    if (!files.length || !requireKey()) return;
    setBusy(true); setError(""); setStatus("");
    try {
      let added = 0;
      for (let i = 0; i < files.length; i++) {
        setStatus(`📷 Running OCR on image ${i + 1}/${files.length}…`);
        let text = ""; try { text = await ocrImage(files[i]); } catch { /* skip */ }
        if (text && text.trim().length > 15) {
          setStatus(`Image ${i + 1}/${files.length}: generating questions…`);
          try { const { questions: qs } = await generateQuizText(text); added += addChapterQuestions(chapterId, tagPaper(qs)); } catch (err) { console.warn(err); }
        }
      }
      if (added === 0) throw new Error("No questions could be created from these images. Try a clearer photo.");
      setStatus(`Done! Added ${added} questions.`);
      refresh();
    } catch (err) { setError(err.message); setStatus(""); }
    finally { setBusy(false); }
  };

  // ---------- ONE-LINER book (Question | Answer, NO options) -> MCQs ----------
  // For a one-liner GK book we FORCE per-page OCR: its text layer is usually
  // jumbled or covers only a couple pages, which silently drops the rest. Reading
  // every page as an image guarantees the whole book is captured. Then each row's
  // 3 wrong options are generated by AI (small chunks so nothing truncates).
  const geminiOn = () => geminiActive();

  const handleOneLinerPdf = async (e) => {
    const file = e.target.files?.[0];
    if (olPdfRef.current) olPdfRef.current.value = "";
    if (!file || !requireKey()) return;
    setBusy(true); setError(""); setStatus("Saving PDF…");
    try {
      const pdfId = addPdfMeta(chapterId, file.name);
      await saveFile(pdfId, file);

      let qs;
      if (geminiOn()) {
        // Best path: render each page to an image and let Gemini vision read the
        // two-column table directly (OCR jumbles the columns).
        setStatus("📄 Pages ko image bana raha hoon…");
        const imgs = await renderPdfToImages(file, (p) => setStatus(`Rendering page ${p.page}/${p.total}…`), 2);
        const pageFiles = imgs.map((im, i) => new File([im.blob], `page-${i + 1}.jpg`, { type: "image/jpeg" }));
        setStatus("👁️ Gemini se har page padh raha hoon…");
        ({ questions: qs } = await generateMcqFromImages(pageFiles, (i, n, sofar) =>
          setStatus(`Batch ${i}/${n} · ${sofar} questions ban chuke…`), 2));
      } else {
        // Fallback (no Gemini key): force per-page OCR + DeepSeek.
        setStatus("📷 Reading every page (OCR)… ye thoda time lega");
        const { text } = await extractPdfTextSmart(
          file, (p) => setStatus(`📷 OCR page ${p.page}/${p.total}…`), { forceOcr: true });
        if (!text || text.trim().length < 15) throw new Error("Is PDF se text nahi nikla. Saaf scan use karo.");
        setStatus("Building MCQs — har one-liner ke 3 options ban rahe hain…");
        ({ questions: qs } = await generateMcqChunked(text, (i, n, sofar) =>
          setStatus(`Part ${i}/${n} · ${sofar} questions ban chuke…`)));
      }
      if (!qs.length) throw new Error("Koi question nahi bana — dobara try karo.");
      const added = addChapterQuestions(chapterId, tagPaper(qs));
      const dupes = qs.length - added;
      setStatus(`Done! ${added} new questions${dupes > 0 ? ` (${dupes} duplicate skip)` : ""}. PDF saved too.`);
      refresh();
    } catch (err) { setError(err.message); setStatus(""); }
    finally { setBusy(false); }
  };

  const handleOneLinerImages = async (e) => {
    const files = Array.from(e.target.files || []);
    if (olImgRef.current) olImgRef.current.value = "";
    if (!files.length || !requireKey()) return;
    setBusy(true); setError(""); setStatus("");
    try {
      let qs;
      if (geminiOn()) {
        // Gemini vision reads the table straight from the image.
        setStatus("👁️ Gemini se images padh raha hoon…");
        ({ questions: qs } = await generateMcqFromImages(files, (i, n, sofar) =>
          setStatus(`Batch ${i}/${n} · ${sofar} questions ban chuke…`)));
      } else {
        // Fallback (no Gemini key): OCR + DeepSeek.
        let text = "";
        for (let i = 0; i < files.length; i++) {
          setStatus(`📷 OCR image ${i + 1}/${files.length}…`);
          try { text += (await ocrImage(files[i])) + "\n"; } catch { /* skip */ }
        }
        if (text.trim().length < 15) throw new Error("Images se text nahi nikla. Saaf photo lo.");
        setStatus("Building MCQs — har one-liner ke 3 options ban rahe hain…");
        ({ questions: qs } = await generateMcqChunked(text, (i, n, sofar) =>
          setStatus(`Part ${i}/${n} · ${sofar} questions ban chuke…`)));
      }
      if (!qs.length) throw new Error("Koi question nahi bana.");
      const added = addChapterQuestions(chapterId, tagPaper(qs));
      const dupes = qs.length - added;
      setStatus(`Done! Added ${added} questions${dupes > 0 ? ` (${dupes} duplicate skip)` : ""}.`);
      refresh();
    } catch (err) { setError(err.message); setStatus(""); }
    finally { setBusy(false); }
  };

  // paste image(s) from clipboard -> rules (english) or questions (others)
  const pasteImage = async () => {
    if (!requireKey()) return;
    try {
      if (!navigator.clipboard?.read) { setError("Paste button isn't supported — use Ctrl+V instead."); return; }
      const items = await navigator.clipboard.read();
      const files = [];
      for (const it of items) {
        const type = it.types.find((t) => t.startsWith("image/"));
        if (type) { const blob = await it.getType(type); files.push(new File([blob], "pasted.png", { type })); }
      }
      if (!files.length) { setError("No image found in the clipboard."); return; }
      if (isEnglish) await handleImages({ target: { files, value: "" } });
      else await handleQuestionImages({ target: { files, value: "" } });
    } catch (err) { setError("Paste failed: " + err.message); }
  };

  const practiceQuestions = () => {
    // Exam mode: random 25 with a 15-min timer, avoiding repeats across quizzes.
    const pool = paperFilter ? questions.filter((q) => (q.paper || q.source) === paperFilter) : null;
    if ((pool ? pool.length : questions.length) === 0) { setError("Add some questions first."); return; }
    const name = paperFilter ? `${chapterName} · ${paperFilter}` : chapterName;
    const quiz = buildChapterQuiz(chapterId, name, { pool: pool || undefined });
    if (!quiz) { setError("Add some questions first."); return; }
    router.push(`/quizzes/${quiz.id}`);
  };
  const gkPractice = () => {
    if (!gkQs.length) return;
    // Its own served-cycle key, so the ready-made bank and the chapter's own
    // questions don't consume each other's "not yet asked" pool.
    const quiz = buildChapterQuiz(`${chapterId}:gk`, `${gkTopic.label} · GK Tricks`, { pool: gkQs });
    if (quiz) router.push(`/quizzes/${quiz.id}`);
  };
  const clearQs = () => { if (confirm("Remove all questions from this chapter?")) { clearChapterQuestions(chapterId); refresh(); } };
  const delNote = async (id) => { if (!confirm("Remove this page/image?")) return; await removeNote(chapterId, id); refresh(); };

  // Ctrl+V paste images -> rules (english) or questions (others)
  useEffect(() => {
    const onPaste = (e) => {
      const files = [];
      for (const it of e.clipboardData?.items || []) {
        if (it.type?.startsWith("image/")) { const f = it.getAsFile(); if (f) files.push(f); }
      }
      if (files.length && !busy) {
        e.preventDefault();
        if (isEnglish) handleImages({ target: { files } });
        else handleQuestionImages({ target: { files } });
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busy, chapterId, chapterName, isEnglish]);

  // ---------- videos ----------
  const onAddVideo = () => {
    if (!vUrl.trim()) return;
    const c = addVideo(chapterId, vUrl, vTitle);
    setChapter(c); setVUrl(""); setVTitle("");
    if (!play.url) setPlay({ url: c.videos[0].url, start: 0, k: 0 });
  };
  const onRemoveVideo = (i) => {
    const c = removeVideo(chapterId, i);
    setChapter(c);
    if (videoIdx >= (c.videos?.length || 0)) setVideoIdx(0);
    setPlay(c.videos?.length ? { url: c.videos[0].url, start: 0, k: play.k + 1 } : { url: "", start: 0, k: 0 });
  };
  const selectVideo = (i) => { setVideoIdx(i); setPlay({ url: chapter.videos[i].url, start: 0, k: play.k + 1 }); };
  const seekTo = (t) => {
    const url = chapter?.videos?.[videoIdx]?.url || chapter?.videos?.[0]?.url;
    if (!url) { setError("Add a video to this chapter first."); return; }
    setPlay({ url, start: t, k: play.k + 1 });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ---------- english chapter quiz (AI rule quiz) ----------
  const startChapterQuiz = async () => {
    if (rules.length === 0) { setError("Add some rules first."); return; }
    if (!requireKey()) return;
    setChapterQuizBusy(true); setError("");
    try {
      const texts = rules.map((r) => r.text);
      const data = await ruleQuiz(texts, subject, chapterName, Math.min(15, Math.max(10, rules.length)));
      const quiz = {
        id: makeId(), title: data.title || `${chapterName} Quiz`, source: `${chapterName} · chapter`,
        createdAt: new Date().toISOString(), questions: data.questions,
      };
      saveQuiz(quiz);
      router.push(`/quizzes/${quiz.id}`);
    } catch (err) { setError(err.message); setChapterQuizBusy(false); }
  };

  const openPdf = async (id) => { try { await openFile(id); } catch (err) { setError(err.message); } };
  const delPdf = async (id) => { if (!confirm("Ye PDF delete kar du?")) return; await removePdf(chapterId, id); setPdfs(getPdfs(chapterId)); };

  if (!chapter) {
    return (
      <section className="hero">
        <p className="muted">Chapter not found. <Link href={`/study/${subject}`} className="link">← Chapters</Link></p>
      </section>
    );
  }

  const hasVideo = (chapter.videos?.length || 0) > 0;
  // Every subject has a Questions tab (PYQs get marked into english chapters too).
  // The other tab is Rules for english, Theory/Notes for the rest. A chapter that
  // matches a ready-made bank gets a third.
  // `wantsGk` (not gkView) hides the others while the bank loads, so the theory
  // section doesn't flash up before the GK questions arrive. Once the lookup has
  // finished with nothing, it drops back to theory — a ?view=gk link to a chapter
  // with no bank would otherwise sit on "Loading…" forever.
  const wantsGk = view === "gk" && (!gkReady || !!gkTopic);
  const gkView = wantsGk && !!gkTopic;
  const questionsView = view === "questions";
  const rulesView = isEnglish && !questionsView && !wantsGk;
  const theoryView = !isEnglish && !questionsView && !wantsGk;

  return (
    <>
      <section className="hero" style={{ paddingBottom: 8 }}>
        <div className="row between">
          <span className="hero__eyebrow">{meta.icon} {meta.short} · Chapter</span>
          <Link href={`/study/${subject}`} className="btn btn--ghost btn--sm">← Chapters</Link>
        </div>
        <div className="row between mt-8" style={{ flexWrap: "wrap", gap: 10 }}>
          <h1 className="hero__title" style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)" }}>
            {chapter.name}{" "}
            <span className="grad">
              · {wantsGk ? `${gkTopic?.count ?? gkQs.length} ready-made` : rulesView ? `${rules.length} rules` : `${questions.length} questions`}
            </span>
          </h1>
          {wantsGk ? (
            <button className="btn btn--primary" onClick={gkPractice} disabled={gkQs.length === 0}>
              🎯 Practice ({Math.min(25, gkQs.length)} · 15 min)
            </button>
          ) : rulesView ? (
            <button className="btn btn--primary" onClick={startChapterQuiz} disabled={chapterQuizBusy}>
              {chapterQuizBusy ? "Generating…" : "🎯 Chapter Quiz"}
            </button>
          ) : (
            <button className="btn btn--primary" onClick={practiceQuestions} disabled={questions.length === 0}>
              🎯 Practice ({Math.min(25, questions.length)} · 15 min)
            </button>
          )}
        </div>
      </section>

      {/* Theory / Questions tabs + Add toggle */}
      <section className="section" style={{ marginTop: 4 }}>
        <div className="row between" style={{ flexWrap: "wrap", gap: 10 }}>
          <div className="chips">
            <button className={`chip chip--btn chip--lg ${!questionsView && !wantsGk ? "is-active" : ""}`} onClick={() => switchView("theory")}>
              {isEnglish ? `📖 Rules${rules.length ? ` (${rules.length})` : ""}` : "📖 Theory"}
            </button>
            <button className={`chip chip--btn chip--lg ${questionsView ? "is-active" : ""}`} onClick={() => switchView("questions")}>
              📝 Questions{questions.length ? ` (${questions.length})` : ""}
            </button>
            {gkTopic && (
              <button className={`chip chip--btn chip--lg ${wantsGk ? "is-active" : ""}`} onClick={() => switchView("gk")}>
                🧠 GK Tricks ({gkTopic.count})
              </button>
            )}
          </div>
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <button className="btn btn--ghost btn--sm" onClick={() => setShowLinks((v) => !v)}>
              {showLinks ? "✕ Close links" : `🔗 Links${chapter.videos?.length ? ` (${chapter.videos.length})` : ""}`}
            </button>
            <button className="btn btn--primary btn--sm" onClick={() => setShowAdd((v) => !v)}>
              {showAdd ? "✕ Close" : isEnglish ? "➕ Add rules" : "➕ Add theory / questions"}
            </button>
          </div>
        </div>
      </section>

      {/* Embedded player — only alongside the rules (rule timestamps need it) */}
      {rulesView && hasVideo && (
        <section className="section" style={{ marginTop: 8 }}>
          <div className="glass-card">
            {chapter.videos.length > 1 && (
              <div className="chips" style={{ marginBottom: 12 }}>
                {chapter.videos.map((v, i) => (
                  <button key={i} className={`chip chip--btn ${i === videoIdx ? "is-active" : ""}`} onClick={() => selectVideo(i)}>
                    ▶ {v.title || `Video ${i + 1}`}
                  </button>
                ))}
              </div>
            )}
            <YouTubePlayer url={play.url || chapter.videos[0].url} start={play.start} playKey={play.k} />
            {isEnglish && <p className="hint" style={{ marginTop: 10 }}>💡 Set a timestamp on any rule with ⏱️, then press ▶ — the video plays from there.</p>}
          </div>
        </section>
      )}

      {/* ADD CONTENT — hidden until the button above is pressed */}
      {showAdd && (isEnglish ? (
        <section className="section" style={{ marginTop: 12 }}>
          <div className="glass-card">
            <h3>➕ Add rules</h3>
            <div className="row mt-16" style={{ gap: 10, flexWrap: "wrap" }}>
              <label className="btn btn--primary" style={{ opacity: busy ? 0.6 : 1, pointerEvents: busy ? "none" : "auto" }}>
                📄 PDF (save + extract)
                <input ref={pdfRef} type="file" accept="application/pdf" hidden onChange={handlePdf} />
              </label>
              <label className="btn btn--ghost" style={{ opacity: busy ? 0.6 : 1, pointerEvents: busy ? "none" : "auto" }}>
                📷 Image(s) → rules
                <input ref={imgRef} type="file" accept="image/*" multiple hidden onChange={handleImages} />
              </label>
              <button className="btn btn--ghost" onClick={pasteImage} disabled={busy}>📋 Paste image</button>
              <span className="muted" style={{ fontSize: "0.78rem", alignSelf: "center" }}>or <strong>Ctrl+V</strong> anywhere</span>
            </div>
            <div className="mt-16">
              <textarea className="textarea" rows={4} value={manual} onChange={(e) => setManual(e.target.value)}
                placeholder="Or type/paste rules here — one line = one rule. (For messy notes, use 'AI extract'.)" />
              <div className="row mt-8" style={{ gap: 8, flexWrap: "wrap" }}>
                <button className="btn btn--ghost btn--sm" onClick={addManualLines} disabled={!manual.trim() || busy}>➕ Lines as rules</button>
                <button className="btn btn--ghost btn--sm" onClick={extractFromManual} disabled={!manual.trim() || busy}>🤖 AI extract</button>
              </div>
            </div>
            {status && <p className="mt-16" style={{ color: "var(--accent-2)", fontSize: "0.9rem" }}>{status}</p>}
            {error && <p className="mt-16" style={{ color: "var(--danger)", fontSize: "0.9rem" }}>{error}</p>}
            <SavedPdfs pdfs={pdfs} openPdf={openPdf} delPdf={delPdf} />
          </div>
        </section>
      ) : (
        <section className="section" style={{ marginTop: 12 }}>
          <div className="glass-card">
            <h3>{isPyq ? "➕ Add Questions" : "➕ Add Theory + Questions"}</h3>
            <p className="muted mt-8" style={{ fontSize: "0.85rem" }}>
              {isPyq
                ? <>Upload a PDF or images — only the <strong>questions</strong> are extracted (no theory) and shown below in quiz form.</>
                : <>Upload a PDF — its <strong>pages show as theory images</strong>, and any <strong>questions</strong> inside appear below in quiz form (same options).</>}
            </p>
            <div className="row mt-16" style={{ gap: 10, flexWrap: "wrap" }}>
              <label className="btn btn--primary" style={{ opacity: busy ? 0.6 : 1, pointerEvents: busy ? "none" : "auto" }}>
                {isPyq ? "📄 PDF → questions" : "📄 PDF → theory + questions"}
                <input ref={theoryPdfRef} type="file" accept="application/pdf" hidden onChange={handleTheoryPdf} />
              </label>
              {!isPyq && (
                <label className="btn btn--ghost" style={{ opacity: busy ? 0.6 : 1, pointerEvents: busy ? "none" : "auto" }}>
                  📷 Notes / theory image(s)
                  <input ref={notesImgRef} type="file" accept="image/*" multiple hidden onChange={handleNotesImages} />
                </label>
              )}
              <label className="btn btn--ghost" style={{ opacity: busy ? 0.6 : 1, pointerEvents: busy ? "none" : "auto" }}>
                📷 Question image(s) → quiz
                <input ref={qImgRef} type="file" accept="image/*" multiple hidden onChange={handleQuestionImages} />
              </label>
              <button className="btn btn--ghost" onClick={pasteImage} disabled={busy}>📋 Paste image</button>
            </div>

            {/* One-liner book: Question | Answer (no options) -> AI builds MCQs */}
            <div className="mt-16" style={{ border: "1px dashed var(--glass-border)", borderRadius: 12, padding: 14 }}>
              <h4 style={{ fontSize: "0.95rem" }}>📖 One-liner book → MCQ</h4>
              <p className="muted mt-8" style={{ fontSize: "0.83rem" }}>
                Aisi book/photo jisme sirf <strong>Question | Answer</strong> ho (options nahi) — AI har row ke
                3 galat options khud banake proper MCQ bana dega. Gemini key set ho to <strong>har page ko
                vision se</strong> (image ki tarah) padha jaata hai — table theek se read hoti hai aur poori book cover hoti hai.
              </p>
              <div className="row mt-12" style={{ gap: 10, flexWrap: "wrap" }}>
                <label className="btn btn--primary btn--sm" style={{ opacity: busy ? 0.6 : 1, pointerEvents: busy ? "none" : "auto" }}>
                  📄 One-liner PDF → MCQ
                  <input ref={olPdfRef} type="file" accept="application/pdf" hidden onChange={handleOneLinerPdf} />
                </label>
                <label className="btn btn--ghost btn--sm" style={{ opacity: busy ? 0.6 : 1, pointerEvents: busy ? "none" : "auto" }}>
                  📷 One-liner image(s) → MCQ
                  <input ref={olImgRef} type="file" accept="image/*" multiple hidden onChange={handleOneLinerImages} />
                </label>
              </div>
            </div>

            {isPyq && (
              <div className="row mt-12" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span className="muted" style={{ fontSize: "0.8rem" }}>📄 Paper (optional):</span>
                <input className="input" style={{ flex: 1, minWidth: 200 }} placeholder="e.g. SSC CGL 2022 Tier-1 — this batch's questions are tagged with this paper" value={paperInput} onChange={(e) => setPaperInput(e.target.value)} />
              </div>
            )}
            <p className="hint" style={{ marginTop: 10 }}>
              {isPyq
                ? "💡 PYQ = questions only. Add the paper name above so each question is tagged (or if it's written in the PDF, AI picks it up automatically). Big PDFs (100s of questions) are read in parts."
                : "💡 Add GS notes here too (📷 Notes) — they'll show up in the chapter for reading. You can also paste a question image with Ctrl+V."}
            </p>
            {status && <p className="mt-16" style={{ color: "var(--accent-2)", fontSize: "0.9rem" }}>{status}</p>}
            {error && <p className="mt-16" style={{ color: "var(--danger)", fontSize: "0.9rem" }}>{error}</p>}
            <SavedPdfs pdfs={pdfs} openPdf={openPdf} delPdf={delPdf} />
          </div>
        </section>
      ))}

      {/* Chapter links — hidden until the 🔗 Links button is pressed */}
      {showLinks && (
      <section className="section">
        <div className="glass-card">
          <h3>🔗 Chapter links</h3>
          <p className="muted mt-8" style={{ fontSize: "0.85rem" }}>Add any link — YouTube, PDF, article, drive… har link ke aage <strong>Open link</strong> button hoga.{isEnglish ? " (YouTube link daalo to rules par ⏱️ timestamp bhi kaam karega.)" : ""}</p>
          <div className="row mt-16" style={{ gap: 8, flexWrap: "wrap" }}>
            <input className="input" style={{ flex: 2, minWidth: 200 }} placeholder="Paste any link (https://…)" value={vUrl} onChange={(e) => setVUrl(e.target.value)} />
            <input className="input" style={{ flex: 1, minWidth: 140 }} placeholder="Title (optional)" value={vTitle} onChange={(e) => setVTitle(e.target.value)} />
            <button className="btn btn--primary" onClick={onAddVideo} disabled={!vUrl.trim()}>Add link</button>
          </div>
          {hasVideo && (
            <div className="mt-16" style={{ display: "grid", gap: 6 }}>
              {chapter.videos.map((v, i) => (
                <div key={i} className="row between" style={{ background: "rgba(255,255,255,0.04)", padding: "8px 12px", borderRadius: 10, gap: 8 }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>🔗 {v.title || v.url}</span>
                  <div className="row" style={{ gap: 6, flexShrink: 0 }}>
                    <a href={v.url} target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">🔗 Open link</a>
                    <button className="btn btn--ghost btn--sm" onClick={() => onRemoveVideo(i)}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      )}

      {/* Theory / Notes gallery (non-english, not PYQ) */}
      {theoryView && !isPyq && notes.length > 0 && (() => {
        const shown = filterNotes();
        return (
          <section className="section">
            <div className="section__head">
              <div className="row between" style={{ alignItems: "flex-end", flexWrap: "wrap", gap: 10 }}>
                <div><h2>📖 Theory / Notes</h2><p>{notes.length} pages — click to read here (prev/next). You can add a topic label too.</p></div>
                <input className="input" style={{ maxWidth: 240 }} placeholder="🔎 Find a topic…" value={noteFilter} onChange={(e) => setNoteFilter(e.target.value)} />
              </div>
            </div>
            {shown.length === 0 ? (
              <div className="placeholder">No pages found for this topic.</div>
            ) : (
              <div className="notes-grid">
                {shown.map((n, i) => (
                  <div key={n.id} className="note-thumb">
                    <button className="note-thumb__img" onClick={() => setLbIndex(i)}>
                      {noteUrls[n.id] ? <img src={noteUrls[n.id]} alt={n.caption || n.name} /> : <div className="note-thumb__loading">loading…</div>}
                    </button>
                    <div className="note-thumb__cap">{n.caption || <span className="muted">+ topic (open)</span>}</div>
                    <button className="note-thumb__x btn btn--ghost btn--sm" onClick={() => delNote(n.id)}>✕</button>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })()}

      {/* Rules (english) */}
      {rulesView && (
        <section className="section">
          <div className="section__head">
            <h2>Rules</h2>
            <p>{rules.length ? `${rules.length} rules — tap Detail / Examples / Quiz on any of them.` : "No rules yet — add some above."}</p>
          </div>
          {rules.length === 0 ? (
            <div className="placeholder">No rules yet. Add from a PDF / image / text. 📥</div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {rules.map((r, i) => (
                <RuleCard key={r.id} rule={r} index={i} subject={subject} chapterName={chapterName} hasVideo={hasVideo} onSeek={seekTo} onChanged={refresh} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Questions (non-english) — only in the Questions view */}
      {questionsView && (() => {
        const papers = [...new Set(questions.map((q) => q.paper || q.source).filter(Boolean))];
        const shown = paperFilter ? questions.filter((q) => (q.paper || q.source) === paperFilter) : questions;
        return (
          <section className="section" id="questions">
            <div className="section__head">
              <div className="row between" style={{ alignItems: "flex-end", flexWrap: "wrap", gap: 10 }}>
                <div><h2>Questions</h2><p>{questions.length ? `${shown.length} question${shown.length !== 1 ? "s" : ""} — pick an option to see the answer, solution & tricks.` : "No questions yet — add from a PDF/image."}</p></div>
                {questions.length > 0 && (
                  <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                    {papers.length > 0 && (
                      <select className="select" style={{ width: "auto", padding: "8px 12px" }} value={paperFilter} onChange={(e) => setPaperFilter(e.target.value)}>
                        <option value="">All papers / shifts</option>
                        {papers.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    )}
                    <button className="btn btn--primary btn--sm" onClick={practiceQuestions}>🎯 Practice ({Math.min(25, shown.length)} · 15 min)</button>
                    <button className="btn btn--ghost btn--sm" onClick={clearQs}>🗑️ Delete all</button>
                  </div>
                )}
              </div>
            </div>
            {shown.length === 0 ? (
              <div className="placeholder">
                {questions.length
                  ? "No questions for this paper/shift."
                  : isEnglish
                    ? "No questions yet — PYQ page pe jaake koi question is chapter mein mark karo. 📥"
                    : "No questions yet. Add from a PDF or question image. 📥"}
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {shown.map((q) => (
                  <PyqQuestionCard
                    key={chapterQuestionKey(q)}
                    q={q}
                    index={questions.indexOf(q)}
                    subject={subject}
                    chapterName={chapterName}
                    chapterId={chapterId}
                    archiveOnAnswer
                    onDelete={() => { removeChapterQuestionByKey(chapterId, chapterQuestionKey(q)); refresh(); }}
                    onEdit={(nq) => { updateChapterQuestion(chapterId, chapterQuestionKey(q), nq); refresh(); }}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })()}

      {/* GK Tricks — the ready-made bank that ships with the app. Read-only: it
          lives in a static file, so there is nothing to edit or delete. */}
      {wantsGk && (
        <section className="section" id="gk">
          <div className="section__head">
            <div className="row between" style={{ alignItems: "flex-end", flexWrap: "wrap", gap: 10 }}>
              <div>
                <h2>🧠 GK Tricks</h2>
                <p>
                  {gkQs.length
                    ? `${gkQs.length} ready-made questions — pick an option to see the answer & explanation.`
                    : "Loading…"}
                </p>
              </div>
              {gkQs.length > 0 && (
                <button className="btn btn--primary btn--sm" onClick={gkPractice}>
                  🎯 Practice ({Math.min(25, gkQs.length)} · 15 min)
                </button>
              )}
            </div>
          </div>

          {gkTopic && (
            <p className="hint" style={{ marginBottom: 12 }}>
              📚 {gkTopic.source} · {gkTopic.note}
              {gkTopic.optionsGenerated && (
                <> Book mein sirf question, answer aur explanation hai — <strong>teen galat options AI ne likhe hain</strong>, book ke nahi.</>
              )}
            </p>
          )}

          {gkQs.length === 0 ? (
            <div className="placeholder">Loading ready-made questions… 📚</div>
          ) : (
            <>
              <div style={{ display: "grid", gap: 12 }}>
                {gkQs.slice(0, gkShown).map((q, i) => (
                  <PyqQuestionCard
                    key={q.id}
                    q={q}
                    index={i}
                    subject={subject}
                    chapterName={chapterName}
                    chapterId={chapterId}
                    archiveOnAnswer
                    fileToChapter
                  />
                ))}
              </div>
              {gkShown < gkQs.length && (
                <button className="btn btn--ghost btn--block mt-16" onClick={() => setGkShown((n) => n + GK_PAGE)}>
                  ▼ Show {Math.min(GK_PAGE, gkQs.length - gkShown)} more ({gkShown} / {gkQs.length})
                </button>
              )}
            </>
          )}
        </section>
      )}

      {/* Notes lightbox — in-place viewer with prev/next + topic label */}
      {lbIndex !== null && (() => {
        const shown = filterNotes();
        const cur = shown[lbIndex];
        if (!cur) return null;
        return (
          <div className="lightbox" onClick={() => setLbIndex(null)}>
            <button className="lightbox__x" onClick={() => setLbIndex(null)}>✕</button>
            <button className="lightbox__nav lightbox__nav--prev" disabled={lbIndex <= 0}
              onClick={(e) => { e.stopPropagation(); setLbIndex((i) => Math.max(0, i - 1)); }}>‹</button>
            <div className="lightbox__body" onClick={(e) => e.stopPropagation()}>
              {noteUrls[cur.id] ? <ZoomableImage key={cur.id} src={noteUrls[cur.id]} alt={cur.caption || cur.name} /> : <div className="note-thumb__loading">loading…</div>}
              <div className="lightbox__bar">
                <input className="input" style={{ flex: 1 }} placeholder="📝 Write this page's topic (e.g. 'Mughal Empire') — makes it easy to find"
                  defaultValue={cur.caption || ""} key={cur.id}
                  onBlur={(e) => saveCaption(cur.id, e.target.value)} />
                <span className="muted" style={{ fontSize: "0.8rem", whiteSpace: "nowrap" }}>{lbIndex + 1}/{shown.length}</span>
              </div>
            </div>
            <button className="lightbox__nav lightbox__nav--next" disabled={lbIndex >= shown.length - 1}
              onClick={(e) => { e.stopPropagation(); setLbIndex((i) => Math.min(shown.length - 1, i + 1)); }}>›</button>
          </div>
        );
      })()}
    </>
  );
}

function SavedPdfs({ pdfs, openPdf, delPdf }) {
  if (!pdfs.length) return null;
  return (
    <div className="mt-16">
      <span className="vd-label">📄 Saved PDFs</span>
      <div className="mt-8" style={{ display: "grid", gap: 6 }}>
        {pdfs.map((p) => (
          <div key={p.id} className="row between" style={{ background: "rgba(255,255,255,0.04)", padding: "8px 12px", borderRadius: 10 }}>
            <button className="link" onClick={() => openPdf(p.id)} style={{ textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📄 {p.name}</button>
            <button className="btn btn--ghost btn--sm" onClick={() => delPdf(p.id)}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}
