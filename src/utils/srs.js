/**
 * SM-2 Spaced Repetition Algorithm
 * Adapted for Dutch language learning
 */

export function calculateSRS(item, quality) {
  // quality: 0 = complete blackout, 1 = again, 3 = good, 5 = easy
  let { easeFactor = 2.5, interval = 0, repetitions = 0 } = item;

  if (quality >= 3) {
    // Correct response
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions += 1;
  } else {
    // Incorrect — reset
    repetitions = 0;
    interval = 1;
  }

  // Update ease factor (minimum 1.3)
  easeFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  const nextReview = addDays(new Date(), interval);

  return {
    easeFactor: Math.round(easeFactor * 100) / 100,
    interval,
    repetitions,
    nextReview: nextReview.toISOString(),
    lastReview: new Date().toISOString(),
  };
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Map user-facing buttons to SM-2 quality scores
 */
export const QUALITY_MAP = {
  again: 1,
  good: 3,
  easy: 5,
};

/**
 * Get items due for review
 */
export function getDueItems(srsData) {
  const now = new Date();
  return Object.entries(srsData)
    .filter(([, item]) => {
      if (!item.nextReview) return true; // Never reviewed
      return new Date(item.nextReview) <= now;
    })
    .sort((a, b) => {
      // Priority: lowest ease factor first (hardest items)
      return (a[1].easeFactor || 2.5) - (b[1].easeFactor || 2.5);
    })
    .map(([id, item]) => ({ id, ...item }));
}

/**
 * Create initial SRS entry for a new item
 */
export function createSRSEntry(itemId, type = 'vocabulary') {
  return {
    id: itemId,
    type,
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    nextReview: new Date().toISOString(),
    lastReview: null,
    correctCount: 0,
    incorrectCount: 0,
  };
}

/**
 * Check if an item is "mastered" (high ease factor + many repetitions)
 */
export function isMastered(item) {
  return item.repetitions >= 5 && item.easeFactor >= 2.3;
}

/**
 * Maximum number of reviews allowed per day
 */
export const MAX_DAILY_REVIEWS = 100;

/**
 * Leech detection — item reviewed many times but still struggling
 * Returns true if item has 8+ total reviews but ease factor is below 1.5
 */
export function isLeech(item) {
  const totalReviews = (item.correctCount || 0) + (item.incorrectCount || 0);
  return totalReviews >= 8 && (item.easeFactor || 2.5) < 1.5;
}

/**
 * Get all leech items from the SRS data
 */
export function getLeeches(srsData) {
  return Object.entries(srsData)
    .filter(([, item]) => isLeech(item))
    .map(([id, item]) => ({ id, ...item }));
}

/**
 * Anti-annoyance: skip items that were reviewed in the last 4 hours
 * @param {object} item - SRS item
 * @param {Map|Object} recentlyReviewed - Map/Object of itemId -> last review timestamp
 * @returns {boolean} true if the item should be skipped
 */
export function shouldSkipItem(item, recentlyReviewed = {}) {
  const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
  const now = Date.now();

  // Check the recentlyReviewed lookup
  const lastReviewedAt = recentlyReviewed instanceof Map
    ? recentlyReviewed.get(item.id)
    : recentlyReviewed[item.id];

  if (lastReviewedAt) {
    const timestamp = typeof lastReviewedAt === 'string'
      ? new Date(lastReviewedAt).getTime()
      : lastReviewedAt;
    if (now - timestamp < FOUR_HOURS_MS) {
      return true;
    }
  }

  // Also check the item's own lastReview field
  if (item.lastReview) {
    const lastReviewTime = new Date(item.lastReview).getTime();
    if (now - lastReviewTime < FOUR_HOURS_MS) {
      return true;
    }
  }

  return false;
}

/**
 * Determine review batch size with break suggestions
 * Caps at 20 items per session
 * @param {number} dueCount - total number of items due for review
 * @returns {{ batchSize: number, suggestBreak: boolean, totalRemaining: number, sessionsNeeded: number }}
 */
export function getReviewBatchSize(dueCount) {
  const MAX_BATCH = 20;
  const batchSize = Math.min(dueCount, MAX_BATCH);
  const totalRemaining = Math.max(0, dueCount - batchSize);
  const sessionsNeeded = Math.ceil(dueCount / MAX_BATCH);

  return {
    batchSize,
    suggestBreak: dueCount > MAX_BATCH,
    totalRemaining,
    sessionsNeeded,
  };
}
