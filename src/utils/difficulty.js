/**
 * Progressive Difficulty System for Dutch language learning
 */

// Difficulty dimensions with min/max levels
export const DIFFICULTY_DIMENSIONS = {
  vocabulary: { min: 1, max: 4 }, // 1=basic, 2=common, 3=advanced, 4=exam-level
  grammar: { min: 1, max: 4 },   // 1=present, 2=past, 3=perfect, 4=complex
  listening: { min: 1, max: 3 },  // 1=slow, 2=normal, 3=fast
  production: { min: 1, max: 3 }, // 1=recognition, 2=fill-in, 3=free production
};

// Thresholds for level progression
const INCREASE_ACCURACY_THRESHOLD = 85;
const STRONG_INCREASE_THRESHOLD = 90;
const DECREASE_THRESHOLD = 60;
const SESSIONS_TO_INCREASE = 3;
const SESSIONS_TO_DECREASE = 2;

/**
 * Calculate user's current difficulty level based on progress data
 * @param {object} progress - User progress data from useProgress store
 * @returns {{ vocabulary: number, grammar: number, listening: number, production: number }}
 */
export function calculateDifficultyLevel(progress) {
  const {
    lessonProgress = {},
    totalWordsLearned = 0,
    totalExercises = 0,
    totalCorrect = 0,
    grammarMastered = {},
    exerciseTypeStats = {},
  } = progress;

  const completedLessons = Object.values(lessonProgress).filter((l) => l.completed).length;
  const overallAccuracy = totalExercises > 0 ? (totalCorrect / totalExercises) * 100 : 0;

  // Vocabulary difficulty based on words learned and accuracy
  let vocabulary = 1;
  if (totalWordsLearned >= 200 && overallAccuracy >= 80) {
    vocabulary = 4;
  } else if (totalWordsLearned >= 100 && overallAccuracy >= 70) {
    vocabulary = 3;
  } else if (totalWordsLearned >= 30 && overallAccuracy >= 60) {
    vocabulary = 2;
  }

  // Grammar difficulty based on lessons completed and grammar mastery
  const masteredGrammarCount = Object.values(grammarMastered).filter((g) => g.mastered).length;
  let grammar = 1;
  if (masteredGrammarCount >= 8 && completedLessons >= 20) {
    grammar = 4;
  } else if (masteredGrammarCount >= 4 && completedLessons >= 12) {
    grammar = 3;
  } else if (masteredGrammarCount >= 1 && completedLessons >= 5) {
    grammar = 2;
  }

  // Listening difficulty based on listening exercise accuracy (merge both types)
  const listeningRaw = exerciseTypeStats['listening'] || { correct: 0, total: 0 };
  const dictationRaw = exerciseTypeStats['dictation'] || { correct: 0, total: 0 };
  const listeningStats = {
    correct: listeningRaw.correct + dictationRaw.correct,
    total: listeningRaw.total + dictationRaw.total,
  };
  const listeningAccuracy = listeningStats.total > 0 ? (listeningStats.correct / listeningStats.total) * 100 : 0;
  let listening = 1;
  if (listeningStats.total >= 30 && listeningAccuracy >= 80) {
    listening = 3;
  } else if (listeningStats.total >= 10 && listeningAccuracy >= 65) {
    listening = 2;
  }

  // Production difficulty based on production/writing exercise accuracy (merge all types)
  const productionRaw = exerciseTypeStats['production'] || { correct: 0, total: 0 };
  const writingRaw = exerciseTypeStats['writing'] || { correct: 0, total: 0 };
  const fillInRaw = exerciseTypeStats['fill-in'] || { correct: 0, total: 0 };
  const productionStats = {
    correct: productionRaw.correct + writingRaw.correct + fillInRaw.correct,
    total: productionRaw.total + writingRaw.total + fillInRaw.total,
  };
  const productionAccuracy = productionStats.total > 0 ? (productionStats.correct / productionStats.total) * 100 : 0;
  let production = 1;
  if (productionStats.total >= 30 && productionAccuracy >= 80) {
    production = 3;
  } else if (productionStats.total >= 10 && productionAccuracy >= 65) {
    production = 2;
  }

  return {
    vocabulary: clampDimension('vocabulary', vocabulary),
    grammar: clampDimension('grammar', grammar),
    listening: clampDimension('listening', listening),
    production: clampDimension('production', production),
  };
}

