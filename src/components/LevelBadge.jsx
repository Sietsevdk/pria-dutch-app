import { DIFFICULTY_INFO, getContentTag } from '../utils/levels';

/**
 * LevelBadge — shows a contextual difficulty badge for any piece of content.
 *
 * @param {number} difficulty  Content difficulty (1-3)
 * @param {number} userLevel   User's current level (1-3)
 * @param {boolean} compact    Smaller variant for tight spaces
 */
export default function LevelBadge({ difficulty, userLevel, compact = false }) {
  const tag = getContentTag(difficulty, userLevel);
  const info = DIFFICULTY_INFO[difficulty];

  if (!info) return null;

  const styles = {
    'your-level': {
      bg: 'bg-success/10',
      text: 'text-success',
      label: compact ? info.short : `${info.emoji} Your level`,
    },
    recommended: {
      bg: 'bg-info/10',
      text: 'text-info',
      label: compact ? info.short : `${info.emoji} Next step`,
    },
    advanced: {
      bg: 'bg-warning/10',
      text: 'text-warning',
      label: compact ? info.short : `${info.emoji} Advanced`,
    },
  };

  const s = styles[tag] || styles['your-level'];

  return (
    <span
      className={`inline-flex items-center ${s.bg} ${s.text} font-medium rounded-full ${
        compact ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5'
      }`}
    >
      {s.label}
    </span>
  );
}
