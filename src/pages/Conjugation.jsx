import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Search, Filter, Check, X, ChevronDown, ChevronRight } from 'lucide-react';
import { checkAnswer } from '../utils/dutch';

const conjModule = import.meta.glob('../data/conjugations.json', { eager: true });
let conjData = { verbs: [] };
Object.values(conjModule).forEach((mod) => {
  conjData = mod.default || mod;
});

const PRONOUNS = ['ik', 'jij', 'hij/zij', 'wij', 'jullie', 'zij_plural', 'u'];
const PRONOUN_DISPLAY = {
  ik: 'ik',
  jij: 'jij',
  'hij/zij': 'hij/zij',
  wij: 'wij',
  jullie: 'jullie',
  zij_plural: 'zij (plural)',
  u: 'u',
};
const TENSES = ['present', 'past', 'perfect'];
const TENSE_DISPLAY = { present: 'Present', past: 'Past', perfect: 'Perfect' };
const VERB_TYPES = ['all', 'regular', 'irregular', 'modal'];

export default function Conjugation() {
  const [activeTab, setActiveTab] = useState('reference'); // 'reference' | 'practice'

  return (
    <div className="px-4 pt-6 pb-4">
      {/* Header */}
      <motion.h1
        className="font-display text-2xl font-semibold text-charcoal mb-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Verb Conjugation
      </motion.h1>

      {/* Tab switcher */}
      <div className="flex bg-cream-dark rounded-xl p-1 mb-5">
        {['reference', 'practice'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab
                ? 'bg-white text-charcoal shadow-sm'
                : 'text-charcoal/50'
            }`}
          >
            {tab === 'reference' ? 'Reference' : 'Practice'}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'reference' ? (
          <motion.div
            key="reference"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <ReferenceMode />
          </motion.div>
        ) : (
          <motion.div
            key="practice"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            <PracticeMode />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ReferenceMode() {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [expandedVerb, setExpandedVerb] = useState(null);
  const [showFilter, setShowFilter] = useState(false);

  const verbs = conjData.verbs || [];

  const filteredVerbs = useMemo(() => {
    return verbs.filter((verb) => {
      const matchesType = filterType === 'all' || verb.type === filterType;
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        verb.infinitive.toLowerCase().includes(q) ||
        verb.meaning.toLowerCase().includes(q);
      return matchesType && matchesSearch;
    });
  }, [search, filterType, verbs]);

  const typeCounts = useMemo(() => {
    const counts = { all: verbs.length, regular: 0, irregular: 0, modal: 0 };
    verbs.forEach((v) => {
      if (counts[v.type] !== undefined) counts[v.type]++;
    });
    return counts;
  }, [verbs]);

  return (
    <div>
      {/* Search */}
      <div className="relative mb-3">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/40"
        />
        <input
          type="text"
          placeholder="Search verbs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white rounded-xl pl-10 pr-12 py-2.5 text-sm border border-cream-dark/50 focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/20"
        />
        <button
          onClick={() => setShowFilter(!showFilter)}
          className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${
            filterType !== 'all'
              ? 'bg-primary/10 text-primary'
              : 'text-charcoal/40 hover:text-charcoal/60'
          }`}
        >
          <Filter size={16} />
        </button>
      </div>

      {/* Filter chips */}
      <AnimatePresence>
        {showFilter && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex gap-2 mb-3 flex-wrap">
              {VERB_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    filterType === type
                      ? 'bg-primary text-white'
                      : 'bg-white text-charcoal/60 border border-cream-dark/50'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)} ({typeCounts[type]})
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Verb count */}
      <p className="text-xs text-charcoal/40 mb-3">
        {filteredVerbs.length} verb{filteredVerbs.length !== 1 ? 's' : ''}
      </p>

      {/* Verb list */}
      <div className="space-y-2">
        {filteredVerbs.map((verb, i) => (
          <VerbCard
            key={verb.infinitive}
            verb={verb}
            isExpanded={expandedVerb === verb.infinitive}
            onToggle={() =>
              setExpandedVerb(
                expandedVerb === verb.infinitive ? null : verb.infinitive
              )
            }
            index={i}
          />
        ))}
      </div>

      {filteredVerbs.length === 0 && (
        <div className="text-center py-8">
          <p className="text-charcoal/40 text-sm">No verbs found</p>
        </div>
      )}
    </div>
  );
}

