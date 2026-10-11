// 🪔 Bharat Sanskriti — har rajya / UT ki janjati, CLASSICAL aur FOLK nritya,
// tyohar (kyun, kis devta ke liye, kis mahine) — SSC CGL ke hisaab se.
//
// Ek rajya: { k, n, ut, reg, cap, cd, fd, fs, tr, trick, facts }
//   cd  — classical nritya  [naam, note]
//   fd  — folk nritya       [naam, note]
//   fs  — tyohar            [naam, kyun, kis devta ke liye ("—" = koi nahi), mahina 1-12 (0 = alag-alag)]
//   tr  — janjati           [naam, note]
//   reg — N / NE / E / W / S / C (region)
//
// Owner khud bhi jod sakta hai (components/CultureLayouts "Apna jodo") —
// wo `cgl.culture.mine` mein bachta hai aur yahan wale data mein mil jata hai.

export const REGIONS = [
  { k: "N", l: "Uttar", c: "#60a5fa" },
  { k: "NE", l: "Purvottar", c: "#34d399" },
  { k: "E", l: "Poorv", c: "#f59e0b" },
  { k: "W", l: "Paschim", c: "#f472b6" },
  { k: "S", l: "Dakshin", c: "#a78bfa" },
  { k: "C", l: "Madhya", c: "#fb7185" },
];

