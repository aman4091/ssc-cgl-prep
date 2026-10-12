// 📐 Brahmastra — Chapter 21: MIXTURE (book p.216–217).

const S = String.raw;

export default {
  id: "mixture",
  title: "Mixture",
  pages: "Book p. 216–217",
  sections: [
    {
      t: "➕ Kuch milana / nikalna",
      items: [
        S`Concentration: mixture mein kisi cheez ka **pratishat**`,
        S`💡 Jo cheez **nahi badli**, uski quantity same rakho — dono ratio mein usko barabar karo`,
        S`🎯 200 L, doodh : paani = $17:3$, doodh milaya ⇒ $7:1$ · paani same (3) ⇒ $17:3\to21:3$ ⇒ 4 unit = 40 L doodh`,
        S`🎯 32 L acid : paani = $5:3$, 12 L nikala + 7.5 L paani ⇒ 20 L mein 12.5 : 7.5 ⇒ $12.5:15=5:6$`,
        S`🎯 Acid : paani = $1:x$, 300 ml mein 50 ml paani ⇒ $2:5$ ⇒ 7 unit = 350 ml ⇒ $x$ = 200 ml paani pehle`,
        S`🎯 Doodh : paani $2:3$, kuch paani nikala ⇒ $5:7$, mixture 36 L ⇒ $10:15\to10:14$ ⇒ 1 unit = 1.5 L nikala`,
        S`🎯 $1:3$ mein x L doodh ⇒ $7:15$ · 50 L paani ⇒ $2:5$ ⇒ x = 40`,
      ],
    },
    {
      t: "🔁 Replacement — barabar quantity",
      items: [
        S`x mein se p nikaal kar doosri cheez, n baar: bacha $=x\left(1-\dfrac{p}{x}\right)^n$`,
        S`Ratio: $\dfrac{a}{a+b}=\left(\dfrac{x-p}{x}\right)^n$ (a = bachi pehli cheez)`,
        S`🎯 90 L doodh, 18 L nikaal kar paani, 3 baar ⇒ $90\left(\frac45\right)^3=46.08$ L`,
        S`🎯 6 L nikaal kar paani, 2 baar ⇒ doodh : paani $100:69$ ⇒ $\frac{100}{169}=\left(\frac{x-6}{x}\right)^2$ ⇒ x = 26 L`,
        S`💡 Shortcut: $\sqrt{169}:\sqrt{100}=13:10$ ⇒ 3 unit = 6 L ⇒ 13 unit = 26 L`,
      ],
    },
    {
      t: "🔀 Replacement — alag quantity",
      items: [
        S`Pehle p, phir q, phir r nikala: bacha $=x\left(1-\dfrac px\right)\left(1-\dfrac qx\right)\left(1-\dfrac rx\right)$`,
        S`🎯 90 L: 18, 15, 10 L nikaal kar paani ⇒ $90\cdot\frac45\cdot\frac56\cdot\frac89=53.33$ L`,
      ],
    },
    {
      t: "⚗️ Do mixture milake naya",
      items: [
        S`💡 Do alloy milane hon to pehle dono ki **kul quantity barabar** karo, phir mila do`,
        S`🎯 A (Cu : Zn $3:4$), B ($5:9$), A : B = $2:3$ ⇒ A $6:8$ ×2 = $12:16$, B $5:9$ ×3 = $15:27$ ⇒ C = $27:43$`,
        S`Kis ratio mein milayein: $\dfrac{7x+12y}{8x+3y}=\dfrac21$ jaisa banao (🎯 A $7:8$, B $4:1$, C $2:1$ ⇒ $2:3$)`,
        S`💡 Ye sawaal **alligation** se bhi — teeno alloys ka kul barabar karo (15) aur Cu par alligation lagao`,
      ],
    },
  ],
};
