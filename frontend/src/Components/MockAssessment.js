import React, { useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, ArrowLeft, Loader } from 'lucide-react';

const MockAssessment = ({ bookingRef }) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const simulateResult = async (score, status) => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('sf_token');
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/demo/simulate-exam-result`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          booking_ref: bookingRef,
          score: score,
          status: status
        })
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to simulate exam result');
      }
      setResult(data);
    } catch (err) {
      setError(err.message || 'Failed to simulate exam result');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-slate-100 font-sans">
      <div className="w-full max-w-2xl bg-slate-800 rounded-2xl shadow-2xl overflow-hidden border border-slate-700">
        
        {/* Header */}
        <div className="bg-indigo-600 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              SkillForge Developer Tools
            </h1>
            <p className="text-indigo-200 mt-1 text-sm">
              Exam Engine Integration (Demo Mode)
            </p>
          </div>
          <div className="bg-indigo-900/50 px-3 py-1.5 rounded-lg border border-indigo-500 text-xs font-mono">
            REF: {bookingRef}
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          
          <div className="mb-8 p-4 bg-slate-700/50 border border-slate-600 rounded-xl flex gap-3 text-slate-300">
            <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={20} />
            <div className="text-sm leading-relaxed">
              <strong className="text-white block mb-1">Demonstration Mode Active</strong>
              In a production environment, this link would redirect the candidate to a secure, proctored external Exam Engine platform (like Mercer Mettl or similar). 
              For this demo, use the controls below to simulate the exam outcome and trigger the corresponding Webhook back to SkillForge.
            </div>
          </div>

          {result ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 mb-4">
                <CheckCircle size={32} />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Webhook Sent Successfully</h2>
              <p className="text-slate-400 mb-8 max-w-md mx-auto">
                The mock Exam Engine has successfully transmitted the simulated results to the SkillForge backend.
              </p>
              
              <button 
                onClick={() => window.location.href = '/'}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
              >
                <ArrowLeft size={18} />
                Return to Dashboard
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-white mb-4 border-b border-slate-700 pb-2">
                Simulate Exam Outcome
              </h3>
              
              {error && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm flex items-center gap-2">
                  <XCircle size={16} />
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => simulateResult(85, 'pass')}
                  disabled={loading}
                  className="group relative overflow-hidden bg-slate-700 hover:bg-emerald-600 transition-colors p-6 rounded-xl border border-slate-600 text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-lg text-white group-hover:text-emerald-50 transition-colors">Pass Exam</span>
                    <CheckCircle className="text-emerald-400 group-hover:text-emerald-200" size={24} />
                  </div>
                  <p className="text-sm text-slate-400 group-hover:text-emerald-100 transition-colors">
                    Simulates a score of 85%. This will trigger the pass webhook and unlock the next tier.
                  </p>
                </button>

                <button
                  onClick={() => simulateResult(45, 'fail')}
                  disabled={loading}
                  className="group relative overflow-hidden bg-slate-700 hover:bg-rose-600 transition-colors p-6 rounded-xl border border-slate-600 text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-lg text-white group-hover:text-rose-50 transition-colors">Fail Exam</span>
                    <XCircle className="text-rose-400 group-hover:text-rose-200" size={24} />
                  </div>
                  <p className="text-sm text-slate-400 group-hover:text-rose-100 transition-colors">
                    Simulates a score of 45%. This will trigger the fail webhook, requiring the student to retry.
                  </p>
                </button>
              </div>
              
              {loading && (
                <div className="flex items-center justify-center gap-2 text-indigo-400 text-sm mt-4">
                  <Loader size={16} className="animate-spin" /> Transmitting simulated webhook...
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default MockAssessment;
