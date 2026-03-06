import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Volume2, ChevronDown, X, BookOpen } from 'lucide-react';
import { useSpeech } from '../hooks/useSpeech';
import { dutchWithArticle } from '../utils/dutch';

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

  if (allWords.length === 0) {
    return (
      <div className="px-4 pt-6 pb-4 text-center">
        <BookOpen size={32} className="text-charcoal/30 mx-auto mb-3" />
        <p className="text-charcoal/60 text-sm">Loading dictionary...</p>
        <p className="text-charcoal/40 text-xs mt-1">Try refreshing the page</p>
      </div>
    );
  }

  const filtered = useMemo(() => {
    let words = allWords;

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
  }, [query, selectedTopic]);

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
  };

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

      {/* Topic filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-2 -mx-4 px-4 scrollbar-hide">
        <button
          onClick={() => setSelectedTopic(null)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            !selectedTopic
              ? 'bg-primary text-white'
              : 'bg-white border border-cream-dark/50 text-charcoal/60'
          }`}
        >
          All
        </button>
        {allTopics.map((t) => (
          <button
            key={t.topic}
            onClick={() => setSelectedTopic(selectedTopic === t.topic ? null : t.topic)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              selectedTopic === t.topic
                ? 'bg-primary text-white'
                : 'bg-white border border-cream-dark/50 text-charcoal/60'
            }`}
          >
            {t.icon} {t.topicNL || t.topic}
          </button>
        ))}
      </div>

      {/* Results */}
      {query.trim() || selectedTopic ? (
        <div>
          <p className="text-xs text-charcoal/40 mb-3">
            {filtered.length} {filtered.length === 1 ? 'result' : 'results'}
            {selectedTopic && !query.trim() && (
              <span> in {allTopics.find((t) => t.topic === selectedTopic)?.topicNL || selectedTopic}</span>
            )}
          </p>
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
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TopicGroup({ group, expandedWord, onToggleWord, onSelectTopic }) {
  const [isOpen, setIsOpen] = useState(false);
  const previewWords = group.words.slice(0, 3);

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
          <p className="font-semibold text-sm text-charcoal">
            {group.topicNL || group.topic}
          </p>
          <p className="text-xs text-charcoal/40">
            {group.words.length} words
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

  const handleSpeak = useCallback(
    (e, slow = false) => {
      e.stopPropagation();
      speak(dutchWithArticle(word), { slow });
    },
    [speak, word]
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
              {word.dutch}
            </span>
          </div>
          <p className="text-xs text-charcoal/50 truncate">{word.english}</p>
        </div>

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
