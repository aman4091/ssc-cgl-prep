// Ek hi thaili — din wale words (OWS / Idiom / Vocab) aur khud pakde hue
// New Words, dono saath.
//
// Pehle ye do alag duniya thin: /vocab ke din (50-50 ke) aur /new-words ka
// apna card. Owner ne kaha dono ek jagah ho — revision karte waqt ye farak
// koi matlab nahi rakhta ki word kitaab se aaya tha ya khud pakda gaya tha.
//
// Kram yahan HAMESHA ek jaisa hai (word ke hisaab se), kyunki drill apna
// kram list ke number (index) ki shakl mein bachata hai — list har baar
// alag kram mein banti to bachaya hua kram galat word par chala jata.
// Random dikhna drill ke `shuffleFirst` se aata hai, yahan se nahi.

import { getOws, getNewWordEntries, getMine, typeLabel, typeIcon } from "./vocab";

export const vocabId = (word) => `v:${String(word || "").trim().toLowerCase()}`;

/**
 * -> [{ id, word, meaning, def, type, label, icon, mine }]
 *
 * `meaning` = jo card par dikhana hai: tumhari apni paste ki hui samjhaish
 * (cgl.vocab.mine) sabse upar, warna word ki apni angrezi def.
 */
export function vocabPool() {
  const byId = new Map();
  for (const it of getOws()) {
    const word = String(it.word || "").trim();
    if (!word) continue;
    const id = vocabId(word);
    if (byId.has(id)) continue;
    const mine = getMine(word);
    byId.set(id, {
      id, word, type: it.type || "vocab",
      label: typeLabel(it.type), icon: typeIcon(it.type),
      def: it.def || "", mine, meaning: mine || it.def || "",
    });
  }
  for (const e of getNewWordEntries()) {
    const word = String(e.w || "").trim();
    if (!word) continue;
    const id = vocabId(word);
    const mine = getMine(word);
    const old = byId.get(id);
    if (old) {
      // Wahi word dono jagah — meaning jahan se bhi mile, le lo.
      if (!old.meaning && mine) byId.set(id, { ...old, mine, meaning: mine });
      continue;
    }
    byId.set(id, {
      id, word, type: "new", label: "New Word", icon: "\u{1F4CB}",
      def: "", mine, meaning: mine,
    });
  }
  return [...byId.values()].sort((a, b) => a.word.toLowerCase().localeCompare(b.word.toLowerCase()));
}
