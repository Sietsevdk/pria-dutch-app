import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, Search, Check, ChevronRight, Star, ArrowLeft, Heart } from 'lucide-react';
import FillInBlank from '../components/FillInBlank';
import MultipleChoice from '../components/MultipleChoice';
import LevelBadge from '../components/LevelBadge';
import useProgress from '../hooks/useProgress';
import useFavourites from '../hooks/useFavourites';
import { shuffle, checkAnswer } from '../utils/dutch';
import { COMMON_HET_WORDS, HET_WORD_RULES } from '../utils/dutch';
import { GRAMMAR_DIFFICULTY, getUserLevel } from '../utils/levels';

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
  const currentLesson = useProgress((s) => s.currentLesson);
  const userLevel = getUserLevel(currentLesson);

  const filteredGrammar = useMemo(() => {
    if (!search) return allGrammar;
    const q = search.toLowerCase();
    return allGrammar.filter(
      (g) =>
        g.topic?.toLowerCase().includes(q) ||
        g.topicNL?.toLowerCase().includes(q) ||
        g.topicEN?.toLowerCase().includes(q) ||
        g.explanation?.summaryEN?.toLowerCase().includes(q) ||
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
      <GrammarTopicList
        topics={filteredGrammar}
        grammarMastered={grammarMastered}
        userLevel={userLevel}
        onSelect={(topic) => setSelectedTopic(topic)}
      />
    </div>
  );
}

function GrammarTopicList({ topics, grammarMastered, userLevel, onSelect }) {
  const toggleFavourite = useFavourites((s) => s.toggleFavourite);
  const favourites = useFavourites((s) => s.favourites);
  const favIds = new Set(favourites.filter((f) => f.type === 'grammar').map((f) => f.id));

  return (
    <div className="space-y-2">
      {topics.map((topic, i) => {
        const mastered = grammarMastered[topic.topic]?.mastered;
        const isFav = favIds.has(topic.topic);
        return (
          <motion.div
            key={topic.topic}
            className="bg-white rounded-2xl shadow-sm border border-cream-dark/50 flex items-center gap-3 text-left overflow-hidden"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
          >
            <button
              onClick={() => onSelect(topic.topic)}
              className="flex-1 flex items-center gap-3 p-4 min-w-0"
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
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
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold text-sm text-charcoal truncate">
                    {topic.topicEN || topic.topicNL || topic.topic}
                  </h3>
                  <LevelBadge difficulty={GRAMMAR_DIFFICULTY[topic.topic] || 2} userLevel={userLevel} compact />
                </div>
                <p className="text-xs text-charcoal/50 truncate">
                  {topic.explanation?.summaryEN || topic.explanation?.summary}
                </p>
              </div>
              <ChevronRight size={16} className="text-charcoal/30 shrink-0" />
            </button>
            <button
              onClick={() =>
                toggleFavourite(topic.topic, 'grammar', {
                  title: topic.topicEN || topic.topicNL || topic.topic,
                  summary: topic.explanation?.summaryEN || topic.explanation?.summary,
                })
              }
              className={`p-2 mr-2 rounded-full transition-colors shrink-0 ${
                isFav ? 'text-error' : 'text-charcoal/20 hover:text-error/50'
              }`}
              aria-label={isFav ? 'Remove from favourites' : 'Add to favourites'}
            >
              <Heart size={14} fill={isFav ? 'currentColor' : 'none'} />
            </button>
          </motion.div>
        );
      })}
    </div>
  );
}

function GrammarDetail({ topic, onBack }) {
  const [showExercises, setShowExercises] = useState(false);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [sectionIndex, setSectionIndex] = useState(0);
  const masterGrammar = useProgress((s) => s.masterGrammar);
  const exerciseTimerRef = useRef(null);

  useEffect(() => {
    return () => { if (exerciseTimerRef.current) clearTimeout(exerciseTimerRef.current); };
  }, []);

  const exercises = topic.exercises || [];

  // Build paginated sections from the topic data
  const sections = [];
  const expl = topic.explanation;
  if (expl) {
    // Section 1: Summary
    if (expl.summaryEN || expl.summary) {
      sections.push({ type: 'summary', text: expl.summaryEN || expl.summary, textNL: expl.summaryEN ? expl.summary : null });
    }
    // One section per rule
    const rules = expl.rulesEN || expl.rules || [];
    const rulesNL = expl.rulesEN ? (expl.rules || []) : [];
    rules.forEach((rule, i) => {
      sections.push({ type: 'rule', index: i, total: rules.length, text: rule, textNL: rulesNL[i] || null });
    });
    // Exceptions (grouped)
    const exceptions = expl.exceptionsEN || expl.exceptions || [];
    if (exceptions.length > 0) {
      sections.push({ type: 'exceptions', items: exceptions, itemsNL: expl.exceptionsEN ? (expl.exceptions || []) : [] });
    }
    // Common mistakes (grouped)
    const mistakes = expl.commonMistakesEN || expl.commonMistakes || [];
    if (mistakes.length > 0) {
      sections.push({ type: 'mistakes', items: mistakes, itemsNL: expl.commonMistakesEN ? (expl.commonMistakes || []) : [] });
    }
    // Examples (practical sentences showing the grammar in action)
    const examples = expl.examples || [];
    if (examples.length > 0) {
      sections.push({ type: 'examples', items: examples });
    }
    // Tip
    if (expl.tipEN || expl.tip) {
      sections.push({ type: 'tip', text: expl.tipEN || expl.tip, textNL: expl.tipEN ? expl.tip : null });
    }
  }

  // Track grammar mastery when exercises are completed
  const isComplete = showExercises && exerciseIndex >= exercises.length && exercises.length > 0;
  const accuracy = isComplete && score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;
  const [masteryRecorded, setMasteryRecorded] = useState(false);

  useEffect(() => {
    if (isComplete && !masteryRecorded) {
      masterGrammar(topic.topic, accuracy);
      setMasteryRecorded(true);
    }
  }, [isComplete, masteryRecorded, masterGrammar, topic.topic, accuracy]);

  if (showExercises && exercises.length > 0) {
    const ex = exercises[exerciseIndex];

    if (isComplete) {
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
        <button onClick={() => { if (exerciseTimerRef.current) { clearTimeout(exerciseTimerRef.current); exerciseTimerRef.current = null; } onBack(); }} className="text-sm text-primary font-medium mb-4">
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
            explanation={ex.explanationEN || ex.explanation}
            onAnswer={(correct) => {
              setScore((s) => ({
                correct: s.correct + (correct ? 1 : 0),
                total: s.total + 1,
              }));
              exerciseTimerRef.current = setTimeout(() => setExerciseIndex((i) => i + 1), 1500);
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
              exerciseTimerRef.current = setTimeout(() => setExerciseIndex((i) => i + 1), 1500);
            }}
          />
        )}
        {ex.type === 'reorder' && (
          <div key={exerciseIndex} className="w-full max-w-md mx-auto">
            <ReorderExercise
              sentence={ex.sentence}
              answer={ex.answer}
              words={ex.words}
              explanation={ex.explanationEN || ex.explanation}
              onAnswer={(correct) => {
                setScore((s) => ({
                  correct: s.correct + (correct ? 1 : 0),
                  total: s.total + 1,
                }));
                exerciseTimerRef.current = setTimeout(() => setExerciseIndex((i) => i + 1), 1500);
              }}
            />
          </div>
        )}
        {!['fill_blank', 'multiple_choice', 'reorder'].includes(ex?.type) && (
          <div className="text-center text-charcoal/60 py-8">
            <p className="mb-3">Unsupported exercise type</p>
            <button
              onClick={() => setExerciseIndex((i) => i + 1)}
              className="text-primary font-medium"
            >
              Skip →
            </button>
          </div>
        )}
      </div>
    );
  }

  const currentSection = sections[sectionIndex];
  const isLastSection = sectionIndex >= sections.length - 1;

  // If no explanation content is available, show a simple message
  if (sections.length === 0 || !currentSection) {
    return (
      <div className="px-4 pt-6 pb-4">
        <button onClick={onBack} className="text-sm text-primary font-medium flex items-center gap-1 mb-4">
          <ArrowLeft size={14} /> Back
        </button>
        <h2 className="font-display text-xl font-semibold text-charcoal mb-2">{topic.title || topic.topic}</h2>
        <p className="text-charcoal/60 text-sm">No explanation content available for this topic yet.</p>
        {exercises.length > 0 && (
          <button onClick={() => setShowExercises(true)} className="mt-4 w-full py-3 bg-primary text-white font-semibold rounded-xl">
            Practice Exercises ({exercises.length})
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="text-sm text-primary font-medium flex items-center gap-1">
          <ArrowLeft size={14} /> Back
        </button>
        {sections.length > 0 && (
          <span className="text-xs text-charcoal/40">{sectionIndex + 1} / {sections.length}</span>
        )}
      </div>

      <h1 className="font-display text-xl font-semibold text-charcoal mb-0.5">
        {topic.topicEN || topic.topicNL || topic.topic}
      </h1>
      {topic.topicNL && (
        <p className="text-xs text-charcoal/40 italic mb-4">{topic.topicNL}</p>
      )}

      {/* Paginated section card */}
      {currentSection && (
        <AnimatePresence mode="wait">
          <motion.div
            key={sectionIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl p-5 shadow-sm border border-cream-dark/50 mb-4 min-h-[180px]"
          >
            {currentSection.type === 'summary' && (
              <div>
                <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-3">Overview</p>
                <p className="text-charcoal/80 leading-relaxed">{currentSection.text}</p>
                {currentSection.textNL && (
                  <p className="text-sm text-charcoal/40 italic mt-3 leading-relaxed">{currentSection.textNL}</p>
                )}
              </div>
            )}
            {currentSection.type === 'rule' && (
              <div>
                <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-3">
                  Rule {currentSection.index + 1} of {currentSection.total}
                </p>
                <p className="text-charcoal/80 leading-relaxed">{currentSection.text}</p>
                {currentSection.textNL && (
                  <p className="text-sm text-charcoal/40 italic mt-3 leading-relaxed">{currentSection.textNL}</p>
                )}
              </div>
            )}
            {currentSection.type === 'exceptions' && (
              <div>
                <p className="text-xs font-semibold text-warning uppercase tracking-wide mb-3">⚠ Exceptions</p>
                <ul className="space-y-2">
                  {currentSection.items.map((ex, i) => (
                    <li key={i}>
                      <p className="text-sm text-charcoal/80">{ex}</p>
                      {currentSection.itemsNL?.[i] && (
                        <p className="text-xs text-charcoal/40 italic mt-0.5">{currentSection.itemsNL[i]}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {currentSection.type === 'mistakes' && (
              <div>
                <p className="text-xs font-semibold text-error uppercase tracking-wide mb-3">❌ Common Mistakes</p>
                <ul className="space-y-2">
                  {currentSection.items.map((m, i) => (
                    <li key={i}>
                      <p className="text-sm text-charcoal/80">{m}</p>
                      {currentSection.itemsNL?.[i] && (
                        <p className="text-xs text-charcoal/40 italic mt-0.5">{currentSection.itemsNL[i]}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {currentSection.type === 'examples' && (
              <div>
                <p className="text-xs font-semibold text-success uppercase tracking-wide mb-3">📝 Examples</p>
                <div className="space-y-3">
                  {currentSection.items.map((ex, i) => (
                    <div key={i} className="bg-cream/50 rounded-lg p-3">
                      <p className="text-sm font-medium text-charcoal">🇳🇱 {ex.nl}</p>
                      <p className="text-xs text-charcoal/50 mt-0.5">🇬🇧 {ex.en}</p>
                      {ex.note && (
                        <p className="text-[10px] text-primary/70 mt-1 italic">↳ {ex.note}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {currentSection.type === 'tip' && (
              <div>
                <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-3">💡 Tip</p>
                <p className="text-charcoal/80 leading-relaxed">{currentSection.text}</p>
                {currentSection.textNL && (
                  <p className="text-sm text-charcoal/40 italic mt-3 leading-relaxed">{currentSection.textNL}</p>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Navigation */}
      <div className="flex gap-3 mb-3">
        {sectionIndex > 0 && (
          <button
            onClick={() => setSectionIndex((i) => i - 1)}
            className="flex-1 py-3 rounded-xl text-sm font-medium bg-cream-dark text-charcoal/70"
          >
            ← Previous
          </button>
        )}
        {!isLastSection ? (
          <button
            onClick={() => setSectionIndex((i) => i + 1)}
            className="flex-1 py-3 rounded-xl text-sm font-semibold bg-primary text-white"
          >
            Next →
          </button>
        ) : exercises.length > 0 ? (
          <button
            onClick={() => {
              setShowExercises(true);
              setExerciseIndex(0);
              setScore({ correct: 0, total: 0 });
            }}
            className="flex-1 py-3 rounded-xl text-sm font-semibold bg-primary text-white"
          >
            Practice ({exercises.length} exercises) →
          </button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Get a mnemonic hint for why a word uses a particular article.
 */
function getMnemonicHint(noun) {
  const word = noun.dutch?.toLowerCase() || '';
  // Only explain WHY it's a het-word if it actually IS a het-word
  if (noun.article === 'het') {
    for (const rule of HET_WORD_RULES) {
      if (rule.pattern && rule.pattern.test(word)) {
        return `Tip: ${rule.rule}`;
      }
    }
    const fullForm = `het ${word}`;
    if (COMMON_HET_WORDS.some((hw) => hw.toLowerCase() === fullForm)) {
      return `"het ${noun.dutch}" is a common het-word - try to memorize it!`;
    }
    return 'This is a het-word — try making a mental image to remember it!';
  }
  // de-word
  return `This is a de-word — most Dutch nouns use "de". Try to remember the exceptions!`;
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
  const guessTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (guessTimerRef.current) clearTimeout(guessTimerRef.current);
    };
  }, []);

  const handleGuess = (article) => {
    setAnswered(article);
    const isCorrect = article === currentNoun.article;
    const newCorrect = stats.correct + (isCorrect ? 1 : 0);
    setStats((s) => ({
      correct: newCorrect,
      total: s.total + 1,
    }));
    setStreak((s) => (isCorrect ? s + 1 : 0));

    guessTimerRef.current = setTimeout(() => {
      setAnswered(null);
      setIKnewIt(false);
      setCurrentNoun(pickNoun(newCorrect));
    }, 2000);
  };

  const handleIKnewIt = () => {
    setIKnewIt(true);
    // Visual feedback only — don't inflate stats since it was originally wrong
    // Streak continues to motivate the user
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

/**
 * ReorderExercise — Drag-free word ordering exercise for grammar practice.
 * Renders words as tappable buttons to build a sentence in correct order.
 */
function ReorderExercise({ sentence, answer, words, explanation, onAnswer }) {
  const [selected, setSelected] = useState([]);
  const [available, setAvailable] = useState(() => shuffle(words || answer?.split(' ') || []));
  const [result, setResult] = useState(null);
  const answeredRef = useRef(false);

  const handleTapWord = (word, index) => {
    if (result) return;
    setSelected((prev) => [...prev, word]);
    setAvailable((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveWord = (word, index) => {
    if (result) return;
    setAvailable((prev) => [...prev, word]);
    setSelected((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCheck = () => {
    if (answeredRef.current) return;
    answeredRef.current = true;
    const userAnswer = selected.join(' ');
    const isCorrect = checkAnswer(userAnswer, answer, 1).correct;
    setResult({ correct: isCorrect });
    if (onAnswer) onAnswer(isCorrect);
  };

  return (
    <div>
      {sentence && (
        <p className="text-sm text-charcoal/60 mb-3 text-center">{sentence}</p>
      )}

      {/* Built sentence area */}
      <div className="min-h-[56px] bg-white rounded-xl border-2 border-cream-dark/40 p-3 mb-4 flex flex-wrap gap-2">
        {selected.length === 0 ? (
          <span className="text-charcoal/30 text-sm">Tap words to build the sentence...</span>
        ) : (
          selected.map((word, i) => (
            <motion.button
              key={`sel-${i}-${word}`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={() => handleRemoveWord(word, i)}
              disabled={!!result}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                result
                  ? result.correct
                    ? 'bg-success/10 text-success border border-success/30'
                    : 'bg-error/10 text-error border border-error/30'
                  : 'bg-primary/10 text-primary border border-primary/30'
              }`}
            >
              {word}
            </motion.button>
          ))
        )}
      </div>

      {/* Available words */}
      <div className="flex flex-wrap gap-2 justify-center mb-4">
        {available.map((word, i) => (
          <motion.button
            key={`avail-${i}-${word}`}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleTapWord(word, i)}
            disabled={!!result}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-cream-dark text-charcoal hover:bg-cream-dark/80 transition-colors"
          >
            {word}
          </motion.button>
        ))}
      </div>

      {/* Check button */}
      {!result && (
        <button
          onClick={handleCheck}
          disabled={selected.length === 0}
          className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors ${
            selected.length > 0
              ? 'bg-primary text-white hover:bg-primary-dark'
              : 'bg-cream text-charcoal/40 cursor-not-allowed'
          }`}
        >
          Check
        </button>
      )}

      {/* Feedback */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl text-sm font-medium ${
            result.correct ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
          }`}
        >
          {result.correct ? (
            <p className="flex items-center gap-2"><Check size={16} /> Correct!</p>
          ) : (
            <div>
              <p className="flex items-center gap-2"><Star size={16} /> Not quite.</p>
              <p className="mt-1 text-charcoal/70">Correct order: <span className="font-bold text-charcoal">{answer}</span></p>
            </div>
          )}
          {explanation && (
            <p className="mt-2 text-charcoal/60 text-xs">{explanation}</p>
          )}
        </motion.div>
      )}
    </div>
  );
}
