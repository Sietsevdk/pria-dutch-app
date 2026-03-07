import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Volume2, Star, Check, Mic } from 'lucide-react';
import useDutchAudio from '../hooks/useDutchAudio';

// Load pronunciation data via Vite glob
const pronModule = import.meta.glob('../data/pronunciation.json', { eager: true });
let pronData = { sounds: [] };
Object.values(pronModule).forEach((mod) => {
  pronData = mod.default || mod;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function DifficultyStars({ level, max = 5 }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          size={12}
          className={i < level ? 'text-warning fill-warning' : 'text-charcoal/15'}
        />
      ))}
    </div>
  );
}

function SpeakButton({ text, label, audio, small = false, className = '' }) {
  const { speak, isSpeaking } = audio;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        speak(text, { rate: 0.85 });
      }}
      className={`inline-flex items-center gap-1.5 transition-colors ${
        small
          ? 'text-xs text-primary hover:text-primary-dark'
          : 'text-sm text-primary font-medium hover:text-primary-dark'
      } ${className}`}
      aria-label={`Play pronunciation of "${label || text}"`}
    >
      <Volume2
        size={small ? 14 : 16}
        className={isSpeaking ? 'animate-pulse' : ''}
      />
      {label && <span>{label}</span>}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function Pronunciation() {
  const [selectedSoundId, setSelectedSoundId] = useState(null);
  const [completedSounds, setCompletedSounds] = useState({});

  const audio = useDutchAudio();
  const sounds = pronData.sounds || [];

  const selectedSound = useMemo(
    () => sounds.find((s) => s.id === selectedSoundId) || null,
    [selectedSoundId, sounds]
  );

  // When practice mode finishes, mark the sound as completed
  const handlePracticeComplete = (soundId, stats) => {
    setCompletedSounds((prev) => ({
      ...prev,
      [soundId]: {
        correct: (prev[soundId]?.correct || 0) + stats.correct,
        total: (prev[soundId]?.total || 0) + stats.total,
        completedAt: Date.now(),
      },
    }));
  };

  if (selectedSound) {
    return (
      <SoundDetail
        sound={selectedSound}
        audio={audio}
        completed={completedSounds[selectedSound.id]}
        onBack={() => {
          audio.stop();
          setSelectedSoundId(null);
        }}
        onPracticeComplete={(stats) =>
          handlePracticeComplete(selectedSound.id, stats)
        }
      />
    );
  }

  return (
    <div className="px-4 pt-6 pb-4">
      {/* Header */}
      <motion.h1
        className="font-display text-2xl font-semibold text-charcoal mb-1"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Pronunciation
      </motion.h1>
      <motion.p
        className="text-sm text-charcoal/50 mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.05 }}
      >
        Master the sounds of Dutch
      </motion.p>

      {/* Sound grid */}
      <div className="grid grid-cols-2 gap-3">
        {sounds.map((sound, i) => {
          const done = completedSounds[sound.id];
          return (
            <motion.button
              key={sound.id}
              onClick={() => setSelectedSoundId(sound.id)}
              className="bg-white rounded-2xl p-4 shadow-sm border border-cream-dark/50 text-left hover:shadow-md transition-shadow relative overflow-hidden"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              {done && (
                <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-success/15 flex items-center justify-center">
                  <Check size={12} className="text-success" />
                </div>
              )}

              <div className="text-xl font-display font-semibold text-charcoal mb-1">
                {sound.name}
              </div>
              <div className="text-xs text-charcoal/40 font-mono mb-2">
                /{sound.ipa}/
              </div>
              <DifficultyStars level={sound.difficulty} />
              <p className="text-[11px] text-charcoal/50 mt-2 line-clamp-2 leading-snug">
                {sound.dutchName}
              </p>
            </motion.button>
          );
        })}
      </div>

      {sounds.length === 0 && (
        <p className="text-center text-charcoal/50 py-12">
          No pronunciation data available.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sound detail view
// ---------------------------------------------------------------------------

function SoundDetail({ sound, audio, completed, onBack, onPracticeComplete }) {
  const [practicing, setPracticing] = useState(false);

  if (practicing) {
    return (
      <PracticeMode
        sound={sound}
        audio={audio}
        onBack={() => setPracticing(false)}
        onComplete={(stats) => {
          onPracticeComplete(stats);
          setPracticing(false);
        }}
      />
    );
  }

  return (
    <div className="px-4 pt-6 pb-4">
      {/* Back button */}
      <motion.button
        onClick={onBack}
        className="text-sm text-primary font-medium mb-4 flex items-center gap-1"
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <ArrowLeft size={14} /> Back
      </motion.button>

      {/* Sound header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-start justify-between mb-1">
          <h1 className="font-display text-3xl font-semibold text-charcoal">
            {sound.name}
          </h1>
          {completed && (
            <span className="inline-flex items-center gap-1 text-xs text-success bg-success/10 px-2 py-1 rounded-full">
              <Check size={12} /> Practiced
            </span>
          )}
        </div>
        <p className="text-sm text-charcoal/40 font-mono mb-1">
          /{sound.ipa}/
        </p>
        <DifficultyStars level={sound.difficulty} />
        <p className="text-sm text-charcoal/70 mt-3 leading-relaxed">
          {sound.description}
        </p>
      </motion.div>

      {/* Tips */}
      {sound.tips?.length > 0 && (
        <motion.div
          className="bg-white rounded-2xl p-4 shadow-sm border border-cream-dark/50 mt-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <h3 className="font-semibold text-sm text-charcoal mb-2">Tips</h3>
          <ul className="space-y-1.5">
            {sound.tips.map((tip, i) => (
              <li
                key={i}
                className="text-sm text-charcoal/70 flex gap-2"
              >
                <span className="text-primary shrink-0">&#8226;</span>
                {tip}
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Common mistake */}
      {sound.commonMistake && (
        <motion.div
          className="bg-error/5 border border-error/15 rounded-2xl p-4 mt-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="font-semibold text-sm text-error mb-1">
            Common Mistake
          </h3>
          <p className="text-sm text-charcoal/70">{sound.commonMistake}</p>
        </motion.div>
      )}

      {/* Practice words */}
      {sound.practiceWords?.length > 0 && (
        <motion.div
          className="mt-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h3 className="font-semibold text-sm text-charcoal mb-3">
            Practice Words
          </h3>
          <div className="space-y-2">
            {sound.practiceWords.map((pw, i) => (
              <button
                key={i}
                onClick={() => audio.speak(pw.word, { rate: 0.8 })}
                className="w-full bg-white rounded-xl p-3 shadow-sm border border-cream-dark/50 flex items-center gap-3 text-left active:scale-[0.98] transition-transform"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Volume2 size={14} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-semibold text-sm text-charcoal">
                      {pw.word}
                    </span>
                    <span className="text-xs text-charcoal/40 font-mono">
                      /{pw.ipa}/
                    </span>
                  </div>
                  <p className="text-xs text-charcoal/50">{pw.meaning}</p>
                </div>
                {pw.audio_hint && (
                  <span className="text-[10px] text-primary/60 max-w-[90px] text-right leading-tight shrink-0 hidden sm:block">
                    {pw.audio_hint}
                  </span>
                )}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Minimal pairs */}
      {sound.minimalPairs?.length > 0 && (
        <motion.div
          className="mt-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="font-semibold text-sm text-charcoal mb-3">
            Minimal Pairs
          </h3>
          <div className="space-y-2">
            {sound.minimalPairs.map((mp, i) => (
              <div
                key={i}
                className="bg-white rounded-xl p-3 shadow-sm border border-cream-dark/50 flex items-center gap-2"
              >
                <button
                  onClick={() => audio.speak(mp.pair[0], { rate: 0.75 })}
                  className="flex-1 text-center py-1.5 rounded-lg bg-cream-dark/40 hover:bg-cream-dark transition-colors"
                >
                  <span className="font-semibold text-sm text-charcoal block">
                    {mp.pair[0]}
                  </span>
                  <span className="text-[11px] text-charcoal/50">
                    {mp.meaning[0]}
                  </span>
                </button>
                <span className="text-xs text-charcoal/30 font-medium">vs</span>
                <button
                  onClick={() => audio.speak(mp.pair[1], { rate: 0.75 })}
                  className="flex-1 text-center py-1.5 rounded-lg bg-cream-dark/40 hover:bg-cream-dark transition-colors"
                >
                  <span className="font-semibold text-sm text-charcoal block">
                    {mp.pair[1]}
                  </span>
                  <span className="text-[11px] text-charcoal/50">
                    {mp.meaning[1]}
                  </span>
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Practice sentences */}
      {sound.sentences?.length > 0 && (
        <motion.div
          className="mt-5"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <h3 className="font-semibold text-sm text-charcoal mb-3">
            Practice Sentences
          </h3>
          <div className="space-y-2">
            {sound.sentences.map((s, i) => (
              <button
                key={i}
                onClick={() => audio.speak(s.text, { rate: 0.85 })}
                className="w-full bg-white rounded-xl p-3 shadow-sm border border-cream-dark/50 text-left flex items-start gap-3 active:scale-[0.98] transition-transform"
              >
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Volume2 size={13} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-charcoal font-medium leading-snug">
                    {s.text}
                  </p>
                  <p className="text-xs text-charcoal/50 mt-0.5">
                    {s.meaning}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Practice button */}
      <motion.div
        className="mt-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <button
          onClick={() => setPracticing(true)}
          className="w-full bg-primary text-white font-semibold py-3.5 rounded-xl hover:bg-primary-dark transition-colors flex items-center justify-center gap-2 shadow-md"
        >
          <Mic size={18} />
          Practice This Sound
        </button>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Practice mode
// ---------------------------------------------------------------------------

function PracticeMode({ sound, audio, onBack, onComplete }) {
  const words = sound.practiceWords || [];
  const [wordIndex, setWordIndex] = useState(0);
  const [stats, setStats] = useState({ correct: 0, needsPractice: 0, total: 0 });
  const [answered, setAnswered] = useState(false);
  const [finished, setFinished] = useState(false);
  const advanceTimerRef = useRef(null);

  useEffect(() => {
    return () => { if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current); };
  }, []);

  const currentWord = words[wordIndex];

  // Auto-play the word when it changes
  const playCurrentWord = () => {
    if (currentWord) {
      audio.speak(currentWord.word, { rate: 0.75 });
    }
  };

  const handleGotIt = () => {
    if (answered) return;
    setAnswered(true);
    const newStats = {
      ...stats,
      correct: stats.correct + 1,
      total: stats.total + 1,
    };
    setStats(newStats);
    advanceAfterDelay(newStats);
  };

  const handleNeedsPractice = () => {
    if (answered) return;
    setAnswered(true);
    const newStats = {
      ...stats,
      needsPractice: stats.needsPractice + 1,
      total: stats.total + 1,
    };
    setStats(newStats);
    advanceAfterDelay(newStats);
  };

  const advanceAfterDelay = (latestStats) => {
    advanceTimerRef.current = setTimeout(() => {
      setWordIndex((prev) => {
        const nextIndex = prev + 1;
        if (nextIndex >= words.length) {
          setFinished(true);
          onComplete(latestStats);
          return prev;
        }
        return nextIndex;
      });
      setAnswered(false);
    }, 600);
  };

  // Completion screen
  if (finished) {
    const accuracy =
      stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;

    return (
      <div className="px-4 pt-6 pb-4">
        <motion.div
          className="text-center mt-8"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="w-20 h-20 rounded-full bg-success/15 flex items-center justify-center mx-auto mb-4">
            <Check size={36} className="text-success" />
          </div>
          <h2 className="font-display text-2xl font-semibold text-charcoal mb-2">
            {accuracy >= 80 ? 'Great job!' : 'Keep practicing!'}
          </h2>
          <p className="text-charcoal/60 mb-1">
            Sound: <span className="font-semibold">{sound.name}</span> /{sound.ipa}/
          </p>
          <p className="text-charcoal/50 text-sm mb-6">
            {stats.correct} of {stats.total} words confident ({accuracy}%)
          </p>

          <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto mb-8">
            <div className="bg-success/10 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-success">{stats.correct}</p>
              <p className="text-xs text-charcoal/50">Got it</p>
            </div>
            <div className="bg-primary/10 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-primary">
                {stats.needsPractice}
              </p>
              <p className="text-xs text-charcoal/50">Needs practice</p>
            </div>
          </div>

          <button
            onClick={onBack}
            className="w-full bg-primary text-white font-semibold py-3 rounded-xl hover:bg-primary-dark transition-colors"
          >
            Back to {sound.name}
          </button>
        </motion.div>
      </div>
    );
  }

  if (!currentWord) {
    return (
      <div className="px-4 pt-6 text-center">
        <p className="text-charcoal/60">No practice words available.</p>
        <button
          onClick={onBack}
          className="mt-4 text-primary font-medium text-sm"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between mb-6"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button
          onClick={() => {
            audio.stop();
            onBack();
          }}
          className="text-sm text-primary font-medium flex items-center gap-1"
        >
          <ArrowLeft size={14} /> Stop
        </button>
        <span className="text-sm text-charcoal/50">
          {wordIndex + 1} / {words.length}
        </span>
      </motion.div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-cream-dark rounded-full mb-8 overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          initial={{ width: 0 }}
          animate={{
            width: `${((wordIndex + (answered ? 1 : 0)) / words.length) * 100}%`,
          }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Word card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={wordIndex}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-3xl p-8 shadow-sm border border-cream-dark/50 text-center mb-8"
        >
          <p className="font-display text-3xl font-semibold text-charcoal mb-2">
            {currentWord.word}
          </p>
          <p className="text-sm text-charcoal/40 font-mono mb-1">
            /{currentWord.ipa}/
          </p>
          <p className="text-sm text-charcoal/50 mb-5">
            {currentWord.meaning}
          </p>

          {/* Play button */}
          <button
            onClick={playCurrentWord}
            className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto transition-all ${
              audio.isSpeaking
                ? 'bg-primary text-white shadow-lg scale-105'
                : 'bg-primary/10 text-primary hover:bg-primary/20'
            }`}
            aria-label={`Listen to "${currentWord.word}"`}
          >
            <Volume2 size={24} />
          </button>
          <p className="text-xs text-charcoal/40 mt-2">
            Tap to listen
          </p>

          {currentWord.audio_hint && (
            <p className="text-xs text-primary/70 mt-3 italic">
              {currentWord.audio_hint}
            </p>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Self-assessment buttons */}
      <motion.div
        className="grid grid-cols-2 gap-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <button
          onClick={handleGotIt}
          disabled={answered}
          className={`py-4 rounded-2xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
            answered
              ? 'opacity-50 cursor-not-allowed bg-cream-dark text-charcoal/40'
              : 'bg-success text-white hover:bg-success/90 active:scale-[0.97] shadow-sm'
          }`}
        >
          <Check size={16} />
          Got it
        </button>
        <button
          onClick={handleNeedsPractice}
          disabled={answered}
          className={`py-4 rounded-2xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
            answered
              ? 'opacity-50 cursor-not-allowed bg-cream-dark text-charcoal/40'
              : 'bg-primary text-white hover:bg-primary-dark active:scale-[0.97] shadow-sm'
          }`}
        >
          <Mic size={16} />
          Need more practice
        </button>
      </motion.div>

      {/* Hint text */}
      <p className="text-center text-xs text-charcoal/40 mt-4">
        Listen, try to pronounce it, then assess yourself
      </p>
    </div>
  );
}
