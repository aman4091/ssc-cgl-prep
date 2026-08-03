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

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata = {
  title: "SSC CGL Pre — Prep Hub",
  description:
    "SSC CGL Prelims preparation — daily targets, quizzes, and auto PDF-to-quiz powered by AI.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={inter.variable}>
        {/* Apply the saved theme before paint so there is no light-flash. */}
        <script dangerouslySetInnerHTML={{ __html: "try{if(localStorage.getItem('ui.theme')==='dark')document.documentElement.setAttribute('data-theme','dark')}catch(e){}" }} />
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
        <OverlayInbox />
        <VocabFeeder />
      </body>
    </html>
  );
}
