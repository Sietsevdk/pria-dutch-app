/**
 * XP & Progression System
 */

export const XP_VALUES = {
  exerciseCorrect: 10,
  exerciseCorrected: 5, // Got it wrong, then corrected
  lessonComplete: 50,
  reviewSessionComplete: 30,
  dailyStreak: 20,
  perfectLesson: 25,
};

export const LEVELS = [
  { name: 'Beginner', nameNL: 'Beginner', threshold: 0, icon: '🌱' },
  { name: 'Elementary', nameNL: 'Elementair', threshold: 1000, icon: '🌿' },
  { name: 'Pre-Intermediate', nameNL: 'Pre-Intermediair', threshold: 2500, icon: '🌳' },
  { name: 'Intermediate', nameNL: 'Intermediair', threshold: 4500, icon: '🌟' },
  { name: 'Exam Ready', nameNL: 'Examenklaar', threshold: 7000, icon: '🎓' },
];

/**
 * Get current level based on total XP
 */
export function getLevel(totalXP) {
  let currentLevel = LEVELS[0];
  let nextLevel = LEVELS[1];

  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalXP >= LEVELS[i].threshold) {
      currentLevel = LEVELS[i];
      nextLevel = LEVELS[i + 1] || null;
      break;
    }
  }

  const xpInLevel = totalXP - currentLevel.threshold;
  const xpForNextLevel = nextLevel
    ? nextLevel.threshold - currentLevel.threshold
    : 0;
  const progress = nextLevel ? xpInLevel / xpForNextLevel : 1;

  return {
    ...currentLevel,
    index: LEVELS.indexOf(currentLevel),
    xpInLevel,
    xpForNextLevel,
    progress: Math.min(1, progress),
    nextLevel,
  };
}

/**
 * Calculate XP earned for a lesson
 */
export function calculateLessonXP({ correctAnswers, totalQuestions, mistakes }) {
  let xp = 0;

  // XP for correct answers
  xp += correctAnswers * XP_VALUES.exerciseCorrect;

  // XP for corrected mistakes (capped so it never exceeds perfect lesson bonus)
  xp += Math.min(mistakes * XP_VALUES.exerciseCorrected, XP_VALUES.perfectLesson);

  // Lesson completion bonus
  xp += XP_VALUES.lessonComplete;

  // Perfect lesson bonus
  if (mistakes === 0 && totalQuestions > 0) {
    xp += XP_VALUES.perfectLesson;
  }

  return xp;
}

/**
 * Calculate accuracy percentage
 */
export function calculateAccuracy(correct, total) {
  if (total === 0) return 0;
  return Math.round((correct / total) * 100);
}
