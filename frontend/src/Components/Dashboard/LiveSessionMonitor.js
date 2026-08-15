import React, { useState, useEffect } from 'react';
import { Shield, PlayCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react';

export default function LiveSessionMonitor() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [violations, setViolations] = useState([]);
  const [loadingViolations, setLoadingViolations] = useState(false);

  const fetchSessions = async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/v1/exam-engine/admin/sessions`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectSession = async (session) => {
    setSelectedSession(session);
    setLoadingViolations(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/v1/exam-engine/admin/sessions/${session.session_ref}/violations`);
      if (res.ok) {
        const data = await res.json();
        setViolations(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingViolations(false);
    }
  };

  const handleResume = async (sessionRef) => {
    if (!window.confirm("Are you sure you want to clear violations and resume this session?")) return;
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/v1/exam-engine/admin/sessions/${sessionRef}/resume`, {
        method: 'POST'
      });
      if (res.ok) {
        alert("Session resumed successfully. Time has been restored.");
        setSelectedSession(null);
        fetchSessions();
      } else {
        alert("Failed to resume session.");
      }
    } catch (err) {
      alert("Error resuming session: " + err.message);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500"><RefreshCw className="animate-spin inline mr-2" /> Loading Live Sessions...</div>;
  }

  return (
    <div className="flex gap-6 h-[600px]">
      <div className="w-1/2 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden shadow-sm">
        <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 flex items-center gap-2"><Clock size={18}/> Active & Suspended Sessions</h3>
          <button onClick={fetchSessions} className="text-slate-500 hover:text-indigo-600"><RefreshCw size={16} /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-2">
          {sessions.length === 0 ? (
            <p className="text-slate-500 text-center py-10">No live sessions at the moment.</p>
          ) : (
            sessions.map(s => (
              <div 
                key={s.session_ref} 
                onClick={() => handleSelectSession(s)}
                className={`p-4 border-b cursor-pointer hover:bg-slate-50 transition-colors ${selectedSession?.session_ref === s.session_ref ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : ''}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-slate-800">{s.student_name}</p>
                    <p className="text-xs text-slate-500 font-mono mt-1">{s.session_ref}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${s.status === 'suspended' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {s.status}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-2">
                  Started: {new Date(s.start_time).toLocaleTimeString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      <div className="w-1/2 bg-white border border-slate-200 rounded-xl flex flex-col shadow-sm overflow-hidden">
        {selectedSession ? (
          <>
            <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Shield size={18} className="text-indigo-600"/> 
                Violation Logs
              </h3>
              {selectedSession.status === 'suspended' && (
                <button 
                  onClick={() => handleResume(selectedSession.session_ref)}
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors"
                >
                  <PlayCircle size={16} /> Resume Session
                </button>
              )}
            </div>
            <div className="overflow-y-auto flex-1 p-4">
              {loadingViolations ? (
                <p className="text-slate-500 text-center"><RefreshCw className="animate-spin inline mr-2" /> Loading logs...</p>
              ) : violations.length === 0 ? (
                <p className="text-slate-500 text-center">No violations recorded for this session.</p>
              ) : (
                <div className="space-y-3">
                  {violations.map(v => (
                    <div key={v.id} className="p-3 bg-red-50 border border-red-100 rounded-lg flex gap-3 items-start">
                      <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={16} />
                      <div>
                        <p className="text-sm font-bold text-red-900">{v.violation_type}</p>
                        <p className="text-sm text-red-700 mt-1">{v.message}</p>
                        <p className="text-xs text-red-400 mt-2">{new Date(v.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
            <Shield size={48} className="mb-4 opacity-50" />
            <p className="font-medium">Select a session from the list to view its real-time violation logs and manage suspensions.</p>
          </div>
        )}
      </div>
    </div>
  );
}
