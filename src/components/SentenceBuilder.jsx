import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, RotateCcw, ArrowRight } from 'lucide-react';

/**
 * SentenceBuilder - Word-order exercise for Dutch V2 rule practice.
 * Users tap scrambled word chips to build a sentence in correct order.
 */
export default function SentenceBuilder({
  english,
  words,
  correctOrder,
  onAnswer,
}) {
  const [placed, setPlaced] = useState([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const feedbackTimerRef = useRef(null);

  useEffect(() => {
    return () => { if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current); };
  }, []);

  // Words still available (not yet placed)
  const available = words.filter((_, i) => !placed.includes(i));

  const handlePlaceWord = useCallback(
    (wordIndex) => {
      if (hasSubmitted) return;
      setPlaced((prev) => [...prev, wordIndex]);
    },
    [hasSubmitted]
  );

  const handleRemoveWord = useCallback(
    (positionIndex) => {
      if (hasSubmitted) return;
      setPlaced((prev) => prev.filter((_, i) => i !== positionIndex));
    },
    [hasSubmitted]
  );

  const handleReset = useCallback(() => {
    setPlaced([]);
    setHasSubmitted(false);
    setIsCorrect(false);
  }, []);

  const handleSubmit = useCallback(() => {
    if (placed.length !== words.length || hasSubmitted) return;

    const builtSentence = placed.map((i) => words[i]);
    const correct =
      builtSentence.join(' ').toLowerCase() ===
      correctOrder.join(' ').toLowerCase();

    setIsCorrect(correct);
    setHasSubmitted(true);

    if (onAnswer) {
      feedbackTimerRef.current = setTimeout(() => {
        onAnswer(correct);
      }, 1500);
    }
  }, [placed, words, correctOrder, hasSubmitted, onAnswer]);

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Instruction */}
      <p className="text-xs text-charcoal-light/60 uppercase tracking-wide mb-2 text-center">
        Build the Dutch sentence
      </p>

      {/* English sentence */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border border-cream-dark/30 p-4 mb-6 text-center"
      >
        <p className="text-charcoal-light text-sm mb-1">Translate:</p>
        <p className="font-display text-xl text-charcoal">{english}</p>
      </motion.div>

      {/* Sentence building area */}
      <div
        className={`min-h-[64px] p-4 mb-6 rounded-xl border-2 border-dashed transition-colors ${
          hasSubmitted
            ? isCorrect
              ? 'border-success/50 bg-success/5'
              : 'border-error/50 bg-error/5'
            : placed.length > 0
              ? 'border-primary/30 bg-white'
              : 'border-cream-dark/30 bg-cream/50'
        }`}
        aria-label="Sentence building area"
      >
        {placed.length === 0 ? (
          <p className="text-charcoal-light/30 text-sm text-center py-2">
            Tap words below to build the sentence
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            <AnimatePresence mode="popLayout">
              {placed.map((wordIndex, positionIndex) => (
                <motion.button
                  key={`placed-${positionIndex}-${wordIndex}`}
                  layout
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  onClick={() => handleRemoveWord(positionIndex)}
                  disabled={hasSubmitted}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    hasSubmitted
                      ? isCorrect
                        ? 'bg-success/10 text-success border border-success/30'
                        : 'bg-error/10 text-error border border-error/30'
                      : 'bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20'
                  }`}
                  aria-label={`Remove ${words[wordIndex]}`}
                >
                  {words[wordIndex]}
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Available words */}
      {!hasSubmitted && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="flex flex-wrap gap-2 justify-center mb-6"
          role="group"
          aria-label="Available words"
        >
          {words.map((word, index) => {
            const isPlaced = placed.includes(index);
            return (
              <motion.button
                key={`available-${index}`}
                layout
                whileTap={!isPlaced ? { scale: 0.9 } : {}}
                onClick={() => handlePlaceWord(index)}
                disabled={isPlaced}
                className={`px-4 py-2 rounded-lg font-medium text-sm border-2 transition-all ${
                  isPlaced
                    ? 'border-cream-dark/20 text-charcoal-light/20 bg-cream cursor-not-allowed'
                    : 'border-cream-dark/40 text-charcoal bg-white hover:border-primary/40 hover:bg-primary/5'
                }`}
                aria-label={`Place word: ${word}`}
                aria-hidden={isPlaced}
              >
                {word}
              </motion.button>
            );
          })}
        </motion.div>
      )}

      {/* Action buttons */}
      {!hasSubmitted && (
        <div className="flex gap-3">
          {/* Reset */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleReset}
            disabled={placed.length === 0}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
              placed.length > 0
                ? 'bg-cream text-charcoal-light hover:bg-cream-dark'
                : 'bg-cream text-charcoal-light/30 cursor-not-allowed'
            }`}
            aria-label="Reset sentence"
          >
            <RotateCcw size={16} />
            Reset
          </motion.button>

          {/* Submit */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleSubmit}
            disabled={placed.length !== words.length}
            className={`flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-medium text-sm transition-colors ${
              placed.length === words.length
                ? 'bg-primary text-white hover:bg-primary-dark'
                : 'bg-cream text-charcoal-light/40 cursor-not-allowed'
            }`}
            aria-label="Check sentence"
          >
            <Check size={16} />
            Check
          </motion.button>
        </div>
      )}

      {/* Feedback */}
      <AnimatePresence>
        {hasSubmitted && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 space-y-3"
          >
            <div
              className={`p-4 rounded-xl ${
                isCorrect ? 'bg-success/10' : 'bg-error/10'
              }`}
              role="alert"
            >
              <div className="flex items-center gap-2 mb-1">
                {isCorrect ? (
                  <Check size={18} className="text-success" />
                ) : (
                  <X size={18} className="text-error" />
                )}
                <span
                  className={`font-medium ${isCorrect ? 'text-success' : 'text-error'}`}
                >
                  {isCorrect
                    ? 'Perfect! De zin klopt!'
                    : 'Not quite the right order.'}
                </span>
              </div>

              {!isCorrect && (
                <div className="mt-3 p-3 bg-white/50 rounded-lg">
                  <p className="text-xs text-charcoal-light/60 mb-1">
                    Correct order:
                  </p>
                  <p className="text-charcoal font-medium flex items-center gap-1 flex-wrap">
                    {correctOrder.map((word, i) => (
                      <span key={i} className="inline-flex items-center gap-1">
                        <span className="px-2 py-0.5 bg-success/10 text-success rounded text-sm">
                          {word}
                        </span>
                        {i < correctOrder.length - 1 && (
                          <ArrowRight
                            size={12}
                            className="text-charcoal-light/30"
                          />
                        )}
                      </span>
                    ))}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
