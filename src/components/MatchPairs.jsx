import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Shuffle } from 'lucide-react';
import { shuffle } from '../utils/dutch';

/**
 * MatchPairs - Tap-to-match exercise pairing Dutch words with English translations.
 * Left column has shuffled Dutch words, right column has separately shuffled English words.
 * Uses pair indices instead of string matching to handle duplicate words correctly.
 */
export default function MatchPairs({ pairs, onComplete }) {
  const shuffledDutch = useMemo(
    () => shuffle(pairs.map((p, i) => ({ word: p.dutch, pairIndex: i }))),
    [pairs]
  );
  const shuffledEnglish = useMemo(
    () => shuffle(pairs.map((p, i) => ({ word: p.english, pairIndex: i }))),
    [pairs]
  );

  const [selectedDutch, setSelectedDutch] = useState(null); // index in shuffledDutch
  const [selectedEnglish, setSelectedEnglish] = useState(null); // index in shuffledEnglish
  const [matchedPairIndices, setMatchedPairIndices] = useState([]); // matched pair indices from original pairs
  const [wrongFlash, setWrongFlash] = useState(null); // { dutchIdx, englishIdx }
  const [mistakes, setMistakes] = useState(0);
  const wrongFlashTimerRef = useRef(null);
  const completionTimerRef = useRef(null);
  const completedRef = useRef(false);

  useEffect(() => {
    return () => {
      if (wrongFlashTimerRef.current) clearTimeout(wrongFlashTimerRef.current);
      if (completionTimerRef.current) clearTimeout(completionTimerRef.current);
    };
  }, []);

  // Reset completedRef when pairs changes
  useEffect(() => {
    completedRef.current = false;
  }, [pairs]);

  const isDutchMatched = useCallback(
    (shuffledIdx) => {
      return matchedPairIndices.includes(shuffledDutch[shuffledIdx].pairIndex);
    },
    [matchedPairIndices, shuffledDutch]
  );

  const isEnglishMatched = useCallback(
    (shuffledIdx) => {
      return matchedPairIndices.includes(shuffledEnglish[shuffledIdx].pairIndex);
    },
    [matchedPairIndices, shuffledEnglish]
  );

  // Check for match when both sides are selected
  useEffect(() => {
    if (selectedDutch === null || selectedEnglish === null) return;

    const dutchItem = shuffledDutch[selectedDutch];
    const englishItem = shuffledEnglish[selectedEnglish];

    if (dutchItem.pairIndex === englishItem.pairIndex) {
      // Correct match
      setMatchedPairIndices((prev) => [...prev, dutchItem.pairIndex]);
      setSelectedDutch(null);
      setSelectedEnglish(null);
    } else {
      // Wrong match
      setWrongFlash({ dutchIdx: selectedDutch, englishIdx: selectedEnglish });
      setMistakes((prev) => prev + 1);

      wrongFlashTimerRef.current = setTimeout(() => {
        setWrongFlash(null);
        setSelectedDutch(null);
        setSelectedEnglish(null);
      }, 600);
    }
  }, [selectedDutch, selectedEnglish, shuffledDutch, shuffledEnglish]);

  // Check for completion
  useEffect(() => {
    if (matchedPairIndices.length === pairs.length && pairs.length > 0 && !completedRef.current) {
      completedRef.current = true;
      if (onComplete) {
        completionTimerRef.current = setTimeout(() => {
          onComplete(mistakes);
        }, 800);
      }
    }
  }, [matchedPairIndices.length, pairs.length, mistakes, onComplete]);

  const handleDutchClick = useCallback(
    (shuffledIdx) => {
      if (isDutchMatched(shuffledIdx) || wrongFlash) return;
      setSelectedDutch((prev) => (prev === shuffledIdx ? null : shuffledIdx));
    },
    [isDutchMatched, wrongFlash]
  );

  const handleEnglishClick = useCallback(
    (shuffledIdx) => {
      if (isEnglishMatched(shuffledIdx) || wrongFlash) return;
      setSelectedEnglish((prev) => (prev === shuffledIdx ? null : shuffledIdx));
    },
    [isEnglishMatched, wrongFlash]
  );

  const getDutchStyle = (shuffledIdx) => {
    if (isDutchMatched(shuffledIdx)) {
      return 'bg-success/10 border-success/30 text-success opacity-60';
    }
    if (wrongFlash?.dutchIdx === shuffledIdx) {
      return 'bg-error/10 border-error text-error';
    }
    if (selectedDutch === shuffledIdx) {
      return 'bg-primary/10 border-primary text-primary';
    }
    return 'bg-white border-cream-dark/40 text-charcoal hover:border-primary/40';
  };

  const getEnglishStyle = (shuffledIdx) => {
    if (isEnglishMatched(shuffledIdx)) {
      return 'bg-success/10 border-success/30 text-success opacity-60';
    }
    if (wrongFlash?.englishIdx === shuffledIdx) {
      return 'bg-error/10 border-error text-error';
    }
    if (selectedEnglish === shuffledIdx) {
      return 'bg-primary/10 border-primary text-primary';
    }
    return 'bg-white border-cream-dark/40 text-charcoal hover:border-primary/40';
  };

  const allMatched = matchedPairIndices.length === pairs.length;

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-charcoal-light/60 uppercase tracking-wide">
          Match the pairs
        </p>
        <p className="text-xs text-charcoal-light">
          {matchedPairIndices.length}/{pairs.length} matched
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-cream-dark/30 rounded-full mb-6 overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          initial={{ width: 0 }}
          animate={{
            width: `${pairs.length > 0 ? (matchedPairIndices.length / pairs.length) * 100 : 0}%`,
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
          {shuffledDutch.map((item, index) => (
            <motion.button
              key={`dutch-${index}-${item.word}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              whileTap={!isDutchMatched(index) ? { scale: 0.97 } : {}}
              onClick={() => handleDutchClick(index)}
              disabled={isDutchMatched(index)}
              className={`w-full px-4 py-3 rounded-xl border-2 font-medium text-sm text-center transition-colors ${getDutchStyle(index)}`}
              aria-label={`Dutch: ${item.word}`}
              aria-pressed={selectedDutch === index}
            >
              <span className="flex items-center justify-center gap-1.5">
                {item.word}
                {isDutchMatched(index) && (
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
          {shuffledEnglish.map((item, index) => (
            <motion.button
              key={`english-${index}-${item.word}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              whileTap={!isEnglishMatched(index) ? { scale: 0.97 } : {}}
              onClick={() => handleEnglishClick(index)}
              disabled={isEnglishMatched(index)}
              className={`w-full px-4 py-3 rounded-xl border-2 font-medium text-sm text-center transition-colors ${getEnglishStyle(index)}`}
              aria-label={`English: ${item.word}`}
              aria-pressed={selectedEnglish === index}
            >
              <span className="flex items-center justify-center gap-1.5">
                {item.word}
                {isEnglishMatched(index) && (
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
