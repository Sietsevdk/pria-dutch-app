import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Search, Check, ChevronRight, Star, ArrowLeft } from 'lucide-react';
import FillInBlank from '../components/FillInBlank';
import MultipleChoice from '../components/MultipleChoice';
import useProgress from '../hooks/useProgress';
import { shuffle, checkAnswer } from '../utils/dutch';
import { COMMON_HET_WORDS, HET_WORD_RULES } from '../utils/dutch';

const grammarModules = import.meta.glob('../data/grammar/*.json', { eager: true });
const allGrammar = Object.values(grammarModules)
  .map((m) => m.default || m)
  .filter(Boolean);

const vocabModules = import.meta.glob('../data/vocabulary/*.json', { eager: true });
const allNouns = [];
Object.values(vocabModules).forEach((m) => {
  const data = m.default || m;
  data.words?.forEach((w) => {
    if (w.article) allNouns.push(w);
  });
});

export default function Grammar() {
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [showDeHet, setShowDeHet] = useState(false);
  const [search, setSearch] = useState('');
  const grammarMastered = useProgress((s) => s.grammarMastered);

  const filteredGrammar = useMemo(() => {
    if (!search) return allGrammar;
    const q = search.toLowerCase();
    return allGrammar.filter(
      (g) =>
        g.topic?.toLowerCase().includes(q) ||
        g.topicNL?.toLowerCase().includes(q) ||
        g.explanation?.summary?.toLowerCase().includes(q)
    );
  }, [search]);

  if (showDeHet) {
    return <DeHetTrainer onBack={() => setShowDeHet(false)} />;
  }

  if (selectedTopic) {
    const topic = allGrammar.find((g) => g.topic === selectedTopic);
    if (topic) {
      return (
        <GrammarDetail
          topic={topic}
          onBack={() => setSelectedTopic(null)}
        />
      );
    }
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <motion.h1
        className="font-display text-2xl font-semibold text-charcoal mb-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Grammar
      </motion.h1>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/40" />
        <input
          type="text"
          placeholder="Search grammar topics..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white rounded-xl pl-10 pr-4 py-2.5 text-sm border border-cream-dark/50 focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/20"
        />
      </div>

      {/* De/Het Trainer */}
      <motion.button
        onClick={() => setShowDeHet(true)}
        className="w-full bg-gradient-to-r from-primary to-primary-light text-white rounded-2xl p-4 mb-4 flex items-center justify-between shadow-md"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎯</span>
          <div className="text-left">
            <div className="font-semibold">De/Het Trainer</div>
            <div className="text-sm text-white/80">Master Dutch articles</div>
          </div>
        </div>
        <ChevronRight size={20} />
      </motion.button>

      {/* Grammar topics list */}
      <div className="space-y-2">
        {filteredGrammar.map((topic, i) => {
          const mastered = grammarMastered[topic.topic]?.mastered;
          return (
            <motion.button
              key={topic.topic}
              onClick={() => setSelectedTopic(topic.topic)}
              className="w-full bg-white rounded-2xl p-4 shadow-sm border border-cream-dark/50 flex items-center gap-3 text-left"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  mastered ? 'bg-success/10' : 'bg-cream-dark'
                }`}
              >
                {mastered ? (
                  <Check size={16} className="text-success" />
                ) : (
                  <BookOpen size={16} className="text-charcoal/40" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm text-charcoal truncate">
                  {topic.topicNL || topic.topic}
                </h3>
                <p className="text-xs text-charcoal/50 truncate">
                  {topic.explanation?.summary}
                </p>
              </div>
              <ChevronRight size={16} className="text-charcoal/30 shrink-0" />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function GrammarDetail({ topic, onBack }) {
  const [showExercises, setShowExercises] = useState(false);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const masterGrammar = useProgress((s) => s.masterGrammar);

  const exercises = topic.exercises || [];

  if (showExercises && exercises.length > 0) {
    const ex = exercises[exerciseIndex];
    const isComplete = exerciseIndex >= exercises.length;

    if (isComplete) {
      const accuracy = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
      masterGrammar(topic.topic, accuracy);

      return (
        <div className="px-4 pt-6 text-center">
          <div className="text-4xl mb-4">{accuracy >= 85 ? '🎉' : '💪'}</div>
          <h2 className="font-display text-2xl font-semibold text-charcoal mb-2">
            {accuracy >= 85 ? 'Mastered!' : 'Keep practicing!'}
          </h2>
          <p className="text-charcoal/60 mb-2">
            Score: {score.correct}/{score.total} ({accuracy}%)
          </p>
          <button
            onClick={onBack}
            className="mt-4 bg-primary text-white font-semibold px-8 py-3 rounded-xl"
          >
            Back to Grammar
          </button>
        </div>
      );
    }

    return (
      <div className="px-4 pt-6">
        <button onClick={onBack} className="text-sm text-primary font-medium mb-4">
          ← Back
        </button>
        <p className="text-sm text-charcoal/60 mb-4">
          Exercise {exerciseIndex + 1} of {exercises.length}
        </p>
        {ex.type === 'fill_blank' && (
          <FillInBlank
            key={exerciseIndex}
            sentence={ex.sentence}
            answer={ex.answer}
            hint=""
            explanation={ex.explanation}
            onAnswer={(correct) => {
              setScore((s) => ({
                correct: s.correct + (correct ? 1 : 0),
                total: s.total + 1,
              }));
              setTimeout(() => setExerciseIndex((i) => i + 1), 1500);
            }}
          />
        )}
        {ex.type === 'multiple_choice' && ex.options && (
          <MultipleChoice
            key={exerciseIndex}
            question={ex.sentence}
            options={ex.options}
            correctAnswer={ex.answer}
            onAnswer={(correct) => {
              setScore((s) => ({
                correct: s.correct + (correct ? 1 : 0),
                total: s.total + 1,
              }));
              setTimeout(() => setExerciseIndex((i) => i + 1), 1500);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <button onClick={onBack} className="text-sm text-primary font-medium mb-4 flex items-center gap-1">
        <ArrowLeft size={14} /> Back
      </button>

      <h1 className="font-display text-2xl font-semibold text-charcoal mb-4">
        {topic.topicNL || topic.topic}
      </h1>

      {topic.explanation && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-cream-dark/50 mb-4">
          <p className="text-charcoal/80 mb-4">{topic.explanation.summary}</p>

          {topic.explanation.rules?.length > 0 && (
            <div className="mb-4">
              <h3 className="font-semibold text-sm text-charcoal mb-2">Rules</h3>
              <ul className="space-y-2">
                {topic.explanation.rules.map((rule, i) => (
                  <li key={i} className="text-sm text-charcoal/70 flex gap-2">
                    <span className="text-primary font-bold shrink-0">{i + 1}.</span>
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {topic.explanation.exceptions?.length > 0 && (
            <div className="mb-4">
              <h3 className="font-semibold text-sm text-charcoal mb-2">Exceptions</h3>
              <ul className="space-y-1">
                {topic.explanation.exceptions.map((ex, i) => (
                  <li key={i} className="text-sm text-charcoal/60 italic">⚠ {ex}</li>
                ))}
              </ul>
            </div>
          )}

          {topic.explanation.commonMistakes?.length > 0 && (
            <div className="mb-4">
              <h3 className="font-semibold text-sm text-error mb-2">Common Mistakes</h3>
              <ul className="space-y-1">
                {topic.explanation.commonMistakes.map((m, i) => (
                  <li key={i} className="text-sm text-charcoal/60">❌ {m}</li>
                ))}
              </ul>
            </div>
          )}

          {topic.explanation.tip && (
            <div className="bg-primary/5 border border-primary/10 rounded-xl p-3">
              <p className="text-sm text-charcoal/70">💡 {topic.explanation.tip}</p>
            </div>
          )}
        </div>
      )}

      {exercises.length > 0 && (
        <button
          onClick={() => {
            setShowExercises(true);
            setExerciseIndex(0);
            setScore({ correct: 0, total: 0 });
          }}
          className="w-full bg-primary text-white font-semibold py-3 rounded-xl hover:bg-primary-dark transition-colors"
        >
          Practice ({exercises.length} exercises)
        </button>
      )}
    </div>
  );
}

/**
 * Get a mnemonic hint for why a word uses a particular article.
 */
function getMnemonicHint(noun) {
  const word = noun.dutch?.toLowerCase() || '';
  // Check if any HET_WORD_RULES pattern matches
  for (const rule of HET_WORD_RULES) {
    if (rule.pattern && rule.pattern.test(word)) {
      return `Rule: ${rule.rule}`;
    }
  }
  // Check if in COMMON_HET_WORDS list
  const fullForm = `${noun.article} ${word}`;
  if (COMMON_HET_WORDS.some((hw) => hw.toLowerCase() === fullForm)) {
    return `"${noun.article} ${noun.dutch}" is a common het-word - try to memorize it!`;
  }
  return 'This is just a word to memorize - try making a mental image!';
}

/**
 * Pick a noun based on difficulty: before 10 correct answers use common words,
 * afterwards mix in the full set.
 */
function pickNoun(totalCorrect) {
  if (totalCorrect < 10) {
    // Common words only (those whose article + word appear in COMMON_HET_WORDS or are "de" words with short dutch name)
    const common = allNouns.filter(
      (n) =>
        COMMON_HET_WORDS.some(
          (hw) => hw.toLowerCase() === `${n.article} ${n.dutch?.toLowerCase()}`
        ) || n.dutch?.length <= 6
    );
    const pool = common.length > 0 ? common : allNouns;
    return pool[Math.floor(Math.random() * pool.length)];
  }
  return allNouns[Math.floor(Math.random() * allNouns.length)];
}

function DeHetTrainer({ onBack }) {
  const [currentNoun, setCurrentNoun] = useState(() =>
    allNouns.length > 0 ? pickNoun(0) : null
  );
  const [answered, setAnswered] = useState(null); // 'de' | 'het' | null
  const [stats, setStats] = useState({ correct: 0, total: 0 });
  const [streak, setStreak] = useState(0);
  const [iKnewIt, setIKnewIt] = useState(false);
  const [showTips, setShowTips] = useState(false);

  const handleGuess = (article) => {
    setAnswered(article);
    const isCorrect = article === currentNoun.article;
    const newCorrect = stats.correct + (isCorrect ? 1 : 0);
    setStats((s) => ({
      correct: newCorrect,
      total: s.total + 1,
    }));
    setStreak((s) => (isCorrect ? s + 1 : 0));

    setTimeout(() => {
      setAnswered(null);
      setIKnewIt(false);
      setCurrentNoun(pickNoun(newCorrect));
    }, 2000);
  };

  const handleIKnewIt = () => {
    setIKnewIt(true);
    // Count it as correct since the user actually knew it
    setStats((s) => ({
      correct: s.correct + 1,
      total: s.total, // total was already incremented
    }));
    setStreak((s) => s + 1);
  };

  if (!currentNoun) {
    return (
      <div className="px-4 pt-6 text-center">
        <p className="text-charcoal/60">Loading nouns...</p>
      </div>
    );
  }

  const isCorrect = answered === currentNoun.article;
  const isWrong = answered && !isCorrect;

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="text-sm text-primary font-medium flex items-center gap-1">
          <ArrowLeft size={14} /> Back
        </button>
        <div className="flex items-center gap-3">
          {/* Streak counter */}
          {streak > 0 && (
            <motion.span
              key={streak}
              initial={{ scale: 1.4 }}
              animate={{ scale: 1 }}
              className={`text-sm font-bold ${
                streak >= 10 ? 'text-warning' : streak >= 5 ? 'text-primary' : 'text-success'
              }`}
            >
              {streak >= 10 ? '🔥' : streak >= 5 ? '⚡' : '✨'} {streak} streak
            </motion.span>
          )}
          <div className="text-sm text-charcoal/60">
            {stats.total > 0 && (
              <span>
                {stats.correct}/{stats.total} (
                {Math.round((stats.correct / stats.total) * 100)}%)
              </span>
            )}
          </div>
        </div>
      </div>

      <h1 className="font-display text-2xl font-semibold text-charcoal mb-6 text-center">
        De or Het?
      </h1>

      {/* Difficulty indicator */}
      <p className="text-xs text-charcoal/40 text-center mb-2">
        {stats.correct < 10 ? 'Common words' : 'All words'}
      </p>

      <motion.div
        key={currentNoun.id || currentNoun.dutch}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl p-8 shadow-sm border border-cream-dark/50 text-center mb-6"
      >
        <p className="text-3xl font-display font-semibold text-charcoal mb-2">
          {currentNoun.dutch}
        </p>
        <p className="text-sm text-charcoal/50">{currentNoun.english}</p>

        {answered && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-4 text-lg font-semibold ${
              isCorrect || iKnewIt ? 'text-success' : 'text-error'
            }`}
          >
            {isCorrect
              ? '✓ Correct!'
              : iKnewIt
                ? '✓ Got it - keep trusting yourself!'
                : `✗ It's "${currentNoun.article} ${currentNoun.dutch}"`}
          </motion.div>
        )}

        {/* Mnemonic hint on wrong answer */}
        {isWrong && !iKnewIt && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-3 bg-info/5 border border-info/20 rounded-xl p-3 text-left"
          >
            <p className="text-xs font-medium text-info mb-1">💡 Tip to remember:</p>
            <p className="text-xs text-charcoal/70">{getMnemonicHint(currentNoun)}</p>
          </motion.div>
        )}

        {/* "I knew it" toggle for wrong answers */}
        {isWrong && !iKnewIt && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            onClick={handleIKnewIt}
            className="mt-3 text-xs text-primary/70 underline underline-offset-2"
          >
            Actually, I knew it - I second-guessed myself
          </motion.button>
        )}
      </motion.div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          onClick={() => !answered && handleGuess('de')}
          disabled={!!answered}
          className={`py-4 rounded-2xl text-xl font-bold transition-all ${
            answered === 'de'
              ? currentNoun.article === 'de'
                ? 'bg-success text-white'
                : 'bg-error text-white'
              : answered && currentNoun.article === 'de'
                ? 'bg-success/20 text-success border-2 border-success'
                : 'bg-white border-2 border-cream-dark text-charcoal hover:border-primary'
          }`}
        >
          de
        </button>
        <button
          onClick={() => !answered && handleGuess('het')}
          disabled={!!answered}
          className={`py-4 rounded-2xl text-xl font-bold transition-all ${
            answered === 'het'
              ? currentNoun.article === 'het'
                ? 'bg-success text-white'
                : 'bg-error text-white'
              : answered && currentNoun.article === 'het'
                ? 'bg-success/20 text-success border-2 border-success'
                : 'bg-white border-2 border-cream-dark text-charcoal hover:border-primary'
          }`}
        >
          het
        </button>
      </div>

      {/* Tips toggle */}
      <button
        onClick={() => setShowTips(!showTips)}
        className="w-full text-sm text-primary font-medium py-2"
      >
        {showTips ? 'Hide tips' : 'Show de/het tips'}
      </button>

      <AnimatePresence>
        {showTips && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-cream-dark/50 mt-3">
              <h3 className="font-semibold text-sm mb-3">Het-word patterns:</h3>
              <ul className="space-y-1.5">
                {HET_WORD_RULES.map((rule, i) => (
                  <li key={i} className="text-xs text-charcoal/70">• {rule.rule}</li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
