import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, BookOpen, Headphones, PenTool, ArrowLeft, ChevronRight, Volume2, Mic, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import useProgress from '../hooks/useProgress';
import { useSpeech } from '../hooks/useSpeech';
import { shuffle } from '../utils/dutch';

const readingModule = import.meta.glob('../data/exam/reading.json', { eager: true });
const listeningModule = import.meta.glob('../data/exam/listening.json', { eager: true });
const writingModule = import.meta.glob('../data/exam/writing.json', { eager: true });
let readingData = { sections: [] };
let listeningData = { sections: [] };
let writingData = { sections: [] };
Object.values(readingModule).forEach((mod) => { readingData = mod.default || mod; });
Object.values(listeningModule).forEach((mod) => { listeningData = mod.default || mod; });
Object.values(writingModule).forEach((mod) => { writingData = mod.default || mod; });

const knmModule = import.meta.glob('../data/knm.json', { eager: true });
let knmData = { categories: [] };
Object.values(knmModule).forEach((mod) => { knmData = mod.default || mod; });

// Speaking tasks data (inline - 6 tasks per exam, 3 exams)
const speakingTasks = {
  1: [
    { id: 's1_1', situation: 'You are at a doctor\'s office.', situationNL: 'Je bent bij de huisarts.', task: 'Introduce yourself and explain you have a headache.', taskNL: 'Stel jezelf voor en vertel dat je hoofdpijn hebt.', modelPhrase: 'Goedemiddag, ik ben [naam]. Ik heb al een paar dagen hoofdpijn.' },
    { id: 's1_2', situation: 'You are at a shop.', situationNL: 'Je bent in een winkel.', task: 'Ask the shopkeeper if they have this item in a different size.', taskNL: 'Vraag de verkoper of ze dit in een andere maat hebben.', modelPhrase: 'Heeft u dit ook in een andere maat?' },
    { id: 's1_3', situation: 'You are calling a company to make an appointment.', situationNL: 'Je belt een bedrijf om een afspraak te maken.', task: 'Say who you are and ask for an appointment next week.', taskNL: 'Zeg wie je bent en vraag om een afspraak volgende week.', modelPhrase: 'Goedendag, u spreekt met [naam]. Ik wil graag een afspraak maken voor volgende week. Kan dat?' },
    { id: 's1_4', situation: 'You are at school picking up your child.', situationNL: 'Je haalt je kind op van school.', task: 'Ask the teacher how your child is doing in class.', taskNL: 'Vraag de leerkracht hoe het gaat met je kind in de klas.', modelPhrase: 'Goedemiddag juf, ik wil graag weten hoe het gaat met [naam] in de klas.' },
    { id: 's1_5', situation: 'You are at a train station.', situationNL: 'Je bent op het treinstation.', task: 'Ask a person what time the next train to Amsterdam leaves.', taskNL: 'Vraag iemand hoe laat de volgende trein naar Amsterdam vertrekt.', modelPhrase: 'Pardon, weet u hoe laat de volgende trein naar Amsterdam vertrekt?' },
    { id: 's1_6', situation: 'You are at a birthday party.', situationNL: 'Je bent op een verjaardagsfeest.', task: 'Congratulate the person and ask how old they are turning.', taskNL: 'Feliciteer de persoon en vraag hoe oud hij/zij wordt.', modelPhrase: 'Gefeliciteerd! Hoe oud word je vandaag?' },
  ],
  2: [
    { id: 's2_1', situation: 'You are at the pharmacy.', situationNL: 'Je bent bij de apotheek.', task: 'Explain that you need medicine for a cough and ask what they recommend.', taskNL: 'Vertel dat je medicijnen nodig hebt tegen hoest en vraag wat ze aanraden.', modelPhrase: 'Goedendag, ik heb last van hoest. Kunt u mij iets aanraden?' },
    { id: 's2_2', situation: 'You are at the town hall.', situationNL: 'Je bent op het gemeentehuis.', task: 'Say that you need to register at a new address.', taskNL: 'Zeg dat je je op een nieuw adres moet inschrijven.', modelPhrase: 'Goedendag, ik ben verhuisd en ik wil mij graag inschrijven op mijn nieuwe adres.' },
    { id: 's2_3', situation: 'You are at a job interview.', situationNL: 'Je bent bij een sollicitatiegesprek.', task: 'Introduce yourself and explain why you are interested in this job.', taskNL: 'Stel jezelf voor en vertel waarom je geinteresseerd bent in deze baan.', modelPhrase: 'Goedendag, mijn naam is [naam]. Ik heb veel ervaring in dit werk en ik vind het leuk om met mensen te werken.' },
    { id: 's2_4', situation: 'You are at a restaurant.', situationNL: 'Je bent in een restaurant.', task: 'Ask the waiter for the menu and say you have a food allergy.', taskNL: 'Vraag de ober om het menu en vertel dat je een voedselallergie hebt.', modelPhrase: 'Mag ik het menu alstublieft? Ik wil ook even zeggen dat ik allergisch ben voor noten.' },
    { id: 's2_5', situation: 'You meet your new neighbor.', situationNL: 'Je ontmoet je nieuwe buurman.', task: 'Introduce yourself and say you just moved in.', taskNL: 'Stel jezelf voor en vertel dat je net bent verhuisd.', modelPhrase: 'Hallo, ik ben [naam]. Ik ben net verhuisd naar deze straat. Leuk om kennis te maken!' },
    { id: 's2_6', situation: 'You are calling the school.', situationNL: 'Je belt de school.', task: 'Tell the school your child is sick and cannot come today.', taskNL: 'Vertel de school dat je kind ziek is en vandaag niet kan komen.', modelPhrase: 'Goedemorgen, u spreekt met [naam], de moeder/vader van [kind]. Mijn kind is ziek en kan vandaag niet naar school komen.' },
  ],
  3: [
    { id: 's3_1', situation: 'You are at the library.', situationNL: 'Je bent in de bibliotheek.', task: 'Ask how to get a library card and how much it costs.', taskNL: 'Vraag hoe je een bibliotheekpas kunt krijgen en hoeveel het kost.', modelPhrase: 'Goedendag, ik wil graag lid worden van de bibliotheek. Hoe kan ik een pas krijgen en wat kost het?' },
    { id: 's3_2', situation: 'You are at a parents\' evening at school.', situationNL: 'Je bent op een ouderavond op school.', task: 'Ask the teacher about your child\'s progress and what they can improve.', taskNL: 'Vraag de leerkracht over de voortgang van je kind en wat ze kunnen verbeteren.', modelPhrase: 'Goedenavond, ik wil graag weten hoe [naam] het doet op school. Zijn er dingen die beter kunnen?' },
    { id: 's3_3', situation: 'You have a flat tire on your bike.', situationNL: 'Je hebt een lekke band op je fiets.', task: 'Go to a bike shop and explain the problem. Ask how long the repair takes.', taskNL: 'Ga naar een fietsenwinkel en leg het probleem uit. Vraag hoe lang de reparatie duurt.', modelPhrase: 'Goedendag, ik heb een lekke band. Kunt u dat repareren? Hoe lang duurt het?' },
    { id: 's3_4', situation: 'You are at the supermarket checkout.', situationNL: 'Je bent bij de kassa in de supermarkt.', task: 'Ask if you can pay by card and if they have a bag.', taskNL: 'Vraag of je met een pas kunt betalen en of ze een tas hebben.', modelPhrase: 'Kan ik met de pin betalen? En heeft u ook een tas voor mij?' },
    { id: 's3_5', situation: 'You want to sign up for a sports club.', situationNL: 'Je wilt je inschrijven bij een sportclub.', task: 'Ask about the membership fees and training times.', taskNL: 'Vraag naar de contributie en de trainingstijden.', modelPhrase: 'Goedendag, ik wil graag lid worden. Wat is de contributie en wanneer zijn de trainingen?' },
    { id: 's3_6', situation: 'Your landlord comes to check the apartment.', situationNL: 'Je verhuurder komt de woning controleren.', task: 'Tell the landlord about a problem with the heating.', taskNL: 'Vertel de verhuurder over een probleem met de verwarming.', modelPhrase: 'Goedendag, ik wil even iets melden. De verwarming in de slaapkamer doet het niet goed. Kunt u dat laten repareren?' },
  ],
};

