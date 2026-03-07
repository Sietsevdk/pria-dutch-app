import { Routes, Route, useLocation } from 'react-router-dom';
import { lazy, Suspense, Component, useEffect } from 'react';
import Layout from './components/Layout';
import useStreak from './hooks/useStreak';
import useProgress from './hooks/useProgress';

// Lazy-load pages for code splitting
const Home = lazy(() => import('./pages/Home'));
const Learn = lazy(() => import('./pages/Learn'));
const Lesson = lazy(() => import('./pages/Lesson'));
const Review = lazy(() => import('./pages/Review'));
const Practice = lazy(() => import('./pages/Practice'));
const Grammar = lazy(() => import('./pages/Grammar'));
const Exam = lazy(() => import('./pages/Exam'));
const Profile = lazy(() => import('./pages/Profile'));
const Pronunciation = lazy(() => import('./pages/Pronunciation'));
const KNM = lazy(() => import('./pages/KNM'));
const Conjugation = lazy(() => import('./pages/Conjugation'));
const Dictionary = lazy(() => import('./pages/Dictionary'));
const WordsLearned = lazy(() => import('./pages/WordsLearned'));

function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-charcoal/50">Loading...</p>
      </div>
    </div>
  );
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  // Reset error state when location changes (navigation)
  componentDidUpdate(prevProps) {
    if (this.state.hasError && prevProps.locationKey !== this.props.locationKey) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center px-6">
            <p className="text-lg font-semibold text-charcoal mb-2">Something went wrong</p>
            <p className="text-sm text-charcoal/50 mb-4">Try refreshing the page</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => this.setState({ hasError: false })}
                className="px-6 py-2 bg-cream-dark text-charcoal rounded-xl text-sm font-medium"
              >
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-primary text-white rounded-xl text-sm font-medium"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const location = useLocation();

  // Initialize streak and daily goals on app boot (not just Home page)
  useEffect(() => {
    useStreak.getState().checkStreak();
    useProgress.getState().resetDailyGoals();
  }, []);

  return (
    <ErrorBoundary locationKey={location.key}>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/learn" element={<Learn />} />
            <Route path="/review" element={<Review />} />
            <Route path="/practice" element={<Practice />} />
            <Route path="/grammar" element={<Grammar />} />
            <Route path="/exam" element={<Exam />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/pronunciation" element={<Pronunciation />} />
            <Route path="/knm" element={<KNM />} />
            <Route path="/conjugation" element={<Conjugation />} />
            <Route path="/dictionary" element={<Dictionary />} />
            <Route path="/words" element={<WordsLearned />} />
          </Route>
          <Route
            path="/lesson/:lessonId"
            element={
              <Suspense fallback={<Loading />}>
                <Lesson />
              </Suspense>
            }
          />
          <Route path="*" element={
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center px-6">
                <p className="text-lg font-semibold text-charcoal mb-2">Page not found</p>
                <p className="text-sm text-charcoal/50 mb-4">The page you are looking for does not exist.</p>
                <a href="/" className="px-6 py-2 bg-primary text-white rounded-xl text-sm font-medium inline-block">
                  Go Home
                </a>
              </div>
            </div>
          } />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
