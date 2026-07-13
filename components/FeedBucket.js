"use client";

import { useEffect, useState } from "react";
import { getEntries, addEntry } from "@/lib/feed";
import FeedEntry from "@/components/FeedEntry";

// ISO week string ("2024-W28") for the native <input type="week">.
function isoWeekValue(d) {
  const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = dt.getUTCDay() || 7;
  dt.setUTCDate(dt.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((dt - yearStart) / 86400000) + 1) / 7);
  return `${dt.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

// Renders one bucket (e.g. Current Affairs · Daily): a "new entry" form + list.
// dateMode: "date" | "month" | "week" | "year" show native/dropdown pickers;
// "text" a free label input.
export default function FeedBucket({ feed, bucket, dateMode = "text", datePlaceholder = "Label", note }) {
  const [entries, setEntries] = useState([]);
  const [date, setDate] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  const nowYear = (() => { try { return new Date().getFullYear(); } catch { return 2024; } })();
  const years = Array.from({ length: 12 }, (_, i) => String(nowYear + 1 - i)); // next year .. 10 yrs back

  const refresh = () => setEntries(getEntries(feed, bucket));
  useEffect(() => {
    refresh();
    try {
      const now = new Date();
      if (dateMode === "date") setDate(now.toISOString().slice(0, 10));
      else if (dateMode === "month") setDate(now.toISOString().slice(0, 7));
      else if (dateMode === "week") setDate(isoWeekValue(now));
      else if (dateMode === "year") setDate(String(now.getFullYear()));
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed, bucket]);

  const create = () => {
    const label = (date || "").trim();
    if (!label) return;
    addEntry(feed, bucket, { date: label, videoUrl: videoUrl.trim() });
    setVideoUrl("");
    if (dateMode === "text") setDate("");
    refresh();
  };

  return (
    <>
      <div className="glass-card">
        <h3>➕ New entry</h3>
        {note && <p className="muted mt-8" style={{ fontSize: "0.85rem" }}>{note}</p>}
        <div className="row mt-16" style={{ gap: 8, flexWrap: "wrap" }}>
          {dateMode === "date" || dateMode === "month" || dateMode === "week" ? (
            <input className="input" type={dateMode} style={{ width: "auto" }} value={date} onChange={(e) => setDate(e.target.value)} />
          ) : dateMode === "year" ? (
            <select className="select" style={{ width: "auto" }} value={date} onChange={(e) => setDate(e.target.value)}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
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
