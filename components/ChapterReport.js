"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  loadTaxonomy, chaptersFor, chapterLabel, buildReport, setTags,
  autoOn, setAutoOn,
} from "@/lib/qchapter";
import { tagChaptersByText, tagChapterByImage, visionReady } from "@/lib/client-ai";
import { imagesOf } from "@/lib/wrongbook";
import { imageBlob } from "@/lib/imgclip";
import { questionImage } from "@/lib/geminiask";

// 📊 Kis chapter mein sabse zyada galat ho raha hai.
//
// Board par jo bhi chhaanti abhi lagi hai (shelf + subject) — usi ke question
// yahan gine jaate hain. Isliye "Maths" chun kar report kholo to report bhi
// sirf maths ki hai.
//
// Chapter teen jagah se aata hai, isi kram mein (lib/qchapter):
//   quiz  — notebook ke question apni category le kar aate hain (ground truth)
//   me    — jo owner ne khud bataya
//   ai    — jo AI ne pehchana
// Owner ka bataya hua AI se upar hai aur AI use kabhi nahi badalta.
//
// Screenshot wale question ka chapter Gemini (vision) ke bina nahi nikalta —
// unme text hai hi nahi. Jinme paste kiya hua answer pada hai unka kaam sirf
// text se ho jata hai, jo sasta bhi hai aur DeepSeek se bhi chal jata hai.

// Ek call mein itne text wale question. Chhota kaam hai, par 700 char × 40 ek
// hi prompt mein bhejna model ko bhatka deta hai.
const TEXT_BATCH = 12;
// Ek baar ke button-dabaane mein itni se zyada tasveer nahi. Har tasveer ek
// alag vision call hai — bina had ke 400 screenshot ek hi click mein chale
// jaate.
const IMG_CAP = 40;

// Question ka padhne layak text. Mock ke paas sawaal nahi hota, par uska paste
// kiya hua answer hota hai — usme se chapter saaf pata chal jata hai.
export function textOf(r) {
  if (r.__src === "pyq") {
    const q = r.q || {};
    const opts = Array.isArray(q.options) ? q.options.filter(Boolean).join(" | ") : "";
    const full = `${q.question || ""} ${opts}`.trim();
    return full.length > 25 ? full : "";
  }
  const d = `${r.detail || ""} ${r.detail2 || ""}`.trim();
  return d.length > 25 ? d : "";
}

function imageOf(r) {
  if (r.__src === "mock") return imagesOf(r)[0] || null;
  return questionImage(r.q);
}

