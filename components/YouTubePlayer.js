"use client";

import { parseYouTube, embedUrl } from "@/lib/youtube";

// Pure controlled player. Parent supplies `url`, a `start` (seconds) and a
// `playKey` — bumping playKey remounts the iframe so it (re)starts at `start`.
export default function YouTubePlayer({ url, start = 0, playKey = 0 }) {
  const parsed = parseYouTube(url);
  if (!parsed) {
    return <p className="muted" style={{ fontSize: "0.85rem" }}>Invalid YouTube link — enter a valid URL.</p>;
  }
  const s = start || parsed.start || 0;
  const src = embedUrl(parsed.id, s, s > 0);
  return (
    <div className="yt-wrap">
      <iframe
        key={playKey}
        src={src}
        title="lesson video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
