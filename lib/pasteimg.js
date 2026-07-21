// Turn a pasted/dropped screenshot into something worth storing.
//
// A raw clipboard paste is a full-resolution PNG — a phone screenshot lands at
// 2-4 MB. Re-encoded to JPEG at a sane width it is 100-200 KB, which matters
// because these pile up in IndexedDB one question at a time.

const MAX_W = 1400;
const QUALITY = 0.82;

export function isImageFile(f) {
  return !!f && typeof f.type === "string" && f.type.startsWith("image/");
}

// Pull every image out of a paste/drop event. Returns [] when there is none,
// so callers can fall through to normal text pasting.
export function imagesFromEvent(e) {
  const dt = e.clipboardData || e.dataTransfer;
  if (!dt) return [];
  const out = [];
  for (const item of dt.items || []) {
    if (item.kind === "file") {
      const f = item.getAsFile();
      if (isImageFile(f)) out.push(f);
    }
  }
  // Drops expose files directly rather than through items on some browsers.
  if (!out.length) for (const f of dt.files || []) if (isImageFile(f)) out.push(f);
  return out;
}

// -> { blob, width, height }. Falls back to the original file if the canvas
// route fails (an animated/exotic format), so a paste is never silently lost.
export async function compressImage(file) {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_W / bitmap.width);
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    // Screenshots are usually opaque; a white base keeps PNG transparency from
    // turning black when it is flattened into JPEG.
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", QUALITY));
    if (!blob) return { blob: file, width: w, height: h };
    // A tiny sharp crop can compress worse as JPEG than it arrived — keep the
    // smaller of the two.
    return { blob: blob.size < file.size ? blob : file, width: w, height: h };
  } catch {
    return { blob: file, width: 0, height: 0 };
  }
}
