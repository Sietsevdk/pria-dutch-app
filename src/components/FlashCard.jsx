import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, RotateCcw, ThumbsDown, Zap } from 'lucide-react';
import { useSpeech } from '../hooks/useSpeech';
import useSRS from '../hooks/useSRS';
import { dutchWithArticle } from '../utils/dutch';

/**
 * FlashCard - A flip card component for vocabulary review.
 * Features: flip animation, audio (normal + slow), mastery indicator, SRS rating.
 */
export default function FlashCard({ word, onRate }) {
  // Early return for missing word
  if (!word) return null;

  const [isFlipped, setIsFlipped] = useState(false);
  const { speak, isSpeaking } = useSpeech();
  const getItemStats = useSRS((s) => s.getItemStats);

  // Reset flip state when word changes
  useEffect(() => {
    setIsFlipped(false);
  }, [word?.id]);

  const srsStats = word?.id ? getItemStats(word.id) : null;

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const handleSpeak = useCallback(
    (e, slow = false) => {
      e.stopPropagation();
      speak(dutchWithArticle(word), { slow });
    },
    [speak, word]
  );

  const handleRate = useCallback(
    (rating) => {
      if (onRate) onRate(rating);
    },
    [onRate]
  );

  const dutchDisplay = dutchWithArticle(word);

  // Mastery level based on SRS data — memoized
  const mastery = useMemo(() => {
    if (!srsStats) return { label: 'New', color: 'bg-info/20 text-info', level: 0 };
    const reps = srsStats.repetitions || 0;
    const ease = srsStats.easeFactor || 2.5;
    if (reps >= 5 && ease >= 2.3) return { label: 'Mastered', color: 'bg-success/20 text-success', level: 4 };
    if (reps >= 3) return { label: 'Reviewing', color: 'bg-primary/20 text-primary', level: 3 };
    if (reps >= 1) return { label: 'Learning', color: 'bg-warning/20 text-warning', level: 2 };
    return { label: 'New', color: 'bg-info/20 text-info', level: 1 };
  }, [srsStats]);

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Mastery badge */}
      <div className="flex justify-center mb-3">
        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${mastery.color}`}>
          {mastery.label}
        </span>
      </div>

      {/* Card */}
      <div
        className="flip-card w-full cursor-pointer"
        style={{ minHeight: '280px' }}
        onClick={handleFlip}
        role="button"
        tabIndex={0}
        aria-label={
          isFlipped
            ? `English translation: ${word.english}. Tap to flip back.`
            : `Dutch word: ${dutchDisplay}. Tap to flip.`
        }
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleFlip();
          }
        }}
      >
        <div
          className={`flip-card-inner relative w-full ${isFlipped ? 'flipped' : ''}`}
          style={{ minHeight: '280px' }}
        >
          {/* Front */}
          <div className="flip-card-front absolute inset-0 bg-white rounded-2xl shadow-lg border border-cream-dark/30 p-8 flex flex-col items-center justify-center">
            {/* Audio buttons row */}
            <div className="flex items-center gap-2 mb-4">
              <motion.button
                onClick={(e) => handleSpeak(e, false)}
                className={`p-3 rounded-full transition-colors ${
                  isSpeaking
                    ? 'bg-primary text-white'
                    : 'bg-cream text-primary hover:bg-primary/10'
                }`}
                whileTap={{ scale: 0.9 }}
                aria-label="Listen to pronunciation"
              >
                <Volume2 size={24} />
              </motion.button>
              <motion.button
                onClick={(e) => handleSpeak(e, true)}
                className="px-3 py-2 rounded-full bg-cream text-charcoal/60 hover:bg-primary/10 hover:text-primary text-xs font-medium transition-colors"
                whileTap={{ scale: 0.9 }}
                aria-label="Listen slowly"
              >
                Slow
              </motion.button>
            </div>

            <h2 className="font-display text-3xl text-charcoal text-center mb-2">
              {dutchDisplay}
            </h2>

            {word.pronunciation && (
              <p className="text-charcoal-light text-sm mb-4">
                /{word.pronunciation}/
              </p>
            )}

            {word.audioHint && (
              <p className="text-xs text-charcoal-light/60 italic">
                {word.audioHint}
              </p>
            )}

            <p className="text-xs text-charcoal-light/40 mt-6">
              Tap to reveal translation
            </p>
          </div>

          {/* Back */}
          <div className="flip-card-back absolute inset-0 bg-white rounded-2xl shadow-lg border border-cream-dark/30 p-8 flex flex-col items-center justify-center">
            <p className="text-charcoal-light text-sm mb-2 uppercase tracking-wide">
              English
            </p>
            <h2 className="font-display text-2xl text-charcoal text-center mb-4">
              {word.english}
            </h2>

            {word.exampleNL && (
              <div className="w-full bg-cream rounded-xl p-4 mb-2">
                <p className="text-xs text-charcoal/50 mb-1 font-medium">Example:</p>
                <p className="text-sm text-charcoal font-medium">
                  {word.exampleNL}
                </p>
                {word.exampleEN && (
                  <p className="text-xs text-charcoal-light mt-1">
                    {word.exampleEN}
                  </p>
                )}
              </div>
            )}

            {word.plural && (
              <p className="text-xs text-charcoal/50 mt-2">
                Plural: <span className="font-medium">{word.plural}</span>
              </p>
            )}

            <p className="text-xs text-charcoal-light/40 mt-4">
              Tap to flip back
            </p>
          </div>
        </div>
      </div>

      {/* Rating buttons */}
      <AnimatePresence>
        {isFlipped && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.3 }}
            className="space-y-2 mt-6"
          >
            <p className="text-xs text-charcoal/40 text-center">How well did you know this?</p>
            <div className="flex gap-3 justify-center">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => handleRate('again')}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-error/10 text-error font-medium text-sm hover:bg-error/20 transition-colors"
                aria-label="Rate: Again — I didn't know it"
              >
                <ThumbsDown size={16} />
                Again
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => handleRate('good')}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-primary/10 text-primary font-medium text-sm hover:bg-primary/20 transition-colors"
                aria-label="Rate: Good — I remembered"
              >
                <RotateCcw size={16} />
                Good
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => handleRate('easy')}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-success/10 text-success font-medium text-sm hover:bg-success/20 transition-colors"
                aria-label="Rate: Easy — I knew it instantly"
              >
                <Zap size={16} />
                Easy
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
