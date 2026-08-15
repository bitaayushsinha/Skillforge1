import React, { useState, useEffect } from 'react';
import { BarChart2, Clock, ArrowLeft, Award, Loader, Download, ArrowRight, CheckCircle2, FileText, Sparkles, X } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const ScoreGauge = ({ score }) => {
  const pct = Math.min(100, Math.max(0, score || 0));
  const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#6366f1' : '#ef4444';
  return (
    <div className="relative w-24 h-24 mx-auto mb-2">
      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
        <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="10" />
        <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${pct * 2.513} ${251.3}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center flex-col">
        <span className="text-xl font-black" style={{ color }}>{pct.toFixed(1)}%</span>
      </div>
    </div>
  );
};

export default function MockResults({ subject, onBack }) {
  const [registeredSubjects, setRegisteredSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(subject || null);
  const [bookings, setBookings] = useState([]);
  const [examResults, setExamResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeProgressionModal, setActiveProgressionModal] = useState(null);

  const token = localStorage.getItem('sf_token');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetch(`${API}/api/learning/subjects`, { headers })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setRegisteredSubjects(data || []);
          setSelectedSubject(prev => prev || (data && data.length > 0 ? data[0] : null));
        }
      })
      .catch((err) => console.error("Failed to load registered subjects", err));
  }, []);

  useEffect(() => {
    if (subject) {
      setSelectedSubject(subject);
    }
  }, [subject]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API}/api/learning/slots`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API}/api/learning/results`, { headers: { Authorization: `Bearer ${token}` } })
    ])
      .then(async ([slotsRes, resultsRes]) => {
        const slotsData = slotsRes.ok ? await slotsRes.json() : [];
        const resultsData = resultsRes.ok ? await resultsRes.json() : [];
        setBookings(slotsData.filter(b => !selectedSubject || b.subject_id === selectedSubject.id));
        setExamResults(resultsData);
      })
      .catch((err) => console.error("Error fetching results integration data:", err))
      .finally(() => setLoading(false));
  }, [selectedSubject, token]);

  const completed = bookings.filter(b => b.status === 'completed');
  const upcoming = bookings.filter(b => b.status === 'confirmed');

  const handleDownloadReport = (sessionRef) => {
    if (!sessionRef) return;
    window.open(`${API}/api/v1/exam-engine/sessions/${sessionRef}/analytics-report/pdf`, '_blank');
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 relative">
      <div className="bg-white border-b border-slate-200 px-8 py-5 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
              <ArrowLeft size={18} className="text-slate-500" />
            </button>
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
              <BarChart2 size={18} className="text-purple-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 leading-none">{selectedSubject?.name || 'Exam Results'}</h2>
              <p className="text-slate-400 text-xs mt-0.5">Exam Results & Progression Pipeline</p>
            </div>
          </div>
        </div>
      </div>

      {registeredSubjects.length > 1 && (
        <div className="bg-white border-b border-slate-200 px-8 py-3">
          <div className="max-w-4xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-2 shrink-0">Select Subject:</span>
            {registeredSubjects.map(subj => (
              <button
                key={subj.id}
                onClick={() => setSelectedSubject(subj)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  selectedSubject?.id === subj.id
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-purple-50 hover:text-purple-600'
                }`}
              >
                {subj.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-8 py-8">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 rounded-full border-4 border-purple-500 border-t-transparent animate-spin" />
          </div>
        ) : completed.length === 0 && upcoming.length === 0 && examResults.length === 0 ? (
          <div className="text-center py-16">
            <BarChart2 className="mx-auto mb-3 text-slate-300" size={48} />
            <h3 className="font-semibold text-slate-600 mb-1">No exam data yet</h3>
            <p className="text-slate-400 text-sm">Book a slot and complete your exam to see results pushed from the Examination Engine.</p>
          </div>
        ) : (
          <>
            {(completed.length > 0 || examResults.length > 0) && (
              <section className="mb-8">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                  <Award size={16} className="text-purple-600" /> Completed Exam Results
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {completed.map(b => {
                    const resultRecord = examResults.find(
                      r => r.booking_ref === b.booking_reference || r.exam_engine_session_ref === b.exam_engine_session_ref
                    );
                    const isPassed = resultRecord && (resultRecord.pass_fail === 'PASS' || resultRecord.pass_fail === 'pass');
                    const sessionRefToUse = b.exam_engine_session_ref || b.booking_reference;

                    return (
                      <div key={b.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="font-bold text-slate-800 font-mono text-sm">{b.booking_reference}</p>
                              <p className="text-slate-400 text-xs">{b.slot_date} · {b.slot_time}</p>
                            </div>
                            {resultRecord ? (
                              <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                                isPassed
                                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                  : 'text-rose-700 bg-rose-50 border-rose-200'
                              }`}>
                                {isPassed ? 'PASS' : 'FAIL'}
                              </span>
                            ) : (
                              <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full font-bold">
                                Result Pending
                              </span>
                            )}
                          </div>

                          {resultRecord ? (
                            <div>
                              <ScoreGauge score={resultRecord.score} />
                              <p className="text-center text-slate-600 font-bold text-xs mt-1">
                                Level: {resultRecord.level || 'District'}
                              </p>
                              {resultRecord.topic_breakdown && Array.isArray(resultRecord.topic_breakdown) && (
                                <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                                  <p className="text-[11px] font-bold uppercase text-slate-400">Topic Breakdown:</p>
                                  {resultRecord.topic_breakdown.map((t, i) => (
                                    <div key={i} className="flex items-center justify-between text-xs">
                                      <span className="text-slate-600 truncate mr-2">{t.topic}</span>
                                      <span className="font-bold text-slate-800">{t.score}/{t.total}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-center py-6 bg-slate-50/70 rounded-xl border border-slate-100 mt-2">
                              <Loader size={22} className="animate-spin text-amber-500 mx-auto mb-2" />
                              <p className="text-xs font-semibold text-slate-700">Awaiting Exam Engine Webhook</p>
                              <p className="text-[11px] text-slate-400 mt-0.5">Assessment completed; final score evaluation in progress.</p>
                            </div>
                          )}
                        </div>

                        {/* Interactive Deliverables & Progression Actions */}
                        {resultRecord && (
                          <div className="mt-5 pt-4 border-t border-slate-100 space-y-2.5">
                            <button
                              onClick={() => handleDownloadReport(sessionRefToUse)}
                              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                            >
                              <Download size={14} /> Download Analytics Report (PDF)
                            </button>

                            {isPassed && (
                              <button
                                onClick={() => setActiveProgressionModal({
                                  level: resultRecord.level || 'District',
                                  score: resultRecord.score,
                                  bookingRef: b.booking_reference,
                                  subjectName: selectedSubject?.name || 'Subject'
                                })}
                                className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md transition-all"
                              >
                                <Sparkles size={14} /> Next Steps: Proceed to State Level <ArrowRight size={14} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Render any standalone result records not matched by booking */}
                  {examResults
                    .filter(r => !completed.some(b => b.booking_reference === r.booking_ref))
                    .map(r => {
                      const isPassed = r.pass_fail === 'PASS' || r.pass_fail === 'pass';
                      return (
                        <div key={r.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <p className="font-bold text-slate-800 font-mono text-sm">{r.booking_ref}</p>
                                <p className="text-slate-400 text-xs">Received via Webhook</p>
                              </div>
                              <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                                isPassed
                                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                  : 'text-rose-700 bg-rose-50 border-rose-200'
                              }`}>
                                {isPassed ? 'PASS' : 'FAIL'}
                              </span>
                            </div>
                            <ScoreGauge score={r.score} />
                            <p className="text-center text-slate-600 font-bold text-xs mt-1">
                              Level: {r.level || 'District'}
                            </p>
                          </div>

                          <div className="mt-5 pt-4 border-t border-slate-100 space-y-2.5">
                            <button
                              onClick={() => handleDownloadReport(r.exam_engine_session_ref || r.booking_ref)}
                              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                            >
                              <Download size={14} /> Download Analytics Report (PDF)
                            </button>

                            {isPassed && (
                              <button
                                onClick={() => setActiveProgressionModal({
                                  level: r.level || 'District',
                                  score: r.score,
                                  bookingRef: r.booking_ref,
                                  subjectName: selectedSubject?.name || 'Subject'
                                })}
                                className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md transition-all"
                              >
                                <Sparkles size={14} /> Next Steps: Proceed to State Level <ArrowRight size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </section>
            )}

            {upcoming.length > 0 && (
              <section>
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                  <Clock size={16} className="text-indigo-500" /> Upcoming Booked Slots
                </h3>
                <div className="space-y-3">
                  {upcoming.map(b => {
                    const linkConfirmed = b.link_status === 'confirmed' && b.assessment_link;
                    return (
                      <div key={b.id} className="bg-white rounded-xl border border-slate-200 px-5 py-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
                            <Clock size={18} className="text-indigo-500" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-sm">{b.slot_date} · {b.slot_time}</p>
                            <p className="text-slate-400 text-xs font-mono">Ref: {b.booking_reference}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {linkConfirmed ? (
                            <a href={b.assessment_link} target="_blank" rel="noreferrer"
                              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg font-semibold transition-colors">
                              Launch Exam
                            </a>
                          ) : (
                            <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-md font-medium">
                              Link Provisioning...
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* Next Steps Progression Modal */}
      {activeProgressionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-7 shadow-2xl border border-slate-100 relative animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setActiveProgressionModal(null)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mb-4">
              <Award size={24} />
            </div>

            <h3 className="text-xl font-black text-slate-900">
              Congratulations! District Level Passed
            </h3>
            <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide mt-1">
              {activeProgressionModal.subjectName} · Score: {activeProgressionModal.score?.toFixed(1)}%
            </p>

            <div className="mt-6 space-y-4">
              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/60">
                <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={18} />
                <div>
                  <h4 className="text-xs font-bold text-emerald-900">Step 1: Claim District Deliverables</h4>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Your <b>Bronze Badge</b> and <b>District Qualification Certificate</b> are now unlocked. Download your Analytics Report PDF for topic insights.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200/60">
                <Sparkles className="text-purple-600 shrink-0 mt-0.5" size={18} />
                <div>
                  <h4 className="text-xs font-bold text-purple-900">Step 2: Unlock State Level Tier</h4>
                  <p className="text-xs text-purple-700 mt-0.5">
                    Your account is in a <b>7-day payment grace period</b>. Pay the State Level registration fee (<b>₹1,770 INR / $50</b>) to advance your tier to State.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/60">
                <FileText className="text-indigo-600 shrink-0 mt-0.5" size={18} />
                <div>
                  <h4 className="text-xs font-bold text-indigo-900">Step 3: Book Your State Assessment</h4>
                  <p className="text-xs text-indigo-700 mt-0.5">
                    Once unlocked, book your State Level exam slot. Scoring ≥ 60% unlocks the <b>Silver Badge</b> and advances you toward National & IBM Innovation Hub eligibility.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-7 flex items-center gap-3">
              <button
                onClick={() => setActiveProgressionModal(null)}
                className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
              >
                Close Window
              </button>
              <button
                onClick={() => {
                  setActiveProgressionModal(null);
                  onBack && onBack();
                }}
                className="flex-1 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-lg shadow-purple-500/25 transition-all"
              >
                Go to Progression Center →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
