import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Search, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/parties', icon: Users, label: 'Parties' },
  { path: '/search', icon: Search, label: 'Search' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export default function BottomNav() {
  const location = useLocation();

  // Don't show on party detail pages
  if (location.pathname.startsWith('/parties/')) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 hide-desktop"
      style={{
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(148, 163, 184, 0.1)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
          return (
            <NavLink
              key={path}
              to={path}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 min-w-[60px]',
                isActive ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'
              )}
            >
              <Icon className={cn('w-5 h-5 transition-transform', isActive && 'scale-110')} />
              <span className="text-[10px] font-medium">{label}</span>
              {isActive && (
                <div className="absolute -bottom-0 w-8 h-0.5 rounded-full bg-amber-400" />
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
