import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import { Mail, Lock, Eye, EyeOff, BarChart3, Shield, Briefcase, Globe, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const { isAuthenticated } = useAuthStore();
  const { loginWithGoogle, loginWithEmail, registerWithEmail, error, clearError, isLoading } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRegister) {
      await registerWithEmail(email, password);
    } else {
      await loginWithEmail(email, password);
    }
  };

  // If already logged in, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="login-page-root">
      <div className="login-panels">
      {/* ===== LEFT PANEL ===== */}
      <div className="login-left-panel">
        {/* Background Image */}
        <div className="login-left-bg">
          <img
            src="/bg-metallic.png"
            alt="Iron rods background"
            className="login-left-bg-img"
          />
          <div className="login-left-bg-overlay" />
        </div>

        {/* Content */}
        <div className="login-left-content">
          {/* Logo */}
          <div className="login-brand">
            <div className="login-brand-icon">
              <BarChart3 className="login-brand-icon-svg" />
            </div>
            <div>
              <h1 className="login-brand-title">JAI MA DURGA</h1>
              <p className="login-brand-subtitle">IRON STORES</p>
            </div>
          </div>

          {/* Hero Text */}
          <div className="login-hero">
            <h2 className="login-hero-heading">
              Industrial Grade<br />
              <span className="login-hero-heading-accent">Ledger Management</span>
            </h2>
            <p className="login-hero-description">
              Streamline your accounts, track outstanding balances, and manage your hardware store's finances with uncompromising precision.
            </p>
          </div>

          {/* Feature Cards */}
          <div className="login-features">
            {[
              {
                icon: <BarChart3 className="login-feature-icon-svg" />,
                title: 'Real-time Balance Tracking',
                desc: 'Live updates across all your devices',
              },
              {
                icon: <CheckCircle2 className="login-feature-icon-svg" />,
                title: 'Automated Settlement Calculations',
                desc: 'Accurate due, payment & balance summary',
              },
              {
                icon: <Shield className="login-feature-icon-svg" />,
                title: 'Secure Cloud Synchronization',
                desc: 'Your data is safe, always in sync',
              },
            ].map((feature, i) => (
              <div key={i} className="login-feature-card">
                <div className="login-feature-icon-wrapper">
                  {feature.icon}
                </div>
                <div>
                  <p className="login-feature-title">{feature.title}</p>
                  <p className="login-feature-desc">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== RIGHT PANEL ===== */}
      <div className="login-right-panel">
        <div className="login-form-wrapper">

          {/* Mobile Logo (hidden on desktop) */}
          <div className="login-mobile-brand">
            <div className="login-brand-icon login-brand-icon--mobile">
              <BarChart3 className="login-brand-icon-svg" />
            </div>
            <h1 className="login-mobile-brand-title">JAI MA DURGA</h1>
            <p className="login-mobile-brand-subtitle">IRON STORES</p>
          </div>

          {/* Icon */}
          <div className="login-form-logo">
            <BarChart3 className="login-form-logo-svg" />
          </div>

          <h3 className="login-form-heading">
            {isRegister ? 'Create Account' : 'Welcome Back!'}
          </h3>
          <p className="login-form-subheading">
            {isRegister
              ? 'Enter your details to create your account'
              : 'Sign in to access your dashboard'}
          </p>

          {/* Google Button */}
          <button
            onClick={loginWithGoogle}
            disabled={isLoading}
            className="login-google-btn"
          >
            <svg className="login-google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="login-divider">
            <div className="login-divider-line" />
            <span className="login-divider-text">OR</span>
            <div className="login-divider-line" />
          </div>

          {/* Error */}
          {error && (
            <div className="login-error-box">
              <div className="login-error-dot" />
              <p className="login-error-text">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleEmailSubmit} className="login-form">
            <div className="login-field">
              <label className="login-label">Email</label>
              <div className="login-input-wrapper">
                <Mail className="login-input-icon" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); clearError(); }}
                  placeholder="Enter your email"
                  required
                  className="login-input"
                />
              </div>
            </div>

            <div className="login-field">
              <div className="login-label-row">
                <label className="login-label">Password</label>
                {!isRegister && (
                  <button type="button" className="login-forgot-btn">
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="login-input-wrapper">
                <Lock className="login-input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearError(); }}
                  placeholder="Enter your password"
                  required
                  minLength={6}
                  className="login-input login-input--password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="login-eye-btn"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="login-eye-icon" /> : <Eye className="login-eye-icon" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="login-submit-btn"
            >
              {isLoading ? (
                <span className="login-submit-loading">
                  <svg className="login-spinner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="login-spinner-track" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="login-spinner-fill" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </span>
              ) : (
                isRegister ? 'Create Account' : 'Sign In'
              )}
            </button>
          </form>

          <p className="login-toggle-text">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => { setIsRegister(!isRegister); clearError(); }}
              className="login-toggle-btn"
            >
              {isRegister ? 'Sign In' : 'Register'}
            </button>
          </p>
        </div>
      </div>
      </div>

      {/* ===== BOTTOM TRUST BAR ===== */}
      <div className="login-trust-bar">
        <div className="login-trust-items">
          {[
            { icon: <CheckCircle2 className="login-trust-icon" />, text: 'Fast & Reliable' },
            { icon: <Shield className="login-trust-icon" />, text: 'Secure & Private' },
            { icon: <Briefcase className="login-trust-icon" />, text: 'Built for Business' },
            { icon: <Globe className="login-trust-icon" />, text: 'Access Anywhere' },
          ].map((item, i) => (
            <div key={i} className="login-trust-item">
              {item.icon}
              <span>{item.text}</span>
            </div>
          ))}
        </div>
        <p className="login-trust-copyright">
          © {new Date().getFullYear()} JAI MA DURGA IRON STORES. All rights reserved.
        </p>
      </div>
    </div>
  );
}
