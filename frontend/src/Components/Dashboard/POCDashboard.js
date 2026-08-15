import React, { useState, useEffect } from 'react';
import { Shield, Search, FileText, CheckCircle, XCircle, ChevronDown, ChevronUp, AlertCircle, RefreshCw, BarChart2 } from 'lucide-react';
import './AdminPanel.css'; // Reuse basic admin styles

export default function POCDashboard({ user }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentResults, setStudentResults] = useState([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [expandedResult, setExpandedResult] = useState(null);
  
  const token = localStorage.getItem('sf_token');
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/admin/poc/students`, { headers });
      if (!res.ok) throw new Error('Failed to load students');
      const data = await res.json();
      setStudents(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadStudentResults = async (studentId) => {
    setLoadingResults(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/admin/poc/results/student/${studentId}`, { headers });
      if (!res.ok) throw new Error('Failed to load results');
      const data = await res.json();
      setStudentResults(data);
      setSelectedStudent(students.find(s => s.user_id === studentId));
      setExpandedResult(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoadingResults(false);
    }
  };

  const toggleVerification = async (resultId) => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/admin/poc/results/${resultId}/verify`, {
        method: 'POST',
        headers
      });
      if (!res.ok) throw new Error('Verification failed');
      const updatedResult = await res.json();
      
      setStudentResults(prev => prev.map(r => r.id === resultId ? updatedResult : r));
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center h-full">
        <RefreshCw className="animate-spin text-navy" size={32} />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50 relative font-sans">
      <div className="max-w-7xl mx-auto w-full flex flex-col gap-6">
        
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold text-navy-900 leading-tight flex items-center gap-3">
            <Shield className="text-emerald-600" size={28} />
            Assessment Verification Portal (POC)
          </h1>
          <p className="text-slate-500 font-medium text-sm">
            Review detailed assessment work for your institution's students and verify their results.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-coral-50 text-coral-600 rounded-xl text-sm font-bold flex items-center gap-3">
            <AlertCircle size={20} /> {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Student List */}
          <div className="lg:col-span-1 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-slate-100 bg-slate-50 font-bold text-navy-900">
              Institution Students
            </div>
            <div className="p-3 border-b border-slate-100 relative">
              <Search className="absolute left-6 top-5 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Search..." 
                className="w-full pl-10 pr-4 py-2 bg-slate-100 border-transparent rounded-lg text-sm focus:bg-white outline-none"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {students.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-sm">No students found.</div>
              ) : (
                students.map(s => (
                  <div 
                    key={s.id} 
                    onClick={() => loadStudentResults(s.user_id)}
                    className={`p-3 cursor-pointer rounded-xl mb-1 transition-colors ${selectedStudent?.user_id === s.user_id ? 'bg-navy text-white' : 'hover:bg-slate-50 text-slate-700'}`}
                  >
                    <div className="font-bold text-sm">{s.registration_number || `User ID: ${s.user_id}`}</div>
                    <div className={`text-xs ${selectedStudent?.user_id === s.user_id ? 'text-blue-200' : 'text-slate-500'}`}>
                      Tier: {s.current_tier}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Column: Assessment Drill Down */}
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden h-[600px] flex flex-col">
            {!selectedStudent ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                <FileText size={48} className="mb-4 opacity-50" />
                <h3 className="text-lg font-bold text-slate-600">Select a Student</h3>
                <p className="text-sm">Choose a student from the list to view their detailed assessment results.</p>
              </div>
            ) : (
              <>
                <div className="p-6 border-b border-slate-100 bg-slate-50">
                  <h2 className="text-xl font-bold text-navy-900">
                    Results for {selectedStudent.registration_number || `User ID: ${selectedStudent.user_id}`}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">Tier: {selectedStudent.current_tier} | Status: {selectedStudent.access_status}</p>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6">
                  {loadingResults ? (
                    <div className="flex justify-center py-8"><RefreshCw className="animate-spin text-navy" /></div>
                  ) : studentResults.length === 0 ? (
                    <div className="text-center text-slate-500 py-8">No assessment results available for this student.</div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {studentResults.map(result => (
                        <div key={result.id} className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                          {/* Result Header */}
                          <div 
                            className="p-4 cursor-pointer flex items-center justify-between hover:bg-slate-50 transition-colors"
                            onClick={() => setExpandedResult(expandedResult === result.id ? null : result.id)}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${result.pass_fail === 'Pass' ? 'bg-emerald-100 text-emerald-700' : 'bg-coral-100 text-coral-700'}`}>
                                {Math.round(result.score)}
                              </div>
                              <div>
                                <div className="font-bold text-navy-900">{result.level || 'Assessment'}</div>
                                <div className="text-xs text-slate-500">Ref: {result.booking_ref}</div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              {result.verified_by_poc ? (
                                <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200 flex items-center gap-1">
                                  <CheckCircle size={14} /> Verified
                                </span>
                              ) : (
                                <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-full border border-amber-200 flex items-center gap-1">
                                  <AlertCircle size={14} /> Unverified
                                </span>
                              )}
                              {expandedResult === result.id ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
                            </div>
                          </div>
                          
                          {/* Drill-down Detail */}
                          {expandedResult === result.id && (
                            <div className="border-t border-slate-100 bg-slate-50 p-6 animate-in slide-in-from-top-2 duration-200">
                              
                              <div className="flex justify-end mb-6">
                                <button
                                  onClick={() => toggleVerification(result.id)}
                                  className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-all ${
                                    result.verified_by_poc 
                                      ? 'bg-slate-200 text-slate-700 hover:bg-slate-300' 
                                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                  }`}
                                >
                                  {result.verified_by_poc ? 'Revoke Verification' : 'Verify Assessment'}
                                </button>
                              </div>

                              {/* Topic Breakdown */}
                              {result.topic_breakdown ? (
                                <div className="mb-6">
                                  <h4 className="text-sm font-bold text-navy-900 flex items-center gap-2 mb-3">
                                    <BarChart2 size={16} className="text-blue-500" /> Topic Breakdown
                                  </h4>
                                  <div className="grid grid-cols-2 gap-3">
                                    {Object.entries(result.topic_breakdown).map(([topic, score]) => (
                                      <div key={topic} className="bg-white p-3 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
                                        <span className="text-sm font-semibold text-slate-700">{topic}</span>
                                        <span className={`text-sm font-bold ${score >= 60 ? 'text-emerald-600' : 'text-coral-600'}`}>{score}%</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="mb-6 text-sm text-slate-500 italic">No topic breakdown available for this assessment.</div>
                              )}

                              {/* Correct vs Selected */}
                              {result.correct_vs_selected ? (
                                <div>
                                  <h4 className="text-sm font-bold text-navy-900 flex items-center gap-2 mb-3">
                                    <FileText size={16} className="text-purple-500" /> Question Level Details
                                  </h4>
                                  <div className="space-y-2">
                                    {result.correct_vs_selected.map((q, idx) => {
                                      const isCorrect = q.selected === q.correct;
                                      return (
                                        <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2">
                                          <div className="font-semibold text-sm text-slate-800">Q{idx+1}: {q.question || `Question ${idx+1}`}</div>
                                          <div className="flex gap-4 text-xs">
                                            <div className="flex items-center gap-1">
                                              <span className="text-slate-500">Selected:</span>
                                              <span className={`font-bold ${isCorrect ? 'text-emerald-600' : 'text-coral-600'}`}>
                                                {q.selected || 'N/A'}
                                              </span>
                                            </div>
                                            {!isCorrect && (
                                              <div className="flex items-center gap-1">
                                                <span className="text-slate-500">Correct:</span>
                                                <span className="font-bold text-emerald-600">{q.correct}</span>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-sm text-slate-500 italic">No question-level details available.</div>
                              )}

                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
