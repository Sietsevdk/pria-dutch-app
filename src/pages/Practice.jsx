import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, PenTool, Headphones, Mic, Star, Eye, EyeOff, ChevronRight, MessageSquare } from 'lucide-react';
import MultipleChoice from '../components/MultipleChoice';
import ListeningExercise from '../components/ListeningExercise';
import SpeakingExercise from '../components/SpeakingExercise';
import DialoguePlayer from '../components/DialoguePlayer';
import useProgress from '../hooks/useProgress';
import { shuffle } from '../utils/dutch';

// Load data
const vocabModules = import.meta.glob('../data/vocabulary/*.json', { eager: true });
const dialogueModules = import.meta.glob('../data/dialogues/*.json', { eager: true });
const readingModule = import.meta.glob('../data/practice/reading.json', { eager: true });
const writingModule = import.meta.glob('../data/practice/writing.json', { eager: true });

const allTopics = Object.values(vocabModules).map((m) => m.default || m).filter(Boolean);
const allDialogues = Object.values(dialogueModules).map((m) => m.default || m).filter(Boolean);
const readingData = Object.values(readingModule).map((m) => m.default || m)[0] || { passages: [] };
const writingData = Object.values(writingModule).map((m) => m.default || m)[0] || { prompts: [] };

const difficultyLabels = { 1: 'Beginner', 2: 'Intermediate', 3: 'Advanced' };
const difficultyFilters = ['All', 'Beginner', 'Intermediate', 'Advanced'];

const tabs = [
  { id: 'reading', label: 'Reading', icon: BookOpen },
  { id: 'writing', label: 'Writing', icon: PenTool },
  { id: 'listening', label: 'Listening', icon: Headphones },
  { id: 'speaking', label: 'Speaking', icon: Mic },
];

