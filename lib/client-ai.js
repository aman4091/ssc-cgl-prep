// Client-side helpers to call our AI routes using saved settings.
import { getSettings, geminiActive } from "./storage";

async function post(path, payload) {
  const s = getSettings();
  if (!s.apiKey) {
    throw new Error("Add your DeepSeek API key in Settings first.");
  }
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
      apiKey: s.apiKey,
      model: s.model,
      baseUrl: s.baseUrl,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

function baseSubject(s) {
  return s && s.startsWith("pyq-") ? s.slice(4) : s;
}

export function askAI({ question, imageText, mode, subject }) {
  const subj = baseSubject(subject);
  const extra = {};
  if (mode === "shortcut" || mode === "ca") {
    const s = getSettings();
    if (geminiActive(s)) { extra.geminiApiKey = s.geminiApiKey; extra.geminiModel = s.geminiModel || "gemini-3-pro"; }
    if (mode === "shortcut") {
      const cp = (s.shortcutPrompts || {})[subj];
      if (cp && cp.trim()) extra.customPrompt = cp.trim();
    }
  }
  return post("/api/ask", { question, imageText, mode, subject: subj, ...extra }); // -> { answer }
}

export function generateSimilar(sample, count = 20, subject) {
  return post("/api/generate-similar", { sample, count, subject: baseSubject(subject) }); // -> { title, questions }
}

export function extractOws(text, forceType) {
  return post("/api/extract-ows", { text, forceType }); // -> { items: [{def, word, type}] }
}

// Large text (big PDFs / many pages): split into chunks and extract each so
// nothing gets truncated by the API's input cap. onProgress(chunkIdx, total, soFar).
export async function extractOwsChunked(text, forceType, onProgress, chunkSize = 12000) {
  const lines = String(text || "").split("\n");
  const chunks = [];
  let buf = "";
  for (const line of lines) {
    if (buf.length + line.length + 1 > chunkSize && buf.trim()) { chunks.push(buf); buf = ""; }
    buf += line + "\n";
  }
  if (buf.trim()) chunks.push(buf);
  if (chunks.length === 0) return { items: [] };

  let all = [];
  for (let i = 0; i < chunks.length; i++) {
    onProgress && onProgress(i + 1, chunks.length, all.length);
    try {
      const { items } = await extractOws(chunks[i], forceType);
      if (Array.isArray(items)) all = all.concat(items);
    } catch (e) { console.warn("ows chunk failed", e); }
  }
  return { items: all };
}

export function vocabDetail(word, def) {
  return post("/api/vocab-detail", { word, def }); // -> { meaning, trick, synonyms, antonyms, example }
}

export function extractRules(text, subject, chapterHint) {
  return post("/api/extract-rules", { text, subject, chapterHint }); // -> { chapter, rules[] }
}

export function ruleDetail(rule, subject, chapter) {
  return post("/api/rule-detail", { rule, subject, chapter }); // -> { detail, examples[], trap }
}

export function ruleQuiz(rules, subject, chapter, count = 10) {
  return post("/api/rule-quiz", { rules, subject, chapter, count }); // -> { title, questions }
}

// PDF/OCR text -> MCQ quiz (keeps the source options as-is when present).
export function generateQuizText(text) {
  return post("/api/generate-quiz", { text }); // -> { title, questions }
}

// Re-verify the correct answer of each question. Returns results aligned to the
// input order: [{ i, correct, confidence: "high"|"low", reason }]. Batched so big
// question sets don't overflow the response. onProgress(done, total).
export async function verifyQuiz(questions, onProgress, batchSize = 15) {
  const list = Array.isArray(questions) ? questions : [];
  if (list.length === 0) return { results: [] };
  const out = [];
  for (let start = 0; start < list.length; start += batchSize) {
    const batch = list.slice(start, start + batchSize);
    onProgress && onProgress(start, list.length);
    try {
      const { results } = await post("/api/verify-quiz", { questions: batch });
      for (const r of results || []) {
        if (r && Number.isInteger(r.i)) out.push({ ...r, i: r.i + start }); // map back to global index
      }
    } catch (e) { console.warn("verify batch failed", e); }
  }
  onProgress && onProgress(list.length, list.length);
  return { results: out };
}

// Large PDFs (100s of questions): split the text into chunks and extract each,
// so nothing gets truncated. onProgress(chunkIdx, totalChunks, soFar).
export async function generateQuizChunked(text, onProgress, chunkSize = 11000) {
  const lines = String(text || "").split("\n");
  const chunks = [];
  let buf = "";
  for (const line of lines) {
    if (buf.length + line.length + 1 > chunkSize && buf.trim()) { chunks.push(buf); buf = ""; }
    buf += line + "\n";
  }
  if (buf.trim()) chunks.push(buf);
  if (chunks.length === 0) return { title: "", questions: [] };

  let all = [];
  let title = "";
  for (let i = 0; i < chunks.length; i++) {
    onProgress && onProgress(i + 1, chunks.length, all.length);
    try {
      const data = await generateQuizText(chunks[i]);
      if (!title && data.title) title = data.title;
      if (Array.isArray(data.questions)) all = all.concat(data.questions);
    } catch (e) { console.warn("chunk failed", e); }
  }
  return { title, questions: all };
}

// One-liner GK book (Question | Answer table) -> MCQs: keeps the book's answer
// correct and fabricates 3 distractors for each row.
export function generateMcqFromPairs(text) {
  return post("/api/gk-to-mcq", { text }); // -> { title, questions }
}

// File/Blob -> { data: base64 (no data: prefix), mimeType } for Gemini inlineData.
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const res = String(r.result || "");
      const comma = res.indexOf(",");
      resolve({ data: comma >= 0 ? res.slice(comma + 1) : res, mimeType: file.type || "image/jpeg" });
    };
    r.onerror = () => reject(new Error("Image read failed"));
    r.readAsDataURL(file);
  });
}

