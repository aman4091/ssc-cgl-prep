// RBE GK test-topic → Parmar book chapter mapping, so the /today plan can put
// "quiz these Parmar pages" buttons under each GK test (owner's ask: "GS portion
// mein sab Parmar SSC se link kar, unke pages ke quiz lagane hain").
//
// HAND-AUTHORED, verified against the actual transcribed page content (each
// ambiguous topic was grepped in public/parmar_*_notes/notes.json to find which
// chapter really covers it — e.g. "Capital Market" lives in "Banking: Part 2",
// "Climate" in "Monsoon", "Muslim League" mostly in "Quit India Movement").
// Chapter strings must EXACTLY match the pages' `topic` field in notes.json.
//
// A rule: [regex, bookSlug, [chapter, ...]] — first match wins, order matters
// (e.g. "Post - Mauryan" must match before "Mauryan Empire"). RBE test names
// carry PDF-extraction quirks ("Fundamental Du-es", "BhakI", "Centre - State"),
// so the patterns are loose on purpose.

const ECO = "parmar-economy";
const POL = "parmar-polity";
const HIS = "parmar-history";
const GEO = "parmar-geography";
const BIO = "parmar-biology";
const CHE = "parmar-chemistry";
const PHY = "parmar-physics";
const ENV = "parmar-environment";
const STA = "parmar-static";

