import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen,
  RefreshCw,
  Mic,
  ChevronRight,
  Sparkles,
  Target,
  Volume2,
  Languages,
  Landmark,
  ClipboardCheck,
} from 'lucide-react';
import StreakCounter from '../components/StreakCounter';
import XPBar from '../components/XPBar';
import ProgressRing from '../components/ProgressRing';
import useProgress from '../hooks/useProgress';
import useStreak from '../hooks/useStreak';
import useSRS from '../hooks/useSRS';
import useMistakes from '../hooks/useMistakes';
import { getDueItems } from '../utils/srs';

// Load idioms eagerly
const idiomsModule = import.meta.glob('../data/idioms.json', { eager: true });
let idiomsData = { idioms: [] };
Object.values(idiomsModule).forEach((mod) => {
  idiomsData = mod.default || mod;
});

export default function Home() {
  const navigate = useNavigate();
  const currentLesson = useProgress((s) => s.currentLesson);
  const goalsCompleted = useProgress((s) => s.goalsCompleted);
  const weeklyXP = useProgress((s) => s.weeklyXP);
  const resetDailyGoals = useProgress((s) => s.resetDailyGoals);
  const totalWordsLearned = useProgress((s) => s.totalWordsLearned);
  const currentStreak = useStreak((s) => s.currentStreak);
  const completedToday = useStreak((s) => s.completedToday);
  const checkStreak = useStreak((s) => s.checkStreak);
  const shouldShowEasterEgg = useStreak((s) => s.currentStreak === 30);
  const srsItems = useSRS((s) => s.items);
  const dueCount = useMemo(() => getDueItems(srsItems).length, [srsItems]);

  const [dailyIdiom, setDailyIdiom] = useState(null);

  const clearOldMistakes = useMistakes((s) => s.clearOldMistakes);

  useEffect(() => {
    checkStreak();
    resetDailyGoals();
    clearOldMistakes(30); // Clean up mistakes older than 30 days
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only on mount — these are store actions that don't change

  useEffect(() => {
    if (idiomsData.idioms?.length > 0) {
      const dayOfYear = Math.floor(
        (Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000
      );
      setDailyIdiom(idiomsData.idioms[dayOfYear % idiomsData.idioms.length]);
    }
  }, []);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Goedemorgen';
    if (hour < 18) return 'Goedemiddag';
    return 'Goedenavond';
  }, []);

  const goalsCompleteCount = useMemo(() => {
    return Object.values(goalsCompleted).filter(Boolean).length;
  }, [goalsCompleted]);
  const goalsProgress = goalsCompleteCount / 3;
  const allGoalsDone = goalsCompleteCount === 3;

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08 } },
  };
  const item = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      className="px-4 pt-6 pb-4"
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-charcoal">
            {greeting}, Pria! 👋
          </h1>
          <p className="text-sm text-charcoal/60 mt-0.5">
            {completedToday
              ? 'Great work today!'
              : currentStreak > 0
                ? `Day ${currentStreak} — keep it going!`
                : "Let's start learning Dutch"}
          </p>
        </div>
        <StreakCounter compact />
      </motion.div>

      {/* Easter egg for 30-day streak */}
      {shouldShowEasterEgg && (
        <motion.div
          variants={item}
          className="bg-gradient-to-r from-primary to-primary-light rounded-2xl p-4 mb-4 text-white"
        >
          <div className="text-lg font-display font-semibold">
            30 dagen! Fantastisch! 🧇
          </div>
          <p className="text-sm mt-1 text-white/90">
            Je verdient een stroopwafel! Gefeliciteerd met je 30-daagse streak!
          </p>
        </motion.div>
      )}

      {/* Streak + XP Row */}
      <motion.div variants={item} className="grid grid-cols-2 gap-3 mb-4">
        <StreakCounter />
        <XPBar showDetails={false} />
      </motion.div>

      {/* Main CTA — Continue Learning */}
      <motion.button
        variants={item}
        onClick={() => navigate(`/lesson/${currentLesson}`)}
        className="w-full bg-primary text-white rounded-2xl p-5 flex items-center justify-between shadow-md hover:bg-primary-dark transition-colors mb-4"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <BookOpen size={24} />
          </div>
          <div className="text-left">
            <div className="font-semibold text-lg">Continue Learning</div>
            <div className="text-sm text-white/80">Lesson {currentLesson}</div>
          </div>
        </div>
        <ChevronRight size={22} />
      </motion.button>

      {/* Review Card */}
      {dueCount > 0 ? (
        <motion.button
          variants={item}
          onClick={() => navigate('/review')}
          className="w-full bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm border border-warning/30 mb-4"
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-warning/10 rounded-xl flex items-center justify-center">
              <RefreshCw size={20} className="text-warning" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-sm text-charcoal">
                {dueCount} {dueCount === 1 ? 'word' : 'words'} to review
              </div>
              <div className="text-xs text-charcoal/50">Keep your memory fresh</div>
            </div>
          </div>
          <ChevronRight size={18} className="text-charcoal/30" />
        </motion.button>
      ) : (
        <motion.div
          variants={item}
          className="w-full bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm border border-cream-dark/50 mb-4"
        >
          <div className="w-10 h-10 bg-success/10 rounded-xl flex items-center justify-center">
            <RefreshCw size={20} className="text-success" />
          </div>
          <div className="text-left">
            <div className="font-semibold text-sm text-charcoal/70">Reviews complete</div>
            <div className="text-xs text-charcoal/40">Next reviews tomorrow</div>
          </div>
        </motion.div>
      )}

      {/* Daily Goals */}
      <motion.div
        variants={item}
        className="bg-white rounded-2xl p-4 shadow-sm border border-cream-dark/50 mb-4"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target size={18} className="text-primary" />
            <h2 className="font-semibold text-charcoal text-sm">Today's Goals</h2>
          </div>
          <ProgressRing progress={goalsProgress} size={36} strokeWidth={3}>
            <span className="text-[10px] font-bold text-charcoal">
              {Math.round(goalsProgress * 100)}%
            </span>
          </ProgressRing>
        </div>
        <div className="space-y-2.5">
          <GoalItem
            icon={BookOpen}
            label="Complete 1 lesson"
            done={goalsCompleted.lesson}
          />
          <GoalItem
            icon={RefreshCw}
            label={`Review ${dueCount > 0 ? dueCount : ''} words`}
            done={goalsCompleted.review}
          />
          <GoalItem
            icon={Mic}
            label="Practice speaking"
            done={goalsCompleted.speaking}
          />
        </div>

        {/* All goals done celebration */}
        {allGoalsDone && (
          <div className="mt-3 bg-success/10 rounded-xl p-3 flex items-center gap-2">
            <Sparkles size={16} className="text-success flex-shrink-0" />
            <p className="text-xs text-success font-medium">
              All goals complete! Keep going for bonus XP!
            </p>
          </div>
        )}
      </motion.div>

      {/* Extra credit — shown when all goals done */}
      {allGoalsDone && (
        <motion.button
          variants={item}
          onClick={() => navigate(`/lesson/${currentLesson}`)}
          className="w-full bg-gradient-to-r from-success to-success/80 text-white rounded-2xl p-4 flex items-center justify-between shadow-sm mb-4"
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Sparkles size={20} />
            </div>
            <div className="text-left">
              <div className="font-semibold text-sm">Extra Credit</div>
              <div className="text-xs text-white/80">Do another lesson to get ahead!</div>
            </div>
          </div>
          <ChevronRight size={18} />
        </motion.button>
      )}

      {/* Tools */}
      <motion.div variants={item} className="mb-3">
        <h2 className="font-semibold text-sm text-charcoal/60 mb-2">Tools</h2>
      </motion.div>
      <motion.div variants={item} className="grid grid-cols-3 gap-3 mb-4">
        <QuickAction
          icon={Mic}
          label="Speaking"
          onClick={() => navigate('/practice?tab=speaking')}
        />
        <QuickAction
          icon={Volume2}
          label="Pronunciation"
          onClick={() => navigate('/pronunciation')}
        />
        <QuickAction
          icon={Languages}
          label="Conjugation"
          onClick={() => navigate('/conjugation')}
        />
        <QuickAction
          icon={Landmark}
          label="KNM"
          onClick={() => navigate('/knm')}
        />
        <QuickAction
          icon={ClipboardCheck}
          label="Mock Exam"
          onClick={() => navigate('/exam')}
        />
        <QuickAction
          icon={BookOpen}
          label="Grammar"
          onClick={() => navigate('/grammar')}
        />
      </motion.div>

      {/* Weekly XP Chart */}
      <motion.div
        variants={item}
        className="bg-white rounded-2xl p-4 shadow-sm border border-cream-dark/50 mb-4"
      >
        <h3 className="font-semibold text-sm text-charcoal mb-3">This Week</h3>
        <div className="flex items-end justify-between gap-1 h-20">
          {(() => {
            const dayNames = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
            const today = new Date().getDay();
            return Array.from({ length: 7 }, (_, i) => dayNames[(today - 6 + i + 7) % 7]);
          })().map((day, i) => {
            const xp = weeklyXP[i] || 0;
            const maxXP = Math.max(...weeklyXP, 1);
            const height = (xp / maxXP) * 100;
            const isToday = i === weeklyXP.length - 1;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end justify-center" style={{ height: '60px' }}>
                  <motion.div
                    className={`w-full max-w-[24px] rounded-t-md ${
                      isToday ? 'bg-primary' : 'bg-cream-dark'
                    }`}
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(height, 4)}%` }}
                    transition={{ duration: 0.5, delay: i * 0.05 }}
                  />
                </div>
                <span
                  className={`text-[10px] ${
                    isToday ? 'text-primary font-bold' : 'text-charcoal/40'
                  }`}
                >
                  {day}
                </span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Daily Idiom */}
      {dailyIdiom && (
        <motion.div
          variants={item}
          className="bg-white rounded-2xl p-4 shadow-sm border border-cream-dark/50"
        >
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={16} className="text-primary" />
            <h3 className="font-semibold text-sm text-charcoal">Dutch Saying of the Day</h3>
          </div>
          <p className="font-display text-lg text-charcoal italic">
            &ldquo;{dailyIdiom.dutch}&rdquo;
          </p>
          <p className="text-sm text-charcoal/60 mt-1">{dailyIdiom.meaning}</p>
          {dailyIdiom.english && (
            <p className="text-xs text-charcoal/40 mt-1">
              Literally: {dailyIdiom.english}
            </p>
          )}
        </motion.div>
      )}

      {/* Stats summary */}
      <motion.button
        variants={item}
        onClick={() => navigate('/words')}
        className="mt-4 w-full text-center text-xs text-charcoal/40 hover:text-primary transition-colors"
      >
        {totalWordsLearned} words learned →
      </motion.button>
    </motion.div>
  );
}

function GoalItem({ icon: Icon, label, done }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-7 h-7 rounded-lg flex items-center justify-center ${
          done ? 'bg-success/10' : 'bg-cream-dark'
        }`}
      >
        <Icon
          size={14}
          className={done ? 'text-success' : 'text-charcoal/40'}
        />
      </div>
      <span
        className={`text-sm ${
          done ? 'text-charcoal/40 line-through' : 'text-charcoal'
        }`}
      >
        {label}
      </span>
      {done && <span className="ml-auto text-success text-xs">✓</span>}
    </div>
  );
}

function QuickAction({ icon: Icon, label, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      className="bg-white rounded-2xl p-3 shadow-sm border border-cream-dark/50 flex flex-col items-center gap-2"
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
    >
      <Icon size={20} className="text-charcoal/70" />
      <span className="text-xs font-medium text-charcoal/70">{label}</span>
    </motion.button>
  );
}