export default function Exam() {
  const [selectedExam, setSelectedExam] = useState(null); // 1, 2, or 3
  const [activeSection, setActiveSection] = useState(null); // 'reading' | 'listening' | 'writing'
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes
  const [timerActive, setTimerActive] = useState(false);
  const [writingText, setWritingText] = useState('');
  const [showModelAnswer, setShowModelAnswer] = useState(false);
  // Speaking section state
  const [speakingTaskIndex, setSpeakingTaskIndex] = useState(0);
  const [speakingResults, setSpeakingResults] = useState({});
  const [showSpeakingModel, setShowSpeakingModel] = useState(false);
  // KNM section state
  const [knmQuestions, setKnmQuestions] = useState([]);
  // Reading translation toggle
  const [showTranslation, setShowTranslation] = useState({});
  // Writing prompt navigation (must be at top level to respect Rules of Hooks)
  const [promptIndex, setPromptIndex] = useState(0);
  const { speak: examSpeak } = useSpeech();
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const durationRef = useRef(30 * 60);

  useEffect(() => {
    if (!timerActive) return;
    startTimeRef.current = Date.now();
    durationRef.current = timeLeft; // capture remaining seconds at start
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const remaining = durationRef.current - elapsed;
      if (remaining <= 0) {
        clearInterval(timerRef.current);
        setTimerActive(false);
        setTimeLeft(0);
        setShowResults(true);
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerActive]);

  // Warn user before navigating away during active exam
  useEffect(() => {
    if (!timerActive) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [timerActive]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Exam selection screen
  if (!selectedExam) {
    return (
      <div className="px-4 pt-6 pb-4">
        <motion.h1
          className="font-display text-2xl font-semibold text-charcoal mb-2"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Mock Exam
        </motion.h1>
        <p className="text-sm text-charcoal/60 mb-6">
          Practice the A2 inburgeringsexamen format
        </p>

        <div className="space-y-3">
          {[1, 2, 3].map((num) => (
            <motion.button
              key={num}
              onClick={() => setSelectedExam(num)}
              className="w-full bg-white rounded-2xl p-5 shadow-sm border border-cream-dark/50 text-left flex items-center gap-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: num * 0.1 }}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <span className="text-primary font-bold text-lg">{num}</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-charcoal">Practice Exam {num}</h3>
                <p className="text-xs text-charcoal/50 mt-0.5">
                  Reading + Listening + Writing + Speaking + KNM • ~2.5 hrs
                </p>
              </div>
              <ChevronRight size={18} className="text-charcoal/30" />
            </motion.button>
          ))}
        </div>

        <div className="mt-6 bg-primary/5 rounded-xl p-4">
          <p className="text-sm text-charcoal/70">
            💡 Each mock exam mirrors the real inburgeringsexamen: Reading (30 min), Listening (30 min), Writing (30 min), Speaking (15 min), and KNM (45 min).
          </p>
        </div>
      </div>
    );
  }

  // Section selection
  if (!activeSection) {
    return (
      <div className="px-4 pt-6 pb-4">
        <button
          onClick={() => setSelectedExam(null)}
          className="text-sm text-primary font-medium mb-4 flex items-center gap-1"
        >
          <ArrowLeft size={14} /> Back
        </button>

        <h1 className="font-display text-2xl font-semibold text-charcoal mb-6">
          Exam {selectedExam}
        </h1>

        <div className="space-y-3">
          <SectionCard
            icon={BookOpen}
            title="Reading (Lezen)"
            description="Read Dutch texts and answer questions"
            time="30 minutes"
            onClick={() => {
              setActiveSection('reading');
              setTimeLeft(30 * 60);
              setTimerActive(true);
              setAnswers({});
              setShowResults(false);
            }}
          />
          <SectionCard
            icon={Headphones}
            title="Listening (Luisteren)"
            description="Listen to Dutch audio and answer questions"
            time="30 minutes"
            onClick={() => {
              setActiveSection('listening');
              setTimeLeft(30 * 60);
              setTimerActive(true);
              setAnswers({});
              setShowResults(false);
            }}
          />
          <SectionCard
            icon={PenTool}
            title="Writing (Schrijven)"
            description="Write short texts in Dutch"
            time="30 minutes"
            onClick={() => {
              setActiveSection('writing');
              setTimeLeft(30 * 60);
              setTimerActive(true);
              setWritingText('');
              setPromptIndex(0);
              setShowModelAnswer(false);
            }}
          />
          <SectionCard
            icon={Mic}
            title="Speaking (Spreken)"
            description="Speak Dutch in everyday situations"
            time="15 minutes"
            onClick={() => {
              setActiveSection('speaking');
              setTimeLeft(15 * 60);
              setTimerActive(true);
              setSpeakingTaskIndex(0);
              setSpeakingResults({});
              setShowSpeakingModel(false);
            }}
          />
          <SectionCard
            icon={BookOpen}
            title="KNM — Dutch Society"
            description="Knowledge of Dutch society questions"
            time="45 minutes"
            onClick={() => {
              setActiveSection('knm');
              setTimeLeft(45 * 60);
              setTimerActive(true);
              setAnswers({});
              setShowResults(false);
              // Select 15 random KNM questions across categories
              const allQuestions = [];
              knmData.categories?.forEach((cat) => {
                cat.questions?.forEach((q) => {
                  allQuestions.push({ ...q, categoryName: cat.name, categoryNameNl: cat.nameNl });
                });
              });
              const shuffled = shuffle([...allQuestions]);
              setKnmQuestions(shuffled.slice(0, 15));
            }}
          />
        </div>
      </div>
    );
  }

  // Reading section
  if (activeSection === 'reading') {
    const section = readingData.sections?.find((s) => s.examNumber === selectedExam);
    const passages = section?.passages || [];

    return (
      <ExamSection
        title="Reading"
        timeLeft={timeLeft}
        formatTime={formatTime}
        onBack={() => {
          setActiveSection(null);
          setTimerActive(false);
        }}
      >
        {showResults ? (
          <ExamResults
            passages={passages}
            answers={answers}
            onBack={() => {
              setActiveSection(null);
              setTimerActive(false);
            }}
          />
        ) : (
          <div className="space-y-8">
            {passages.map((passage) => (
              <div key={passage.id} className="bg-white rounded-2xl p-5 shadow-sm border border-cream-dark/50">
                <h3 className="font-semibold text-charcoal mb-3">{passage.title}</h3>
                <div className="text-sm text-charcoal/80 leading-relaxed mb-4 bg-cream/50 rounded-xl p-4 whitespace-pre-line">
                  {passage.text}
                </div>
                {passage.textEn && (
                  <button
                    onClick={() => setShowTranslation((prev) => ({ ...prev, [passage.id]: !prev[passage.id] }))}
                    className="text-xs text-primary flex items-center gap-1 mb-4 hover:underline"
                  >
                    {showTranslation[passage.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                    {showTranslation[passage.id] ? 'Hide English translation' : 'Show English translation'}
                  </button>
                )}
                {!passage.textEn && (
                  <p className="text-xs text-charcoal/40 italic mb-4">
                    (Read the Dutch text above and answer the questions below)
                  </p>
                )}
                <AnimatePresence>
                  {showTranslation[passage.id] && passage.textEn && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="text-sm text-charcoal/60 leading-relaxed mb-6 bg-blue-50 rounded-xl p-4 border border-blue-100 whitespace-pre-line">
                        <p className="text-xs font-medium text-blue-600 mb-2">English Translation</p>
                        {passage.textEn}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="space-y-4">
                  {passage.questions?.map((q) => (
                    <div key={q.id}>
                      <p className="font-medium text-sm text-charcoal mb-2">{q.question}</p>
                      <div className="space-y-1.5">
                        {q.options?.map((opt, i) => (
                          <button
                            key={i}
                            onClick={() =>
                              setAnswers((a) => ({ ...a, [q.id]: opt }))
                            }
                            className={`w-full text-left p-3 rounded-xl text-sm transition-all ${
                              answers[q.id] === opt
                                ? 'bg-primary/10 border-primary/30 border-2 text-primary'
                                : 'bg-cream-dark/30 border border-transparent hover:bg-cream-dark/50'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <button
              onClick={() => {
                setShowResults(true);
                setTimerActive(false);
              }}
              className="w-full bg-primary text-white font-semibold py-3 rounded-xl"
            >
              Submit Answers
            </button>
          </div>
        )}
      </ExamSection>
    );
  }

  // Listening section
  if (activeSection === 'listening') {
    const section = listeningData.sections?.find((s) => s.examNumber === selectedExam);
    const passages = section?.passages || [];

    return (
      <ExamSection
        title="Listening"
        timeLeft={timeLeft}
        formatTime={formatTime}
        onBack={() => {
          setActiveSection(null);
          setTimerActive(false);
        }}
      >
        {showResults ? (
          <ExamResults
            passages={passages}
            answers={answers}
            onBack={() => {
              setActiveSection(null);
              setTimerActive(false);
            }}
          />
        ) : (
          <div className="space-y-8">
            {passages.map((passage) => (
              <div key={passage.id} className="bg-white rounded-2xl p-5 shadow-sm border border-cream-dark/50">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-charcoal">{passage.title}</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => examSpeak(passage.text)}
                      className="flex items-center gap-1 text-sm text-primary bg-primary/5 px-3 py-1.5 rounded-lg hover:bg-primary/10"
                    >
                      <Volume2 size={14} /> Play
                    </button>
                    <button
                      onClick={() => examSpeak(passage.text, { slow: true })}
                      className="text-sm text-charcoal/50 bg-cream-dark/50 px-3 py-1.5 rounded-lg hover:bg-cream-dark"
                    >
                      Slow
                    </button>
                  </div>
                </div>
                <div className="space-y-4">
                  {passage.questions?.map((q) => (
                    <div key={q.id}>
                      <p className="font-medium text-sm text-charcoal mb-2">{q.question}</p>
                      <div className="space-y-1.5">
                        {q.options?.map((opt, i) => (
                          <button
                            key={i}
                            onClick={() =>
                              setAnswers((a) => ({ ...a, [q.id]: opt }))
                            }
                            className={`w-full text-left p-3 rounded-xl text-sm transition-all ${
                              answers[q.id] === opt
                                ? 'bg-primary/10 border-primary/30 border-2 text-primary'
                                : 'bg-cream-dark/30 border border-transparent hover:bg-cream-dark/50'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <button
              onClick={() => {
                setShowResults(true);
                setTimerActive(false);
              }}
              className="w-full bg-primary text-white font-semibold py-3 rounded-xl"
            >
              Submit Answers
            </button>
          </div>
        )}
      </ExamSection>
    );
  }

  // Writing section
  if (activeSection === 'writing') {
    const section = writingData.sections?.find((s) => s.examNumber === selectedExam);
    const prompts = section?.prompts || [];
    const currentPrompt = prompts[promptIndex];

    return (
      <ExamSection
        title="Writing"
        timeLeft={timeLeft}
        formatTime={formatTime}
        onBack={() => {
          setActiveSection(null);
          setTimerActive(false);
        }}
      >
        {currentPrompt ? (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-cream-dark/50">
              <p className="text-sm text-charcoal/60 mb-2">
                Prompt {promptIndex + 1} of {prompts.length}
              </p>
              <div className="mb-3">
                <p className="text-xs font-medium text-blue-600 mb-1">Situation (English):</p>
                <p className="font-medium text-charcoal">{currentPrompt.situation}</p>
              </div>
              <div className="mb-3 bg-cream/50 rounded-lg p-3">
                <p className="text-xs font-medium text-orange-600 mb-1">Opdracht (Nederlands):</p>
                <p className="text-sm text-charcoal/80 italic">{currentPrompt.prompt}</p>
              </div>
              <p className="text-xs text-charcoal/50 mt-2">
                Write {currentPrompt.wordCount?.min}–{currentPrompt.wordCount?.max} words
              </p>
              {currentPrompt.tips?.length > 0 && (
                <div className="mt-3 bg-cream/50 rounded-lg p-3">
                  <p className="text-xs font-medium text-charcoal/60 mb-1">Tips:</p>
                  <ul className="text-xs text-charcoal/50 space-y-0.5">
                    {currentPrompt.tips.map((tip, i) => (
                      <li key={i}>• {tip}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <textarea
              value={writingText}
              onChange={(e) => setWritingText(e.target.value)}
              placeholder="Schrijf je antwoord hier..."
              className="w-full bg-white rounded-2xl p-4 min-h-[160px] text-sm border border-cream-dark/50 focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/20 resize-none"
            />
            <p className="text-xs text-charcoal/50 text-right">
              {writingText.trim().split(/\s+/).filter(Boolean).length} words
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowModelAnswer(true)}
                className="flex-1 bg-cream-dark text-charcoal font-medium py-3 rounded-xl"
              >
                Show Model Answer
              </button>
              {promptIndex + 1 < prompts.length && (
                <button
                  onClick={() => {
                    setPromptIndex((i) => i + 1);
                    setWritingText('');
                    setShowModelAnswer(false);
                  }}
                  className="flex-1 bg-primary text-white font-semibold py-3 rounded-xl"
                >
                  Next Prompt
                </button>
              )}
            </div>

            <AnimatePresence>
              {showModelAnswer && currentPrompt.modelAnswer && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-success/5 border border-success/20 rounded-2xl p-4">
                    <h4 className="font-semibold text-sm text-success mb-2">Model Answer</h4>
                    <p className="text-sm text-charcoal/80">{currentPrompt.modelAnswer}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <p className="text-center text-charcoal/60 py-8">
            Writing prompts coming soon!
          </p>
        )}
      </ExamSection>
    );
  }

  // Speaking section
  if (activeSection === 'speaking') {
    const tasks = speakingTasks[selectedExam] || [];
    const currentTask = tasks[speakingTaskIndex];
    const totalTasks = tasks.length;
    const completedCount = Object.keys(speakingResults).length;

    return (
      <ExamSection
        title="Speaking"
        timeLeft={timeLeft}
        formatTime={formatTime}
        onBack={() => {
          setActiveSection(null);
          setTimerActive(false);
        }}
      >
        {!currentTask || speakingTaskIndex >= totalTasks ? (
          // Speaking results
          <div>
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">{completedCount === totalTasks ? '🎙️' : '💪'}</div>
              <h2 className="font-display text-2xl font-semibold text-charcoal">
                Speaking Complete!
              </h2>
              <p className="text-charcoal/60 mt-1">
                {Object.values(speakingResults).filter((r) => r === 'good').length}/{totalTasks} tasks you felt confident about
              </p>
            </div>
            <div className="space-y-3">
              {tasks.map((t, i) => (
                <div
                  key={t.id}
                  className={`p-4 rounded-xl border ${
                    speakingResults[t.id] === 'good'
                      ? 'border-success/30 bg-success/5'
                      : 'border-orange-300 bg-orange-50'
                  }`}
                >
                  <p className="text-sm font-medium text-charcoal mb-1">Task {i + 1}: {t.task}</p>
                  <p className="text-xs text-charcoal/50 italic mb-1">{t.taskNL}</p>
                  <p className="text-xs text-charcoal/60 mt-1">
                    Model phrase: <span className="font-medium">{t.modelPhrase}</span>
                  </p>
                  <p className="text-xs mt-1">
                    {speakingResults[t.id] === 'good' ? (
                      <span className="text-success flex items-center gap-1"><CheckCircle size={12} /> I could say it</span>
                    ) : (
                      <span className="text-orange-600 flex items-center gap-1"><XCircle size={12} /> I struggled</span>
                    )}
                  </p>
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                setActiveSection(null);
                setTimerActive(false);
              }}
              className="w-full mt-6 bg-primary text-white font-semibold py-3 rounded-xl"
            >
              Back to Exam
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-cream-dark/50">
              <p className="text-sm text-charcoal/60 mb-3">
                Task {speakingTaskIndex + 1} of {totalTasks}
              </p>

              {/* Situation */}
              <div className="mb-4">
                <p className="text-xs font-medium text-blue-600 mb-1">Situation (English):</p>
                <p className="font-medium text-charcoal">{currentTask.situation}</p>
                <p className="text-xs font-medium text-orange-600 mt-2 mb-1">Situatie (Nederlands):</p>
                <p className="text-sm text-charcoal/70 italic">{currentTask.situationNL}</p>
              </div>

              {/* Task instruction */}
              <div className="bg-cream/50 rounded-xl p-4 mb-4">
                <p className="text-xs font-medium text-blue-600 mb-1">What you need to say (English):</p>
                <p className="text-sm font-medium text-charcoal mb-2">{currentTask.task}</p>
                <p className="text-xs font-medium text-orange-600 mb-1">Wat je moet zeggen (Nederlands):</p>
                <p className="text-sm text-charcoal/70 italic">{currentTask.taskNL}</p>
              </div>

              {/* Record / Self-assessment */}
              <div className="flex flex-col gap-3">
                <p className="text-xs font-medium text-charcoal/60">Try saying it out loud, then assess yourself:</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setSpeakingResults((prev) => ({ ...prev, [currentTask.id]: 'good' }));
                    }}
                    className={`flex-1 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                      speakingResults[currentTask.id] === 'good'
                        ? 'bg-success/10 border-2 border-success/40 text-success'
                        : 'bg-cream-dark/30 border border-transparent hover:bg-success/5 text-charcoal/70'
                    }`}
                  >
                    <CheckCircle size={16} /> I could say it
                  </button>
                  <button
                    onClick={() => {
                      setSpeakingResults((prev) => ({ ...prev, [currentTask.id]: 'struggled' }));
                    }}
                    className={`flex-1 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                      speakingResults[currentTask.id] === 'struggled'
                        ? 'bg-orange-100 border-2 border-orange-300 text-orange-700'
                        : 'bg-cream-dark/30 border border-transparent hover:bg-orange-50 text-charcoal/70'
                    }`}
                  >
                    <XCircle size={16} /> I struggled
                  </button>
                </div>
              </div>
            </div>

            {/* Show model phrase button */}
            <button
              onClick={() => setShowSpeakingModel(!showSpeakingModel)}
              className="w-full bg-cream-dark text-charcoal font-medium py-3 rounded-xl flex items-center justify-center gap-2"
            >
              {showSpeakingModel ? <EyeOff size={16} /> : <Eye size={16} />}
              {showSpeakingModel ? 'Hide Model Phrase' : 'Show Model Phrase'}
            </button>

            <AnimatePresence>
              {showSpeakingModel && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-success/5 border border-success/20 rounded-2xl p-4">
                    <h4 className="font-semibold text-sm text-success mb-2">Model Phrase (Voorbeeldzin)</h4>
                    <p className="text-sm text-charcoal/80 italic">{currentTask.modelPhrase}</p>
                    <button
                      onClick={() => examSpeak(currentTask.modelPhrase)}
                      className="mt-2 flex items-center gap-1 text-xs text-primary bg-primary/5 px-3 py-1.5 rounded-lg hover:bg-primary/10"
                    >
                      <Volume2 size={12} /> Listen to model phrase
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Next task button */}
            <button
              onClick={() => {
                setSpeakingTaskIndex((i) => i + 1);
                setShowSpeakingModel(false);
              }}
              disabled={!speakingResults[currentTask.id]}
              className={`w-full font-semibold py-3 rounded-xl transition-all ${
                speakingResults[currentTask.id]
                  ? 'bg-primary text-white'
                  : 'bg-cream-dark/50 text-charcoal/30 cursor-not-allowed'
              }`}
            >
              {speakingTaskIndex + 1 < totalTasks ? 'Next Task' : 'See Results'}
            </button>
          </div>
        )}
      </ExamSection>
    );
  }

  // KNM section
  if (activeSection === 'knm') {
    return (
      <ExamSection
        title="KNM — Dutch Society"
        timeLeft={timeLeft}
        formatTime={formatTime}
        onBack={() => {
          setActiveSection(null);
          setTimerActive(false);
        }}
      >
        {showResults ? (
          <KnmResults
            questions={knmQuestions}
            answers={answers}
            onBack={() => {
              setActiveSection(null);
              setTimerActive(false);
            }}
          />
        ) : (
          <div className="space-y-6">
            <p className="text-sm text-charcoal/60">
              Answer 15 questions about Dutch society (Kennis van de Nederlandse Maatschappij).
            </p>
            {knmQuestions.map((q, idx) => (
              <div key={q.id || idx} className="bg-white rounded-2xl p-5 shadow-sm border border-cream-dark/50">
                <p className="text-xs text-charcoal/40 mb-2">
                  Question {idx + 1} of {knmQuestions.length} — {q.categoryName}
                </p>
                <p className="font-medium text-sm text-charcoal mb-1">{q.question}</p>
                {q.questionEn && (
                  <p className="text-xs text-charcoal/50 italic mb-3">{q.questionEn}</p>
                )}
                <div className="space-y-1.5">
                  {q.options?.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() =>
                        setAnswers((a) => ({ ...a, [`knm_${q.id}`]: i }))
                      }
                      className={`w-full text-left p-3 rounded-xl text-sm transition-all ${
                        answers[`knm_${q.id}`] === i
                          ? 'bg-primary/10 border-primary/30 border-2 text-primary'
                          : 'bg-cream-dark/30 border border-transparent hover:bg-cream-dark/50'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <button
              onClick={() => {
                setShowResults(true);
                setTimerActive(false);
              }}
              className="w-full bg-primary text-white font-semibold py-3 rounded-xl"
            >
              Submit Answers
            </button>
          </div>
        )}
      </ExamSection>
    );
  }

  return null;
}

function ExamSection({ title, timeLeft, formatTime, onBack, children }) {
  return (
    <div className="px-4 pt-4 pb-4">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="text-sm text-primary font-medium flex items-center gap-1">
          <ArrowLeft size={14} /> Back
        </button>
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-cream-dark/50">
          <Clock size={14} className={timeLeft < 300 ? 'text-error' : 'text-charcoal/50'} />
          <span className={`text-sm font-mono font-medium ${timeLeft < 300 ? 'text-error' : 'text-charcoal'}`}>
            {formatTime(timeLeft)}
          </span>
        </div>
      </div>
      {children}
    </div>
  );
}

function ExamResults({ passages, answers, onBack }) {
  let correct = 0;
  let total = 0;

  passages.forEach((p) => {
    p.questions?.forEach((q) => {
      total++;
      if (answers[q.id] === q.answer) correct++;
    });
  });

  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <div>
      <div className="text-center mb-6">
        <div className="text-4xl mb-2">{percentage >= 70 ? '🎉' : '💪'}</div>
        <h2 className="font-display text-2xl font-semibold text-charcoal">
          {percentage >= 70 ? 'Passed!' : 'Keep practicing!'}
        </h2>
        <p className="text-charcoal/60 mt-1">
          {correct}/{total} correct ({percentage}%)
        </p>
      </div>

      <div className="space-y-4">
        {passages.map((p) =>
          p.questions?.map((q) => {
            const isCorrect = answers[q.id] === q.answer;
            return (
              <div
                key={q.id}
                className={`p-4 rounded-xl border ${
                  isCorrect ? 'border-success/30 bg-success/5' : 'border-error/30 bg-error/5'
                }`}
              >
                <p className="text-sm font-medium text-charcoal mb-1">{q.question}</p>
                <p className="text-xs text-charcoal/60">
                  Your answer: <span className={isCorrect ? 'text-success' : 'text-error'}>{answers[q.id] || '—'}</span>
                </p>
                {!isCorrect && (
                  <p className="text-xs text-success mt-0.5">Correct: {q.answer}</p>
                )}
                {q.explanation && (
                  <p className="text-xs text-charcoal/50 mt-1">
                    <span className="font-medium text-charcoal/60">EN:</span> {q.explanation}
                  </p>
                )}
                {q.explanationNl && (
                  <p className="text-xs text-charcoal/50 mt-0.5">
                    <span className="font-medium text-charcoal/60">NL:</span> {q.explanationNl}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      <button
        onClick={onBack}
        className="w-full mt-6 bg-primary text-white font-semibold py-3 rounded-xl"
      >
        Back to Exam
      </button>
    </div>
  );
}

function KnmResults({ questions, answers, onBack }) {
  let correct = 0;
  let total = questions.length;

  questions.forEach((q) => {
    if (answers[`knm_${q.id}`] === q.correct) correct++;
  });

  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <div>
      <div className="text-center mb-6">
        <div className="text-4xl mb-2">{percentage >= 70 ? '🎉' : '💪'}</div>
        <h2 className="font-display text-2xl font-semibold text-charcoal">
          {percentage >= 70 ? 'Passed!' : 'Keep practicing!'}
        </h2>
        <p className="text-charcoal/60 mt-1">
          {correct}/{total} correct ({percentage}%)
        </p>
        <p className="text-xs text-charcoal/40 mt-1">
          You need 70% to pass the KNM exam
        </p>
      </div>

      <div className="space-y-4">
        {questions.map((q, idx) => {
          const userAnswer = answers[`knm_${q.id}`];
          const isCorrect = userAnswer === q.correct;
          return (
            <div
              key={q.id || idx}
              className={`p-4 rounded-xl border ${
                isCorrect ? 'border-success/30 bg-success/5' : 'border-error/30 bg-error/5'
              }`}
            >
              <p className="text-xs text-charcoal/40 mb-1">{q.categoryName}</p>
              <p className="text-sm font-medium text-charcoal mb-1">{q.question}</p>
              {q.questionEn && (
                <p className="text-xs text-charcoal/50 italic mb-2">{q.questionEn}</p>
              )}
              <p className="text-xs text-charcoal/60">
                Your answer:{' '}
                <span className={isCorrect ? 'text-success' : 'text-error'}>
                  {userAnswer !== undefined ? q.options[userAnswer] : '—'}
                </span>
              </p>
              {!isCorrect && (
                <p className="text-xs text-success mt-0.5">
                  Correct: {q.options[q.correct]}
                </p>
              )}
              {q.explanation && (
                <p className="text-xs text-charcoal/50 mt-1">
                  <span className="font-medium text-charcoal/60">EN:</span> {q.explanation}
                </p>
              )}
              {q.explanationNl && (
                <p className="text-xs text-charcoal/50 mt-0.5">
                  <span className="font-medium text-charcoal/60">NL:</span> {q.explanationNl}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={onBack}
        className="w-full mt-6 bg-primary text-white font-semibold py-3 rounded-xl"
      >
        Back to Exam
      </button>
    </div>
  );
}

function SectionCard({ icon: Icon, title, description, time, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      className="w-full bg-white rounded-2xl p-5 shadow-sm border border-cream-dark/50 text-left flex items-center gap-4"
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
        <Icon size={20} className="text-primary" />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-charcoal">{title}</h3>
        <p className="text-xs text-charcoal/50">{description}</p>
      </div>
      <div className="text-xs text-charcoal/40 flex items-center gap-1">
        <Clock size={12} />
        {time}
      </div>
    </motion.button>
  );
}
