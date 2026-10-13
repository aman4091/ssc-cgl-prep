# 🎨 Roop / tareekon ka backup

Har jagah ke saare roop (layout, yaad karne ke tareeke, theme, menu) ek saath
commit **`a63b4e8`** mein dropdown ke saath chalte hue hain. Kabhi phir test
karna ho to wahi commit dekho / wapas lao:

```
git show a63b4e8:<file>         # ek file dekho
git checkout a63b4e8 -- <file>  # ek file wapas lao
```

Home ke purane roop (A–N + purana Home) commit **`fabaac1`** mein hain
(`components/home/old/`, `components/home/HomeSwitch.js`).

| Jagah | Abhi kya chal raha hai | Backup mein | Files (a63b4e8 par) |
|---|---|---|---|
| 🎨 Theme (poori site) | **📖 Kitaab** (Window ke dhaanche par, `app/looks/kitaab.css`) — 📖/🪟 button hata diya (commit `99439f1` mein hai) | 0 Purana, 1 Midnight, 2 Bento, 3 Aurora, 4 Terminal, 5 Sky, 6 Candy, 7 Notion, 8 Cinema, 9 Split, 10 Timeline, 11 Masonry, 12 HUD, 14 Kanban, 15 Landing, 16 Folder, 17 Mosaic, 18 Orbit, 19 Pocket, 20 Sheet, 21 Bands, 22 Chat | `lib/look.js`, `components/LookSwitch.js`, `app/looks/*.css`, `app/layout.js` (imports + script), `components/Navbar.js` |
| 🔤 Vocab | **11 · Cover method** (type baari-baari mix, kram pakka — `cgl.vocab.order`) — dropdown hata diya | 1 Flip, 2 Ulta card, 3 MCQ, 4 Type karo, 5 Leitner, 6 Jodi milao (pehle wala final), 7 Memory tiles, 8 Akshar jodo, 9 Speed, 10 Sach/Jhooth, 12 7 ka jhund, 13 Hangman, 14 A–Z, 15 Reel | `components/VocabLayouts.js`, `components/VocabMatch.js`, `app/vocab/page.js`, `app/vocab/layouts*.css` |
| ☰ Menu | **T6 · Icon toolbar** (upar fix, mouse se bagal mein scroll) — dropdown hata diya | 4 Icon rail (baayen), T1–T5 + T7–T15 upar wale roop (`components/MenuTop.js` mein abhi bhi hain, sirf T6 chalta hai) — commit `5a4d4ed` par dropdown ke saath; 0 Purana tiles + pehle wale 15 roop — commit `a63b4e8` | `components/MenuTop.js`, `components/MenuRail.js`, `components/MenuVariants.js`, `app/looks/menus*.css`, `app/looks/menutop.css`, `components/Navbar.js` |
| ⏳ Neeche wali patti | **Hata di** — sirf 🪔 festival button bacha, wo menu mein sabse daayen | Tareekh + "din baaki" (`components/TopbarInfo.js`), "Abhi" (`components/NowPlan.js`), din/raat (`components/ThemeToggle.js`) — commit `5a4d4ed` | `components/Navbar.js` |
| 🧠 Fact log | **4 · Pehla akshar reel** (components/MnemonicScroll) — dropdown hata diya | Revise + folders, naye 15 roop (`components/FactLayouts2.js`), pehle wale 15 roop (`components/FactLayouts.js`, commit `a63b4e8`) | `app/mission/facts/page.js` |
| 📝 Notesliner | Revise + page (dropdown abhi hai) | 15 layout | `components/OneLinerLayouts.js`, `app/notes/paste/layouts.css` |
| 📖 Answers | Do-pane (dropdown abhi hai) | Purani list + 15 roop | `components/AnswersLayoutsAll.js`, `components/AnswersLayouts2.js`, `components/answers-layouts15.css` |
| 🧮 Calculation | Topic: Dekho → Test (dropdown abhi hai) | 15 tareeke | `components/CalcLayouts.js`, `components/CalcLayoutsMore.js`, `app/calculation/layouts*.css` |
| 🪔 Bharat Sanskriti | Jodi milao (dropdown abhi hai) | 15 tareeke (apne purane data `lib/culture.js` ke saath) | `components/CultureLayouts.js`, `lib/culture.js`, `app/culture/culture.css` |
| 🏠 Home | Sawaal-jawab (koi dropdown nahi) | Purana Home + A–N (B ab `/din` page hai) | commit `fabaac1` |
| 🏰 PYQ (GS / English, Medieval samet) | **33 · Do pane** FINAL — dropdown hata diya (`components/PyqLooks.js`) | 0 (page ka purana roop / Cover table), 1–20, 21–40 code mein — dropdown commit `afe5157` par | `components/MedLayouts.js`, `components/MedFacts.js` |
| 🧩 33 · Do pane ka jawab | **19 · Mind map** (upar ⚡ chips) — dropdown hataya | Baaki 19 roop (Dabbe, Saada lekh, Bullet, Table, Timeline, Index card, Highlighter, …) | `components/AnsFormats.js` (`FMT` in `components/MedFacts.js`) |
