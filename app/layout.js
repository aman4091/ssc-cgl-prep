import { Suspense } from "react";
import { Inter } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";
import "./exam.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CurrentAffairsRush from "@/components/CurrentAffairsRush";
import FocusEnforcer from "@/components/FocusEnforcer";
import VocabPrefetch from "@/components/VocabPrefetch";
import SyncManager from "@/components/SyncManager";
import Toast from "@/components/Toast";
import OverlayInbox from "@/components/OverlayInbox";
import VocabFeeder from "@/components/VocabFeeder";
import StoreGate from "@/components/StoreGate";
import SWRegister from "@/components/SWRegister";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata = {
  title: "SSC CGL Pre — Prep Hub",
  description:
    "SSC CGL Prelims preparation — daily targets, quizzes, and auto PDF-to-quiz powered by AI.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "CGL Prep" },
};

// maximumScale/userScalable band isliye ki stylus se likhte waqt do ungliyan
// lag jayen to poora page zoom na ho jaye — zoom likhne wali surface ka apna
// hai. viewportFit cover se tablet ke rounded corners tak background jata hai.
export const viewport = {
  // Phone ka address bar / PWA ki patti. Do entry: browser wahi uthata hai jo
  // us waqt ki theme se milti hai. Toggle dabate hi lib/theme.js is tag ko
  // haath se bhi badal deta hai, kyunki `data-theme` prefers-color-scheme se
  // nahi bandha — wo user ki apni chuni hui cheez hai.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#141922" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

// Ek hi SKIN hai: exam wali (app/exam.css). Class <body> par lagti hai, aur
// tokens inherit hote hain, isliye poori site — notes, vocab, planner, PYQ —
// sab usi rang aur font mein.
//
// Uske do roop hain: din (safed) aur raat (dark). Raat wala roop exam.css ke
// aakhir mein hai aur wo SIRF --tb-* tokens ko doosre rang par mod deta hai —
// uska apna ek bhi rule nahi. Pehle dark mode isliye hataya gaya tha ki wo
// apna alag design system leke aata tha aur toggle dabate hi site doosri site
// lagne lagti thi; ab wo ho hi nahi sakta.
//
// Neeche wala chhota script <head> mein isliye hai ki nishaan pehle PAINT se
// pehle lag jaye. React ke andar karte to raat wale user ko har page par ek
// safed jhapki milti — aur wahi cheez sabse zyada chubhti hai.
export default function RootLayout({ children }) {
  return (
    /* Script <html> ka apna attribute badalta hai, isliye server ka HTML aur
       client ka HTML yahan alag honge — ye ISI element par expected hai. */
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('cgl.theme');" +
              "if(t==='dark')document.documentElement.setAttribute('data-theme','dark');" +
              // Address bar ka rang bhi yahin — bina-media wala meta sabse aage,
              // taaki wo upar wali do (OS ki pasand wali) se pehle mile.
              "if(t){var m=document.createElement('meta');m.id='tc-user';" +
              "m.name='theme-color';m.content=t==='dark'?'#141922':'#ffffff';" +
              "document.head.prepend(m)}}catch(e){}",
          }}
        />
      </head>
      <body className={`${inter.variable} examskin`}>
        <div className="bg-orbs" aria-hidden="true">
          <span className="orb orb--1" />
          <span className="orb orb--2" />
          <span className="orb orb--3" />
        </div>
        {/* Navbar contributes exactly one in-flow element — the menu <aside> —
            so on a wide screen .shell places it as the left column and main as
            the right. On a phone .shell is a plain block and the menu is the
            off-canvas drawer it has always been. */}
        {/* Bulky data ab IndexedDB (lib/bigstore) mein hai aur wo async hai.
            Menu/widgets bhi wahi data padhte hain, isliye poora app hydrate
            hone ke BAAD mount hota hai — warna pehli render par khaali list
            dikhti (aur sync khaali snapshot push kar sakta tha). */}
        <StoreGate>
          <div className="shell">
            {/* Navbar reads the query string to tell rows apart that share a path
                (the Current Affairs tabs), and useSearchParams needs a Suspense
                boundary or every page opts out of static rendering. */}
            <Suspense fallback={<aside className="drawer" />}>
              <Navbar />
            </Suspense>
            <main className="container">{children}</main>
          </div>
          <Footer />
          <CurrentAffairsRush />
          <FocusEnforcer />
          <VocabPrefetch />
          <SyncManager />
          <Toast />
          <SWRegister />
          <OverlayInbox />
          <VocabFeeder />
        </StoreGate>
      </body>
    </html>
  );
}
