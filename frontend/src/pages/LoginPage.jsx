import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useTheme } from '../context/ThemeContext';
import { 
  Shield, 
  Lock, 
  Mail, 
  ArrowRight, 
  Loader2, 
  AlertCircle, 
  Sparkles, 
  ArrowLeft,
  Eye,
  EyeOff,
  CheckCircle,
  Key,
  Sun,
  Moon
} from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@microfinance.com');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useAuth();
  const { settings, refreshSettings } = useSettings();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    if (refreshSettings) {
      refreshSettings();
    }
  }, [refreshSettings]);

  useEffect(() => {
    if (settings?.institution_name) {
      document.title = `Login — ${settings.institution_name}`;
    }
  }, [settings?.institution_name]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login(email, password);
      if (res.success) {
        navigate('/');
      } else {
        setError(res.message || 'Invalid login credentials');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAdmin = (demoEmail = 'admin@microfinance.com') => {
    setEmail(demoEmail);
    setPassword('admin123');
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-4 relative font-sans">
      {/* Top Floating Controls: Theme Toggle */}
      <div className="absolute top-4 right-4 z-20 flex items-center space-x-2">
        <button
          type="button"
          onClick={toggleTheme}
          className={`p-2 rounded-lg border transition-colors cursor-pointer flex items-center justify-center ${
            theme === 'dark'
              ? 'bg-slate-900 hover:bg-slate-800 text-amber-400 border-slate-800'
              : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
          }`}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative space-y-4">
          
          {/* Header Logo */}
          <div className="text-center space-y-1.5">
            <div className="inline-flex p-2.5 bg-blue-600 rounded-xl text-white shadow-xs mb-1">
              <Shield className="h-6 w-6" />
            </div>
            <div className="flex items-center justify-center space-x-1">
              <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-widest bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-900">
                OFFICER CONTROL PORTAL
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{settings.institution_name || 'Microfinance Institution'}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{settings.tagline || 'Sign in to your Microfinance Control Dashboard'}</p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-start space-x-2 text-rose-700 dark:text-rose-300 text-xs font-medium">
              <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Officer Email *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg pl-9 pr-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-600 transition-colors"
                  placeholder="admin@microfinance.com"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg pl-9 pr-9 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-600 transition-colors"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Quick 1-Click Demo Fill Options */}
            <div className="space-y-1.5 pt-0.5">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 text-center flex items-center justify-center space-x-1">
                <Key className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                <span>Quick Fill Admin Credentials:</span>
              </div>
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => fillDemoAdmin('admin@microfinance.com')}
                  className="w-full py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 font-medium text-[11px] border border-slate-300 dark:border-slate-700 transition-colors text-center truncate cursor-pointer"
                  title="Fill admin@microfinance.com / admin123"
                >
                  Quick Fill: admin@microfinance.com
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer flex items-center justify-center space-x-2 mt-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Authenticating Session...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Public Website Return Link */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 text-center">
            <Link
              to="/public"
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Return to {settings.institution_name || 'Public Website'} & Loan Calculator</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
