import { Inter } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import VocabRush from "@/components/VocabRush";
import CalcRush from "@/components/CalcRush";
import CurrentAffairsRush from "@/components/CurrentAffairsRush";

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
        <div className="bg-orbs" aria-hidden="true">
          <span className="orb orb--1" />
          <span className="orb orb--2" />
          <span className="orb orb--3" />
        </div>
        <Navbar />
        <main className="container">{children}</main>
        <Footer />
        <VocabRush />
        <CalcRush />
        <CurrentAffairsRush />
      </body>
    </html>
  );
}
