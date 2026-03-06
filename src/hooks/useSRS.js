import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  calculateSRS,
  createSRSEntry,
  getDueItems,
  QUALITY_MAP,
  isLeech,
  shouldSkipItem,
  getReviewBatchSize,
  MAX_DAILY_REVIEWS,
} from '../utils/srs';

const useSRS = create(
  persist(
    (set, get) => ({
      // SRS data for all items: { itemId: { easeFactor, interval, repetitions, nextReview, lastReview, ... } }
      items: {},

      // Daily review tracking (resets daily)
      dailyReviewCount: 0,
      dailyReviewDate: null,

      // Last review session timestamp
      lastReviewSession: null,

      // Add a new item to SRS tracking
      addItem: (itemId, type = 'vocabulary') => {
        const state = get();
        if (!state.items[itemId]) {
          set({
            items: {
              ...state.items,
              [itemId]: createSRSEntry(itemId, type),
            },
          });
        }
      },

      // Add multiple items at once
      addItems: (itemIds, type = 'vocabulary') => {
        const state = get();
        const newItems = { ...state.items };
        let changed = false;

        itemIds.forEach((id) => {
          if (!newItems[id]) {
            newItems[id] = createSRSEntry(id, type);
            changed = true;
          }
        });

        if (changed) {
          set({ items: newItems });
        }
      },

      // Review an item with quality rating
      reviewItem: (itemId, quality) => {
        const state = get();
        const item = state.items[itemId];
        if (!item) return;

        const qualityScore = typeof quality === 'string' ? QUALITY_MAP[quality] : quality;
        const updated = calculateSRS(item, qualityScore);

        const isCorrect = qualityScore >= 3;

        // Track daily review count (reset if new day)
        const today = new Date().toDateString();
        const isNewDay = state.dailyReviewDate !== today;
        const newDailyCount = isNewDay ? 1 : state.dailyReviewCount + 1;

        set({
          items: {
            ...state.items,
            [itemId]: {
              ...item,
              ...updated,
              correctCount: (item.correctCount || 0) + (isCorrect ? 1 : 0),
              incorrectCount: (item.incorrectCount || 0) + (isCorrect ? 0 : 1),
            },
          },
          dailyReviewCount: newDailyCount,
          dailyReviewDate: today,
          lastReviewSession: new Date().toISOString(),
        });
      },

      // Get all items due for review
      getDueItems: () => {
        return getDueItems(get().items);
      },

      // Get count of due items
      getDueCount: () => {
        return getDueItems(get().items).length;
      },

      // Get items by type
      getItemsByType: (type) => {
        return Object.entries(get().items)
          .filter(([, item]) => item.type === type)
          .map(([id, item]) => ({ id, ...item }));
      },

      // Get item stats
      getItemStats: (itemId) => {
        return get().items[itemId] || null;
      },

      // Get weakest items (lowest ease factor) — only items user got wrong
      getWeakItems: (limit = 10) => {
        return Object.entries(get().items)
          .filter(([, item]) => item.repetitions > 0 && (item.incorrectCount || 0) > 0)
          .sort((a, b) => a[1].easeFactor - b[1].easeFactor)
          .slice(0, limit)
          .map(([id, item]) => ({ id, ...item }));
      },

      // Skip an item — mark it skipped and reschedule for later today
      skipItem: (itemId) => {
        const state = get();
        const item = state.items[itemId];
        if (!item) return;

        // Schedule for 4 hours from now (later today)
        const laterToday = new Date();
        laterToday.setHours(laterToday.getHours() + 4);

        set({
          items: {
            ...state.items,
            [itemId]: {
              ...item,
              nextReview: laterToday.toISOString(),
              skipCount: (item.skipCount || 0) + 1,
              lastSkipped: new Date().toISOString(),
            },
          },
        });
      },

      // Get all leech items
      getLeeches: () => {
        const items = get().items;
        return Object.entries(items)
          .filter(([, item]) => isLeech(item))
          .map(([id, item]) => ({ id, ...item }));
      },

      // Get a batch of review items with anti-annoyance filtering
      getReviewSessionItems: (maxItems = 20) => {
        const state = get();

        // Check daily limit
        const today = new Date().toDateString();
        const isNewDay = state.dailyReviewDate !== today;
        const currentDailyCount = isNewDay ? 0 : state.dailyReviewCount;
        const remainingDaily = Math.max(0, MAX_DAILY_REVIEWS - currentDailyCount);

        if (remainingDaily === 0) {
          return [];
        }

        // Get all due items
        const dueItems = getDueItems(state.items);

        // Build a recently-reviewed map from item lastReview fields
        const recentlyReviewed = {};
        Object.entries(state.items).forEach(([id, item]) => {
          if (item.lastReview) {
            recentlyReviewed[id] = item.lastReview;
          }
        });

        // Filter out items that should be skipped (anti-annoyance)
        const filteredItems = dueItems.filter(
          (item) => !shouldSkipItem(item, recentlyReviewed)
        );

        // Determine batch size
        const effectiveMax = Math.min(maxItems, remainingDaily);
        const { batchSize } = getReviewBatchSize(
          Math.min(filteredItems.length, effectiveMax)
        );

        return filteredItems.slice(0, batchSize);
      },

      // Clear all SRS data
      clearAll: () => set({ items: {}, dailyReviewCount: 0, dailyReviewDate: null, lastReviewSession: null }),
    }),
    {
      name: 'pria-srs',
    }
  )
);

export default useSRS;