export const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const STATES = [
  // ───────────────────────── UTTAR ─────────────────────────
  {
    k: "JK", n: "Jammu & Kashmir", ut: true, reg: "N", cap: "Srinagar (garmi) / Jammu (sardi)",
    cd: [],
    fd: [["Rouf", "Kashmiri auratein, Eid aur Ramzan par, qataar mein"], ["Kud", "Jammu — raat bhar lok-devtaon ki pooja ka nritya"], ["Dumhal", "Wattal jaati ke mard, lambi topi aur jhanda"], ["Bhand Pather", "vyangya (satire) wala lok-natak"], ["Hikat", "bachche/ladkiyan jodiyon mein ghoomte hue"], ["Bachha Nagma", "ladke ladki ke kapdon mein"], ["Jagarana", "Jammu — baraat jaane ke baad auratein"]],
    fs: [["Kheer Bhawani Mela", "Jyeshtha Ashtami par Tulmulla mandir; kund ke paani ka rang dekha jata hai", "Maa Ragnya Devi (Kheer Bhawani)", 6], ["Amarnath Yatra", "gufa mein barf ka shivling", "Shiva", 7], ["Tulip Festival", "Asia ka sabse bada tulip garden (Indira Gandhi Tulip Garden, Srinagar)", "—", 4], ["Herath (Shivratri)", "Kashmiri Pandit ka sabse bada tyohar", "Shiva", 2], ["Navroz", "Farsi naya saal", "—", 3], ["Bahu Mela", "Bahu kile ka mandir, Navratri mein", "Mahakali (Bawe Wali Mata)", 4], ["Jhiri Mela", "kisan Baba Jitto ki yaad — kisanon ke haq ke liye jaan di", "Baba Jitto", 11], ["Lohri", "Jammu mein, sardi ka ant", "Agni", 1]],
    tr: [["Gujjar", "sabse badi janjati, pashupalak"], ["Bakarwal", "bakri-bhed chaarne wale ghumantu"], ["Gaddi", "charwaha"], ["Sippi", ""]],
    trick: "\"Rouf karti Kashmiri, Kud karta Jammu\" — Gujjar-Bakarwal pahaadon mein bakri chaarte hain.",
    facts: ["Kheer Bhawani = Kashmiri Pandit, Tulmulla (Ganderbal)", "Gujjar-Bakarwal J&K ki sabse badi janjati"],
  },
  {
    k: "LA", n: "Ladakh", ut: true, reg: "N", cap: "Leh (aur Kargil)",
    cd: [],
    fd: [["Cham", "gompa ka mukhauta (mask) nritya — Hemis mein"], ["Jabro", "Changpa ghumantu, Losar par"], ["Shondol", "shahi nritya — 2019 mein Guinness record (sabse bada)"], ["Spao", "yoddha Kesar ki kahani"], ["Koshan", ""]],
    fs: [["Hemis Tsechu", "Guru Padmasambhava ka janm-din, Hemis gompa mein mask nritya", "Guru Padmasambhava", 6], ["Losar", "Ladakhi naya saal (sardiyon mein)", "Buddhist", 12], ["Sindhu Darshan", "Sindhu nadi ke kinare, rashtriya ekta", "—", 6], ["Dosmoche", "Leh — buri aatmaon ko bhagana", "Buddhist", 2], ["Ladakh Festival", "sanskriti ka utsav, Sept", "—", 9], ["Saka Dawa", "Buddha ka janm, gyan, nirvana", "Buddha", 5]],
    tr: [["Changpa", "Changthang ke ghumantu, Pashmina bakri"], ["Brokpa (Drokpa)", "Dah-Hanu, 'Aryan' kehlaate"], ["Balti", ""], ["Bot / Boto", ""], ["Beda", ""], ["Purigpa", "Kargil"]],
    trick: "\"Hemis ka Tsechu, Changpa ki Pashmina, Shondol ka record\".",
    facts: ["Hemis = sabse bada gompa Ladakh ka", "Changpa = Pashmina wool"],
  },
  {
    k: "HP", n: "Himachal Pradesh", reg: "N", cap: "Shimla (sardi: Dharamshala)",
    cd: [],
    fd: [["Nati", "Kullu Nati — 2016 mein Guinness record (sabse bada lok nritya)"], ["Chham", "Lahaul-Spiti, Buddhist mask"], ["Dangi", "Chamba, auratein"], ["Shand-Shabu", "Lahaul, Buddhist"], ["Jhoori", "Mahasu, prem-geet"], ["Losar Shona Chuksam", "Kinnaur, naya saal"], ["Gaddi Nritya", "Gaddi charwahe"], ["Kayang", "Kinnaur"]],
    fs: [["Kullu Dussehra", "Vijayadashami se shuru, 7 din; ghaati ke saare devta aate hain", "Bhagwan Raghunath (Ram)", 10], ["Minjar Mela", "Chamba — makka ki bali (minjar) chadhate hain, Shravan", "Raghuveer / Lakshmi Narayan", 7], ["International Shivratri (Mandi)", "Mandi ke 200+ devta Madho Rai ke paas", "Shiva / Madho Rai", 2], ["Lavi Mela", "Rampur — sabse bada vyapar mela, Kartik", "—", 11], ["Phulaich (Ukhyang)", "Kinnaur — phool, purkhon ki yaad", "—", 9], ["Halda", "Lahaul — naya saal", "Shiskar Apa (dhan ki devi)", 1], ["Renuka Ji Mela", "Renuka jheel", "Parshuram aur Maa Renuka", 11]],
    tr: [["Gaddi", "charwahe, Bharmour"], ["Gujjar", ""], ["Kinnaura (Kinner)", "Kinnaur"], ["Lahaula", "Lahaul"], ["Pangwala", "Pangi"], ["Bhot / Bodh", ""], ["Swangla", ""]],
    trick: "\"Kullu ka Dussehra, Kullu ki Nati — dono Kullu\"; Chamba = Minjar (makka).",
    facts: ["Kullu Dussehra Vijayadashami ko SHURU hota hai (baaki desh mein khatam)", "Kullu Nati = Guinness record"],
  },
  {
    k: "PB", n: "Punjab", reg: "N", cap: "Chandigarh",
    cd: [],
    fd: [["Bhangra", "mard, Baisakhi (fasal) par"], ["Giddha", "auratein, boliyan"], ["Jhumar", "dheema, gol ghoom kar"], ["Luddi", "jeet ka nritya"], ["Kikli", "ladkiyan jodi mein haath pakad kar ghoomti"], ["Jaago", "shaadi se pehle, sir par diya"], ["Julli", "Sufi peer ki mazaar par"], ["Malwai Giddha", "Malwa ke mard"], ["Sammi", ""]],
    fs: [["Baisakhi", "fasal (gehun) katai; 1699 mein Guru Gobind Singh ne Anandpur Sahib mein Khalsa banaya", "— (Sikh: Khalsa)", 4], ["Lohri", "sardi khatam, ganne ki fasal; aag jalana, Dulla Bhatti ki kahani", "Agni", 1], ["Hola Mohalla", "Holi ke agle din Anandpur Sahib; Guru Gobind Singh ne shuru kiya; Nihang yuddh-kala", "— (Sikh)", 3], ["Gurpurab", "Guru Nanak Dev ka janm, Kartik Purnima", "Guru Nanak", 11], ["Maghi", "Muktsar — 40 Mukte (shaheed)", "—", 1], ["Teeyan", "Teej, auratein jhoole", "Parvati", 8]],
    tr: [["— koi ST nahi", "Punjab mein koi Scheduled Tribe notified nahi (SSC trap)"]],
    trick: "\"Bhangra mard, Giddha aurat\"; Punjab-Haryana-Delhi-Chandigarh-Puducherry = koi ST nahi.",
    facts: ["Khalsa panth 1699, Baisakhi, Anandpur Sahib", "Punjab mein koi ST nahi"],
  },
  {
    k: "CH", n: "Chandigarh", ut: true, reg: "N", cap: "Chandigarh",
    cd: [],
    fd: [["Bhangra", "Punjabi"], ["Giddha", "Punjabi"]],
    fs: [["Rose Festival", "Zakir Hussain Rose Garden (Asia ka sabse bada), Feb", "—", 2], ["Teej Festival", "", "Parvati", 8], ["Mango Festival", "", "—", 7], ["Chrysanthemum Show", "Terrace Garden", "—", 12]],
    tr: [["— koi ST nahi", ""]],
    trick: "Chandigarh = Rose Garden (Zakir Hussain).",
    facts: ["Rose Festival — Zakir Hussain Rose Garden"],
  },
  {
    k: "HR", n: "Haryana", reg: "N", cap: "Chandigarh",
    cd: [],
    fd: [["Saang (Swang)", "lok-natak — Pt. Lakhmi Chand"], ["Phag", "Phalgun mein fasal"], ["Loor", "ladkiyan, Holi / rabi buai"], ["Khoria", "auratein, shaadi"], ["Dhamal", "Mahendragarh, mard, Phalgun"], ["Ghoomar", "Haryanvi roop"], ["Gugga", "Gugga Peer ki yaad"], ["Jhumar", ""]],
    fs: [["Teej (Hariyali)", "Shravan, jhoole; Parvati ka Shiva se milan", "Parvati–Shiva", 8], ["Surajkund Crafts Mela", "Faridabad, Feb — hastshilp", "—", 2], ["Gugga Naumi", "saanpon ke devta Gugga Peer", "Gugga Peer", 8], ["Kapal Mochan Mela", "Yamunanagar, Kartik Purnima", "Shiva", 11], ["Pinjore Heritage Festival", "Yadavindra Garden", "—", 12]],
    tr: [["— koi ST nahi", "Haryana mein koi ST notified nahi"]],
    trick: "\"Saang Haryana ka, Surajkund Faridabad ka\".",
    facts: ["Surajkund Mela — Faridabad, Feb", "Haryana mein koi ST nahi"],
  },
  {
    k: "DL", n: "Delhi", ut: true, reg: "N", cap: "New Delhi",
    cd: [],
    fd: [],
    fs: [["Phoolwalon ki Sair", "Mehrauli — Yogmaya mandir aur Bakhtiyar Kaki dargah par phoolon ke pankhe; 1812 Akbar Shah II; Hindu-Muslim ekta", "Yogmaya + Khwaja Bakhtiyar Kaki", 10], ["Qutub Festival", "Qutub Minar par sangeet-nritya", "—", 11], ["IITF", "Pragati Maidan vyapar mela, Nov", "—", 11], ["Mango Festival", "", "—", 7]],
    tr: [["— koi ST nahi", ""]],
    trick: "\"Phoolwalon ki Sair = Mehrauli = ekta\".",
    facts: ["Phoolwalon ki Sair (Sair-e-Gul Faroshan) — Mehrauli"],
  },
  {
    k: "UK", n: "Uttarakhand", reg: "N", cap: "Dehradun (garmi: Gairsain)",
    cd: [],
    fd: [["Langvir Nritya", "mard, baans ke khambe par karatab"], ["Chholiya", "Kumaon, talwar, shaadi mein"], ["Barada Nati", "Jaunsar-Bawar"], ["Pandav Nritya", "Garhwal, Mahabharata"], ["Jhora", "Kumaon, sab milkar"], ["Chhapeli", "prem-geet, jodi"], ["Jagar", "devta/aatma ko bulana"], ["Thadya", ""]],
    fs: [["Nanda Devi Raj Jaat", "har 12 saal; Nanda Devi ko sasural (Kailash) vida karna; 4 seeng wala mendha (Chausinga Khadu)", "Nanda Devi (Parvati)", 8], ["Harela", "Shravan — hariyali, ped lagana; Shiva-Parvati vivah", "Shiva–Parvati", 7], ["Phool Dei", "Chaitra — bachche dehleez par phool", "—", 3], ["Kumbh (Haridwar)", "Ganga snaan", "—", 4], ["Uttarayani", "Bageshwar, Makar Sankranti", "Bagnath (Shiva)", 1], ["Ghee Sankranti (Olgia)", "fasal, ghee khaana", "—", 8], ["Kandali", "Chaudans ghaati, 12 saal mein, Kandali phool", "—", 10]],
    tr: [["Tharu", "sabse badi"], ["Jaunsari", "Jaunsar-Bawar, bahupati pratha"], ["Buksa", "PVTG"], ["Bhotia", "Tibet-sima"], ["Raji (Van Rawat)", "PVTG"]],
    trick: "\"Nanda Devi 12 saal mein Raj Jaat\"; Chholiya = talwar.",
    facts: ["Nanda Devi Raj Jaat har 12 saal", "Raji aur Buksa PVTG"],
  },
  {
    k: "UP", n: "Uttar Pradesh", reg: "N", cap: "Lucknow",
    cd: [["Kathak", "Lucknow gharana (Wajid Ali Shah); kathakar = kahani sunane wale; Banaras gharana bhi"]],
    fd: [["Raslila", "Braj, Krishna-Radha"], ["Charkula", "Braj — sir par diyon ka minara, Radha janm par"], ["Nautanki", "lok-natak"], ["Ramlila", "UNESCO 2008"], ["Kajri", "Mirzapur, barsaat ke geet"], ["Khayal", "Bundelkhand"], ["Jhoola", "Braj"], ["Dhobiya", "Purvanchal"]],
    fs: [["Kumbh Mela", "Prayagraj Triveni Sangam; amrit ki boondein; UNESCO 2017", "—", 1], ["Lathmar Holi", "Barsana-Nandgaon; auratein lathi se", "Radha–Krishna", 3], ["Dev Deepawali", "Varanasi, Kartik Purnima; devta Ganga snaan ko utarte; Shiva ne Tripurasura mara", "Shiva", 11], ["Ram Navami", "Ayodhya", "Ram", 4], ["Janmashtami", "Mathura-Vrindavan", "Krishna", 8], ["Taj Mahotsav", "Agra, Feb", "—", 2], ["Ganga Mahotsav", "Varanasi", "Ganga", 11]],
    tr: [["Tharu", "sabse badi, Terai"], ["Buksa", "PVTG"], ["Kharwar", ""], ["Saharia", ""], ["Gond", ""], ["Cheru", ""]],
    trick: "\"Kathak ka ghar Lucknow, Lathmar ka ghar Barsana\".",
    facts: ["Kumbh — UNESCO 2017", "Ramlila — UNESCO 2008", "Kathak = UP ka classical"],
  },
  {
    k: "RJ", n: "Rajasthan", reg: "W", cap: "Jaipur",
    cd: [],
    fd: [["Ghoomar", "auratein ghoom kar, Bhil mool; Gangaur-Teej"], ["Kalbeliya", "saanp pakadne wali Kalbeliya jaati; UNESCO 2010"], ["Chari", "Kishangarh ki Gujjar auratein, sir par jalta matka"], ["Kachchhi Ghodi", "nakli ghoda, Shekhawati"], ["Bhavai", "sir par kai matke santulan"], ["Terah Taali", "Kamad jaati, 13 manjire; Baba Ramdev"], ["Gair", "Bhil mard, Holi"], ["Agni Nritya", "Jasnathi Sidh, Bikaner — aag par"], ["Gavari", "Bhil, 40 din; Shiva-Parvati"], ["Chakri", "Kanjar, Hadoti"], ["Walar", "Garasia"], ["Kathputli", "kathputli khel"]],
    fs: [["Gangaur", "Chaitra; vivahit patni pati ki umr ke liye, kunwari achhe var ke liye", "Gauri (Parvati)–Shiva", 3], ["Teej", "Shravan, Jaipur ki sawari", "Parvati", 8], ["Pushkar Mela", "Kartik Purnima — oont mela; Brahma mandir", "Brahma", 11], ["Desert Festival", "Jaisalmer, Magh", "—", 2], ["Baneshwar Mela", "Dungarpur, Magh Purnima — 'adivasiyon ka Kumbh' (Bhil)", "Shiva (Baneshwar) & Sant Mavji", 2], ["Ramdevra Mela", "Pokhran", "Baba Ramdev", 8], ["Karni Mata Mela", "Deshnoke, choohon wala mandir", "Karni Mata", 4], ["Kaila Devi Mela", "Karauli, Chaitra", "Kaila Devi", 4], ["Urs Ajmer", "Khwaja Moinuddin Chishti ki dargah", "— (Sufi)", 1]],
    tr: [["Meena", "sabse badi"], ["Bhil", "doosri badi"], ["Garasia", ""], ["Sahariya", "PVTG (Rajasthan ki ekmatra)"], ["Damor", ""], ["Kathodi", ""]],
    trick: "\"Ghoomar ghoomti, Kalbeliya saanp, Chari mein aag\"; Baneshwar = adivasi Kumbh.",
    facts: ["Kalbeliya — UNESCO 2010", "Sahariya = Rajasthan ka PVTG", "Meena sabse badi janjati", "Kathak ka Jaipur gharana yahin ka (par Kathak = UP ka classical)"],
  },

  // ───────────────────────── PASCHIM ─────────────────────────
  {
    k: "GJ", n: "Gujarat", reg: "W", cap: "Gandhinagar",
    cd: [],
    fd: [["Garba", "Navratri, beech mein diye wala 'garbo'"], ["Dandiya Raas", "dandiya se — Durga vs Mahishasura ki nakli ladai; Krishna ki raas"], ["Tippani", "Chorwad ki auratein, lathi se farsh peetna"], ["Padhar", "machhuare, naav jaisi harkat"], ["Siddi Dhamal", "Siddi (Africa mool)"], ["Bhavai", "lok-natak"], ["Hudo", "Bharwad charwahe"]],
    fs: [["Navratri", "9 raat", "Maa Amba / Durga", 10], ["Uttarayan (Kite Festival)", "Makar Sankranti — Surya uttar ki or; patang", "Surya", 1], ["Rann Utsav", "Kutch ka safed registan", "—", 12], ["Tarnetar Mela", "Bhadrapad; aadivasi yuva jeevan-saathi chunte", "Trinetreshwar (Shiva)", 9], ["Bhavnath Mela", "Junagadh, Mahashivratri, Naga sadhu", "Shiva", 2], ["Modhera Dance Festival", "Surya mandir", "Surya", 1]],
    tr: [["Bhil", "sabse badi"], ["Siddi", "Africa mool, Gir"], ["Dubla (Halpati)", ""], ["Gamit", ""], ["Chaudhari", ""], ["Kokna", ""], ["Warli", ""], ["Rathwa", "Pithora painting"]],
    trick: "\"Garba = garbo (diya), Dandiya = danda\"; Tarnetar = shaadi ka mela.",
    facts: ["Garba — UNESCO 2023", "Siddi = Africa mool janjati"],
  },
  {
    k: "MH", n: "Maharashtra", reg: "W", cap: "Mumbai (sardi: Nagpur)",
    cd: [],
    fd: [["Lavani", "Tamasha ka hissa, dholki"], ["Tamasha", "lok-natak"], ["Koli", "machhuare, naav chalana"], ["Povada", "Shivaji ki veer-gaatha"], ["Dindi", "Pandharpur wari, Vitthal"], ["Lezim", "chhoti jhanjh wala"], ["Gondhal", "Bhavani / Renuka ki pooja"], ["Dhangari Gaja", "Dhangar charwahe, Biruba"], ["Tarpa", "Warli, tarpa vaadya"], ["Bohada", "mukhauta, aadivasi"]],
    fs: [["Ganesh Chaturthi", "Bhadrapad; 1893 mein Tilak ne saarvajanik banaya", "Ganesha", 9], ["Gudi Padwa", "Marathi naya saal; Brahma ne srishti; Ram ki vaapsi", "Brahma", 3], ["Ashadhi Ekadashi (Wari)", "Pandharpur tak paidal", "Vitthal (Vithoba)", 7], ["Pola", "Shravan Amavasya, bailon ki pooja", "— (bail)", 8], ["Ellora Festival", "Ellora gufa", "—", 12], ["Banganga Festival", "Mumbai", "—", 1], ["Kala Ghoda", "Mumbai kala", "—", 2]],
    tr: [["Bhil", ""], ["Gond", ""], ["Warli", "Warli painting"], ["Katkari", "PVTG"], ["Kolam", "PVTG"], ["Madia Gond", "PVTG"], ["Korku", ""], ["Mahadeo Koli", ""]],
    trick: "\"Lavani-Tamasha Maharashtra, Tilak ne Ganpati bahar laaye\".",
    facts: ["Warli painting — Maharashtra (Thane-Palghar)", "Ganesh utsav saarvajanik — Tilak 1893"],
  },
  {
    k: "GA", n: "Goa", reg: "W", cap: "Panaji",
    cd: [],
    fd: [["Fugdi", "auratein, gol ghoomna, Ganesh utsav"], ["Dekhni", "Portugali + Bharatiya mishran"], ["Dhalo", "auratein, Paush mahina"], ["Kunbi", "Kunbi janjati"], ["Mando", "Konkani prem-geet + nritya"], ["Ghode Modni", "ghode wala yoddha nritya"], ["Goff", "rassiyon ki choti"], ["Corridinho", "Portugali"], ["Tonnya Mell", "lathi"]],
    fs: [["Goa Carnival", "Lent se pehle, King Momo", "—", 2], ["Shigmo", "vasant, Holi jaisa", "—", 3], ["Sao Joao", "June — kuon mein koodna", "St. John the Baptist", 6], ["Feast of St. Francis Xavier", "3 Dec, Bom Jesus Basilica, Old Goa", "St. Francis Xavier", 12], ["Bonderam", "Divar dweep, jhande", "—", 8]],
    tr: [["Gawda", ""], ["Kunbi", ""], ["Velip", ""]],
    trick: "\"Fugdi aurat, Ghode Modni yoddha\"; Sao Joao = kuaan.",
    facts: ["Bom Jesus — St Francis Xavier ka shareer"],
  },
  {
    k: "DN", n: "Dadra & Nagar Haveli aur Daman & Diu", ut: true, reg: "W", cap: "Daman",
    cd: [],
    fd: [["Tarpa", "Warli/Kokna, tarpa (lauki ka baaja)"], ["Bhawada", "mukhaute"], ["Machhi", "machhuare"], ["Mando", "Daman, Portugali"], ["Vira", "Portugali"]],
    fs: [["Diwaso", "Ashadha Amavasya — Dhodia-Warli, purkhe aur barsaat", "—", 7], ["Nariyal Purnima", "machhuare samudra ko nariyal", "Samudra (Varun)", 8], ["Tarpa Festival", "Silvassa", "—", 12], ["Kite Festival", "Daman", "Surya", 1]],
    tr: [["Warli", ""], ["Dhodia", ""], ["Kokna", ""], ["Kathodi", "PVTG"], ["Dubla", ""]],
    trick: "\"Tarpa ka baaja, Nariyal samudra ko\".",
    facts: ["2020 mein dono UT mile"],
  },

  // ───────────────────────── MADHYA ─────────────────────────
  {
    k: "MP", n: "Madhya Pradesh", reg: "C", cap: "Bhopal",
    cd: [],
    fd: [["Matki", "Malwa ki auratein, matke ke saath"], ["Tertali", "Kamar janjati, shareer par manjire; Ramdev"], ["Bhagoria", "Bhil, Holi se pehle"], ["Jawara", "Bundelkhand, fasal"], ["Rai", "Bundelkhand, Bedni auratein"], ["Karma", "Gond-Baiga, Karam ped"], ["Maanch", "Malwa lok-natak"], ["Badhai", "Bundelkhand, bachche ke janm par"], ["Grida", "Nimar"], ["Saila", "danda"]],
    fs: [["Bhagoria Haat", "Holi se pehle Jhabua — Bhil yuva jeevan-saathi chunte", "—", 3], ["Khajuraho Dance Festival", "Feb, classical nritya", "—", 2], ["Simhastha Kumbh", "Ujjain, Shipra, 12 saal", "Mahakaleshwar (Shiva)", 4], ["Tansen Samaroh", "Gwalior, sangeet", "—", 12], ["Lokrang", "Bhopal, 26 Jan", "—", 1], ["Madai", "Gond, gaon ke devta", "Gram devta", 1], ["Nagaji Mela", "Morena", "Sant Nagaji", 11]],
    tr: [["Bhil", "sabse badi"], ["Gond", "doosri badi"], ["Baiga", "PVTG"], ["Sahariya", "PVTG"], ["Bharia", "PVTG"], ["Korku", ""], ["Kol", ""], ["Bhilala", ""]],
    trick: "\"Bhagoria = Bhil ki pasand\"; Khajuraho = Feb nritya.",
    facts: ["MP mein sabse zyada ST aabadi", "Bhil sabse badi"],
  },
  {
    k: "CG", n: "Chhattisgarh", reg: "C", cap: "Raipur (Naya Raipur)",
    cd: [],
    fd: [["Panthi", "Satnami samaj, Guru Ghasidas"], ["Raut Nacha", "Yadav, Diwali/Govardhan, Krishna"], ["Karma", "Karam ped"], ["Sua", "auratein, tote (sua) ke geet"], ["Saila", "danda nritya"], ["Gaur Maria", "Maria janjati, bison seeng (bison horn)"], ["Pandavani", "Mahabharata gaatha — Teejan Bai"]],
    fs: [["Bastar Dussehra", "75 din, sabse lamba Dussehra — Ram nahi, devi ki pooja", "Maa Danteshwari", 10], ["Hareli", "Shravan Amavasya — pehla tyohar, khet ke auzaar", "— (kheti)", 7], ["Pola", "bail", "— (bail)", 8], ["Cherchera", "Paush Purnima, fasal", "—", 1], ["Goncha", "Bastar Rath Yatra", "Jagannath", 7], ["Madai", "gaon ke devta", "Gram devta", 2]],
    tr: [["Gond", "sabse badi"], ["Baiga", "PVTG"], ["Maria (Muria)", "Bastar"], ["Abujhmaria", "PVTG"], ["Halba", ""], ["Kamar", "PVTG"], ["Bhatra", ""], ["Oraon", ""]],
    trick: "\"Bastar Dussehra 75 din — Danteshwari ka\"; Pandavani = Teejan Bai.",
    facts: ["Bastar Dussehra — 75 din, Danteshwari", "Teejan Bai — Pandavani"],
  },

  // ───────────────────────── POORV ─────────────────────────
  {
    k: "BR", n: "Bihar", reg: "E", cap: "Patna",
    cd: [],
    fd: [["Jat-Jatin", "Mithila, pati-patni ki kahani"], ["Jhijhiya", "Dussehra, auratein sir par diye ka matka"], ["Bidesia", "lok-natak — Bhikhari Thakur (Bhojpuri Shakespeare)"], ["Domkach", "baraat jaane ke baad auratein"], ["Kajari", "barsaat"], ["Paika", "yoddha"], ["Jhumari", ""], ["Sama-Chakeva", "bhai-behen"]],
    fs: [["Chhath", "4 din, doobte aur ugte Surya ko arghya; dhanyavaad", "Surya aur Chhathi Maiya", 11], ["Sama-Chakeva", "Mithila, Kartik; bhai-behen", "Krishna ke bachche Sama-Chakeva", 11], ["Sonepur Mela", "Kartik Purnima, Asia ka sabse bada pashu mela", "Harihar Nath (Hari-Har)", 11], ["Jitiya", "maa beton ki lambi umr ke liye", "Jimutavahana", 9], ["Shravani Mela", "Sultanganj se jal", "Shiva", 7], ["Rajgir Mahotsav", "", "—", 11]],
    tr: [["Santhal", "sabse badi"], ["Oraon", ""], ["Munda", ""], ["Tharu", "West Champaran"], ["Kharwar", ""], ["Gond", ""]],
    trick: "\"Chhath = Surya, Sonepur = pashu, Bidesia = Bhikhari Thakur\".",
    facts: ["Sonepur — Asia ka sabse bada pashu mela", "Bhikhari Thakur — Bidesia"],
  },
  {
    k: "JH", n: "Jharkhand", reg: "E", cap: "Ranchi",
    cd: [],
    fd: [["Chhau (Seraikela)", "mukhauta; UNESCO 2010 (Seraikela, Purulia, Mayurbhanj)"], ["Paika", "yoddha, talwar-dhaal"], ["Jhumar", "fasal ke baad"], ["Karma", "Karam devta"], ["Domkach", "shaadi"], ["Santhali", "Santhal"], ["Firkal", "Bhumij, yuddh-kala"], ["Jadur", "Sarhul par"], ["Mardana Jhumar", "mard"], ["Natua", "mard, dhol"]],
    fs: [["Sarhul", "vasant; Sal ke phool — dharti aur surya ka vivah; prakriti pooja", "Prakriti / Sal ped (Sarna)", 3], ["Karma", "Bhadrapad; bhai aur fasal ke liye Karam daal", "Karam Devta", 9], ["Sohrai", "Diwali ke baad, pashu; Santhal", "— (pashu)", 11], ["Tusu Parab", "Makar Sankranti, fasal; Tusu kanya devi", "Tusu", 1], ["Bandna", "pashuon ka dhanyavaad", "—", 11], ["Mage Parab", "Ho janjati", "Singbonga", 1], ["Hal Punhya", "hal chalana shuru", "—", 2]],
    tr: [["Santhal", "sabse badi"], ["Oraon", "doosri"], ["Munda", ""], ["Ho", ""], ["Kharia", ""], ["Birhor", "PVTG"], ["Asur", "PVTG"], ["Paharia", "PVTG"], ["Korwa", "PVTG"]],
    trick: "\"Sarhul = Sal ke phool\"; Chhau teen jagah — Seraikela (JH), Purulia (WB), Mayurbhanj (OD).",
    facts: ["Chhau — UNESCO 2010", "Sarhul = Sal vriksh"],
  },
  {
    k: "WB", n: "West Bengal", reg: "E", cap: "Kolkata",
    cd: [],
    fd: [["Chhau (Purulia)", "mukhauta, Mahabharata-Ramayana"], ["Gambhira", "Malda, Chaitra; Shiva"], ["Raibenshe", "baans ke saath yoddha"], ["Santhali", ""], ["Kathi", "lathi"], ["Jatra", "lok-natak"], ["Baul", "gaane wale fakir (UNESCO 2005)"], ["Brita", "chechak se mukti ki mannat"], ["Alkap", "Murshidabad"], ["Tusu", ""]],
    fs: [["Durga Puja", "Durga ka Mahishasura par vijay / maike aana; Kolkata Durga Puja UNESCO 2021", "Durga", 10], ["Poila Baishakh", "Bengali naya saal", "—", 4], ["Gangasagar Mela", "Makar Sankranti — Ganga samudra se milti", "Kapil Muni", 1], ["Kali Puja", "Kartik Amavasya", "Kali", 11], ["Jagaddhatri Puja", "Chandannagar, Krishnanagar", "Jagaddhatri (Durga)", 11], ["Poush Mela", "Santiniketan", "—", 12], ["Rath Yatra (Mahesh)", "Serampore — doosri sabse purani", "Jagannath", 7], ["Nabanna", "naya chaawal", "—", 11], ["Rash Mela", "Cooch Behar", "Krishna", 11]],
    tr: [["Santhal", "sabse badi"], ["Oraon", ""], ["Munda", ""], ["Bhumij", ""], ["Lepcha", "Darjeeling"], ["Toto", "PVTG, Totopara (Alipurduar)"], ["Lodha", "PVTG"], ["Birhor", "PVTG"]],
    trick: "\"Durga Kolkata ki, Gangasagar Kapil Muni ka\"; Toto = Totopara.",
    facts: ["Kolkata Durga Puja — UNESCO 2021", "Baul — UNESCO 2005", "Toto = PVTG"],
  },
  {
    k: "OD", n: "Odisha", reg: "E", cap: "Bhubaneswar",
    cd: [["Odissi", "Jagannath mandir ki Maharis; tribhangi mudra; Konark"]],
    fd: [["Gotipua", "ladke ladki ban kar, Odissi ki jad"], ["Chhau (Mayurbhanj)", "BINA mukhaute ke"], ["Sambalpuri", "Paschim Odisha"], ["Dalkhai", "Sambalpur, Durgashtami, Dalkhai devi"], ["Ghumura", "dhol, Kalahandi (yuddh)"], ["Danda Nata", "Chaitra, Shiva-Kali ki tapasya"], ["Ranappa", "Ganjam, baans ki taangon par"], ["Bagha Nacha", "baagh bana kar, Ganjam"], ["Paika", "yoddha"], ["Karma", ""], ["Dhemsa", "aadivasi"], ["Chaiti Ghoda", "nakli ghoda, machhuare"]],
    fs: [["Rath Yatra", "Puri — Jagannath, Balabhadra, Subhadra Gundicha mandir jaate; Ashadha", "Jagannath", 7], ["Raja Parba", "3 din, Mithuna Sankranti — dharti maa ka rajaswala; auratein jhoole", "Bhudevi (dharti maa)", 6], ["Nuakhai", "Paschim Odisha — naya chaawal pehle devi ko", "Maa Samaleswari", 9], ["Bali Jatra", "Cuttack, Kartik Purnima — Bali/Java ki samudri yaatra ki yaad (Boita Bandana)", "—", 11], ["Dhanu Jatra", "Bargarh — duniya ka sabse bada khula natak, Kansa", "Krishna", 12], ["Konark Dance Festival", "Dec", "Surya", 12], ["Durga Puja", "Cuttack", "Durga", 10], ["Magha Saptami", "Konark", "Surya", 2]],
    tr: [["Kondh (Khond)", "sabse badi; Dongria Kondh — Niyamgiri"], ["Santhal", ""], ["Gond", ""], ["Munda", ""], ["Saora (Sora)", "Idital painting"], ["Bonda", "PVTG, Malkangiri"], ["Juang", "PVTG"], ["Paraja", ""], ["Koya", ""], ["Didayi", "PVTG"]],
    trick: "\"Odissi-Gotipua Puri se, Raja Parba mein dharti aaraam karti\"; Odisha = sabse zyada PVTG (13).",
    facts: ["Odisha mein sabse zyada PVTG (13)", "Odissi = tribhangi", "Dhanu Jatra = sabse bada open-air natak"],
  },

  // ───────────────────────── PURVOTTAR ─────────────────────────
  {
    k: "SK", n: "Sikkim", reg: "NE", cap: "Gangtok",
    cd: [],
    fd: [["Singhi Chham", "baraf ka sher (snow lion) — Kanchenjunga ka rakshak"], ["Yak Chham", "yak"], ["Maruni", "Nepali, Tihar par"], ["Tamang Selo", "Tamang"], ["Zo-Mal-Lok", "Lepcha, fasal"], ["Chu Faat", "Lepcha, Kanchenjunga ki pooja"], ["Rechungma", ""], ["Tashi Sabdo", ""]],
    fs: [["Losoong / Namsoong", "Dec — Bhutia-Lepcha ka naya saal, fasal ka ant", "—", 12], ["Saga Dawa", "Buddha ka janm, gyan, nirvana (teeno)", "Buddha", 5], ["Pang Lhabsol", "Kanchenjunga ko rakshak devta maan kar; Lepcha-Bhutia bhaichara", "Mt. Khangchendzonga", 8], ["Losar", "Tibetan naya saal", "—", 2], ["Drukpa Tshe-zi", "Buddha ka pehla updesh (Sarnath)", "Buddha", 7], ["Bumchu", "Tashiding gompa, pavitra jal ka ghada", "—", 2], ["Tendong Lho Rum Faat", "Lepcha — Tendong parvat ne baadh se bachaya", "Mt. Tendong", 8]],
    tr: [["Lepcha", "mool niwasi"], ["Bhutia", ""], ["Limbu", ""], ["Tamang", ""], ["Sherpa", ""]],
    trick: "\"Sikkim ka devta pahaad — Pang Lhabsol = Kanchenjunga\".",
    facts: ["Lepcha = Sikkim ke mool niwasi", "Pang Lhabsol — Kanchenjunga"],
  },
  {
    k: "AR", n: "Arunachal Pradesh", reg: "NE", cap: "Itanagar",
    cd: [],
    fd: [["Bardo Chham", "Sherdukpen — 12 jaanwaron ke mukhaute (burai par jeet)"], ["Ponung", "Adi, fasal se pehle"], ["Aji Lamu", "Monpa"], ["Wancho", "Wancho"], ["Buiya", "Digaru Mishmi"], ["Popir", "Adi (Galo)"], ["Rikhampada", "Nyishi"]],
    fs: [["Solung", "Adi — buai ke baad, sampannata", "Kine Nane (devi)", 9], ["Losar", "Monpa ka naya saal (Tibetan Buddhist)", "—", 2], ["Nyokum", "Nyishi — sampannata", "Nyokum devi", 2], ["Dree", "Apatani — fasal bachane ko", "Tamu, Harniang, Metii, Danyi", 7], ["Mopin", "Galo — sampannata", "Mopin devi", 4], ["Reh", "Idu Mishmi", "Nanyi Inyitaya", 2], ["Boori Boot", "Hill Miri", "—", 2], ["Siang River Festival", "", "—", 12]],
    tr: [["Adi", ""], ["Nyishi", "sabse badi"], ["Apatani", "Ziro ghaati, naak ke plug"], ["Monpa", "Tawang, Buddhist"], ["Mishmi", ""], ["Wancho", ""], ["Nocte", ""], ["Galo", ""], ["Sherdukpen", ""], ["Tagin", ""]],
    trick: "\"Adi ka Solung, Apatani ka Dree, Nyishi ka Nyokum, Galo ka Mopin, Monpa ka Losar\".",
    facts: ["Apatani — Ziro", "Nyishi sabse badi janjati"],
  },
  {
    k: "AS", n: "Assam", reg: "NE", cap: "Dispur",
    cd: [["Sattriya", "Srimanta Sankardeva (15-16 sadi), Vaishnav Satras (mathon) se; 2000 mein classical"]],
    fd: [["Bihu", "Rongali Bihu par"], ["Bagurumba", "Bodo — titli jaisa ('butterfly dance')"], ["Jhumur", "chai bagaan ke adivasi"], ["Ojapali", "gaatha-gaayan"], ["Ali Ai Ligang", "Mising, buai"], ["Deodhani", "devi Manasa"], ["Bhortal", "Barpeta, jhanjh"], ["Khamba Lim", "Dimasa"]],
    fs: [["Rongali (Bohag) Bihu", "April — Assamese naya saal, buai", "—", 4], ["Kongali (Kati) Bihu", "Oct — dhaan ke khet mein diya", "—", 10], ["Bhogali (Magh) Bihu", "Jan — fasal, Meji jalana, daawat", "Agni", 1], ["Ambubachi Mela", "Kamakhya mandir — devi ka varshik rajaswala, 3 din band", "Maa Kamakhya", 6], ["Ali Ai Ligang", "Mising, buai (Feb)", "Donyi-Polo (surya-chandra)", 2], ["Baishagu", "Bodo naya saal", "Bathou (Shiva)", 4], ["Majuli Raas", "", "Krishna", 11], ["Me-Dam-Me-Phi", "Ahom — purkhon ki pooja, 31 Jan", "Purkhe", 1]],
    tr: [["Bodo", "sabse badi"], ["Mising (Miri)", ""], ["Karbi", ""], ["Dimasa", ""], ["Rabha", ""], ["Tiwa (Lalung)", ""], ["Deori", ""], ["Sonowal Kachari", ""]],
    trick: "\"Teen Bihu — Bohag (April), Kati (Oct), Magh (Jan)\"; Bodo = Bagurumba titli.",
    facts: ["Teen Bihu", "Sattriya — Sankardeva", "Ambubachi — Kamakhya"],
  },
  {
    k: "NL", n: "Nagaland", reg: "NE", cap: "Kohima",
    cd: [],
    fd: [["Changai (Yuddh nritya)", "Chang"], ["Zeliang", "Zeliang"], ["Leshalaptu", "Sumi, ladke-ladkiyan"], ["Aaluyattu", "Sumi"], ["Nruirolians (Murga nritya)", "Zeliang"], ["Temangnetin", "Zeliang"], ["Monyoasho", "Ao"], ["Ngada", "Rengma"]],
    fs: [["Hornbill Festival", "1-10 Dec, Kisama — saari janjatiyan, 'tyoharon ka tyohar'; Hornbill pakshi ke naam par", "—", 12], ["Sekrenyi", "Angami — shuddhi (Feb)", "—", 2], ["Moatsu", "Ao — buai ke baad (May)", "—", 5], ["Tsungremong", "Ao — fasal ki prarthana (Aug)", "—", 8], ["Tuluni", "Sumi — beech saal (July), chawal beer 'Tuluni'", "Litsaba (fasal devta)", 7], ["Aoleang", "Konyak — naya saal / vasant (April)", "—", 4], ["Ngada", "Rengma — fasal ka ant", "—", 11], ["Naknyulem", "Chang", "—", 7], ["Bushu", "Kachari", "—", 1]],
    tr: [["Konyak", "sabse badi; chehre par tattoo, sir-shikar ka itihaas"], ["Angami", ""], ["Ao", ""], ["Sumi (Sema)", ""], ["Lotha", ""], ["Chakhesang", ""], ["Chang", ""], ["Phom", ""], ["Rengma", ""], ["Zeliang", ""], ["Khiamniungan", ""], ["Yimkhiung", ""], ["Pochury", ""], ["Sangtam", ""], ["Kuki", ""], ["Kachari", ""]],
    trick: "\"Hornbill 1-10 Dec; Ao ka Moatsu, Angami ka Sekrenyi, Sumi ka Tuluni, Konyak ka Aoleang\".",
    facts: ["Hornbill Festival — 1 se 10 Dec, Kisama", "16+ janjatiyan; Konyak sabse badi"],
  },
  {
    k: "MN", n: "Manipur", reg: "NE", cap: "Imphal",
    cd: [["Manipuri", "Raas Lila (Radha-Krishna), komal harkatein, chehra shaant; Guru Bipin Singh"]],
    fd: [["Thang-Ta", "yuddh-kala (talwar-bhala)"], ["Lai Haraoba", "devtaon ka nritya"], ["Pung Cholom", "dhol bajate hue"], ["Khamba Thoibi", "Moirang, jodi"], ["Maibi", "pujaran"], ["Nupa Pala", "kartal"], ["Kabui", "Kabui Naga"], ["Luivat Pheizak", "Tangkhul"]],
    fs: [["Lai Haraoba", "van-devtaon ko khush karna; srishti ki kahani", "Umang Lai", 5], ["Yaoshang", "Holi ke saath 5 din, Thabal Chongba nritya", "—", 3], ["Cheiraoba", "Meitei naya saal (Sajibu)", "—", 4], ["Ningol Chakouba", "shaadishuda behnon ko bhai ghar bulata", "—", 11], ["Kut", "Kuki-Chin-Mizo, fasal ke baad (1 Nov)", "—", 11], ["Gang-Ngai", "Kabui Naga", "—", 12], ["Lui-Ngai-Ni", "Naga beej-buai (15 Feb)", "—", 2], ["Sangai Festival", "Nov — rajya pashu Sangai hiran ke naam", "—", 11], ["Heikru Hidongba", "naav daud", "Bijoy Govinda (Vishnu)", 9]],
    tr: [["Tangkhul Naga", ""], ["Kuki", ""], ["Thadou", ""], ["Kabui", ""], ["Mao", ""], ["Maram", ""], ["Paite", ""], ["Hmar", ""], ["Anal", ""], ["Zou", ""]],
    trick: "\"Manipuri = Raas Lila; Sangai = Loktak ka hiran\"; Meitei ST nahi.",
    facts: ["Sangai — Keibul Lamjao (tairta national park)", "Thang-Ta — yuddh kala"],
  },
  {
    k: "MZ", n: "Mizoram", reg: "NE", cap: "Aizawl",
    cd: [],
    fd: [["Cheraw", "baans nritya — baans ke beech koodna"], ["Khuallam", "mehmaanon ka nritya"], ["Chheih Lam", "khushi ka"], ["Chai", "Chapchar Kut par"], ["Sarlamkai", ""], ["Par Lam", ""], ["Rallu Lam", ""]],
    fs: [["Chapchar Kut", "March — jhum ke liye jungle saaf karne ke baad (sabse bada)", "—", 3], ["Mim Kut", "Aug-Sept — makka ki fasal; mare hue parivar ki yaad", "Purkhe", 9], ["Pawl Kut", "Dec — fasal ka dhanyavaad", "—", 12], ["Thalfavang Kut", "Nov — nirai khatam", "—", 11]],
    tr: [["Mizo (Lushai)", "sabse badi"], ["Lai (Pawi)", ""], ["Mara (Lakher)", ""], ["Chakma", ""], ["Reang (Bru)", ""], ["Hmar", ""]],
    trick: "\"Kut = Mizoram: Chapchar (March), Mim (makka), Pawl (Dec)\"; Cheraw = baans.",
    facts: ["Cheraw — baans nritya", "Teen Kut"],
  },
  {
    k: "TR", n: "Tripura", reg: "NE", cap: "Agartala",
    cd: [],
    fd: [["Hojagiri", "Reang (Bru) auratein — ghade par khade ho kar santulan; Lakshmi pooja"], ["Garia", "Tripuri, Garia pooja"], ["Lebang Boomani", "fasal, keede pakadna"], ["Mamita", "fasal ka dhanyavaad"], ["Mosak Sulmani", ""], ["Bizu", "Chakma naya saal"], ["Sangrai", "Mog"], ["Owa", ""]],
    fs: [["Kharchi Puja", "July — 14 devta (Chaturdasha mandir); Ambubachi ke baad dharti ki safai", "14 devta (Chaturdasha)", 7], ["Ker Puja", "Kharchi ke 2 hafte baad", "Ker (Vastu rakshak)", 7], ["Garia Puja", "April — fasal aur santaan", "Garia devta", 4], ["Bizu (Bishu)", "Chakma naya saal, Chaitra ant", "—", 4], ["Neermahal Water Festival", "Rudrasagar jheel", "—", 8], ["Ashokastami", "Unakoti", "Shiva", 4]],
    tr: [["Tripuri", "sabse badi"], ["Reang (Bru)", "PVTG"], ["Jamatia", ""], ["Chakma", ""], ["Halam", ""], ["Noatia", ""], ["Mog", ""], ["Kuki", ""]],
    trick: "\"Hojagiri = ghade par Reang ladki\"; Kharchi = 14 devta.",
    facts: ["Reang (Bru) — PVTG", "Neermahal — jal mahal"],
  },
  {
    k: "ML", n: "Meghalaya", reg: "NE", cap: "Shillong",
    cd: [],
    fd: [["Shad Suk Mynsiem", "Khasi, 'khush dil ka nritya'"], ["Nongkrem", "Khasi, Smit gaon"], ["Wangala", "Garo, 100 dhol"], ["Behdienkhlam", "Jaintia"], ["Laho", "Jaintia (Pnar)"], ["Doregata", "Garo, pagdi giraana"], ["Chambil Mesara", "Garo"]],
    fs: [["Wangala", "Nov — fasal ke baad, '100 dhol ka tyohar'", "Saljong (Surya / fasal devta)", 11], ["Shad Suk Mynsiem", "April — fasal ka dhanyavaad", "U Blei (Ishwar)", 4], ["Nongkrem", "Nov — Smit, fasal; bakri bali (Pomblang)", "Ka Blei Synshar", 11], ["Behdienkhlam", "July — Jowai, haija/bimaari bhagana", "—", 7], ["Rongchugala", "Garo, fasal", "—", 11]],
    tr: [["Khasi", "maatrisattak (ladki ko jaaydad)"], ["Garo", "maatrisattak"], ["Jaintia (Pnar)", ""], ["Hajong", ""], ["Koch", ""], ["Rabha", ""]],
    trick: "\"Garo ka Wangala 100 dhol, Khasi ka Shad Suk, Jaintia ka Behdienkhlam\".",
    facts: ["Khasi-Garo maatrisattak", "Wangala — 100 Drums"],
  },

  // ───────────────────────── DAKSHIN ─────────────────────────
  {
    k: "AP", n: "Andhra Pradesh", reg: "S", cap: "Amaravati",
    cd: [["Kuchipudi", "Kuchipudi gaon (Krishna zila); Siddhendra Yogi; thaali ke kinare par nritya (Tarangam)"]],
    fd: [["Veeranatyam", "Veerabhadra, Shiva"], ["Butta Bommalu", "bade putle (mukhaute)"], ["Dappu", "dhol"], ["Tappeta Gullu", "Uttarandhra, dhol"], ["Lambadi", "Banjara"], ["Dhimsa", "Araku, aadivasi"], ["Kolattam", "lathi"]],
    fs: [["Ugadi", "Telugu naya saal (Chaitra Shukla Pratipada)", "Brahma (srishti)", 3], ["Sankranti", "fasal, 3-4 din; kolam, murgi ladai", "Surya", 1], ["Tirupati Brahmotsavam", "9 din", "Venkateswara", 9], ["Visakha Utsav", "Vizag", "—", 12], ["Lumbini Festival", "Buddhist virasat", "Buddha", 12]],
    tr: [["Chenchu", "PVTG, Nallamala"], ["Savara", ""], ["Koya", ""], ["Yanadi", ""], ["Sugali (Lambadi)", ""], ["Konda Dora", ""], ["Gadaba", ""]],
    trick: "\"Kuchipudi gaon Andhra ka; Ugadi = Brahma\".",
    facts: ["Kuchipudi — gaon ke naam par", "Chenchu — PVTG"],
  },
  {
    k: "TG", n: "Telangana", reg: "S", cap: "Hyderabad",
    cd: [],
    fd: [["Perini Sivatandavam", "Kakatiya yoddha yuddh se pehle — Shiva; Nataraja Ramakrishna ne jeevit kiya"], ["Lambadi", "Banjara"], ["Gusadi", "Raj Gond, Dandari (Diwali)"], ["Dappu", ""], ["Kolatam", "lathi"], ["Bathukamma", "auratein phoolon ke chaaron or"], ["Oggu Katha", "Mallanna/Beerappa gaatha"], ["Mathuri", ""]],
    fs: [["Bathukamma", "Dussehra se pehle 9 din, phoolon ka dher; rajya utsav", "Maha Gauri (Parvati)", 10], ["Bonalu", "Ashadha — Hyderabad, 'bonam' (pakaya chaawal) chadhana; rajya utsav", "Mahakali", 7], ["Sammakka Saralamma Jatara", "Medaram — har 2 saal, sabse bada aadivasi mela (Koya); maa-beti ne Kakatiya raja se ladai ki", "Sammakka-Saralamma", 2], ["Nagoba Jatara", "Keslapur (Adilabad), Gond", "Nagoba (saanp devta)", 1], ["Peerla Panduga", "Muharram", "—", 7]],
    tr: [["Lambadi (Banjara)", "sabse badi"], ["Koya", ""], ["Gond (Raj Gond)", ""], ["Chenchu", "PVTG"], ["Kolam", "PVTG"], ["Thoti", ""], ["Pardhan", ""]],
    trick: "\"Bathukamma phool, Bonalu Mahakali, Medaram Sammakka\".",
    facts: ["Medaram Jatara — Asia ka sabse bada aadivasi mela", "Perini — Shiva, yoddha"],
  },
  {
    k: "KA", n: "Karnataka", reg: "S", cap: "Bengaluru",
    cd: [],
    fd: [["Yakshagana", "nritya-natak, samudri kinara"], ["Dollu Kunitha", "bade dhol, Kuruba charwahe"], ["Veeragase", "Veerabhadra (Shiva), Dasara"], ["Kamsale", "Male Mahadeshwara ke bhakt, jhanjh"], ["Bhuta Kola", "Tulu Nadu, 'daiva' aatmaon ki pooja"], ["Huttari", "Kodava"], ["Pooja Kunitha", ""], ["Karaga", "Bengaluru, Draupadi"], ["Somana Kunitha", ""]],
    fs: [["Mysuru Dasara", "rajya utsav; Chamundeshwari ne Mahishasura mara; Jamboo Savari", "Chamundeshwari", 10], ["Hampi Utsav", "Vijayanagar", "—", 1], ["Kambala", "Tulu Nadu, bhains daud", "—", 12], ["Karaga", "Bengaluru, Thigala samaj", "Draupadi", 4], ["Huttari (Puttari)", "Kodagu, fasal", "—", 12], ["Kaveri Sankramana", "Talakaveri, Kodagu", "Maa Kaveri", 10], ["Mahamastakabhisheka", "Shravanabelagola, har 12 saal (Jain)", "Bahubali (Gommateshwara)", 2], ["Vairamudi", "Melkote", "Cheluvanarayana (Vishnu)", 3]],
    tr: [["Soliga", "BR Hills"], ["Jenu Kuruba", "PVTG, shahad"], ["Kadu Kuruba", ""], ["Hakki Pikki", "chidiya pakadne wale"], ["Siddi", "Africa mool"], ["Koraga", "PVTG"], ["Yerava", ""]],
    trick: "\"Yakshagana samudra kinare, Mysuru Dasara Chamundi ka\"; Bahubali 12 saal.",
    facts: ["Mahamastakabhisheka — har 12 saal", "Kambala = bhains daud"],
  },
  {
    k: "KL", n: "Kerala", reg: "S", cap: "Thiruvananthapuram",
    cd: [["Kathakali", "nritya-natak, hara chehra (Pacha), mukut; Kalamandalam (Vallathol)"], ["Mohiniyattam", "sirf auratein, 'Mohini' — komal"]],
    fd: [["Theyyam", "Uttar Malabar, devta ban kar"], ["Koodiyattam", "Sanskrit natak — UNESCO (2001/2008)"], ["Ottamthullal", "Kunchan Nambiar, vyangya"], ["Thiruvathirakali", "auratein, Shiva ke liye"], ["Oppana", "Muslim shaadi"], ["Margam Kali", "Syrian Christian"], ["Padayani", "Bhagavathy mandir"], ["Pulikali", "Onam par baagh bana kar"], ["Kolkali", "lathi"], ["Krishnanattam", ""], ["Kalaripayattu", "yuddh-kala"]],
    fs: [["Onam", "raja Mahabali ki ghar-vaapsi; Vishnu ka Vamana avatar; fasal; Vallam Kali", "Mahabali / Vamana (Vishnu)", 9], ["Vishu", "Malayalam naya saal, Vishu Kani", "Krishna", 4], ["Thrissur Pooram", "Vadakkunnathan mandir, haathi; Sakthan Thampuran ne shuru", "Shiva (Vadakkunnathan)", 4], ["Attukal Pongala", "auraton ka sabse bada jamaavda (Guinness)", "Attukal Bhagavathy", 3], ["Nehru Trophy Boat Race", "Punnamada jheel, Aug", "—", 8], ["Makaravilakku", "Sabarimala", "Ayyappa", 1], ["Thiruvathira", "Shiva ka janm-nakshatra", "Shiva", 12], ["Aranmula Boat Race", "", "Parthasarathy (Krishna)", 9]],
    tr: [["Paniya", "sabse badi"], ["Kurichiya", ""], ["Irula", ""], ["Kurumba", ""], ["Kadar", "PVTG"], ["Muthuvan", ""], ["Kani", ""], ["Cholanaikkan", "PVTG, gufa-niwasi"]],
    trick: "\"Kerala ke do classical — Kathakali (hara chehra) aur Mohiniyattam (aurat)\"; Onam = Mahabali.",
    facts: ["Kerala — 2 classical", "Koodiyattam — UNESCO", "Attukal Pongala — Guinness"],
  },
  {
    k: "TN", n: "Tamil Nadu", reg: "S", cap: "Chennai",
    cd: [["Bharatanatyam", "Thanjavur; Natyashastra; Devadasi 'Sadir' se; Rukmini Devi Arundale ne naya roop diya"]],
    fd: [["Karagattam", "sir par matka — Mariamman (barsaat devi)"], ["Kavadi Attam", "Murugan, Thaipusam"], ["Kummi", "auratein, taali"], ["Kolattam", "lathi"], ["Mayil Attam", "mor, Murugan"], ["Poikkal Kuthirai", "nakli ghoda"], ["Oyilattam", "rumaal"], ["Therukoothu", "sadak natak, Mahabharata / Draupadi"], ["Puliyattam", "baagh"], ["Silambattam", "lathi yuddh-kala"], ["Devarattam", ""]],
    fs: [["Pongal", "Thai mahina, 4 din (Bhogi, Surya Pongal, Mattu Pongal, Kaanum); fasal", "Surya", 1], ["Jallikattu", "Mattu Pongal par saand pakadna", "—", 1], ["Thaipusam", "Parvati ne Murugan ko Vel diya, Soorapadman mara; Palani", "Murugan", 1], ["Karthigai Deepam", "Tiruvannamalai — Shiva agni-stambh", "Shiva", 11], ["Chithirai Festival", "Madurai — Meenakshi-Sundareswarar vivah", "Meenakshi–Sundareswarar", 4], ["Natyanjali", "Chidambaram, Mahashivratri", "Nataraja (Shiva)", 2], ["Mamallapuram Dance Festival", "", "—", 1], ["Puthandu", "Tamil naya saal", "—", 4], ["Aadi Perukku", "Kaveri nadi", "Kaveri", 8]],
    tr: [["Toda", "Nilgiri, bhains, aadhe-dhol jaise ghar, Toda kadhai"], ["Kota", "Nilgiri, kaarigar"], ["Irula", "saanp pakadne wale"], ["Kurumba", ""], ["Kattunayakan", ""], ["Paniya", ""], ["Malayali", ""]],
    trick: "\"'-attam' = Tamil Nadu (Karag-attam, Kavadi-attam, Mayil-attam)\"; Toda = bhains.",
    facts: ["Bharatanatyam — TN", "Toda — Nilgiri, bhains"],
  },
  {
    k: "PY", n: "Puducherry", ut: true, reg: "S", cap: "Puducherry",
    cd: [],
    fd: [["Garadi", "vanar (bandar) bankar, Ram ki Ravan par jeet; pairon mein ghunghroo"], ["Kummi", ""], ["Kolattam", ""]],
    fs: [["Masi Magam", "Masi mahina — devtaon ko samudra snaan", "—", 2], ["Villianur Car Festival", "Thirukameshwara", "Shiva", 5], ["Bastille Day", "14 July, French virasat", "—", 7], ["Fete de Pondicherry", "16 Aug — vilay", "—", 8], ["International Yoga Festival", "4-7 Jan", "—", 1]],
    tr: [["— koi ST nahi", ""]],
    trick: "\"Garadi = bandar, Bastille = French\".",
    facts: ["Garadi — vanar nritya"],
  },
  {
    k: "LD", n: "Lakshadweep", ut: true, reg: "S", cap: "Kavaratti",
    cd: [],
    fd: [["Lava", "Minicoy ke mard"], ["Kolkali", "lathi"], ["Parichakali", "talwar-dhaal"], ["Attam", ""]],
    fs: [["Id / Milad-un-Nabi", "zyadatar Muslim aabadi", "—", 0]],
    tr: [["Lakshadweep ke niwasi (lagbhag 95% ST)", "Minicoy ke Mahl"]],
    trick: "\"Lava = Minicoy\"; lagbhag poori aabadi ST.",
    facts: ["~95% aabadi ST"],
  },
  {
    k: "AN", n: "Andaman & Nicobar", ut: true, reg: "S", cap: "Sri Vijaya Puram (Port Blair)",
    cd: [],
    fd: [["Nicobari nritya", "Ossuary (purkhon) utsav par"]],
    fs: [["Island Tourism Festival", "Jan, Port Blair", "—", 1], ["Ossuary Feast (Pig Festival)", "Nicobari — purkhon aur mare hue ka samman", "Purkhe", 0], ["Subhash Mela", "Netaji", "—", 1]],
    tr: [["Great Andamanese", "PVTG, Negrito"], ["Onge", "PVTG, Little Andaman"], ["Jarawa", "PVTG"], ["Sentinelese", "PVTG, bahari duniya se door"], ["Shompen", "PVTG, Great Nicobar, Mongoloid"], ["Nicobarese", "sabse badi, PVTG nahi"]],
    trick: "\"GOJS + Shompen = 5 PVTG\" (Great Andamanese, Onge, Jarawa, Sentinelese, Shompen); Nicobarese PVTG nahi.",
    facts: ["5 PVTG", "Sentinelese — North Sentinel dweep"],
  },
];

