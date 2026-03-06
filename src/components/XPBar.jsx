import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { getLevel } from '../utils/xp';
import useProgress from '../hooks/useProgress';

export default function XPBar({ showDetails = true }) {
  const totalXP = useProgress((s) => s.totalXP);
  const todayXP = useProgress((s) => s.todayXP);
  const level = getLevel(totalXP);

  return (
    <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-cream-dark/50">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{level.icon}</span>
          <span className="font-semibold text-sm text-charcoal">{level.name}</span>
        </div>
        {showDetails && (
          <div className="flex items-center gap-1 text-xs text-charcoal/60">
            <Star size={12} className="text-primary fill-primary" />
            <span className="font-medium">{totalXP} XP</span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-2.5 bg-cream-dark rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${level.progress * 100}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>

      {showDetails && (
        <div className="flex justify-between items-center mt-1.5">
          <span className="text-[10px] text-charcoal/50">
            {level.xpInLevel} / {level.xpForNextLevel || '—'} XP
          </span>
          {level.nextLevel && (
            <span className="text-[10px] text-charcoal/50">
              Next: {level.nextLevel.name} {level.nextLevel.icon}
            </span>
          )}
        </div>
      )}

      {showDetails && todayXP > 0 && (
        <div className="mt-2 pt-2 border-t border-cream-dark/50 flex items-center gap-1">
          <span className="text-xs text-success font-medium">+{todayXP} XP today</span>
        </div>
      )}
    </div>
  );
}
