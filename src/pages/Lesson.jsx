import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Volume2, RefreshCw, SkipForward } from 'lucide-react';
import MultipleChoice from '../components/MultipleChoice';
import FillInBlank from '../components/FillInBlank';
import FlashCard from '../components/FlashCard';
import MatchPairs from '../components/MatchPairs';
import SentenceBuilder from '../components/SentenceBuilder';
import ListeningExercise from '../components/ListeningExercise';
import SpeakingExercise from '../components/SpeakingExercise';
import GrammarTip from '../components/GrammarTip';
import LessonComplete from '../components/LessonComplete';
import useProgress from '../hooks/useProgress';
import useSRS from '../hooks/useSRS';
import useStreak from '../hooks/useStreak';
import useMistakes from '../hooks/useMistakes';
import { useSpeech } from '../hooks/useSpeech';
import { shuffle, getEncouragement, getGentleCorrection, dutchWithArticle, dutchBareWord } from '../utils/dutch';
import { calculateLessonXP } from '../utils/xp';

// Eagerly load all data
const vocabModules = import.meta.glob('../data/vocabulary/*.json', { eager: true });
const grammarModules = import.meta.glob('../data/grammar/*.json', { eager: true });
const lessonsModule = import.meta.glob('../data/lessons.json', { eager: true });
let lessonsData = { phases: [] };
Object.values(lessonsModule).forEach((mod) => {
  lessonsData = mod.default || mod;
});

const allVocab = {};
const vocabByTopic = {};
Object.values(vocabModules).forEach((mod) => {
  const data = mod.default || mod;
  if (data.words) {
    vocabByTopic[data.topic] = data;
    data.words.forEach((w) => { allVocab[w.id] = w; });
  }
});

const grammarByTopic = {};
Object.values(grammarModules).forEach((mod) => {
  const data = mod.default || mod;
  if (data.topic) grammarByTopic[data.topic] = data;
});

function getLessonData(lessonId) {
  for (const phase of lessonsData.phases) {
    const lesson = phase.lessons.find((l) => l.id === Number(lessonId));
    if (lesson) return lesson;
  }
  return null;
}

