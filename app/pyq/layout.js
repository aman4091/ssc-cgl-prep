// Exam skin — is poore hisse ko Testbook wale test screen ki shakl deta hai
// (safed sheet, Arial, neele buttons, hara/neela question palette).
// Rang aur naap app/exam.css mein hain; yahan sirf wo class lagti hai.
export default function ExamLayout({ children }) {
  return <div className="examskin">{children}</div>;
}
