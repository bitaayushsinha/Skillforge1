import React, { useState, useEffect } from 'react';
import {
  Video, Calendar, Clock, Link as LinkIcon, Plus, Edit3, Trash2,
  X, CheckCircle, AlertCircle, Users, Building2, BookOpen, ExternalLink,
  Loader, Filter, PlayCircle, StopCircle, Ban
} from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const formatDateTime = (dt) =>
  new Date(dt).toLocaleString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });

const EMPTY_FORM = {
  title: '',
  description: '',
  host_name: '',
  session_datetime: '',
  duration_minutes: 60,
  zoom_join_url: '',
  zoom_meeting_id: '',
  zoom_passcode: '',
  target_institution_id: '',
  target_specialization_id: '',
  target_batch: '',
  status: 'scheduled'
};

export default function LiveClassConfig({ user }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [institutions, setInstitutions] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');

  const token = localStorage.getItem('sf_token');
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/communications/live-sessions?upcoming_only=false`, { headers });
      if (res.ok) {
        setSessions(await res.json());
      } else {
        setError('Failed to load live sessions.');
      }
    } catch {
      setError('Network error while loading sessions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();

    const fetchMetadata = async () => {
      try {
        const [instsRes, specsRes] = await Promise.all([
          fetch(`${API}/api/institutions`, { headers }),
          fetch(`${API}/api/learning/specializations`, { headers })
        ]);
        if (instsRes.ok) setInstitutions(await instsRes.json());
        if (specsRes.ok) setSpecializations(await specsRes.json());
      } catch {
        console.error('Could not load institution/specialization metadata.');
      }
    };
    fetchMetadata();
  }, []); // eslint-disable-line

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.host_name || !form.session_datetime || !form.zoom_join_url) {
      alert('Please fill all required fields.');
      return;
    }
    setSubmitting(true);
    setError('');

    const body = {
      ...form,
      duration_minutes: parseInt(form.duration_minutes || 60, 10),
      target_institution_id: form.target_institution_id ? parseInt(form.target_institution_id, 10) : null,
      target_specialization_id: form.target_specialization_id ? parseInt(form.target_specialization_id, 10) : null,
      target_batch: form.target_batch || null,
      zoom_meeting_id: form.zoom_meeting_id || null,
      zoom_passcode: form.zoom_passcode || null,
      description: form.description || null,
    };

    try {
      const url = editingId
        ? `${API}/api/communications/live-sessions/${editingId}`
        : `${API}/api/communications/live-sessions`;
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData?.detail || 'Failed to save session');
      }
      const saved = await res.json();
      if (editingId) {
        setSessions(prev => prev.map(s => s.id === saved.id ? saved : s));
        setSuccess('Live session updated successfully!');
      } else {
        setSessions(prev => [saved, ...prev]);
        setSuccess('New live session scheduled successfully!');
      }
      setShowModal(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (s) => {
    setForm({
      title: s.title,
      description: s.description || '',
      host_name: s.host_name,
      session_datetime: s.session_datetime ? s.session_datetime.slice(0, 16) : '',
      duration_minutes: s.duration_minutes || 60,
      zoom_join_url: s.zoom_join_url || '',
      zoom_meeting_id: s.zoom_meeting_id || '',
      zoom_passcode: s.zoom_passcode || '',
      target_institution_id: s.target_institution_id || '',
      target_specialization_id: s.target_specialization_id || '',
      target_batch: s.target_batch || '',
      status: s.status || 'scheduled'
    });
    setEditingId(s.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this live session?')) return;
    try {
      const res = await fetch(`${API}/api/communications/live-sessions/${id}`, {
        method: 'DELETE',
        headers
      });
      if (res.ok || res.status === 204) {
        setSessions(prev => prev.filter(s => s.id !== id));
        setSuccess('Live session deleted.');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        alert('Failed to delete session');
      }
    } catch {
      alert('Network error while deleting session');
    }
  };

  const handleStatusChange = async (s, newStatus) => {
    try {
      const res = await fetch(`${API}/api/communications/live-sessions/${s.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        const updated = await res.json();
        setSessions(prev => prev.map(item => item.id === s.id ? updated : item));
      } else {
        alert('Could not update session status');
      }
    } catch {
      alert('Network error');
    }
  };

  const filteredSessions = sessions.filter(s => {
    if (filterStatus === 'all') return true;
    return s.status === filterStatus;
  });

  const getSpecName = (specId) => {
    if (!specId) return 'All Specializations';
    const match = specializations.find(sp => sp.id === specId);
    return match ? match.name : `Spec #${specId}`;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'live':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 animate-pulse"><span className="w-2 h-2 rounded-full bg-red-600"></span> LIVE NOW</span>;
      case 'completed':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">Completed</span>;
      case 'cancelled':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">Cancelled</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">Scheduled</span>;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 min-h-screen">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-navy-900 via-indigo-900 to-purple-900 text-white py-10 px-8 shadow-md">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-indigo-200 text-xs font-bold uppercase tracking-wider mb-2">
              <Video size={14} /> Section 5 Configuration
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">Live Class Configuration</h1>
            <p className="text-indigo-200 text-sm mt-1">
              Schedule, target, and manage Zoom live classrooms, workshops, and doubt-clearing sessions.
            </p>
          </div>
          <button
            onClick={() => {
              setForm({
                ...EMPTY_FORM,
                host_name: user?.name || ''
              });
              setEditingId(null);
              setShowModal(true);
            }}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-2xl shadow-lg transition-all"
          >
            <Plus size={18} /> Schedule Live Class
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto px-8 py-8">
        {success && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 font-semibold text-sm">
            <CheckCircle size={18} className="text-emerald-600 shrink-0" />
            {success}
          </div>
        )}

        {/* Filter Bar */}
        <div className="flex items-center justify-between mb-6 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-slate-400" />
            <span className="text-sm font-bold text-slate-700">Filter Status:</span>
            {['all', 'scheduled', 'live', 'completed', 'cancelled'].map(st => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                  filterStatus === st
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
          <div className="text-xs font-semibold text-slate-500">
            Showing {filteredSessions.length} session{filteredSessions.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Sessions List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader size={36} className="text-indigo-600 animate-spin mb-3" />
            <p className="text-slate-500 font-medium text-sm">Loading live sessions...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center bg-red-50 rounded-2xl border border-red-200">
            <AlertCircle size={36} className="text-red-500 mx-auto mb-2" />
            <p className="text-red-700 font-semibold">{error}</p>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
              <Video size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">No live classes found</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
              Schedule interactive live workshops, program orientations, or doubt-clearing sessions targeted to student specializations and batches.
            </p>
            <button
              onClick={() => {
                setForm({ ...EMPTY_FORM, host_name: user?.name || '' });
                setEditingId(null);
                setShowModal(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow hover:bg-indigo-700"
            >
              <Plus size={16} /> Schedule Session
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredSessions.map(s => (
              <div
                key={s.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                    <Video size={24} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap mb-1.5">
                      {getStatusBadge(s.status)}
                      <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                        <Calendar size={13} /> {formatDateTime(s.session_datetime)}
                      </span>
                      <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                        <Clock size={13} /> {s.duration_minutes} min
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-1">{s.title}</h3>
                    <p className="text-xs text-slate-500 mb-2">
                      Instructor: <strong className="text-slate-700">{s.host_name}</strong>
                    </p>
                    {s.description && (
                      <p className="text-sm text-slate-600 mb-3 line-clamp-2">{s.description}</p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold">
                        <BookOpen size={12} /> {getSpecName(s.target_specialization_id)}
                      </span>
                      {s.target_batch && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold">
                          <Users size={12} /> Batch: {s.target_batch}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3 shrink-0">
                  <div className="flex items-center gap-2">
                    {s.status === 'scheduled' && (
                      <button
                        onClick={() => handleStatusChange(s, 'live')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-sm"
                        title="Mark Session LIVE NOW"
                      >
                        <PlayCircle size={14} /> Go Live
                      </button>
                    )}
                    {s.status === 'live' && (
                      <button
                        onClick={() => handleStatusChange(s, 'completed')}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm"
                        title="Mark Session Completed"
                      >
                        <StopCircle size={14} /> End Session
                      </button>
                    )}
                    {s.status !== 'cancelled' && s.status !== 'completed' && (
                      <button
                        onClick={() => handleStatusChange(s, 'cancelled')}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-xl text-xs font-bold"
                        title="Cancel Session"
                      >
                        <Ban size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(s)}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl"
                      title="Edit Session"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl"
                      title="Delete Session"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <a
                    href={s.zoom_join_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    Zoom Link <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Schedule / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Video size={20} className="text-indigo-600" />
                {editingId ? 'Edit Live Session' : 'Schedule New Live Session'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Session Title *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Specialization Workshop: System Design"
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Host / Instructor Name *
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="e.g. Dr. Ramesh Sharma"
                    value={form.host_name}
                    onChange={e => setForm({ ...form, host_name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Description / Agenda
                </label>
                <textarea
                  rows={2}
                  placeholder="Outline key topics or instructions for students joining this live class..."
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Session Date & Time *
                  </label>
                  <input
                    required
                    type="datetime-local"
                    value={form.session_datetime}
                    onChange={e => setForm({ ...form, session_datetime: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Duration (mins)
                  </label>
                  <input
                    type="number"
                    min="15"
                    max="480"
                    value={form.duration_minutes}
                    onChange={e => setForm({ ...form, duration_minutes: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                  />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                  <LinkIcon size={14} /> Zoom Meeting Configuration (Manual Link Storage)
                </h4>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Zoom Join URL *
                  </label>
                  <input
                    required
                    type="url"
                    placeholder="https://zoom.us/j/123456789..."
                    value={form.zoom_join_url}
                    onChange={e => setForm({ ...form, zoom_join_url: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Meeting ID (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="123 456 789"
                      value={form.zoom_meeting_id}
                      onChange={e => setForm({ ...form, zoom_meeting_id: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Passcode (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Passcode"
                      value={form.zoom_passcode}
                      onChange={e => setForm({ ...form, zoom_passcode: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* Targeting Restrictions */}
              <div className="p-4 rounded-2xl bg-slate-100/70 border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Users size={14} /> Audience Targeting (Leave empty for ALL students)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Target Specialization
                    </label>
                    <select
                      value={form.target_specialization_id}
                      onChange={e => setForm({ ...form, target_specialization_id: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium bg-white"
                    >
                      <option value="">All Specializations</option>
                      {specializations.map(sp => (
                        <option key={sp.id} value={sp.id}>{sp.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Target Batch Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Batch-2026 (or leave empty)"
                      value={form.target_batch}
                      onChange={e => setForm({ ...form, target_batch: e.target.value })}
                      className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium bg-white"
                    />
                  </div>
                </div>
              </div>

              {editingId && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Session Status
                  </label>
                  <select
                    value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="live">Live Now</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 font-bold text-sm text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md flex items-center gap-2"
                >
                  {submitting ? <Loader size={16} className="animate-spin" /> : <Video size={16} />}
                  {submitting ? 'Saving...' : editingId ? 'Update Session' : 'Schedule Live Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