// ── Classical nritya (Sangeet Natak Akademi: 8; Sanskriti Mantralaya Chhau ko 9va maanta hai) ──
export const CLASSICAL = [
  { n: "Bharatanatyam", st: "TN", from: "Thanjavur ke mandir, Devadasi 'Sadir'", feat: "adhmandi (aadha baithna), Natyashastra par, ek kalakar kai kirdar", guru: "Rukmini Devi Arundale (Kalakshetra), Yamini Krishnamurthy, Padma Subrahmanyam, Mallika Sarabhai" },
  { n: "Kathak", st: "UP", from: "kathakar (kahani sunane wale), Mughal darbar", feat: "tatkar (pair), chakkar (ghoomna); gharane — Lucknow, Jaipur, Banaras", guru: "Birju Maharaj, Sitara Devi, Shambhu Maharaj, Shovana Narayan, Kumudini Lakhia" },
  { n: "Kathakali", st: "KL", from: "Ramanattam aur Krishnanattam se", feat: "hara chehra (Pacha), bada mukut, aankhon ki bhasha, sirf mard (pehle)", guru: "Kalamandalam Gopi, Guru Kunchu Kurup, Vallathol (Kalamandalam sansthapak)" },
  { n: "Kuchipudi", st: "AP", from: "Kuchipudi gaon, Siddhendra Yogi", feat: "pital ki thaali ke kinare par nritya (Tarangam), sir par paani ka ghada", guru: "Vempati Chinna Satyam, Raja-Radha Reddy, Yamini Krishnamurthy, Swapnasundari" },
  { n: "Odissi", st: "OD", from: "Jagannath mandir ki Maharis, Gotipua", feat: "tribhangi (teen jagah se mudna), chowk mudra; Konark / Udayagiri ki moortiyan", guru: "Kelucharan Mohapatra, Sonal Mansingh, Sanjukta Panigrahi, Madhavi Mudgal" },
  { n: "Manipuri", st: "MN", from: "Lai Haraoba, Vaishnav Raas Lila", feat: "komal, gol harkatein, pair zameen par dheere, chehra shaant; ghungroo nahi", guru: "Guru Bipin Singh, Jhaveri behnein, Rajkumar Singhajit Singh" },
  { n: "Mohiniyattam", st: "KL", from: "Vishnu ka Mohini roop", feat: "sirf auratein, safed-sunehri saadi, lehron jaisi harkat", guru: "Kalamandalam Kalyanikutty Amma, Sunanda Nair, Bharati Shivaji" },
  { n: "Sattriya", st: "AS", from: "Srimanta Sankardeva, Vaishnav Satra (math)", feat: "Ankiya Naat se; 2000 mein classical ghoshit (sabse naya)", guru: "Guru Jatin Goswami, Ghanakanta Bora, Sharodi Saikia" },
  { n: "Chhau (9va — Sanskriti Mantralaya)", st: "JH", from: "Seraikela (JH), Purulia (WB), Mayurbhanj (OD)", feat: "yuddh-kala jaise; Seraikela aur Purulia mein mukhauta, Mayurbhanj mein nahi; UNESCO 2010", guru: "Gopal Prasad Dubey, Kedar Nath Sahoo" },
];

