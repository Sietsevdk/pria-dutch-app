import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { XP_VALUES } from '../utils/xp';

const useProgress = create(
  persist(
    (set, get) => ({
      // XP & Level
      totalXP: 0,
      todayXP: 0,
      weeklyXP: [0, 0, 0, 0, 0, 0, 0], // Last 7 days
      lastXPDate: null,

      // Lessons
      currentLesson: 1,
      lessonProgress: {}, // { lessonId: { completed: bool, accuracy: number, bestScore: number, completedAt: string } }
      currentExerciseIndex: 0,

      // Vocabulary
      wordsLearned: {}, // { wordId: { learned: bool, learnedAt: string, accuracy: number } }
      totalWordsLearned: 0,

      // Grammar
      grammarMastered: {}, // { topicId: { mastered: bool, accuracy: number } }

      // Stats
      totalExercises: 0,
      totalCorrect: 0,
      totalTime: 0, // minutes
      sessionStartTime: null,
      exerciseTypeStats: {}, // { type: { correct: number, total: number } }

      // Daily goals
      dailyGoal: 15, // minutes
      goalsCompleted: {
        lesson: false,
        review: false,
        speaking: false,
      },

      // KNM progress
      knmProgress: {}, // { categoryId: { completed, score, total, bestScore, completedAt } }

      // Settings
      ttsSpeed: 'normal', // 'slow' | 'normal'
      dailyGoalMinutes: 15,
      lastGoalResetDate: null, // Tracks when daily goals were last reset

      // Actions
      addXP: (amount) => {
        const state = get();
        const today = new Date().toDateString();
        const isNewDay = state.lastXPDate !== today;

        let newWeeklyXP = [...state.weeklyXP];
        if (isNewDay) {
          // Calculate how many days were skipped
          let daysMissed = 1;
          if (state.lastXPDate) {
            const lastDate = new Date(state.lastXPDate);
            const now = new Date();
            daysMissed = Math.round((now - lastDate) / (1000 * 60 * 60 * 24));
            daysMissed = Math.max(1, Math.min(daysMissed, 7));
          }
          // Shift by the number of missed days, fill gaps with 0
          newWeeklyXP = [...newWeeklyXP.slice(daysMissed), ...Array(daysMissed).fill(0)];
          newWeeklyXP[6] = amount;
        } else {
          newWeeklyXP[6] = newWeeklyXP[6] + amount;
        }

        set({
          totalXP: state.totalXP + amount,
          todayXP: isNewDay ? amount : state.todayXP + amount,
          lastXPDate: today,
          weeklyXP: newWeeklyXP,
        });
      },

      completeLesson: (lessonId, accuracy, xpEarned) => {
        const state = get();
        const existing = state.lessonProgress[lessonId];
        const bestScore = existing ? Math.max(existing.bestScore || 0, accuracy) : accuracy;

        set({
          lessonProgress: {
            ...state.lessonProgress,
            [lessonId]: {
              completed: true,
              accuracy,
              bestScore,
              completedAt: new Date().toISOString(),
              attempts: (existing?.attempts || 0) + 1,
            },
          },
          currentLesson: Math.max(state.currentLesson, lessonId + 1),
          goalsCompleted: { ...state.goalsCompleted, lesson: true },
        });

        get().addXP(xpEarned);
      },

      setCurrentExerciseIndex: (index) => set({ currentExerciseIndex: index }),

      learnWord: (wordId) => {
        const state = get();
        if (!state.wordsLearned[wordId]) {
          set({
            wordsLearned: {
              ...state.wordsLearned,
              [wordId]: {
                learned: true,
                learnedAt: new Date().toISOString(),
                accuracy: 1,
              },
            },
            totalWordsLearned: state.totalWordsLearned + 1,
          });
        }
      },

      updateWordAccuracy: (wordId, correct) => {
        const state = get();
        const word = state.wordsLearned[wordId] || { learned: true, learnedAt: new Date().toISOString(), accuracy: 0 };
        const attempts = (word.attempts || 0) + 1;
        const correctCount = (word.correctCount || 0) + (correct ? 1 : 0);

        set({
          wordsLearned: {
            ...state.wordsLearned,
            [wordId]: {
              ...word,
              accuracy: correctCount / attempts,
              attempts,
              correctCount,
            },
          },
        });
      },

      masterGrammar: (topicId, accuracy) => {
        set((state) => ({
          grammarMastered: {
            ...state.grammarMastered,
            [topicId]: { mastered: accuracy >= 85, accuracy, masteredAt: new Date().toISOString() },
          },
        }));
      },

      recordExercise: (correct, exerciseType) => {
        set((state) => {
          const typeStats = state.exerciseTypeStats[exerciseType] || { correct: 0, total: 0 };
          return {
            totalExercises: state.totalExercises + 1,
            totalCorrect: state.totalCorrect + (correct ? 1 : 0),
            exerciseTypeStats: {
              ...state.exerciseTypeStats,
              [exerciseType]: {
                correct: typeStats.correct + (correct ? 1 : 0),
                total: typeStats.total + 1,
              },
            },
          };
        });
      },

      startSession: () => set({ sessionStartTime: Date.now() }),

      endSession: () => {
        const state = get();
        if (state.sessionStartTime) {
          const minutes = Math.round((Date.now() - state.sessionStartTime) / 60000);
          set({
            totalTime: state.totalTime + minutes,
            sessionStartTime: null,
          });
        }
      },

      completeLessonGoal: () =>
        set((state) => ({
          goalsCompleted: { ...state.goalsCompleted, lesson: true },
        })),

      completeReviewGoal: () =>
        set((state) => ({
          goalsCompleted: { ...state.goalsCompleted, review: true },
        })),

      completeSpeakingGoal: () =>
        set((state) => ({
          goalsCompleted: { ...state.goalsCompleted, speaking: true },
        })),

      resetDailyGoals: () => {
        const state = get();
        const today = new Date().toDateString();
        if (state.lastGoalResetDate !== today) {
          // Also shift weeklyXP to align chart even before first XP of the day
          let newWeeklyXP = [...state.weeklyXP];
          if (state.lastXPDate && state.lastXPDate !== today) {
            const lastDate = new Date(state.lastXPDate);
            const now = new Date();
            let daysMissed = Math.round((now - lastDate) / (1000 * 60 * 60 * 24));
            daysMissed = Math.max(1, Math.min(daysMissed, 7));
            newWeeklyXP = [...newWeeklyXP.slice(daysMissed), ...Array(daysMissed).fill(0)];
          }
          set({
            goalsCompleted: { lesson: false, review: false, speaking: false },
            todayXP: 0,
            lastGoalResetDate: today,
            weeklyXP: newWeeklyXP,
          });
        }
      },

      recordKNMProgress: (categoryId, score, total) => {
        const state = get();
        set({
          knmProgress: {
            ...state.knmProgress,
            [categoryId]: {
              completed: true,
              score,
              total,
              completedAt: new Date().toISOString(),
              bestScore: Math.max(score, state.knmProgress[categoryId]?.bestScore || 0),
            },
          },
        });
      },

      setDailyGoal: (minutes) => set({ dailyGoalMinutes: minutes }),
      setTTSSpeed: (speed) => set({ ttsSpeed: speed }),

      resetProgress: () =>
        set({
          totalXP: 0,
          todayXP: 0,
          weeklyXP: [0, 0, 0, 0, 0, 0, 0],
          lastXPDate: null,
          currentLesson: 1,
          lessonProgress: {},
          currentExerciseIndex: 0,
          wordsLearned: {},
          totalWordsLearned: 0,
          grammarMastered: {},
          totalExercises: 0,
          totalCorrect: 0,
          totalTime: 0,
          sessionStartTime: null,
          exerciseTypeStats: {},
          goalsCompleted: { lesson: false, review: false, speaking: false },
          knmProgress: {},
          lastGoalResetDate: null,
        }),

      // Check if a lesson is unlocked — completion of the previous lesson is sufficient
      isLessonUnlocked: (lessonId) => {
        const state = get();
        if (lessonId === 1) return true;
        const prevLesson = state.lessonProgress[lessonId - 1];
        return !!prevLesson?.completed;
      },
    }),
    {
      name: 'pria-progress',
    }
  )
);

export default useProgress;
