import { Suspense } from "react";
import { Inter } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CurrentAffairsRush from "@/components/CurrentAffairsRush";
import FocusEnforcer from "@/components/FocusEnforcer";
import VocabPrefetch from "@/components/VocabPrefetch";
import SyncManager from "@/components/SyncManager";
import OverlayInbox from "@/components/OverlayInbox";
import VocabFeeder from "@/components/VocabFeeder";
import ThemeToggle from "@/components/ThemeToggle";
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
  themeColor: "#1e1e2e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

// Dark (Catppuccin Mocha) ab DEFAULT hai — wahi Answers page wala look. Isliye
// data-theme yahin server par likha jaata hai; neeche wali script sirf tab
// badalti hai jab user ne khud "light" chuna ho. Ulta karne par har load pe
// light theme ki ek jhalak dikhti thi.
export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark" data-scroll-behavior="smooth">
      <body className={inter.variable}>
        <script dangerouslySetInnerHTML={{ __html: "try{if(localStorage.getItem('ui.theme')==='light')document.documentElement.setAttribute('data-theme','light')}catch(e){}" }} />
        <ThemeToggle />
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
          <SWRegister />
          <OverlayInbox />
          <VocabFeeder />
        </StoreGate>
      </body>
    </html>
  );
}
