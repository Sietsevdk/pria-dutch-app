import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Check, Trophy, Target, Sparkles, Send } from 'lucide-react';
import FlashCard from './FlashCard';
import MultipleChoice from './MultipleChoice';
import useSRS from '../hooks/useSRS';
import useProgress from '../hooks/useProgress';
import { shuffle, checkAnswer, dutchWithArticle } from '../utils/dutch';

// We need to load vocabulary data to get word details
const vocabModules = import.meta.glob('../data/vocabulary/*.json', { eager: true });
const allVocab = {};
Object.values(vocabModules).forEach((mod) => {
  const data = mod.default || mod;
  if (data.words) {
    data.words.forEach((w) => {
      allVocab[w.id] = w;
    });
  }
});

// Review modes cycle: flashcard → quiz → typing → flashcard...
const REVIEW_MODES = ['flashcard', 'quiz', 'typing'];

export default function ReviewSession({ onComplete }) {
  const getReviewSessionItems = useSRS((s) => s.getReviewSessionItems);
  const reviewItem = useSRS((s) => s.reviewItem);
  const addXP = useProgress((s) => s.addXP);
  const completeReviewGoal = useProgress((s) => s.completeReviewGoal);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [modeIndex, setModeIndex] = useState(0);
  const [results, setResults] = useState({ correct: 0, total: 0, hardWords: [] });
  const [isComplete, setIsComplete] = useState(false);

  const reviewMode = REVIEW_MODES[modeIndex % REVIEW_MODES.length];

  // Snapshot items at session start — use SRS batching with anti-annoyance filter
  const [items] = useState(() => {
    const sessionItems = getReviewSessionItems(20);
    return sessionItems
      .filter((item) => allVocab[item.id])
      .map((item) => ({
        ...item,
        word: allVocab[item.id],
      }));
  });

  const currentItem = items[currentIndex];

  const handleRate = useCallback((rating) => {
    if (!currentItem) return;
    reviewItem(currentItem.id, rating);

    const isCorrect = rating !== 'again';
    setResults((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
      hardWords: isCorrect ? prev.hardWords : [...prev.hardWords, currentItem.word],
    }));

    if (isCorrect) {
      addXP(10);
    }

    if (currentIndex + 1 >= items.length) {
      setIsComplete(true);
      addXP(30); // Review session bonus
      completeReviewGoal();
      return;
    }

    setCurrentIndex((i) => i + 1);
    setModeIndex((i) => i + 1);
  }, [currentItem, currentIndex, items.length, reviewItem, addXP, completeReviewGoal]);

  const handleQuizAnswer = useCallback((isCorrect) => {
    handleRate(isCorrect ? 'good' : 'again');
  }, [handleRate]);

  // Generate quiz options — must be before early returns to respect Rules of Hooks
  const quizOptions = useMemo(() => {
    if (!currentItem) return [];
    const otherWords = [...new Set(
      Object.values(allVocab)
        .filter((w) => w.id !== currentItem.word.id && w.english !== currentItem.word.english)
        .map((w) => w.english)
    )];
    const wrongOptions = shuffle(otherWords).slice(0, 3);
    return shuffle([currentItem.word.english, ...wrongOptions]);
  }, [currentItem]);

  if (items.length === 0) {
    return (
      <div className="text-center py-12 px-6">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="font-display text-2xl font-semibold text-charcoal mb-2">
          You're all caught up!
        </h2>
        <p className="text-charcoal/60 mb-2">
          No words to review right now. Come back tomorrow!
        </p>
        <p className="text-sm text-charcoal/40">
          Meanwhile, try learning new words in Practice or Lessons.
        </p>
      </div>
    );
  }

  if (isComplete) {
    const accuracy = results.total > 0 ? Math.round((results.correct / results.total) * 100) : 100;
    const isPerfect = results.correct === results.total;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-8 px-6"
      >
        <motion.div
          initial={{ scale: 0, rotate: -15 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 12 }}
          className="mb-4"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
            <Trophy size={32} className="text-primary" />
          </div>
        </motion.div>

        <h2 className="font-display text-2xl font-semibold text-charcoal mb-1">
          {isPerfect ? 'Geweldig!' : accuracy >= 80 ? 'Goed gedaan!' : 'Review Complete!'}
        </h2>
        <p className="text-sm text-charcoal/60 mb-6">
          {isPerfect ? 'Perfect session!' : accuracy >= 80 ? 'Great work!' : 'Keep practicing!'}
        </p>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-success/10 rounded-2xl p-3">
            <div className="flex justify-center mb-1"><Target size={18} className="text-success" /></div>
            <p className="text-xl font-bold text-success">{accuracy}%</p>
            <p className="text-[10px] text-charcoal/50">Accuracy</p>
          </div>
          <div className="bg-primary/10 rounded-2xl p-3">
            <div className="flex justify-center mb-1"><Sparkles size={18} className="text-primary" /></div>
            <p className="text-xl font-bold text-primary">+{results.correct * 10 + 30}</p>
            <p className="text-[10px] text-charcoal/50">XP Earned</p>
          </div>
          <div className="bg-info/10 rounded-2xl p-3">
            <div className="flex justify-center mb-1"><Check size={18} className="text-info" /></div>
            <p className="text-xl font-bold text-info">{results.total}</p>
            <p className="text-[10px] text-charcoal/50">Reviewed</p>
          </div>
        </div>

        {/* Words that need more practice */}
        {results.hardWords.length > 0 && (
          <div className="bg-warning/5 border border-warning/20 rounded-xl p-4 mb-6 text-left">
            <p className="text-xs font-medium text-warning mb-2">Words to focus on:</p>
            <div className="space-y-1.5">
              {results.hardWords.slice(0, 5).map((w) => (
                <div key={w.id} className="flex justify-between text-sm">
                  <span className="text-charcoal font-medium">
                    {w.article ? `${w.article} ${w.dutch}` : w.dutch}
                  </span>
                  <span className="text-charcoal/50">{w.english}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={onComplete}
          className="w-full bg-primary text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-primary-dark transition-colors"
        >
          Continue
        </button>
      </motion.div>
    );
  }

  return (
    <div className="px-4">
      {/* Progress */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-2 bg-cream-dark rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            animate={{ width: `${((currentIndex + 1) / items.length) * 100}%` }}
          />
        </div>
        <span className="text-sm text-charcoal/60 font-medium">
          {currentIndex + 1}/{items.length}
        </span>
      </div>

      {/* Exercise type indicator */}
      <p className="text-[10px] text-charcoal/40 text-center mb-4 uppercase tracking-wider">
        {reviewMode === 'flashcard' ? 'Flashcard' : reviewMode === 'quiz' ? 'Multiple Choice' : 'Type the Answer'}
      </p>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${currentIndex}-${reviewMode}`}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.2 }}
        >
          {reviewMode === 'flashcard' ? (
            <FlashCard word={currentItem.word} onRate={handleRate} />
          ) : reviewMode === 'quiz' ? (
            <MultipleChoice
              question={`What does "${dutchWithArticle(currentItem.word)}" mean?`}
              options={quizOptions}
              correctAnswer={currentItem.word.english}
              onAnswer={handleQuizAnswer}
            />
          ) : (
            <TypingReview
              word={currentItem.word}
              onAnswer={handleQuizAnswer}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/**
 * TypingReview - Type the Dutch word from its English meaning.
 * Active recall through production (typing) is the most effective review method.
 */
function TypingReview({ word, onAnswer }) {
  const [userInput, setUserInput] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);
  const feedbackTimerRef = useRef(null);

  useEffect(() => {
    return () => { if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current); };
  }, []);

  const dutchAnswer = word.dutch.toLowerCase();

  const handleSubmit = useCallback((e) => {
    e?.preventDefault();
    if (!userInput.trim() || hasSubmitted) return;

    const checkResult = checkAnswer(userInput, dutchAnswer);
    setResult(checkResult);
    setHasSubmitted(true);

    feedbackTimerRef.current = setTimeout(() => {
      onAnswer(checkResult.correct);
    }, 2000);
  }, [userInput, dutchAnswer, hasSubmitted, onAnswer]);

  return (
    <div className="w-full max-w-md mx-auto">
      <p className="text-xs text-charcoal-light/60 uppercase tracking-wide mb-2 text-center">
        Type the Dutch word
      </p>

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-sm border border-cream-dark/30 p-6 mb-6 text-center"
      >
        <p className="text-sm text-charcoal/50 mb-1">English:</p>
        <h2 className="font-display text-2xl text-charcoal mb-2">{word.english}</h2>
        {word.article && (
          <p className="text-sm text-charcoal/40">
            Hint: article is <span className="font-bold text-primary">{word.article}</span>
          </p>
        )}
      </motion.div>

      {!hasSubmitted ? (
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleSubmit}
          className="space-y-3"
        >
          <input
            ref={inputRef}
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder={word.article ? `${word.article} ...` : 'Type the Dutch word...'}
            className="w-full px-5 py-4 bg-white rounded-xl border-2 border-cream-dark/40 text-charcoal text-lg font-medium placeholder:text-charcoal-light/30 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-colors"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck="false"
            autoFocus
          />
          <motion.button
            type="submit"
            whileTap={{ scale: 0.95 }}
            disabled={!userInput.trim()}
            className={`w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-medium transition-colors ${
              userInput.trim()
                ? 'bg-primary text-white hover:bg-primary-dark'
                : 'bg-cream text-charcoal-light/40 cursor-not-allowed'
            }`}
          >
            <Send size={16} />
            Check
          </motion.button>
        </motion.form>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div
            className={`p-4 rounded-xl flex items-start gap-3 ${
              result?.correct ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
            }`}
          >
            <span className="mt-0.5">
              {result?.correct ? <Check size={18} /> : <RotateCcw size={18} />}
            </span>
            <div>
              {result?.correct ? (
                <p className="font-medium">
                  {result.exact ? 'Perfect! Goed zo!' : 'Correct! (kleine typfout)'}
                </p>
              ) : (
                <div>
                  <p className="font-medium">Not quite.</p>
                  <p className="text-sm mt-1">
                    Correct: <span className="font-bold">{dutchWithArticle(word)}</span>
                  </p>
                  <p className="text-sm mt-0.5">
                    You typed: <span className="font-medium">{userInput}</span>
                  </p>
                </div>
              )}
            </div>
          </div>

          {word.exampleNL && (
            <div className="p-3 bg-cream rounded-xl text-sm">
              <p className="text-charcoal font-medium">🇳🇱 {word.exampleNL}</p>
              {word.exampleEN && <p className="text-charcoal/50 mt-0.5">🇬🇧 {word.exampleEN}</p>}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
