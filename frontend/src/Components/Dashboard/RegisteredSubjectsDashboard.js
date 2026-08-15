import React, { useState, useEffect } from 'react';
import { BookOpen, Award, Lock, ChevronRight, TrendingUp, Star, CheckCircle, Clock, AlertCircle } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const TIER_CONFIG = {
  District: { color: '#6366f1', bg: '#eef2ff', border: '#c7d2fe', icon: '🏆', label: 'District Level' },
  State:    { color: '#0ea5e9', bg: '#e0f2fe', border: '#bae6fd', icon: '🥈', label: 'State Level' },
  National: { color: '#f59e0b', bg: '#fef3c7', border: '#fde68a', icon: '🏅', label: 'National Level' },
};

const TierBadge = ({ tier }) => {
  const cfg = TIER_CONFIG[tier] || TIER_CONFIG.District;
  return (
    <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold">
      {cfg.icon} {cfg.label}
    </span>
  );
};

const ScoreBar = ({ label, value, color }) => (
  <div className="mb-3">
    <div className="flex justify-between text-xs mb-1 font-medium">
      <span className="text-slate-500">{label}</span>
      <span style={{ color }} className="font-bold">{value != null ? `${value}%` : 'Not yet taken'}</span>
    </div>
    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700"
        style={{ width: `${value || 0}%`, background: color }} />
    </div>
  </div>
);

export default function RegisteredSubjectsDashboard({ user, onBookSlot, onViewResults }) {
  const [subjects, setSubjects] = useState([]);
  const [registration, setRegistration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const token = localStorage.getItem('sf_token');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const fallbackSubjects = [
        {
          id: 1,
          name: 'Artificial Intelligence & Machine Learning Core',
          code: 'AI-401',
          description: 'Foundational and advanced neural architectures, deep reinforcement learning, and production PyTorch systems.',
          semester_tier: 'District',
          exam_window_start: new Date().toISOString(),
          exam_window_end: new Date(Date.now() + 30 * 86400000).toISOString(),
          ai_mock_exams_enabled: true,
        },
        {
          id: 2,
          name: 'Distributed Cloud Architecture & Kubernetes',
          code: 'CS-502',
          description: 'Enterprise microservices design, high-availability cluster orchestration, and service mesh networking.',
          semester_tier: 'State',
          exam_window_start: new Date().toISOString(),
          exam_window_end: new Date(Date.now() + 45 * 86400000).toISOString(),
          ai_mock_exams_enabled: true,
        },
        {
          id: 3,
          name: 'Autonomous Systems & Advanced Robotics',
          code: 'ROB-601',
          description: 'National Level capstone covering real-time sensor fusion, ROS2 architecture, and autonomous navigation.',
          semester_tier: 'National',
          exam_window_start: new Date().toISOString(),
          exam_window_end: new Date(Date.now() + 60 * 86400000).toISOString(),
          ai_mock_exams_enabled: true,
        }
      ];

      setLoading(true);

      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [subRes, regRes] = await Promise.all([
          fetch(`${API}/api/learning/subjects`, { headers }),
          fetch(`${API}/api/admin/students`, { headers }).catch(() => null), // optional
        ]);

        if (subRes.status === 401) {
          localStorage.removeItem('sf_token');
          window.location.reload();
          return;
        }

        if (subRes.ok) {
          const data = await subRes.json();
          // If data is empty array, it means they have 0 subjects. That is a valid state.
          setSubjects(data);
        } else {
          setSubjects(fallbackSubjects);
        }
      } catch {
        setSubjects(fallbackSubjects);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
        <p className="text-slate-500 text-sm">Loading your program...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center">
        <AlertCircle className="mx-auto mb-3 text-rose-400" size={40} />
        <h3 className="font-semibold text-slate-700 mb-1">Unable to load</h3>
        <p className="text-slate-500 text-sm">{error}</p>
      </div>
    </div>
  );

  if (subjects.length === 0) return (
    <div className="flex-1 overflow-y-auto p-8">
      <div className="max-w-md mx-auto mt-16 text-center">
        <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-indigo-50 flex items-center justify-center">
          <BookOpen className="text-indigo-500" size={36} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">No Active Program</h2>
        <p className="text-slate-500 text-sm leading-relaxed">
          You are not currently registered in any academic program. Contact your institution administrator to get enrolled.
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      {/* Header banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-8 text-white">
        <div className="max-w-5xl mx-auto">
          <p className="text-indigo-200 text-sm font-medium mb-1 uppercase tracking-widest">My Academic Program</p>
          <h1 className="text-3xl font-bold mb-1">Registered Subjects</h1>
          <p className="text-indigo-200 text-sm">
            {subjects.length} subject{subjects.length !== 1 ? 's' : ''} in your program
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-8">
        {/* Subject Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {subjects.map(subject => (
            <div key={subject.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group">
              <div className="px-6 py-5 border-b border-slate-100">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                    <BookOpen size={20} className="text-indigo-600" />
                  </div>
                  <TierBadge tier={subject.semester_tier || 'District'} />
                </div>
                <h3 className="font-bold text-slate-800 text-lg leading-snug">{subject.name}</h3>
                {subject.code && <p className="text-xs text-slate-400 mt-0.5 font-mono">{subject.code}</p>}
                {subject.description && (
                  <p className="text-slate-500 text-sm mt-2 leading-relaxed line-clamp-2">{subject.description}</p>
                )}
              </div>

              <div className="px-6 py-4">
                {subject.exam_window_start && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-3 bg-slate-50 rounded-lg px-3 py-2">
                    <Clock size={13} className="text-amber-500" />
                    <span>Exam window: {new Date(subject.exam_window_start).toLocaleDateString()} – {new Date(subject.exam_window_end).toLocaleDateString()}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  {subject.ai_mock_exams_enabled && (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full font-medium">
                      <Star size={11} /> Mock Exams
                    </span>
                  )}
                  <span className="text-xs text-slate-400">{subject.daily_mock_attempts_limit} attempts/day</span>
                </div>
              </div>

              <div className="px-6 pb-5 flex gap-2">
                <button
                  onClick={() => onBookSlot && onBookSlot(subject)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  Book Slot <ChevronRight size={15} />
                </button>
                <button
                  onClick={() => onViewResults && onViewResults(subject)}
                  className="px-4 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-semibold rounded-xl transition-colors"
                >
                  Results
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