const RULES = {
  Economics: [
    [/introduction to economics/i, ECO, ["Basics of Economy"]],
    [/national income/i, ECO, ["National Income"]],
    [/capital market/i, ECO, ["Banking: Part 2"]],
    [/banking financial system|types of money/i, ECO, ["Banking: Part 1"]],
    [/reserve bank/i, ECO, ["Banking: Part 1", "Monetary Policy"]],
    [/sectors of economy/i, ECO, ["Basics of Economy"]],
    [/planning in india|industrial polic|lpg|reforms/i, ECO, ["Five Year Plan and Industrial Policy"]],
    [/external sector|balance of payments|poverty/i, ECO, ["Poverty and Balance of Payment"]],
    [/international financial|reports/i, ECO, ["Indices, Reports & International Institutions"]],
    [/taxation|union budget/i, ECO, ["Budget and Taxation"]],
    [/agriculture/i, ECO, ["Five Year Plan and Industrial Policy"]],
    [/inflation|unemployment/i, ECO, ["Inflation and Unemployment"]],
    [/demographic|census/i, STA, ["Census"]],
  ],
  Polity: [
    [/sources of indian constitution/i, POL, ["Sources of the Indian Constitution"]],
    [/schedules/i, POL, ["Salient Features of the Constitution"]],
    [/fundamental rights/i, POL, ["Fundamental Rights"]],
    [/fundamental du|dpsp/i, POL, ["DPSP and Fundamental Duties"]],
    [/amendments/i, POL, ["Emergency and Constitutional Amendment"]],
    [/judiciary/i, POL, ["Supreme Court and High Court"]],
    [/parliament/i, POL, ["Parliament"]],
    [/president/i, POL, ["President and Vice President of India", "Prime Minister and Council of Ministers"]],
    [/state government bodies|state legislature/i, POL, ["State Legislature"]],
    [/urban local bodies/i, POL, ["Local Government"]],
    [/constitutional and non/i, POL, ["Constitutional and Non-Constitutional Bodies"]],
    [/centre.*state/i, POL, ["Centre-State Relations"]],
    [/miscellaneous/i, POL, ["Noteworthy Points"]],
    [/constitution/i, POL, ["Making of the Constitution", "Salient Features of the Constitution"]],
  ],
  History: [
    [/prehistoric/i, HIS, ["Stone Age"]],
    [/indus valley/i, HIS, ["Indus Valley Civilization"]],
    [/vedic age/i, HIS, ["Vedic Age"]],
    [/mahajanapadas/i, HIS, ["Mahajanapadas"]],
    [/post.*maury/i, HIS, ["Post-Maurya Dynasties"]],
    [/mauryan empire/i, HIS, ["Maurya Dynasty"]],
    [/buddhism|jainism/i, HIS, ["Jainism and Buddhism"]],
    [/post gupta/i, HIS, ["Post-Gupta Dynasties"]],
    [/gupta dynasty/i, HIS, ["Gupta Dynasty"]],
    [/sangam age/i, HIS, ["Sangam Age"]],
    [/pre medieval|chola/i, HIS, ["Tripartite Struggle and Cholas"]],
    [/turks|delhi sultanate|khilji|tughlaq|sayyid|lodi|slave dynasty|history of medieval india/i, HIS, ["Delhi Sultanate"]],
    [/vijayanagar/i, HIS, ["Vijayanagara and Bahmani Kingdom"]],
    [/mughal|babur|akbar|jahangir|aurangzeb/i, HIS, ["The Mughal Empire"]],
    [/maratha/i, HIS, ["Marathas"]],
    [/sufi|bhak/i, HIS, ["Bhakti and Sufi Movements"]],
    [/advent of europeans|expansion of british/i, HIS, ["Advent of Europeans"]],
    [/impact of british|administrative policies|governor general|viceroy/i, HIS, ["Governor-General and Viceroy"]],
    [/peasant|tribal|revolt of 1857/i, HIS, ["Revolt of 1857"]],
    [/socio religious/i, HIS, ["Socio Religious Reforms"]],
    [/political consciousness|formation of inc|indian nationalism/i, HIS, ["Indian National Congress"]],
    [/freedom struggle of the 1920/i, HIS, ["CDM and Simon Commission"]],
    [/emergence of gandhi|mass movements/i, HIS, ["Gandhian Era"]],
    [/swadeshi|revolutionary movement|bengal partition/i, HIS, ["Bengal Partition"]],
    [/muslim league|1940s|quit india/i, HIS, ["Quit India Movement"]],
  ],
  "Static GK": [
    [/dance/i, STA, ["Classical Dance", "Folk Dances of India"]],
    [/music/i, STA, ["Music and Paintings"]],
    [/awards/i, STA, ["Awards and Honours"]],
    [/books/i, STA, ["Books and Authors"]],
    [/census/i, STA, ["Census"]],
    [/festivals/i, STA, ["Festivals of India"]],
    [/sports/i, STA, ["Sports"]],
    [/national parks|wildlife|bird sanctuaries/i, ENV, ["National Parks"]],
    [/major lakes/i, GEO, ["Dams, Lakes and Waterfall"]],
    [/major rivers/i, GEO, ["Himalayan River System", "Peninsular Rivers"]],
    [/international organi[sz]ations/i, STA, ["International Organisations"]],
    [/important institutions/i, STA, ["National Organisations"]],
    [/important days/i, STA, ["Important Days"]],
  ],
  Geography: [
    [/solar system/i, GEO, ["Solar System"]],
    [/atmosphere/i, GEO, ["Atmosphere"]],
    [/climate/i, GEO, ["Monsoon"]],
    [/longitude|latitude/i, GEO, ["Longitude and Latitude"]],
    [/continents|rocks/i, GEO, ["Rocks, Continents and Oceans"]],
    [/soil/i, GEO, ["Soil"]],
    [/earthquakes|volcanoes/i, GEO, ["Earth's Interior and Plate Tectonics", "Rocks, Continents and Oceans"]],
    [/mountain passes/i, GEO, ["Himalayas"]],
    [/biosphere/i, ENV, ["National Parks"]],
    [/energy resources|mineral resources|industries/i, GEO, ["Minerals"]],
    [/world drainage|world geography/i, GEO, ["World Map"]],
    [/drainage system/i, GEO, ["Himalayan River System", "Peninsular Rivers"]],
    [/transportation|communication/i, GEO, ["Transport"]],
    [/census|demography/i, GEO, ["Human Geography"]],
    [/neighbouring countries/i, GEO, ["India and its Location"]],
    [/agriculture|animal husbandry/i, GEO, ["Agriculture"]],
    [/weathering|erosion/i, GEO, ["Geomorphology"]],
    [/northern plains|peninsular plateau|desert|coastal plains|ghats/i, GEO, ["Northern Plains and Islands", "Peninsular Plateau"]],
    [/natural vegetation/i, GEO, ["Forest and Grassland"]],
    [/water resources/i, GEO, ["Dams, Lakes and Waterfall"]],
  ],
  Biology: [
    [/cell/i, BIO, ["Cell"]],
    [/animal kingdom|plant kingdom|micro organism/i, BIO, ["Plant and Animal Kingdom"]],
    [/nutrition in plants/i, BIO, ["Nutrients"]],
    [/nutrition in animals|digestive|respiratory/i, BIO, ["Digestion and Respiration"]],
    [/excretory|circulatory/i, BIO, ["Circulatory System and Excretory System"]],
    [/nervous system|sensory organs/i, BIO, ["Nervous System"]],
    [/endocrine|enzymes|hormone/i, BIO, ["Hormones and Plant Movements"]],
    [/reproduction/i, BIO, ["Reproduction"]],
    [/diseases|vaccines/i, BIO, ["Diseases"]],
    [/heredity|genetics/i, BIO, ["Hereditary and Evolution"]],
  ],
  Chemistry: [
    [/structure of atoms/i, CHE, ["Atom and its Structure"]],
    [/periodic table/i, CHE, ["Periodic Table"]],
    [/metals and non|metallurgy/i, CHE, ["Metals and Non-Metals"]],
    [/chemical properties|chemical reactions|combustion/i, CHE, ["Chemical Reactions"]],
    [/acid/i, CHE, ["Acid, Base and Salt"]],
    [/solution|ideal gas|states of matter/i, CHE, ["Matter"]],
    [/organic chemistry/i, CHE, ["Carbon and its Compounds"]],
  ],
  Physics: [
    [/unit and measurement|kinematics/i, PHY, ["Motion"]],
    [/force/i, PHY, ["Force and Laws of Motion"]],
    [/work, power|gravitation|fluids/i, PHY, ["Gravitation and Work Done"]],
    [/sound|wave/i, PHY, ["Sound"]],
    [/light|reflection/i, PHY, ["Reflection and Refraction"]],
    [/electricity|magnetic/i, PHY, ["Electricity", "Magnetic Effect of Electric Current"]],
  ],
};

// Crash courses, playlists, e-books, revision items — supporting material, not a
// topic test; a Parmar row under them would be noise.
const SKIP = /crash course|playlist|e ?- ?book|magazine|revision|good questions|pdf link|in detail|printable/i;

// The Parmar chapters for one RBE GK item, or null. `sub` is the section's
// subject (sec.sub from lib/rbe50.js), `text` the item's cleaned text.
export function parmarFor(sub, text) {
  const rules = RULES[sub];
  if (!rules || SKIP.test(text)) return null;
  for (const [re, book, chapters] of rules) {
    if (re.test(text)) return { book, chapters };
  }
  return null;
}
