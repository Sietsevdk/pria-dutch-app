import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Check, ChevronRight, RotateCcw, SkipForward } from 'lucide-react';
import ProgressRing from '../components/ProgressRing';
import LevelBadge from '../components/LevelBadge';
import useProgress from '../hooks/useProgress';
import { getLessonDifficulty, getUserLevel, DIFFICULTY_INFO } from '../utils/levels';

const lessonsModule = import.meta.glob('../data/lessons.json', { eager: true });
let lessonsData = { phases: [] };
Object.values(lessonsModule).forEach((mod) => {
  lessonsData = mod.default || mod;
});

export default function Learn() {
  const navigate = useNavigate();
  const lessonProgress = useProgress((s) => s.lessonProgress);
  const isLessonUnlocked = useProgress((s) => s.isLessonUnlocked);
  const skipLesson = useProgress((s) => s.skipLesson);
  const currentLesson = useProgress((s) => s.currentLesson);
  const userLevel = getUserLevel(currentLesson);
  const [confirmSkip, setConfirmSkip] = useState(null); // lessonId to confirm

  return (
    <div className="px-4 pt-6 pb-4">
      <motion.h1
        className="font-display text-2xl font-semibold text-charcoal mb-6"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Learning Path
      </motion.h1>

      <div className="space-y-8">
        {lessonsData.phases.map((phase, phaseIndex) => (
          <div key={phase.id}>
            {/* Phase header */}
            <motion.div
              className="flex items-center gap-3 mb-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: phaseIndex * 0.1 }}
            >
              <div className="h-px flex-1 bg-cream-dark" />
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-charcoal/50 uppercase tracking-wider">
                  {phase.name}
                </span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                  phaseIndex === 0 ? 'bg-success/10 text-success'
                    : phaseIndex === 1 ? 'bg-info/10 text-info'
                      : 'bg-primary/10 text-primary'
                }`}>
                  {DIFFICULTY_INFO[phaseIndex + 1]?.short}
                </span>
              </div>
              <div className="h-px flex-1 bg-cream-dark" />
            </motion.div>

            {/* Lesson nodes */}
            <div className="relative">
              {/* Connecting line */}
              <div className="absolute left-7 top-0 bottom-0 w-0.5 bg-cream-dark" />

              <div className="space-y-3">
                {phase.lessons.map((lesson, i) => {
                  const progress = lessonProgress[lesson.id];
                  const unlocked = isLessonUnlocked(lesson.id);
                  const completed = progress?.completed;
                  const skipped = progress?.skipped;
                  const accuracy = progress?.bestScore || 0;
                  const isActive = unlocked && !completed;

                  return (
                    <div key={lesson.id} className="relative">
                      <motion.button
                        onClick={() => {
                          if (unlocked) {
                            navigate(`/lesson/${lesson.id}`);
                          } else {
                            // Tapping a locked lesson shows skip-to-here confirmation
                            setConfirmSkip(confirmSkip === lesson.id ? null : lesson.id);
                          }
                        }}
                        className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all relative ${
                          completed && !skipped
                            ? 'bg-success/5 border border-success/20'
                            : completed && skipped
                              ? 'bg-warning/5 border border-warning/20'
                              : unlocked
                                ? 'bg-white border border-cream-dark/50 shadow-sm pulse-orange'
                                : 'bg-cream-dark/30 border border-transparent opacity-60'
                        }`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: phaseIndex * 0.1 + i * 0.04 }}
                        whileHover={unlocked ? { scale: 1.01 } : {}}
                        whileTap={unlocked ? { scale: 0.98 } : {}}
                      >
                        {/* Node circle */}
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center z-10 shrink-0 ${
                            completed && !skipped
                              ? 'bg-success text-white'
                              : completed && skipped
                                ? 'bg-warning text-white'
                                : unlocked
                                  ? 'bg-primary text-white'
                                  : 'bg-cream-dark text-charcoal/30'
                          }`}
                        >
                          {completed && !skipped ? (
                            <Check size={18} strokeWidth={3} />
                          ) : completed && skipped ? (
                            <SkipForward size={16} />
                          ) : unlocked ? (
                            <span className="text-sm font-bold">{lesson.id}</span>
                          ) : (
                            <Lock size={14} />
                          )}
                        </div>

                        {/* Lesson info */}
                        <div className="flex-1 text-left min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{lesson.icon}</span>
                            <span
                              className={`font-semibold text-sm truncate ${
                                unlocked ? 'text-charcoal' : 'text-charcoal/40'
                              }`}
                            >
                              {lesson.title}
                            </span>
                            {skipped && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-warning/10 text-warning font-medium">
                                Skipped
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <p className="text-xs text-charcoal/50 truncate flex-1">
                              {lesson.description}
                            </p>
                            <LevelBadge difficulty={getLessonDifficulty(lesson.id)} userLevel={userLevel} compact />
                          </div>
                        </div>

                        {/* Progress / Arrow */}
                        {completed && !skipped ? (
                          <div className="shrink-0 flex items-center gap-2">
                            <ProgressRing
                              progress={accuracy / 100}
                              size={36}
                              strokeWidth={3}
                              color="var(--color-success)"
                            >
                              <span className="text-[9px] font-bold text-success">
                                {accuracy}%
                              </span>
                            </ProgressRing>
                            <div className="flex items-center gap-1 text-primary/60">
                              <RotateCcw size={12} />
                            </div>
                          </div>
                        ) : unlocked ? (
                          <ChevronRight
                            size={18}
                            className="text-charcoal/30 shrink-0"
                          />
                        ) : null}
                      </motion.button>

                      {/* Skip button — shows on active (unlocked, not completed) lessons */}
                      {isActive && (
                        <div className="flex justify-end mt-1 mr-1">
                          {confirmSkip === lesson.id ? (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="flex items-center gap-2"
                            >
                              <span className="text-xs text-charcoal/50">Skip this lesson?</span>
                              <button
                                onClick={() => {
                                  skipLesson(lesson.id);
                                  setConfirmSkip(null);
                                }}
                                className="text-xs font-medium text-warning px-2 py-1 rounded-lg bg-warning/10 hover:bg-warning/20 transition-colors"
                              >
                                Yes, skip
                              </button>
                              <button
                                onClick={() => setConfirmSkip(null)}
                                className="text-xs font-medium text-charcoal/40 px-2 py-1 rounded-lg hover:bg-cream-dark/50 transition-colors"
                              >
                                Cancel
                              </button>
                            </motion.div>
                          ) : (
                            <button
                              onClick={() => setConfirmSkip(lesson.id)}
                              className="text-xs text-charcoal/40 hover:text-warning font-medium flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-warning/5 transition-colors"
                            >
                              <SkipForward size={12} />
                              I know this already
                            </button>
                          )}
                        </div>
                      )}

                      {/* Skip confirmation popover for LOCKED lessons (tap lock to skip ahead) */}
                      <AnimatePresence>
                        {confirmSkip === lesson.id && !unlocked && (
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            className="mt-1 mr-1 flex justify-end"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-charcoal/50">Skip to here?</span>
                              <button
                                onClick={() => {
                                  // Skip all lessons from current up to this one
                                  const allLessons = lessonsData.phases.flatMap(p => p.lessons);
                                  for (const l of allLessons) {
                                    if (l.id >= currentLesson && l.id <= lesson.id) {
                                      skipLesson(l.id);
                                    }
                                  }
                                  setConfirmSkip(null);
                                }}
                                className="text-xs font-medium text-warning px-2 py-1 rounded-lg bg-warning/10 hover:bg-warning/20 transition-colors"
                              >
                                Yes, skip
                              </button>
                              <button
                                onClick={() => setConfirmSkip(null)}
                                className="text-xs font-medium text-charcoal/40 px-2 py-1 rounded-lg hover:bg-cream-dark/50 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