function VerbCard({ verb, isExpanded, onToggle, index }) {
  const typeColor = {
    regular: 'bg-success/10 text-success',
    irregular: 'bg-primary/10 text-primary',
    modal: 'bg-info/10 text-info',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.3) }}
      className="bg-white rounded-2xl shadow-sm border border-cream-dark/50 overflow-hidden"
    >
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center gap-3 text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-charcoal">{verb.infinitive}</h3>
            <span
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                typeColor[verb.type] || 'bg-cream-dark text-charcoal/50'
              }`}
            >
              {verb.type}
            </span>
          </div>
          <p className="text-sm text-charcoal/50">{verb.meaning}</p>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={18} className="text-charcoal/30" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-cream-dark/30 pt-3">
              {/* Conjugation table */}
              <ConjugationTable verb={verb} />

              {/* Example sentences */}
              {verb.examples?.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-xs font-semibold text-charcoal/60 uppercase tracking-wide mb-2">
                    Examples
                  </h4>
                  <div className="space-y-2">
                    {verb.examples.map((ex, i) => (
                      <div key={i} className="bg-cream/50 rounded-xl p-3">
                        <p className="text-sm text-charcoal font-medium">{ex.nl}</p>
                        <p className="text-xs text-charcoal/50 mt-0.5">{ex.en}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ConjugationTable({ verb }) {
  const conj = verb.conjugations || {};
  const isIrregular = verb.type === 'irregular' || verb.type === 'modal';

  return (
    <div className="space-y-4">
      {/* Present tense */}
      {conj.present && (
        <TenseTable
          title="Present (Tegenwoordige tijd)"
          conjugations={conj.present}
          isIrregular={isIrregular}
        />
      )}

      {/* Past tense */}
      {conj.past && (
        <TenseTable
          title="Past (Verleden tijd)"
          conjugations={conj.past}
          isIrregular={isIrregular}
        />
      )}

      {/* Perfect */}
      {conj.perfect && (
        <div>
          <h4 className="text-xs font-semibold text-charcoal/60 uppercase tracking-wide mb-2">
            Perfect (Voltooid deelwoord)
          </h4>
          <div className="bg-cream-dark/30 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-charcoal/60">Participle:</span>
              <span
                className={`text-sm font-semibold ${
                  isIrregular ? 'text-primary' : 'text-charcoal'
                }`}
              >
                {conj.perfect.participle}
              </span>
            </div>
            {conj.perfect.example && (
              <p className="text-xs text-charcoal/50 mt-1 italic">
                {conj.perfect.example}
              </p>
            )}
            {verb.auxiliary && (
              <p className="text-xs text-charcoal/40 mt-1">
                Auxiliary: <span className="font-medium">{verb.auxiliary}</span>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TenseTable({ title, conjugations, isIrregular }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-charcoal/60 uppercase tracking-wide mb-2">
        {title}
      </h4>
      <div className="bg-cream-dark/30 rounded-xl overflow-hidden">
        {PRONOUNS.map((pronoun, i) => {
          const form = conjugations[pronoun];
          if (!form) return null;

          return (
            <div
              key={pronoun}
              className={`flex items-center justify-between px-3 py-2 ${
                i !== 0 ? 'border-t border-cream-dark/40' : ''
              }`}
            >
              <span className="text-sm text-charcoal/60 w-24">
                {PRONOUN_DISPLAY[pronoun]}
              </span>
              <span
                className={`text-sm font-medium ${
                  isIrregular ? 'text-primary' : 'text-charcoal'
                }`}
              >
                {form}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PracticeMode() {
  const verbs = conjData.verbs || [];
  const [tense, setTense] = useState('present');
  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState(null); // { correct, answer, userAnswer, exact, verb, pronoun }
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [currentChallenge, setCurrentChallenge] = useState(() => generateChallenge(verbs, 'present'));
  const inputRef = useRef(null);

  function generateChallenge(verbList, selectedTense) {
    if (!verbList.length) return null;

    const verb = verbList[Math.floor(Math.random() * verbList.length)];
    const tenseData = verb.conjugations?.[selectedTense];

    // For perfect tense, we handle it differently
    if (selectedTense === 'perfect') {
      return {
        verb,
        tense: selectedTense,
        pronoun: null,
        correctAnswer: tenseData?.participle || '',
        displayPrompt: `${verb.infinitive} → voltooid deelwoord`,
      };
    }

    if (!tenseData) {
      // Try another random verb, but limit retries to avoid infinite recursion
      const fallbackVerb = verbList.find((v) => {
        const d = v.conjugations?.[selectedTense];
        return d && PRONOUNS.some((p) => d[p]);
      });
      if (!fallbackVerb) return { verb, tense: selectedTense, pronoun: 'ik', correctAnswer: verb.infinitive, displayPrompt: `${verb.infinitive} (${selectedTense})` };
      return generateChallenge([fallbackVerb], selectedTense);
    }

    // Pick a random pronoun that has a conjugation
    const availablePronouns = PRONOUNS.filter((p) => tenseData[p]);
    if (!availablePronouns.length) return { verb, tense: selectedTense, pronoun: 'ik', correctAnswer: verb.infinitive, displayPrompt: `${verb.infinitive} (${selectedTense})` };

    const pronoun = availablePronouns[Math.floor(Math.random() * availablePronouns.length)];
    const correctAnswer = tenseData[pronoun];

    return {
      verb,
      tense: selectedTense,
      pronoun,
      correctAnswer,
      displayPrompt: `${PRONOUN_DISPLAY[pronoun]} ___ (${verb.infinitive})`,
    };
  }

  const handleTenseChange = (newTense) => {
    setTense(newTense);
    setUserInput('');
    setFeedback(null);
    setCurrentChallenge(generateChallenge(verbs, newTense));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!userInput.trim() || !currentChallenge || feedback) return;

    const result = checkAnswer(userInput, currentChallenge.correctAnswer);

    setFeedback({
      correct: result.correct,
      exact: result.exact,
      answer: currentChallenge.correctAnswer,
      userAnswer: userInput.trim(),
      verb: currentChallenge.verb,
      pronoun: currentChallenge.pronoun,
    });

    setScore((s) => ({
      correct: s.correct + (result.correct ? 1 : 0),
      total: s.total + 1,
    }));
  };

  const handleNext = () => {
    setUserInput('');
    setFeedback(null);
    setCurrentChallenge(generateChallenge(verbs, tense));
    // Focus input after state update
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleSkip = () => {
    setFeedback({
      correct: false,
      exact: false,
      answer: currentChallenge.correctAnswer,
      userAnswer: '',
      verb: currentChallenge.verb,
      pronoun: currentChallenge.pronoun,
      skipped: true,
    });
    setScore((s) => ({ ...s, total: s.total + 1 }));
  };

  const handleReset = () => {
    setScore({ correct: 0, total: 0 });
    setFeedback(null);
    setUserInput('');
    setCurrentChallenge(generateChallenge(verbs, tense));
  };

  if (!currentChallenge) {
    return (
      <div className="text-center py-8">
        <p className="text-charcoal/40 text-sm">No conjugation data available</p>
      </div>
    );
  }

  const accuracy =
    score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;

  return (
    <div>
      {/* Tense selector */}
      <div className="flex gap-2 mb-5">
        {TENSES.map((t) => (
          <button
            key={t}
            onClick={() => handleTenseChange(t)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
              tense === t
                ? 'bg-primary text-white shadow-sm'
                : 'bg-white text-charcoal/60 border border-cream-dark/50'
            }`}
          >
            {TENSE_DISPLAY[t]}
          </button>
        ))}
      </div>

      {/* Score display */}
      {score.total > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-between bg-white rounded-xl p-3 shadow-sm border border-cream-dark/50 mb-4"
        >
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-lg font-bold text-charcoal">{score.correct}</p>
              <p className="text-[10px] text-charcoal/40">Correct</p>
            </div>
            <div className="w-px h-8 bg-cream-dark" />
            <div className="text-center">
              <p className="text-lg font-bold text-charcoal">{score.total}</p>
              <p className="text-[10px] text-charcoal/40">Total</p>
            </div>
            <div className="w-px h-8 bg-cream-dark" />
            <div className="text-center">
              <p
                className={`text-lg font-bold ${
                  accuracy >= 80
                    ? 'text-success'
                    : accuracy >= 50
                      ? 'text-warning'
                      : 'text-error'
                }`}
              >
                {accuracy}%
              </p>
              <p className="text-[10px] text-charcoal/40">Accuracy</p>
            </div>
          </div>
          <button
            onClick={handleReset}
            className="text-xs text-charcoal/40 hover:text-charcoal/60 px-2 py-1"
          >
            Reset
          </button>
        </motion.div>
      )}

      {/* Challenge card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${currentChallenge.verb.infinitive}-${currentChallenge.pronoun}-${currentChallenge.tense}`}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-cream-dark/50 mb-4"
        >
          {/* Verb info */}
          <div className="text-center mb-5">
            <span
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full inline-block mb-2 ${
                {
                  regular: 'bg-success/10 text-success',
                  irregular: 'bg-primary/10 text-primary',
                  modal: 'bg-info/10 text-info',
                }[currentChallenge.verb.type] || 'bg-cream-dark text-charcoal/50'
              }`}
            >
              {currentChallenge.verb.type}
            </span>
            <h2 className="font-display text-2xl font-semibold text-charcoal">
              {currentChallenge.verb.infinitive}
            </h2>
            <p className="text-sm text-charcoal/50 mt-0.5">
              {currentChallenge.verb.meaning}
            </p>
          </div>

          {/* Prompt */}
          <div className="bg-cream/80 rounded-xl p-4 text-center mb-5">
            <p className="text-lg text-charcoal font-medium">
              {currentChallenge.displayPrompt}
            </p>
            <p className="text-xs text-charcoal/40 mt-1">
              {TENSE_DISPLAY[currentChallenge.tense]}
              {currentChallenge.tense === 'perfect' && currentChallenge.verb.auxiliary
                ? ` (aux: ${currentChallenge.verb.auxiliary})`
                : ''}
            </p>
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit}>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Type the conjugation..."
                disabled={!!feedback}
                autoComplete="off"
                autoCapitalize="off"
                spellCheck="false"
                className={`w-full text-center text-lg py-3 rounded-xl border-2 transition-all focus:outline-none ${
                  feedback
                    ? feedback.correct
                      ? 'border-success bg-success/5 text-success'
                      : 'border-error bg-error/5 text-error'
                    : 'border-cream-dark/50 focus:border-primary/40 focus:ring-1 focus:ring-primary/20'
                }`}
              />
              {feedback && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {feedback.correct ? (
                    <Check size={20} className="text-success" />
                  ) : (
                    <X size={20} className="text-error" />
                  )}
                </div>
              )}
            </div>

            {!feedback && (
              <div className="flex gap-3 mt-3">
                <button
                  type="button"
                  onClick={handleSkip}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-cream-dark text-charcoal/60"
                >
                  Skip
                </button>
                <button
                  type="submit"
                  disabled={!userInput.trim()}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Check
                </button>
              </div>
            )}
          </form>

          {/* Feedback */}
          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div
                  className={`mt-4 rounded-xl p-4 ${
                    feedback.correct
                      ? 'bg-success/5 border border-success/20'
                      : 'bg-error/5 border border-error/20'
                  }`}
                >
                  {feedback.correct ? (
                    <div className="flex items-center gap-2">
                      <Check size={16} className="text-success" />
                      <span className="text-sm font-semibold text-success">
                        {feedback.exact ? 'Perfect!' : 'Close enough!'}
                      </span>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <X size={16} className="text-error" />
                        <span className="text-sm font-semibold text-error">
                          {feedback.skipped ? 'Skipped' : 'Not quite right'}
                        </span>
                      </div>
                      <p className="text-sm text-charcoal/70">
                        Correct answer:{' '}
                        <span className="font-semibold text-success">
                          {feedback.answer}
                        </span>
                      </p>
                      {feedback.userAnswer && (
                        <p className="text-sm text-charcoal/50 mt-0.5">
                          Your answer:{' '}
                          <span className="text-error">{feedback.userAnswer}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <motion.button
                  onClick={handleNext}
                  className="w-full mt-3 bg-primary text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Next Verb
                  <ChevronRight size={18} />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>

      {/* Quick tips */}
      <div className="bg-primary/5 border border-primary/10 rounded-xl p-3 mt-2">
        <p className="text-xs text-charcoal/60">
          {tense === 'present' &&
            "Tip: Regular verbs follow the stem + ending pattern. Remember: jij/hij/zij add -t to the stem."}
          {tense === 'past' &&
            "Tip: Use the 't kofschip rule: if the stem ends in t, k, f, s, ch, or p, add -te/-ten. Otherwise add -de/-den."}
          {tense === 'perfect' &&
            "Tip: Most past participles start with ge- and end with -t (regular) or -en (irregular). Check if the verb uses 'hebben' or 'zijn'."}
        </p>
      </div>
    </div>
  );
}
