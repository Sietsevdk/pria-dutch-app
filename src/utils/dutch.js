/**
 * Dutch-specific language helpers
 */

/**
 * Common het-words patterns and list
 */
export const HET_WORD_RULES = [
  { rule: 'Diminutives ending in -je (huisje, katje, bloemetje)', pattern: /je$/ },
  { rule: 'Words starting with ge- (gebouw, geluk, gevoel)', pattern: /^ge/ },
  { rule: 'Words starting with be- (begin, besluit, bestuur)', pattern: null },
  { rule: 'Words starting with ver- (verkeer, verschil, verleden)', pattern: /^ver/ },
  { rule: 'Languages (het Nederlands, het Engels)', pattern: null },
  { rule: 'Metals (het goud, het zilver, het ijzer)', pattern: null },
  { rule: 'Sports and games (het voetbal, het tennis)', pattern: null },
  { rule: 'Compass directions (het noorden, het zuiden)', pattern: null },
  { rule: 'Two-syllable words starting with ont- (het ontbijt, het ontslag)', pattern: /^ont/ },
  { rule: 'Words ending in -isme (het realisme)', pattern: /isme$/ },
  { rule: 'Words ending in -ment (het moment, het document)', pattern: /ment$/ },
  { rule: 'Words ending in -sel (het raadsel, het voedsel)', pattern: /sel$/ },
  { rule: 'Words ending in -um (het museum, het centrum)', pattern: /um$/ },
];

export const COMMON_HET_WORDS = [
  'het huis', 'het kind', 'het water', 'het boek', 'het jaar',
  'het land', 'het werk', 'het probleem', 'het leven', 'het geld',
  'het moment', 'het woord', 'het uur', 'het begin', 'het einde',
  'het weer', 'het dier', 'het eten', 'het brood', 'het bier',
  'het station', 'het ziekenhuis', 'het kantoor', 'het centrum',
  'het lichaam', 'het hoofd', 'het hart', 'het oog', 'het oor',
  'het been', 'het bed', 'het raam', 'het park', 'het museum',
  'het restaurant', 'het toilet', 'het weekend', 'het verschil',
  'het resultaat', 'het idee', 'het gevoel', 'het gebouw',
  'het ontbijt', 'het gesprek', 'het verkeer', 'het geluk',
  'het nummer', 'het adres', 'het paspoort', 'het examen',
];

/**
 * Display a Dutch word with its article, avoiding duplication.
 * Handles data where `word.dutch` may already include "de " or "het ".
 */
export function dutchWithArticle(word) {
  if (!word) return '';
  const dutch = word.dutch || '';
  const article = word.article || '';
  if (!article) return dutch;
  if (dutch.toLowerCase().startsWith(article.toLowerCase() + ' ')) {
    return dutch;
  }
  return `${article} ${dutch}`;
}

/**
 * Get just the Dutch word without the article prefix.
 * Strips "de " or "het " from the front if present.
 */
export function dutchBareWord(word) {
  if (!word) return '';
  const dutch = word.dutch || '';
  const article = word.article || '';
  if (article && dutch.toLowerCase().startsWith(article.toLowerCase() + ' ')) {
    return dutch.slice(article.length + 1);
  }
  return dutch;
}

/**
 * Levenshtein distance for typo tolerance
 */
export function levenshteinDistance(a, b) {
  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Check answer with typo tolerance
 */
export function checkAnswer(userAnswer, correctAnswer, tolerance = 1) {
  const normalizedUser = userAnswer.trim().toLowerCase();
  const normalizedCorrect = correctAnswer.trim().toLowerCase();

  if (normalizedUser === normalizedCorrect) {
    return { correct: true, exact: true };
  }

  const distance = levenshteinDistance(normalizedUser, normalizedCorrect);
  if (distance <= tolerance) {
    return { correct: true, exact: false, distance };
  }

  return { correct: false, exact: false, distance };
}

/**
 * Dutch verb stem extraction
 */
// Lookup table for irregular verb stems that can't be computed algorithmically
const IRREGULAR_STEMS = {
  zijn: 'ben', hebben: 'heb', gaan: 'ga', staan: 'sta', slaan: 'sla',
  doen: 'doe', zien: 'zie', kunnen: 'kan', mogen: 'mag', moeten: 'moet',
  willen: 'wil', zullen: 'zal', weten: 'weet', houden: 'houd',
};

export function getVerbStem(infinitive) {
  // Check irregular stems first
  if (IRREGULAR_STEMS[infinitive]) return IRREGULAR_STEMS[infinitive];

  if (!infinitive.endsWith('en')) return infinitive;

  let stem = infinitive.slice(0, -2);

  // Handle double vowels: if removing -en creates a closed syllable
  // with a long vowel, we may need to double the vowel
  // e.g., 'maken' → 'maak' (not 'mak')
  // e.g., 'lopen' → 'loop' (not 'lop')
  const longVowelPairs = { aa: 'a', ee: 'e', oo: 'o', uu: 'u' };
  const singleToDouble = { a: 'aa', e: 'ee', o: 'oo', u: 'uu' };

  // Check if stem needs vowel doubling
  // Pattern: single vowel followed by single consonant at end
  const match = stem.match(/^(.*)([aeou])([^aeiou])$/);
  if (match && infinitive.match(/^.*[aeou][^aeiou]en$/)) {
    stem = match[1] + singleToDouble[match[2]] + match[3];
  }

  // v → f at end of stem
  if (stem.endsWith('v')) {
    stem = stem.slice(0, -1) + 'f';
  }

  // z → s at end of stem
  if (stem.endsWith('z')) {
    stem = stem.slice(0, -1) + 's';
  }

  return stem;
}

/**
 * Check if verb uses 'zijn' as auxiliary in perfect tense
 */
export const ZIJN_VERBS = [
  'zijn', 'worden', 'blijven', 'gaan', 'komen', 'rijden',
  'vliegen', 'lopen', 'fietsen', 'rennen', 'vallen', 'sterven',
  'groeien', 'beginnen', 'stoppen', 'vertrekken', 'aankomen',
  'opstaan', 'slagen', 'lukken', 'mislukken', 'gebeuren',
  'verdwijnen', 'verschijnen', 'verhuizen', 'trouwen',
];

/**
 * 't kofschip rule for past tense
 */
export function isPastTenseWithT(stem) {
  const lastChar = stem.charAt(stem.length - 1).toLowerCase();
  return 'tkfschp'.includes(lastChar);
}

/**
 * Get random encouragement in Dutch
 */
const ENCOURAGEMENTS = [
  'Goed zo!', 'Prima!', 'Uitstekend!', 'Heel goed!',
  'Fantastisch!', 'Geweldig!', 'Perfect!', 'Knap!',
  'Super!', 'Bravo!', 'Dat klopt!', 'Precies!',
];

const GENTLE_CORRECTIONS = [
  'Bijna! Probeer het nog eens.',
  'Niet helemaal, maar je bent op de goede weg!',
  'Oeps! Kijk nog eens goed.',
  'Dat was net niet goed. Volgende keer beter!',
  'Bijna goed! Let op het verschil.',
];

export function getEncouragement() {
  return ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
}

export function getGentleCorrection() {
  return GENTLE_CORRECTIONS[Math.floor(Math.random() * GENTLE_CORRECTIONS.length)];
}

/**
 * Shuffle array (Fisher-Yates)
 */
export function shuffle(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
