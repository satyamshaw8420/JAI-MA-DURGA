import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Search, Settings, Building2,
  ChevronLeft, LogOut, BookOpen, CreditCard,
  FileBarChart, Bell, X, Receipt
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/create-bill', icon: Receipt, label: 'Create Bill' },
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
        <div className="flex items-center gap-3 px-5 h-20 flex-shrink-0" style={{ justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
          <div className="w-10 h-10 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.2)] rounded-xl"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
            <Building2 className="w-5 h-5 text-white" />
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
              className="ml-auto p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors md:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Desktop Collapse Toggle */}
        <div className="hidden md:flex px-4 mb-4">
          <button
            onClick={() => setCollapsed?.(!collapsed)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all text-[12px] font-semibold border border-white/5"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft className={cn("w-4 h-4 transition-transform duration-300", collapsed && "rotate-180")} />
            {!isCollapsed && <span>Collapse</span>}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-2 px-3 space-y-1 custom-scrollbar">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

            return (
              <NavLink
                key={path}
                to={path}
                onClick={() => setMobileMenuOpen?.(false)}
                className={cn(
                  'flex items-center gap-3 py-2.5 rounded-xl transition-all duration-200 text-[14px] font-semibold group relative overflow-hidden',
                  isCollapsed ? 'justify-center px-0' : 'px-4',
                  isActive
                    ? 'text-white shadow-[0_4px_20px_rgba(0,0,0,0.1)]'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                )}
                title={isCollapsed ? label : undefined}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-90 z-0"></div>
                )}
                <Icon className={cn("w-[22px] h-[22px] flex-shrink-0 transition-colors z-10", isActive ? "text-white" : "text-slate-400 group-hover:text-white")} />
                {!isCollapsed && <span className="z-10">{label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* User Profile Section */}
        <div className="p-4 mt-auto border-t border-white/5">
          <div
            className="flex items-center gap-3 p-2 rounded-2xl hover:bg-white/5 transition-colors cursor-pointer"
            style={{ justifyContent: isCollapsed ? 'center' : 'flex-start' }}
          >
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0 shadow-inner">
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
