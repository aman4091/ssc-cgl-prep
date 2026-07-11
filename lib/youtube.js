// YouTube URL helpers — parse to video id + start time, embed url, format mm:ss.

// Accepts: youtu.be/ID, youtube.com/watch?v=ID, /embed/ID, /shorts/ID,
// with optional &t=90 / #t=1m30s. Returns { id, start } or null.
export function parseYouTube(url) {
  if (!url) return null;
  const u = String(url).trim();
  let id = "";
  let start = 0;

  const idMatch =
    u.match(/(?:youtu\.be\/)([\w-]{11})/) ||
    u.match(/[?&]v=([\w-]{11})/) ||
    u.match(/(?:embed\/|shorts\/)([\w-]{11})/);
  if (idMatch) id = idMatch[1];
  else if (/^[\w-]{11}$/.test(u)) id = u; // bare id

  if (!id) return null;

  const t = u.match(/[?&#]t=([^&#]+)/) || u.match(/[?&#]start=(\d+)/);
  if (t) start = parseTimeToSeconds(t[1]);

  return { id, start };
}

// "1m30s" | "90" | "1:30" -> seconds
export function parseTimeToSeconds(v) {
  if (v === undefined || v === null || v === "") return 0;
  const s = String(v).trim();
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  if (s.includes(":")) {
    const parts = s.split(":").map((x) => parseInt(x, 10) || 0);
    return parts.reduce((acc, n) => acc * 60 + n, 0);
  }
  let total = 0;
  const h = s.match(/(\d+)h/); if (h) total += parseInt(h[1], 10) * 3600;
  const m = s.match(/(\d+)m/); if (m) total += parseInt(m[1], 10) * 60;
  const sec = s.match(/(\d+)s/); if (sec) total += parseInt(sec[1], 10);
  return total || 0;
}

export function formatTime(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(ss)}` : `${m}:${pad(ss)}`;
}

export function embedUrl(id, start = 0, autoplay = false) {
  const params = new URLSearchParams({ rel: "0", modestbranding: "1" });
  if (start > 0) params.set("start", String(Math.floor(start)));
  if (autoplay) params.set("autoplay", "1");
  return `https://www.youtube.com/embed/${id}?${params.toString()}`;
}
