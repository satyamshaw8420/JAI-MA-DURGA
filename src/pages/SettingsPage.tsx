import { useAuth } from '@/hooks/useAuth';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { LogOut, User, Wifi, WifiOff, Moon, Sun, Monitor, Info, Shield, Smartphone } from 'lucide-react';
import { useState, useEffect } from 'react';

/* Hover shadow CSS — injected once via useEffect */
const SETTINGS_HOVER_CSS = `
@media (min-width: 1024px) {
  .settings-grid {
    grid-template-columns: 1fr 1fr !important;
  }
  .settings-card {
    transition: box-shadow 0.2s ease, border-color 0.2s ease;
  }
  .settings-card:hover {
    box-shadow: 0 4px 24px rgba(0,0,0,0.08), 0 1px 6px rgba(0,0,0,0.04);
    border-color: #cbd5e1 !important;
  }
  .settings-card-danger:hover {
    box-shadow: 0 4px 24px rgba(220,38,38,0.10), 0 1px 6px rgba(220,38,38,0.06);
    border-color: #f87171 !important;
  }
}
`;

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const isOnline = useOnlineStatus();
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark' | 'system') || 'light';
  });

  // Inject hover CSS once
  useEffect(() => {
    const id = 'settings-hover-styles';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.textContent = SETTINGS_HOVER_CSS;
      document.head.appendChild(style);
    }
    return () => {
      const el = document.getElementById(id);
      if (el) el.remove();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('theme', theme);
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
    }
  }, [theme]);

  const cardStyle: React.CSSProperties = {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: 0,
  };

  const headerStyle: React.CSSProperties = {
    color: 'var(--foreground)',
    borderBottom: '1px solid var(--border)',
    padding: '14px 20px',
    fontSize: '13px',
    fontWeight: 700,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  };

  const bodyStyle: React.CSSProperties = {
    padding: '20px',
  };

  return (
    <div className="p-4 md:p-6 lg:p-8 animate-fade-in" style={{ maxWidth: '1100px', margin: '0 auto' }}>

      {/* Page Title */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ color: 'var(--foreground)', fontSize: '22px', fontWeight: 800, letterSpacing: '-0.02em' }}>Settings</h1>
        <p style={{ color: 'var(--muted-foreground)', fontSize: '13px', marginTop: '4px' }}>Manage your account, preferences, and application settings.</p>
      </div>

      {/* ═══════ 2-Column Grid on Desktop ═══════ */}
      <div className="settings-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>

        {/* ——— LEFT COLUMN ——— */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Account */}
          <div className="settings-card" style={cardStyle}>
            <div style={headerStyle}>
              <User className="w-4 h-4" /> Account
            </div>
            <div style={bodyStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="" style={{ width: '52px', height: '52px', borderRadius: 0, objectFit: 'cover', border: '2px solid var(--border)' }} />
                ) : (
                  <div style={{
                    width: '52px', height: '52px', borderRadius: 0,
                    background: 'linear-gradient(135deg, #1e3a5f, #334e68)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 800, fontSize: '20px',
                  }}>
                    {user?.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: 'var(--foreground)', fontSize: '15px', fontWeight: 700 }}>{user?.displayName || 'User'}</p>
                  <p style={{ color: 'var(--muted-foreground)', fontSize: '12px', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</p>
                </div>
                <div style={{
                  padding: '4px 10px', fontSize: '10px', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.1em', flexShrink: 0,
                  background: isOnline ? '#dcfce7' : '#fee2e2',
                  color: isOnline ? '#15803d' : '#b91c1c',
                  border: `1px solid ${isOnline ? '#86efac' : '#fca5a5'}`,
                }}>
                  {isOnline ? 'ONLINE' : 'OFFLINE'}
                </div>
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div className="settings-card" style={cardStyle}>
            <div style={headerStyle}>
              <Sun className="w-4 h-4" /> Appearance
            </div>
            <div style={bodyStyle}>
              <p style={{ color: 'var(--muted-foreground)', fontSize: '12px', marginBottom: '14px' }}>Choose how the application looks. Select a theme below.</p>
              <div style={{ display: 'flex', gap: '0px', border: '1px solid var(--border)' }}>
                {([
                  { value: 'light' as const, icon: Sun, label: 'Light' },
                  { value: 'dark' as const, icon: Moon, label: 'Dark' },
                  { value: 'system' as const, icon: Monitor, label: 'System' },
                ]).map((t, i) => (
                  <button
                    key={t.value}
                    onClick={() => setTheme(t.value)}
                    style={{
                      flex: 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      padding: '12px 0',
                      fontSize: '12px', fontWeight: 600,
                      cursor: 'pointer',
                      border: 'none',
                      borderRight: i < 2 ? '1px solid var(--border)' : 'none',
                      borderRadius: 0,
                      background: theme === t.value ? '#1e3a5f' : 'var(--card)',
                      color: theme === t.value ? '#ffffff' : 'var(--muted-foreground)',
                      transition: 'all 0.15s ease',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}
                  >
                    <t.icon style={{ width: '14px', height: '14px' }} />{t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Network Status */}
          <div className="settings-card" style={cardStyle}>
            <div style={headerStyle}>
              {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />} Network Status
            </div>
            <div style={bodyStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '10px', height: '10px', borderRadius: 0,
                  background: isOnline ? '#22c55e' : '#ef4444',
                  boxShadow: isOnline ? '0 0 8px #22c55e' : '0 0 8px #ef4444',
                }} />
                <div>
                  <p style={{ color: 'var(--foreground)', fontSize: '14px', fontWeight: 600 }}>
                    {isOnline ? 'Connected' : 'Disconnected'}
                  </p>
                  <p style={{ color: 'var(--muted-foreground)', fontSize: '11px', marginTop: '2px' }}>
                    {isOnline
                      ? 'All data is syncing with the cloud in real-time.'
                      : 'You are offline. Changes will sync when connection is restored.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ——— RIGHT COLUMN ——— */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Security */}
          <div className="settings-card" style={cardStyle}>
            <div style={headerStyle}>
              <Shield className="w-4 h-4" /> Security
            </div>
            <div style={bodyStyle}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ color: 'var(--foreground)', fontSize: '13px', fontWeight: 600 }}>Authentication Provider</p>
                    <p style={{ color: 'var(--muted-foreground)', fontSize: '11px', marginTop: '2px' }}>Google OAuth 2.0</p>
                  </div>
                  <div style={{
                    padding: '3px 8px', fontSize: '10px', fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.1em',
                    background: '#dbeafe', color: '#1d4ed8', border: '1px solid #93c5fd',
                  }}>
                    SECURED
                  </div>
                </div>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ color: 'var(--foreground)', fontSize: '13px', fontWeight: 600 }}>Data Encryption</p>
                    <p style={{ color: 'var(--muted-foreground)', fontSize: '11px', marginTop: '2px' }}>End-to-end encrypted via Firebase</p>
                  </div>
                  <div style={{
                    padding: '3px 8px', fontSize: '10px', fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.1em',
                    background: '#dcfce7', color: '#15803d', border: '1px solid #86efac',
                  }}>
                    ACTIVE
                  </div>
                </div>
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ color: 'var(--foreground)', fontSize: '13px', fontWeight: 600 }}>Session Status</p>
                    <p style={{ color: 'var(--muted-foreground)', fontSize: '11px', marginTop: '2px' }}>Signed in as {user?.displayName || user?.email}</p>
                  </div>
                  <div style={{
                    padding: '3px 8px', fontSize: '10px', fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.1em',
                    background: '#dcfce7', color: '#15803d', border: '1px solid #86efac',
                  }}>
                    ACTIVE
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* About */}
          <div className="settings-card" style={cardStyle}>
            <div style={headerStyle}>
              <Info className="w-4 h-4" /> About
            </div>
            <div style={bodyStyle}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <div style={{
                  width: '48px', height: '48px', flexShrink: 0,
                  background: 'linear-gradient(135deg, #1e3a5f, #0f172a)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 0,
                }}>
                  <Smartphone style={{ width: '22px', height: '22px', color: '#fbbf24' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ color: 'var(--foreground)', fontSize: '15px', fontWeight: 800, letterSpacing: '-0.01em' }}>
                    JAI MA DURGA IRON STORES
                  </p>
                  <p style={{ color: 'var(--muted-foreground)', fontSize: '11px', marginTop: '4px', lineHeight: 1.5 }}>
                    Business Ledger PWA — Dealer in Iron & Steel, General Order Supplier. A highly secure, offline-first Progressive Web App for managing customer accounts, tracking credit sales, and recording payments.
                  </p>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                    {['v1.0.0', 'PWA', 'Firebase', 'Offline-First'].map(tag => (
                      <span key={tag} style={{
                        padding: '3px 10px', fontSize: '10px', fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.1em',
                        background: 'var(--secondary)', color: 'var(--muted-foreground)',
                        border: '1px solid var(--border)',
                      }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Danger Zone / Sign Out */}
          <div className="settings-card settings-card-danger" style={{ ...cardStyle, borderColor: '#fca5a5' }}>
            <div style={{ ...headerStyle, background: '#fef2f2', color: '#b91c1c', borderBottomColor: '#fca5a5' }}>
              <LogOut className="w-4 h-4" /> Danger Zone
            </div>
            <div style={bodyStyle}>
              <p style={{ color: 'var(--muted-foreground)', fontSize: '12px', marginBottom: '14px' }}>
                Signing out will end your current session. You will need to sign back in to access your ledger data.
              </p>
              <button
                onClick={logout}
                className="settings-logout-btn"
                style={{
                  width: '100%', padding: '12px 0',
                  background: '#dc2626', color: '#ffffff',
                  fontSize: '13px', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  border: 'none', borderRadius: 0,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => { (e.target as HTMLElement).style.background = '#b91c1c'; }}
                onMouseLeave={e => { (e.target as HTMLElement).style.background = '#dc2626'; }}
              >
                <LogOut style={{ width: '14px', height: '14px' }} /> Confirm Sign Out
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom spacer for mobile nav */}
      <div style={{ height: '80px' }} />
    </div>
  );
}