// One-liner page IMAGES -> MCQs via Gemini vision (reads two-column tables far
// better than OCR). Batches a few images per call so output never truncates and
// dedupes repeated questions. onProgress(batchIdx, totalBatches, soFar).
export async function generateMcqFromImages(files, onProgress, perBatch = 3) {
  const s = getSettings();
  if (!geminiActive(s))
    throw new Error(
      s.geminiApiKey && s.geminiApiKey.trim()
        ? "Gemini abhi OFF hai — Settings mein wapas ON karo (image mode ke liye zaroori)."
        : "Image mode ke liye Settings mein Gemini API key add karo."
    );
  const list = Array.from(files || []);
  if (!list.length) return { title: "", questions: [] };

  const batches = [];
  for (let i = 0; i < list.length; i += perBatch) batches.push(list.slice(i, i + perBatch));

  const all = [];
  const seen = new Set();
  let title = "";
  for (let b = 0; b < batches.length; b++) {
    onProgress && onProgress(b + 1, batches.length, all.length);
    try {
      const images = await Promise.all(batches[b].map(fileToBase64));
      const res = await fetch("/api/gk-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images, geminiApiKey: s.geminiApiKey, geminiModel: s.geminiModel || "gemini-3-pro" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      if (!title && data.title) title = data.title;
      for (const q of Array.isArray(data.questions) ? data.questions : []) {
        const k = normQ(q.question);
        if (!k || seen.has(k)) continue;
        seen.add(k);
        all.push(q);
      }
    } catch (e) { console.warn("gk-image batch failed", e); }
  }
  return { title, questions: all };
}

// Big one-liner books: split text into SMALL chunks so every chunk's MCQ output
// fits inside the model's token limit (no truncation = full coverage). PDF text
// often puts a whole page on one line, so we hard-split by characters (breaking
// on the nearest whitespace) rather than by lines. Duplicate questions (chunk
// overlaps or facts repeated in the book) are dropped by normalized question text.
// onProgress(chunkIdx, totalChunks, soFar).
const normQ = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ") // strip punctuation/case/spacing differences
    .trim();

export async function generateMcqChunked(text, onProgress, chunkSize = 2200) {
  const src = String(text || "");
  const chunks = [];
  let pos = 0;
  while (pos < src.length) {
    let end = Math.min(pos + chunkSize, src.length);
    if (end < src.length) {
      // back up to the last whitespace so we don't cut a one-liner in half
      const ws = src.lastIndexOf(" ", end);
      const nl = src.lastIndexOf("\n", end);
      const brk = Math.max(ws, nl);
      if (brk > pos + chunkSize * 0.5) end = brk;
    }
    const piece = src.slice(pos, end).trim();
    if (piece) chunks.push(piece);
    pos = end;
  }
  if (chunks.length === 0) return { title: "", questions: [] };

  const all = [];
  const seen = new Set();
  let title = "";
  for (let i = 0; i < chunks.length; i++) {
    onProgress && onProgress(i + 1, chunks.length, all.length);
    try {
      const data = await generateMcqFromPairs(chunks[i]);
      if (!title && data.title) title = data.title;
      for (const q of Array.isArray(data.questions) ? data.questions : []) {
        const k = normQ(q.question);
        if (!k || seen.has(k)) continue; // skip duplicates already added
        seen.add(k);
        all.push(q);
      }
    } catch (e) { console.warn("gk chunk failed", e); }
  }
  return { title, questions: all };
}

// Current-Affairs: pull the important FACTS/notes (not questions) from PDF text.
export function extractNotes(text) {
  return post("/api/extract-notes", { text }); // -> { notes: [{ heading, points[] }] }
}

// Big current-affairs PDFs: chunk the text, extract notes from each part, then
// merge groups by heading (deduping identical points). onProgress(i, total, soFar).
export async function extractNotesChunked(text, onProgress, chunkSize = 11000) {
  const lines = String(text || "").split("\n");
  const chunks = [];
  let buf = "";
  for (const line of lines) {
    if (buf.length + line.length + 1 > chunkSize && buf.trim()) { chunks.push(buf); buf = ""; }
    buf += line + "\n";
  }
  if (buf.trim()) chunks.push(buf);
  if (chunks.length === 0) return { notes: [] };

  const byHeading = new Map(); // key -> { heading, points[], seen:Set }
  let count = 0;
  for (let i = 0; i < chunks.length; i++) {
    onProgress && onProgress(i + 1, chunks.length, count);
    try {
      const { notes } = await extractNotes(chunks[i]);
      for (const g of notes || []) {
        if (!g || !g.heading || !Array.isArray(g.points)) continue;
        const key = g.heading.trim().toLowerCase();
        let cur = byHeading.get(key);
        if (!cur) { cur = { heading: g.heading.trim(), points: [], seen: new Set() }; byHeading.set(key, cur); }
        for (const p of g.points) {
          const pt = String(p).trim();
          const pk = pt.toLowerCase();
          if (pt && !cur.seen.has(pk)) { cur.points.push(pt); cur.seen.add(pk); count++; }
        }
      }
    } catch (e) { console.warn("notes chunk failed", e); }
  }
  const notes = [...byHeading.values()].map(({ heading, points }) => ({ heading, points }));
  return { notes };
}

async function loadPdf(file) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();
  const buf = await file.arrayBuffer();
  return pdfjs.getDocument({ data: buf }).promise;
}

