import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  Volume2,
  Check,
  X,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { useSpeech } from '../hooks/useSpeech';

/**
 * SpeakingExercise - Speech recognition exercise.
 * Shows Dutch text for the user to read aloud, captures speech, and scores similarity.
 */
export default function SpeakingExercise({ text, translation, onAnswer }) {
  const [hasAttempted, setHasAttempted] = useState(false);
  const [similarity, setSimilarity] = useState(null);
  const [spokenText, setSpokenText] = useState('');
  const [micError, setMicError] = useState(null);
  const {
    speak,
    isSpeaking,
    startListening,
    stopListening,
    isListening,
    transcript,
    recognitionSupported,
    speechSupported,
    checkPronunciation,
  } = useSpeech();

  const PASS_THRESHOLD = 80;

  const handleListen = useCallback(() => {
    speak(text);
  }, [speak, text]);

  /**
   * Map recognition error codes to user-friendly messages.
   */
  const getErrorMessage = useCallback((error) => {
    switch (error) {
      case 'not-allowed':
        return 'Please allow microphone access in your browser settings.';
      case 'no-speech':
        return 'No speech detected. Try again or self-assess below.';
      case 'audio-capture':
        return 'No microphone found. Check your device settings.';
      case 'network':
        return 'Network error. Speech recognition requires an internet connection.';
      case 'start-failed':
        return 'Could not start microphone. Please try again.';
      default:
        return 'Something went wrong. Try again or self-assess below.';
    }
  }, []);

  const handleStartRecording = useCallback(() => {
    setSpokenText('');
    setSimilarity(null);
    setHasAttempted(false);
    setMicError(null);

    startListening({
      onResult: (finalTranscript) => {
        setMicError(null);
        setSpokenText(finalTranscript);
        const score = checkPronunciation(finalTranscript, text);
        setSimilarity(score);
        setHasAttempted(true);

        if (onAnswer) {
          setTimeout(() => {
            onAnswer(score >= PASS_THRESHOLD);
          }, 1500);
        }
      },
      onError: (error) => {
        console.warn('Speech recognition error:', error);
        setMicError(getErrorMessage(error));
      },
    });
  }, [startListening, checkPronunciation, text, onAnswer, getErrorMessage]);

  const handleStopRecording = useCallback(() => {
    stopListening();
  }, [stopListening]);

  const handleRetry = useCallback(() => {
    setSpokenText('');
    setSimilarity(null);
    setHasAttempted(false);
    setMicError(null);
  }, []);

  /**
   * Self-assessment: user marks themselves as correct or needing practice.
   */
  const handleSelfAssess = useCallback(
    (correct) => {
      setHasAttempted(true);
      setSimilarity(correct ? 100 : 0);
      setSpokenText(correct ? '(Self-assessed: correct)' : '(Self-assessed: needs practice)');
      if (onAnswer) {
        setTimeout(() => {
          onAnswer(correct);
        }, 1000);
      }
    },
    [onAnswer]
  );

  const passed = similarity !== null && similarity >= PASS_THRESHOLD;

  const getScoreColor = () => {
    if (similarity === null) return '';
    if (similarity >= 90) return 'text-success';
    if (similarity >= PASS_THRESHOLD) return 'text-primary';
    return 'text-error';
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Instruction */}
      <p className="text-xs text-charcoal-light/60 uppercase tracking-wide mb-4 text-center">
        Read aloud in Dutch
      </p>

      {/* Text to read */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-sm border border-cream-dark/30 p-6 mb-6 text-center"
      >
        <h2 className="font-display text-2xl text-charcoal mb-2">{text}</h2>
        {translation && (
          <p className="text-base text-charcoal-light/80 font-medium">
            {translation}
          </p>
        )}

        {/* Listen to pronunciation button */}
        {speechSupported && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleListen}
            disabled={isSpeaking}
            className={`mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
              isSpeaking
                ? 'bg-primary text-white'
                : 'bg-cream text-primary hover:bg-primary/10'
            }`}
            aria-label="Listen to pronunciation"
          >
            <Volume2 size={16} />
            {isSpeaking ? 'Playing...' : 'Listen first'}
          </motion.button>
        )}
      </motion.div>

      {/* Microphone area */}
      {!recognitionSupported ? (
        <div className="text-center p-4 bg-warning/10 rounded-xl mb-4">
          <p className="text-sm text-warning">
            Speech recognition is not supported in your browser. Try using
            Chrome on desktop for the best experience.
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          {/* Mic button */}
          <div className="relative mb-6">
            {/* Pulsing ring when listening */}
            {isListening && (
              <motion.div
                className="absolute inset-0 rounded-full bg-primary/20"
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.4, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
            {isListening && (
              <motion.div
                className="absolute inset-0 rounded-full bg-primary/10"
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.8, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
              />
            )}

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={isListening ? handleStopRecording : handleStartRecording}
              disabled={hasAttempted}
              className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-colors ${
                isListening
                  ? 'bg-error text-white'
                  : hasAttempted
                    ? 'bg-cream text-charcoal-light/40 cursor-not-allowed'
                    : 'bg-primary text-white hover:bg-primary-dark'
              }`}
              aria-label={isListening ? 'Stop recording' : 'Start recording'}
            >
              {isListening ? <MicOff size={28} /> : <Mic size={28} />}
            </motion.button>
          </div>

          {/* Status text */}
          <p className="text-sm text-charcoal-light mb-4">
            {isListening
              ? 'Listening... Tap to stop.'
              : hasAttempted
                ? ''
                : 'Tap the microphone and speak'}
          </p>

          {/* Microphone error message */}
          {micError && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full flex items-start gap-2 p-3 mb-4 bg-error/10 rounded-xl"
            >
              <AlertCircle size={16} className="text-error mt-0.5 shrink-0" />
              <p className="text-sm text-error">{micError}</p>
            </motion.div>
          )}

          {/* Live transcript */}
          {isListening && transcript && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full p-3 bg-cream rounded-xl text-center"
            >
              <p className="text-sm text-charcoal-light italic">{transcript}</p>
            </motion.div>
          )}
        </div>
      )}

      {/* Self-assessment fallback - always visible */}
      {!hasAttempted && (
        <div className="mt-6 text-center">
          <p className="text-xs text-charcoal-light/60 mb-3">
            {recognitionSupported
              ? "Can't use microphone? Self-assess below"
              : 'Self-assess your pronunciation'}
          </p>
          <div className="flex gap-3 justify-center">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSelfAssess(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-success/10 text-success font-medium text-sm hover:bg-success/20 transition-colors border border-success/20"
            >
              <Check size={16} />
              I said it correctly
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSelfAssess(false)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-warning/10 text-warning font-medium text-sm hover:bg-warning/20 transition-colors border border-warning/20"
            >
              <RefreshCw size={16} />
              I need more practice
            </motion.button>
          </div>
        </div>
      )}

      {/* Results */}
      <AnimatePresence>
        {hasAttempted && similarity !== null && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 space-y-4"
          >
            {/* What was recognized */}
            {spokenText && (
              <div className="bg-white rounded-xl p-4 border border-cream-dark/30">
                <p className="text-xs text-charcoal-light/60 mb-1">
                  What I heard:
                </p>
                <p className="text-charcoal font-medium">{spokenText}</p>
              </div>
            )}

            {/* Score */}
            <div
              className={`p-4 rounded-xl text-center ${
                passed ? 'bg-success/10' : 'bg-error/10'
              }`}
              role="alert"
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                {passed ? (
                  <Check size={20} className="text-success" />
                ) : (
                  <X size={20} className="text-error" />
                )}
                <span
                  className={`text-2xl font-display font-bold ${getScoreColor()}`}
                >
                  {similarity}%
                </span>
              </div>
              <p
                className={`text-sm font-medium ${passed ? 'text-success' : 'text-error'}`}
              >
                {similarity >= 90
                  ? 'Uitstekend! Excellent pronunciation!'
                  : passed
                    ? 'Goed gedaan! Good job!'
                    : 'Probeer het nog eens. Try again!'}
              </p>
            </div>

            {/* Retry button */}
            {!passed && (
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleRetry}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-white font-medium text-sm hover:bg-primary-dark transition-colors"
              >
                <RefreshCw size={16} />
                Try Again
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
