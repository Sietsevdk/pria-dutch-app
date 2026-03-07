/**
 * Content Level System
 * Maps all content to CEFR-aligned difficulty levels and provides
 * utilities for showing level-appropriate indicators throughout the app.
 *
 * Levels:
 *   1 = Beginner (A1)      — Foundation lessons 1-10
 *   2 = Elementary (A1-A2)  — Building Blocks lessons 11-20
 *   3 = Intermediate (A2)   — Real Life lessons 21-30
 */

export const DIFFICULTY = {
  BEGINNER: 1,
  ELEMENTARY: 2,
  INTERMEDIATE: 3,
};

export const DIFFICULTY_INFO = {
  1: { label: 'Beginner', short: 'A1', color: 'success', emoji: '🌱' },
  2: { label: 'Elementary', short: 'A1-A2', color: 'info', emoji: '🌿' },
  3: { label: 'Intermediate', short: 'A2', color: 'primary', emoji: '🌳' },
};

/* ── Grammar topics ── */
export const GRAMMAR_DIFFICULTY = {
  'present-tense': 1,
  'articles-de-het': 1,
  'pronouns': 1,
  'question-formation': 1,
  'adjectives': 2,
  'negation': 2,
  'comparatives': 2,
  'prepositions': 2,
  'modal-verbs': 2,
  'past-tense': 2,
  'perfect-tense': 2,
  'separable-verbs': 2,
  'conjunctions': 2,
  'word-order': 3,
};

/* ── Vocabulary topics ── */
export const VOCAB_DIFFICULTY = {
  greetings: 1,
  numbers: 1,
  'time-dates': 1,
  family: 1,
  common_verbs: 1,
  'food-drink': 1,
  clothing: 1,
  housing: 1,
  weather: 1,
  question_words: 1,
  shopping: 2,
  directions: 2,
  transport: 2,
  health: 2,
  'daily-routine': 2,
  appointments: 2,
  hobbies: 2,
  adjectives: 2,
  feelings: 2,
  government: 3,
  work: 3,
  banking: 3,
  social: 3,
  education: 3,
  correspondence: 3,
  culture: 3,
  future: 3,
  exam: 3,
};

/* ── KNM categories ── */
export const KNM_DIFFICULTY = {
  'normen-en-waarden': 2,
  'gezondheid': 2,
  'wonen': 2,
  'werk-en-inkomen': 3,
  'onderwijs': 3,
  'overheid-en-politiek': 3,
  'geschiedenis-en-geografie': 3,
  'burgerschap': 3,
};

/**
 * Get user's current difficulty level from their lesson progress.
 */
export function getUserLevel(currentLesson) {
  if (currentLesson <= 10) return 1;
  if (currentLesson <= 20) return 2;
  return 3;
}

/**
 * Get lesson difficulty from lesson ID.
 */
export function getLessonDifficulty(lessonId) {
  if (lessonId <= 10) return 1;
  if (lessonId <= 20) return 2;
  return 3;
}

/**
 * Get appropriateness tag for content relative to user level.
 * @returns {'your-level'|'recommended'|'advanced'}
 */
export function getContentTag(contentDifficulty, userLevel) {
  if (contentDifficulty <= userLevel) return 'your-level';
  if (contentDifficulty === userLevel + 1) return 'recommended';
  return 'advanced';
}