/**
 * Clamp a dimension value to its valid range
 */
function clampDimension(dimension, value) {
  const { min, max } = DIFFICULTY_DIMENSIONS[dimension];
  return Math.max(min, Math.min(max, value));
}

/**
 * Get appropriate exercises for a given difficulty level
 * Filters and weights exercises from a pool based on difficulty
 * @param {{ vocabulary: number, grammar: number, listening: number, production: number }} level
 * @param {Array} exercisePool - Array of exercise objects with a `difficulty` field (1-4)
 * @returns {Array} Filtered and sorted exercises
 */
export function getExercisesForDifficulty(level, exercisePool) {
  if (!exercisePool || exercisePool.length === 0) return [];

  // Calculate an overall difficulty score from the level
  const overallLevel =
    (level.vocabulary + level.grammar + level.listening + level.production) / 4;

  return exercisePool
    .map((exercise) => {
      const exerciseDifficulty = exercise.difficulty || 1;
      const dimensionDifficulty = level[exercise.dimension] || overallLevel;

      // Calculate how appropriate this exercise is for the current level
      // Prefer exercises at or slightly above current level
      const diff = exerciseDifficulty - dimensionDifficulty;
      let weight;

      if (diff === 0) {
        // At current level — highest weight
        weight = 1.0;
      } else if (diff === 1) {
        // Slightly above — good stretch
        weight = 0.7;
      } else if (diff === -1) {
        // Slightly below — reinforcement
        weight = 0.5;
      } else if (diff > 1) {
        // Too hard — low weight
        weight = 0.1;
      } else {
        // Too easy — low weight
        weight = 0.2;
      }

      return { ...exercise, weight };
    })
    .filter((exercise) => exercise.weight > 0)
    .sort((a, b) => b.weight - a.weight);
}

/**
 * Check if difficulty should increase based on recent accuracy
 * @param {number} recentAccuracy - Recent accuracy percentage (0-100)
 * @param {number} threshold - Accuracy threshold to trigger increase
 * @returns {boolean}
 */
export function shouldIncreaseDifficulty(recentAccuracy, threshold = INCREASE_ACCURACY_THRESHOLD) {
  return recentAccuracy >= threshold;
}

/**
 * Adaptive difficulty adjustment based on accuracy history
 * Tracks session-by-session performance to make gradual adjustments
 *
 * @param {{ vocabulary: number, grammar: number, listening: number, production: number }} currentLevel
 * @param {{ [dimension: string]: number[] }} accuracyHistory - Array of recent session accuracies per dimension
 * @returns {{ vocabulary: number, grammar: number, listening: number, production: number, changes: object }}
 */
export function adjustDifficulty(currentLevel, accuracyHistory = {}) {
  const newLevel = { ...currentLevel };
  const changes = {};

  Object.keys(DIFFICULTY_DIMENSIONS).forEach((dimension) => {
    const history = accuracyHistory[dimension] || [];
    const current = currentLevel[dimension] || DIFFICULTY_DIMENSIONS[dimension].min;

    if (history.length === 0) {
      newLevel[dimension] = current;
      changes[dimension] = 'maintain';
      return;
    }

    // Check last N sessions for increase
    const recentForIncrease = history.slice(-SESSIONS_TO_INCREASE);
    const allAboveThreshold =
      recentForIncrease.length >= SESSIONS_TO_INCREASE &&
      recentForIncrease.every((acc) => acc >= STRONG_INCREASE_THRESHOLD);

    // Check last N sessions for decrease
    const recentForDecrease = history.slice(-SESSIONS_TO_DECREASE);
    const allBelowThreshold =
      recentForDecrease.length >= SESSIONS_TO_DECREASE &&
      recentForDecrease.every((acc) => acc < DECREASE_THRESHOLD);

    if (allAboveThreshold && current < DIFFICULTY_DIMENSIONS[dimension].max) {
      newLevel[dimension] = current + 1;
      changes[dimension] = 'increase';
    } else if (allBelowThreshold && current > DIFFICULTY_DIMENSIONS[dimension].min) {
      newLevel[dimension] = current - 1;
      changes[dimension] = 'decrease';
    } else {
      newLevel[dimension] = current;
      changes[dimension] = 'maintain';
    }
  });

  return { ...newLevel, changes };
}