export default function ChapterReport({ records, chapterOf, subjectOf, onClose, onPick }) {
  const [tax, setTax] = useState(false);
  const [busy, setBusy] = useState("");
  const [prog, setProg] = useState(null); // { done, total }
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [auto, setAuto] = useState(true);
  const stop = useRef(false);

  useEffect(() => { loadTaxonomy().then(() => setTax(true)); }, []);
  useEffect(() => { setAuto(autoOn()); }, []);
  useEffect(() => () => { stop.current = true; }, []);

  const { rows, total, unknown } = useMemo(
    () => buildReport(records, chapterOf),
    [records, chapterOf],
  );

  const withText = useMemo(() => unknown.filter((r) => textOf(r)), [unknown]);
  const imgOnly = useMemo(() => unknown.filter((r) => !textOf(r) && imageOf(r)), [unknown]);
  const blind = unknown.length - withText.length - imgOnly.length;
  const canVision = visionReady();

  const run = useCallback(async () => {
    setErr(""); setNote(""); stop.current = false;
    const imgs = canVision ? imgOnly.slice(0, IMG_CAP) : [];
    const jobs = withText.length + imgs.length;
    if (!jobs) { setNote("Yahan AI ke karne layak kuch nahi bacha."); return; }

    setBusy("run");
    let done = 0;
    let got = 0;
    setProg({ done: 0, total: jobs });

    try {
      // Text wale — subject ke hisaab se, kyunki chapter ki list har subject ki
      // alag hai.
      const bySubject = new Map();
      for (const r of withText) {
        const s = subjectOf(r);
        if (!bySubject.has(s)) bySubject.set(s, []);
        bySubject.get(s).push(r);
      }
      for (const [subj, list] of bySubject) {
        const chapters = chaptersFor(subj).map((c) => c.slug);
        if (!chapters.length) { done += list.length; setProg({ done, total: jobs }); continue; }
        for (let i = 0; i < list.length; i += TEXT_BATCH) {
          if (stop.current) return;
          const chunk = list.slice(i, i + TEXT_BATCH);
          try {
            const tags = await tagChaptersByText({
              chapters,
              texts: chunk.map((r) => ({ id: r.uid, text: textOf(r) })),
            });
            const rowsOut = tags.filter((t) => t.chapter).map((t) => ({ uid: t.id, ch: t.chapter, by: "ai" }));
            if (rowsOut.length) { setTags(rowsOut); got += rowsOut.length; }
          } catch (e) {
            setErr(e.message);
            return;
          }
          done += chunk.length;
          setProg({ done, total: jobs });
        }
      }

      // Screenshot wale — ek-ek.
      for (const r of imgs) {
        if (stop.current) return;
        const chapters = chaptersFor(subjectOf(r)).map((c) => c.slug);
        if (chapters.length) {
          try {
            const blob = await imageBlob(imageOf(r));
            const tags = await tagChapterByImage({ chapters, id: r.uid, blob });
            const t = tags[0];
            if (t?.chapter) { setTags([{ uid: r.uid, ch: t.chapter, by: "ai" }]); got += 1; }
          } catch (e) {
            // Ek tasveer ka na hona poori run rokne layak nahi.
            console.warn("chapter tag failed", r.uid, e);
          }
        }
        done += 1;
        setProg({ done, total: jobs });
      }

      const left = jobs - got;
      setNote(
        `✅ ${got} question ka chapter mil gaya.` +
        (left > 0 ? ` ${left} par AI pakka nahi tha — neeche khud bata do.` : ""),
      );
    } finally {
      setBusy("");
      setProg(null);
    }
  }, [withText, imgOnly, canVision, subjectOf]);

  const assign = (r, ch) => { setTags([{ uid: r.uid, ch, by: "me" }]); };

  const max = rows[0]?.n || 1;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal glass chrep" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <h2 style={{ margin: 0 }}>📊 Chapter report</h2>
          <button className="btn btn--ghost btn--sm" onClick={onClose}>✕</button>
        </div>

        <p className="nt-meta" style={{ marginTop: 0 }}>
          Jo chhaanti abhi board par lagi hai, usi ke {records.length} galat question ka hisaab.
          Sabse upar wala chapter = sabse zyada kaam wahan.
        </p>

        {!tax ? (
          <p className="nt-meta">Chapter ki list load ho rahi hai…</p>
        ) : (
          <>
            {rows.length === 0 ? (
              <p className="nt-meta">
                Abhi kisi question ka chapter pata nahi hai. Neeche <b>🤖 AI se pata karo</b> dabao.
              </p>
            ) : (
              <div className="chrep__bars">
                {rows.map((r, i) => (
                  <button
                    key={r.ch}
                    className={`chrep__row${i < 3 ? " is-top" : ""}`}
                    onClick={() => onPick(r.ch)}
                    title="Board par sirf isi chapter ke question dikhao"
                  >
                    <span className="chrep__name">
                      {i === 0 ? "🥇 " : i === 1 ? "🥈 " : i === 2 ? "🥉 " : ""}{r.label}
                    </span>
                    <span className="chrep__bar"><i style={{ width: `${Math.round((r.n / max) * 100)}%` }} /></span>
                    <span className="chrep__n">{r.n}<small> · {r.pct}%</small></span>
                  </button>
                ))}
              </div>
            )}

            <div className="chrep__sum">
              <span>📚 {total} ka chapter pata hai</span>
              <span>❓ {unknown.length} ka nahi</span>
            </div>

            <div className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
              <button className="btn btn--sm" onClick={run} disabled={!!busy || !unknown.length}>
                {busy ? `⏳ ${prog ? `${prog.done}/${prog.total}` : "chal raha hai"}…` : "🤖 AI se pata karo"}
              </button>
              {busy && (
                <button className="btn btn--ghost btn--sm" onClick={() => { stop.current = true; }}>Rok do</button>
              )}
              <label className="row" style={{ gap: 6, alignItems: "center", fontSize: "0.84rem" }}>
                <input
                  type="checkbox"
                  checked={auto}
                  onChange={(e) => { setAuto(e.target.checked); setAutoOn(e.target.checked); }}
                />
                Naye question apne aap tag karo
              </label>
            </div>

            <p className="nt-meta" style={{ marginTop: 6 }}>
              {withText.length > 0 && <>📝 {withText.length} ka text se ho jayega. </>}
              {imgOnly.length > 0 && (canVision
                ? <>🖼️ {Math.min(imgOnly.length, IMG_CAP)} screenshot Gemini se padhe jayenge{imgOnly.length > IMG_CAP ? ` (baaki ${imgOnly.length - IMG_CAP} agli baar)` : ""}. </>
                : <>🖼️ {imgOnly.length} screenshot chhoot jayenge — unke liye Settings mein Gemini key chahiye. </>)}
              {blind > 0 && <>🚫 {blind} mein na text hai na tasveer — unhe khud batana padega.</>}
            </p>

            {err && <p className="ansp__err">{err}</p>}
            {note && <p className="ansp__flash">{note}</p>}

            {/* Jo AI se nahi hua — owner khud bata de. Ye "mujhse poochho" wala
                hissa hai; ek baar bata diya to wo pakka ho jata hai aur AI use
                dobara nahi chhedta. */}
            {unknown.length > 0 && (
              <details className="chrep__ask" open={rows.length === 0}>
                <summary>❓ {unknown.length} question — mujhe khud batana hai</summary>
                {unknown.slice(0, 30).map((r) => {
                  const subj = subjectOf(r);
                  const list = chaptersFor(subj);
                  const t = textOf(r);
                  return (
                    <div key={r.uid} className="chrep__askrow">
                      <span className="chrep__q" title={t}>
                        {r.__src === "mock" ? "🖼️ " : "📝 "}
                        {t ? t.slice(0, 110) : (r.qid || r.category || "screenshot")}
                      </span>
                      <select
                        className="input"
                        defaultValue=""
                        onChange={(e) => e.target.value && assign(r, e.target.value)}
                      >
                        <option value="">— chapter chuno —</option>
                        {list.map((c) => (
                          <option key={c.slug} value={c.slug}>{c.label || chapterLabel(c.slug)}</option>
                        ))}
                      </select>
                    </div>
                  );
                })}
                {unknown.length > 30 && (
                  <p className="nt-meta">…aur {unknown.length - 30}. Jo bata doge wo yahan se hat jayenge.</p>
                )}
              </details>
            )}
          </>
        )}
      </div>
    </div>
  );
}