// Extract text from a PDF's text layer (works only for digital PDFs).
export async function extractPdfText(file) {
  const pdf = await loadPdf(file);
  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((it) => it.str).join(" ") + "\n";
  }
  return text;
}

// Render each PDF page to a PNG Blob (for showing theory/notes as images).
// onProgress({ page, total }). Returns [{ blob, name }].
export async function renderPdfToImages(file, onProgress, scale = 1.6) {
  const pdf = await loadPdf(file);
  const total = pdf.numPages;
  const base = (file.name || "pdf").replace(/\.pdf$/i, "");
  const out = [];
  for (let i = 1; i <= total; i++) {
    onProgress && onProgress({ page: i, total });
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext("2d");
    await page.render({ canvasContext: ctx, viewport }).promise;
    const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.85));
    if (blob) out.push({ blob, name: `${base} · p${i}` });
  }
  return out;
}

// Smart extractor: try the text layer first; if the PDF is scanned/handwritten
// (little or no text), render each page to a canvas and OCR it (Tesseract).
// onProgress({ phase: "text"|"ocr", page, total }).
export async function extractPdfTextSmart(file, onProgress, options = {}) {
  const pdf = await loadPdf(file);
  const total = pdf.numPages;

  // 1) text layer
  let text = "";
  if (!options.forceOcr) {
    for (let i = 1; i <= total; i++) {
      onProgress && onProgress({ phase: "text", page: i, total });
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((it) => it.str).join(" ") + "\n";
    }
    // Require a real text layer: enough total AND enough per page. A scanned PDF
    // often carries a sparse junk text-layer that would wrongly skip OCR.
    const enough = text.trim().length >= Math.max(200, total * 40);
    if (enough) return { text, ocr: false, pages: total };
  }

  // 2) scanned / handwritten -> OCR each page image
  const Tesseract = (await import("tesseract.js")).default;
  const worker = await Tesseract.createWorker("eng");
  let ocrText = "";
  // Big scanned books (60-70 pages) need a high cap. Default 100, override via options.
  const maxPages = Math.min(total, options.maxOcrPages || 100);
  try {
    for (let i = 1; i <= maxPages; i++) {
      onProgress && onProgress({ phase: "ocr", page: i, total: maxPages });
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2 }); // upscale for better OCR
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext("2d");
      await page.render({ canvasContext: ctx, viewport }).promise;
      const { data } = await worker.recognize(canvas);
      ocrText += (data.text || "") + "\n";
    }
  } finally {
    await worker.terminate();
  }
  return { text: ocrText, ocr: true, pages: maxPages };
}

// OCR an image file to text (Tesseract, English). onProgress(0..1) optional.
export async function ocrImage(file, onProgress) {
  const Tesseract = (await import("tesseract.js")).default;
  const { data } = await Tesseract.recognize(file, "eng", {
    logger: (m) => {
      if (onProgress && m.status === "recognizing text") onProgress(m.progress);
    },
  });
  return (data.text || "").trim();
}

// Read an image's text using the BEST available engine: Gemini vision when it's
// switched ON (far better on handwriting, 2-column & math), else tesseract OCR.
// Returns { text, engine }. onProgress(0..1) is only driven by the tesseract path.
export async function readImageText(file, onProgress) {
  const s = getSettings();
  if (geminiActive(s)) {
    try {
      onProgress && onProgress(0.15);
      const img = await fileToBase64(file);
      const res = await fetch("/api/vision-ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: [img], geminiApiKey: s.geminiApiKey, geminiModel: s.geminiModel || "gemini-3-pro" }),
      });
      const data = await res.json();
      if (res.ok) { onProgress && onProgress(1); return { text: (data.text || "").trim(), engine: "gemini" }; }
      console.warn("Gemini OCR failed, falling back to tesseract:", data.error);
    } catch (e) {
      console.warn("Gemini OCR error, falling back to tesseract:", e);
    }
  }
  const text = await ocrImage(file, onProgress);
  return { text, engine: "tesseract" };
}
