// 🇮🇳 States & UT ka GK — tribe, dance, aur festival (kyun manate hain, kis
// devta ka hai).
//
// SSC CGL mein isi se sawaal aate hain: "Cheraw kis rajya ka nritya hai?",
// "Wangala kis devta ke liye?", "Bonda janjati kahan?" — isliye har rajya
// ka wahi maal yahan hai jo paper mein baar-baar aata hai, na ki poori
// encyclopaedia.
//
// Har entry:
//   k, name, type ("state" | "ut"), region
//   tribes[]  — janjatiyan
//   dances[]  — "naam" ya "naam — kiska/kaisa"
//   fests[]   — { n: naam, why: kyun manate hain, god: kis devta ka (ya "—") }
//
// Page /states isi se 15 tarike banata hai (dekhne ke bhi, test ke bhi).

export const STATES = [
  {
    k: "ap", name: "Andhra Pradesh", type: "state", region: "South",
    tribes: ["Chenchu", "Koya", "Yanadi", "Savara", "Gadaba"],
    dances: ["Kuchipudi (classical)", "Veeranatyam", "Burrakatha", "Dhimsa", "Butta Bommalu"],
    fests: [
      { n: "Ugadi", why: "Telugu naya saal", god: "—" },
      { n: "Tirupati Brahmotsavam", why: "Tirumala ka 9-din ka utsav", god: "Venkateswara (Vishnu)" },
      { n: "Makar Sankranti / Bhogi", why: "fasal ka tyohar", god: "Surya" },
    ],
  },
  {
    k: "ar", name: "Arunachal Pradesh", type: "state", region: "North-East",
    tribes: ["Nyishi (sabse badi)", "Adi", "Apatani", "Galo", "Monpa", "Mishmi"],
    dances: ["Bardo Chham", "Ponung (Adi)", "Popir", "Wancho", "Chalo"],
    fests: [
      { n: "Nyokum", why: "Nyishi — dharti aur prakriti se sukh-shanti ki prarthana", god: "Nyokum devi" },
      { n: "Solung", why: "Adi — fasal aur pashu-dhan ka tyohar", god: "Doying Bote" },
      { n: "Mopin", why: "Galo — samriddhi aur nayi fasal (chawal ka aata lagate hain)", god: "Mopin Ane" },
      { n: "Dree", why: "Apatani — achhi fasal ke liye", god: "Tamu, Metii, Danyi" },
      { n: "Losar", why: "Monpa ka naya saal", god: "Buddh (Buddhist)" },
      { n: "Si-Donyi", why: "Tagin — dharti aur surya ki pooja", god: "Si (dharti) + Donyi (surya)" },
    ],
  },
  {
    k: "as", name: "Assam", type: "state", region: "North-East",
    tribes: ["Bodo", "Mishing", "Karbi", "Dimasa", "Rabha"],
    dances: ["Bihu", "Bagurumba (Bodo — titli nach)", "Jhumur", "Ojapali", "Sattriya (classical)"],
    fests: [
      { n: "Bihu (Rongali/Bohag)", why: "naya saal aur bijai ka mausam — April", god: "—" },
      { n: "Ambubachi Mela", why: "devi ka rajaswala kaal — Kamakhya mandir band rehta hai", god: "Kamakhya devi" },
      { n: "Me-Dam-Me-Phi", why: "Ahom — purvajon ki yaad", god: "purvaj" },
      { n: "Baishagu", why: "Bodo ka naya saal", god: "Bathou (Shiva)" },
    ],
  },
  {
    k: "br", name: "Bihar", type: "state", region: "East",
    tribes: ["Santhal", "Oraon", "Munda", "Tharu", "Ho"],
    dances: ["Jat-Jatin", "Bidesia", "Paika", "Jhijhian", "Jhumari"],
    fests: [
      { n: "Chhath", why: "doobte aur ugte suraj ko arghya — santan aur sukh ke liye", god: "Surya + Chhathi Maiya" },
      { n: "Sama-Chakeva", why: "bhai-behen ka tyohar (Mithila), pravasi pakshiyon ke aane par", god: "—" },
      { n: "Madhushravani", why: "nayi dulhan ka vrat (Mithila)", god: "Shiv-Parvati" },
      { n: "Sonepur Mela", why: "Asia ka sabse bada pashu mela", god: "—" },
    ],
  },
  {
    k: "cg", name: "Chhattisgarh", type: "state", region: "Central",
    tribes: ["Gond", "Baiga", "Muria", "Abujhmaria", "Halba", "Bhatra"],
    dances: ["Panthi (Satnami)", "Raut Nacha", "Karma", "Saila", "Pandwani (gaayan)"],
    fests: [
      { n: "Bastar Dussehra", why: "duniya ka sabse lamba (75 din) — Ram se nahi juda", god: "Danteshwari devi" },
      { n: "Madai", why: "gaon-gaon ghoomta tribal mela", god: "gram devi" },
      { n: "Hareli", why: "kheti ke auzaron ki pooja, saal ka pehla tyohar", god: "—" },
      { n: "Bhoramdeo Mahotsav", why: "mandir ka utsav", god: "Shiva" },
    ],
  },
  {
    k: "ga", name: "Goa", type: "state", region: "West",
    tribes: ["Gawda", "Kunbi", "Velip", "Dhodia"],
    dances: ["Dekhni", "Fugdi", "Dhalo", "Mando", "Ghode Modni"],
    fests: [
      { n: "Goa Carnival", why: "Lent se pehle ka 3-din ka josh (Portuguese virasat)", god: "—" },
      { n: "Shigmo", why: "basant ka tyohar (Holi jaisa)", god: "—" },
      { n: "Sao Joao", why: "paani mein koodne wala tyohar, monsoon ka swagat", god: "St. John the Baptist" },
    ],
  },
  {
    k: "gj", name: "Gujarat", type: "state", region: "West",
    tribes: ["Bhil", "Dubla", "Rabari", "Siddi", "Dhodia"],
    dances: ["Garba", "Dandiya Raas", "Bhavai", "Tippani", "Padhar"],
    fests: [
      { n: "Navratri (Garba)", why: "9 raat devi ki upasana", god: "Amba / Durga" },
      { n: "Uttarayan", why: "Makar Sankranti — patangon ka tyohar", god: "Surya" },
      { n: "Rann Utsav", why: "safed registan ka utsav (Kutch)", god: "—" },
      { n: "Modhera Dance Festival", why: "Surya mandir par nritya", god: "Surya" },
    ],
  },
  {
    k: "hr", name: "Haryana", type: "state", region: "North",
    tribes: ["(koi notified ST nahi)"],
    dances: ["Saang", "Dhamal", "Khoria", "Phag", "Loor"],
    fests: [
      { n: "Gugga Naumi", why: "saanp ke devta ki pooja", god: "Gugga Pir (Naag devta)" },
      { n: "Teej", why: "sawan aur suhaag ka tyohar", god: "Parvati" },
      { n: "Baisakhi", why: "gehun ki fasal", god: "—" },
      { n: "Surajkund Mela", why: "shilp mela (Faridabad)", god: "—" },
    ],
  },
  {
    k: "hp", name: "Himachal Pradesh", type: "state", region: "North",
    tribes: ["Gaddi", "Gujjar", "Kinnaura", "Lahaula", "Pangwala"],
    dances: ["Nati (Guinness record)", "Kayang", "Chhambha", "Dangi", "Losar Shona Chuksam"],
    fests: [
      { n: "Kullu Dussehra", why: "jab desh ka Dussehra khatam, tab shuru — devtaon ka sammelan", god: "Raghunath ji (Ram)" },
      { n: "Minjar Mela", why: "Chamba — makai ki baali (minjar) nadi mein bahate hain", god: "Raghuvira / Varun" },
      { n: "Lavi Mela", why: "Rampur ka vyapaar mela", god: "—" },
      { n: "Losar", why: "Lahaul-Spiti ka naya saal", god: "Buddh (Buddhist)" },
    ],
  },
  {
    k: "jh", name: "Jharkhand", type: "state", region: "East",
    tribes: ["Santhal", "Munda", "Oraon", "Ho", "Birhor", "Asur"],
    dances: ["Chhau (Seraikela)", "Paika", "Jhumar", "Domkach", "Karma"],
    fests: [
      { n: "Sarhul", why: "Sal ke ped par phool aane par — naye saal ki shuruat", god: "Dharti Maa (Sarna)" },
      { n: "Karma", why: "Karam ki daali gaad kar bhai ki lambi umar", god: "Karam devta" },
      { n: "Sohrai", why: "mawesiyon ka tyohar, ghar par Sohrai chitrakari", god: "—" },
      { n: "Tusu Parab", why: "Makar Sankranti par kunwari ladkiyon ka", god: "Tusu devi" },
    ],
  },
  {
    k: "ka", name: "Karnataka", type: "state", region: "South",
    tribes: ["Soliga", "Jenu Kuruba", "Siddi", "Koraga", "Hakki Pikki"],
    dances: ["Yakshagana", "Dollu Kunitha (dhol)", "Veeragase", "Bayalata", "Kamsale"],
    fests: [
      { n: "Mysore Dasara", why: "Nadahabba — rajya ka tyohar, 10 din", god: "Chamundeshwari devi" },
      { n: "Karaga", why: "sar par matka le kar (Bengaluru)", god: "Draupadi devi" },
      { n: "Ugadi", why: "naya saal — neem aur gud", god: "—" },
      { n: "Hampi Utsav", why: "Vijayanagar ki virasat ka utsav", god: "—" },
    ],
  },
  {
    k: "kl", name: "Kerala", type: "state", region: "South",
    tribes: ["Irular", "Paniyan", "Kurichiyan", "Kurumba", "Kadar", "Cholanaickan"],
    dances: ["Kathakali (classical)", "Mohiniyattam (classical)", "Theyyam", "Thiruvathira", "Ottamthullal", "Chakyar Koothu", "Kaikottikali"],
    fests: [
      { n: "Onam", why: "Raja Mahabali ke saal mein ek baar lautne ki khushi — 10 din, pookalam, vallamkali", god: "Vamana / Mahabali" },
      { n: "Vishu", why: "Malayali naya saal — subah pehli nazar 'Vishukkani' par", god: "Krishna (Vishnu)" },
      { n: "Thrissur Pooram", why: "haathiyon ka sabse bada utsav", god: "Vadakkunnathan (Shiva)" },
      { n: "Attukal Pongala", why: "duniya ki sabse badi mahilaon ki sabha (Guinness)", god: "Attukal Bhagavathy (devi)" },
    ],
  },
  {
    k: "mp", name: "Madhya Pradesh", type: "state", region: "Central",
    tribes: ["Gond (bharat ki sabse badi)", "Bhil", "Baiga", "Korku", "Sahariya"],
    dances: ["Matki", "Gangaur", "Charkula", "Badhai", "Grida", "Phulpati"],
    fests: [
      { n: "Bhagoria Haat", why: "Bhil-Bhilala — Holi se pehle ka mela, yahin jeevan-sathi chunte hain", god: "—" },
      { n: "Khajuraho Dance Festival", why: "mandiron ke saamne shastriya nritya", god: "—" },
      { n: "Mahashivratri (Ujjain)", why: "Mahakaleshwar ki nagri ka sabse bada din", god: "Shiva" },
      { n: "Lokrang", why: "Bhopal ka lok-kala utsav", god: "—" },
    ],
  },
  {
    k: "mh", name: "Maharashtra", type: "state", region: "West",
    tribes: ["Bhil", "Gond", "Warli", "Koli", "Katkari"],
    dances: ["Lavani", "Tamasha", "Koli", "Dhangari Gaja", "Dindi", "Povada (veer gaatha)"],
    fests: [
      { n: "Ganesh Chaturthi", why: "10 din ka sabse bada tyohar — Tilak ne jan-andolan banaya", god: "Ganesh" },
      { n: "Gudi Padwa", why: "Marathi naya saal — ghar par gudi", god: "—" },
      { n: "Pola", why: "bailon ka tyohar (kisan)", god: "—" },
      { n: "Ellora Festival", why: "gufaon ke saamne nritya-sangeet", god: "—" },
    ],
  },
  {
    k: "mn", name: "Manipur", type: "state", region: "North-East",
    tribes: ["Meitei", "Tangkhul", "Kuki", "Kabui", "Maram"],
    dances: ["Manipuri / Raas Leela (classical)", "Thang-Ta (yuddh kala)", "Lai Haraoba", "Dhol Cholom", "Pung Cholom"],
    fests: [
      { n: "Lai Haraoba", why: "'devtaon ko khush karna' — srishti ki kahani nritya se", god: "Umang Lai (van devta)" },
      { n: "Yaoshang", why: "Manipur ki Holi — 5 din, Thabal Chongba nritya", god: "Krishna" },
      { n: "Ningol Chakouba", why: "shaadi-shuda betiyon ko maayke bulana", god: "—" },
      { n: "Kut", why: "Kuki-Chin-Mizo ka fasal tyohar", god: "—" },
    ],
  },
  {
    k: "ml", name: "Meghalaya", type: "state", region: "North-East",
    tribes: ["Khasi", "Garo", "Jaintia (Pnar)"],
    dances: ["Nongkrem", "Shad Suk Mynsiem", "Wangala (100 drums)", "Behdienkhlam", "Laho"],
    fests: [
      { n: "Nongkrem", why: "Khasi — achhi fasal ke liye dhanyavaad, bakre ki bali", god: "Ka Blei Synshar (devi)" },
      { n: "Wangala", why: "Garo — 100 dhol wala fasal tyohar", god: "Saljong (Surya devta)" },
      { n: "Shad Suk Mynsiem", why: "Khasi — 'khush dil ka nritya', boye hue beej ke baad", god: "—" },
      { n: "Behdienkhlam", why: "Jaintia — bimari aur bala ko bhagane ke liye", god: "—" },
    ],
  },
  {
    k: "mz", name: "Mizoram", type: "state", region: "North-East",
    tribes: ["Mizo (Lusei)", "Lai", "Mara", "Chakma", "Hmar"],
    dances: ["Cheraw (bamboo dance)", "Khuallam", "Chheihlam", "Sarlamkai", "Solakia"],
    fests: [
      { n: "Chapchar Kut", why: "jhum kheti ke liye jungle saaf karne ke baad — Cheraw isi mein", god: "—" },
      { n: "Mim Kut", why: "makai ki fasal, purvajon ko yaad", god: "purvaj" },
      { n: "Pawl Kut", why: "fasal kaatne ke baad ka tyohar", god: "—" },
    ],
  },
  {
    k: "nl", name: "Nagaland", type: "state", region: "North-East",
    tribes: ["Angami", "Ao", "Konyak (chehre par gudai)", "Sema/Sumi", "Lotha"],
    dances: ["War Dance", "Chang Lo (Sua Lua)", "Zeliang", "Modse", "Butterfly dance"],
    fests: [
      { n: "Hornbill Festival", why: "'tyoharon ka tyohar' — 1-10 December, saari tribe ek jagah (Kisama)", god: "—" },
      { n: "Moatsu", why: "Ao — bij boye jaane ke baad aaram aur khushi", god: "—" },
      { n: "Sekrenyi", why: "Angami — shuddhikaran (purification), 10 din", god: "—" },
      { n: "Aoling", why: "Konyak ka naya saal / basant", god: "—" },
      { n: "Tuluni", why: "Sumi — sabse bada bhoj wala tyohar", god: "—" },
    ],
  },
  {
    k: "od", name: "Odisha", type: "state", region: "East",
    tribes: ["Santhal", "Kondh (sabse badi)", "Bonda", "Juang", "Saora", "Koya"],
    dances: ["Odissi (classical)", "Chhau (Mayurbhanj)", "Ghumura", "Gotipua", "Ranappa", "Dalkhai"],
    fests: [
      { n: "Rath Yatra (Puri)", why: "teen devta rath par mausi ke ghar jaate hain", god: "Jagannath, Balabhadra, Subhadra" },
      { n: "Raja Parba", why: "dharti maa ka rajaswala kaal — 3 din kheti band", god: "Bhudevi (dharti)" },
      { n: "Nuakhai", why: "nayi fasal ka pehla nivala", god: "Samaleswari devi" },
      { n: "Konark Festival", why: "Surya mandir par nritya utsav", god: "Surya" },
    ],
  },
  {
    k: "pb", name: "Punjab", type: "state", region: "North",
    tribes: ["(koi notified ST nahi)"],
    dances: ["Bhangra", "Giddha", "Jhumar", "Malwai Giddha", "Kikkli", "Sammi"],
    fests: [
      { n: "Baisakhi", why: "gehun ki fasal + 1699 mein Khalsa ki sthapna", god: "—" },
      { n: "Lohri", why: "sabse chhoti raat — aag, til-gud; Dulha Bhatti ke geet", god: "Agni / Surya" },
      { n: "Hola Mohalla", why: "Anandpur Sahib — Nihangon ka shakti-pradarshan", god: "Guru Gobind Singh ji ne shuru kiya" },
      { n: "Gurpurab", why: "Guru Nanak dev ji ka prakash parv", god: "Guru Nanak" },
    ],
  },
  {
    k: "rj", name: "Rajasthan", type: "state", region: "North",
    tribes: ["Bhil", "Meena", "Garasia", "Sahariya", "Damor"],
    dances: ["Ghoomar", "Kalbeliya (UNESCO)", "Kathputli", "Bhavai", "Chari", "Terah Taali", "Gair"],
    fests: [
      { n: "Pushkar Mela", why: "oonth mela aur snan", god: "Brahma (duniya ka mukhya Brahma mandir)" },
      { n: "Gangaur", why: "suhaag ka tyohar — Gauri ki sawari", god: "Gauri (Parvati) + Ishar (Shiva)" },
      { n: "Teej", why: "sawan ka swagat, Jaipur ki sawari mashhoor", god: "Parvati" },
      { n: "Desert Festival", why: "Jaisalmer — registan ka utsav", god: "—" },
    ],
  },
  {
    k: "sk", name: "Sikkim", type: "state", region: "North-East",
    tribes: ["Lepcha (sabse purani)", "Bhutia", "Limboo (Subba)"],
    dances: ["Singhi Chham (snow lion)", "Yak Chham", "Maruni", "Chu Faat", "Tashi Yangku"],
    fests: [
      { n: "Pang Lhabsol", why: "Kanchenjunga ko rakshak devta maan kar dhanyavaad", god: "Kanchenjunga" },
      { n: "Saga Dawa", why: "Buddh ka janm, gyaan aur nirvana — teeno ek hi din", god: "Buddh" },
      { n: "Losoong / Namsoong", why: "Sikkimese naya saal aur fasal ka ant", god: "—" },
      { n: "Losar", why: "Tibbati naya saal", god: "Buddh (Buddhist)" },
    ],
  },
  {
    k: "tn", name: "Tamil Nadu", type: "state", region: "South",
    tribes: ["Toda", "Irula", "Kota", "Kurumba", "Badaga"],
    dances: ["Bharatanatyam (classical)", "Karagattam", "Kolattam", "Kummi", "Oyilattam", "Mayilattam", "Therukoothu"],
    fests: [
      { n: "Pongal", why: "4 din ka fasal tyohar — Bhogi, Thai Pongal, Mattu Pongal, Kaanum", god: "Surya" },
      { n: "Thaipusam", why: "devi ne vel (bhaala) diya tha — kavadi uthate hain", god: "Murugan (Kartikeya)" },
      { n: "Jallikattu", why: "Mattu Pongal par saand ko kaabu karna", god: "—" },
      { n: "Natyanjali", why: "Chidambaram mandir par nritya arpan (Mahashivratri)", god: "Nataraja (Shiva)" },
    ],
  },
  {
    k: "tg", name: "Telangana", type: "state", region: "South",
    tribes: ["Chenchu", "Gond", "Koya", "Lambada (Banjara)", "Kolam"],
    dances: ["Perini Shivatandavam (yoddha ka nritya)", "Lambadi", "Dhimsa", "Gussadi", "Oggu Katha"],
    fests: [
      { n: "Bonala", why: "bimari se bachne par devi ko bhojan (bonam) chadhana", god: "Mahakali devi" },
      { n: "Bathukamma", why: "phoolon ko dher bana kar mahilaon ka tyohar — 9 din", god: "Gauri devi" },
      { n: "Sammakka Saralamma Jatara", why: "Asia ka sabse bada tribal mela (Medaram), har 2 saal mein", god: "Sammakka aur Saralamma (devi)" },
    ],
  },
  {
    k: "tr", name: "Tripura", type: "state", region: "North-East",
    tribes: ["Tripuri", "Reang (Bru)", "Chakma", "Jamatia", "Halam"],
    dances: ["Hojagiri (Reang — sar par ghada, bottle par)", "Garia", "Lebang Boomani", "Bizhu", "Mamita"],
    fests: [
      { n: "Garia Puja", why: "pashu aur achhi fasal ke liye — bamboo ka devta", god: "Garia" },
      { n: "Kharchi Puja", why: "dharti ki safai — 14 devtaon ki pooja", god: "14 devta (Chaturdasha)" },
      { n: "Ker Puja", why: "rajya ki raksha ke liye — bahar jaana mana", god: "Ker (rakshak devta)" },
    ],
  },
  {
    k: "up", name: "Uttar Pradesh", type: "state", region: "North",
    tribes: ["Tharu", "Buksa", "Bhotia", "Jaunsari", "Gond"],
    dances: ["Kathak (classical)", "Raslila", "Charkula (Braj)", "Nautanki", "Dhobiya", "Khyal"],
    fests: [
      { n: "Kumbh / Magh Mela", why: "Prayagraj ke sangam par snan", god: "—" },
      { n: "Janmashtami (Mathura)", why: "Krishna ka janm", god: "Krishna" },
      { n: "Ram Navami (Ayodhya)", why: "Ram ka janm", god: "Ram" },
      { n: "Ganga Mahotsav", why: "Varanasi — Dev Deepawali ke aas-paas", god: "Ganga" },
    ],
  },
  {
    k: "uk", name: "Uttarakhand", type: "state", region: "North",
    tribes: ["Tharu", "Jaunsari", "Bhotia", "Buksa", "Raji"],
    dances: ["Chholiya (talwar nritya)", "Langvir Nritya", "Barada Nati", "Jhumeila", "Chancheri"],
    fests: [
      { n: "Nanda Devi Raj Jat", why: "har 12 saal — Himalaya ki sabse lambi dharmik yatra", god: "Nanda devi" },
      { n: "Kanwar Yatra", why: "Haridwar se Ganga jal le kar", god: "Shiva" },
      { n: "Ganga Dussehra", why: "Ganga ke dharti par aane ka din", god: "Ganga" },
      { n: "Harela", why: "hariyali aur beej bone ka tyohar", god: "Shiv-Parvati" },
    ],
  },
  {
    k: "wb", name: "West Bengal", type: "state", region: "East",
    tribes: ["Santhal", "Oraon", "Munda", "Bhutia", "Lepcha", "Toto"],
    dances: ["Chhau (Purulia)", "Gambhira", "Baul (gaayan)", "Kathi", "Dhali", "Brita"],
    fests: [
      { n: "Durga Puja", why: "Mahishasur par jeet — UNESCO ki suchi mein", god: "Durga" },
      { n: "Poila Boishakh", why: "Bangla naya saal", god: "—" },
      { n: "Gajan", why: "Chaitra ke ant mein kathin vrat", god: "Shiva" },
      { n: "Jhapan", why: "saanpon ka tyohar (Bishnupur)", god: "Manasa devi" },
    ],
  },

  // ── Union Territories ──
  {
    k: "an", name: "Andaman & Nicobar", type: "ut", region: "Islands",
    tribes: ["Great Andamanese", "Onge", "Jarawa", "Sentinelese", "Shompen", "Nicobarese"],
    dances: ["Nicobarese dance", "Monkey dance (Onge)"],
    fests: [
      { n: "Island Tourism Festival", why: "10 din ka sanskritik utsav (Port Blair)", god: "—" },
      { n: "Ossuary Feast", why: "Nicobari — purvajon ki haddiyon ki vidai", god: "purvaj" },
    ],
  },
  {
    k: "ch", name: "Chandigarh", type: "ut", region: "North",
    tribes: ["(koi notified ST nahi)"],
    dances: ["Bhangra", "Giddha"],
    fests: [
      { n: "Rose Festival", why: "Zakir Hussain Rose Garden mein gulaab ka utsav", god: "—" },
      { n: "Baisakhi", why: "fasal ka tyohar", god: "—" },
    ],
  },
  {
    k: "dd", name: "Dadra & Nagar Haveli aur Daman & Diu", type: "ut", region: "West",
    tribes: ["Warli", "Dhodia", "Kokna", "Dubla", "Koli"],
    dances: ["Tarpa (Warli)", "Dhodia", "Bhavada", "Gherio"],
    fests: [
      { n: "Nariyal Poornima", why: "machhuaron ka — samundar ko nariyal", god: "Varun (samundar)" },
      { n: "Tarpa Utsav", why: "Warli janjati ka nritya utsav", god: "—" },
    ],
  },
  {
    k: "dl", name: "Delhi", type: "ut", region: "North",
    tribes: ["(koi notified ST nahi)"],
    dances: ["Kathak", "Bhangra (lok)"],
    fests: [
      { n: "Phool Walon Ki Sair", why: "Mehrauli — mandir aur dargah dono par phoolon ka pankha (ganga-jamuni tehzeeb)", god: "Yogmaya devi + Bakhtiyar Kaki ki dargah" },
      { n: "Qutub Festival", why: "Qutub Minar ke paas sangeet utsav", god: "—" },
    ],
  },
  {
    k: "jk", name: "Jammu & Kashmir", type: "ut", region: "North",
    tribes: ["Gujjar", "Bakarwal", "Gaddi", "Sippi"],
    dances: ["Rouf", "Dumhal (Wattal)", "Hafiza", "Bhand Pather", "Bacha Nagma"],
    fests: [
      { n: "Amarnath Yatra", why: "barf ke shivling ke darshan", god: "Shiva" },
      { n: "Navroz", why: "Parsi/Shia naya saal", god: "—" },
      { n: "Tulip Festival", why: "Srinagar — Asia ka sabse bada tulip bagh", god: "—" },
      { n: "Bahu Mela", why: "Jammu ke Bahu fort ke mandir mein", god: "Kali (Bawe Wali Mata)" },
    ],
  },
  {
    k: "lh", name: "Ladakh", type: "ut", region: "North",
    tribes: ["Balti", "Changpa", "Brokpa", "Drokpa", "Bot"],
    dances: ["Cham (mask dance)", "Jabro", "Shondol (Guinness)", "Chabs-Skyan"],
    fests: [
      { n: "Hemis Festival", why: "Hemis math mein mask dance", god: "Guru Padmasambhava ka janmdin" },
      { n: "Losar", why: "Ladakhi naya saal", god: "Buddh (Buddhist)" },
      { n: "Sindhu Darshan", why: "Sindhu nadi ke kinare", god: "Sindhu (nadi)" },
    ],
  },
  {
    k: "ld", name: "Lakshadweep", type: "ut", region: "Islands",
    tribes: ["(aabadi ka bada hissa ST — Aminidivi, Minicoy ke log)"],
    dances: ["Lava (Minicoy)", "Kolkali", "Parichakali"],
    fests: [
      { n: "Eid-ul-Fitr", why: "Ramzan ke baad", god: "—" },
      { n: "Minicoy Lava utsav", why: "naaviko ka nritya", god: "—" },
    ],
  },
  {
    k: "py", name: "Puducherry", type: "ut", region: "South",
    tribes: ["Irular"],
    dances: ["Garadi (Ramayana ke vanar)", "Bharatanatyam", "Villupattu (gaayan)"],
    fests: [
      { n: "Masi Magam", why: "samundar mein devta ka snan (Masi maheena)", god: "mandir ke devta" },
      { n: "Fete de Puducherry / Bastille Day", why: "French virasat", god: "—" },
    ],
  },
];

