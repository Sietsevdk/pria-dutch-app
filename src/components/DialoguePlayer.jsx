import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Volume2,
  ChevronDown,
  MessageCircle,
  Globe,
  BookOpen,
} from 'lucide-react';
import { useSpeech } from '../hooks/useSpeech';

/**
 * DialoguePlayer - Conversation replay component with chat-bubble style layout.
 * Plays through a dialogue using TTS and displays lines with expandable translations.
 */
export default function DialoguePlayer({ dialogue }) {
  const {
    title,
    titleEN,
    context,
    lines,
    keyPhrases,
    culturalNote,
  } = dialogue;

  const [expandedLines, setExpandedLines] = useState({});
  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const [currentPlayingIndex, setCurrentPlayingIndex] = useState(-1);
  const { speak, isSpeaking, stopSpeaking } = useSpeech();
  const scrollContainerRef = useRef(null);
  const lineRefs = useRef([]);
  const playAllAbortRef = useRef(false);

  // Auto-scroll to current playing line
  useEffect(() => {
    if (currentPlayingIndex >= 0 && lineRefs.current[currentPlayingIndex]) {
      lineRefs.current[currentPlayingIndex].scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentPlayingIndex]);

  const toggleLineTranslation = useCallback((index) => {
    setExpandedLines((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  }, []);

  const handlePlayLine = useCallback(
    (text, index) => {
      setCurrentPlayingIndex(index);
      speak(text);
    },
    [speak]
  );

  const handlePlayAll = useCallback(async () => {
    if (isPlayingAll) {
      playAllAbortRef.current = true;
      stopSpeaking();
      setIsPlayingAll(false);
      setCurrentPlayingIndex(-1);
      return;
    }

    playAllAbortRef.current = false;
    setIsPlayingAll(true);

    for (let i = 0; i < lines.length; i++) {
      if (playAllAbortRef.current) break;

      setCurrentPlayingIndex(i);

      await new Promise((resolve) => {
        const utterance = new SpeechSynthesisUtterance(lines[i].dutch);
        utterance.lang = 'nl-NL';
        utterance.rate = 0.9;

        const voices = window.speechSynthesis.getVoices();
        const dutchVoice = voices.find(
          (v) => v.lang === 'nl-NL' || v.lang.startsWith('nl')
        );
        if (dutchVoice) utterance.voice = dutchVoice;

        utterance.onend = () => {
          // Pause between lines
          setTimeout(resolve, 600);
        };
        utterance.onerror = () => resolve();

        window.speechSynthesis.speak(utterance);
      });
    }

    setIsPlayingAll(false);
    setCurrentPlayingIndex(-1);
  }, [isPlayingAll, lines, stopSpeaking]);

  // Determine if a speaker is "person A" or "person B" for bubble sides
  const speakers = [...new Set(lines.map((l) => l.speaker))];

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center gap-2 mb-1">
          <MessageCircle size={18} className="text-primary" />
          <p className="text-xs text-primary font-medium uppercase tracking-wide">
            Dialogue
          </p>
        </div>
        <h2 className="font-display text-xl text-charcoal">{title}</h2>
        {titleEN && (
          <p className="text-sm text-charcoal-light">{titleEN}</p>
        )}
        {context && (
          <p className="text-xs text-charcoal-light/60 mt-1 italic">
            {context}
          </p>
        )}
      </motion.div>

      {/* Play all button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        whileTap={{ scale: 0.95 }}
        onClick={handlePlayAll}
        className={`w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-medium text-sm mb-6 transition-colors ${
          isPlayingAll
            ? 'bg-error/10 text-error hover:bg-error/20'
            : 'bg-primary text-white hover:bg-primary-dark'
        }`}
        aria-label={isPlayingAll ? 'Stop playing' : 'Play all lines'}
      >
        {isPlayingAll ? (
          <>
            <Pause size={16} />
            Stop
          </>
        ) : (
          <>
            <Play size={16} />
            Play All
          </>
        )}
      </motion.button>

      {/* Chat bubbles */}
      <div
        ref={scrollContainerRef}
        className="space-y-3 mb-8"
        role="list"
        aria-label="Dialogue lines"
      >
        {lines.map((line, index) => {
          const isLeft = speakers.indexOf(line.speaker) === 0;
          const isActive = currentPlayingIndex === index;
          const isExpanded = expandedLines[index];

          return (
            <motion.div
              key={index}
              ref={(el) => (lineRefs.current[index] = el)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.06 }}
              className={`flex flex-col ${isLeft ? 'items-start' : 'items-end'}`}
              role="listitem"
            >
              {/* Speaker name */}
              <p className="text-xs text-charcoal-light/50 font-medium mb-1 px-1">
                {line.speaker}
              </p>

              {/* Bubble */}
              <div
                className={`relative max-w-[85%] rounded-2xl px-4 py-3 transition-colors ${
                  isActive
                    ? 'bg-primary/10 border border-primary/30'
                    : isLeft
                      ? 'bg-white border border-cream-dark/30'
                      : 'bg-primary/5 border border-primary/10'
                } ${isLeft ? 'rounded-tl-md' : 'rounded-tr-md'}`}
              >
                {/* Dutch text */}
                <p className="text-sm text-charcoal font-medium">
                  {line.dutch}
                </p>

                {/* Expandable English translation */}
                {line.english && (
                  <div className="mt-1">
                    <button
                      onClick={() => toggleLineTranslation(index)}
                      className="text-xs text-charcoal-light/50 hover:text-charcoal-light flex items-center gap-1 transition-colors"
                      aria-expanded={isExpanded}
                      aria-label={
                        isExpanded ? 'Hide translation' : 'Show translation'
                      }
                    >
                      <motion.span
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.15 }}
                      >
                        <ChevronDown size={12} />
                      </motion.span>
                      {isExpanded ? 'Hide' : 'Translation'}
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.p
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                          className="text-xs text-charcoal-light italic overflow-hidden"
                        >
                          {line.english}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Play button */}
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayLine(line.dutch, index);
                  }}
                  className={`absolute -bottom-2 ${isLeft ? '-right-2' : '-left-2'} w-7 h-7 rounded-full flex items-center justify-center shadow-sm transition-colors ${
                    isActive && isSpeaking
                      ? 'bg-primary text-white'
                      : 'bg-white text-charcoal-light border border-cream-dark/30 hover:text-primary'
                  }`}
                  aria-label={`Play line: ${line.dutch}`}
                >
                  <Volume2 size={12} />
                </motion.button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Key phrases */}
      {keyPhrases && keyPhrases.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={16} className="text-primary" />
            <p className="text-sm font-medium text-charcoal">
              Key Phrases
            </p>
          </div>
          <div className="bg-white rounded-xl border border-cream-dark/30 divide-y divide-cream-dark/20">
            {keyPhrases.map((phrase, index) => (
              <div key={index} className="px-4 py-3 flex items-start gap-3">
                <span className="text-sm font-medium text-primary flex-shrink-0">
                  {phrase.dutch || phrase.phrase}
                </span>
                <span className="text-sm text-charcoal-light">
                  {phrase.english || phrase.meaning}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Cultural note */}
      {culturalNote && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="p-4 bg-info/5 border border-info/15 rounded-xl"
        >
          <div className="flex items-start gap-3">
            <Globe size={18} className="text-info flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-info font-medium uppercase tracking-wide mb-1">
                Cultural Note
              </p>
              <p className="text-sm text-charcoal-light leading-relaxed">
                {culturalNote}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
