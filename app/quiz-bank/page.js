import QuizBankBrowser from "@/components/QuizBankBrowser";

export const metadata = { title: "Quiz Bank · SSC CGL Prep" };

export default function QuizBankPage() {
  return (
    <QuizBankBrowser
      group="topic"
      eyebrow="🗂️ Quiz Bank"
      heading="Topic-wise Quiz Bank"
      blurb="Ready-made topic quizzes — Computer, Banking, GK, Grammar, Reasoning, History, Polity, Geography and more. Tap any set to attempt it with the full runner (timer optional, mistakes auto-saved, shortcuts & bookmarks)."
    />
  );
}
