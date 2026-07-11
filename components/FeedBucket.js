"use client";

import { useEffect, useState } from "react";
import { getEntries, addEntry } from "@/lib/feed";
import FeedEntry from "@/components/FeedEntry";

// Renders one bucket (e.g. Current Affairs · Daily): a "new entry" form + list.
// dateMode: "date" shows a date picker (prefilled today); "text" a label input.
export default function FeedBucket({ feed, bucket, dateMode = "text", datePlaceholder = "Label", note }) {
  const [entries, setEntries] = useState([]);
  const [date, setDate] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  const refresh = () => setEntries(getEntries(feed, bucket));
  useEffect(() => {
    refresh();
    if (dateMode === "date") {
      try { setDate(new Date().toISOString().slice(0, 10)); } catch { /* ignore */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed, bucket]);

  const create = () => {
    const label = (date || "").trim();
    if (!label) return;
    addEntry(feed, bucket, { date: label, videoUrl: videoUrl.trim() });
    setVideoUrl("");
    if (dateMode !== "date") setDate("");
    refresh();
  };

  return (
    <>
      <div className="glass-card">
        <h3>➕ New entry</h3>
        {note && <p className="muted mt-8" style={{ fontSize: "0.85rem" }}>{note}</p>}
        <div className="row mt-16" style={{ gap: 8, flexWrap: "wrap" }}>
          {dateMode === "date" ? (
            <input className="input" type="date" style={{ width: "auto" }} value={date} onChange={(e) => setDate(e.target.value)} />
          ) : (
            <input className="input" style={{ flex: 1, minWidth: 160 }} placeholder={datePlaceholder} value={date} onChange={(e) => setDate(e.target.value)} />
          )}
          <input className="input" style={{ flex: 2, minWidth: 200 }} placeholder="YouTube video link (optional)" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
          <button className="btn btn--primary" onClick={create} disabled={!date.trim()}>Add</button>
        </div>
        <p className="hint" style={{ marginTop: 10 }}>💡 Create an entry, then add questions from a PDF/image and watch the video inside it.</p>
      </div>

      <div className="mt-16" style={{ display: "grid", gap: 14 }}>
        {entries.length === 0 ? (
          <div className="placeholder">No entries yet — create one above. 📥</div>
        ) : (
          entries.map((e) => <FeedEntry key={e.id} entry={e} onChanged={refresh} />)
        )}
      </div>
    </>
  );
}