function generateExercises(lesson) {
  if (!lesson) return [];
  const exercises = [];
  const words = [];

  // Collect vocabulary
  (lesson.vocabularyTopics || []).forEach((topic) => {
    const data = vocabByTopic[topic];
    if (data?.words) words.push(...data.words);
  });

  // 12 words per lesson for comprehensive learning
  const lessonWords = words.slice(0, 12);

  // ── Phase 1: Introduce & test in batches ──
  // Every word is introduced before it is tested.
  // Batches of 4: introduce → easy MC quiz on those same words.
  const batchSize = 4;
  for (let i = 0; i < lessonWords.length; i += batchSize) {
    const batch = lessonWords.slice(i, i + batchSize);

    // Introduce each word in this batch
    batch.forEach((word) => {
      exercises.push({ type: 'word_intro', word });
    });

    // Test only this batch with multiple choice
    batch.forEach((word) => {
      let otherOptions = [...new Set(
        lessonWords
          .filter((w) => w.id !== word.id && w.english !== word.english)
          .map((w) => w.english)
      )];
      // Pad from all vocab if fewer than 3 distractors available
      if (otherOptions.length < 3) {
        const allWordsList = Object.values(allVocab);
        const extras = [...new Set(
          allWordsList
            .filter((w) => w.id !== word.id && w.english !== word.english && !otherOptions.includes(w.english))
            .map((w) => w.english)
        )];
        otherOptions = [...otherOptions, ...shuffle(extras)].slice(0, 3);
      }
      exercises.push({
        type: 'multiple_choice',
        question: `What does "${dutchWithArticle(word)}" mean?`,
        options: shuffle([word.english, ...shuffle(otherOptions).slice(0, 3)]),
        correctAnswer: word.english,
        wordId: word.id,
      });
    });
  }

  // ── Phase 2: Active recall — reverse direction (English → Dutch) ──
  const reverseWords = shuffle(lessonWords).slice(0, 4);
  reverseWords.forEach((word) => {
    const otherOptions = [...new Set(
      lessonWords
        .filter((w) => w.id !== word.id && dutchWithArticle(w) !== dutchWithArticle(word))
        .map((w) => dutchWithArticle(w))
    )];
    exercises.push({
      type: 'multiple_choice',
      question: `How do you say "${word.english}" in Dutch?`,
      options: shuffle([dutchWithArticle(word), ...shuffle(otherOptions).slice(0, 3)]),
      correctAnswer: dutchWithArticle(word),
      wordId: word.id,
      direction: 'english-to-dutch',
    });
  });

  // ── Phase 3: Deeper practice on all introduced words ──

  // Fill in blank (5) — more active recall
  const fibWords = shuffle(lessonWords).slice(0, 5);
  fibWords.forEach((word) => {
    if (word.exampleNL && word.dutch) {
      const bareWord = dutchBareWord(word) || word.dutch;
      const escaped = bareWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const sentence = word.exampleNL.replace(
        new RegExp(escaped, 'i'),
        '___'
      );
      if (sentence !== word.exampleNL) {
        exercises.push({
          type: 'fill_blank',
          sentence,
          answer: bareWord.toLowerCase(),
          hint: `Translate "${word.english}" → Dutch`,
          explanation: word.exampleEN,
          englishContext: word.exampleEN,
          targetWord: word.english,
          firstLetter: bareWord.charAt(0).toLowerCase(),
          wordId: word.id,
        });
      }
    }
  });

  // Listening (3)
  const listenWords = shuffle(lessonWords).slice(0, 3);
  listenWords.forEach((word) => {
    const text = word.exampleNL || dutchWithArticle(word);
    const otherOptions = lessonWords
      .filter((w) => w.id !== word.id)
      .slice(0, 3)
      .map((w) => w.exampleNL || w.dutch);
    exercises.push({
      type: 'listening',
      text,
      options: shuffle([text, ...otherOptions]),
      correctAnswer: text,
      wordId: word.id,
    });
  });

  // ── Phase 4: Grammar — TEACH then TEST ──
  (lesson.grammarTopics || []).forEach((topic) => {
    const grammar = grammarByTopic[topic];
    if (grammar) {
      exercises.push({
        type: 'grammar_tip',
        title: grammar.topicNL || grammar.topic,
        titleEN: grammar.topicEN,
        content: grammar.explanation?.summary || '',
        contentEN: grammar.explanation?.summaryEN || '',
        tip: grammar.explanation?.tip || '',
        tipEN: grammar.explanation?.tipEN || '',
      });

      (grammar.exercises || []).slice(0, 3).forEach((ex) => {
        if (ex.type === 'fill_blank') {
          exercises.push({
            type: 'fill_blank',
            sentence: ex.sentence,
            answer: ex.answer,
            hint: '',
            explanation: ex.explanation,
          });
        } else if (ex.type === 'multiple_choice' && ex.options) {
          exercises.push({
            type: 'multiple_choice',
            question: ex.sentence,
            options: ex.options,
            correctAnswer: ex.answer,
          });
        }
      });
    }
  });

  // ── Phase 5: Mixed practice (all words now familiar) ──
  if (lessonWords.length >= 5) {
    const matchWords = shuffle(lessonWords).slice(0, 5);
    exercises.push({
      type: 'match_pairs',
      pairs: matchWords.map((w) => ({
        dutch: dutchWithArticle(w),
        english: w.english,
      })),
    });
  }

  const sbWords = lessonWords.filter((w) => w.exampleNL && w.exampleNL.split(' ').length >= 4);
  shuffle(sbWords).slice(0, 2).forEach((word) => {
    const wordsInSentence = word.exampleNL.replace(/[.,!?]/g, '').split(' ');
    if (wordsInSentence.length >= 4 && wordsInSentence.length <= 8) {
      exercises.push({
        type: 'sentence_builder',
        english: word.exampleEN,
        words: shuffle(wordsInSentence),
        correctOrder: wordsInSentence,
        wordId: word.id,
      });
    }
  });

  // Speaking (2)
  const speakWords = shuffle(lessonWords).slice(0, 2);
  speakWords.forEach((word) => {
    const text = word.exampleNL || dutchWithArticle(word);
    exercises.push({
      type: 'speaking',
      text,
      translation: word.exampleEN || word.english,
    });
  });

  return exercises;
}

