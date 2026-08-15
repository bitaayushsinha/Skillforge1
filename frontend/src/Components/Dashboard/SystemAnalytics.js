import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Activity, TrendingUp, DollarSign, RefreshCw, AlertCircle, Users } from 'lucide-react';

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899'];

export default function SystemAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('sf_token');
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/admin/reports/system-dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load system analytics');
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400">
        <RefreshCw className="animate-spin mb-4" size={32} />
        <p className="font-medium">Loading system analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-coral-50 border border-coral-200 text-coral-600 rounded-xl text-sm font-bold flex items-center gap-2">
        <AlertCircle size={20} /> {error}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="flex flex-col gap-6">
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users size={24} />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total Tiers</div>
            <div className="text-2xl font-black text-navy-900">{data.progression.length}</div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Activity size={24} />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total Cycles</div>
            <div className="text-2xl font-black text-navy-900">{data.batch_analytics.length}</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <DollarSign size={24} />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total Revenue</div>
            <div className="text-2xl font-black text-navy-900">
              ₹ {data.revenue.reduce((acc, curr) => acc + curr.total_revenue, 0).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Batch Analytics Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-96">
          <h3 className="text-lg font-bold text-navy-900 mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-blue-500" /> Batch-wise Performance
          </h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.batch_analytics}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="cycle_year" tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis tick={{fill: '#64748b', fontSize: 12}} domain={[0, 100]} />
                <RechartsTooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Legend />
                <Line type="monotone" name="Pass Rate (%)" dataKey="pass_rate" stroke="#10b981" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
                <Line type="monotone" name="Avg Score" dataKey="avg_score" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Tracking Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-96">
          <h3 className="text-lg font-bold text-navy-900 mb-6 flex items-center gap-2">
            <DollarSign size={20} className="text-emerald-500" /> Revenue by Tier
          </h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.revenue}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="tier" tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis tick={{fill: '#64748b', fontSize: 12}} />
                <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Legend />
                <Bar dataKey="total_revenue" name="Revenue (INR)" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Progression Tracking Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-96 lg:col-span-2">
          <h3 className="text-lg font-bold text-navy-900 mb-6 flex items-center gap-2">
            <Users size={20} className="text-amber-500" /> Progression Distribution
          </h3>
          <div className="flex-1 min-h-0 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.progression}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={130}
                  paddingAngle={5}
                  dataKey="student_count"
                  nameKey="tier"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {data.progression.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
