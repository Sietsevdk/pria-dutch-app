import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useStreak = create(
  persist(
    (set, get) => ({
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: null, // ISO date string (date only, no time)
      streakFreezeAvailable: true,
      streakFreezeUsedThisWeek: false,
      lastFreezeWeek: null,
      completedToday: false,
      activityCalendar: {}, // { 'YYYY-MM-DD': { xp: number, completed: bool } }

      // Check and update streak on app load
      // Uses a single set() with updater function to avoid stale state between multiple set() calls
      checkStreak: () => {
        const today = getDateString(new Date());
        const yesterday = getDateString(addDays(new Date(), -1));
        const currentWeek = getWeekString(new Date());

        set((state) => {
          // Already completed today
          if (state.lastActivityDate === today) {
            return { completedToday: true };
          }

          const updates = { completedToday: false };

          // Check if streak should continue or reset
          if (state.lastActivityDate === yesterday) {
            // Yesterday was active, streak continues — no changes needed
          } else if (state.lastActivityDate) {
            // Missed a day — check for streak freeze
            const missed = daysBetween(state.lastActivityDate, today);

            if (missed === 2 && state.streakFreezeAvailable && !state.streakFreezeUsedThisWeek) {
              // Use streak freeze — keep streak alive, bridge the gap
              updates.streakFreezeAvailable = false;
              updates.streakFreezeUsedThisWeek = true;
              updates.lastFreezeWeek = currentWeek;
              updates.lastActivityDate = yesterday;
            } else {
              // Streak broken
              updates.currentStreak = 0;
            }
          }

          // Reset weekly freeze (only if freeze wasn't just used in this same call)
          if (state.lastFreezeWeek !== currentWeek && !updates.lastFreezeWeek) {
            updates.streakFreezeAvailable = true;
            updates.streakFreezeUsedThisWeek = false;
          }

          return updates;
        });
      },

      // Record activity for today
      recordActivity: (xp = 0) => {
        const today = getDateString(new Date());

        set((state) => {
          if (state.completedToday) {
            // Just update XP
            return {
              activityCalendar: {
                ...state.activityCalendar,
                [today]: {
                  ...(state.activityCalendar[today] || {}),
                  xp: (state.activityCalendar[today]?.xp || 0) + xp,
                  completed: true,
                },
              },
            };
          }

          const newStreak = state.currentStreak + 1;

          return {
            currentStreak: newStreak,
            longestStreak: Math.max(state.longestStreak, newStreak),
            lastActivityDate: today,
            completedToday: true,
            activityCalendar: {
              ...state.activityCalendar,
              [today]: {
                xp: (state.activityCalendar[today]?.xp || 0) + xp,
                completed: true,
              },
            },
          };
        });
      },

      // Get calendar data for display (last N days)
      getCalendarData: (days = 90) => {
        const state = get();
        const data = [];
        const today = new Date();

        for (let i = days - 1; i >= 0; i--) {
          const date = addDays(today, -i);
          const dateStr = getDateString(date);
          const activity = state.activityCalendar[dateStr];

          data.push({
            date: dateStr,
            dayOfWeek: date.getDay(),
            completed: activity?.completed || false,
            xp: activity?.xp || 0,
          });
        }

        return data;
      },

      // Check for Easter egg (30-day streak)
      shouldShowEasterEgg: () => {
        return get().currentStreak >= 30;
      },

      resetStreak: () =>
        set({
          currentStreak: 0,
          longestStreak: 0,
          lastActivityDate: null,
          completedToday: false,
          activityCalendar: {},
          streakFreezeAvailable: true,
          streakFreezeUsedThisWeek: false,
          lastFreezeWeek: null,
        }),
    }),
    {
      name: 'pria-streak',
      version: 1,
      migrate: (state) => state,
    }
  )
);

// Helper functions
function getDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function daysBetween(dateStr1, dateStr2) {
  // Parse as local dates (not UTC) to avoid DST/timezone mismatches
  const [y1, m1, d1] = dateStr1.split('-').map(Number);
  const [y2, m2, d2] = dateStr2.split('-').map(Number);
  const date1 = new Date(y1, m1 - 1, d1);
  const date2 = new Date(y2, m2 - 1, d2);
  return Math.round((date2 - date1) / (1000 * 60 * 60 * 24));
}

function getWeekString(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return getDateString(d);
}

export default useStreak;
