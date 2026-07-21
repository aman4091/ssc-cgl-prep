// Image preparation for OCR.
//
// The problem: in a quiz screenshot the correct option is drawn as white text on
// a solid green pill. Tesseract reads dark-on-light, and it picks ONE polarity
// for the whole image — the one the plain options use — so the highlighted line
// comes back empty. You lose precisely the line you wanted.
//
// What does NOT work (both tried and measured):
//   * Inverting the whole image. Tesseract already normalises global polarity,
//     so it reads back exactly the same text.
//   * Rebuilding the whole image on local contrast. It does recover the
//     highlighted line, but every stroke either blooms into a blob (hard
//     threshold) or turns hollow (small radius), and lines that used to read
//     perfectly start breaking. Trading one line for another is not a fix.
//
// What works: leave the image alone — the plain lines already read perfectly —
// and treat ONLY the coloured band as a separate little image. Cropped out, the
// pill is uniformly light-on-dark, so tesseract's own polarity detection gets it
// right. Then merge that text back in at the height it came from.

// Decode a blob/file into a canvas.
export async function toCanvas(file) {
  const bitmap = await createImageBitmap(file);
  const cv = document.createElement("canvas");
  cv.width = bitmap.width;
  cv.height = bitmap.height;
  cv.getContext("2d").drawImage(bitmap, 0, 0);
  bitmap.close?.();
  return cv;
}

// Row ranges that are painted a DIFFERENT colour from the rest of the page — a
// highlight pill, a coloured answer row, a banner.
//
// Measured against the page's own dominant background rather than against
// "white", so this works the same on a dark-mode screenshot: there the page is
// near-black and the green pill is still the odd one out. Text covers only a
// small share of a row, so ordinary lines never trip the threshold and a plain
// screenshot yields no bands at all.
export function colourBands(src, { minShare = 0.25, minRows = 12, pad = 6 } = {}) {
  const w = src.width, h = src.height;
  const cx = src.getContext("2d", { willReadFrequently: true });
  const d = cx.getImageData(0, 0, w, h).data;

  // Dominant colour = the fullest bucket of a coarse 4-bit-per-channel histogram.
  const hist = new Uint32Array(4096);
  for (let i = 0; i < d.length; i += 4) {
    hist[((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4)]++;
  }
  let top = 0;
  for (let k = 1; k < hist.length; k++) if (hist[k] > hist[top]) top = k;
  const bg = [((top >> 8) & 15) * 17, ((top >> 4) & 15) * 17, (top & 15) * 17];

  const hot = new Uint8Array(h);
  for (let y = 0; y < h; y++) {
    let odd = 0;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const dist = Math.abs(d[i] - bg[0]) + Math.abs(d[i + 1] - bg[1]) + Math.abs(d[i + 2] - bg[2]);
      if (dist > 110) odd++;
    }
    hot[y] = odd / w > minShare ? 1 : 0;
  }

  const bands = [];
  let start = -1;
  for (let y = 0; y <= h; y++) {
    if (y < h && hot[y]) { if (start < 0) start = y; }
    else if (start >= 0) {
      if (y - start >= minRows) {
        bands.push({ y0: Math.max(0, start - pad), y1: Math.min(h, y + pad) });
      }
      start = -1;
    }
  }
  // If most of the page qualifies then this is not a highlight — re-reading it
  // as one big "band" would just repeat the page pass.
  const covered = bands.reduce((s, b) => s + (b.y1 - b.y0), 0);
  return covered > h * 0.6 ? [] : bands;
}

// Crop a band out to its own canvas, upscaled — the crop is small, and OCR is
// markedly better on bigger text.
export function cropBand(src, band, scale = 2) {
  const w = src.width;
  const bh = band.y1 - band.y0;
  const out = document.createElement("canvas");
  out.width = Math.round(w * scale);
  out.height = Math.round(bh * scale);
  const ox = out.getContext("2d");
  ox.imageSmoothingEnabled = true;
  ox.imageSmoothingQuality = "high";
  ox.drawImage(src, 0, band.y0, w, bh, 0, 0, out.width, out.height);
  return out;
}

// {text, top} rows out of a tesseract result, whatever shape this version
// reports them in. `yOffset`/`yScale` map a crop's coordinates back to the page.
export function linesOf(data, { minConf = 40, yOffset = 0, yScale = 1 } = {}) {
  let raw = data?.lines;
  if (!Array.isArray(raw) || !raw.length) {
    raw = [];
    for (const b of data?.blocks || []) {
      for (const par of b.paragraphs || []) {
        for (const ln of par.lines || []) raw.push(ln);
      }
    }
  }
  if (!raw.length) {
    return String(data?.text || "")
      .split("\n")
      .map((t, i) => ({ text: t.trim(), top: yOffset + i, conf: 100 }))
      .filter((l) => l.text);
  }
  return raw
    .map((l) => ({
      text: String(l.text || "").trim(),
      top: yOffset + (l.bbox ? l.bbox.y0 : 0) * yScale,
      conf: typeof l.confidence === "number" ? l.confidence : 100,
    }))
    .filter((l) => l.text && l.conf >= minConf);
}

// Add band lines to the page lines, skipping anything already read at that
// height, and put the result back into reading order.
export function mergeLines(pageLines, bandLines, rowTol = 30) {
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const out = pageLines.slice();
  for (const cand of bandLines) {
    const key = norm(cand.text);
    if (key.length < 2) continue;
    const dup = out.some((l) => {
      if (Math.abs(l.top - cand.top) > rowTol) return false;
      const k = norm(l.text);
      return k === key || k.includes(key) || key.includes(k);
    });
    if (!dup) out.push(cand);
  }
  return out.sort((a, b) => a.top - b.top).map((l) => l.text);
}
