import { Suspense } from "react";
import { Inter } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";
import "./exam.css";
import "./looks/looks.css";
import "./looks/midnight.css";
import "./looks/bento.css";
import "./looks/aurora.css";
import "./looks/terminal.css";
import "./looks/cinema.css";
import "./looks/split.css";
import "./looks/timeline.css";
import "./looks/masonry.css";
import "./looks/hud.css";
import "./looks/window.css";
import "./looks/kanban.css";
import "./looks/landing.css";
import "./looks/folder.css";
import "./looks/mosaic.css";
import "./looks/orbit.css";
import "./looks/pocket.css";
import "./looks/sheet.css";
import "./looks/bands.css";
import "./looks/chat.css";
// Sabse AAKHIR mein: ye 2/3/4/10 par Candy wala tile-menu lagati hai, isliye
// un roopon ke apne menu-rule ke BAAD aani chahiye.
import "./looks/tilenav.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CurrentAffairsRush from "@/components/CurrentAffairsRush";
import FocusEnforcer from "@/components/FocusEnforcer";
import SyncManager from "@/components/SyncManager";
import Toast from "@/components/Toast";
import OverlayInbox from "@/components/OverlayInbox";
import VocabFeeder from "@/components/VocabFeeder";
import StoreGate from "@/components/StoreGate";
import SWRegister from "@/components/SWRegister";
import PathMemo from "@/components/PathMemo";
import PanicButton from "@/components/PanicButton";
import SelectAsk from "@/components/SelectAsk";

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
              "try{var d=document.documentElement,t=localStorage.getItem('cgl.theme');" +
              "if(t==='dark')d.setAttribute('data-theme','dark');" +
              // 🎨 Roop (lib/look.js) — koi chuna nahi to "0" (purana).
              "var l=localStorage.getItem('cgl.look')||'0';d.setAttribute('data-look',l);" +
              "var b={'1':'#08080a','2':'#0a0a0a','3':'#070a12','4':'#0b0c0a','8':'#050505','9':'#07100d','10':'#0a0d1a','11':'#141216','12':'#03080b','13':'#0d0f14','14':'#0f141c','15':'#07060b','16':'#120e0a','17':'#060808','18':'#06051a','19':'#050505','20':'#0f1512','21':'#081120','22':'#0b141a'}[l];" +
              // Address bar ka rang bhi yahin — bina-media wala meta sabse aage,
              // taaki wo upar wali do (OS ki pasand wali) se pehle mile.
              "if(t||b){var m=document.createElement('meta');m.id='tc-user';" +
              "m.name='theme-color';m.content=b||(t==='dark'?'#141922':'#ffffff');" +
              "document.head.prepend(m)}}catch(e){d.setAttribute('data-look','0')}",
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
          <SyncManager />
          <Toast />
          <SWRegister />
          <OverlayInbox />
          <VocabFeeder />
          {/* Beech mein chhoda hua quiz — floating "jahan chhoda tha" chip. */}
          {/* 🚨 Har page par — motivation gayi to ek tap, videos shuru. */}
          <PanicButton />
          {/* Quiz ka Exit "jahan se aaye the" wahin lauta sake — lib/backto */}
          <PathMemo />
          {/* 💬 Kahin bhi text select karo — Poochho / Google / Copy. */}
          <SelectAsk />
        </StoreGate>
      </body>
    </html>
  );
}
