// Browser side of the R2 image store. Talks only to /api/r2 — the bucket keys
// live on the server, so nothing secret ever reaches a device (or the synced
// localStorage row).

let statusCache = null;

// { configured, publicBase } — cached, since the answer can't change without a
// redeploy and every paste would otherwise re-ask.
export async function r2Status() {
  if (statusCache) return statusCache;
  try {
    const res = await fetch("/api/r2");
    statusCache = res.ok ? await res.json() : { configured: false };
  } catch {
    statusCache = { configured: false };
  }
  return statusCache;
}

// -> public URL. Throws with a readable message so the caller can fall back to
// device-local storage and say why.
export async function uploadToR2(blob, filename = "paste.jpg") {
  const fd = new FormData();
  fd.append("file", blob, filename);
  const res = await fetch("/api/r2", { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.url) throw new Error(data.error || `Upload failed (${res.status})`);
  return data.url;
}

// Best-effort: a failed cleanup must never block deleting the question itself.
export async function deleteFromR2(url) {
  try {
    await fetch("/api/r2", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
  } catch { /* ignore */ }
}
