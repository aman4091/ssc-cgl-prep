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
| `TG_POST_COUNT` | *(optional)* ek baar mein kitne quiz — default `15` |
| `TG_SUBJECTS` | *(optional)* default `vocab,english,gs` |

Set karne ke baad **Redeploy** karo (nayi env tabhi lagti hai).

> ⚠️ Vocab tabhi aayegi jab tumne app mein **Sync ON** karke push kiya ho (vocab
> localStorage mein hai; cron use tumhare synced blob se padhta hai). English/GS
> PYQ banks repo ke saath aate hain, unke liye sync zaroori nahi.

## 4. Webhook register karo (ek baar, ek command)
`<TOKEN>`, `<APP>` (jaise `yourapp.vercel.app`) aur `<WEBHOOK_SECRET>` daal ke:

```
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<APP>/api/telegram/webhook&secret_token=<WEBHOOK_SECRET>&allowed_updates=%5B%22poll_answer%22,%22message%22%5D"
```

`{"ok":true,"result":true,...}` aaye to ho gaya.

## 5. Auto-post schedule
- **`vercel.json`** already ek daily cron set karta hai: roz **09:00 IST** (03:30 UTC)
  pe `/api/telegram/post` chalega. Time badalna ho to `vercel.json` ka `schedule`
  badlo (cron UTC mein hai).
- Vercel **Hobby** plan par cron **din mein ek baar** hi chal sakta hai. Din mein
  kai baar chahiye to **cron-job.org** (free) se ye URL apne time par hit karao:
  `https://<APP>/api/telegram/post?secret=<TG_CRON_SECRET>` — is case mein Vercel
  env mein `TG_CRON_SECRET` bhi set kar do.

## 6. Test karo
1. Browser mein `https://<APP>/api/telegram/post` (agar `CRON_SECRET`/`TG_CRON_SECRET`
   set hai to `?secret=...` lagao) — group mein quiz polls aa jayenge.
2. Ek quiz **galat** answer karo → Telegram turant sahi option + poora solution
   message dega.
3. App mein **/review → 📲 Telegram** tab kholo → wo galat question yahaan +
   revision deck mein aa gaya hoga.

---

### Kaise kaam karta hai (short)
- `/api/telegram/post` — banks + vocab se fresh MCQ uthata, quiz poll bhejta,
  `tg:polls` mein poll→question map save karta, `tg:state` mein "bhej diya" yaad
  rakhta (45 din tak repeat nahi).
- `/api/telegram/webhook` — tumhara answer aata; galat hua to `tg:wrong` mein daalta
  + poora solution message bhejta.
- App load par `lib/tgimport.js` `tg:wrong` se naye misses ko pull karke `/review`
  ke revision system (MCQ flashcard) mein enroll karta.
