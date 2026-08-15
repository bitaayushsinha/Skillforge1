import React, { useState, useEffect } from 'react';
import { Trophy, Star, Users, Medal, Activity } from 'lucide-react';
import './LeaderboardView.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const LeaderboardView = ({ user }) => {
  const [tier, setTier] = useState('National');
  const [metric, setMetric] = useState('avg_score');
  const [leaderboard, setLeaderboard] = useState([]);
  const [ownInstitutionId, setOwnInstitutionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [tier, metric]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('sf_token');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(
        `${API_BASE}/api/analytics/leaderboard?tier=${tier}&metric=${metric}`,
        { headers }
      );
      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      const data = await response.json();
      setLeaderboard(data.leaderboard || []);
      setOwnInstitutionId(data.own_institution_id ?? null);
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
      setError('Could not load leaderboard data. Please try again.');
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="leaderboard-container p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-navy-900 flex items-center gap-3">
            <Trophy className="text-amber-500" size={32} />
            Institutional Leaderboard
          </h1>
          <p className="text-slate-500 mt-2 text-sm">
            Compare performance across districts, states, and nationwide.
          </p>
        </div>
        
        <div className="flex gap-4">
          <div className="glass-control p-1 rounded-lg flex bg-white/50 border border-slate-200">
            {['District', 'State', 'National'].map(t => (
              <button
                key={t}
                onClick={() => setTier(t)}
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                  tier === t ? 'bg-navy text-white shadow-md' : 'text-slate-500 hover:text-navy-700 hover:bg-slate-100'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="glass-control p-1 rounded-lg flex bg-white/50 border border-slate-200">
            <button
              onClick={() => setMetric('avg_score')}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-all flex items-center gap-2 ${
                metric === 'avg_score' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <Star size={16} /> Avg Score
            </button>
            <button
              onClick={() => setMetric('pass_rate')}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-all flex items-center gap-2 ${
                metric === 'pass_rate' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <Activity size={16} /> Pass Rate
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden glass-panel relative min-h-[400px]">
        {loading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-4 border-navy/20 border-t-navy rounded-full animate-spin"></div>
            <p className="text-navy font-semibold mt-3 text-sm animate-pulse">Aggregating ranks...</p>
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-3">
            <Trophy size={48} className="text-slate-300 opacity-50" />
            <p className="text-sm font-semibold text-red-500">{error}</p>
          </div>
        )}
        
        {!error && (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-sm font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Rank</th>
                <th className="px-6 py-4">Institution</th>
                <th className="px-6 py-4 text-center">Students Passed</th>
                <th className="px-6 py-4 text-right">Pass Rate</th>
                <th className="px-6 py-4 text-right">Avg Score</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.length === 0 && !loading && (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                    <Medal size={48} className="mx-auto text-slate-300 mb-4 opacity-50" />
                    <p>No data available for the <strong>{tier}</strong> tier yet.</p>
                    <p className="text-xs mt-1 text-slate-400">Results will appear here once exam scores are submitted for this tier.</p>
                  </td>
                </tr>
              )}
              
              {leaderboard.map((stat, idx) => {
                const isTop3 = stat.rank <= 3;
                const isOwn = ownInstitutionId && stat.institution_id === ownInstitutionId;
                return (
                  <tr 
                    key={stat.institution_id || `inst-${idx}`}
                    className={`border-b border-slate-100 last:border-none transition-colors hover:bg-slate-50 group ${
                      isOwn
                        ? 'bg-blue-50/60 ring-2 ring-inset ring-blue-300'
                        : isTop3
                        ? 'bg-gradient-to-r from-amber-50/30 to-transparent'
                        : ''
                    }`}
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        {stat.rank === 1 && <Medal className="text-yellow-500 drop-shadow-sm" size={24} />}
                        {stat.rank === 2 && <Medal className="text-slate-400 drop-shadow-sm" size={24} />}
                        {stat.rank === 3 && <Medal className="text-amber-700 drop-shadow-sm" size={24} />}
                        {stat.rank > 3 && <span className="w-6 text-center font-bold text-slate-400">{stat.rank}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="font-bold text-navy-900 flex items-center gap-2 flex-wrap">
                        {stat.institution_name}
                        {stat.rank === 1 && (
                          <span className="text-[10px] bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">Top Performer</span>
                        )}
                        {isOwn && (
                          <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border border-blue-200">Your Institution</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="inline-flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full text-slate-700 text-sm font-semibold">
                        <Users size={14} className="text-slate-400" />
                        {stat.total_passed} / {stat.total_students}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="font-bold text-emerald-600">
                        {stat.pass_rate.toFixed(1)}%
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="font-bold text-navy-900 text-lg">
                        {stat.avg_score.toFixed(1)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default LeaderboardView;
