import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Search, Settings, Building2,
  ChevronLeft, LogOut, BookOpen, CreditCard,
  FileBarChart, Bell, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/parties', icon: Users, label: 'Parties' },
  { path: '/ledger', icon: BookOpen, label: 'Ledger' },
  { path: '/payments', icon: CreditCard, label: 'Payments' },
  { path: '/reports', icon: FileBarChart, label: 'Reports' },
  { path: '/search', icon: Search, label: 'Search' },
  { path: '/reminders', icon: Bell, label: 'Reminders' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

interface SidebarProps {
  mobileMenuOpen?: boolean;
  setMobileMenuOpen?: (open: boolean) => void;
  collapsed?: boolean;
  setCollapsed?: (collapsed: boolean) => void;
}

export default function Sidebar({ mobileMenuOpen, setMobileMenuOpen, collapsed, setCollapsed }: SidebarProps) {
  const location = useLocation();
  const { user } = useAuth();

  // For avatar initials
  const getInitials = () => {
    if (!user?.email) return 'SS';
    const parts = user.email.split('@')[0].split('.');
    if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
    return user.email.substring(0, 2).toUpperCase();
  };

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';
  const isCollapsed = collapsed && !mobileMenuOpen;
  const sidebarWidth = isCollapsed ? 'w-[72px]' : 'w-[260px]';

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen?.(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed md:sticky top-0 z-50 flex flex-col h-screen transition-all duration-300',
          sidebarWidth,
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
        style={{ background: '#0B1A30' }}
      >

        {/* Logo Area + Close/Collapse */}
        <div className="flex items-center gap-3 px-4 h-20 flex-shrink-0" style={{ justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
          <div className="w-10 h-10 flex items-center justify-center flex-shrink-0 border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', borderRadius: 0 }}>
            <Building2 className="w-5 h-5 text-[#0B1A30]" />
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden flex-1">
              <p className="text-[14px] font-bold text-white leading-tight tracking-wide">JAI MA DURGA</p>
              <p className="text-[11px] text-amber-400 font-medium tracking-widest mt-0.5">IRON STORES</p>
            </div>
          )}
          {/* Close button on mobile */}
          {mobileMenuOpen && (
            <button
              onClick={() => setMobileMenuOpen?.(false)}
              className="ml-auto p-1.5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors md:hidden"
              style={{ borderRadius: 0 }}
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Desktop Collapse Toggle */}
        <div className="hidden md:flex px-4 mb-2">
          <button
            onClick={() => setCollapsed?.(!collapsed)}
            className="w-full flex items-center justify-center gap-2 py-2 text-slate-400 hover:text-white hover:bg-white/5 transition-all text-xs font-medium"
            style={{ borderRadius: 0, border: '1px solid rgba(255,255,255,0.06)' }}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft className={cn("w-4 h-4 transition-transform duration-300", collapsed && "rotate-180")} />
            {!isCollapsed && <span>Collapse</span>}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-2 custom-scrollbar">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

            return (
              <NavLink
                key={path}
                to={path}
                onClick={() => setMobileMenuOpen?.(false)}
                className={cn(
                  'flex items-center gap-3 py-2.5 transition-all duration-200 text-[13px] font-medium group',
                  isCollapsed ? 'justify-center px-0' : 'px-4',
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                )}
                style={{ borderRadius: 0 }}
                title={isCollapsed ? label : undefined}
              >
                <Icon className={cn("w-5 h-5 flex-shrink-0 transition-colors", isActive ? "text-white" : "text-slate-400 group-hover:text-white")} />
                {!isCollapsed && <span>{label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* User Profile Section — NO logout, NO arrow */}
        <div className="p-3 mt-auto" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div
            className="flex items-center gap-3 p-2.5 transition-colors"
            style={{ borderRadius: 0, justifyContent: isCollapsed ? 'center' : 'flex-start' }}
          >
            <div className="w-9 h-9 bg-white text-[#0B1A30] flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ borderRadius: 0 }}>
              {getInitials()}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate capitalize">{displayName}</p>
                <p className="text-xs text-slate-400 truncate">Owner</p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
