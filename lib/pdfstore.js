// 📄 Apni PDFs (owner): /pdfs par upload, tablet par stylus se har page par
// likho (✍️ Notes + ⭐ IMP, 👻 Trace mein page neeche) — app/pdfs.
//
// PDF SIRF TABLET PAR rehti hai (owner) — device ke IndexedDB mein
// (lib/filestore "pdf:<id>"), cloud par kabhi nahi. Sync sirf chhota record:
//   cgl.pdfs  { "<id>": { id, name, size, pages, thumb, at } }
// taaki PC par list + har page ka likha / ⭐ IMP dikhe (wo R2 par, ~10KB/page).
// Writing / IMP ka pata lib/impnotes mein: "pdfink:<id>:<page>" / "pdfimp:<id>:<page>".

import { storeGet, storeSet } from "./bigstore";
import { saveFile, getFile, deleteFile } from "./filestore";

const KEY = "cgl.pdfs";

function read() {
  if (typeof window === "undefined") return {};
  try { const v = JSON.parse(storeGet(KEY) || "{}"); return v && typeof v === "object" ? v : {}; } catch { return {}; }
}
function write(v) {
  storeSet(KEY, JSON.stringify(v));
  try { window.dispatchEvent(new CustomEvent("cgl:pdfs")); } catch { /* SSR */ }
}

export function listPdfs() { return Object.values(read()).sort((a, b) => String(b.at || "").localeCompare(String(a.at || ""))); }
export function getPdf(id) { return read()[id] || null; }

export const pdfInkKey = (id, p) => `pdfink:${id}:${p}`;
export const pdfImpKey = (id, p) => `pdfimp:${id}:${p}`;

let lib = null;
export async function pdfjs() {
  if (lib) return lib;
  const m = await import("pdfjs-dist");
  m.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  lib = m;
  return m;
}
export async function openPdfDoc(blob) {
  const m = await pdfjs();
  return m.getDocument({ data: await blob.arrayBuffer() }).promise;
}

// Ek page → tasveer (dataURL), chaudai `w` px tak.
export async function renderPage(doc, n, w = 1400, type = "image/jpeg") {
  const page = await doc.getPage(n);
  const v1 = page.getViewport({ scale: 1 });
  const scale = w / v1.width;
  const vp = page.getViewport({ scale });
  const c = document.createElement("canvas");
  c.width = Math.round(vp.width);
  c.height = Math.round(vp.height);
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, c.width, c.height);
  await page.render({ canvasContext: ctx, viewport: vp }).promise;
  return c.toDataURL(type, 0.85);
}

// Upload: sirf is device par copy + pehle page ki chhoti tasveer (record ke saath sync).
export async function addPdf(file, onProgress = () => {}) {
  const id = `pdf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  const blob = file.slice(0, file.size, "application/pdf");
  onProgress("💾 tablet par rakh raha…");
  await saveFile(`pdf:${id}`, blob);
  onProgress("📖 padh raha…");
  const doc = await openPdfDoc(blob);
  let thumb = "";
  try { thumb = await renderPage(doc, 1, 240, "image/jpeg"); } catch { /* bina tasveer */ }
  const all = read();
  all[id] = { id, name: String(file.name || "PDF").replace(/\.pdf$/i, ""), size: blob.size, pages: doc.numPages, thumb, at: new Date().toISOString() };
  write(all);
  return all[id];
}

// Is device par PDF hai? (PC par nahi hoti — wahan sirf likha / IMP.)
export async function hasPdfHere(id) { return !!(await getFile(`pdf:${id}`).catch(() => null)); }
export async function getPdfBlob(rec) {
  const local = await getFile(`pdf:${rec.id}`).catch(() => null);
  if (!local) throw new Error("PDF sirf tablet par hai — yahan sirf likha hua / IMP dikhega.");
  return local;
}

export async function removePdf(id) {
  const all = read();
  delete all[id];
  write(all);
  await deleteFile(`pdf:${id}`).catch(() => {});
}
