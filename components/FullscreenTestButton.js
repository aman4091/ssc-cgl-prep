"use client";

import { useState } from "react";
import FullscreenRunner from "./FullscreenRunner";

// One-line entry point for the full-screen test view. Drop it into any page that
// already has a questions array — a PYQ chapter, a WAR subject, a saved quiz —
// and it renders a button that opens FullscreenRunner over the whole screen.
export default function FullscreenTestButton({
  questions = [],
  title = "Test",
  subject = "",
  timeLimitSec = 0,
  label = "⛶ Full screen",
  className = "btn btn--ghost btn--sm",
}) {
  const [open, setOpen] = useState(false);
  const n = questions.length;
  return (
    <>
      <button
        className={className}
        onClick={() => setOpen(true)}
        disabled={!n}
        title={n ? `Distraction-free test mode — ${n} question${n > 1 ? "s" : ""}, ek-ek karke full screen` : "No questions"}
      >
        {label}
      </button>
      {open && (
        <FullscreenRunner
          questions={questions}
          title={title}
          subject={subject}
          timeLimitSec={timeLimitSec}
          onExit={() => setOpen(false)}
        />
      )}
    </>
  );
}
