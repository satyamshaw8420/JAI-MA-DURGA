import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import BottomNav from './BottomNav';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export default function AppLayout() {
  const isOnline = useOnlineStatus();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-[var(--background)] text-[var(--foreground)] font-sans transition-colors duration-200">
      {/* Desktop Sidebar */}
      <Sidebar
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Top Header */}
        <Header onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)} />

        {/* Offline Banner */}
        {!isOnline && (
          <div className="bg-amber-100 text-amber-800 px-4 py-2 text-sm flex items-center justify-center gap-2 border-b border-amber-200">
            <WifiOff className="w-4 h-4" />
            <span>You're offline — changes will sync when connected</span>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto pb-bottom-nav md:pb-0">
          <Outlet />
        </main>

        {/* Mobile Bottom Nav */}
        <BottomNav />
      </div>
    </div>
  );
}
