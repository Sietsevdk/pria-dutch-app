import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Target, BookOpen, Sparkles, ArrowRight, RotateCcw } from 'lucide-react';

/**
 * LessonComplete - End-of-lesson celebration screen.
 * Shows stats, confetti-like particle animations, and action buttons.
 */

// Confetti particle component
function Particle({ delay, x, color }) {
  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        width: Math.random() * 8 + 4,
        height: Math.random() * 8 + 4,
        backgroundColor: color,
        left: `${x}%`,
        top: '-5%',
      }}
      initial={{ y: 0, opacity: 1, rotate: 0 }}
      animate={{
        y: ['0vh', '100vh'],
        opacity: [1, 1, 0],
        rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)],
        x: [0, (Math.random() - 0.5) * 100],
      }}
      transition={{
        duration: Math.random() * 2 + 2,
        delay,
        ease: 'easeIn',
      }}
    />
  );
}

export default function LessonComplete({
  xpEarned,
  accuracy,
  wordsLearned,
  mistakeCount,
  onContinue,
  onReviewMistakes,
}) {
  const isPerfect = mistakeCount === 0;

  // Heading based on performance
  const heading = isPerfect ? 'Geweldig!' : accuracy >= 80 ? 'Goed gedaan!' : 'Les voltooid!';
  const subheading = isPerfect
    ? 'A perfect score!'
    : accuracy >= 80
      ? 'Great work!'
      : 'Keep practicing!';

  // Generate confetti particles
  const particles = useMemo(() => {
    const colors = ['#FF6B2B', '#7FB069', '#F5A623', '#5B9BD5', '#E85D5D', '#FF8F5C'];
    return Array.from({ length: 30 }, (_, i) => ({
      id: i,
      delay: Math.random() * 0.8,
      x: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
  }, []);

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.4,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: 'spring', stiffness: 300, damping: 20 },
    },
  };

  const stats = [
    {
      icon: <Sparkles size={20} className="text-primary" />,
      label: 'XP Earned',
      value: `+${xpEarned}`,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      icon: <Target size={20} className="text-success" />,
      label: 'Accuracy',
      value: `${accuracy}%`,
      color: 'text-success',
      bg: 'bg-success/10',
    },
    {
      icon: <BookOpen size={20} className="text-info" />,
      label: 'Words Learned',
      value: wordsLearned,
      color: 'text-info',
      bg: 'bg-info/10',
    },
  ];

  return (
    <div className="relative w-full max-w-md mx-auto text-center overflow-hidden py-8">
      {/* Confetti particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {particles.map((p) => (
          <Particle key={p.id} delay={p.delay} x={p.x} color={p.color} />
        ))}
      </div>

      {/* Content */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10"
      >
        {/* Trophy animation */}
        <motion.div
          initial={{ scale: 0, rotate: -15 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: 'spring',
            stiffness: 200,
            damping: 12,
            delay: 0.1,
          }}
          className="mb-6"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10">
            <Trophy size={40} className="text-primary" />
          </div>
        </motion.div>

        {/* Heading */}
        <motion.div variants={itemVariants}>
          <h1 className="font-display text-4xl text-charcoal mb-1">
            {heading}
          </h1>
          <p className="text-charcoal-light">{subheading}</p>
        </motion.div>

        {/* Perfect badge */}
        {isPerfect && (
          <motion.div
            variants={itemVariants}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-success/10 rounded-full"
          >
            <Sparkles size={16} className="text-success" />
            <span className="text-sm font-medium text-success">
              Perfect! Geen fouten!
            </span>
          </motion.div>
        )}

        {/* Stats cards */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-3 gap-3 mt-8 mb-8"
        >
          {stats.map((stat) => (
            <motion.div
              key={stat.label}
              variants={itemVariants}
              className={`${stat.bg} rounded-2xl p-4`}
            >
              <div className="flex justify-center mb-2">{stat.icon}</div>
              <p className={`text-2xl font-display font-bold ${stat.color}`}>
                {stat.value}
              </p>
              <p className="text-xs text-charcoal-light mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Action buttons */}
        <motion.div variants={itemVariants} className="space-y-3">
          {/* Continue button */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onContinue}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-primary text-white font-medium hover:bg-primary-dark transition-colors shadow-sm"
            aria-label="Continue to next lesson"
          >
            Continue
            <ArrowRight size={18} />
          </motion.button>

          {/* Review mistakes button */}
          {mistakeCount > 0 && onReviewMistakes && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={onReviewMistakes}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-cream text-charcoal-light font-medium hover:bg-cream-dark transition-colors"
              aria-label={`Review ${mistakeCount} mistakes`}
            >
              <RotateCcw size={16} />
              Review {mistakeCount} mistake{mistakeCount > 1 ? 's' : ''}
            </motion.button>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