export default function Practice() {
  const [activeTab, setActiveTab] = useState('reading');
  const [selectedDialogue, setSelectedDialogue] = useState(null);

  return (
    <div className="px-4 pt-6 pb-4">
      <motion.h1
        className="font-display text-2xl font-semibold text-charcoal mb-4"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Practice
      </motion.h1>

      {/* Tab bar */}
      <div className="flex gap-1 bg-cream-dark/50 rounded-xl p-1 mb-6">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => {
              setActiveTab(id);
              setSelectedDialogue(null);
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-all ${
              activeTab === id
                ? 'bg-white text-primary shadow-sm'
                : 'text-charcoal/50'
            }`}
          >
            <Icon size={14} />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'reading' && <ReadingPractice />}
          {activeTab === 'writing' && <WritingPractice />}
          {activeTab === 'listening' && <ListeningPractice />}
          {activeTab === 'speaking' && (
            <EnhancedSpeakingPractice
              selectedDialogue={selectedDialogue}
              setSelectedDialogue={setSelectedDialogue}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── Reading Practice ─────────────────────────────────────────

function ReadingPractice() {
  const [selectedPassage, setSelectedPassage] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showTranslation, setShowTranslation] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [difficultyFilter, setDifficultyFilter] = useState('All');

  const filteredPassages = useMemo(() => {
    if (difficultyFilter === 'All') return readingData.passages;
    return readingData.passages.filter(
      (p) => difficultyLabels[p.difficulty] === difficultyFilter
    );
  }, [difficultyFilter]);

  const passage = selectedPassage
    ? readingData.passages.find((p) => p.id === selectedPassage)
    : null;

  const resetAndGoBack = useCallback(() => {
    setSelectedPassage(null);
    setQuestionIndex(0);
    setScore(0);
    setIsComplete(false);
    setShowTranslation(false);
  }, []);

  const handleAnswer = useCallback(
    (correct) => {
      if (correct) setScore((s) => s + 1);
      if (passage && questionIndex + 1 >= passage.questions.length) {
        setIsComplete(true);
      } else {
        setQuestionIndex((i) => i + 1);
      }
    },
    [passage, questionIndex]
  );

  // Completion screen
  if (passage && isComplete) {
    const questions = passage.questions || [];
    return (
      <div>
        <button onClick={resetAndGoBack} className="text-sm text-primary font-medium mb-4">
          ← Back to passages
        </button>
        <div className="text-center py-6">
          <div className="text-4xl mb-3">{score === questions.length ? '🎉' : '💪'}</div>
          <h2 className="font-display text-xl font-semibold text-charcoal mb-1">
            {score === questions.length ? 'Perfect!' : 'Good effort!'}
          </h2>
          <p className="text-sm text-charcoal/60 mb-6">
            You got {score}/{questions.length} correct
          </p>

          {passage.keyVocabulary?.length > 0 && (
            <div className="bg-info/5 border border-info/20 rounded-xl p-4 mb-6 text-left">
              <p className="text-xs font-medium text-info mb-2">Key Vocabulary</p>
              <div className="space-y-1.5">
                {passage.keyVocabulary.map((v, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-charcoal font-medium">{v.dutch}</span>
                    <span className="text-charcoal/50">{v.english}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={resetAndGoBack}
            className="w-full bg-primary text-white font-semibold px-6 py-3 rounded-xl hover:bg-primary-dark transition-colors"
          >
            Next Passage
          </button>
        </div>
      </div>
    );
  }

  // Passage + questions view
  if (passage) {
    const questions = passage.questions || [];
    const currentQ = questions[questionIndex];

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <button onClick={resetAndGoBack} className="text-sm text-primary font-medium">
            ← Back to passages
          </button>
          <span className="text-xs text-charcoal/40">
            Question {questionIndex + 1}/{questions.length}
          </span>
        </div>

        <div className="h-1.5 bg-cream-dark rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${((questionIndex + 1) / questions.length) * 100}%` }}
          />
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-cream-dark/30 mb-4">
          <h3 className="font-semibold text-charcoal mb-2">{passage.title}</h3>
          <p className="text-sm text-charcoal/80 whitespace-pre-line leading-relaxed">
            {passage.text}
          </p>

          {passage.textEN && (
            <div className="mt-3 pt-3 border-t border-cream-dark/30">
              <button
                onClick={() => setShowTranslation(!showTranslation)}
                className="flex items-center gap-1.5 text-xs text-primary font-medium"
              >
                {showTranslation ? <EyeOff size={12} /> : <Eye size={12} />}
                {showTranslation ? 'Hide translation' : 'Show translation'}
              </button>
              <AnimatePresence>
                {showTranslation && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-sm text-charcoal/50 mt-2 leading-relaxed"
                  >
                    {passage.textEN}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {currentQ && (
          <MultipleChoice
            key={`${passage.id}-${questionIndex}`}
            question={currentQ.question}
            options={currentQ.options}
            correctAnswer={currentQ.answer}
            onAnswer={handleAnswer}
          />
        )}
      </div>
    );
  }

  // Passage selection list
  return (
    <div>
      <div className="flex gap-2 mb-4">
        {difficultyFilters.map((level) => (
          <button
            key={level}
            onClick={() => setDifficultyFilter(level)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              difficultyFilter === level
                ? 'bg-primary text-white'
                : 'bg-cream-dark/40 text-charcoal/60 hover:bg-cream-dark/60'
            }`}
          >
            {level}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredPassages.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              setSelectedPassage(p.id);
              setQuestionIndex(0);
              setScore(0);
              setIsComplete(false);
              setShowTranslation(false);
            }}
            className="w-full bg-white rounded-2xl p-4 shadow-sm border border-cream-dark/50 text-left hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-sm text-charcoal">{p.title}</h3>
                <p className="text-xs text-charcoal/40 mt-0.5 capitalize">{p.category.replace(/-/g, ' ')}</p>
              </div>
              <ChevronRight size={16} className="text-charcoal/30 mt-0.5" />
            </div>
            <div className="flex items-center gap-1 mt-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Star
                  key={i}
                  size={11}
                  className={i < p.difficulty ? 'text-warning fill-warning' : 'text-charcoal/20'}
                />
              ))}
              <span className="text-[10px] text-charcoal/40 ml-1">
                {difficultyLabels[p.difficulty]}
              </span>
              <span className="text-[10px] text-charcoal/30 ml-auto">
                {p.questions?.length || 0} questions
              </span>
            </div>
          </button>
        ))}
        {filteredPassages.length === 0 && (
          <p className="text-center text-charcoal/50 text-sm py-6">
            No passages match this difficulty level.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Writing Practice ─────────────────────────────────────────

function WritingPractice() {
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [writingText, setWritingText] = useState('');
  const [showModelAnswer, setShowModelAnswer] = useState(false);
  const [showTips, setShowTips] = useState(true);
  const [difficultyFilter, setDifficultyFilter] = useState('All');

  const filteredPrompts = useMemo(() => {
    if (difficultyFilter === 'All') return writingData.prompts;
    return writingData.prompts.filter(
      (p) => difficultyLabels[p.difficulty] === difficultyFilter
    );
  }, [difficultyFilter]);

  const prompt = selectedPrompt
    ? writingData.prompts.find((p) => p.id === selectedPrompt)
    : null;

  const wordCount = writingText.trim() ? writingText.trim().split(/\s+/).length : 0;

  // Writing exercise view
  if (prompt) {
    return (
      <div>
        <button
          onClick={() => {
            setSelectedPrompt(null);
            setWritingText('');
            setShowModelAnswer(false);
          }}
          className="text-sm text-primary font-medium mb-4"
        >
          ← Back to prompts
        </button>

        {/* Situation card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-cream-dark/30 mb-4">
          <p className="text-xs text-charcoal/40 uppercase tracking-wide mb-1">Situation</p>
          <p className="text-sm text-charcoal mb-3">{prompt.situation}</p>
          <div className="bg-cream/50 rounded-xl p-3">
            <p className="text-xs text-charcoal/40 uppercase tracking-wide mb-1">Opdracht</p>
            <p className="text-sm text-charcoal font-medium">{prompt.prompt}</p>
          </div>
        </div>

        {/* Tips */}
        {prompt.tips?.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => setShowTips(!showTips)}
              className="text-xs text-info font-medium mb-2 flex items-center gap-1"
            >
              {showTips ? 'Hide tips' : 'Show tips'}
            </button>
            <AnimatePresence>
              {showTips && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-info/5 border border-info/20 rounded-xl p-3"
                >
                  <ul className="space-y-1">
                    {prompt.tips.map((tip, i) => (
                      <li key={i} className="text-xs text-charcoal/70 flex gap-2">
                        <span className="text-info">•</span> {tip}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Useful phrases */}
        {prompt.usefulPhrases?.length > 0 && (
          <div className="bg-primary/5 border border-primary/15 rounded-xl p-3 mb-4">
            <p className="text-xs font-medium text-primary mb-2">Useful phrases</p>
            <div className="space-y-1">
              {prompt.usefulPhrases.map((phrase, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span className="text-charcoal font-medium">{phrase.dutch}</span>
                  <span className="text-charcoal/50">{phrase.english}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Textarea */}
        <textarea
          value={writingText}
          onChange={(e) => setWritingText(e.target.value)}
          placeholder="Schrijf je antwoord hier..."
          className="w-full bg-white rounded-xl p-4 min-h-[160px] text-sm border-2 border-cream-dark/40 text-charcoal placeholder:text-charcoal/30 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-colors resize-none"
        />

        {/* Word count */}
        <div className="flex justify-between items-center mt-2 mb-4">
          <span className="text-[10px] text-charcoal/40">
            Target: {prompt.wordCount.min}–{prompt.wordCount.max} words
          </span>
          <span
            className={`text-xs font-medium ${
              wordCount < prompt.wordCount.min
                ? 'text-error'
                : wordCount > prompt.wordCount.max
                  ? 'text-warning'
                  : 'text-success'
            }`}
          >
            {wordCount} words
          </span>
        </div>

        {/* Model answer toggle */}
        <button
          onClick={() => setShowModelAnswer(!showModelAnswer)}
          className={`w-full py-3 rounded-xl font-medium text-sm transition-colors mb-3 ${
            showModelAnswer
              ? 'bg-cream-dark/40 text-charcoal/60'
              : 'bg-primary text-white hover:bg-primary-dark'
          }`}
        >
          {showModelAnswer ? 'Hide Model Answer' : 'Show Model Answer'}
        </button>

        <AnimatePresence>
          {showModelAnswer && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-success/5 border border-success/20 rounded-xl p-4"
            >
              <p className="text-xs font-medium text-success mb-2">Model Answer</p>
              <p className="text-sm text-charcoal whitespace-pre-line leading-relaxed">
                {prompt.modelAnswer}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Prompt selection list
  return (
    <div>
      <div className="flex gap-2 mb-4">
        {difficultyFilters.map((level) => (
          <button
            key={level}
            onClick={() => setDifficultyFilter(level)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              difficultyFilter === level
                ? 'bg-primary text-white'
                : 'bg-cream-dark/40 text-charcoal/60 hover:bg-cream-dark/60'
            }`}
          >
            {level}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredPrompts.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              setSelectedPrompt(p.id);
              setWritingText('');
              setShowModelAnswer(false);
            }}
            className="w-full bg-white rounded-2xl p-4 shadow-sm border border-cream-dark/50 text-left hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-charcoal">{p.situation}</p>
                <p className="text-xs text-charcoal/40 mt-1 capitalize">{p.category}</p>
              </div>
              <ChevronRight size={16} className="text-charcoal/30 mt-0.5" />
            </div>
            <div className="flex items-center gap-1 mt-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Star
                  key={i}
                  size={11}
                  className={i < p.difficulty ? 'text-warning fill-warning' : 'text-charcoal/20'}
                />
              ))}
              <span className="text-[10px] text-charcoal/40 ml-1">
                {difficultyLabels[p.difficulty]}
              </span>
              <span className="text-[10px] text-charcoal/30 ml-auto">
                {p.wordCount.min}–{p.wordCount.max} words
              </span>
            </div>
          </button>
        ))}
        {filteredPrompts.length === 0 && (
          <p className="text-center text-charcoal/50 text-sm py-6">
            No prompts match this difficulty level.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Listening Practice (unchanged) ───────────────────────────

function ListeningPractice() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const sentences = useMemo(() => {
    const all = [];
    allTopics.forEach((topic) => {
      topic.words?.forEach((w) => {
        if (w.exampleNL) {
          all.push({
            text: w.exampleNL,
            options: null,
            correctAnswer: w.exampleNL,
            wordId: w.id,
          });
        }
      });
    });
    return shuffle(all).slice(0, 20);
  }, []);

  if (sentences.length === 0) {
    return <p className="text-center text-charcoal/60">Loading listening exercises...</p>;
  }

  const current = sentences[currentIndex % sentences.length];

  return (
    <div>
      <p className="text-sm text-charcoal/60 mb-4 text-center">
        Listen and type what you hear ({currentIndex + 1}/{sentences.length})
      </p>
      <ListeningExercise
        key={currentIndex}
        text={current.text}
        options={null}
        correctAnswer={current.correctAnswer}
        onAnswer={() => setCurrentIndex((i) => i + 1)}
      />
    </div>
  );
}

// ─── Enhanced Speaking Practice (with Dialogues) ──────────────

function EnhancedSpeakingPractice({ selectedDialogue, setSelectedDialogue }) {
  const [mode, setMode] = useState('sentences');

  return (
    <div>
      {/* Mode toggle */}
      <div className="flex gap-1 bg-cream-dark/30 rounded-lg p-1 mb-4">
        <button
          onClick={() => setMode('sentences')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all ${
            mode === 'sentences'
              ? 'bg-white text-charcoal shadow-sm'
              : 'text-charcoal/50'
          }`}
        >
          <Mic size={13} />
          Sentences
        </button>
        <button
          onClick={() => setMode('dialogues')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all ${
            mode === 'dialogues'
              ? 'bg-white text-charcoal shadow-sm'
              : 'text-charcoal/50'
          }`}
        >
          <MessageSquare size={13} />
          Dialogues
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
        >
          {mode === 'sentences' ? (
            <SpeakingSentences />
          ) : (
            <DialoguePractice
              selectedDialogue={selectedDialogue}
              setSelectedDialogue={setSelectedDialogue}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function SpeakingSentences() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const completeSpeakingGoal = useProgress((s) => s.completeSpeakingGoal);

  const sentences = useMemo(() => {
    const all = [];
    allTopics.forEach((topic) => {
      topic.words?.forEach((w) => {
        if (w.exampleNL) {
          all.push({
            text: w.exampleNL,
            translation: w.exampleEN,
          });
        }
      });
    });
    return shuffle(all).slice(0, 20);
  }, []);

  if (sentences.length === 0) {
    return <p className="text-center text-charcoal/60">Loading speaking exercises...</p>;
  }

  const current = sentences[currentIndex % sentences.length];

  return (
    <div>
      <p className="text-sm text-charcoal/60 mb-4 text-center">
        Read the Dutch text aloud ({currentIndex + 1}/{sentences.length})
      </p>
      <SpeakingExercise
        key={currentIndex}
        text={current.text}
        translation={current.translation}
        onAnswer={(correct) => {
          if (currentIndex >= 4) completeSpeakingGoal();
          setCurrentIndex((i) => i + 1);
        }}
      />
    </div>
  );
}

function DialoguePractice({ selectedDialogue, setSelectedDialogue }) {
  if (selectedDialogue) {
    return (
      <div>
        <button
          onClick={() => setSelectedDialogue(null)}
          className="text-sm text-primary font-medium mb-4"
        >
          ← Back to dialogues
        </button>
        <DialoguePlayer dialogue={selectedDialogue} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {allDialogues.map((dialogue) => (
        <button
          key={dialogue.id}
          onClick={() => setSelectedDialogue(dialogue)}
          className="w-full bg-white rounded-2xl p-4 shadow-sm border border-cream-dark/50 text-left hover:shadow-md transition-shadow"
        >
          <h3 className="font-semibold text-charcoal">{dialogue.title}</h3>
          <p className="text-sm text-charcoal/50 mt-0.5">{dialogue.titleEN}</p>
          <p className="text-xs text-charcoal/40 mt-1">{dialogue.context}</p>
        </button>
      ))}
      {allDialogues.length === 0 && (
        <p className="text-center text-charcoal/60 py-8">Dialogues coming soon!</p>
      )}
    </div>
  );
}