// ── Devta ke jatthe — tyohar ka "god" text inse milaya jata hai ──
export const GODS = [
  { k: "shiva", l: "🔱 Shiva (aur Ayyappa)", re: /shiva|shivling|mahakal|nataraja|ayyappa|baneshwar|bathou|trinetreshwar|vadakkunnathan|madho rai|bagnath|harihar/i },
  { k: "devi", l: "🌺 Devi (Durga / Kali / Parvati…)", re: /durga|kali|parvati|gauri|devi|draupadi|amba|kamakhya|danteshwari|chamundeshwari|bhagavathy|mariamman|samaleswari|ragnya|kheer bhawani|jagaddhatri|karni|kaila|nanda|renuka|meenakshi|mahakali|chhathi/i },
  { k: "vishnu", l: "🦚 Vishnu / Krishna / Ram / Jagannath", re: /vishnu|krishna|ram\b|raghunath|raghuveer|jagannath|venkateswara|vitthal|vamana|mahabali|lakshmi narayan|parthasarathy|cheluvanarayana|govinda|radha/i },
  { k: "surya", l: "☀️ Surya", re: /surya|saljong|donyi/i },
  { k: "ganesh", l: "🐘 Ganesha / Brahma / Murugan", re: /ganesha|brahma|murugan/i },
  { k: "nature", l: "🌾 Prakriti / Kheti / Pashu / Nadi", re: /prakriti|sal ped|kheti|bail|pashu|karam|ganga|kaveri|samudra|agni|bhudevi|tusu|khangchendzonga|tendong|singbonga|sarna/i },
  { k: "tribal", l: "🪶 Janjati / Gram / Lok devta", re: /kine nane|nyokum|mopin|tamu|umang lai|u blei|ka blei|ker\b|garia|14 devta|gram devta|litsaba|nagoba|sammakka|nanyi|shiskar|jimutavahana|gugga|ramdev|jitto|nagaji/i },
  { k: "buddha", l: "☸️ Buddha / Guru Padmasambhava", re: /buddha|padmasambhava|buddhist/i },
  { k: "saint", l: "🙏 Sant / Guru / Peer / Christian", re: /guru nanak|sikh|khalsa|sufi|francis|john|kapil muni|bahubali|yogmaya|bakhtiyar|mavji/i },
  { k: "ancestor", l: "🕯️ Purkhe", re: /purkhe/i },
];
export function godOf(g) {
  const t = String(g || "");
  if (!t || t.trim() === "—" || t.startsWith("— ")) return t.includes("Sikh") || t.includes("Khalsa") ? "saint" : "none";
  const hit = GODS.find((x) => x.re.test(t));
  return hit ? hit.k : "tribal";
}

