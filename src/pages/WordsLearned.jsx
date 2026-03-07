import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Volume2, ChevronRight, Search } from 'lucide-react';
import { useSpeech } from '../hooks/useSpeech';
import useProgress from '../hooks/useProgress';
import { dutchWithArticle, dutchBareWord } from '../utils/dutch';
import { VOCAB_DIFFICULTY } from '../utils/levels';

// Load all vocabulary files eagerly
const vocabModules = import.meta.glob('../data/vocabulary/*.json', { eager: true });
const allVocabWords = [];
Object.values(vocabModules).forEach((mod) => {
  const data = mod.default || mod;
  if (data.words) {
    data.words.forEach((w) => {
      allVocabWords.push({ ...w, _topic: data.topic, _topicNL: data.topicNL, _icon: data.icon });
    });
  }
});

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
  directions: 'Directions',
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

export default function WordsLearned() {
  const navigate = useNavigate();
  const wordsLearned = useProgress((s) => s.wordsLearned);
  const { speak } = useSpeech();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('recent'); // 'recent' | 'topic' | 'accuracy'

  // Build learned words list with full data
  const learnedWords = useMemo(() => {
    return Object.entries(wordsLearned)
      .filter(([, v]) => v.learned)
      .map(([wordId, progress]) => {
        const word = allVocabWords.find((w) => w.id === wordId);
        if (!word) return null;
        return { ...word, progress };
      })
      .filter(Boolean);
  }, [wordsLearned]);

  // Filter by search
  const filtered = useMemo(() => {
    let words = learnedWords;
    if (search.trim()) {
      const q = search.toLowerCase();
      words = words.filter(
        (w) =>
          w.dutch.toLowerCase().includes(q) ||
          w.english.toLowerCase().includes(q)
      );
    }
    // Sort
    if (sortBy === 'recent') {
      words = [...words].sort(
        (a, b) => new Date(b.progress.learnedAt) - new Date(a.progress.learnedAt)
      );
    } else if (sortBy === 'accuracy') {
      words = [...words].sort(
        (a, b) => (a.progress.accuracy || 0) - (b.progress.accuracy || 0)
      );
    }
    return words;
  }, [learnedWords, search, sortBy]);

  // Group by topic
  const grouped = useMemo(() => {
    if (sortBy !== 'topic') return null;
    const map = {};
    filtered.forEach((w) => {
      const topic = w._topic || 'other';
      if (!map[topic]) {
        map[topic] = { topic, topicNL: w._topicNL, icon: w._icon, words: [] };
      }
      map[topic].words.push(w);
    });
    return Object.values(map).sort((a, b) => {
      const da = VOCAB_DIFFICULTY[a.topic] || 1;
      const db = VOCAB_DIFFICULTY[b.topic] || 1;
      return da - db;
    });
  }, [filtered, sortBy]);

  const handleWordClick = (word) => {
    if (word._topic === 'common_verbs') {
      navigate('/conjugation');
    } else {
      navigate('/dictionary');
    }
  };

  return (
    <div className="px-4 pt-6 pb-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate(-1)}
          className="p-1.5 rounded-full hover:bg-cream-dark transition-colors"
        >
          <ArrowLeft size={20} className="text-charcoal/60" />
        </button>
        <div>
          <h1 className="font-display text-2xl font-semibold text-charcoal">
            Words Learned
          </h1>
          <p className="text-sm text-charcoal/60">
            {learnedWords.length} word{learnedWords.length !== 1 ? 's' : ''} mastered
          </p>
        </div>
      </div>

      {learnedWords.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16"
        >
          <div className="text-4xl mb-3">📚</div>
          <h2 className="font-display text-lg font-semibold text-charcoal mb-1">
            No words learned yet
          </h2>
          <p className="text-sm text-charcoal/50 mb-4">
            Start a lesson to begin building your vocabulary!
          </p>
          <button
            onClick={() => navigate('/learn')}
            className="bg-primary text-white font-semibold px-6 py-3 rounded-xl"
          >
            Start Learning
          </button>
        </motion.div>
      ) : (
        <>
          {/* Search */}
          <div className="relative mb-3">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/40"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your words..."
              className="w-full pl-9 pr-4 py-2.5 bg-white rounded-xl border border-cream-dark/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Sort options */}
          <div className="flex gap-2 mb-4">
            {[
              { key: 'recent', label: 'Recent' },
              { key: 'topic', label: 'By Topic' },
              { key: 'accuracy', label: 'Needs Work' },
            ].map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSortBy(opt.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  sortBy === opt.key
                    ? 'bg-primary text-white'
                    : 'bg-white border border-cream-dark/50 text-charcoal/60'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Words list */}
          {sortBy === 'topic' && grouped ? (
            <div className="space-y-5">
              {grouped.map((group) => (
                <motion.div
                  key={group.topic}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span>{group.icon}</span>
                    <span className="text-sm font-semibold text-charcoal">
                      {TOPIC_EN[group.topic] || group.topic}
                    </span>
                    <span className="text-xs text-charcoal/40">
                      ({group.words.length})
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {group.words.map((word) => (
                      <LearnedWordRow
                        key={word.id}
                        word={word}
                        onSpeak={() => speak(dutchWithArticle(word))}
                        onClick={() => handleWordClick(word)}
                      />
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="space-y-1.5">
              {filtered.map((word, i) => (
                <motion.div
                  key={word.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3) }}
                >
                  <LearnedWordRow
                    word={word}
                    onSpeak={() => speak(dutchWithArticle(word))}
                    onClick={() => handleWordClick(word)}
                  />
                </motion.div>
              ))}
              {filtered.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-charcoal/40">No matching words</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function LearnedWordRow({ word, onSpeak, onClick }) {
  const accuracy = word.progress?.accuracy;
  const accuracyPct =
    accuracy != null ? Math.round(accuracy * 100) : null;

  return (
    <div className="bg-white rounded-xl border border-cream-dark/30 flex items-center gap-2 px-3 py-2.5">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSpeak();
        }}
        className="p-1.5 rounded-full text-primary/60 hover:bg-primary/10 shrink-0 transition-colors"
        aria-label="Listen"
      >
        <Volume2 size={14} />
      </button>

      <button onClick={onClick} className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-1.5">
          {word.article && (
            <span className="text-[10px] text-primary/50 font-medium">
              {word.article}
            </span>
          )}
          <span className="font-semibold text-sm text-charcoal truncate">
            {dutchBareWord(word) || word.dutch}
          </span>
        </div>
        <p className="text-xs text-charcoal/50 truncate">{word.english}</p>
      </button>

      {accuracyPct != null && (
        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
            accuracyPct >= 80
              ? 'bg-success/10 text-success'
              : accuracyPct >= 50
                ? 'bg-warning/10 text-warning'
                : 'bg-error/10 text-error'
          }`}
        >
          {accuracyPct}%
        </span>
      )}

      <ChevronRight size={14} className="text-charcoal/20 shrink-0" />
    </div>
  );
}
