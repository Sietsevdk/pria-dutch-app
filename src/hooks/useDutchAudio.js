import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Enhanced audio hook for Dutch pronunciation training.
 * Wraps Web Speech API with Dutch-specific voice selection,
 * word-by-word highlighting, and segment-by-segment playback.
 *
 * iOS Safari compatibility:
 *   - All speak calls are synchronous (no async gap from user gesture)
 *   - iOS pause/resume keep-alive prevents the 15s speech cutoff bug
 */

const IS_IOS =
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

export function useDutchAudio() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [preferredVoice, setPreferredVoice] = useState(null);
  const utteranceRef = useRef(null);
  const segmentTimerRef = useRef(null);
  const cancelledRef = useRef(false);
  const iosKeepAliveRef = useRef(null);

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

  // Helper: clear iOS keep-alive interval
  const clearIOSKeepAlive = useCallback(() => {
    if (iosKeepAliveRef.current) {
      clearInterval(iosKeepAliveRef.current);
      iosKeepAliveRef.current = null;
    }
  }, []);

  // Helper: start iOS keep-alive (prevents 15s speech cutoff)
  const startIOSKeepAlive = useCallback(() => {
    if (!IS_IOS) return;
    clearIOSKeepAlive();
    iosKeepAliveRef.current = setInterval(() => {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      } else {
        clearIOSKeepAlive();
      }
    }, 5000);
  }, [clearIOSKeepAlive]);

  /**
   * Speak text with optional word-by-word highlighting.
   * SYNCHRONOUS from user gesture — safe for iOS Safari.
   */
  const speak = useCallback(
    (text, options = {}) => {
      if (!speechSupported || !text) return;

      // Cancel anything in flight
      window.speechSynthesis.cancel();
      clearIOSKeepAlive();
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
        startIOSKeepAlive();
      };

      utterance.onend = () => {
        clearIOSKeepAlive();
        setIsSpeaking(false);
        setCurrentWordIndex(-1);
        if (options.onEnd) options.onEnd();
      };

      utterance.onerror = (event) => {
        clearIOSKeepAlive();
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
    [speechSupported, preferredVoice, clearIOSKeepAlive, startIOSKeepAlive]
  );

  /**
   * Speak text segment-by-segment (word-by-word) with pauses between each.
   * Ideal for pronunciation drills where learners repeat each word.
   */
  const speakBySegment = useCallback(
    (text, options = {}) => {
      if (!speechSupported || !text) return;

      window.speechSynthesis.cancel();
      clearIOSKeepAlive();
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
          if (options.onEnd) options.onEnd();
        };

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      };

      speakNext();
    },
    [speechSupported, preferredVoice, clearIOSKeepAlive]
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
    clearIOSKeepAlive();
    if (segmentTimerRef.current) {
      clearTimeout(segmentTimerRef.current);
      segmentTimerRef.current = null;
    }
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    setCurrentWordIndex(-1);
  }, [clearIOSKeepAlive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelledRef.current = true;
      clearIOSKeepAlive();
      if (segmentTimerRef.current) {
        clearTimeout(segmentTimerRef.current);
      }
      window.speechSynthesis?.cancel();
    };
  }, [clearIOSKeepAlive]);

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