// ── Apne jode hue (owner) ──
const MINE = "cgl.culture.mine";
export function readMine() {
  if (typeof window === "undefined") return [];
  try { const v = JSON.parse(localStorage.getItem(MINE) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
}
export function writeMine(list) {
  try { localStorage.setItem(MINE, JSON.stringify(list)); } catch { /* quota */ }
  try { window.dispatchEvent(new CustomEvent("cgl:culture-mine")); } catch { /* SSR */ }
}

// ── Sab kuch ek seedhi list mein (quiz ke liye) ──
// { id, t: "cd"|"fd"|"fs"|"tr", st, n, note, why, god, gk, m, mine }
export const TLABEL = { cd: "Classical nritya", fd: "Lok (folk) nritya", fs: "Tyohar", tr: "Janjati" };
export const TICON = { cd: "💃", fd: "🥁", fs: "🪔", tr: "🏹" };
export function flatten(states, mine = []) {
  const out = [];
  for (const s of states) {
    for (const [n, note] of s.cd) out.push({ id: `cd:${s.k}:${n}`, t: "cd", st: s.k, n, note });
    for (const [n, note] of s.fd) out.push({ id: `fd:${s.k}:${n}`, t: "fd", st: s.k, n, note });
    for (const [n, why, god, m] of s.fs) out.push({ id: `fs:${s.k}:${n}`, t: "fs", st: s.k, n, why, god, gk: godOf(god), m });
    for (const [n, note] of s.tr) if (!n.startsWith("—")) out.push({ id: `tr:${s.k}:${n}`, t: "tr", st: s.k, n, note });
  }
  for (const x of mine) {
    if (!x || !x.n || !x.st || !x.t) continue;
    out.push({ ...x, id: `my:${x.id}`, mine: true, gk: x.t === "fs" ? godOf(x.god) : undefined, m: Number(x.m) || 0 });
  }
  return out;
}
export const stateOf = (k) => STATES.find((s) => s.k === k);

// ── Tile naksha: [col, row, chaudai] ──
export const TILE = {
  JK: [3, 0, 1], LA: [4, 0, 1],
  CH: [1, 1, 1], PB: [2, 1, 1], HP: [3, 1, 1], UK: [4, 1, 1], SK: [6, 1, 1], AR: [8, 1, 1],
  RJ: [1, 2, 1], HR: [2, 2, 1], DL: [3, 2, 1], UP: [4, 2, 1], BR: [5, 2, 1], AS: [7, 2, 1], NL: [8, 2, 1],
  GJ: [0, 3, 1], MP: [1, 3, 2], CG: [3, 3, 1], JH: [4, 3, 1], WB: [5, 3, 1], ML: [6, 3, 1], MN: [8, 3, 1],
  DN: [0, 4, 1], MH: [1, 4, 2], TG: [3, 4, 1], OD: [4, 4, 1], TR: [7, 4, 1], MZ: [8, 4, 1],
  GA: [1, 5, 1], KA: [2, 5, 1], AP: [3, 5, 1],
  LD: [0, 6, 1], KL: [2, 6, 1], TN: [3, 6, 1], PY: [4, 6, 1], AN: [6, 6, 1],
};
