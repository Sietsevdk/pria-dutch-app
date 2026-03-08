import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, X, ChevronRight, ChevronLeft, BookOpen, Zap, Eye } from 'lucide-react';
import useProgress from '../hooks/useProgress';
import useStreak from '../hooks/useStreak';
import LevelBadge from '../components/LevelBadge';
import { KNM_DIFFICULTY, getUserLevel } from '../utils/levels';

const knmModule = import.meta.glob('../data/knm.json', { eager: true });
let knmData = { categories: [] };
Object.values(knmModule).forEach((mod) => {
  knmData = mod.default || mod;
});

export default function KNM() {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryMode, setCategoryMode] = useState(null); // null | 'study' | 'quiz'
  const knmProgress = useProgress((s) => s.knmProgress);
  const recordKNMProgress = useProgress((s) => s.recordKNMProgress);
  const completeReviewGoal = useProgress((s) => s.completeReviewGoal);
  const currentLesson = useProgress((s) => s.currentLesson);
  const recordActivity = useStreak((s) => s.recordActivity);
  const userLevel = getUserLevel(currentLesson);

  // Merge persisted progress with local session state
  const [sessionProgress, setSessionProgress] = useState({});
  const categoryProgress = useMemo(() => ({ ...knmProgress, ...sessionProgress }), [knmProgress, sessionProgress]);

  const categories = knmData.categories || [];

  const handleCategoryComplete = useCallback((categoryId, score, total, wrongAnswers) => {
    setSessionProgress((prev) => ({
      ...prev,
      [categoryId]: { completed: true, score, total, wrongAnswers },
    }));
    recordKNMProgress(categoryId, score, total); // Persist to localStorage
    completeReviewGoal();
    const xp = score * 3;
    if (xp > 0) recordActivity(xp);
  }, [recordKNMProgress, completeReviewGoal, recordActivity]);

  const handleBack = useCallback(() => {
    setSelectedCategory(null);
    setCategoryMode(null);
  }, []);

  if (selectedCategory) {
    const category = categories.find((c) => c.id === selectedCategory);
    if (category) {
      // Study mode
      if (categoryMode === 'study') {
        return (
          <CategoryStudy
            category={category}
            onBack={handleBack}
            onStartQuiz={() => setCategoryMode('quiz')}
          />
        );
      }

      // Quiz mode
      if (categoryMode === 'quiz') {
        return (
          <CategoryQuiz
            category={category}
            onBack={handleBack}
            onComplete={handleCategoryComplete}
            previousResult={categoryProgress[selectedCategory]}
          />
        );
      }

      // Mode selection
      return (
        <div className="px-4 pt-6 pb-4">
          <button onClick={handleBack} className="text-sm text-primary font-medium mb-6 flex items-center gap-1">
            <ArrowLeft size={14} /> Back to categories
          </button>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
            <span className="text-4xl mb-3 block">{category.icon}</span>
            <h2 className="font-display text-2xl font-semibold text-charcoal">{category.name}</h2>
            <p className="text-xs text-charcoal/40 italic">{category.nameNl}</p>
            <p className="text-sm text-charcoal/60 mt-1">{category.questions?.length || 0} questions</p>
          </motion.div>

          <div className="space-y-3">
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              onClick={() => setCategoryMode('study')}
              className="w-full bg-white rounded-2xl p-5 shadow-sm border border-cream-dark/50 flex items-center gap-4 text-left"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Eye size={24} className="text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-charcoal">Study First</h3>
                <p className="text-xs text-charcoal/50 mt-0.5">Learn the answers before the quiz</p>
              </div>
              <ChevronRight size={18} className="text-charcoal/30 ml-auto" />
            </motion.button>

            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              onClick={() => setCategoryMode('quiz')}
              className="w-full bg-white rounded-2xl p-5 shadow-sm border border-cream-dark/50 flex items-center gap-4 text-left"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="w-12 h-12 bg-warning/10 rounded-xl flex items-center justify-center">
                <Zap size={24} className="text-warning" />
              </div>
              <div>
                <h3 className="font-semibold text-charcoal">Start Quiz</h3>
                <p className="text-xs text-charcoal/50 mt-0.5">Test your knowledge directly</p>
              </div>
              <ChevronRight size={18} className="text-charcoal/30 ml-auto" />
            </motion.button>
          </div>

          {categoryProgress[selectedCategory]?.completed && categoryProgress[selectedCategory]?.total > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 text-center">
              <p className="text-xs text-charcoal/40">
                Previous score: {Math.round((categoryProgress[selectedCategory].score / categoryProgress[selectedCategory].total) * 100)}%
              </p>
            </motion.div>
          )}
        </div>
      );
    }
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="font-display text-2xl font-semibold text-charcoal">KNM</h1>
        <p className="text-sm text-charcoal/60 mt-0.5">
          Knowledge of Dutch Society
        </p>
        <p className="text-xs text-charcoal/40 italic">
          Kennis van de Nederlandse Maatschappij
        </p>
      </motion.div>

      {/* Overall progress */}
      {Object.keys(categoryProgress).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-4 shadow-sm border border-cream-dark/50 mb-4"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-charcoal">Overall Progress</span>
            <span className="text-sm text-charcoal/60">
              {Object.values(categoryProgress).filter((p) => p.completed).length}/{categories.length} complete
            </span>
          </div>
          <div className="w-full bg-cream-dark rounded-full h-2">
            <motion.div
              className="bg-primary h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{
                width: `${categories.length > 0 ? (Object.values(categoryProgress).filter((p) => p.completed).length / categories.length) * 100 : 0}%`,
              }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </motion.div>
      )}

      {/* Category grid */}
      <div className="grid grid-cols-2 gap-3">
        {categories.map((category, i) => {
          const progress = categoryProgress[category.id];
          const completionPct = progress?.total > 0
            ? Math.round((progress.score / progress.total) * 100)
            : 0;

          return (
            <motion.button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className="bg-white rounded-2xl p-4 shadow-sm border border-cream-dark/50 text-left flex flex-col gap-2 relative overflow-hidden"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              {/* Completion indicator */}
              {progress?.completed && (
                <div className="absolute top-2 right-2">
                  <div className="w-5 h-5 bg-success rounded-full flex items-center justify-center">
                    <Check size={12} className="text-white" />
                  </div>
                </div>
              )}

              <span className="text-2xl">{category.icon}</span>
              <div>
                <h3 className="font-semibold text-sm text-charcoal leading-tight">
                  {category.name}
                </h3>
                <p className="text-[10px] text-charcoal/40 italic leading-tight">
                  {category.nameNl}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[10px] text-charcoal/50">
                    {category.questions?.length || 0} questions
                  </span>
                  <LevelBadge difficulty={KNM_DIFFICULTY[category.id] || 3} userLevel={userLevel} compact />
                </div>
              </div>

              {/* Progress bar */}
              {progress?.completed && (
                <div className="w-full mt-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-charcoal/40">Score</span>
                    <span
                      className={`text-[10px] font-semibold ${
                        completionPct >= 80
                          ? 'text-success'
                          : completionPct >= 50
                            ? 'text-warning'
                            : 'text-error'
                      }`}
                    >
                      {completionPct}%
                    </span>
                  </div>
                  <div className="w-full bg-cream-dark rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${
                        completionPct >= 80
                          ? 'bg-success'
                          : completionPct >= 50
                            ? 'bg-warning'
                            : 'bg-error'
                      }`}
                      style={{ width: `${completionPct}%` }}
                    />
                  </div>
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function CategoryStudy({ category, onBack, onStartQuiz }) {
  const [cardIndex, setCardIndex] = useState(0);
  const questions = category.questions || [];
  const total = questions.length;
  const q = questions[cardIndex];

  if (!q) return (
    <div className="px-4 pt-6 text-center">
      <p className="text-charcoal/60 mb-4">No questions available for this category.</p>
      <button onClick={onBack} className="text-primary font-medium">← Back to categories</button>
    </div>
  );

  const isLast = cardIndex >= total - 1;

  return (
    <div className="px-4 pt-4 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="text-sm text-primary font-medium flex items-center gap-1">
          <ArrowLeft size={14} /> Back
        </button>
        <span className="text-sm text-charcoal/60">{cardIndex + 1} / {total}</span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-cream-dark rounded-full h-2 mb-4">
        <motion.div
          className="bg-primary h-2 rounded-full"
          animate={{ width: `${((cardIndex + 1) / total) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Category badge */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">{category.icon}</span>
        <span className="text-xs font-medium text-charcoal/50">{category.name} — Study Mode</span>
      </div>

      {/* Study card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={cardIndex}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.25 }}
          className="bg-white rounded-2xl p-5 shadow-sm border border-cream-dark/50 mb-4"
        >
          {/* Question */}
          <h2 className="font-display text-lg font-semibold text-charcoal leading-snug mb-2">
            {q.question}
          </h2>
          {q.questionEn && (
            <p className="text-sm text-charcoal/50 italic mb-4">{q.questionEn}</p>
          )}

          {/* Correct answer */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-success uppercase tracking-wide mb-2">Answer</p>
            <div className="p-4 bg-success/10 border-2 border-success/30 rounded-xl flex items-center gap-3">
              <Check size={18} className="text-success shrink-0" />
              <span className="text-charcoal font-semibold">{q.options[q.correct]}</span>
            </div>
          </div>

          {/* Explanation */}
          {(q.explanation || q.explanationNl) && (
            <div className="bg-primary/5 border border-primary/10 rounded-xl p-4">
              {q.explanation && (
                <p className="text-sm text-charcoal/70 mb-1">{q.explanation}</p>
              )}
              {q.explanationNl && (
                <p className="text-sm text-charcoal/50 italic">{q.explanationNl}</p>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex gap-3">
        {cardIndex > 0 && (
          <button
            onClick={() => setCardIndex((i) => i - 1)}
            className="flex items-center justify-center gap-1 flex-1 py-3 rounded-xl text-sm font-medium bg-cream-dark text-charcoal/60"
          >
            <ChevronLeft size={16} /> Previous
          </button>
        )}
        {isLast ? (
          <button
            onClick={onStartQuiz}
            className="flex items-center justify-center gap-2 flex-1 py-3 rounded-xl text-sm font-semibold bg-primary text-white"
          >
            Ready for the quiz! <Zap size={16} />
          </button>
        ) : (
          <button
            onClick={() => setCardIndex((i) => i + 1)}
            className="flex items-center justify-center gap-1 flex-1 py-3 rounded-xl text-sm font-semibold bg-primary text-white"
          >
            Next <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

function CategoryQuiz({ category, onBack, onComplete, previousResult }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState([]);
  const [showResults, setShowResults] = useState(false);

  const questions = category.questions || [];
  const totalQuestions = questions.length;
  const currentQuestion = questions[currentIndex];
  const progress = totalQuestions > 0 ? ((currentIndex + 1) / totalQuestions) * 100 : 0;

  const handleSelectOption = (optionIndex) => {
    if (isAnswered) return;

    setSelectedOption(optionIndex);
    setIsAnswered(true);

    const isCorrect = optionIndex === currentQuestion.correct;
    if (isCorrect) {
      setScore((s) => s + 1);
    } else {
      setWrongAnswers((prev) => [
        ...prev,
        {
          question: currentQuestion.question,
          questionEn: currentQuestion.questionEn,
          userAnswer: currentQuestion.options[optionIndex],
          correctAnswer: currentQuestion.options[currentQuestion.correct],
          explanation: currentQuestion.explanation,
          explanationNl: currentQuestion.explanationNl,
        },
      ]);
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 >= totalQuestions) {
      setShowResults(true);
      // Use score (tracks correct answers directly) instead of totalQuestions - wrongAnswers.length
      // to avoid off-by-one from stale state
      onComplete(category.id, score, totalQuestions, wrongAnswers);
      return;
    }

    setCurrentIndex((i) => i + 1);
    setSelectedOption(null);
    setIsAnswered(false);
  };

  const handleRetry = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setScore(0);
    setWrongAnswers([]);
    setShowResults(false);
  };

  // Results screen
  if (showResults) {
    const finalScore = totalQuestions - wrongAnswers.length;
    const percentage = totalQuestions > 0 ? Math.round((finalScore / totalQuestions) * 100) : 0;
    const passed = percentage >= 70;

    return (
      <div className="px-4 pt-6 pb-4">
        <button
          onClick={onBack}
          className="text-sm text-primary font-medium mb-6 flex items-center gap-1"
        >
          <ArrowLeft size={14} /> Back to categories
        </button>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center mb-6"
        >
          <div className="text-5xl mb-3">{passed ? '🎉' : '💪'}</div>
          <h2 className="font-display text-2xl font-semibold text-charcoal">
            {passed ? 'Goed gedaan!' : 'Blijf oefenen!'}
          </h2>
          <p className="text-charcoal/60 mt-1">
            {finalScore}/{totalQuestions} correct ({percentage}%)
          </p>
        </motion.div>

        {/* Score bar */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-cream-dark/50 mb-4">
          <div className="w-full bg-cream-dark rounded-full h-3">
            <motion.div
              className={`h-3 rounded-full ${passed ? 'bg-success' : 'bg-error'}`}
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
            />
          </div>
          <p className="text-center text-xs text-charcoal/50 mt-2">
            {passed ? 'You passed this section!' : 'You need 70% to pass. Try again!'}
          </p>
        </div>

        {/* Wrong answers review */}
        {wrongAnswers.length > 0 && (
          <div className="mb-4">
            <h3 className="font-semibold text-sm text-charcoal mb-3">
              Review incorrect answers ({wrongAnswers.length})
            </h3>
            <div className="space-y-3">
              {wrongAnswers.map((wa, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white rounded-2xl p-4 shadow-sm border border-error/20"
                >
                  <p className="text-sm font-medium text-charcoal mb-1">{wa.question}</p>
                  {wa.questionEn && (
                    <p className="text-xs text-charcoal/50 italic mb-2">{wa.questionEn}</p>
                  )}

                  <div className="flex items-start gap-2 mb-1">
                    <X size={14} className="text-error shrink-0 mt-0.5" />
                    <span className="text-sm text-error">{wa.userAnswer}</span>
                  </div>
                  <div className="flex items-start gap-2 mb-2">
                    <Check size={14} className="text-success shrink-0 mt-0.5" />
                    <span className="text-sm text-success">{wa.correctAnswer}</span>
                  </div>

                  {wa.explanation && (
                    <div className="bg-cream/80 rounded-xl p-3 mt-2">
                      <p className="text-xs text-charcoal/70 mb-1">{wa.explanation}</p>
                      {wa.explanationNl && (
                        <p className="text-xs text-charcoal/50 italic">{wa.explanationNl}</p>
                      )}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleRetry}
            className="flex-1 bg-cream-dark text-charcoal font-medium py-3 rounded-xl"
          >
            Try Again
          </button>
          <button
            onClick={onBack}
            className="flex-1 bg-primary text-white font-semibold py-3 rounded-xl"
          >
            Back to KNM
          </button>
        </div>
      </div>
    );
  }

  // Quiz screen
  return (
    <div className="px-4 pt-4 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          className="text-sm text-primary font-medium flex items-center gap-1"
        >
          <ArrowLeft size={14} /> Back
        </button>
        <span className="text-sm text-charcoal/60">
          {currentIndex + 1} / {totalQuestions}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-cream-dark rounded-full h-2 mb-6">
        <motion.div
          className="bg-primary h-2 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </div>

      {/* Category badge */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">{category.icon}</span>
        <span className="text-xs font-medium text-charcoal/50">
          {category.name}
        </span>
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.25 }}
        >
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-cream-dark/50 mb-4">
            <h2 className="font-display text-lg font-semibold text-charcoal leading-snug">
              {currentQuestion.question}
            </h2>
            {currentQuestion.questionEn && (
              <p className="text-sm text-charcoal/50 mt-1 italic">
                {currentQuestion.questionEn}
              </p>
            )}
          </div>

          {/* Options */}
          <div className="space-y-2.5">
            {currentQuestion.options.map((option, optIdx) => {
              const isSelected = selectedOption === optIdx;
              const isCorrect = optIdx === currentQuestion.correct;

              let optionStyle = 'bg-white border-cream-dark/50 hover:border-primary/30';
              if (isAnswered) {
                if (isCorrect) {
                  optionStyle = 'bg-success/10 border-success/40';
                } else if (isSelected && !isCorrect) {
                  optionStyle = 'bg-error/10 border-error/40';
                } else {
                  optionStyle = 'bg-white border-cream-dark/30 opacity-50';
                }
              } else if (isSelected) {
                optionStyle = 'bg-primary/10 border-primary/40';
              }

              return (
                <motion.button
                  key={optIdx}
                  onClick={() => handleSelectOption(optIdx)}
                  disabled={isAnswered}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center gap-3 ${optionStyle}`}
                  whileHover={!isAnswered ? { scale: 1.01 } : {}}
                  whileTap={!isAnswered ? { scale: 0.98 } : {}}
                >
                  <div
                    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      isAnswered && isCorrect
                        ? 'border-success bg-success'
                        : isAnswered && isSelected && !isCorrect
                          ? 'border-error bg-error'
                          : 'border-cream-dark'
                    }`}
                  >
                    {isAnswered && isCorrect && <Check size={14} className="text-white" />}
                    {isAnswered && isSelected && !isCorrect && (
                      <X size={14} className="text-white" />
                    )}
                  </div>
                  <span className="text-sm text-charcoal">{option}</span>
                </motion.button>
              );
            })}
          </div>

          {/* Explanation after answer */}
          <AnimatePresence>
            {isAnswered && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div
                  className={`mt-4 rounded-2xl p-4 border ${
                    selectedOption === currentQuestion.correct
                      ? 'bg-success/5 border-success/20'
                      : 'bg-error/5 border-error/20'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {selectedOption === currentQuestion.correct ? (
                      <Check size={16} className="text-success" />
                    ) : (
                      <X size={16} className="text-error" />
                    )}
                    <span
                      className={`text-sm font-semibold ${
                        selectedOption === currentQuestion.correct
                          ? 'text-success'
                          : 'text-error'
                      }`}
                    >
                      {selectedOption === currentQuestion.correct ? 'Correct!' : 'Incorrect'}
                    </span>
                  </div>

                  {currentQuestion.explanation && (
                    <p className="text-sm text-charcoal/70 mb-1">
                      {currentQuestion.explanation}
                    </p>
                  )}
                  {currentQuestion.explanationNl && (
                    <p className="text-sm text-charcoal/50 italic">
                      {currentQuestion.explanationNl}
                    </p>
                  )}
                </div>

                <motion.button
                  onClick={handleNext}
                  className="w-full mt-4 bg-primary text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {currentIndex + 1 >= totalQuestions ? 'See Results' : 'Next Question'}
                  <ChevronRight size={18} />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
