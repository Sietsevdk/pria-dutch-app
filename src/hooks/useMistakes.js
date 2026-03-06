import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { levenshteinDistance } from '../utils/dutch';

/**
 * Detect if the mistake involves a de/het article error
 */
function isDeHetMistake(userAnswer, correctAnswer) {
  const normalizedUser = userAnswer.trim().toLowerCase();
  const normalizedCorrect = correctAnswer.trim().toLowerCase();

  const deHetRegex = /^(de|het)\s+/;
  const userMatch = normalizedUser.match(deHetRegex);
  const correctMatch = normalizedCorrect.match(deHetRegex);

  if (userMatch && correctMatch && userMatch[1] !== correctMatch[1]) {
    return true;
  }

  // Also check if user used 'de' where 'het' was needed or vice versa
  if (
    (normalizedUser.includes('de ') && normalizedCorrect.includes('het ')) ||
    (normalizedUser.includes('het ') && normalizedCorrect.includes('de '))
  ) {
    return true;
  }

  return false;
}

/**
 * Detect if the mistake involves a verb form error
 */
function isVerbFormMistake(userAnswer, correctAnswer, exerciseType) {
  if (exerciseType === 'verb-conjugation' || exerciseType === 'verb-form') {
    return true;
  }

  const normalizedUser = userAnswer.trim().toLowerCase();
  const normalizedCorrect = correctAnswer.trim().toLowerCase();

  // Check if only the verb ending differs (common Dutch verb form mistakes)
  const verbEndings = ['t', 'en', 'te', 'ten', 'de', 'den', 'd', 'dt'];
  const userWords = normalizedUser.split(/\s+/);
  const correctWords = normalizedCorrect.split(/\s+/);

  if (userWords.length === correctWords.length) {
    for (let i = 0; i < userWords.length; i++) {
      if (userWords[i] !== correctWords[i]) {
        // Check if the difference is only in verb endings
        const shorter = userWords[i].length < correctWords[i].length ? userWords[i] : correctWords[i];
        const longer = userWords[i].length >= correctWords[i].length ? userWords[i] : correctWords[i];
        if (longer.startsWith(shorter) || shorter.startsWith(longer.slice(0, -2))) {
          const diffSuffix = longer.slice(shorter.length);
          if (verbEndings.includes(diffSuffix) || verbEndings.some((e) => longer.endsWith(e) && shorter.endsWith(e.slice(0, -1)))) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

/**
 * Detect if the mistake involves word order issues
 */
function isWordOrderMistake(userAnswer, correctAnswer) {
  const userWords = userAnswer.trim().toLowerCase().split(/\s+/).sort();
  const correctWords = correctAnswer.trim().toLowerCase().split(/\s+/).sort();

  // Same words but different order
  if (
    userWords.length === correctWords.length &&
    userWords.length >= 2 &&
    userWords.join(' ') === correctWords.join(' ')
  ) {
    // Verify original order is actually different
    return userAnswer.trim().toLowerCase() !== correctAnswer.trim().toLowerCase();
  }

  return false;
}

/**
 * Detect if the mistake is a spelling error (Levenshtein distance 1-2)
 */
function isSpellingMistake(userAnswer, correctAnswer) {
  const normalizedUser = userAnswer.trim().toLowerCase();
  const normalizedCorrect = correctAnswer.trim().toLowerCase();

  if (normalizedUser === normalizedCorrect) return false;

  const distance = levenshteinDistance(normalizedUser, normalizedCorrect);
  return distance >= 1 && distance <= 2;
}

/**
 * Detect patterns from a mistake
 * Returns an array of pattern types detected
 */
function detectPatterns(userAnswer, correctAnswer, exerciseType) {
  const patterns = [];

  if (isDeHetMistake(userAnswer, correctAnswer)) {
    patterns.push('de-het');
  }

  if (isVerbFormMistake(userAnswer, correctAnswer, exerciseType)) {
    patterns.push('verb-form');
  }

  if (isWordOrderMistake(userAnswer, correctAnswer)) {
    patterns.push('word-order');
  }

  if (isSpellingMistake(userAnswer, correctAnswer)) {
    patterns.push('spelling');
  }

  return patterns;
}

const useMistakes = create(
  persist(
    (set, get) => ({
      // Array of mistake records
      mistakes: [],

      // Pattern tracking: { patternId: { type, count, examples: [], lastOccurred } }
      patterns: {},

      // Record a new mistake and auto-detect patterns
      recordMistake: (mistake) => {
        const state = get();

        const newMistake = {
          id: `mistake-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          word: mistake.word,
          correctAnswer: mistake.correctAnswer,
          userAnswer: mistake.userAnswer,
          exerciseType: mistake.exerciseType || 'unknown',
          timestamp: new Date().toISOString(),
          category: mistake.category || 'general',
          lessonId: mistake.lessonId || null,
        };

        // Detect patterns
        const detectedPatterns = detectPatterns(
          mistake.userAnswer,
          mistake.correctAnswer,
          mistake.exerciseType
        );

        // Update pattern tracking
        const updatedPatterns = { ...state.patterns };

        detectedPatterns.forEach((patternType) => {
          const patternId = patternType;
          const existing = updatedPatterns[patternId] || {
            type: patternType,
            count: 0,
            examples: [],
            lastOccurred: null,
          };

          const example = {
            word: mistake.word,
            userAnswer: mistake.userAnswer,
            correctAnswer: mistake.correctAnswer,
            timestamp: newMistake.timestamp,
          };

          // Keep only the last 10 examples per pattern
          const examples = [example, ...existing.examples].slice(0, 10);

          updatedPatterns[patternId] = {
            type: patternType,
            count: existing.count + 1,
            examples,
            lastOccurred: newMistake.timestamp,
          };
        });

        set({
          mistakes: [...state.mistakes, newMistake],
          patterns: updatedPatterns,
        });
      },

      // Get mistakes filtered by category
      getMistakesByCategory: (category) => {
        return get().mistakes.filter((m) => m.category === category);
      },

      // Get mistakes filtered by lesson
      getMistakesByLesson: (lessonId) => {
        return get().mistakes.filter((m) => m.lessonId === lessonId);
      },

      // Get most recent mistakes
      getRecentMistakes: (limit = 20) => {
        const mistakes = get().mistakes;
        return mistakes
          .slice()
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .slice(0, limit);
      },

      // Get top 5 weak areas (most frequent mistake patterns)
      getWeakAreas: () => {
        const patterns = get().patterns;
        return Object.values(patterns)
          .sort((a, b) => {
            // Sort by count descending, then by recency
            if (b.count !== a.count) return b.count - a.count;
            return new Date(b.lastOccurred) - new Date(a.lastOccurred);
          })
          .slice(0, 5);
      },

      // Generate practice exercises from common mistakes
      generatePracticeFromMistakes: (count = 10) => {
        const state = get();
        const mistakes = state.mistakes;

        if (mistakes.length === 0) return [];

        // Count frequency of each word/correctAnswer pair
        const frequencyMap = {};
        mistakes.forEach((m) => {
          const key = `${m.word}||${m.correctAnswer}`;
          if (!frequencyMap[key]) {
            frequencyMap[key] = {
              word: m.word,
              correctAnswer: m.correctAnswer,
              exerciseType: m.exerciseType,
              category: m.category,
              lessonId: m.lessonId,
              count: 0,
              lastSeen: m.timestamp,
            };
          }
          frequencyMap[key].count += 1;
          if (new Date(m.timestamp) > new Date(frequencyMap[key].lastSeen)) {
            frequencyMap[key].lastSeen = m.timestamp;
          }
        });

        // Sort by frequency (most mistakes first), then recency
        const sorted = Object.values(frequencyMap).sort((a, b) => {
          if (b.count !== a.count) return b.count - a.count;
          return new Date(b.lastSeen) - new Date(a.lastSeen);
        });

        // Take top N and create practice exercises
        return sorted.slice(0, count).map((item, index) => ({
          id: `practice-${Date.now()}-${index}`,
          type: item.exerciseType,
          word: item.word,
          correctAnswer: item.correctAnswer,
          category: item.category,
          lessonId: item.lessonId,
          mistakeCount: item.count,
          source: 'mistake-review',
        }));
      },

      // Clean up old resolved mistakes
      clearOldMistakes: (daysOld = 30) => {
        const state = get();
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - daysOld);

        const remaining = state.mistakes.filter(
          (m) => new Date(m.timestamp) >= cutoff
        );

        // Recalculate patterns from remaining mistakes only
        const recalculatedPatterns = {};
        remaining.forEach((m) => {
          const detected = detectPatterns(m.userAnswer, m.correctAnswer, m.exerciseType);
          detected.forEach((patternType) => {
            const patternId = patternType;
            const existing = recalculatedPatterns[patternId] || {
              type: patternType,
              count: 0,
              examples: [],
              lastOccurred: null,
            };

            const example = {
              word: m.word,
              userAnswer: m.userAnswer,
              correctAnswer: m.correctAnswer,
              timestamp: m.timestamp,
            };

            existing.count += 1;
            existing.examples = [example, ...existing.examples].slice(0, 10);
            if (!existing.lastOccurred || new Date(m.timestamp) > new Date(existing.lastOccurred)) {
              existing.lastOccurred = m.timestamp;
            }

            recalculatedPatterns[patternId] = existing;
          });
        });

        set({
          mistakes: remaining,
          patterns: recalculatedPatterns,
        });
      },
    }),
    {
      name: 'pria-mistakes',
    }
  )
);

export default useMistakes;
