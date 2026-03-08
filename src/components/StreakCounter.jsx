import { Flame } from 'lucide-react';
import { motion } from 'framer-motion';
import useStreak from '../hooks/useStreak';

export default function StreakCounter({ compact = false }) {
  const currentStreak = useStreak((s) => s.currentStreak);
  const completedToday = useStreak((s) => s.completedToday);

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <Flame
          size={18}
          className={completedToday ? 'text-primary fill-primary' : 'text-charcoal/30'}
        />
        <span className="text-sm font-bold text-charcoal">{currentStreak}</span>
      </div>
    );
  }

  return (
    <motion.div
      className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-sm border border-cream-dark/50"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="relative">
        <motion.div
          animate={
            !completedToday
              ? { scale: [1, 1.2, 1] }
              : {}
          }
          transition={{ duration: 0.5, repeat: !completedToday ? Infinity : 0, repeatDelay: 3 }}
        >
          <Flame
            size={32}
            className={completedToday ? 'text-primary fill-primary' : 'text-charcoal/30'}
          />
        </motion.div>
        {!completedToday && currentStreak > 0 && (
          <motion.div
            className="absolute -top-1 -right-1 w-3 h-3 bg-warning rounded-full"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </div>
      <div>
        <div className="text-2xl font-bold text-charcoal leading-none">
          {currentStreak}
        </div>
        <div className="text-xs text-charcoal/60">
          {currentStreak === 1 ? 'day' : 'days'} streak
        </div>
      </div>
      {!completedToday && currentStreak > 0 && (
        <div className="ml-auto text-xs text-warning font-medium">
          Keep it going!
        </div>
      )}
    </motion.div>
  );
}
