import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Layout from './components/Layout';

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

export default function App() {
  return (
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
        </Route>
        <Route
          path="/lesson/:lessonId"
          element={
            <Suspense fallback={<Loading />}>
              <Lesson />
            </Suspense>
          }
        />
      </Routes>
    </Suspense>
  );
}
