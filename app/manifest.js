// PWA manifest. Next isko /manifest.webmanifest par serve karta hai aur <head>
// mein link bhi khud laga deta hai.
//
// display: "standalone" — tablet par home screen se khulne par URL bar hat jata
// hai, aur uske saath Chrome ka pull-to-refresh bhi. Stylus se likhte waqt upar
// se neeche ka stroke page reload kar de, isse bura kuch nahi. "fullscreen" bhi
// chalega par status bar (ghadi, battery) bhi chhup jayega — padhte waqt wo
// dikhna behtar hai.
export default function manifest() {
  return {
    name: "SSC CGL Pre — Prep Hub",
    short_name: "CGL Prep",
    description: "SSC CGL prep — Answers, notes aur stylus se handwriting.",
    start_url: "/answers",
    scope: "/",
    display: "standalone",
    orientation: "any", // tablet ko portrait aur landscape dono chahiye
    background_color: "#ffffff",
    theme_color: "#ffffff",
    // PNG 192 aur 512 dono chahiye — Chrome inhi ko dekh kar "Install app"
    // offer karta hai. Purana icon.svg hata diya: ab asli logo (public/logo.png
    // se banaye gaye PNG) hi har jagah chalta hai.
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "✍️ Solve", url: "/answers" },
    ],
  };
}
