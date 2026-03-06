import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Shuffle } from 'lucide-react';
import { shuffle } from '../utils/dutch';

/**
 * MatchPairs - Tap-to-match exercise pairing Dutch words with English translations.
 * Left column has shuffled Dutch words, right column has separately shuffled English words.
 */
export default function MatchPairs({ pairs, onComplete }) {
  const shuffledDutch = useMemo(() => shuffle(pairs.map((p) => p.dutch)), [pairs]);
  const shuffledEnglish = useMemo(() => shuffle(pairs.map((p) => p.english)), [pairs]);

  const [selectedDutch, setSelectedDutch] = useState(null);
  const [selectedEnglish, setSelectedEnglish] = useState(null);
  const [matchedPairs, setMatchedPairs] = useState([]); // [{ dutch, english }]
  const [wrongFlash, setWrongFlash] = useState(null); // { dutch, english }
  const [mistakes, setMistakes] = useState(0);

  const isMatched = useCallback(
    (word, lang) => {
      return matchedPairs.some((p) => p[lang] === word);
    },
    [matchedPairs]
  );

  // Check for match when both sides are selected
  useEffect(() => {
    if (selectedDutch === null || selectedEnglish === null) return;

    const correctPair = pairs.find(
      (p) => p.dutch === selectedDutch && p.english === selectedEnglish
    );

    if (correctPair) {
      // Correct match
      setMatchedPairs((prev) => [
        ...prev,
        { dutch: selectedDutch, english: selectedEnglish },
      ]);
      setSelectedDutch(null);
      setSelectedEnglish(null);
    } else {
      // Wrong match
      setWrongFlash({ dutch: selectedDutch, english: selectedEnglish });
      setMistakes((prev) => prev + 1);

      setTimeout(() => {
        setWrongFlash(null);
        setSelectedDutch(null);
        setSelectedEnglish(null);
      }, 600);
    }
  }, [selectedDutch, selectedEnglish, pairs]);

  // Check for completion — use ref to prevent firing multiple times
  const completedRef = useRef(false);
  useEffect(() => {
    if (matchedPairs.length === pairs.length && pairs.length > 0 && !completedRef.current) {
      completedRef.current = true;
      if (onComplete) {
        setTimeout(() => {
          onComplete(mistakes);
        }, 800);
      }
    }
  }, [matchedPairs.length, pairs.length, mistakes, onComplete]);

  const handleDutchClick = useCallback(
    (word) => {
      if (isMatched(word, 'dutch') || wrongFlash) return;
      setSelectedDutch((prev) => (prev === word ? null : word));
    },
    [isMatched, wrongFlash]
  );

  const handleEnglishClick = useCallback(
    (word) => {
      if (isMatched(word, 'english') || wrongFlash) return;
      setSelectedEnglish((prev) => (prev === word ? null : word));
    },
    [isMatched, wrongFlash]
  );

  const getDutchStyle = (word) => {
    if (isMatched(word, 'dutch')) {
      return 'bg-success/10 border-success/30 text-success opacity-60';
    }
    if (wrongFlash?.dutch === word) {
      return 'bg-error/10 border-error text-error';
    }
    if (selectedDutch === word) {
      return 'bg-primary/10 border-primary text-primary';
    }
    return 'bg-white border-cream-dark/40 text-charcoal hover:border-primary/40';
  };

  const getEnglishStyle = (word) => {
    if (isMatched(word, 'english')) {
      return 'bg-success/10 border-success/30 text-success opacity-60';
    }
    if (wrongFlash?.english === word) {
      return 'bg-error/10 border-error text-error';
    }
    if (selectedEnglish === word) {
      return 'bg-primary/10 border-primary text-primary';
    }
    return 'bg-white border-cream-dark/40 text-charcoal hover:border-primary/40';
  };

  const allMatched = matchedPairs.length === pairs.length;

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-charcoal-light/60 uppercase tracking-wide">
          Match the pairs
        </p>
        <p className="text-xs text-charcoal-light">
          {matchedPairs.length}/{pairs.length} matched
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-cream-dark/30 rounded-full mb-6 overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          initial={{ width: 0 }}
          animate={{
            width: `${(matchedPairs.length / pairs.length) * 100}%`,
          }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Columns */}
      <div className="grid grid-cols-2 gap-3" role="group" aria-label="Match Dutch words with English translations">
        {/* Dutch column */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-charcoal-light/50 text-center mb-2">
            Nederlands
          </p>
          {shuffledDutch.map((word, index) => (
            <motion.button
              key={`dutch-${word}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              whileTap={!isMatched(word, 'dutch') ? { scale: 0.97 } : {}}
              onClick={() => handleDutchClick(word)}
              disabled={isMatched(word, 'dutch')}
              className={`w-full px-4 py-3 rounded-xl border-2 font-medium text-sm text-center transition-colors ${getDutchStyle(word)}`}
              aria-label={`Dutch: ${word}`}
              aria-pressed={selectedDutch === word}
            >
              <span className="flex items-center justify-center gap-1.5">
                {word}
                {isMatched(word, 'dutch') && (
                  <Check size={14} className="text-success" />
                )}
              </span>
            </motion.button>
          ))}
        </div>

        {/* English column */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-charcoal-light/50 text-center mb-2">
            English
          </p>
          {shuffledEnglish.map((word, index) => (
            <motion.button
              key={`english-${word}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              whileTap={!isMatched(word, 'english') ? { scale: 0.97 } : {}}
              onClick={() => handleEnglishClick(word)}
              disabled={isMatched(word, 'english')}
              className={`w-full px-4 py-3 rounded-xl border-2 font-medium text-sm text-center transition-colors ${getEnglishStyle(word)}`}
              aria-label={`English: ${word}`}
              aria-pressed={selectedEnglish === word}
            >
              <span className="flex items-center justify-center gap-1.5">
                {word}
                {isMatched(word, 'english') && (
                  <Check size={14} className="text-success" />
                )}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Completion message */}
      <AnimatePresence>
        {allMatched && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="mt-8 p-6 bg-success/10 rounded-2xl text-center"
            role="alert"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.2 }}
            >
              <Check size={40} className="text-success mx-auto mb-2" />
            </motion.div>
            <p className="font-display text-xl text-success">
              Alle paren gevonden!
            </p>
            <p className="text-sm text-charcoal-light mt-1">
              {mistakes === 0
                ? 'Perfect! No mistakes!'
                : `Completed with ${mistakes} mistake${mistakes > 1 ? 's' : ''}`}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
