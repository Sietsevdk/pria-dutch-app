import { useState, useMemo } from 'react';
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
  Heart,
  Volume2,
} from 'lucide-react';
import ProgressRing from '../components/ProgressRing';
import useProgress from '../hooks/useProgress';
import useStreak from '../hooks/useStreak';
import useSRS from '../hooks/useSRS';
import useMistakes from '../hooks/useMistakes';
import useFavourites from '../hooks/useFavourites';
import { useSpeech } from '../hooks/useSpeech';
import { dutchWithArticle, dutchBareWord } from '../utils/dutch';
import { getLevel, LEVELS } from '../utils/xp';
import { calculateAccuracy } from '../utils/xp';

// Load vocabulary for Focus Mode distractors
const vocabModules = import.meta.glob('../data/vocabulary/*.json', { eager: true });
const allVocabWords = [];
Object.values(vocabModules).forEach((mod) => {
  const data = mod.default || mod;
  if (data.words) allVocabWords.push(...data.words);
});

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
  const activityCalendar = useStreak((s) => s.activityCalendar);
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

  // Helper: build MC exercises from a list of vocab words
  const buildExercises = (words) => {
    return words.map((word) => {
      const wrongOptions = allVocabWords
        .filter((w) => w.english !== word.english)
        .map((w) => w.english)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
      const options = [word.english, ...wrongOptions].sort(() => Math.random() - 0.5);
      return {
        id: word.id,
        question: word.dutch,
        correctAnswer: word.english,
        prompt: `What does "${word.dutch}" mean?`,
        options,
      };
    });
  };

  const launchFocusExercises = (exercises) => {
    setFocusExercises(exercises);
    setFocusIndex(0);
    setFocusAnswer(null);
    setFocusScore({ correct: 0, total: 0 });
    setFocusMode(true);
  };

  // Review a single word
  const startSingleReview = (wordId) => {
    const word = allVocabWords.find((w) => w.id === wordId);
    if (!word) return;
    launchFocusExercises(buildExercises([word]));
  };

  const startFocusMode = () => {
    const weakSRS = getWeakItems(10);
    const mistakeExercises = generatePracticeFromMistakes(10);
    const combined = [];

    // SRS weak items: look up actual word data and create Dutch→English questions
    weakSRS.forEach((item) => {
      const word = allVocabWords.find((w) => w.id === item.id);
      if (!word) return;
      combined.push(word);
    });

    // Mistake exercises: look up the vocabulary word (ex.word stores the word ID)
    mistakeExercises.forEach((ex) => {
      if (!ex.correctAnswer) return;
      const word = allVocabWords.find(
        (w) => w.id === ex.word || w.dutch === ex.word || w.id === ex.id || w.dutch === ex.correctAnswer
      );
      if (!word) return;
      combined.push(word);
    });

    // Deduplicate and limit to 10
    const seen = new Set();
    const unique = combined.filter((w) => {
      if (seen.has(w.id)) return false;
      seen.add(w.id);
      return true;
    }).slice(0, 10);

    launchFocusExercises(buildExercises(unique));
  };

  const level = getLevel(totalXP);
  const accuracy = calculateAccuracy(totalCorrect, totalExercises);
  const calendarData = useMemo(() => {
    const data = [];
    const today = new Date();
    for (let i = 83; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const activity = activityCalendar?.[dateStr];
      data.push({
        date: dateStr,
        dayOfWeek: date.getDay(),
        completed: activity?.completed || false,
        xp: activity?.xp || 0,
      });
    }
    return data;
  }, [activityCalendar]); // 12 weeks
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
          <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2 text-center">
            {currentEx.prompt || 'What does this mean?'}
          </p>
          <p className="text-2xl font-bold text-charcoal mb-5 text-center">
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
        <ActivityCalendar data={calendarData} />
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
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-charcoal">Needs Practice</h3>
            <button
              onClick={startFocusMode}
              className="text-xs text-primary font-medium"
            >
              Practice all →
            </button>
          </div>
          <div className="space-y-2">
            {weakItems.map((wi) => {
              const word = allVocabWords.find((w) => w.id === wi.id);
              return (
                <div key={wi.id} className="flex items-center justify-between text-sm py-1">
                  <div>
                    <span className="text-charcoal font-medium">{word?.dutch || wi.id}</span>
                    {word?.english && (
                      <span className="text-charcoal/50 ml-2 text-xs">— {word.english}</span>
                    )}
                  </div>
                  <button
                    onClick={() => startSingleReview(wi.id)}
                    className="text-xs text-warning font-medium bg-warning/10 px-2.5 py-1 rounded-lg hover:bg-warning/20 transition-colors"
                  >
                    review
                  </button>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Favourites */}
      <FavouritesSection item={item} />

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

function ActivityCalendar({ data }) {
  if (!data || data.length === 0) return null;

  // Group data into weeks (Mon-Sun), last 8 weeks
  const weeks = [];
  const recent = data.slice(-56); // 8 weeks max

  // Pad start so first day aligns to correct weekday (0=Sun, 1=Mon...)
  const firstDayOfWeek = recent[0]?.dayOfWeek;
  // Convert to Mon=0 format: (dayOfWeek + 6) % 7
  const mondayOffset = (firstDayOfWeek + 6) % 7;
  const padded = [...Array(mondayOffset).fill(null), ...recent];

  // Split into weeks of 7
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7));
  }

  // Get month labels for the first day of each week
  const monthLabels = weeks.map((week) => {
    const firstDay = week.find((d) => d !== null);
    if (!firstDay) return '';
    const date = new Date(firstDay.date + 'T12:00:00');
    const day = date.getDate();
    if (day <= 7) {
      return date.toLocaleString('en', { month: 'short' });
    }
    return '';
  });

  const today = new Date().toISOString().split('T')[0];

  return (
    <div>
      {/* Day headers */}
      <div className="flex gap-0.5 mb-1">
        <div className="w-8" />
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <div key={i} className="flex-1 text-center text-[9px] text-charcoal/40 font-medium">
            {d}
          </div>
        ))}
      </div>
      {/* Weeks */}
      <div className="space-y-0.5">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex gap-0.5 items-center">
            <div className="w-8 text-[9px] text-charcoal/40 text-right pr-1">
              {monthLabels[wi]}
            </div>
            {week.map((day, di) => (
              <div
                key={di}
                className={`flex-1 h-3.5 rounded-sm ${
                  day === null
                    ? 'bg-transparent'
                    : day.completed
                      ? day.xp > 100
                        ? 'bg-success'
                        : day.xp > 50
                          ? 'bg-success/70'
                          : 'bg-success/40'
                      : day.date === today
                        ? 'bg-primary/20 border border-primary/30'
                        : 'bg-cream-dark/40'
                }`}
                title={day ? `${day.date}: ${day.xp} XP` : ''}
              />
            ))}
          </div>
        ))}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-3 mt-2 justify-end">
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-sm bg-cream-dark/40" />
          <span className="text-[9px] text-charcoal/40">No activity</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-sm bg-success/40" />
          <span className="text-[9px] text-charcoal/40">Active</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2.5 h-2.5 rounded-sm bg-success" />
          <span className="text-[9px] text-charcoal/40">100+ XP</span>
        </div>
      </div>
    </div>
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

