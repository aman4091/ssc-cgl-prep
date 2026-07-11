// Client-side helpers to call our AI routes using saved settings.
import { getSettings } from "./storage";

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
  if (mode === "shortcut") {
    const s = getSettings();
    if (s.geminiApiKey) { extra.geminiApiKey = s.geminiApiKey; extra.geminiModel = s.geminiModel || "gemini-3-pro"; }
    const cp = (s.shortcutPrompts || {})[subj];
    if (cp && cp.trim()) extra.customPrompt = cp.trim();
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
