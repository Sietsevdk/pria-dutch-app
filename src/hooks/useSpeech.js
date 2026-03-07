import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Hook for Text-to-Speech and Speech Recognition
 *
 * TTS strategy:
 *   1. Primary: Google Translate TTS via <audio> — natural-sounding Dutch
 *   2. Fallback: Browser SpeechSynthesis with optimised voice selection
 *
 * Speech Recognition: Web Speech API for Dutch (nl-NL)
 */
export function useSpeech() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [speechSupported, setSpeechSupported] = useState(() => typeof window !== 'undefined' && 'speechSynthesis' in window);
  const [recognitionSupported, setRecognitionSupported] = useState(true);
  const recognitionRef = useRef(null);
  const audioRef = useRef(null);
  const selectedVoiceRef = useRef(null);
  const voicesLoadedRef = useRef(false);
  const recognitionTimeoutRef = useRef(null);
  const gotResultRef = useRef(false);

  // ── Voice selection for SpeechSynthesis fallback ──

  const rankDutchVoice = useCallback((voice) => {
    let score = 0;
    const name = voice.name.toLowerCase();

    if (voice.lang === 'nl-NL') score += 10;
    else if (voice.lang.startsWith('nl')) score += 5;

    // Neural / premium voices (best quality)
    if (name.includes('premium')) score += 60;
    if (name.includes('enhanced')) score += 50;
    if (name.includes('neural')) score += 50;

    // Platform-specific good voices
    if (name.includes('google')) score += 35;
    if (name.includes('microsoft')) score += 30;
    if (name.includes('apple')) score += 30;

    // Known good Dutch voice names
    if (name.includes('xander')) score += 20;
    if (name.includes('flo')) score += 15;
    if (name.includes('lotte')) score += 15;
    if (name.includes('ellen')) score += 10;
    if (name.includes('merel')) score += 10;

    // Prefer female voices (typically clearer for language learning)
    if (name.includes('female') || name.includes('vrouw')) score += 5;

    // Penalize low-quality
    if (name.includes('compact')) score -= 30;

    return score;
  }, []);

  const selectBestDutchVoice = useCallback(() => {
    const voices = window.speechSynthesis.getVoices();
    const dutchVoices = voices.filter(
      (v) => v.lang === 'nl-NL' || v.lang.startsWith('nl')
    );
    if (dutchVoices.length === 0) {
      selectedVoiceRef.current = null;
      return;
    }
    dutchVoices.sort((a, b) => rankDutchVoice(b) - rankDutchVoice(a));
    selectedVoiceRef.current = dutchVoices[0];
    voicesLoadedRef.current = true;
  }, [rankDutchVoice]);

  useEffect(() => {
    setSpeechSupported('speechSynthesis' in window);
    setRecognitionSupported(
      'SpeechRecognition' in window || 'webkitSpeechRecognition' in window
    );

    if ('speechSynthesis' in window) {
      selectBestDutchVoice();
      const handleVoicesChanged = () => selectBestDutchVoice();
      window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
      };
    }
  }, [selectBestDutchVoice]);

  // ── Google Translate TTS (primary — more natural) ──

  const speakWithGoogleTTS = useCallback((text, slow = false) => {
    return new Promise((resolve, reject) => {
      // Google Translate TTS endpoint — works via <audio> element
      const encoded = encodeURIComponent(text);
      // For longer text, Google limits to ~200 chars per request
      if (text.length > 200) {
        reject(new Error('text-too-long'));
        return;
      }
      // ttsspeed: 1.0 = natural conversational speed, 0.5 = learner-friendly slow
      const speed = slow ? 0.5 : 1.0;
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=nl&client=tw-ob&q=${encoded}&ttsspeed=${speed}`;

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setIsSpeaking(false);
        resolve();
      };
      audio.onerror = () => {
        setIsSpeaking(false);
        reject(new Error('google-tts-failed'));
      };

      // Short timeout — if Google doesn't respond, fall back quickly
      const timeout = setTimeout(() => {
        audio.pause();
        reject(new Error('google-tts-timeout'));
      }, 4000);

      audio.onplay = () => {
        clearTimeout(timeout);
        setIsSpeaking(true);
      };

      audio.play()
        .catch((err) => {
          clearTimeout(timeout);
          reject(err);
        });
    });
  }, []);

  // ── Browser SpeechSynthesis (fallback) ──

  const speakWithBrowserTTS = useCallback(
    (text, options = {}) => {
      return new Promise((resolve) => {
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'nl-NL';
        // 1.0 = browser default speed; 0.85 sounds natural, 0.55 for learner-slow
        utterance.rate = options.slow ? 0.55 : 0.85;
        utterance.pitch = 1.05;
        utterance.volume = 1;

        if (selectedVoiceRef.current) {
          utterance.voice = selectedVoiceRef.current;
        }

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
          setIsSpeaking(false);
          resolve();
        };
        utterance.onerror = () => {
          setIsSpeaking(false);
          resolve();
        };

        window.speechSynthesis.speak(utterance);
      });
    },
    []
  );

  // ── Public speak function — tries Google first, then browser ──

  const speak = useCallback(
    async (text, options = {}) => {
      if (!text) return;

      // Cancel any ongoing speech
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (speechSupported) {
        window.speechSynthesis.cancel();
      }

      try {
        await speakWithGoogleTTS(text, options.slow);
      } catch {
        // Fallback to browser TTS
        if (speechSupported) {
          await speakWithBrowserTTS(text, options);
        }
      }
    },
    [speechSupported, speakWithGoogleTTS, speakWithBrowserTTS]
  );

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (speechSupported) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, [speechSupported]);

  // ── Speech Recognition ──

  const clearRecognitionTimeout = useCallback(() => {
    if (recognitionTimeoutRef.current) {
      clearTimeout(recognitionTimeoutRef.current);
      recognitionTimeoutRef.current = null;
    }
  }, []);

  const abortExistingRecognition = useCallback(() => {
    clearRecognitionTimeout();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (_) {
        // ignore
      }
      recognitionRef.current = null;
    }
  }, [clearRecognitionTimeout]);

  const startListening = useCallback(
    async (options = {}) => {
      if (!recognitionSupported) return;
      abortExistingRecognition();

      if (navigator.permissions && navigator.permissions.query) {
        try {
          const permResult = await navigator.permissions.query({ name: 'microphone' });
          if (permResult.state === 'denied') {
            if (options.onError) options.onError('not-allowed');
            return;
          }
        } catch (_) {
          // continue
        }
      }

      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.lang = 'nl-NL';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 3;

      gotResultRef.current = false;

      recognition.onstart = () => {
        setIsListening(true);
        setTranscript('');
      };

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        setTranscript(finalTranscript || interimTranscript);

        if (finalTranscript && options.onResult) {
          gotResultRef.current = true;
          clearRecognitionTimeout();
          options.onResult(finalTranscript, event.results[event.resultIndex || 0][0].confidence);
        }
      };

      recognition.onend = () => {
        clearRecognitionTimeout();
        setIsListening(false);
        if (!gotResultRef.current && options.onError) {
          options.onError('no-speech');
        }
        if (options.onEnd) options.onEnd();
        recognitionRef.current = null;
      };

      recognition.onerror = (event) => {
        clearRecognitionTimeout();
        setIsListening(false);
        gotResultRef.current = true;
        if (options.onError) options.onError(event.error);
        recognitionRef.current = null;
      };

      recognitionRef.current = recognition;

      try {
        recognition.start();
      } catch (err) {
        setIsListening(false);
        if (options.onError) options.onError('start-failed');
        recognitionRef.current = null;
        return;
      }

      recognitionTimeoutRef.current = setTimeout(() => {
        if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch (_) { /* ignore */ }
        }
      }, 8000);
    },
    [recognitionSupported, abortExistingRecognition, clearRecognitionTimeout]
  );

  const stopListening = useCallback(() => {
    clearRecognitionTimeout();
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) { /* ignore */ }
      setIsListening(false);
    }
  }, [clearRecognitionTimeout]);

  const checkPronunciation = useCallback((spoken, expected) => {
    const normalizeText = (text) =>
      text
        .toLowerCase()
        .trim()
        .replace(/[.,!?;:'"]/g, '')
        .replace(/\s+/g, ' ');

    const spokenNorm = normalizeText(spoken);
    const expectedNorm = normalizeText(expected);

    if (spokenNorm === expectedNorm) return 100;

    const spokenWords = spokenNorm.split(' ');
    const expectedWords = expectedNorm.split(' ');

    let matchCount = 0;
    expectedWords.forEach((word) => {
      if (spokenWords.includes(word)) matchCount++;
    });

    return Math.round((matchCount / expectedWords.length) * 100);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortExistingRecognition();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [abortExistingRecognition]);

  return {
    speak,
    stopSpeaking,
    isSpeaking,
    speechSupported,
    startListening,
    stopListening,
    isListening,
    transcript,
    recognitionSupported,
    checkPronunciation,
  };
}

export default useSpeech;
