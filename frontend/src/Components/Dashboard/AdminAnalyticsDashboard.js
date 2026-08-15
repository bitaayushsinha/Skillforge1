import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell 
} from 'recharts';
import { 
  Activity, TrendingUp, DollarSign, RefreshCw, AlertCircle, Users, 
  ShieldAlert, Settings, FileText, CheckCircle, Search, Filter, Clock 
} from 'lucide-react';

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899'];

export default function AdminAnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState('batch'); // batch, progression, payments, access
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Data states
  const [batchStats, setBatchStats] = useState([]);
  const [progressionStats, setProgressionStats] = useState([]);
  const [paymentStats, setPaymentStats] = useState([]);
  const [accessRecords, setAccessRecords] = useState([]);
  const [completionStats, setCompletionStats] = useState([]);
  const [timeToCertStats, setTimeToCertStats] = useState([]);

  // Filters
  const [institutionId, setInstitutionId] = useState('');
  const [batchName, setBatchName] = useState('');
  
  // Override Modal
  const [overrideModal, setOverrideModal] = useState({ open: false, record: null, action: 'activate', reason: '' });

  const token = localStorage.getItem('sf_token');
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchBatchStats = async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/admin/analytics/batch-stats`, { headers });
      if (!res.ok) throw new Error('Failed to fetch batch stats');
      const json = await res.json();
      setBatchStats(json.batches || []);
    } catch (err) { setError(err.message); }
  };

  const fetchProgressionStats = async () => {
    try {
      let url = `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/admin/analytics/progression`;
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error('Failed to fetch progression stats');
      const json = await res.json();
      setProgressionStats(json.tiers || []);
    } catch (err) { setError(err.message); }
  };

  const fetchPaymentStats = async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/admin/analytics/payments`, { headers });
      if (!res.ok) throw new Error('Failed to fetch payment stats');
      const json = await res.json();
      setPaymentStats(json.tiers || []);
    } catch (err) { setError(err.message); }
  };

  const fetchAccessStatus = async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/admin/analytics/access-status`, { headers });
      if (!res.ok) throw new Error('Failed to fetch access statuses');
      const json = await res.json();
      setAccessRecords(json.records || []);
    } catch (err) { setError(err.message); }
  };

  const fetchCompletionMetrics = async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/admin/analytics/completion-metrics`, { headers });
      if (!res.ok) throw new Error('Failed to fetch completion metrics');
      const json = await res.json();
      setCompletionStats(json.tiers || []);
    } catch (err) { setError(err.message); }
  };

  const fetchTimeToCertification = async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/admin/analytics/time-to-certification`, { headers });
      if (!res.ok) throw new Error('Failed to fetch time-to-certification');
      const json = await res.json();
      setTimeToCertStats(json.tiers || []);
    } catch (err) { setError(err.message); }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    if (activeTab === 'batch') await fetchBatchStats();
    if (activeTab === 'progression') await fetchProgressionStats();
    if (activeTab === 'payments') await fetchPaymentStats();
    if (activeTab === 'access') await fetchAccessStatus();
    if (activeTab === 'completion') await fetchCompletionMetrics();
    if (activeTab === 'time') await fetchTimeToCertification();
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleOverrideSubmit = async (e) => {
    e.preventDefault();
    if (!overrideModal.reason) {
      alert("Reason is required.");
      return;
    }
    
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/admin/analytics/access-status/${overrideModal.record.registration_id}/override`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: overrideModal.action, reason: overrideModal.reason })
      });
      if (!res.ok) throw new Error('Override failed');
      setOverrideModal({ open: false, record: null, action: 'activate', reason: '' });
      fetchAccessStatus();
    } catch (err) {
      alert(err.message);
    }
  };

  const getStatusBadge = (status) => {
    if (status.includes('active')) return 'bg-emerald-50 text-emerald-600 border border-emerald-200';
    if (status.includes('deactivated')) return 'bg-coral-50 text-coral-600 border border-coral-200';
    if (status === 'grace_period') return 'bg-amber-50 text-amber-600 border border-amber-200';
    return 'bg-slate-50 text-slate-600 border border-slate-200';
  };

  // Reformat progression for stacked bar if needed, or just display raw
  const progressionChartData = progressionStats.map(t => ({
    name: t.tier,
    Active: t.active,
    'Grace Period': t.grace_period,
    'Pending Payment': t.pending_payment,
    Deactivated: t.deactivated
  }));

  return (
    <div className="flex flex-col gap-6">
      
      {/* Sub Navigation */}
      <div className="flex bg-white rounded-xl border border-slate-200 p-1 shadow-sm w-full overflow-x-auto">
        <button 
          onClick={() => setActiveTab('batch')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'batch' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          Batch Stats
        </button>
        <button 
          onClick={() => setActiveTab('progression')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'progression' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          Progression Funnel
        </button>
        <button 
          onClick={() => setActiveTab('payments')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'payments' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          Payment Tracking
        </button>
        <button 
          onClick={() => setActiveTab('access')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'access' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          Access Management
        </button>
        <button 
          onClick={() => setActiveTab('completion')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'completion' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          Completion & Drops
        </button>
        <button 
          onClick={() => setActiveTab('time')}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'time' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          Time to Cert
        </button>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <RefreshCw className="animate-spin mb-4" size={32} />
          <p className="font-medium">Loading analytics...</p>
        </div>
      )}

      {error && !loading && (
        <div className="p-4 bg-coral-50 border border-coral-200 text-coral-600 rounded-xl text-sm font-bold flex items-center gap-2">
          <AlertCircle size={20} /> {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* BATCH STATS */}
          {activeTab === 'batch' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-6">
              <h3 className="text-lg font-bold text-navy-900 flex items-center gap-2">
                <TrendingUp size={20} className="text-blue-500" /> Batch-wise Performance
              </h3>
              
              {batchStats.length === 0 ? (
                <div className="py-10 text-center text-slate-500 font-medium">No batch data available.</div>
              ) : (
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={batchStats}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="batch_name" tick={{fill: '#64748b', fontSize: 12}} />
                      <YAxis yAxisId="left" tick={{fill: '#64748b', fontSize: 12}} />
                      <YAxis yAxisId="right" orientation="right" tick={{fill: '#64748b', fontSize: 12}} />
                      <RechartsTooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                      <Legend />
                      <Line yAxisId="left" type="monotone" name="Pass Rate (%)" dataKey="pass_rate" stroke="#10b981" strokeWidth={3} />
                      <Line yAxisId="left" type="monotone" name="Avg Score" dataKey="avg_score" stroke="#3b82f6" strokeWidth={3} />
                      <Line yAxisId="right" type="monotone" name="Active Students" dataKey="active_students" stroke="#8b5cf6" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* PROGRESSION FUNNEL */}
          {activeTab === 'progression' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-6">
              <h3 className="text-lg font-bold text-navy-900 flex items-center gap-2">
                <Users size={20} className="text-amber-500" /> Tier Progression Funnel
              </h3>
              
              {progressionStats.length === 0 ? (
                <div className="py-10 text-center text-slate-500 font-medium">No progression data available.</div>
              ) : (
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={progressionChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{fill: '#64748b', fontSize: 12}} />
                      <YAxis tick={{fill: '#64748b', fontSize: 12}} />
                      <RechartsTooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                      <Legend />
                      <Bar dataKey="Active" stackId="a" fill="#10b981" />
                      <Bar dataKey="Grace Period" stackId="a" fill="#f59e0b" />
                      <Bar dataKey="Pending Payment" stackId="a" fill="#3b82f6" />
                      <Bar dataKey="Deactivated" stackId="a" fill="#ec4899" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* PAYMENT TRACKING */}
          {activeTab === 'payments' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-6">
              <h3 className="text-lg font-bold text-navy-900 flex items-center gap-2">
                <DollarSign size={20} className="text-emerald-500" /> Revenue & Payments by Tier
              </h3>
              
              {paymentStats.length === 0 ? (
                <div className="py-10 text-center text-slate-500 font-medium">No payment records found.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="h-80">
                    <h4 className="text-center font-bold text-slate-600 mb-4">Total Revenue (INR)</h4>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={paymentStats}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="tier" tick={{fill: '#64748b', fontSize: 12}} />
                        <YAxis tick={{fill: '#64748b', fontSize: 12}} />
                        <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                        <Bar dataKey="total_revenue" name="Revenue" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="h-80">
                    <h4 className="text-center font-bold text-slate-600 mb-4">Payment Statuses</h4>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={paymentStats}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="tier" tick={{fill: '#64748b', fontSize: 12}} />
                        <YAxis tick={{fill: '#64748b', fontSize: 12}} />
                        <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                        <Legend />
                        <Bar dataKey="paid_count" name="Paid" stackId="a" fill="#10b981" />
                        <Bar dataKey="pending_count" name="Pending" stackId="a" fill="#f59e0b" />
                        <Bar dataKey="failed_count" name="Failed" stackId="a" fill="#ef4444" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ACCESS MANAGEMENT */}
          {activeTab === 'access' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-lg font-bold text-navy-900 flex items-center gap-2">
                  <ShieldAlert size={20} className="text-coral-500" /> Student Access Controls
                </h3>
              </div>
              
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">Student</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">Tier</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">Status</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200">Grace End</th>
                      <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accessRecords.length === 0 ? (
                      <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-500">No records found.</td></tr>
                    ) : (
                      accessRecords.map(rec => (
                        <tr key={rec.registration_id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-4 border-b border-slate-100">
                            <div className="font-bold text-navy-900">{rec.student_name}</div>
                            <div className="text-xs text-slate-500">{rec.email}</div>
                          </td>
                          <td className="px-4 py-4 border-b border-slate-100 text-sm font-medium text-slate-600">
                            {rec.current_tier}
                          </td>
                          <td className="px-4 py-4 border-b border-slate-100">
                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${getStatusBadge(rec.access_status)}`}>
                              {rec.access_status.replace('manual_', '🔒 ')}
                            </span>
                          </td>
                          <td className="px-4 py-4 border-b border-slate-100 text-sm text-slate-500">
                            {rec.grace_period_end ? new Date(rec.grace_period_end).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-4 py-4 border-b border-slate-100 text-right">
                            <button 
                              onClick={() => setOverrideModal({ open: true, record: rec, action: 'activate', reason: '' })}
                              className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 transition-colors"
                            >
                              Override
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* COMPLETION & DROPOFFS */}
          {activeTab === 'completion' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-6">
              <h3 className="text-lg font-bold text-navy-900 flex items-center gap-2">
                <CheckCircle size={20} className="text-emerald-500" /> Completion & Drop-off Rates
              </h3>
              
              {completionStats.length === 0 ? (
                <div className="py-10 text-center text-slate-500 font-medium">No completion data available.</div>
              ) : (
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={completionStats}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="tier" tick={{fill: '#64748b', fontSize: 12}} />
                      <YAxis tick={{fill: '#64748b', fontSize: 12}} />
                      <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                      <Legend />
                      <Bar dataKey="completion_rate" name="Completion Rate (%)" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="drop_out_rate" name="Drop-off Rate (%)" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* TIME TO CERTIFICATION */}
          {activeTab === 'time' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-6">
              <h3 className="text-lg font-bold text-navy-900 flex items-center gap-2">
                <Clock size={20} className="text-blue-500" /> Average Time to Certification
              </h3>
              
              {timeToCertStats.length === 0 ? (
                <div className="py-10 text-center text-slate-500 font-medium">No time-to-certification data available.</div>
              ) : (
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={timeToCertStats}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="tier" tick={{fill: '#64748b', fontSize: 12}} />
                      <YAxis tick={{fill: '#64748b', fontSize: 12}} />
                      <RechartsTooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                      <Legend />
                      <Bar dataKey="avg_days" name="Avg Days to Certify" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* OVERRIDE MODAL */}
      {overrideModal.open && (
        <div className="fixed inset-0 bg-navy-900/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl">
            <h3 className="text-xl font-bold text-navy-900 mb-2 flex items-center gap-2">
              <ShieldAlert className="text-coral-500" size={24} /> Manual Override
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              Manually change access for <strong>{overrideModal.record.student_name}</strong>. 
              This will bypass the automated access-rules engine until another manual action is taken.
            </p>
            
            <form onSubmit={handleOverrideSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-navy-900">Action</label>
                <select 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                  value={overrideModal.action}
                  onChange={(e) => setOverrideModal({...overrideModal, action: e.target.value})}
                >
                  <option value="activate">Force Activate (manual_active)</option>
                  <option value="deactivate">Force Deactivate (manual_deactivated)</option>
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-navy-900">Reason for Override (Required for Audit)</label>
                <textarea 
                  required
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium"
                  placeholder="e.g. Cleared payment offline, granted extension, etc."
                  value={overrideModal.reason}
                  onChange={(e) => setOverrideModal({...overrideModal, reason: e.target.value})}
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 mt-2">
                <button 
                  type="button" 
                  onClick={() => setOverrideModal({ open: false, record: null, action: 'activate', reason: '' })}
                  className="flex-1 py-3 bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3 bg-coral-600 hover:bg-coral-700 text-white text-sm font-bold rounded-xl shadow-sm"
                >
                  Confirm Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
