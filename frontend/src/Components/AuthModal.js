import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, User, ShieldCheck, Eye, EyeOff } from 'lucide-react';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleInitialized, setGoogleInitialized] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleGoogleCredentialResponse = async (response) => {
    setLoading(true);
    setError('');
    try {
      const apiResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id_token: response.credential,
        }),
      });

      const data = await apiResponse.json();

      if (!apiResponse.ok) {
        throw new Error(data.detail || 'Failed to authenticate with Google.');
      }

      onAuthSuccess(data.access_token, data.user);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const initGoogle = () => {
      if (window.google) {
        try {
          window.google.accounts.id.initialize({
            client_id: "226786576550-028q9ec2gqq7q0cg62ahblpd2segfuto.apps.googleusercontent.com",
            callback: handleGoogleCredentialResponse,
          });
          setGoogleInitialized(true);
        } catch (e) {
          console.error("Error initializing Google Identity Services:", e);
        }
      }
    };

    if (typeof window !== 'undefined') {
      if (!document.getElementById('google-gsi-client')) {
        const script = document.createElement('script');
        script.id = 'google-gsi-client';
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = initGoogle;
        document.head.appendChild(script);
      } else {
        initGoogle();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    const body = isLogin 
      ? { email, password } 
      : { name, email, password };

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL }${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Something went wrong. Please try again.');
      }

      onAuthSuccess(data.access_token, data.user);
      onClose();
      // Reset form
      setName('');
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-navy-900/40 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8 gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={26} className="text-blue-500" />
            <h2 className="text-2xl font-bold text-navy-900">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 mb-6 bg-coral-50 border border-coral-200 text-coral-600 rounded-xl text-sm font-bold flex items-center shadow-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {!isLogin && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-navy-900">Full Name</label>
              <div className="relative flex items-center">
                <User size={18} className="absolute left-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy shadow-inner transition-all"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-navy-900">Email Address</label>
            <div className="relative flex items-center">
              <Mail size={18} className="absolute left-4 text-slate-400 pointer-events-none" />
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy shadow-inner transition-all"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-navy-900">Password</label>
            <div className="relative flex items-center">
              <Lock size={18} className="absolute left-4 text-slate-400 pointer-events-none" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy shadow-inner transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="mt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full px-8 py-3.5 bg-navy hover:bg-navy-800 text-white font-bold rounded-xl shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 disabled:opacity-50 text-base"
            >
              {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Get Started'}
            </button>
          </div>

          <div className="flex items-center justify-center gap-4 my-2">
            <div className="flex-1 h-px bg-slate-200"></div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-slate-200"></div>
          </div>

          {googleInitialized && (
            <div 
              id="google-signin-btn-container" 
              ref={(el) => {
                if (el && window.google && googleInitialized) {
                  try {
                    window.google.accounts.id.renderButton(
                      el,
                      { theme: 'outline', size: 'large', shape: 'pill', width: el.offsetWidth || 340 }
                    );
                  } catch (err) {
                    console.error("Error rendering Google button:", err);
                  }
                }
              }}
              className="flex justify-center w-full min-h-[44px]"
            />
          )}
        </form>

        {/* Footer Toggle */}
        <div className="mt-8 text-center text-sm font-semibold text-slate-500">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="ml-2 text-blue-600 hover:text-navy-900 transition-colors underline underline-offset-4 decoration-2 decoration-blue-200 hover:decoration-navy"
          >
            {isLogin ? 'Sign Up' : 'Log In'}
          </button>
        </div>
        
      </div>
    </div>
  );
}
