import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Volume2, ChevronDown, X, BookOpen, Play, ArrowLeft, Heart, CheckCircle } from 'lucide-react';
import { useSpeech } from '../hooks/useSpeech';
import { dutchWithArticle, dutchBareWord, shuffle, getEncouragement, getGentleCorrection } from '../utils/dutch';
import { calculateLessonXP } from '../utils/xp';
import MultipleChoice from '../components/MultipleChoice';
import FillInBlank from '../components/FillInBlank';
import MatchPairs from '../components/MatchPairs';
import ListeningExercise from '../components/ListeningExercise';
import SpeakingExercise from '../components/SpeakingExercise';
import LessonComplete from '../components/LessonComplete';
import LevelBadge from '../components/LevelBadge';
import useProgress from '../hooks/useProgress';
import useStreak from '../hooks/useStreak';
import useSRS from '../hooks/useSRS';
import useFavourites from '../hooks/useFavourites';
import { VOCAB_DIFFICULTY, getUserLevel } from '../utils/levels';

// Slug → proper English title
const TOPIC_EN = {
  greetings: 'Greetings',
  'food-drink': 'Food & Drink',
  family: 'Family',
  weather: 'Weather',
  shopping: 'Shopping',
  'time-dates': 'Time & Dates',
  health: 'Health',
  feelings: 'Feelings',
  clothing: 'Clothing',
  work: 'Work',
  directions: 'Directions & Locations',
  housing: 'Housing',
  'daily-routine': 'Daily Routine',
  transport: 'Transport',
  numbers: 'Numbers',
  common_verbs: 'Common Verbs',
  question_words: 'Question Words',
  appointments: 'Appointments',
  hobbies: 'Hobbies',
  adjectives: 'Adjectives',
  government: 'Government',
  banking: 'Banking',
  social: 'Social Life',
  education: 'Education',
  correspondence: 'Correspondence',
  culture: 'Dutch Culture',
  future: 'Future',
  exam: 'Exam Prep',
};

// Load all vocabulary files eagerly
let allTopics = [];
let allWords = [];

function loadVocabulary() {
  const vocabModules = import.meta.glob('../data/vocabulary/*.json', { eager: true });
  const topics = [];
  const words = [];
  Object.values(vocabModules).forEach((mod) => {
    const data = mod.default || mod;
    if (data.words) {
      topics.push({ topic: data.topic, topicNL: data.topicNL, icon: data.icon });
      data.words.forEach((w) => {
        words.push({ ...w, _topic: data.topic, _topicNL: data.topicNL, _icon: data.icon });
      });
    }
  });
  return { topics, words };
}

try {
  const result = loadVocabulary();
  allTopics = result.topics;
  allWords = result.words;
} catch {
  // Will show fallback UI
}

