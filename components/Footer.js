export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <p>© {new Date().getFullYear()} SSC CGL Pre — Prep Hub. Built with focus.</p>
        <p className="muted">Consistency &gt; Intensity</p>
      </div>
    </footer>
  );
}