function generateReviewExercises(mistakeWordIds) {
  const reviewExercises = [{ type: 'review_header' }];
  const uniqueIds = [...new Set(mistakeWordIds)];
  const allWordsList = Object.values(allVocab);

  uniqueIds.forEach((wordId, index) => {
    const word = allVocab[wordId];
    if (!word) return;

    // Alternate: even = Dutch→English (recognition), odd = English→Dutch (harder production)
    if (index % 2 === 1) {
      const otherOptions = [...new Set(
        allWordsList
          .filter((w) => w.id !== word.id && dutchWithArticle(w) !== dutchWithArticle(word))
          .map((w) => dutchWithArticle(w))
      )];
      reviewExercises.push({
        type: 'multiple_choice',
        question: `How do you say "${word.english}" in Dutch?`,
        options: shuffle([dutchWithArticle(word), ...shuffle(otherOptions).slice(0, 3)]),
        correctAnswer: dutchWithArticle(word),
        wordId: word.id,
        isReview: true,
        direction: 'english-to-dutch',
      });
    } else {
      const otherOptions = [...new Set(
        allWordsList
          .filter((w) => w.id !== word.id && w.english !== word.english)
          .map((w) => w.english)
      )];
      reviewExercises.push({
        type: 'multiple_choice',
        question: `What does "${dutchWithArticle(word)}" mean?`,
        options: shuffle([word.english, ...shuffle(otherOptions).slice(0, 3)]),
        correctAnswer: word.english,
        wordId: word.id,
        isReview: true,
      });
    }
  });

  return reviewExercises;
}