export const REGIONS = ["North", "South", "East", "West", "Central", "North-East", "Islands"];

export function stateOf(k) { return STATES.find((s) => s.k === k) || null; }

// ── sawaal-jawab ke jode ────────────────────────────────────────────────
// kind: "dance" | "fest" | "tribe" | "why" | "god"
// Har jodi: { id, kind, q (cheez), a (rajya ya jawab), s (rajya ka naam), extra }
export function pairs(kind) {
  const out = [];
  for (const s of STATES) {
    if (kind === "dance") for (const d of s.dances) out.push({ id: `d|${s.k}|${d}`, kind, q: d, a: s.name, s: s.name, sk: s.k });
    if (kind === "tribe") for (const t of s.tribes) {
      if (t.startsWith("(")) continue;
      out.push({ id: `t|${s.k}|${t}`, kind, q: t, a: s.name, s: s.name, sk: s.k });
    }
    if (kind === "fest") for (const f of s.fests) out.push({ id: `f|${s.k}|${f.n}`, kind, q: f.n, a: s.name, s: s.name, sk: s.k, extra: f.why });
    if (kind === "why") for (const f of s.fests) out.push({ id: `w|${s.k}|${f.n}`, kind, q: `${f.n} (${s.name})`, a: f.why, s: s.name, sk: s.k });
    if (kind === "god") for (const f of s.fests) {
      if (!f.god || f.god === "—") continue;
      out.push({ id: `g|${s.k}|${f.n}`, kind, q: `${f.n} (${s.name})`, a: f.god, s: s.name, sk: s.k });
    }
  }
  return out;
}

export const KINDS = [
  { k: "dance", label: "💃 Nritya", ask: "Ye nritya kis rajya ka hai?" },
  { k: "fest", label: "🎉 Tyohar", ask: "Ye tyohar kis rajya ka hai?" },
  { k: "tribe", label: "🪶 Janjati", ask: "Ye janjati kis rajya mein hai?" },
  { k: "god", label: "🕉️ Devta", ask: "Ye tyohar kis devta ka hai?" },
  { k: "why", label: "❓ Kyun", ask: "Ye tyohar kyun manate hain?" },
];

export function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Chaar option — jawab ke saath teen aur, usi tarah ke jawabon mein se.
export function options(item, all) {
  const out = [item.a];
  for (const x of shuffle(all)) {
    if (out.length >= 4) break;
    if (!out.includes(x.a)) out.push(x.a);
  }
  return shuffle(out);
}
