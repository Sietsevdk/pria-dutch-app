import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, ChevronDown } from 'lucide-react';

/**
 * GrammarTip - Collapsible grammar explanation card.
 * Shows a lightbulb-accented card with a title, explanation content, and optional tip.
 */
export default function GrammarTip({ title, content, tip }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="w-full max-w-md mx-auto">
      <motion.div
        layout
        className="bg-white rounded-2xl shadow-sm border border-cream-dark/30 overflow-hidden"
      >
        {/* Header - always visible */}
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className="w-full flex items-center gap-3 p-4 text-left hover:bg-cream/50 transition-colors"
          aria-expanded={isOpen}
          aria-controls="grammar-tip-content"
        >
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-warning/15 flex items-center justify-center">
            <Lightbulb size={20} className="text-warning" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-warning font-medium uppercase tracking-wide">
              Grammar Tip
            </p>
            <p className="text-sm font-medium text-charcoal truncate">
              {title}
            </p>
          </div>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown size={18} className="text-charcoal-light/40" />
          </motion.div>
        </button>

        {/* Expandable content */}
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              id="grammar-tip-content"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-3">
                {/* Divider */}
                <div className="h-px bg-cream-dark/30" />

                {/* Content */}
                <div className="text-sm text-charcoal-light leading-relaxed">
                  {typeof content === 'string' ? (
                    <p>{content}</p>
                  ) : (
                    content
                  )}
                </div>

                {/* Tip box */}
                {tip && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="p-3 bg-primary/5 border border-primary/15 rounded-xl"
                  >
                    <p className="text-sm text-primary font-medium flex items-start gap-2">
                      <span className="mt-0.5 flex-shrink-0">
                        <Lightbulb size={14} />
                      </span>
                      <span>{tip}</span>
                    </p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
