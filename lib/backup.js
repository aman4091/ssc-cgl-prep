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

export async function exportAll(onProgress) {
  const ls = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith("cgl.")) ls[k] = localStorage.getItem(k);
  }
  const files = await getAllFiles();
  const fileOut = [];
  for (let i = 0; i < files.length; i++) {
    onProgress && onProgress(i + 1, files.length);
    fileOut.push({ id: files[i].id, data: await blobToDataUrl(files[i].blob) });
  }
  const payload = {
    app: "ssc-cgl-prep",
    version: 1,
    exportedAt: new Date().toISOString(),
    localStorage: ls,
    files: fileOut,
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
