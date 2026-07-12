// Full local backup / restore. Bundles all cgl.* localStorage keys AND the
// IndexedDB files (PDFs, note images) into one JSON file you can save to Google
// Drive and import on another device.
import { getAllFiles, saveFile } from "./filestore";

function blobToDataUrl(blob) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
}
async function dataUrlToBlob(url) {
  const res = await fetch(url);
  return res.blob();
}

function collectLocalStorage() {
  const ls = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith("cgl.")) ls[k] = localStorage.getItem(k);
  }
  return ls;
}

// Full backup (localStorage + all PDF/image files). Built as a STREAM of Blob
// parts so we never hold the whole JSON as one giant string — the old version
// kept every base64 file in memory AND a second stringified copy, which caused
// "out of memory" on phones. Now each file's base64 is pushed straight into its
// own Blob (browser offloads it to disk), so JS heap only ever holds one file.
export async function exportAll(onProgress) {
  const ls = collectLocalStorage();
  const files = await getAllFiles();
  const parts = [];
  parts.push(
    '{"app":"ssc-cgl-prep","version":1,"exportedAt":' + JSON.stringify(new Date().toISOString()) +
    ',"localStorage":' + JSON.stringify(ls) + ',"files":['
  );
  for (let i = 0; i < files.length; i++) {
    onProgress && onProgress(i + 1, files.length);
    const dataUrl = await blobToDataUrl(files[i].blob);
    const piece = (i ? "," : "") + '{"id":' + JSON.stringify(files[i].id) + ',"data":' + JSON.stringify(dataUrl) + "}";
    parts.push(new Blob([piece])); // move bytes to browser storage, free the JS string
  }
  parts.push("]}");
  return new Blob(parts, { type: "application/json" });
}

// Lightweight backup: only localStorage (quizzes, questions, mistakes, progress,
// settings) — NOT the original PDFs/rendered images. Small and never runs out of
// memory, so it's the safe way to move data phone <-> laptop.
export function exportDataOnly() {
  const payload = {
    app: "ssc-cgl-prep",
    version: 1,
    exportedAt: new Date().toISOString(),
    localStorage: collectLocalStorage(),
    files: [],
  };
  return new Blob([JSON.stringify(payload)], { type: "application/json" });
}

export async function importAll(obj, onProgress) {
  if (!obj || obj.app !== "ssc-cgl-prep") throw new Error("Not a valid backup file.");
  const ls = obj.localStorage || {};
  for (const k of Object.keys(ls)) localStorage.setItem(k, ls[k]);
  const files = obj.files || [];
  for (let i = 0; i < files.length; i++) {
    onProgress && onProgress(i + 1, files.length);
    const blob = await dataUrlToBlob(files[i].data);
    await saveFile(files[i].id, blob);
  }
}

// Trigger a browser download of a Blob.
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
