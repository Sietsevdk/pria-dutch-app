import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { RefreshCw, ArrowLeft } from 'lucide-react';
import ReviewSession from '../components/ReviewSession';
import useSRS from '../hooks/useSRS';
import { getDueItems } from '../utils/srs';

export default function Review() {
  const navigate = useNavigate();
  const srsItems = useSRS((s) => s.items);
  const dueCount = useMemo(() => getDueItems(srsItems).length, [srsItems]);

  return (
    <div className="px-4 pt-6 pb-4">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => navigate(-1)} className="p-1 -ml-1 text-charcoal/50">
            <ArrowLeft size={20} />
          </button>
          <RefreshCw size={22} className="text-primary" />
          <h1 className="font-display text-2xl font-semibold text-charcoal">
            Review
          </h1>
        </div>
        {dueCount > 0 && (
          <p className="text-sm text-charcoal/60 ml-[34px]">
            {dueCount} {dueCount === 1 ? 'word' : 'words'} to review today
          </p>
        )}
      </motion.div>

      <ReviewSession onComplete={() => navigate('/')} />
    </div>
  );
}
