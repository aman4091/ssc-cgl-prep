// The fixed shelf the Notebook is organised by: four subjects, each with its own
// list of chapters. An entry's `subject` field stores the subject LABEL ("English",
// "Maths", "GS", "Reasoning") and its `topic` field stores a chapter label ("Noun",
// "Percentage", …). The composer picks both from these lists so the notebook stays
// tidy instead of a flat pile — the left rail is the subjects, the drill-in is the
// chapters. "Miscellaneous" is every subject's catch-all.

export const NB_SUBJECTS = [
  {
    key: "gs",
    label: "GS",
    icon: "🌍",
    chapters: [
      "History", "Polity", "Geography", "Economics", "Physics", "Chemistry",
      "Biology", "Environment", "Static GK", "Current Affairs", "Miscellaneous",
    ],
  },
  {
    key: "math",
    label: "Maths",
    icon: "🧮",
    chapters: [
      "Number System", "Simplification", "LCM & HCF", "Percentage", "Profit & Loss",
      "Discount", "Ratio & Proportion", "Average", "Mixture & Alligation", "Time & Work",
      "Pipes & Cisterns", "Time, Speed & Distance", "Simple & Compound Interest",
      "Partnership", "Algebra", "Geometry", "Mensuration", "Trigonometry",
      "Height & Distance", "Data Interpretation", "Number Series", "Miscellaneous",
    ],
  },
  {
    key: "english",
    label: "English",
    icon: "✍️",
    chapters: [
      "Noun", "Pronoun", "Verb", "Adjective", "Adverb", "Preposition", "Conjunction",
      "Article", "Tense", "Subject-Verb Agreement", "Narration", "Active & Passive Voice",
      "Spotting Errors", "Sentence Improvement", "Fill in the Blanks", "Cloze Test",
      "Para Jumbles", "Reading Comprehension", "Synonyms", "Antonyms",
      "One Word Substitution", "Idioms & Phrases", "Spelling", "Vocabulary", "Miscellaneous",
    ],
  },
  {
    key: "reasoning",
    label: "Reasoning",
    icon: "🧠",
    chapters: [
      "Analogy", "Classification", "Series", "Coding-Decoding", "Blood Relations",
      "Direction Sense", "Order & Ranking", "Syllogism", "Venn Diagram",
      "Seating Arrangement", "Puzzle", "Mathematical Operations", "Statement & Conclusion",
      "Mirror Image", "Water Image", "Paper Folding & Cutting", "Embedded Figures",
      "Dice & Cube", "Clock & Calendar", "Miscellaneous",
    ],
  },
];

export function subjectByLabel(label) {
  return NB_SUBJECTS.find((s) => s.label === label) || null;
}

export function chaptersFor(label) {
  return subjectByLabel(label)?.chapters || [];
}