function FavouritesSection({ item: animVariant }) {
  const favourites = useFavourites((s) => s.favourites);
  const toggleFavourite = useFavourites((s) => s.toggleFavourite);
  const { speak } = useSpeech();
  const [isOpen, setIsOpen] = useState(false);

  if (favourites.length === 0) return null;

  const wordFavs = favourites.filter((f) => f.type === 'word');
  const grammarFavs = favourites.filter((f) => f.type === 'grammar');
  const verbFavs = favourites.filter((f) => f.type === 'verb');

  return (
    <motion.div variants={animVariant} className="mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white rounded-2xl p-4 shadow-sm border border-cream-dark/50 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <Heart size={18} className="text-error" fill="currentColor" />
          <div>
            <span className="font-semibold text-sm text-charcoal">Favourites</span>
            <span className="text-xs text-charcoal/50 ml-2">{favourites.length} saved</span>
          </div>
        </div>
        <ChevronDown
          size={16}
          className={`text-charcoal/30 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-b-2xl px-4 pb-4 border-x border-b border-cream-dark/50 -mt-2 pt-4 space-y-3">
              {/* Words */}
              {wordFavs.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-charcoal/40 uppercase tracking-wide mb-1.5">
                    Words ({wordFavs.length})
                  </p>
                  <div className="space-y-1">
                    {wordFavs.map((fav) => (
                      <div key={fav.id} className="flex items-center justify-between py-1.5 text-sm">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <button
                            onClick={() => speak(fav.data.dutch)}
                            className="text-primary/60 hover:text-primary p-0.5"
                          >
                            <Volume2 size={12} />
                          </button>
                          <span className="font-medium text-charcoal truncate">
                            {fav.data.article && <span className="text-primary/50 text-xs mr-1">{fav.data.article}</span>}
                            {(() => {
                              // Strip embedded article to avoid "de de familie"
                              const d = fav.data.dutch || '';
                              if (fav.data.article && d.toLowerCase().startsWith(fav.data.article.toLowerCase() + ' ')) {
                                return d.slice(fav.data.article.length + 1);
                              }
                              return d;
                            })()}
                          </span>
                          <span className="text-charcoal/40 text-xs truncate">— {fav.data.english}</span>
                        </div>
                        <button
                          onClick={() => toggleFavourite(fav.id)}
                          className="text-error p-1 shrink-0"
                        >
                          <Heart size={12} fill="currentColor" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Grammar */}
              {grammarFavs.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-charcoal/40 uppercase tracking-wide mb-1.5">
                    Grammar ({grammarFavs.length})
                  </p>
                  <div className="space-y-1">
                    {grammarFavs.map((fav) => (
                      <div key={fav.id} className="flex items-center justify-between py-1.5 text-sm">
                        <div className="min-w-0 flex-1">
                          <span className="font-medium text-charcoal truncate block">{fav.data.title}</span>
                          {fav.data.summary && (
                            <span className="text-charcoal/40 text-xs truncate block">{fav.data.summary}</span>
                          )}
                        </div>
                        <button
                          onClick={() => toggleFavourite(fav.id)}
                          className="text-error p-1 shrink-0"
                        >
                          <Heart size={12} fill="currentColor" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Verbs */}
              {verbFavs.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-charcoal/40 uppercase tracking-wide mb-1.5">
                    Verbs ({verbFavs.length})
                  </p>
                  <div className="space-y-1">
                    {verbFavs.map((fav) => (
                      <div key={fav.id} className="flex items-center justify-between py-1.5 text-sm">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <button
                            onClick={() => speak(fav.data.infinitive)}
                            className="text-primary/60 hover:text-primary p-0.5"
                          >
                            <Volume2 size={12} />
                          </button>
                          <span className="font-medium text-charcoal">{fav.data.infinitive}</span>
                          <span className="text-charcoal/40 text-xs">— {fav.data.meaning}</span>
                        </div>
                        <button
                          onClick={() => toggleFavourite(fav.id)}
                          className="text-error p-1 shrink-0"
                        >
                          <Heart size={12} fill="currentColor" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
