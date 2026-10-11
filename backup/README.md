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
| 🎨 Theme (poori site) | **13 · Window** — dropdown hata diya | 0 Purana, 1 Midnight, 2 Bento, 3 Aurora, 4 Terminal, 5 Sky, 6 Candy, 7 Notion, 8 Cinema, 9 Split, 10 Timeline, 11 Masonry, 12 HUD, 14 Kanban, 15 Landing, 16 Folder, 17 Mosaic, 18 Orbit, 19 Pocket, 20 Sheet, 21 Bands, 22 Chat | `lib/look.js`, `components/LookSwitch.js`, `app/looks/*.css`, `app/layout.js` (imports + script), `components/Navbar.js` |
| 🔤 Vocab | **11 · Cover method** (type baari-baari mix, kram pakka — `cgl.vocab.order`) — dropdown hata diya | 1 Flip, 2 Ulta card, 3 MCQ, 4 Type karo, 5 Leitner, 6 Jodi milao (pehle wala final), 7 Memory tiles, 8 Akshar jodo, 9 Speed, 10 Sach/Jhooth, 12 7 ka jhund, 13 Hangman, 14 A–Z, 15 Reel | `components/VocabLayouts.js`, `components/VocabMatch.js`, `app/vocab/page.js`, `app/vocab/layouts*.css` |
| ☰ Menu | 4 · Icon rail + T1–T15 naye upar wale roop (dropdown abhi hai) | 0 Purana tiles + pehle wale 15 roop (owner ko pasand nahi aaye) | `components/MenuVariants.js`, `app/looks/menus15.css`, `components/Navbar.js` |
| 🧠 Fact log | Revise + folders (dropdown abhi hai) | 15 roop | `components/FactLayouts.js`, `app/mission/facts/layouts.css` |
| 📝 Notesliner | Revise + page (dropdown abhi hai) | 15 layout | `components/OneLinerLayouts.js`, `app/notes/paste/layouts.css` |
| 📖 Answers | Do-pane (dropdown abhi hai) | Purani list + 15 roop | `components/AnswersLayoutsAll.js`, `components/AnswersLayouts2.js`, `components/answers-layouts15.css` |
| 🧮 Calculation | Topic: Dekho → Test (dropdown abhi hai) | 15 tareeke | `components/CalcLayouts.js`, `components/CalcLayoutsMore.js`, `app/calculation/layouts*.css` |
| 🪔 Bharat Sanskriti | Jodi milao (dropdown abhi hai) | 15 tareeke (apne purane data `lib/culture.js` ke saath) | `components/CultureLayouts.js`, `lib/culture.js`, `app/culture/culture.css` |
| 🏠 Home | Sawaal-jawab (koi dropdown nahi) | Purana Home + A–N (B ab `/din` page hai) | commit `fabaac1` |
