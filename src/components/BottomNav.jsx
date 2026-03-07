import { NavLink } from 'react-router-dom';
import { Home, GraduationCap, BookOpen, User } from 'lucide-react';
import { motion } from 'framer-motion';

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/learn', icon: GraduationCap, label: 'Learn' },
  { to: '/dictionary', icon: BookOpen, label: 'Dictionary' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export default function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-cream-dark/50 z-50 shadow-[0_-1px_6px_rgba(0,0,0,0.06)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto px-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className="flex flex-col items-center py-2.5 px-3 min-w-[60px] relative"
            aria-label={label}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <Icon
                  size={22}
                  className={isActive ? 'text-primary' : 'text-charcoal/40'}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span
                  className={`text-[10px] mt-0.5 font-medium ${
                    isActive ? 'text-primary' : 'text-charcoal/40'
                  }`}
                >
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
