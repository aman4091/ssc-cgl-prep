// 🎞️ PYQ notes wali theme ke font (Bricolage Grotesque heading, Literata
// padhne ka, JetBrains Mono chhote label) — Fact log aur Saare IMP par owner ne
// poori notes wali theme maangi. next/font server par chalta hai, isliye in
// pages ke layout.js ye class lagate hain; app/notes-theme.css inhe padhti hai.
import { Bricolage_Grotesque, Literata, JetBrains_Mono } from "next/font/google";

const display = Bricolage_Grotesque({ subsets: ["latin"], weight: ["600", "800"], variable: "--nt-display", display: "swap" });
const body = Literata({ subsets: ["latin"], weight: ["400", "600"], variable: "--nt-body", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["500"], variable: "--nt-mono", display: "swap" });

export const notesFontClass = `${display.variable} ${body.variable} ${mono.variable}`;
