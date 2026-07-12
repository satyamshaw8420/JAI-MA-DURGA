import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Loader2 } from 'lucide-react';

export default function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, isWorkspaceLoading } = useAuthStore();

  // Show loading spinner while auth / workspace resolves
  if (isLoading || isWorkspaceLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)' }}>
        <Loader2 className="w-10 h-10 text-amber-400 animate-spin mb-4" />
        <p className="text-slate-400 text-sm font-semibold tracking-wide uppercase">Loading...</p>
      </div>
    );
  }

  // Not logged in → send to login page
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Logged in → always let them through.
  // - Whitelisted users  → activeWorkspaceId = ownerUid  → see shared business data
  // - Everyone else      → activeWorkspaceId = user.uid  → see their own empty workspace
  return <>{children}</>;
}
