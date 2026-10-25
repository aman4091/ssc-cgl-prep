// 🎞️ PYQ notes wali theme ke font (Bricolage Grotesque heading, Literata
// padhne ka, JetBrains Mono chhote label). Pehle next/font se aate the — par
// Vercel par Bricolage ka next/font build tod deta tha ("next/font/google
// queries have exactly one entry"). Ab app/layout.js Google Fonts ka seedha
// <link> lagata hai, aur ye class wahi CSS variable deti hai jo pages padhte hain.
export const NOTES_FONT_HREF = "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Literata:opsz,wght@7..72,400;7..72,600&family=JetBrains+Mono:wght@500&display=swap";
export const notesFontClass = "nt-fonts";
