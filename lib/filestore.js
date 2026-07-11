// Tiny IndexedDB store for binary files (saved PDFs). localStorage can't hold
// multi-MB PDFs, so blobs live here; only lightweight metadata goes to localStorage.

const DB_NAME = "cgl-files";
const STORE = "files";

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB not available"));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveFile(id, blob) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(blob, id);
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getFile(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteFile(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Enumerate every stored file (for backup export).
export async function getAllFiles() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const out = [];
    const req = tx.objectStore(STORE).openCursor();
    req.onsuccess = () => {
      const c = req.result;
      if (c) { out.push({ id: c.key, blob: c.value }); c.continue(); }
      else resolve(out);
    };
    req.onerror = () => reject(req.error);
  });
}

// Open a saved file in a new browser tab.
export async function openFile(id) {
  const blob = await getFile(id);
  if (!blob) throw new Error("File nahi mili (shayad delete ho gayi).");
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener");
  // revoke a bit later so the tab has time to load
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