export default function Dictionary() {
  const [query, setQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [expandedWord, setExpandedWord] = useState(null);
  const [practiceTopic, setPracticeTopic] = useState(null);
  const [showLearned, setShowLearned] = useState(false);
  const wordsLearned = useProgress((s) => s.wordsLearned);
  const currentLesson = useProgress((s) => s.currentLesson);
  const userLevel = getUserLevel(currentLesson);

  const learnedCount = useMemo(() => {
    return Object.values(wordsLearned).filter((v) => v.learned).length;
  }, [wordsLearned]);

  const filtered = useMemo(() => {
    let words = allWords;

    if (showLearned) {
      words = words.filter((w) => wordsLearned[w.id]?.learned);
    }

    if (selectedTopic) {
      words = words.filter((w) => w._topic === selectedTopic);
    }

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      words = words.filter(
        (w) =>
          w.dutch.toLowerCase().includes(q) ||
          w.english.toLowerCase().includes(q) ||
          (w.pronunciation && w.pronunciation.toLowerCase().includes(q))
      );
    }

    return words;
  }, [query, selectedTopic, showLearned, wordsLearned]);

  // Group by topic when no search query
  const grouped = useMemo(() => {
    if (query.trim() || selectedTopic) return null;
    const map = {};
    allTopics.forEach((t) => {
      map[t.topic] = { ...t, words: [] };
    });
    allWords.forEach((w) => {
      if (map[w._topic]) map[w._topic].words.push(w);
    });
    return Object.values(map).filter((g) => g.words.length > 0);
  }, [query, selectedTopic]);

  const clearSearch = () => {
    setQuery('');
    setSelectedTopic(null);
    setShowLearned(false);
  };

  if (practiceTopic) {
    const topicWords = practiceTopic.topic === '_learned'
      ? allWords.filter((w) => wordsLearned[w.id]?.learned)
      : allWords.filter((w) => w._topic === practiceTopic.topic);
    return (
      <TopicPractice
        topic={practiceTopic}
        words={topicWords}
        allWords={allWords}
        onBack={() => setPracticeTopic(null)}
      />
    );
  }

  if (allWords.length === 0) {
    return (
      <div className="px-4 pt-6 pb-4 text-center">
        <BookOpen size={32} className="text-charcoal/30 mx-auto mb-3" />
        <p className="text-charcoal/60 text-sm">Loading dictionary...</p>
        <p className="text-charcoal/40 text-xs mt-1">Try refreshing the page</p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <BookOpen size={24} className="text-primary" />
          <h1 className="font-display text-2xl font-semibold text-charcoal">
            Dictionary
          </h1>
        </div>

        <p className="text-sm text-charcoal/60 mb-4">
          {allWords.length} words across {allTopics.length} topics
        </p>
      </motion.div>

      {/* Search bar */}
      <div className="relative mb-4">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/40" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Dutch or English..."
          className="w-full pl-10 pr-10 py-3 bg-white rounded-xl border border-cream-dark/50 text-sm text-charcoal placeholder:text-charcoal/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
        />
        {(query || selectedTopic) && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-cream-dark/50"
          >
            <X size={16} className="text-charcoal/40" />
          </button>
        )}
      </div>

      {/* Learned words toggle */}
      {learnedCount > 0 && (
        <motion.button
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => { setShowLearned(!showLearned); setSelectedTopic(null); }}
          className={`w-full mb-3 flex items-center gap-3 p-3 rounded-xl border transition-colors ${
            showLearned
              ? 'bg-success/10 border-success/30'
              : 'bg-white border-cream-dark/50 hover:border-success/30'
          }`}
        >
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${showLearned ? 'bg-success/20' : 'bg-cream-dark'}`}>
            <CheckCircle size={16} className={showLearned ? 'text-success' : 'text-charcoal/40'} />
          </div>
          <div className="flex-1 text-left">
            <span className={`text-sm font-semibold ${showLearned ? 'text-success' : 'text-charcoal'}`}>
              Words Learned
            </span>
            <span className="text-xs text-charcoal/40 ml-2">{learnedCount} words</span>
          </div>
          {showLearned && learnedCount >= 4 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                const topic = { topic: '_learned', topicNL: 'Geleerde woorden', icon: '✅' };
                setPracticeTopic(topic);
              }}
              className="flex items-center gap-1 px-2.5 py-1 bg-success text-white text-xs font-medium rounded-full"
            >
              <Play size={10} /> Test All
            </button>
          )}
        </motion.button>
      )}

      {/* Topic filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-2 -mx-4 px-4 scrollbar-hide">
        <button
          onClick={() => { setSelectedTopic(null); setShowLearned(false); }}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            !selectedTopic && !showLearned
              ? 'bg-primary text-white'
              : 'bg-white border border-cream-dark/50 text-charcoal/60'
          }`}
        >
          All
        </button>
        {allTopics.map((t) => (
          <button
            key={t.topic}
            onClick={() => { setSelectedTopic(selectedTopic === t.topic ? null : t.topic); setShowLearned(false); }}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              selectedTopic === t.topic
                ? 'bg-primary text-white'
                : 'bg-white border border-cream-dark/50 text-charcoal/60'
            }`}
          >
            {t.icon} {TOPIC_EN[t.topic] || t.topic}
          </button>
        ))}
      </div>

      {/* Results */}
      {query.trim() || selectedTopic ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-charcoal/40">
              {filtered.length} {filtered.length === 1 ? 'result' : 'results'}
              {selectedTopic && !query.trim() && (
                <span> in {TOPIC_EN[selectedTopic] || selectedTopic}</span>
              )}
            </p>
            {selectedTopic && filtered.length >= 4 && (
              <button
                onClick={() => {
                  const t = allTopics.find((tp) => tp.topic === selectedTopic);
                  if (t) setPracticeTopic(t);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-full"
              >
                <Play size={12} /> Practice
              </button>
            )}
          </div>
          <div className="space-y-2">
            {filtered.map((word) => (
              <WordCard
                key={word.id}
                word={word}
                isExpanded={expandedWord === word.id}
                onToggle={() => setExpandedWord(expandedWord === word.id ? null : word.id)}
              />
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <p className="text-charcoal/40 text-sm">No words found</p>
              <p className="text-charcoal/30 text-xs mt-1">Try a different search term</p>
            </div>
          )}
        </div>
      ) : (
        /* Grouped by topic */
        <div className="space-y-4">
          {grouped?.map((group) => (
            <TopicGroup
              key={group.topic}
              group={group}
              expandedWord={expandedWord}
              onToggleWord={(id) => setExpandedWord(expandedWord === id ? null : id)}
              onSelectTopic={() => setSelectedTopic(group.topic)}
              onPractice={() => setPracticeTopic(group)}
              userLevel={userLevel}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TopicGroup({ group, expandedWord, onToggleWord, onSelectTopic, onPractice, userLevel }) {
  const [isOpen, setIsOpen] = useState(false);
  const previewWords = group.words.slice(0, 3);
  const learnedInTopic = useProgress((s) => {
    let count = 0;
    group.words.forEach((w) => { if (s.wordsLearned[w.id]?.learned) count++; });
    return count;
  });

  return (
    <motion.div
      className="bg-white rounded-2xl shadow-sm border border-cream-dark/30 overflow-hidden"
      layout
    >
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-cream/50 transition-colors"
      >
        <span className="text-xl">{group.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm text-charcoal">
              {TOPIC_EN[group.topic] || group.topic}
            </p>
            {VOCAB_DIFFICULTY[group.topic] && (
              <LevelBadge difficulty={VOCAB_DIFFICULTY[group.topic]} userLevel={userLevel} compact />
            )}
          </div>
          <p className="text-xs text-charcoal/40">
            {group.topicNL || group.topic} · {group.words.length} words
            {learnedInTopic > 0 && (
              <span className="text-success"> · {learnedInTopic} learned</span>
            )}
          </p>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={18} className="text-charcoal/30" />
        </motion.div>
      </button>

      {/* Preview (when collapsed) */}
      {!isOpen && (
        <div className="px-4 pb-3">
          <p className="text-xs text-charcoal/40">
            {previewWords.map((w) => w.dutch).join(' · ')}{group.words.length > 3 ? ' · ...' : ''}
          </p>
        </div>
      )}

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2">
              <div className="h-px bg-cream-dark/30 mb-2" />
              {group.words.length >= 4 && (
                <button
                  onClick={(e) => { e.stopPropagation(); onPractice(); }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary/10 text-primary text-sm font-medium rounded-xl hover:bg-primary/20 transition-colors mb-2"
                >
                  <Play size={14} /> Practice these words
                </button>
              )}
              {group.words.map((word) => (
                <WordCard
                  key={word.id}
                  word={word}
                  isExpanded={expandedWord === word.id}
                  onToggle={() => onToggleWord(word.id)}
                  compact
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function WordCard({ word, isExpanded, onToggle, compact = false }) {
  const { speak, isSpeaking } = useSpeech();
  const toggleFavourite = useFavourites((s) => s.toggleFavourite);
  const isFav = useFavourites((s) => s.isFavourite(word.id));
  const isLearned = useProgress((s) => s.wordsLearned[word.id]?.learned);

  const handleSpeak = useCallback(
    (e, slow = false) => {
      e.stopPropagation();
      speak(dutchWithArticle(word), { slow });
    },
    [speak, word]
  );

  const handleFav = useCallback(
    (e) => {
      e.stopPropagation();
      toggleFavourite(word.id, 'word', {
        dutch: word.dutch,
        english: word.english,
        article: word.article,
        pronunciation: word.pronunciation,
      });
    },
    [toggleFavourite, word]
  );

  return (
    <motion.div
      className={`rounded-xl border transition-colors ${
        isExpanded
          ? 'bg-cream/30 border-primary/20'
          : compact
            ? 'bg-cream/20 border-transparent hover:border-cream-dark/30'
            : 'bg-white border-cream-dark/30'
      }`}
      layout
    >
      {/* Header row */}
      <div
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 text-left cursor-pointer"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {word.article && (
              <span className="text-xs text-primary/60 font-medium">{word.article}</span>
            )}
            <span className="font-semibold text-sm text-charcoal truncate">
              {dutchBareWord(word) || word.dutch}
            </span>
            {isLearned && (
              <CheckCircle size={12} className="text-success flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-charcoal/50 truncate">{word.english}</p>
        </div>

        <button
          onClick={handleFav}
          className={`p-1.5 rounded-full transition-colors flex-shrink-0 ${
            isFav ? 'text-error' : 'text-charcoal/20 hover:text-error/50'
          }`}
          aria-label={isFav ? 'Remove from favourites' : 'Add to favourites'}
        >
          <Heart size={14} fill={isFav ? 'currentColor' : 'none'} />
        </button>

        <button
          onClick={(e) => handleSpeak(e)}
          className={`p-2 rounded-full transition-colors flex-shrink-0 ${
            isSpeaking ? 'bg-primary text-white' : 'text-primary/60 hover:bg-primary/10'
          }`}
          aria-label="Listen"
        >
          <Volume2 size={16} />
        </button>
      </div>

      {/* Expanded details */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2">
              <div className="h-px bg-cream-dark/30" />

              {/* Pronunciation */}
              {word.pronunciation && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-charcoal/40">Pronunciation:</span>
                  <span className="text-xs text-charcoal/70">/{word.pronunciation}/</span>
                </div>
              )}

              {/* Audio buttons */}
              <div className="flex gap-2">
                <button
                  onClick={(e) => handleSpeak(e, false)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium"
                >
                  <Volume2 size={12} /> Normal
                </button>
                <button
                  onClick={(e) => handleSpeak(e, true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-cream text-charcoal/60 text-xs font-medium"
                >
                  🐢 Slow
                </button>
              </div>

              {/* Audio hint */}
              {word.audioHint && (
                <div className="bg-warning/5 border border-warning/15 rounded-lg p-2">
                  <p className="text-xs text-charcoal/60">💡 {word.audioHint}</p>
                </div>
              )}

              {/* Plural */}
              {word.plural && (
                <p className="text-xs text-charcoal/50">
                  Plural: <span className="font-medium text-charcoal/70">{word.plural}</span>
                </p>
              )}

              {/* Example */}
              {word.exampleNL && (
                <div className="bg-cream/50 rounded-lg p-2.5">
                  <p className="text-xs text-charcoal/40 mb-1 font-medium">Example:</p>
                  <p className="text-sm text-charcoal font-medium">🇳🇱 {word.exampleNL}</p>
                  {word.exampleEN && (
                    <p className="text-xs text-charcoal/50 mt-1">🇬🇧 {word.exampleEN}</p>
                  )}
                </div>
              )}

              {/* Tags */}
              {word.tags && word.tags.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {word.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-cream-dark/40 text-charcoal/50"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Topic Practice Mode ──

function generateTopicExercises(words, allWordsList) {
  const exercises = [];
  const lessonWords = words.slice(0, 12);

  // Phase 1: Introduce & test in batches
  const batchSize = 4;
  for (let i = 0; i < lessonWords.length; i += batchSize) {
    const batch = lessonWords.slice(i, i + batchSize);
    batch.forEach((word) => exercises.push({ type: 'word_intro', word }));
    batch.forEach((word) => {
      const otherOptions = lessonWords.filter((w) => w.id !== word.id).map((w) => w.english);
      exercises.push({
        type: 'multiple_choice',
        question: `What does "${dutchWithArticle(word)}" mean?`,
        options: shuffle([word.english, ...shuffle(otherOptions).slice(0, 3)]),
        correctAnswer: word.english,
        wordId: word.id,
      });
    });
  }

  // Phase 2: Reverse MC (English → Dutch)
  shuffle(lessonWords).slice(0, 4).forEach((word) => {
    const otherOptions = lessonWords.filter((w) => w.id !== word.id).map((w) => dutchWithArticle(w));
    exercises.push({
      type: 'multiple_choice',
      question: `How do you say "${word.english}" in Dutch?`,
      options: shuffle([dutchWithArticle(word), ...shuffle(otherOptions).slice(0, 3)]),
      correctAnswer: dutchWithArticle(word),
      wordId: word.id,
      direction: 'english-to-dutch',
    });
  });

  // Phase 3: Fill in blank
  shuffle(lessonWords).slice(0, 5).forEach((word) => {
    if (word.exampleNL && word.dutch) {
      const bareWord = dutchBareWord(word) || word.dutch;
      const escaped = bareWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const sentence = word.exampleNL.replace(new RegExp(escaped, 'i'), '___');
      if (sentence !== word.exampleNL) {
        exercises.push({
          type: 'fill_blank',
          sentence,
          answer: bareWord.toLowerCase(),
          hint: `Translate "${word.english}" → Dutch`,
          explanation: word.exampleEN,
          wordId: word.id,
        });
      }
    }
  });

  // Phase 4: Listening
  shuffle(lessonWords).slice(0, 3).forEach((word) => {
    const text = word.exampleNL || dutchWithArticle(word);
    const otherOptions = lessonWords.filter((w) => w.id !== word.id).slice(0, 3).map((w) => w.exampleNL || w.dutch);
    exercises.push({
      type: 'listening',
      text,
      options: shuffle([text, ...otherOptions]),
      correctAnswer: text,
      wordId: word.id,
    });
  });

  // Phase 5: Match pairs
  if (lessonWords.length >= 5) {
    exercises.push({
      type: 'match_pairs',
      pairs: shuffle(lessonWords).slice(0, 5).map((w) => ({
        dutch: dutchWithArticle(w),
        english: w.english,
      })),
    });
  }

  // Phase 6: Speaking
  shuffle(lessonWords).slice(0, 2).forEach((word) => {
    const text = word.exampleNL || dutchWithArticle(word);
    exercises.push({
      type: 'speaking',
      text,
      translation: word.exampleEN || word.english,
    });
  });

  return exercises;
}

function TopicPractice({ topic, words, allWords: allWordsList, onBack }) {
  const learnWord = useProgress((s) => s.learnWord);
  const addXP = useProgress((s) => s.addXP);
  const recordExercise = useProgress((s) => s.recordExercise);
  const completeSpeakingGoal = useProgress((s) => s.completeSpeakingGoal);
  const completeLessonGoal = useProgress((s) => s.completeLessonGoal);
  const recordActivity = useStreak((s) => s.recordActivity);
  const addSRSItem = useSRS((s) => s.addItem);

  const [exercises] = useState(() => generateTopicExercises(words, allWordsList));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [mistakeCount, setMistakeCount] = useState(0);
  const [wordsIntroduced, setWordsIntroduced] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [isComplete, setIsComplete] = useState(false);
  const [correctStreak, setCorrectStreak] = useState(0);
  const advanceTimerRef = useRef(null);
  const handleNextRef = useRef(null);

  useEffect(() => {
    return () => { if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current); };
  }, []);

  const currentExercise = exercises[currentIndex];
  const progress = exercises.length > 0
    ? Math.min(currentIndex + 1, exercises.length) / exercises.length
    : 0;

  const handleNext = useCallback(() => {
    if (advanceTimerRef.current) { clearTimeout(advanceTimerRef.current); advanceTimerRef.current = null; }
    setFeedback(null);
    if (currentIndex + 1 >= exercises.length) {
      if (!isComplete) {
        const totalQ = correctCount + mistakeCount;
        const xp = calculateLessonXP({ correctAnswers: correctCount, totalQuestions: totalQ, mistakes: mistakeCount });
        addXP(xp);
        recordActivity(xp);
        completeLessonGoal();
        setIsComplete(true);
      }
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }, [currentIndex, exercises.length, correctCount, mistakeCount, isComplete, addXP, recordActivity, completeLessonGoal]);

  // Keep ref in sync so timers always call the latest version
  useEffect(() => { handleNextRef.current = handleNext; }, [handleNext]);

  const handleAnswer = useCallback(
    (isCorrect, wordId) => {
      if (isCorrect) {
        const newStreak = correctStreak + 1;
        setCorrectStreak(newStreak);
        setCorrectCount((c) => c + 1);
        let message = getEncouragement();
        if (newStreak === 3) message = '3 in a row! Lekker bezig!';
        else if (newStreak === 5) message = '5 streak! Je bent on fire!';
        else if (newStreak === 7) message = '7 in a row! Ongelooflijk!';
        setFeedback({ type: 'correct', message });
      } else {
        setCorrectStreak(0);
        setMistakeCount((m) => m + 1);
        let message = getGentleCorrection();
        if (currentExercise?.correctAnswer) {
          message = `The answer is "${currentExercise.correctAnswer}". ${message}`;
        }
        setFeedback({ type: 'incorrect', message });
        if (wordId) addSRSItem(wordId, 'vocabulary');
      }
      if (wordId) recordExercise(isCorrect, currentExercise?.type || 'unknown');
      if (currentExercise?.type === 'speaking') completeSpeakingGoal();
      advanceTimerRef.current = setTimeout(() => handleNextRef.current(), isCorrect ? 1200 : 2500);
    },
    [currentExercise, recordExercise, addSRSItem, completeSpeakingGoal, correctStreak]
  );

  const handleWordIntro = useCallback(
    (word) => { learnWord(word.id); addSRSItem(word.id, 'vocabulary'); setWordsIntroduced((w) => w + 1); },
    [learnWord, addSRSItem]
  );

  if (isComplete) {
    const totalQ = correctCount + mistakeCount;
    return (
      <LessonComplete
        xpEarned={calculateLessonXP({ correctAnswers: correctCount, totalQuestions: totalQ, mistakes: mistakeCount })}
        accuracy={totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 100}
        wordsLearned={wordsIntroduced}
        mistakeCount={mistakeCount}
        onContinue={onBack}
        onReviewMistakes={null}
      />
    );
  }

  if (exercises.length === 0) {
    return (
      <div className="px-4 pt-12 text-center">
        <p className="text-charcoal/60 mb-4">Not enough words to generate exercises for this topic.</p>
        <button onClick={onBack} className="text-primary font-medium">← Back to Dictionary</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <div className="sticky top-0 bg-cream/95 backdrop-blur-sm z-40 px-4 pt-4 pb-2">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-full hover:bg-cream-dark transition-colors" aria-label="Back to dictionary">
            <ArrowLeft size={20} className="text-charcoal/60" />
          </button>
          <div className="flex-1 h-2.5 bg-cream-dark rounded-full overflow-hidden">
            <motion.div className="h-full bg-primary rounded-full" animate={{ width: `${progress * 100}%` }} transition={{ duration: 0.3 }} />
          </div>
          <span className="text-xs text-charcoal/50 font-medium min-w-[32px] text-right">
            {Math.min(currentIndex + 1, exercises.length)}/{exercises.length}
          </span>
        </div>
        <p className="text-xs text-charcoal/40 mt-1 ml-10">
          {topic.icon} {topic.topic === '_learned' ? 'Words Learned' : (TOPIC_EN[topic.topic] || topic.topic)}
        </p>
      </div>

      {/* Exercise area */}
      <div className="px-4 pt-4 pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25 }}
          >
            {currentExercise?.type === 'word_intro' && (
              <PracticeWordIntro word={currentExercise.word} onLearn={handleWordIntro} onNext={handleNext} />
            )}
            {currentExercise?.type === 'multiple_choice' && (
              <MultipleChoice
                question={currentExercise.question}
                options={currentExercise.options}
                correctAnswer={currentExercise.correctAnswer}
                onAnswer={(correct) => handleAnswer(correct, currentExercise.wordId)}
                type={currentExercise.direction === 'english-to-dutch' ? 'english-to-dutch' : 'dutch-to-english'}
              />
            )}
            {currentExercise?.type === 'fill_blank' && (
              <FillInBlank
                sentence={currentExercise.sentence}
                answer={currentExercise.answer}
                hint={currentExercise.hint}
                explanation={currentExercise.explanation}
                onAnswer={(correct) => handleAnswer(correct, currentExercise.wordId)}
              />
            )}
            {currentExercise?.type === 'listening' && (
              <ListeningExercise
                text={currentExercise.text}
                options={currentExercise.options}
                correctAnswer={currentExercise.correctAnswer}
                onAnswer={(correct) => handleAnswer(correct, currentExercise.wordId)}
              />
            )}
            {currentExercise?.type === 'match_pairs' && (
              <MatchPairs
                pairs={currentExercise.pairs}
                onComplete={(mistakes) => {
                  if (mistakes === 0) setCorrectCount((c) => c + 1);
                  else setMistakeCount((m) => m + mistakes);
                  advanceTimerRef.current = setTimeout(() => handleNextRef.current(), 1500);
                }}
              />
            )}
            {currentExercise?.type === 'speaking' && (
              <SpeakingExercise
                text={currentExercise.text}
                translation={currentExercise.translation}
                onAnswer={(correct) => handleAnswer(correct)}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Feedback toast */}
        <AnimatePresence>
          {feedback && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`fixed bottom-24 left-4 right-4 mx-auto max-w-lg p-4 rounded-xl text-center font-semibold ${
                feedback.type === 'correct' ? 'bg-success text-white' : 'bg-error/90 text-white'
              }`}
            >
              {feedback.message}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function PracticeWordIntro({ word, onLearn, onNext }) {
  const { speak, isSpeaking } = useSpeech();

  useEffect(() => {
    onLearn(word);
    const timer = setTimeout(() => speak(dutchWithArticle(word)), 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word.id]);

  return (
    <div className="text-center py-4">
      <p className="text-sm text-charcoal/50 mb-2 uppercase tracking-wide font-medium">New word</p>
      <motion.div
        className="bg-white rounded-3xl p-8 shadow-sm border border-cream-dark/50 mb-4"
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        <div className="text-3xl font-display font-semibold text-charcoal mb-2">
          {word.article && <span className="text-primary/60 text-2xl">{word.article} </span>}
          {dutchBareWord(word)}
        </div>
        <div className="flex items-center justify-center gap-2 mb-4">
          <button
            onClick={() => speak(dutchWithArticle(word))}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors ${
              isSpeaking ? 'bg-primary text-white' : 'text-primary hover:bg-primary/5'
            }`}
          >
            <Volume2 size={16} />
            <span className="text-sm font-medium">{word.pronunciation || 'Listen'}</span>
          </button>
          <button
            onClick={() => speak(dutchWithArticle(word), { slow: true })}
            className="px-3 py-1.5 rounded-full bg-cream text-charcoal/60 hover:bg-primary/10 text-xs font-medium transition-colors"
          >
            🐢 Slow
          </button>
        </div>
        <div className="text-xl text-charcoal/70 mb-4">{word.english}</div>
        {word.exampleNL && (
          <div className="mt-4 pt-4 border-t border-cream-dark/50 text-left">
            <p className="text-sm font-medium text-charcoal">🇳🇱 {word.exampleNL}</p>
            {word.exampleEN && <p className="text-xs text-charcoal/50 mt-1">🇬🇧 {word.exampleEN}</p>}
          </div>
        )}
      </motion.div>
      <button onClick={onNext} className="w-full bg-primary text-white font-semibold py-3 rounded-xl hover:bg-primary-dark transition-colors">
        Continue
      </button>
    </div>
  );
}
