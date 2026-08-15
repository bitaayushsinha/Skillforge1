import React, { useState, useEffect } from 'react';
import { User, Mail, Clock, Shield, Flame, Trophy, Eye, EyeOff, Settings } from 'lucide-react';
import PaymentHistory from './PaymentHistory';

export default function SettingsPanel({ user, onUserUpdate }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [weeklyGoalHours, setWeeklyGoalHours] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const isLearner = !user || !user.role || user.role === 'learner';

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setWeeklyGoalHours(user.weekly_goal_hours !== undefined ? user.weekly_goal_hours.toString() : '8');
      setPassword('');
      setError('');
      setSuccess(false);
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validation
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Name is required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    let hours = parseFloat(weeklyGoalHours);
    if (isLearner) {
      if (isNaN(hours) || hours <= 0) {
        setError('Weekly study goal must be a positive number.');
        return;
      }
    } else {
      hours = user?.weekly_goal_hours || 8;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('sf_token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: trimmedName,
          email: email.trim(),
          weekly_goal_hours: hours,
          ...(password && !isLearner ? { password } : {})
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to update profile settings.');
      }

      setSuccess(true);
      if (onUserUpdate) {
        onUserUpdate(data);
      }
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 no-scrollbar bg-slate-50 flex flex-col relative">
      <div className="max-w-6xl mx-auto w-full flex flex-col gap-8">
        
        {/* Header */}
        <div className="flex flex-col gap-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold border border-blue-100 uppercase tracking-wider w-max mb-2">
            <Settings size={14} /> Account Preferences
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-navy-900 leading-tight">Profile & Settings</h1>
          <p className="text-slate-500 font-medium">Manage your account information and customize your weekly study goals.</p>
        </div>

        {error && (
          <div className="p-4 bg-coral-50 border border-coral-200 text-coral-600 rounded-xl text-sm font-bold flex items-center shadow-sm">
            {error}
          </div>
        )}
        
        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-xl text-sm font-bold flex items-center shadow-sm animate-in fade-in duration-300">
            ✓ Settings updated successfully!
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Form Card */}
          <div className="col-span-1 lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-8 shadow-sm flex flex-col">
            <h2 className="text-xl font-bold text-navy-900 mb-8 pb-4 border-b border-slate-100">Account Details</h2>
            
            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-navy-900 flex items-center gap-2">
                  <User size={16} className="text-navy" /> Name
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy shadow-inner transition-all disabled:opacity-50"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full Name"
                  disabled={loading}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-navy-900 flex items-center gap-2">
                  <Mail size={16} className="text-navy" /> Email Address
                </label>
                <input
                  type="email"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy shadow-inner transition-all disabled:opacity-50"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email Address"
                  disabled={loading}
                />
              </div>

              {isLearner ? (
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-navy-900 flex items-center gap-2">
                    <Clock size={16} className="text-navy" /> Weekly Study Goal (Hours)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy shadow-inner transition-all disabled:opacity-50"
                    value={weeklyGoalHours}
                    onChange={(e) => setWeeklyGoalHours(e.target.value)}
                    placeholder="Weekly Goal Hours"
                    disabled={loading}
                  />
                  <span className="text-xs font-medium text-slate-400 mt-1">
                    Your target weekly hours will show up on your dashboard progress bar.
                  </span>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-navy-900 flex items-center gap-2">
                    <Shield size={16} className="text-navy" /> Password
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy shadow-inner transition-all disabled:opacity-50"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Leave blank to keep current password"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <span className="text-xs font-medium text-slate-400 mt-1">
                    Update your password.
                  </span>
                </div>
              )}

              <div className="mt-4">
                <button 
                  type="submit" 
                  className="px-8 py-3.5 bg-navy hover:bg-navy-800 text-white font-bold rounded-xl shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 disabled:opacity-50 w-full sm:w-auto"
                  disabled={loading}
                >
                  {loading ? 'Saving Changes...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>

          {/* Right Column: Profile Summary / Info card */}
          <div className="col-span-1 flex flex-col gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm flex flex-col">
              <h2 className="text-lg font-bold text-navy-900 mb-8 pb-4 border-b border-slate-100">Learning Stats Summary</h2>
              
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 text-white flex items-center justify-center text-2xl font-bold shadow-sm">
                  {user?.name?.charAt(0) || 'A'}
                </div>
                <div className="flex flex-col items-start justify-center">
                  <div className="text-lg font-bold text-navy-900 leading-tight mb-1">{user?.name}</div>
                  <div className="inline-flex px-2 py-0.5 bg-blue-50 border border-blue-100 text-blue-600 rounded text-[10px] font-bold uppercase tracking-widest">
                    {user?.role || 'LEARNER'}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-6 pt-6 border-t border-slate-100">
                
                <div className="flex items-center gap-4 group">
                  <div className="w-12 h-12 shrink-0 rounded-xl bg-orange-50 border border-orange-100 text-orange-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Flame size={20} className="fill-orange-500/20" />
                  </div>
                  <div className="flex flex-col">
                    <div className="text-base font-bold text-navy-900">{user?.streak || 0} Days</div>
                    <div className="text-xs font-semibold text-slate-400 mt-0.5">Current Streak</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 group">
                  <div className="w-12 h-12 shrink-0 rounded-xl bg-amber-50 border border-amber-100 text-amber-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Trophy size={20} className="fill-amber-500/20" />
                  </div>
                  <div className="flex flex-col">
                    <div className="text-base font-bold text-navy-900">{user?.xp_points?.toLocaleString() || 0} XP</div>
                    <div className="text-xs font-semibold text-slate-400 mt-0.5">Total Points</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 group">
                  <div className="w-12 h-12 shrink-0 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-500 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Shield size={20} className="fill-emerald-500/20" />
                  </div>
                  <div className="flex flex-col">
                    <div className="text-base font-bold text-navy-900">
                      {user?.role === 'admin' ? 'Super Admin' : user?.role === 'expert' ? 'Expert review' : user?.role === 'reviewer' ? 'Reviewer' : 'Standard Learner'}
                    </div>
                    <div className="text-xs font-semibold text-slate-400 mt-0.5">Account Privilege</div>
                  </div>
                </div>

              </div>
            </div>
          </div>
          
        </div>

        {/* Payment History Section */}
        <PaymentHistory />
      </div>
    </div>
  );
}