export default function Lesson() {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const completeLesson = useProgress((s) => s.completeLesson);
  const learnWord = useProgress((s) => s.learnWord);
  const recordExercise = useProgress((s) => s.recordExercise);
  const updateWordAccuracy = useProgress((s) => s.updateWordAccuracy);
  const startSession = useProgress((s) => s.startSession);
  const endSession = useProgress((s) => s.endSession);
  const addSRSItem = useSRS((s) => s.addItem);
  const recordActivity = useStreak((s) => s.recordActivity);
  const recordMistake = useMistakes((s) => s.recordMistake);
  const completeSpeakingGoal = useProgress((s) => s.completeSpeakingGoal);

  const lesson = useMemo(() => getLessonData(lessonId), [lessonId]);
  const [exercises, setExercises] = useState(() => generateExercises(lesson));

  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [mistakeCount, setMistakeCount] = useState(0);
  const [wordsIntroduced, setWordsIntroduced] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [isComplete, setIsComplete] = useState(false);
  const [mistakeIds, setMistakeIds] = useState([]);
  const [correctStreak, setCorrectStreak] = useState(0);
  const [reviewAdded, setReviewAdded] = useState(false);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const advanceTimerRef = useRef(null);
  const handleNextRef = useRef(null);

  useEffect(() => {
    startSession();
    return () => {
      endSession();
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only on mount/unmount — store actions are stable

  const currentExercise = exercises[currentIndex];
  const progress = exercises.length > 0
    ? Math.min(currentIndex + 1, exercises.length) / exercises.length
    : 0;

  const handleNext = useCallback(() => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    setFeedback(null);
    if (currentIndex + 1 >= exercises.length) {
      // Add review round for mistakes before completing
      if (mistakeIds.length > 0 && !reviewAdded) {
        const reviewExs = generateReviewExercises(mistakeIds);
        setExercises((prev) => [...prev, ...reviewExs]);
        setReviewAdded(true);
        setCurrentIndex((i) => i + 1);
      } else if (!isComplete) {
        const totalQuestions = correctCount + mistakeCount;
        const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 100;
        const xp = calculateLessonXP({
          correctAnswers: correctCount,
          totalQuestions,
          mistakes: mistakeCount,
        });
        completeLesson(Number(lessonId), accuracy, xp);
        recordActivity(xp);
        setIsComplete(true);
      }
    } else {
      setCurrentIndex((i) => Math.min(i + 1, exercises.length - 1));
    }
  }, [currentIndex, exercises.length, correctCount, mistakeCount, lessonId, isComplete, completeLesson, recordActivity, mistakeIds, reviewAdded]);

  // Keep ref in sync so timers always call the latest version
  useEffect(() => { handleNextRef.current = handleNext; }, [handleNext]);

  const handleAnswer = useCallback(
    (isCorrect, wordId) => {
      if (isCorrect) {
        const newStreak = correctStreak + 1;
        setCorrectStreak(newStreak);
        setCorrectCount((c) => c + 1);

        // Streak milestones and progress messages
        let message = getEncouragement();
        if (newStreak === 3) message = '3 in a row! Lekker bezig!';
        else if (newStreak === 5) message = '5 streak! Je bent on fire!';
        else if (newStreak === 7) message = '7 in a row! Ongelooflijk!';
        else if (newStreak >= 10 && newStreak % 5 === 0) message = `${newStreak} streak! Superster!`;

        // Progress milestones
        const pct = (currentIndex + 1) / exercises.length;
        if (pct >= 0.48 && pct < 0.55) message += '\nHalfway there!';
        else if (pct >= 0.88 && pct < 0.95) message += '\nAlmost done!';

        setFeedback({ type: 'correct', message });
      } else {
        setCorrectStreak(0);
        setMistakeCount((m) => m + 1);

        // Specific corrective feedback with correct answer
        let message = getGentleCorrection();
        if (currentExercise?.correctAnswer) {
          message = `The answer is "${currentExercise.correctAnswer}". ${message}`;
        }
        setFeedback({ type: 'incorrect', message });

        if (wordId) {
          setMistakeIds((ids) => [...ids, wordId]);
          addSRSItem(wordId, 'vocabulary');
          const word = allVocab[wordId];
          if (word) {
            recordMistake({
              word: wordId,
              correctAnswer: word.dutch,
              userAnswer: '',
              exerciseType: currentExercise?.type || 'unknown',
              category: 'vocabulary',
              lessonId: Number(lessonId),
            });
          }
        } else if (currentExercise?.type === 'fill_blank' || currentExercise?.type === 'multiple_choice') {
          // Grammar exercise mistake — record for pattern detection
          recordMistake({
            word: currentExercise.question || currentExercise.sentence || 'grammar',
            correctAnswer: currentExercise.correctAnswer || currentExercise.answer || '',
            userAnswer: '',
            exerciseType: currentExercise.type,
            category: 'grammar',
            lessonId: Number(lessonId),
          });
        }
      }

      // Track word accuracy and exercise stats
      if (wordId) {
        recordExercise(isCorrect, currentExercise?.type || 'unknown');
        updateWordAccuracy(wordId, isCorrect);
      } else {
        recordExercise(isCorrect, currentExercise?.type || 'unknown');
      }

      if (currentExercise?.type === 'speaking') {
        completeSpeakingGoal();
      }

      advanceTimerRef.current = setTimeout(() => handleNextRef.current(), isCorrect ? 1200 : 2500);
    },
    [currentExercise, lessonId, recordExercise, updateWordAccuracy, addSRSItem, recordMistake, completeSpeakingGoal, correctStreak, currentIndex, exercises.length]
  );

  const handleSkipLesson = useCallback(() => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    // Complete the lesson with current stats (what she's done so far counts)
    const totalQuestions = correctCount + mistakeCount;
    const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const xp = totalQuestions > 0 ? calculateLessonXP({
      correctAnswers: correctCount,
      totalQuestions,
      mistakes: mistakeCount,
    }) : 5; // Minimum 5 XP for skipping
    completeLesson(Number(lessonId), accuracy, xp);
    recordActivity(xp);
    setIsComplete(true);
    setShowSkipConfirm(false);
  }, [correctCount, mistakeCount, lessonId, completeLesson, recordActivity]);

  const handleWordIntro = useCallback(
    (word) => {
      learnWord(word.id);
      addSRSItem(word.id, 'vocabulary');
      setWordsIntroduced((w) => w + 1);
    },
    [learnWord, addSRSItem]
  );

  if (!lesson) {
    return (
      <div className="px-4 pt-12 text-center">
        <p className="text-charcoal/60">Lesson not found</p>
        <button
          onClick={() => navigate('/learn')}
          className="mt-4 text-primary font-medium"
        >
          Back to lessons
        </button>
      </div>
    );
  }

  if (exercises.length === 0) {
    return (
      <div className="px-4 pt-12 text-center">
        <p className="text-charcoal/60">No exercises available for this lesson</p>
        <button
          onClick={() => navigate('/learn')}
          className="mt-4 text-primary font-medium"
        >
          Back to lessons
        </button>
      </div>
    );
  }

  if (isComplete) {
    return (
      <LessonComplete
        xpEarned={calculateLessonXP({
          correctAnswers: correctCount,
          totalQuestions: correctCount + mistakeCount,
          mistakes: mistakeCount,
        })}
        accuracy={
          correctCount + mistakeCount > 0
            ? Math.round((correctCount / (correctCount + mistakeCount)) * 100)
            : 100
        }
        wordsLearned={wordsIntroduced}
        mistakeCount={mistakeCount}
        onContinue={() => navigate('/learn')}
        onReviewMistakes={() => navigate('/review')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Header bar */}
      <div className="sticky top-0 bg-cream/95 backdrop-blur-sm z-40 px-4 pt-4 pb-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/learn')}
            className="p-1.5 rounded-full hover:bg-cream-dark transition-colors"
            aria-label="Close lesson"
          >
            <X size={20} className="text-charcoal/60" />
          </button>
          <div className="flex-1 h-2.5 bg-cream-dark rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <span className="text-xs text-charcoal/50 font-medium min-w-[32px] text-right">
            {Math.min(currentIndex + 1, exercises.length)}/{exercises.length}
          </span>
          <button
            onClick={() => setShowSkipConfirm(true)}
            className="p-1.5 rounded-full hover:bg-warning/10 transition-colors"
            aria-label="Skip lesson"
            title="Skip rest of lesson"
          >
            <SkipForward size={18} className="text-charcoal/40" />
          </button>
        </div>

        {/* Skip confirmation */}
        <AnimatePresence>
          {showSkipConfirm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 bg-warning/10 rounded-xl p-3 flex items-center justify-between"
            >
              <span className="text-xs text-charcoal/70">Skip the rest of this lesson?</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSkipLesson}
                  className="text-xs font-medium text-warning px-3 py-1.5 rounded-lg bg-warning/15 hover:bg-warning/25 transition-colors"
                >
                  Yes, skip
                </button>
                <button
                  onClick={() => setShowSkipConfirm(false)}
                  className="text-xs font-medium text-charcoal/40 px-3 py-1.5 rounded-lg hover:bg-cream-dark/50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
              <WordIntro
                word={currentExercise.word}
                onLearn={handleWordIntro}
                onNext={handleNext}
              />
            )}
            {currentExercise?.type === 'review_header' && (
              <div className="text-center py-8">
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-warning/10 mb-4"
                >
                  <RefreshCw size={28} className="text-warning" />
                </motion.div>
                <h2 className="font-display text-2xl text-charcoal mb-2">Review Round</h2>
                <p className="text-charcoal/60 mb-6">
                  Let's go over the words you missed
                </p>
                <button
                  onClick={handleNext}
                  className="w-full bg-primary text-white font-semibold py-3 rounded-xl"
                >
                  Let's go!
                </button>
              </div>
            )}
            {currentExercise?.type === 'multiple_choice' && (
              <MultipleChoice
                question={currentExercise.question}
                options={currentExercise.options}
                correctAnswer={currentExercise.correctAnswer}
                onAnswer={(correct) =>
                  handleAnswer(correct, currentExercise.wordId)
                }
                type={currentExercise.direction === 'english-to-dutch' ? 'english-to-dutch' : 'dutch-to-english'}
              />
            )}
            {currentExercise?.type === 'fill_blank' && (
              <FillInBlank
                sentence={currentExercise.sentence}
                answer={currentExercise.answer}
                hint={currentExercise.hint}
                explanation={currentExercise.explanation}
                englishContext={currentExercise.englishContext}
                targetWord={currentExercise.targetWord}
                firstLetter={currentExercise.firstLetter}
                onAnswer={(correct) =>
                  handleAnswer(correct, currentExercise.wordId)
                }
              />
            )}
            {currentExercise?.type === 'listening' && (
              <ListeningExercise
                text={currentExercise.text}
                options={currentExercise.options}
                correctAnswer={currentExercise.correctAnswer}
                onAnswer={(correct) =>
                  handleAnswer(correct, currentExercise.wordId)
                }
              />
            )}
            {currentExercise?.type === 'match_pairs' && (
              <MatchPairs
                pairs={currentExercise.pairs}
                onComplete={(mistakes) => {
                  if (mistakes === 0) {
                    setCorrectCount((c) => c + 1);
                    recordExercise(true, 'match_pairs');
                  } else {
                    setMistakeCount((m) => m + mistakes);
                    recordExercise(false, 'match_pairs');
                  }
                  advanceTimerRef.current = setTimeout(() => handleNextRef.current(), 1500);
                }}
              />
            )}
            {currentExercise?.type === 'sentence_builder' && (
              <SentenceBuilder
                english={currentExercise.english}
                words={currentExercise.words}
                correctOrder={currentExercise.correctOrder}
                onAnswer={(correct) =>
                  handleAnswer(correct, currentExercise.wordId)
                }
              />
            )}
            {currentExercise?.type === 'speaking' && (
              <SpeakingExercise
                text={currentExercise.text}
                translation={currentExercise.translation}
                onAnswer={(correct) => handleAnswer(correct)}
              />
            )}
            {currentExercise?.type === 'grammar_tip' && (
              <div>
                <GrammarTip
                  title={currentExercise.title}
                  titleEN={currentExercise.titleEN}
                  content={currentExercise.content}
                  contentEN={currentExercise.contentEN}
                  tip={currentExercise.tip}
                  tipEN={currentExercise.tipEN}
                />
                <button
                  onClick={handleNext}
                  className="mt-4 w-full bg-primary text-white font-semibold py-3 rounded-xl"
                >
                  Got it!
                </button>
              </div>
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
              onClick={() => {
                if (advanceTimerRef.current) {
                  clearTimeout(advanceTimerRef.current);
                  advanceTimerRef.current = null;
                }
                handleNext();
              }}
              className={`fixed bottom-24 left-4 right-4 mx-auto max-w-lg p-4 rounded-xl text-center font-semibold cursor-pointer ${
                feedback.type === 'correct'
                  ? 'bg-success text-white'
                  : 'bg-error/90 text-white'
              }`}
            >
              {feedback.message}
              <span className="block text-xs font-normal mt-1 opacity-80">Tap to continue</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function WordIntro({ word, onLearn, onNext }) {
  const { speak, isSpeaking } = useSpeech();

  const handleSpeak = useCallback((slow = false) => {
    speak(dutchWithArticle(word), { slow });
  }, [speak, word]);

  useEffect(() => {
    onLearn(word);
    // Auto-play pronunciation
    const timer = setTimeout(() => handleSpeak(false), 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word.id]); // Intentionally only re-run when word changes, not on every callback update

  return (
    <div className="text-center py-4">
      <p className="text-sm text-charcoal/50 mb-2 uppercase tracking-wide font-medium">
        New word
      </p>

      <motion.div
        className="bg-white rounded-3xl p-8 shadow-sm border border-cream-dark/50 mb-4"
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        <div className="text-3xl font-display font-semibold text-charcoal mb-2">
          {word.article && (
            <span className="text-primary/60 text-2xl">{word.article} </span>
          )}
          {dutchBareWord(word)}
        </div>

        {/* Audio buttons: normal + slow */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <button
            onClick={() => handleSpeak(false)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors ${
              isSpeaking ? 'bg-primary text-white' : 'text-primary hover:bg-primary/5'
            }`}
            aria-label="Listen to pronunciation"
          >
            <Volume2 size={16} />
            <span className="text-sm font-medium">{word.pronunciation || 'Listen'}</span>
          </button>
          <button
            onClick={() => handleSpeak(true)}
            className="px-3 py-1.5 rounded-full bg-cream text-charcoal/60 hover:bg-primary/10 hover:text-primary text-xs font-medium transition-colors"
            aria-label="Listen slowly"
          >
            🐢 Slow
          </button>
        </div>

        <div className="text-xl text-charcoal/70 mb-4">{word.english}</div>

        {word.plural && (
          <div className="text-sm text-charcoal/50 mb-2">
            Plural: <span className="font-medium">{word.plural}</span>
          </div>
        )}

        {word.exampleNL && (
          <div className="mt-4 pt-4 border-t border-cream-dark/50 text-left">
            <p className="text-xs text-charcoal/50 mb-1 font-medium">Example sentence:</p>
            <p className="text-sm font-medium text-charcoal">
              🇳🇱 {word.exampleNL}
            </p>
            {word.exampleEN && (
              <p className="text-xs text-charcoal/50 mt-1">
                🇬🇧 {word.exampleEN}
              </p>
            )}
          </div>
        )}

        {word.audioHint && (
          <div className="mt-3 bg-cream/50 rounded-lg p-2">
            <p className="text-xs text-charcoal/60">💡 {word.audioHint}</p>
          </div>
        )}
      </motion.div>

      <button
        onClick={onNext}
        className="w-full bg-primary text-white font-semibold py-3 rounded-xl hover:bg-primary-dark transition-colors"
      >
        Continue
      </button>
    </div>
  );
}
