import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Enhanced audio hook for Dutch pronunciation training.
 * Wraps Web Speech API with Dutch-specific voice selection,
 * word-by-word highlighting, and segment-by-segment playback.
 */
export function useDutchAudio() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [preferredVoice, setPreferredVoice] = useState(null);
  const utteranceRef = useRef(null);
  const segmentTimerRef = useRef(null);
  const cancelledRef = useRef(false);

  // Find best Dutch voice on mount
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setSpeechSupported(false);
      return;
    }

    const findDutchVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) return;

      // Filter for Dutch voices
      const dutchVoices = voices.filter(
        (v) => v.lang === 'nl-NL' || v.lang === 'nl-BE' || v.lang.startsWith('nl')
      );

      if (dutchVoices.length === 0) return;

      // Prefer nl-NL over nl-BE, then prefer female voices for clarity
      const nlNL = dutchVoices.filter((v) => v.lang === 'nl-NL');
      const pool = nlNL.length > 0 ? nlNL : dutchVoices;

      const female = pool.find(
        (v) =>
          v.name.toLowerCase().includes('female') ||
          v.name.toLowerCase().includes('vrouw') ||
          v.name.toLowerCase().includes('ellen') ||
          v.name.toLowerCase().includes('flo')
      );

      setPreferredVoice(female || pool[0]);
    };

    // Voices may load asynchronously
    findDutchVoice();
    window.speechSynthesis.addEventListener('voiceschanged', findDutchVoice);

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', findDutchVoice);
    };
  }, []);

  /**
   * Speak text with optional word-by-word highlighting.
   *
   * @param {string} text - The Dutch text to speak.
   * @param {object} options
   * @param {boolean} [options.slow] - Speak at 0.6 rate.
   * @param {number}  [options.rate] - Speech rate (default 0.9).
   * @param {number}  [options.pitch] - Pitch (default 1).
   * @param {function} [options.onWord] - Called with word index on each word boundary.
   * @param {function} [options.onEnd] - Called when speech finishes.
   */
  const speak = useCallback(
    (text, options = {}) => {
      if (!speechSupported || !text) return;

      // Cancel anything in flight
      window.speechSynthesis.cancel();
      cancelledRef.current = false;
      setCurrentWordIndex(-1);

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'nl-NL';
      utterance.rate = options.slow ? 0.6 : options.rate || 0.9;
      utterance.pitch = options.pitch || 1;
      utterance.volume = 1;

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      // Word boundary tracking for highlighting
      let wordCount = 0;
      utterance.onboundary = (event) => {
        if (event.name === 'word') {
          setCurrentWordIndex(wordCount);
          if (options.onWord) {
            options.onWord(wordCount);
          }
          wordCount++;
        }
      };

      utterance.onstart = () => {
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setCurrentWordIndex(-1);
        if (options.onEnd) options.onEnd();
      };

      utterance.onerror = (event) => {
        // 'interrupted' and 'cancelled' are expected when stop() is called
        if (event.error !== 'interrupted' && event.error !== 'canceled') {
          console.warn('Speech error:', event.error);
        }
        setIsSpeaking(false);
        setCurrentWordIndex(-1);
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [speechSupported, preferredVoice]
  );

  /**
   * Speak text segment-by-segment (word-by-word) with pauses between each.
   * Ideal for pronunciation drills where learners repeat each word.
   *
   * @param {string} text - The text to split and speak.
   * @param {object} options
   * @param {number}  [options.pauseMs=500] - Pause in ms between words.
   * @param {number}  [options.rate=0.8] - Speech rate for each segment.
   * @param {function} [options.onSegment] - Called with segment index before speaking it.
   * @param {function} [options.onEnd] - Called when all segments are done.
   */
  const speakBySegment = useCallback(
    (text, options = {}) => {
      if (!speechSupported || !text) return;

      window.speechSynthesis.cancel();
      cancelledRef.current = false;

      const segments = text.split(/\s+/).filter(Boolean);
      const pauseMs = options.pauseMs ?? 500;
      const rate = options.rate ?? 0.8;
      let index = 0;

      setIsSpeaking(true);

      const speakNext = () => {
        if (cancelledRef.current || index >= segments.length) {
          setIsSpeaking(false);
          setCurrentWordIndex(-1);
          if (options.onEnd && !cancelledRef.current) options.onEnd();
          return;
        }

        setCurrentWordIndex(index);
        if (options.onSegment) options.onSegment(index);

        const utterance = new SpeechSynthesisUtterance(segments[index]);
        utterance.lang = 'nl-NL';
        utterance.rate = rate;
        utterance.pitch = 1;
        utterance.volume = 1;

        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        utterance.onend = () => {
          index++;
          segmentTimerRef.current = setTimeout(speakNext, pauseMs);
        };

        utterance.onerror = () => {
          setIsSpeaking(false);
          setCurrentWordIndex(-1);
        };

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      };

      speakNext();
    },
    [speechSupported, preferredVoice]
  );

  /**
   * Convenience wrapper: speak at slow speed (rate 0.6).
   */
  const speakSlow = useCallback(
    (text, options = {}) => {
      return speak(text, { ...options, rate: 0.6 });
    },
    [speak]
  );

  /**
   * Cancel all speech immediately and reset state.
   */
  const stop = useCallback(() => {
    cancelledRef.current = true;
    if (segmentTimerRef.current) {
      clearTimeout(segmentTimerRef.current);
      segmentTimerRef.current = null;
    }
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    setCurrentWordIndex(-1);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      if (segmentTimerRef.current) {
        clearTimeout(segmentTimerRef.current);
      }
      window.speechSynthesis?.cancel();
    };
  }, []);

  return {
    speak,
    speakBySegment,
    speakSlow,
    stop,
    isSpeaking,
    currentWordIndex,
    speechSupported,
    preferredVoice,
  };
}

export default useDutchAudio;
