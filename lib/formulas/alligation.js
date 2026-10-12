// 📐 Brahmastra — Chapter 22: ALLIGATION (book p.218–220).

const S = String.raw;

export default {
  id: "alligation",
  title: "Alligation",
  pages: "Book p. 218–220",
  sections: [
    {
      t: "✖️ Alligation ka niyam",
      items: [
        S`Upar do cheezein (a, b), beech mein mila hua (m), neeche quantity ka ratio`,
        S`Ratio: $Q_1:Q_2=(b-m):(m-a)$ (tirchha ghatao)`,
        S`💡 Jahan bhi "do group ka average / mix" ho — percentage, SI, profit, discount, average, speed, number system — alligation lagao`,
        S`💡 Mila hua (m) hamesha a aur b ke **beech** hota hai`,
      ],
    },
    {
      t: "🥛 Mixture",
      items: [
        S`Upar: pehle mixture ka % · doosre ka % · beech: final % · neeche: quantity ka ratio`,
        S`💡 Ratio wale mixture: sabko ek hi kul (LCM) par le aao, phir alligation`,
        S`🎯 Doodh : paani $3:2$ aur $6:5$, final $4:3$ ⇒ doodh ka hissa ×385: 231, 210, beech 220 ⇒ $10:11$`,
        S`🎯 300 g, 40% cheeni ⇒ 50% ke liye cheeni (100%) milao ⇒ $50:10$ ⇒ 60 g`,
      ],
    },
    {
      t: "📊 Percentage / Population",
      items: [
        S`Upar: male ka % badhna · female ka % · beech: kul % · neeche: male : female`,
        S`🎯 1,20,000; male +7%, female +10%, kul +9.5% ⇒ $0.5:2.5=1:5$ ⇒ farak 4 unit = 80,000`,
        S`Income: upar kharch % · bachat % · beech: income % · neeche: kharch : bachat`,
        S`🎯 Income −6%, kharch −8%, bachat +4% ⇒ $10:2=5:1$ ⇒ income : kharch = $6:5$`,
      ],
    },
    {
      t: "💰 SI, Profit, Discount",
      items: [
        S`SI: upar $R_1,R_2$ · beech: kul rate · neeche: $P_1:P_2$`,
        S`🎯 ₹40000, 9.5% aur 5.5%, kul SI ₹3200 ⇒ 8% ⇒ $2.5:1.5=5:3$ ⇒ farak ₹10000`,
        S`Profit: upar $CP_1,CP_2$ · beech: mixture ka CP · neeche: quantity ratio`,
        S`🎯 ₹60 aur ₹65 ki chai, ₹68.20 par bech kar 10% munafa ⇒ CP ₹62 ⇒ $3:2$`,
        S`Profit %: upar profit₁%, profit₂% · beech: kul % · neeche: $CP_1:CP_2$`,
        S`🎯 Pencil 4%, pen 7%, kul ₹9 on ₹150 (6%) ⇒ $1:2$ ⇒ pencil ₹50/10 = ₹5, pen ₹100/8 = ₹12.5`,
        S`Discount: upar $D_1\%,D_2\%$ · beech: kul % · neeche: $MP_1:MP_2$`,
        S`🎯 8% aur 15%, kul 12%, MP ₹2100 ⇒ $3:4$ ⇒ farak ₹300`,
      ],
    },
    {
      t: "👥 Average & Cricket",
      items: [
        S`Upar: $Avg_1, Avg_2$ · beech: kul average · neeche: sankhya ka ratio`,
        S`🎯 600 log; male 42, female 41, kul 41 saal 9 mahine ⇒ $9:3=3:1$ ⇒ female 150`,
        S`Bowling: upar purana avg, naya avg · beech: kul · neeche: wickets ratio`,
        S`🎯 Avg 11.5, agle 5 wkt mein 40 run (8), naya 11 ⇒ $3:0.5=6:1$ ⇒ 30 + 5 = 35 wicket`,
      ],
    },
    {
      t: "🚗 Speed & Number system",
      items: [
        S`Upar: speed₁, speed₂ · beech: average speed · neeche: $Time_1:Time_2$`,
        S`🎯 20 km/h 30 min, x km/h 45 min, avg 14 ⇒ $2:3=4:6$ ⇒ x = 14 − 4 = 10 km/h`,
        S`Number system: upar har ek ki value · beech: average · neeche: sankhya ka ratio`,
        S`🎯 200 sir, 580 pair (avg 2.9) ⇒ rabbit 4, pigeon 2 ⇒ $9:11$ ⇒ pigeon $=200\times\frac{11}{20}=110$`,
      ],
    },
  ],
};
