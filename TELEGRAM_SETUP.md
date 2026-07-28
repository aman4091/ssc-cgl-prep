# 📲 Telegram Quiz — Setup (one-time)

Vocab + English/GS PYQ apne-aap ek private Telegram group mein **quiz poll** ban ke
aate hain. Galat karo to Telegram khud explanation dikhata hai, poora solution
message bhi aata hai, aur wo galat question **app ke `/review` (Revision) + 📲 Telegram
tab** mein apne-aap aa jata hai — dobara dekhne ke liye.

> Tumhara koi data delete/overwrite nahi hota. Feature sirf padhta hai (banks + vocab)
> aur alag Supabase rows (`tg:polls`, `tg:wrong`, `tg:state`) mein likhta hai.

---

## 1. Bot banao (BotFather)
1. Telegram mein **@BotFather** kholo → `/newbot`
2. Naam + username do → BotFather ek **token** dega:
   `123456789:AAE...long...token` → ye **`TELEGRAM_BOT_TOKEN`** hai.

## 2. Private group + chat id
1. Ek **private group** banao (sirf tum). Usme apne bot ko **add** karo.
2. Bot ko **admin** bana do (poll bhejne ke liye chahiye).
3. Group mein koi bhi message bhejo, phir browser mein kholo (token daal ke):
   `https://api.telegram.org/bot<TOKEN>/getUpdates`
4. Response mein `"chat":{"id":-1002xxxxxxxxx,...}` — wo **negative number** hi
   **`TELEGRAM_CHAT_ID`** hai (group ids negative hote hain).
5. (Optional) Wahi response mein `"from":{"id":12345678}` tumhari **user id** hai →
   `TELEGRAM_USER_ID` (isse sirf TUMHARE answers track honge, kisi aur ke nahi).

## 3. Vercel mein Environment Variables set karo
Vercel → Project → **Settings → Environment Variables** (Production):

| Variable | Value |
|---|---|
| `TELEGRAM_BOT_TOKEN` | BotFather ka token |
| `TELEGRAM_CHAT_ID` | group id (negative number) |
| `TELEGRAM_WEBHOOK_SECRET` | koi bhi random string (jaise `mera-secret-9f2a`) |
| `SUPABASE_URL` | tumhare Supabase project ka URL (app Settings mein hai) |
| `SUPABASE_ANON_KEY` | wahi anon key jo app Settings mein hai |
| `TG_SYNC_CODE` | tumhara **sync code** (app Settings) — isse tumhari vocab padhi jayegi |
| `CRON_SECRET` | koi random string — Vercel Cron isi se authorize karega |
| `TELEGRAM_USER_ID` | *(optional)* tumhari telegram user id |
| `TG_BATCH` | *(optional)* `/start` par kitne quiz — default `100` |
| `DEEPSEEK_API_KEY` | *(optional fallback)* reply `detail` ke liye — warna app Settings se |
| `DEEPSEEK_MODEL` | *(optional fallback)* warna app Settings ka model |

Set karne ke baad **Redeploy** karo (nayi env tabhi lagti hai).

> ⚠️ Vocab tabhi aayegi jab tumne app mein **Sync ON** karke push kiya ho (vocab
> localStorage mein hai; server tumhare synced blob se padhta hai). English/GS
> banks (engbank, errorpro, gk, war, cabank) repo ke saath aate hain, unke liye
> sync zaroori nahi.

## 4. Webhook register karo (ek baar, ek command)
`<TOKEN>`, `<APP>` (jaise `yourapp.vercel.app`) aur `<WEBHOOK_SECRET>` daal ke:

```
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<APP>/api/telegram/webhook&secret_token=<WEBHOOK_SECRET>&allowed_updates=%5B%22poll_answer%22,%22message%22%5D"
```

`{"ok":true,"result":true,...}` aaye to ho gaya.

## 5. Questions kaise mangao — `/start`
Group mein bas **`/start`** bhejo → ek batch quiz polls aa jayenge (default **100**,
`TG_BATCH` se badlo). Aur chahiye? Dobara **`/start`** — agle 100 (naye). Chhota
batch: **`/start 30`**. (Aliases: `/next`, `/quiz`, `/go`.)

Har question ek **spaced-repetition** schedule mein jaata hai: aaj jo aaya wo **kal**
ek baar, phir **3 din**, **7**, **15**, **30** din baad dobara — jab tak yaad na ho
jaye. So `/start` pehle *due* (dobara-dikhne-wale) uthata, phir naye se batch bharता.

**Kisi question ki explanation chahiye?** Us quiz ko **reply** karo:
- Reply mein **kuch bhi** (jaise `?`) → us question ka **stored solution**.
- Reply mein **`detail`** (ya `deep`) → **DeepSeek** se detailed explanation. Key,
  **model**, aur prompt sab **tumhari app Settings** se aate hain (synced blob se) —
  jaise site par. Model badalna ho to bas **Settings → DeepSeek model** field badlo
  (jaise `deepseek-chat` ya `deepseek-reasoner`). Sync ON hona chahiye. (Chaaho to
  `DEEPSEEK_API_KEY`/`DEEPSEEK_MODEL` env se override kar sakte ho.)

> ⏱️ Telegram ek group mein **~20 message/min** hi bhej deta (flood limit). Isliye
> 100 polls **kuch minute** mein aate hain (backoff ke saath). Vercel **Hobby** par
> function 60 sec baad ruk jata — us case mein ek `/start` par ~40–50 aayenge, baaki
> ke liye phir `/start` dabao. Pro par poora 100 ek baar.

**(Optional) Roz auto-post:** `vercel.json` ek daily cron rakhta hai (09:00 IST) jo
`/api/telegram/post` hit karta. Nahi chahiye to `vercel.json` se `crons` hata do.
Manual test: browser mein `https://<APP>/api/telegram/post?count=5` (secret set ho
to `&secret=...`).

## 6. Test karo
1. Group mein **`/start 5`** bhejo → 5 quiz polls aa jayenge.
2. Ek quiz **galat** answer karo → Telegram turant sahi option + poora solution
   message dega.
3. App mein **/review → 📲 Telegram** tab kholo → wo galat question yahaan +
   revision deck mein aa gaya hoga.
4. Kal phir **`/start`** → kuch kal-wale (spaced) + naye mixed aayenge.

---

### Kaise kaam karta hai (short)
- **`/start`** (webhook) / **cron** dono `lib/tgbatch.runBatch` chalate: sab sources
  (vocab, engbank, errorpro, gk, war, cabank) se MIXED batch banata — pehle DUE
  (spaced re-asks), phir fresh. Har bheja question `tg:sched` mein next-due ke saath,
  aur `tg:polls` mein poll→question (wrong-tracking ke liye).
- **`/api/telegram/webhook`** — `/start` command bhi handle karta aur tumhara answer
  bhi; galat hua to `tg:wrong` mein daalta + poora solution message bhejta.
- App load par `lib/tgimport.js` `tg:wrong` se naye misses ko `/review` revision
  system (MCQ flashcard) + 📲 Telegram tab mein le aata.
