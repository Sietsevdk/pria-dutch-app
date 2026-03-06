import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star,
  Flame,
  BookOpen,
  Target,
  Clock,
  TrendingUp,
  Settings,
  RotateCcw,
  ChevronDown,
  AlertTriangle,
  Download,
  Crosshair,
} from 'lucide-react';
import ProgressRing from '../components/ProgressRing';
import useProgress from '../hooks/useProgress';
import useStreak from '../hooks/useStreak';
import useSRS from '../hooks/useSRS';
import useMistakes from '../hooks/useMistakes';
import { getLevel, LEVELS } from '../utils/xp';
import { calculateAccuracy } from '../utils/xp';

export default function Profile() {
  const totalXP = useProgress((s) => s.totalXP);
  const totalWordsLearned = useProgress((s) => s.totalWordsLearned);
  const totalExercises = useProgress((s) => s.totalExercises);
  const totalCorrect = useProgress((s) => s.totalCorrect);
  const totalTime = useProgress((s) => s.totalTime);
  const grammarMastered = useProgress((s) => s.grammarMastered);
  const exerciseTypeStats = useProgress((s) => s.exerciseTypeStats);
  const dailyGoalMinutes = useProgress((s) => s.dailyGoalMinutes);
  const ttsSpeed = useProgress((s) => s.ttsSpeed);
  const setDailyGoal = useProgress((s) => s.setDailyGoal);
  const setTTSSpeed = useProgress((s) => s.setTTSSpeed);
  const resetProgress = useProgress((s) => s.resetProgress);
  const currentStreak = useStreak((s) => s.currentStreak);
  const longestStreak = useStreak((s) => s.longestStreak);
  const getCalendarData = useStreak((s) => s.getCalendarData);
  const resetStreak = useStreak((s) => s.resetStreak);
  const getWeakItems = useSRS((s) => s.getWeakItems);
  const clearSRS = useSRS((s) => s.clearAll);
  const generatePracticeFromMistakes = useMistakes((s) => s.generatePracticeFromMistakes);

  const [showSettings, setShowSettings] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [exported, setExported] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [focusExercises, setFocusExercises] = useState([]);
  const [focusIndex, setFocusIndex] = useState(0);
  const [focusAnswer, setFocusAnswer] = useState(null);
  const [focusScore, setFocusScore] = useState({ correct: 0, total: 0 });

  const handleExport = () => {
    const data = {
      exportDate: new Date().toISOString(),
      progress: {
        totalXP,
        totalWordsLearned,
        totalExercises,
        totalCorrect,
        totalTime,
        grammarMastered,
        exerciseTypeStats,
        dailyGoalMinutes,
        ttsSpeed,
      },
      streak: {
        currentStreak,
        longestStreak,
      },
      srs: {
        weakItems: getWeakItems(20),
      },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `pria-progress-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setExported(true);
    setTimeout(() => setExported(false), 2000);
  };

  const startFocusMode = () => {
    const weakSRS = getWeakItems(10);
    const mistakeExercises = generatePracticeFromMistakes(10);
    // Combine weak SRS items + mistake exercises, take up to 10
    const combined = [];
    weakSRS.forEach((item) => {
      combined.push({
        id: item.id,
        question: item.id,
        options: null, // will be generated below
        correctAnswer: item.id,
        source: 'srs-weak',
      });
    });
    mistakeExercises.forEach((ex) => {
      combined.push({
        id: ex.id,
        question: ex.word || ex.correctAnswer,
        correctAnswer: ex.correctAnswer,
        source: 'mistake',
      });
    });
    // Deduplicate and limit to 10
    const seen = new Set();
    const unique = combined.filter((e) => {
      const key = e.question + e.correctAnswer;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 10);
    // Generate multiple choice options for each exercise
    const exercises = unique.map((ex) => {
      const wrongOptions = ['de', 'het', 'een', 'die', 'dat', 'dit', 'deze']
        .filter((o) => o !== ex.correctAnswer)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
      const options = [ex.correctAnswer, ...wrongOptions].sort(() => Math.random() - 0.5);
      return { ...ex, options };
    });
    setFocusExercises(exercises);
    setFocusIndex(0);
    setFocusAnswer(null);
    setFocusScore({ correct: 0, total: 0 });
    setFocusMode(true);
  };

  const level = getLevel(totalXP);
  const accuracy = calculateAccuracy(totalCorrect, totalExercises);
  const calendarData = getCalendarData(84); // 12 weeks
  const weakItems = getWeakItems(5);
  const grammarCount = Object.values(grammarMastered).filter((g) => g.mastered).length;

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.06 } },
  };
  const item = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0 },
  };

  // Focus Mode active view
  if (focusMode) {
    const currentEx = focusExercises[focusIndex];
    const isComplete = focusIndex >= focusExercises.length;

    if (isComplete || focusExercises.length === 0) {
      return (
        <div className="px-4 pt-6 text-center">
          <div className="text-4xl mb-4">{focusExercises.length === 0 ? '📭' : focusScore.correct >= focusScore.total * 0.8 ? '🎉' : '💪'}</div>
          <h2 className="font-display text-2xl font-semibold text-charcoal mb-2">
            {focusExercises.length === 0 ? 'No weak areas found!' : focusScore.correct >= focusScore.total * 0.8 ? 'Great work!' : 'Keep practicing!'}
          </h2>
          {focusScore.total > 0 && (
            <p className="text-charcoal/60 mb-2">
              Score: {focusScore.correct}/{focusScore.total} ({Math.round((focusScore.correct / focusScore.total) * 100)}%)
            </p>
          )}
          <button
            onClick={() => setFocusMode(false)}
            className="mt-4 bg-primary text-white font-semibold px-8 py-3 rounded-xl"
          >
            Back to Profile
          </button>
        </div>
      );
    }

    return (
      <div className="px-4 pt-6 pb-4">
        <button
          onClick={() => setFocusMode(false)}
          className="text-sm text-primary font-medium mb-4"
        >
          ← Back to Profile
        </button>
        <h2 className="font-display text-lg font-semibold text-charcoal mb-1">Focus Mode</h2>
        <p className="text-sm text-charcoal/60 mb-4">
          Exercise {focusIndex + 1} of {focusExercises.length}
        </p>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-cream-dark/50 mb-4">
          <p className="text-lg font-semibold text-charcoal mb-4 text-center">
            {currentEx.question}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {currentEx.options?.map((opt) => (
              <button
                key={opt}
                onClick={() => {
                  if (focusAnswer) return;
                  setFocusAnswer(opt);
                  const correct = opt === currentEx.correctAnswer;
                  setFocusScore((s) => ({
                    correct: s.correct + (correct ? 1 : 0),
                    total: s.total + 1,
                  }));
                  setTimeout(() => {
                    setFocusAnswer(null);
                    setFocusIndex((i) => i + 1);
                  }, 1200);
                }}
                disabled={!!focusAnswer}
                className={`py-3 rounded-xl text-sm font-medium transition-all ${
                  focusAnswer === opt
                    ? opt === currentEx.correctAnswer
                      ? 'bg-success text-white'
                      : 'bg-error text-white'
                    : focusAnswer && opt === currentEx.correctAnswer
                      ? 'bg-success/20 text-success border-2 border-success'
                      : 'bg-cream-dark text-charcoal hover:bg-cream-dark/80'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="px-4 pt-6 pb-4"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Profile header */}
      <motion.div variants={item} className="text-center mb-6">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
          <span className="text-3xl">{level.icon}</span>
        </div>
        <h1 className="font-display text-2xl font-semibold text-charcoal">{level.name}</h1>
        <p className="text-sm text-charcoal/60">{totalXP} XP total</p>

        {/* Level progress */}
        <div className="mt-3 max-w-xs mx-auto">
          <div className="h-2.5 bg-cream-dark rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${level.progress * 100}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
          {level.nextLevel && (
            <p className="text-xs text-charcoal/50 mt-1">
              {level.xpForNextLevel - level.xpInLevel} XP to {level.nextLevel.name}
            </p>
          )}
        </div>
      </motion.div>

      {/* Stats grid */}
      <motion.div variants={item} className="grid grid-cols-2 gap-3 mb-4">
        <StatCard icon={Flame} label="Current Streak" value={`${currentStreak} days`} color="text-primary" />
        <StatCard icon={Star} label="Longest Streak" value={`${longestStreak} days`} color="text-warning" />
        <StatCard icon={BookOpen} label="Words Learned" value={totalWordsLearned} color="text-info" />
        <StatCard icon={Target} label="Accuracy" value={`${accuracy}%`} color="text-success" />
        <StatCard icon={Clock} label="Time Spent" value={`${totalTime} min`} color="text-charcoal/70" />
        <StatCard icon={TrendingUp} label="Grammar Mastered" value={`${grammarCount}/14`} color="text-primary" />
      </motion.div>

      {/* Streak Calendar */}
      <motion.div variants={item} className="bg-white rounded-2xl p-4 shadow-sm border border-cream-dark/50 mb-4">
        <h3 className="font-semibold text-sm text-charcoal mb-3">Activity Calendar</h3>
        <div className="grid grid-cols-7 gap-1">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
            <div key={i} className="text-center text-[9px] text-charcoal/40 font-medium pb-1">
              {day}
            </div>
          ))}
          {calendarData.map((day, i) => (
            <div
              key={i}
              className={`aspect-square rounded-sm ${
                day.completed
                  ? day.xp > 100
                    ? 'bg-success'
                    : day.xp > 50
                      ? 'bg-success/70'
                      : 'bg-success/40'
                  : 'bg-cream-dark/50'
              }`}
              title={`${day.date}: ${day.xp} XP`}
            />
          ))}
        </div>
      </motion.div>

      {/* Accuracy by exercise type */}
      {Object.keys(exerciseTypeStats).length > 0 && (
        <motion.div variants={item} className="bg-white rounded-2xl p-4 shadow-sm border border-cream-dark/50 mb-4">
          <h3 className="font-semibold text-sm text-charcoal mb-3">Accuracy by Type</h3>
          <div className="space-y-2">
            {Object.entries(exerciseTypeStats).map(([type, stats]) => {
              const acc = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
              return (
                <div key={type} className="flex items-center gap-3">
                  <span className="text-xs text-charcoal/60 w-28 truncate capitalize">
                    {type.replace('_', ' ')}
                  </span>
                  <div className="flex-1 h-2 bg-cream-dark rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${acc >= 80 ? 'bg-success' : acc >= 60 ? 'bg-warning' : 'bg-error'}`}
                      style={{ width: `${acc}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-charcoal/70 w-10 text-right">
                    {acc}%
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Weak areas */}
      {weakItems.length > 0 && (
        <motion.div variants={item} className="bg-white rounded-2xl p-4 shadow-sm border border-cream-dark/50 mb-4">
          <h3 className="font-semibold text-sm text-charcoal mb-3">Needs Practice</h3>
          <div className="space-y-2">
            {weakItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span className="text-charcoal/70">{item.id}</span>
                <span className="text-xs text-error/70">
                  Ease: {item.easeFactor?.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Focus Mode */}
      <motion.div variants={item}>
        <button
          onClick={startFocusMode}
          className="w-full bg-gradient-to-r from-primary to-primary-light text-white rounded-2xl p-4 mb-4 flex items-center justify-between shadow-md"
        >
          <div className="flex items-center gap-3">
            <Crosshair size={20} />
            <div className="text-left">
              <div className="font-semibold text-sm">Focus Mode</div>
              <div className="text-xs text-white/80">Practice Your Weak Areas</div>
            </div>
          </div>
          <ChevronDown size={16} className="rotate-[-90deg]" />
        </button>
      </motion.div>

      {/* Settings */}
      <motion.div variants={item}>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="w-full bg-white rounded-2xl p-4 shadow-sm border border-cream-dark/50 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Settings size={18} className="text-charcoal/50" />
            <span className="font-semibold text-sm text-charcoal">Settings</span>
          </div>
          <ChevronDown
            size={16}
            className={`text-charcoal/30 transition-transform ${showSettings ? 'rotate-180' : ''}`}
          />
        </button>

        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-b-2xl p-4 border-x border-b border-cream-dark/50 -mt-2 pt-6 space-y-4">
              {/* Daily goal */}
              <div>
                <label className="text-sm font-medium text-charcoal block mb-2">
                  Daily Goal
                </label>
                <div className="flex gap-2">
                  {[5, 10, 15, 20].map((min) => (
                    <button
                      key={min}
                      onClick={() => setDailyGoal(min)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                        dailyGoalMinutes === min
                          ? 'bg-primary text-white'
                          : 'bg-cream-dark text-charcoal/60'
                      }`}
                    >
                      {min} min
                    </button>
                  ))}
                </div>
              </div>

              {/* TTS Speed */}
              <div>
                <label className="text-sm font-medium text-charcoal block mb-2">
                  TTS Speed
                </label>
                <div className="flex gap-2">
                  {['slow', 'normal'].map((speed) => (
                    <button
                      key={speed}
                      onClick={() => setTTSSpeed(speed)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                        ttsSpeed === speed
                          ? 'bg-primary text-white'
                          : 'bg-cream-dark text-charcoal/60'
                      }`}
                    >
                      {speed}
                    </button>
                  ))}
                </div>
              </div>

              {/* Export Progress */}
              <div className="pt-2 border-t border-cream-dark">
                <button
                  onClick={handleExport}
                  className="text-sm text-primary flex items-center gap-2 font-medium"
                >
                  <Download size={14} />
                  {exported ? 'Exported!' : 'Export Progress'}
                </button>
              </div>

              {/* Reset */}
              <div className="pt-2 border-t border-cream-dark">
                {!showReset ? (
                  <button
                    onClick={() => setShowReset(true)}
                    className="text-sm text-error/70 flex items-center gap-2"
                  >
                    <RotateCcw size={14} />
                    Reset all progress
                  </button>
                ) : (
                  <div className="bg-error/5 border border-error/20 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle size={14} className="text-error" />
                      <span className="text-sm font-medium text-error">Are you sure?</span>
                    </div>
                    <p className="text-xs text-charcoal/60 mb-3">
                      This will permanently delete all your progress, streaks, and learned words.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowReset(false)}
                        className="flex-1 bg-cream-dark text-charcoal text-sm py-2 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          resetProgress();
                          resetStreak();
                          clearSRS();
                          setShowReset(false);
                        }}
                        className="flex-1 bg-error text-white text-sm py-2 rounded-lg"
                      >
                        Reset
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-2xl p-3 shadow-sm border border-cream-dark/50">
      <Icon size={16} className={`${color} mb-1.5`} />
      <div className="text-lg font-bold text-charcoal leading-tight">{value}</div>
      <div className="text-[10px] text-charcoal/50">{label}</div>
    </div>
  );
}
