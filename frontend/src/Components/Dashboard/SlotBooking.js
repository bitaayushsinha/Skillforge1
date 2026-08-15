import React, { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, XCircle, Loader, ArrowLeft, BookOpen, AlertCircle } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const STATUS_CONFIG = {
  confirmed: { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: <CheckCircle size={14} />, label: 'Confirmed' },
  cancelled: { color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200', icon: <XCircle size={14} />, label: 'Cancelled' },
  completed: { color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', icon: <CheckCircle size={14} />, label: 'Completed' },
  pending: { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', icon: <Loader size={14} className="animate-spin" />, label: 'Pending' },
};

export default function SlotBooking({ subject, onBack }) {
  const [registeredSubjects, setRegisteredSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(subject || null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');

  const token = localStorage.getItem('sf_token');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  useEffect(() => {
    setSubjectsLoading(true);
    fetch(`${API}/api/learning/subjects`, { headers })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setRegisteredSubjects(data || []);
          setSelectedSubject(prev => prev || (data && data.length > 0 ? data[0] : null));
        }
      })
      .catch((err) => console.error("Failed to load registered subjects", err))
      .finally(() => setSubjectsLoading(false));
  }, []);

  useEffect(() => {
    if (subject) {
      setSelectedSubject(subject);
    }
  }, [subject]);

  useEffect(() => {
    if (!selectedSubject?.id) {
      if (!subjectsLoading) {
        setLoading(false);
      }
      return;
    }
    setLoading(true);
    setError('');
    setSuccessMsg('');
    setSelectedDate(null);
    setSelectedTime(null);

    Promise.all([
      fetch(`${API}/api/learning/subjects/${selectedSubject.id}/slots/available`, { headers }),
      fetch(`${API}/api/learning/slots`, { headers }),
    ]).then(async ([slotsRes, bookingsRes]) => {
      if (slotsRes.status === 401) {
        localStorage.removeItem('sf_token');
        window.location.reload();
        return;
      }
      if (slotsRes.ok) {
        setAvailableSlots(await slotsRes.json());
      } else {
        const errData = await slotsRes.json().catch(() => ({ detail: 'Failed to load available slots.' }));
        setError(errData.detail || 'Failed to load available slots.');
        setAvailableSlots([]);
      }
      if (bookingsRes.ok) {
        const all = await bookingsRes.json();
        setMyBookings(all.filter(b => b.subject_id === selectedSubject.id));
      } else {
        setMyBookings([]);
      }
    }).catch(() => {
      setError('Failed to connect to slot booking service.');
    }).finally(() => {
      setLoading(false);
    });
  }, [selectedSubject, subjectsLoading]);

  const handleBook = async () => {
    if (!selectedDate || !selectedTime || !selectedSubject?.id) {
      setError('Please select a date and time slot.');
      return;
    }
    setBooking(true);
    setError('');
    try {
      const res = await fetch(`${API}/api/learning/subjects/${selectedSubject.id}/slots/book`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ subject_id: selectedSubject.id, slot_date: selectedDate, slot_time: selectedTime }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Booking failed.');
      setMyBookings(prev => [...prev, data]);
      setSuccessMsg(`Booked! Reference: ${data.booking_reference}`);
      setSelectedDate(null);
      setSelectedTime(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBooking(false);
    }
  };

  const handleCancel = async (bookingId) => {
    if (!window.confirm('Cancel this booking?')) return;
    try {
      const res = await fetch(`${API}/api/learning/slots/${bookingId}`, { method: 'DELETE', headers });
      if (res.ok) setMyBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled' } : b));
    } catch { setError('Cancellation failed.'); }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-5 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
              <ArrowLeft size={18} className="text-slate-500" />
            </button>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
              <BookOpen size={18} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 leading-none">{selectedSubject?.name || 'Exam Slot Booking'}</h2>
              <p className="text-slate-400 text-xs mt-0.5">Slot Booking</p>
            </div>
          </div>
        </div>
      </div>

      {/* Subject Switcher Bar */}
      {registeredSubjects.length > 1 && (
        <div className="bg-white border-b border-slate-200 px-8 py-3">
          <div className="max-w-4xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-2 shrink-0">Select Subject:</span>
            {registeredSubjects.map(subj => (
              <button
                key={subj.id}
                onClick={() => setSelectedSubject(subj)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${selectedSubject?.id === subj.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600'
                  }`}
              >
                {subj.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {subjectsLoading || (loading && selectedSubject) ? (
        <div className="flex justify-center py-16">
          <Loader size={28} className="animate-spin text-indigo-500" />
        </div>
      ) : !selectedSubject ? (
        <div className="max-w-md mx-auto my-16 text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-indigo-50 flex items-center justify-center">
            <BookOpen className="text-indigo-500" size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-2">No Registered Subjects</h3>
          <p className="text-slate-500 text-sm leading-relaxed mb-6">
            You do not have any active registered subjects yet. Enrolled subjects will appear here for exam slot booking.
          </p>
          <button
            onClick={onBack}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-colors"
          >
            Back to Program
          </button>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto px-8 py-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left: Book a Slot */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-bold text-slate-800 text-lg mb-5 flex items-center gap-2">
              <Calendar size={18} className="text-indigo-500" /> Book a New Slot
            </h3>

            {error && (
              <div className="mb-5 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-sm">
                {error}
              </div>
            )}

            {availableSlots.length === 0 && !error ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                <AlertCircle className="mx-auto mb-2" size={28} />
                No available slots in the current exam window.
              </div>
            ) : availableSlots.length > 0 ? (
              <>
                <div className="space-y-2 mb-5 max-h-52 overflow-y-auto pr-1">
                  {availableSlots.map(slot => (
                    <button
                      key={slot.date}
                      onClick={() => { setSelectedDate(slot.date); setSelectedTime(null); }}
                      className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ${selectedDate === slot.date
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'
                        }`}
                    >
                      {new Date(slot.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </button>
                  ))}
                </div>

                {selectedDate && (
                  <div className="mb-5">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Select Time</p>
                    <div className="flex flex-wrap gap-2">
                      {availableSlots.find(s => s.date === selectedDate)?.times?.map(time => (
                        <button
                          key={time}
                          onClick={() => setSelectedTime(time)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${selectedTime === time
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-indigo-400'
                            }`}
                        >
                          <Clock size={11} className="inline mr-1" />{time}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {successMsg && (
                  <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm flex items-center gap-2">
                    <CheckCircle size={15} /> {successMsg}
                  </div>
                )}

                <button
                  onClick={handleBook}
                  disabled={!selectedDate || !selectedTime || booking}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {booking ? <Loader size={16} className="animate-spin" /> : <Calendar size={16} />}
                  {booking ? 'Booking...' : 'Confirm Booking'}
                </button>
              </>
            ) : null}
          </div>

          {/* Right: My Bookings */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-bold text-slate-800 text-lg mb-5 flex items-center gap-2">
              <Clock size={18} className="text-indigo-500" /> My Bookings
            </h3>
            {myBookings.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                No bookings yet for this subject.
              </div>
            ) : (
              <div className="space-y-3">
                {myBookings.map(b => {
                  const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.pending;
                  const linkConfirmed = b.link_status === 'confirmed' && b.assessment_link;
                  const linkPending = b.link_status === 'pending' || !b.assessment_link;
                  return (
                    <div key={b.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-slate-800 text-sm font-mono">{b.booking_reference}</span>
                        <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </div>
                      <p className="text-slate-500 text-xs"><Calendar size={11} className="inline mr-1" />{b.slot_date}</p>
                      <p className="text-slate-500 text-xs"><Clock size={11} className="inline mr-1" />{b.slot_time}</p>
                      {b.exam_engine_session_ref && (
                        <p className="text-slate-400 text-[11px] font-mono mt-1">Session Ref: {b.exam_engine_session_ref}</p>
                      )}

                      {/* Integration Link Status Section */}
                      {b.status === 'confirmed' && (
                        <div className="mt-3 pt-3 border-t border-slate-200">
                          {linkConfirmed ? (
                            <div className="flex items-center justify-between gap-2">
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                                <CheckCircle size={11} /> Assessment Link Ready
                              </span>
                              <a
                                href={b.assessment_link}
                                target="_blank"
                                rel="noreferrer"
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition-colors"
                              >
                                Launch Exam
                              </a>
                            </div>
                          ) : linkPending ? (
                            <div className="p-2 bg-amber-50/60 border border-amber-200/80 rounded-lg">
                              <p className="text-[11px] font-semibold text-amber-800 flex items-center gap-1">
                                <Loader size={11} className="animate-spin text-amber-600" /> Awaiting Engine Confirmation
                              </p>
                              <p className="text-[10px] text-amber-700 mt-0.5">The Exam Engine is provisioning your assessment room link.</p>
                            </div>
                          ) : (
                            <span className="text-[11px] font-semibold text-rose-600">Link status: {b.link_status}</span>
                          )}
                        </div>
                      )}

                      {b.status === 'confirmed' && (
                        <button
                          onClick={() => handleCancel(b.id)}
                          className="mt-3 text-xs text-rose-500 hover:text-rose-700 font-semibold"
                        >
                          Cancel Booking
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

