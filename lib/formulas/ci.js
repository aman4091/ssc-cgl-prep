// 📐 Brahmastra — Chapter 18: COMPOUND INTEREST (book p.197–205).
// Format: "Naam: formula" = ek line (baayen naam, daayen formula); " · " se
// kai line; "💡" trick; "🎯" example. $…$ = KaTeX.

const S = String.raw;

export default {
  id: "ci",
  title: "Compound Interest",
  pages: "Book p. 197–205",
  sections: [
    {
      t: "📘 Basic formula",
      items: [
        S`Amount: $A=P\left(1+\dfrac{r}{100}\right)^t$`,
        S`CI: $CI=A-P=P\left[\left(1+\dfrac{r}{100}\right)^t-1\right]$`,
        S`Half-yearly: rate $\dfrac r2\%$ · time $2t$ cycle`,
        S`Quarterly: rate $\dfrac r4\%$ · time $4t$ cycle`,
        S`Monthly: rate $\dfrac{r}{12}\%$ · time $12t$ cycle`,
        S`n-monthly: rate $\dfrac{r\times n}{12}\%$ · cycles $=\dfrac{\text{kul mahine}}{n}$`,
        S`💡 Rate fraction mein badle (5, 10, 20, 25%, $8\frac13$, $12\frac12$, $16\frac23$%) to **Tree / Ratio** method · na badle (3, 6, 7, 9%) to **Successive** method`,
        S`💡 Pehle saal CI = SI hamesha`,
      ],
    },
    {
      t: "🔁 Successive % (effective rate)",
      items: [
        S`2 saal: $a+b+\dfrac{ab}{100}$ · same rate: $2a+\dfrac{a^2}{100}$`,
        S`3 saal: $a+b+c+\dfrac{ab+bc+ca}{100}+\dfrac{abc}{10000}$`,
        S`3 saal same rate: $3a+\dfrac{3a^2}{100}+\dfrac{a^3}{10000}$`,
        S`💡 2 saal same rate: rate ka **double** + rate ka **square** (do digit ke baad point) → 5% ⇒ $10+0.25=10.25\%$`,
        S`💡 3 saal: likho $3a\,|\,3a^2\,|\,a^3$ aur carry karo → 5% ⇒ $15\,|\,75\,|\,125$ = 15.7625% · 6% ⇒ 19.1016% · 8% ⇒ 25.9712%`,
      ],
    },
    {
      t: "📊 Table — ratt lo (CI % aur CI−SI %)",
      items: [
        S`2 saal: 2% → 4.04 · 3% → 6.09 · 4% → 8.16 · 5% → 10.25 · 6% → 12.36 · 7% → 14.49 · 8% → 16.64 · 9% → 18.81 · 10% → 21 · 12% → 25.44 · 15% → 32.25 · 20% → 44 · 25% → 56.25 · 30% → 69`,
        S`2 saal CI−SI: $\dfrac{r^2}{100}\%$ → 5% ⇒ 0.25 · 10% ⇒ 1 · 20% ⇒ 4 · 25% ⇒ 6.25`,
        S`3 saal: 2% → 6.12 · 3% → 9.27 · 4% → 12.48 · 5% → 15.76 · 6% → 19.1 · 8% → 25.97 · 10% → 33.1 · 12% → 40.49 · 15% → 52.09 · 20% → 72.8 · 25% → 95.31 · 30% → 119.7`,
        S`3 saal CI−SI: 5% ⇒ 0.76 · 10% ⇒ 3.1 · 15% ⇒ 7.09 · 20% ⇒ 12.8 · 25% ⇒ 20.31`,
      ],
    },
    {
      t: "🌳 Tree method & CI − SI",
      items: [
        S`2 saal: 1st saal interest $=a$ · 2nd saal $=a+b$ · CI − SI $=b$`,
        S`3 saal: 1st $=a$ · 2nd $=a+b$ · 3rd $=a+2b+c$ · SI $=3a$ · CI $=3a+3b+c$ · CI − SI $=3b+c$`,
        S`CI − SI (2 saal): $D=P\left(\dfrac{R}{100}\right)^2$`,
        S`CI − SI (3 saal): $D=P\left(\dfrac{R}{100}\right)^2\left(\dfrac{300+R}{100}\right)$`,
        S`🎯 20%, 2 saal, ₹2500: P = 25 unit ⇒ CI = 5 + 5 + 1 = 11 unit = ₹1100 · 2nd saal CI = 6 unit = ₹600`,
        S`🎯 20%, 3 saal, ₹1000: P = 125 unit ⇒ CI = 3·25 + 3·5 + 1 = 91 unit = ₹728 · 3rd saal = 25 + 10 + 1 = 36 unit = ₹288`,
        S`🎯 CI − SI = ₹162, 9%, 2 saal ⇒ $P=\dfrac{162\times10000}{81}=₹20000$`,
        S`🎯 ₹15625, 4%, 3 saal ⇒ $D=15625\cdot\dfrac{16}{10000}\cdot\dfrac{304}{100}=₹76$`,
      ],
    },
    {
      t: "⚖️ Ratio method",
      items: [
        S`Rate $=\dfrac1n$ ⇒ har saal P : A $=n:(n+1)$ · t saal ka P : A $=n^t:(n+1)^t$`,
        S`20% (= $\frac15$): 2 saal $25:36$ (CI 11) · 3 saal $125:216$ (CI 91)`,
        S`10% (= $\frac1{10}$): 2 saal $100:121$ · 3 saal $1000:1331$ (CI 331) · 4 saal $10000:14641$`,
        S`Alag-alag saal alag rate: har saal ka ratio alag likho aur guna karo`,
        S`💡 Jahan har saal ka rate alag ho, wahan **ratio method** sabse aasaan`,
        S`🎯 ₹25000, 10%, 3 saal ⇒ 331 unit × 25 = ₹8275`,
      ],
    },
    {
      t: "⏱️ Time fraction mein / half-yearly",
      items: [
        S`$2\frac23$ saal, 15%: pehle 2 saal 15% · baaki $\frac23$ saal ka rate $=15\times\frac23=10\%$`,
        S`🎯 ₹20000, 15%, $2\frac23$ saal ⇒ P : A = $20\cdot20\cdot10 : 23\cdot23\cdot11 = 4000:5819$ ⇒ CI = 1819 × 5 = ₹9095`,
        S`🎯 1 saal 9 mahine, 10% ⇒ $10+7.5+\frac{10\times7.5}{100}=18.25\%$ · CI ₹1460 ⇒ P = ₹8000`,
        S`🎯 Half-yearly 12%, 1 saal ⇒ 2 cycle of 6% = 12.36% · CI ₹1545 ⇒ P = ₹12500`,
        S`🎯 ₹6400, 5%, 1 saal: yearly vs half-yearly ka farak = 0.0625% = ₹4`,
        S`🎯 5-monthly, 12%, $1\frac14$ saal ⇒ 3 cycle of 5% · ₹8192 ⇒ $16^3:17^3=4096:4913$ ⇒ CI = ₹1634`,
      ],
    },
    {
      t: "🔀 CI + SI saath",
      items: [
        S`🎯 ₹14641 in 4 saal @10% CI ⇒ P = ₹10000 ⇒ $3\frac25$ saal SI = ₹3400 ⇒ ₹13400`,
        S`🎯 ₹25000: SI 11% vs CI 10%, 2 saal ⇒ 22% vs 21% ⇒ farak 1% = ₹250`,
      ],
    },
    {
      t: "📈 Rate nikalna",
      items: [
        S`P : A ko simplify karo · **perfect square** ⇒ 2 saal (√ lo) · **perfect cube** ⇒ 3 saal (∛ lo)`,
        S`Root ke baad $a:b$ ⇒ Rate $=\dfrac{b-a}{a}\times100$`,
        S`🎯 6400 → 7056 (2 saal) ⇒ $400:441$ ⇒ $20:21$ ⇒ 5%`,
        S`🎯 1728 → 4096 (3 saal) ⇒ ∛ ⇒ $12:16$ ⇒ $33\frac13\%$`,
        S`🎯 8000 → 9261 in 18 mahine half-yearly ⇒ $20:21$ ⇒ 5% half-yearly = 10% saalana`,
        S`Do saal ki CI (lagatar): $\dfrac{CI_{n+1}}{CI_n}=1+\dfrac{r}{100}$ · 🎯 2nd saal 100, 3rd 110 ⇒ 10%`,
      ],
    },
    {
      t: "⌛ Time nikalna",
      items: [
        S`P : A simplify ⇒ square ⇒ 2 cycle · cube ⇒ 3 cycle · 4th power ⇒ 4 cycle`,
        S`🎯 320 → 405 @12.5% ⇒ $64:81=8^2:9^2$ ⇒ 2 saal`,
        S`🎯 ₹4000 @5%, CI 630.5 ⇒ $8000:9261=20^3:21^3$ ⇒ 3 saal`,
        S`🎯 ₹10000 @20% half-yearly, CI 4641 ⇒ $10^4:11^4$ ⇒ 4 cycle = 2 saal`,
      ],
    },
    {
      t: "🎈 Munni method (do amount diye)",
      items: [
        S`$t_1$ saal mein $A_1$, $t_2$ saal mein $A_2$ ⇒ $\dfrac{A_2}{A_1}$ = $(t_2-t_1)$ saal ka factor`,
        S`Lagatar do saal ke amount: rate $=\dfrac{A_2-A_1}{A_1}\times100$ (🎯 6580 → 7896 ⇒ 1316/6580 = 20%)`,
        S`🎯 3 saal 7800, 5 saal 11232 ⇒ $100:144$ ⇒ √ ⇒ $10:12$ ⇒ 20%`,
        S`🎯 3 saal 8028, 6 saal 12042 ⇒ 3 saal mein $\frac32$ guna ⇒ $P=8028\times\frac23=₹5352$`,
        S`🎯 4 saal 11880, 6 saal 17820 ⇒ 2 saal mein $\frac32$ ⇒ $P=11880\times\frac49=₹5280$`,
      ],
    },
    {
      t: "✖️ n guna hona",
      items: [
        S`$n_1$ saal mein x guna, $n_2$ saal mein y guna: $x^{1/n_1}=y^{1/n_2}$`,
        S`💡 Guna ko **power** mein likho → power jitni guna, time bhi utna guna`,
        S`🎯 10 saal mein 3 guna ⇒ 243 = $3^5$ guna ⇒ 50 saal`,
        S`🎯 4 saal mein 2 guna ⇒ 8 = $2^3$ guna ⇒ 12 saal · 5 saal mein 3 guna ⇒ 9 guna 10 saal`,
      ],
    },
    {
      t: "📐 Har saal ki CI (G.P.)",
      items: [
        S`Amount aur har saal ki CI G.P. mein: agle saal = pichhla $\times\left(1+\dfrac{r}{100}\right)$`,
        S`1st saal CI $=P\times\dfrac{r}{100}$ · nth saal CI $=P\cdot\dfrac{r}{100}\left(1+\dfrac{r}{100}\right)^{n-1}$`,
        S`Lagatar do saal ki CI ka farak $=\text{pehli CI}\times\dfrac{r}{100}$`,
        S`🎯 4th saal CI 625 @8% ⇒ 5th = $625\times\frac{27}{25}=₹675$`,
        S`🎯 ₹25600 @25% ⇒ 4th saal CI $=25600\cdot\frac14\cdot\left(\frac54\right)^3=₹12500$`,
        S`🎯 3rd saal CI ₹1,25,000 @25% ⇒ 1st $=125000\cdot\frac45\cdot\frac45=₹80000$`,
        S`🎯 ₹4000 @10%: 3rd − 2nd saal CI $=4000\cdot\frac1{10}\cdot\frac{11}{10}\cdot\frac1{10}=₹44$`,
      ],
    },
    {
      t: "🟰 Barabar amount / umr wale sawaal",
      items: [
        S`Alag samay par barabar amount: $P_1\left(1+\frac{r}{100}\right)^{t_1}=P_2\left(1+\frac{r}{100}\right)^{t_2}$`,
        S`💡 10% par: $P_1:P_2 = 10:11$ ya $11:10$, **power = saal / umr ka farak** (kam samay wale ko zyada)`,
        S`🎯 ₹52500 do betiyon (15, 16 saal) mein, 18 par barabar ⇒ $10:11$ ⇒ chhoti = ₹25000`,
        S`🎯 ₹66300 A (8 saal), B (10 saal) ⇒ $11^2:10^2=121:100$ ⇒ A ₹36300, B ₹30000`,
      ],
    },
    {
      t: "💳 Installment (kisht)",
      items: [
        S`10% ($\frac1{10}$), 2 kisht: P : I $=10\cdot11 : 11\cdot11$ aur $100:121$ ⇒ jodo $210:242$`,
        S`10%, 3 kisht: $10\cdot121 : 11\cdot121$, $100\cdot11 : 121\cdot11$, $1000:1331$ ⇒ $3310:3993$`,
        S`💡 Kisht ka hissa (I) sab saal barabar banao, P ka jod = udhaar, I ka ek hissa = ek kisht`,
        S`🎯 ₹4620, 2 kisht @10% ⇒ $210\to4620$ (×22) ⇒ kisht $=121\times22=₹2662$`,
        S`🎯 Kisht ₹6897, 2 baar @10% ⇒ 121 unit = 6897 ⇒ kul interest 32 unit = ₹1824`,
        S`🎯 ₹19860 udhaar, 3 kisht @10% ⇒ $3310\to19860$ (×6) ⇒ kisht $=1331\times6=₹7986$`,
        S`Alag kisht: $\left[\text{Sum}\times\frac{110}{100}-4000\right]\times\frac{110}{100}-7700=0$ ⇒ Sum ₹10000`,
        S`🎯 ₹8000 @10%, 1st saal 2800, 2nd 2600 diye ⇒ bacha 4000 ⇒ 4th saal ke ant mein $4000\times1.21=₹4840$`,
      ],
    },
    {
      t: "🥇 Golden ratio (Pascal)",
      items: [
        S`2 saal: $2:1$ · 3 saal: $3:3:1$ · 4 saal: $4:6:4:1$ · 5 saal: $5:10:10:5:1$ · 6 saal: $6:15:20:15:6:1$`,
        S`💡 Pehli SI ko in numbers se guna karke neeche ke column jodo = CI`,
        S`🎯 ₹75000 @16% quarterly (4 cycle of 4%): 3000·4 + 120·6 + 4.8·4 + 0.192 ⇒ CI ≈ 12739.4`,
        S`🎯 ₹1,00,000 @7%, 5 saal: 7000·5 + 490·10 + 34.3·10 + 2.4·5 + 0.17 ⇒ CI ≈ ₹40255`,
      ],
    },
  ],
};
