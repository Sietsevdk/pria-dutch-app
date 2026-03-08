import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, Send, Check, X } from 'lucide-react';
import { checkAnswer } from '../utils/dutch';

/**
 * FillInBlank - Sentence completion exercise.
 * Highlights a blank in the sentence and checks the user's input with typo tolerance.
 * Calls onAnswer immediately (synchronously) so the parent controls timing.
 */
export default function FillInBlank({
  sentence,
  answer,
  hint,
  explanation,
  englishContext,
  targetWord,
  firstLetter,
  onAnswer,
}) {
  const [userInput, setUserInput] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [result, setResult] = useState(null); // null | { correct, exact, distance }
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const inputRef = useRef(null);
  const submittedRef = useRef(false);

  const handleSubmit = useCallback(
    (e) => {
      e?.preventDefault();
      if (!userInput.trim() || hasSubmitted || submittedRef.current) return;
      submittedRef.current = true;

      const checkResult = checkAnswer(userInput, answer);
      setResult(checkResult);
      setHasSubmitted(true);

      // Call onAnswer immediately — parent (Lesson/Dictionary) controls the advance timing
      if (onAnswer) {
        onAnswer(checkResult.correct);
      }
    },
    [userInput, answer, hasSubmitted, onAnswer]
  );

  const handleHint = useCallback(() => {
    setShowHint(true);
    if (answer && !userInput) {
      setUserInput(answer.length >= 2 ? answer.slice(0, 2) : answer.charAt(0));
      inputRef.current?.focus();
    }
  }, [answer, userInput]);

  // Render the sentence with the blank highlighted
  const renderSentence = () => {
    const parts = sentence.split('___');
    if (parts.length < 2) {
      return <span>{sentence}</span>;
    }

    return (
      <>
        <span>{parts[0]}</span>
        <span className="inline-block mx-1 px-3 py-1 bg-primary/10 border-b-2 border-primary rounded-md min-w-[80px] text-center font-medium text-primary">
          {hasSubmitted ? (
            <span className={result?.correct ? 'text-success' : 'text-error'}>
              {result?.correct ? userInput : answer}
            </span>
          ) : firstLetter ? (
            <span className="text-charcoal/40">{firstLetter}...</span>
          ) : (
            '___'
          )}
        </span>
        <span>{parts.slice(1).join('___')}</span>
      </>
    );
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header instruction */}
      <p className="text-xs text-charcoal-light/60 uppercase tracking-wide mb-2 text-center font-medium">
        Fill in the blank
      </p>

      {/* English context sentence — always show if available */}
      {englishContext && (
        <div className="bg-info/5 border border-info/15 rounded-xl p-3 mb-4 text-center">
          <p className="text-xs text-charcoal/50 mb-0.5 font-medium">English translation:</p>
          <p className="text-sm text-charcoal/80">{englishContext}</p>
        </div>
      )}

      {/* Sentence display */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-sm border border-cream-dark/30 p-6 mb-6"
      >
        <p className="text-lg text-charcoal leading-relaxed text-center">
          {renderSentence()}
        </p>

        {/* Target word instruction — prominent and clear */}
        {targetWord && (
          <div className="mt-3 pt-3 border-t border-cream-dark/30">
            <p className="text-sm font-semibold text-primary text-center">
              👆 Type the Dutch word for "<span className="font-bold">{targetWord}</span>"
            </p>
          </div>
        )}
      </motion.div>

      {/* Input area */}
      {!hasSubmitted && (
        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Type your answer..."
              className="w-full px-5 py-4 bg-white rounded-xl border-2 border-cream-dark/40 text-charcoal text-lg font-medium placeholder:text-charcoal-light/30 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-colors"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck="false"
              aria-label="Type the missing word"
            />
          </div>

          <div className="flex gap-3">
            {/* Hint button */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.95 }}
              onClick={handleHint}
              disabled={showHint}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                showHint
                  ? 'bg-cream text-charcoal-light/40 cursor-not-allowed'
                  : 'bg-warning/10 text-warning hover:bg-warning/20'
              }`}
              aria-label="Show hint"
            >
              <Lightbulb size={16} />
              Hint
            </motion.button>

            {/* Submit button */}
            <motion.button
              type="submit"
              whileTap={{ scale: 0.95 }}
              disabled={!userInput.trim()}
              className={`flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-medium text-sm transition-colors ${
                userInput.trim()
                  ? 'bg-primary text-white hover:bg-primary-dark'
                  : 'bg-cream text-charcoal-light/40 cursor-not-allowed'
              }`}
              aria-label="Check answer"
            >
              <Send size={16} />
              Check
            </motion.button>
          </div>
        </motion.form>
      )}

      {/* Hint display */}
      <AnimatePresence>
        {showHint && hint && !hasSubmitted && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 p-3 bg-warning/10 rounded-xl"
          >
            <p className="text-sm text-warning font-medium flex items-center gap-2">
              <Lightbulb size={14} />
              {hint}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feedback */}
      <AnimatePresence>
        {hasSubmitted && result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 space-y-3"
          >
            <div
              className={`p-4 rounded-xl flex items-start gap-3 ${
                result.correct
                  ? 'bg-success/10 text-success'
                  : 'bg-error/10 text-error'
              }`}
              role="alert"
            >
              <span className="mt-0.5">
                {result.correct ? <Check size={18} /> : <X size={18} />}
              </span>
              <div>
                {result.correct ? (
                  <p className="font-medium">
                    {result.exact
                      ? 'Perfect!'
                      : 'Correct! (kleine typfout)'}
                  </p>
                ) : (
                  <div>
                    <p className="font-medium">Not quite.</p>
                    <p className="text-sm mt-1">
                      Correct answer:{' '}
                      <span className="font-bold">{answer}</span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Explanation */}
            {explanation && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="p-4 bg-info/10 rounded-xl"
              >
                <p className="text-sm text-info">{explanation}</p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
