import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';

/**
 * MultipleChoice - Quiz component with animated options.
 * Supports dutch-to-english and english-to-dutch question types.
 */
export default function MultipleChoice({
  question,
  options,
  correctAnswer,
  onAnswer,
  type = 'dutch-to-english',
}) {
  const [selected, setSelected] = useState(null);
  const [hasAnswered, setHasAnswered] = useState(false);

  const isCorrect = selected === correctAnswer;

  const handleSelect = useCallback(
    (option) => {
      if (hasAnswered) return;
      setSelected(option);
      setHasAnswered(true);
      if (onAnswer) {
        // Brief delay so user sees the feedback
        setTimeout(() => {
          onAnswer(option === correctAnswer);
        }, 1200);
      }
    },
    [hasAnswered, correctAnswer, onAnswer]
  );

  const getOptionStyle = (option) => {
    if (!hasAnswered) {
      return 'bg-white border-cream-dark/40 text-charcoal hover:border-primary/50 hover:bg-primary/5 active:bg-primary/10';
    }
    if (option === correctAnswer) {
      return 'bg-success/10 border-success text-success';
    }
    if (option === selected && option !== correctAnswer) {
      return 'bg-error/10 border-error text-error';
    }
    return 'bg-white border-cream-dark/20 text-charcoal-light/50';
  };

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const optionVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Question type label */}
      <p className="text-xs text-charcoal-light/60 uppercase tracking-wide mb-2 text-center">
        {type === 'dutch-to-english'
          ? 'What does this mean?'
          : 'How do you say this in Dutch?'}
      </p>

      {/* Question */}
      <motion.h2
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="font-display text-2xl text-charcoal text-center mb-8"
      >
        {question}
      </motion.h2>

      {/* Options grid */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        role="radiogroup"
        aria-label="Answer options"
      >
        {options.map((option, index) => (
          <motion.button
            key={option}
            variants={optionVariants}
            whileTap={!hasAnswered ? { scale: 0.97 } : {}}
            onClick={() => handleSelect(option)}
            disabled={hasAnswered}
            className={`relative flex items-center justify-between px-5 py-4 rounded-xl border-2 font-medium text-left transition-colors ${getOptionStyle(option)}`}
            role="radio"
            aria-checked={selected === option}
            aria-label={option}
          >
            <span>{option}</span>
            {hasAnswered && option === correctAnswer && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              >
                <Check size={18} className="text-success" />
              </motion.span>
            )}
            {hasAnswered &&
              option === selected &&
              option !== correctAnswer && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                >
                  <X size={18} className="text-error" />
                </motion.span>
              )}
          </motion.button>
        ))}
      </motion.div>

      {/* Feedback area */}
      {hasAnswered && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`mt-6 p-4 rounded-xl text-center text-sm font-medium ${
            isCorrect
              ? 'bg-success/10 text-success'
              : 'bg-error/10 text-error'
          }`}
          role="alert"
        >
          {isCorrect ? (
            <p>Correct! Goed gedaan!</p>
          ) : (
            <p>
              Not quite. The correct answer is{' '}
              <span className="font-bold">{correctAnswer}</span>
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}
