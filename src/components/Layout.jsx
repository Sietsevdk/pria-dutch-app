import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import BottomNav from './BottomNav';

const noNavRoutes = ['/lesson'];

export default function Layout() {
  const location = useLocation();
  const showNav = !noNavRoutes.some((r) => location.pathname.startsWith(r));

  return (
    <div className="min-h-screen bg-cream">
      <main className={`max-w-2xl mx-auto ${showNav ? 'pb-20' : ''}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      {showNav && <BottomNav />}
    </div>
  );
}
