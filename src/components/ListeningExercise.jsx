import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, Snail, Send, Check, X } from 'lucide-react';
import { useSpeech } from '../hooks/useSpeech';
import { checkAnswer } from '../utils/dutch';

/**
 * ListeningExercise - Audio listening exercise.
 * Plays Dutch text via TTS and lets users answer via multiple choice or free text input.
 * Calls onAnswer immediately (synchronously) so the parent controls timing.
 */
export default function ListeningExercise({
  text,
  options,
  correctAnswer,
  onAnswer,
}) {
  const [hasPlayed, setHasPlayed] = useState(false);
  const [selected, setSelected] = useState(null);
  const [userInput, setUserInput] = useState('');
  const [hasAnswered, setHasAnswered] = useState(false);
  const [result, setResult] = useState(null);
  const answeredRef = useRef(false);
  const { speak, isSpeaking } = useSpeech();

  // Reset all state when text or correctAnswer changes (handle parent not using key)
  useEffect(() => {
    setHasPlayed(false);
    setSelected(null);
    setUserInput('');
    setHasAnswered(false);
    setResult(null);
    answeredRef.current = false;
  }, [text, correctAnswer]);

  const isMultipleChoice = options && options.length > 0;

  const handlePlay = useCallback(() => {
    speak(text);
    setHasPlayed(true);
  }, [speak, text]);

  const handlePlaySlow = useCallback(() => {
    speak(text, { slow: true });
    setHasPlayed(true);
  }, [speak, text]);

  const handleSelectOption = useCallback(
    (option) => {
      if (hasAnswered || answeredRef.current) return;
      answeredRef.current = true;
      setSelected(option);
      const isCorrect = option === correctAnswer;
      setResult({ correct: isCorrect });
      setHasAnswered(true);

      // Call onAnswer immediately — parent (Lesson/Dictionary) controls the advance timing
      if (onAnswer) {
        onAnswer(isCorrect);
      }
    },
    [hasAnswered, correctAnswer, onAnswer]
  );

  const handleSubmitText = useCallback(
    (e) => {
      e?.preventDefault();
      if (!userInput.trim() || hasAnswered || answeredRef.current) return;
      answeredRef.current = true;

      const checkResult = checkAnswer(userInput, correctAnswer, 2);
      setResult(checkResult);
      setHasAnswered(true);

      // Call onAnswer immediately — parent (Lesson/Dictionary) controls the advance timing
      if (onAnswer) {
        onAnswer(checkResult.correct);
      }
    },
    [userInput, correctAnswer, hasAnswered, onAnswer]
  );

  const getOptionStyle = (option) => {
    if (!hasAnswered) {
      return 'bg-white border-cream-dark/40 text-charcoal hover:border-primary/50 hover:bg-primary/5';
    }
    if (option === correctAnswer) {
      return 'bg-success/10 border-success text-success';
    }
    if (option === selected && option !== correctAnswer) {
      return 'bg-error/10 border-error text-error';
    }
    return 'bg-white border-cream-dark/20 text-charcoal-light/50';
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Instruction */}
      <p className="text-xs text-charcoal-light/60 uppercase tracking-wide mb-4 text-center">
        Listen and answer
      </p>

      {/* Play controls */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center mb-8"
      >
        {/* Main play button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.05 }}
          onClick={handlePlay}
          disabled={isSpeaking}
          className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg mb-4 transition-colors ${
            isSpeaking
              ? 'bg-primary/80 text-white animate-pulse'
              : 'bg-primary text-white hover:bg-primary-dark'
          }`}
          aria-label="Play audio"
        >
          <Play size={32} className="ml-1" />
        </motion.button>

        <div className="flex gap-3">
          {/* Play again */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handlePlay}
            disabled={isSpeaking}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-charcoal-light bg-cream hover:bg-cream-dark transition-colors"
            aria-label="Play again"
          >
            <RotateCcw size={14} />
            Again
          </motion.button>

          {/* Play slowly */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handlePlaySlow}
            disabled={isSpeaking}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-charcoal-light bg-cream hover:bg-cream-dark transition-colors"
            aria-label="Play slowly"
          >
            <Snail size={14} />
            Slow
          </motion.button>
        </div>
      </motion.div>

      {/* Answer area */}
      {hasPlayed && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {isMultipleChoice ? (
            /* Multiple choice options */
            <div
              className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              role="radiogroup"
              aria-label="Answer options"
            >
              {options.map((option, index) => (
                <motion.button
                  key={`${option}-${index}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileTap={!hasAnswered ? { scale: 0.97 } : {}}
                  onClick={() => handleSelectOption(option)}
                  disabled={hasAnswered}
                  className={`flex items-center justify-between px-5 py-4 rounded-xl border-2 font-medium text-left transition-colors ${getOptionStyle(option)}`}
                  role="radio"
                  aria-checked={selected === option}
                >
                  <span>{option}</span>
                  {hasAnswered && option === correctAnswer && (
                    <Check size={16} className="text-success" />
                  )}
                  {hasAnswered &&
                    option === selected &&
                    option !== correctAnswer && (
                      <X size={16} className="text-error" />
                    )}
                </motion.button>
              ))}
            </div>
          ) : (
            /* Text input */
            <form onSubmit={handleSubmitText} className="space-y-3">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Type what you heard..."
                disabled={hasAnswered}
                className="w-full px-5 py-4 bg-white rounded-xl border-2 border-cream-dark/40 text-charcoal text-lg font-medium placeholder:text-charcoal-light/30 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-colors disabled:opacity-50"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck="false"
                aria-label="Type what you heard"
              />
              {!hasAnswered && (
                <motion.button
                  type="submit"
                  whileTap={{ scale: 0.95 }}
                  disabled={!userInput.trim()}
                  className={`w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-medium text-sm transition-colors ${
                    userInput.trim()
                      ? 'bg-primary text-white hover:bg-primary-dark'
                      : 'bg-cream text-charcoal-light/40 cursor-not-allowed'
                  }`}
                  aria-label="Submit answer"
                >
                  <Send size={16} />
                  Check
                </motion.button>
              )}
            </form>
          )}
        </motion.div>
      )}

      {/* Feedback */}
      <AnimatePresence>
        {hasAnswered && result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`mt-6 p-4 rounded-xl text-sm font-medium ${
              result.correct
                ? 'bg-success/10 text-success'
                : 'bg-error/10 text-error'
            }`}
            role="alert"
          >
            {result.correct ? (
              <div className="flex items-center gap-2">
                <Check size={16} />
                <span>Correct! Goed geluisterd!</span>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2">
                  <X size={16} />
                  <span>Not quite.</span>
                </div>
                <p className="mt-2 text-charcoal-light">
                  The answer was:{' '}
                  <span className="font-bold text-charcoal">
                    {correctAnswer}
                  </span>
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
