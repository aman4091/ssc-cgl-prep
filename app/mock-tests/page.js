import QuizBankBrowser from "@/components/QuizBankBrowser";

export const metadata = { title: "Mock Tests · SSC CGL Prep" };

export default function MockTestsPage() {
  return (
    <QuizBankBrowser
      group="mock"
      eyebrow="🧪 Mock Tests"
      heading="Full & Sectional Mock Tests"
      blurb="Full-length and sectional mock tests — ProMocks, RBE sectionals (Maths / English / Reasoning / GK), SSC CGL PRE mocks and more. Every attempt feeds your Mistake Notebook."
    />
  );
}
