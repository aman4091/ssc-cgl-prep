# SSC CGL Pre — Prep Hub

A professional Next.js study platform for SSC CGL Prelims prep.
Glassmorphism + dark theme. Local-first, deployable to GitHub / Vercel.

## Features

- 🏠 **Home / Subjects / Today** — clean multi-page structure
- 📝 **Quizzes** — attempt MCQs with instant scoring & explanations
- 🤖 **PDF → Quiz** — upload a questions PDF; DeepSeek AI turns it into a quiz
- ⚙️ **Settings** — store your DeepSeek API key locally + test the connection

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## First-time setup

1. Get a DeepSeek API key from https://platform.deepseek.com
2. Open **Settings** → paste the key → **Save** → **Test connection**
3. Go to **Quizzes** → **Upload PDF** (text-based PDF, not scanned image)

## Deploy

- **Vercel:** push to GitHub, import the repo — zero config.
- **GitHub Pages:** static export is not enabled by default because this app uses
  API routes (the DeepSeek call runs server-side). Use Vercel/Netlify for full features.

## Structure

```
app/
  page.js              Home
  today/               Today's plan
  subjects/            Subjects & syllabus
  quizzes/             Quiz list + PDF→Quiz
  quizzes/[id]/        Quiz player
  settings/            API key & config
  api/
    test-connection/   Ping DeepSeek
    generate-quiz/     PDF text → quiz JSON
components/            Navbar, Footer
lib/storage.js         localStorage helpers
```

## Notes

- Quizzes & settings are stored in the browser's `localStorage` for now.
  (Later this can move to a database.)
- The API key is passed to your own server-side API route, not exposed cross-origin.
