"use client";

// 🧪 Test ka parda — owner ke screenshot (Testbook / TCS exam window) jaisa:
//   upar: naam · beech mein test ka naam · daayen "Time Left" (peela dabba,
//         laal ghadi)
//   SYMBOLS · INSTRUCTIONS · OVERALL TEST SUMMARY (link)
//   PART-A (hara) · beech mein [Mark for Review] [Save & Next] [Submit Test]
//   "Question No. N" · safed dabba mein sawaal + option
//   daayen: "Total Questions Answered: [n]", ▶ section ka naam, neele number
//   (6 ki line), aur "PART-A Analysis" ki table (peeli ginti).
// Submit ke baad wahi parda natije ke saath (sahi hara / galat laal).
// Sawaal kaise dikhe wo bulane wala deta hai (PyqSets / AnswersSets).

import { useState } from "react";
import "./testpage.css";

const two = (n) => String(n).padStart(2, "0");
export const clock = (s) => `${two(Math.floor(Math.max(0, s) / 60))} : ${two(Math.max(0, s) % 60)}`;

// state(i): "ans" | "not" | "mark" | "new" (test) — "ok" | "bad" | "skip" | "ask" (natija)
export default function TestPage({
  title, section = "Test", n, at, onGo, numOf, state, left, done,
  answered, marked, tally, children, onMark, onNext, onSubmit, onBack, onQuit,
}) {
  const [pop, setPop] = useState("");
  const counts = { ans: 0, not: 0, mark: 0, new: 0 };
  if (!done) for (let i = 0; i < n; i++) counts[state(i)] = (counts[state(i)] || 0) + 1;
  return (
    <div className={`tbt${done ? " is-done" : ""}`}>
      <header className="tbt-head">
        <div className="tbt-brand">
          <b>📘 SSC CGL Pre</b>
          <small>{title}</small>
        </div>
        <div className="tbt-name">{title}</div>
        <div className="tbt-time">
          {done ? (
            <>
              <span>Score</span>
              <b>{tally.marks}</b>
            </>
          ) : (
            <>
              <span>Time Left</span>
              <b className={left <= 60 ? "is-low" : ""}>{clock(left)}</b>
            </>
          )}
        </div>
        {done
          ? <button type="button" className="tbt-x" onClick={onBack}>← Sets</button>
          : <button type="button" className="tbt-x" onClick={onQuit} title="Test chhodo">✕</button>}
      </header>

      <div className="tbt-body">
        <section className="tbt-main">
          <div className="tbt-links">
            <button type="button" className="is-sym" onClick={() => setPop("sym")}>SYMBOLS</button>
            <button type="button" className="is-ins" onClick={() => setPop("ins")}>INSTRUCTIONS</button>
            <button type="button" className="is-sum" onClick={() => setPop("sum")}>OVERALL TEST SUMMARY</button>
          </div>
          <div className="tbt-acts">
            <span className="tbt-part">PART-A</span>
            <span className="tbt-acts__mid">
              {done ? (
                <>
                  <button type="button" onClick={() => onGo(at - 1)} disabled={at <= 0}>Previous</button>
                  <button type="button" onClick={() => onGo(at + 1)} disabled={at >= n - 1}>Next</button>
                  <button type="button" onClick={onBack}>Back to Sets</button>
                </>
              ) : (
                <>
                  <button type="button" className="is-mark" onClick={onMark}>Mark for Review</button>
                  <button type="button" onClick={onNext}>Save &amp; Next</button>
                  <button type="button" onClick={onSubmit}>Submit Test</button>
                </>
              )}
            </span>
          </div>
          <div className="tbt-qno">Question No. {numOf(at)}</div>
          <div className="tbt-qbox">{children}</div>
        </section>

        <aside className="tbt-side">
          <div className="tbt-total">
            {done
              ? <>Correct: <b>{tally.right}</b> &nbsp; Wrong: <b>{tally.wrong}</b></>
              : <>Total Questions Answered: <b>{answered}</b></>}
          </div>
          <div className="tbt-sec"><i>▶</i><b>{section}</b></div>
          <div className="tbt-grid">
            {Array.from({ length: n }, (_, i) => (
              <button key={i} type="button" className={`is-${state(i)}${i === at ? " is-cur" : ""}`} onClick={() => onGo(i)}>{numOf(i)}</button>
            ))}
          </div>
          <table className="tbt-ana">
            <thead><tr><th colSpan={2}>PART-A Analysis</th></tr></thead>
            <tbody>
              {done ? (
                <>
                  <tr><td>Correct</td><td><b>{tally.right}</b></td></tr>
                  <tr><td>Wrong</td><td><b>{tally.wrong}</b></td></tr>
                  <tr><td>Skipped</td><td><b>{tally.skipped}</b></td></tr>
                  {tally.ask ? <tr><td>Khud jaancho</td><td><b>{tally.ask}</b></td></tr> : null}
                  <tr><td>Time taken</td><td><b>{tally.time}</b></td></tr>
                </>
              ) : (
                <>
                  <tr><td>Answered</td><td><b>{answered}</b></td></tr>
                  <tr><td>Not Answered</td><td><b>{n - answered}</b></td></tr>
                  <tr><td>Mark for Review</td><td><b>{marked}</b></td></tr>
                </>
              )}
            </tbody>
          </table>
        </aside>
      </div>

      {pop ? (
        <div className="tbt-pop" onClick={() => setPop("")}>
          <div className="tbt-pop__box" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="tbt-pop__x" onClick={() => setPop("")}>✕</button>
            {pop === "sym" ? (
              <>
                <h3>Symbols</h3>
                <p><span className="tbt-sw is-new">1</span> Not visited</p>
                <p><span className="tbt-sw is-not">1</span> Not answered</p>
                <p><span className="tbt-sw is-ans">1</span> Answered</p>
                <p><span className="tbt-sw is-mark">1</span> Marked for review</p>
                <p><span className="tbt-sw is-ok">1</span> Correct · <span className="tbt-sw is-bad">1</span> Wrong (result)</p>
              </>
            ) : pop === "ins" ? (
              <>
                <h3>Instructions</h3>
                <p>25 sawaal · 15 minute. Sahi +2, galat −0.5, chhoda 0.</p>
                <p>Option chuno, phir <b>Save &amp; Next</b>. Baad mein dekhna ho to <b>Mark for Review</b>.</p>
                <p>Waqt khatam hote hi test apne aap submit ho jayega.</p>
              </>
            ) : (
              <>
                <h3>Overall Test Summary</h3>
                <table className="tbt-ana">
                  <tbody>
                    {done ? (
                      <>
                        <tr><td>Correct</td><td><b>{tally.right}</b></td></tr>
                        <tr><td>Wrong</td><td><b>{tally.wrong}</b></td></tr>
                        <tr><td>Skipped</td><td><b>{tally.skipped}</b></td></tr>
                        <tr><td>Score</td><td><b>{tally.marks}</b></td></tr>
                      </>
                    ) : (
                      <>
                        <tr><td>Total</td><td><b>{n}</b></td></tr>
                        <tr><td>Answered</td><td><b>{counts.ans + counts.mark}</b></td></tr>
                        <tr><td>Not Answered</td><td><b>{counts.not}</b></td></tr>
                        <tr><td>Not Visited</td><td><b>{counts.new}</b></td></tr>
                        <tr><td>Marked for Review</td><td><b>{marked}</b></td></tr>
                      </>
                    )}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
