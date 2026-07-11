"use client";

// Renders an AI-provided SVG figure. Basic sanitize: drop <script> and on* handlers.
export default function Diagram({ svg }) {
  if (!svg || typeof svg !== "string" || !svg.includes("<svg")) return null;

  const clean = svg
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/javascript:/gi, "");

  return <div className="diagram" dangerouslySetInnerHTML={{ __html: clean }} />;
}
