import React, { useState, useEffect } from 'react';
import {
  Video, Clock, CalendarDays, ExternalLink, Loader, AlertCircle,
  Plus, X, Trash2, Edit3, Lock, CheckCircle, BookOpen, Users, Building2
} from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const formatDateTime = (dt) =>
  new Date(dt).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const isUpcoming = (dt) => new Date(dt) > new Date();

const canJoinSession = (s) => {
  if (s.status === 'live') return true;
  if (s.status === 'completed' || s.status === 'cancelled') return false;
  const start = new Date(s.session_datetime).getTime();
  const now = Date.now();
  const fifteenMins = 15 * 60 * 1000;
  const end = start + (s.duration_minutes || 60) * 60 * 1000;
  return now >= start - fifteenMins && now <= end;
};

const EMPTY_FORM = {
  title: '', description: '', host_name: '', session_datetime: '', duration_minutes: 60,
  zoom_join_url: '', zoom_meeting_id: '', zoom_passcode: '',
  target_institution_id: '', target_specialization_id: '', target_batch: '',
};

export default function LiveClasses({ user }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [institutions, setInstitutions] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [showAll, setShowAll] = useState(false);

  const token = localStorage.getItem('sf_token');
  const isAdmin = user?.role === 'admin' || user?.role === 'sub_admin';
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sessRes] = await Promise.all([
          fetch(`${API}/api/communications/live-sessions?upcoming_only=${showAll ? 'false' : 'true'}`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (sessRes.status === 401 || sessRes.status === 403) {
          localStorage.removeItem('sf_token');
          window.location.reload();
          return;
        }
        if (!sessRes.ok) throw new Error();
        setSessions(await sessRes.json());

        if (isAdmin) {
          const [instsRes, specsRes] = await Promise.all([
            fetch(`${API}/api/institutions`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`${API}/api/learning/specializations`, { headers: { Authorization: `Bearer ${token}` } }),
          ]);
          if (instsRes.ok) setInstitutions(await instsRes.json());
          if (specsRes.ok) setSpecializations(await specsRes.json());
        }
      } catch {
        setError('Failed to load sessions.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token, isAdmin, showAll]); // eslint-disable-line

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.host_name || !form.session_datetime || !form.zoom_join_url) return;
    setSubmitting(true);
    const body = {
      ...form,
      duration_minutes: parseInt(form.duration_minutes),
      target_institution_id: form.target_institution_id ? parseInt(form.target_institution_id) : null,
      target_specialization_id: form.target_specialization_id ? parseInt(form.target_specialization_id) : null,
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
      if (!res.ok) throw new Error((await res.json())?.detail || 'Failed');
      const sess = await res.json();
      if (editingId) {
        setSessions(prev => prev.map(s => s.id === sess.id ? sess : s));
        setSuccess('Session updated!');
      } else {
        setSessions(prev => [sess, ...prev]);
        setSuccess('Session scheduled!');
      }
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this session?')) return;
    await fetch(`${API}/api/communications/live-sessions/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    setSessions(prev => prev.filter(s => s.id !== id));
  };

  const handleEdit = (s) => {
    setForm({
      title: s.title, description: s.description || '',
      host_name: s.host_name,
      session_datetime: s.session_datetime ? s.session_datetime.slice(0, 16) : '',
      duration_minutes: s.duration_minutes,
      zoom_join_url: s.zoom_join_url, zoom_meeting_id: s.zoom_meeting_id || '',
      zoom_passcode: s.zoom_passcode || '',
      target_institution_id: s.target_institution_id || '',
      target_specialization_id: s.target_specialization_id || '',
      target_batch: s.target_batch || '',
    });
    setEditingId(s.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const upcoming = sessions.filter(s => isUpcoming(s.session_datetime));
  const past = sessions.filter(s => !isUpcoming(s.session_datetime));

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: '#f8fafc' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)', padding: '28px 36px', color: '#fff' }}>
        <div style={{ maxWidth: 880, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '.12em', opacity: .75, textTransform: 'uppercase', marginBottom: 4 }}>Virtual Classroom</p>
            <h1 style={{ margin: 0, fontWeight: 800, fontSize: 26 }}>Live Classes</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, opacity: .8 }}>
              {upcoming.length} upcoming session{upcoming.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={() => setShowAll(v => !v)}
              style={{ padding: '9px 16px', background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.25)', borderRadius: 12, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
              {showAll ? 'Upcoming Only' : 'Show All'}
            </button>
            {isAdmin && (
              <button onClick={() => { setShowForm(v => !v); setEditingId(null); setForm(EMPTY_FORM); }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 20px', background: showForm ? 'rgba(255,255,255,.15)' : '#fff', color: showForm ? '#fff' : '#7c3aed', border: showForm ? '1px solid rgba(255,255,255,.3)' : 'none', borderRadius: 14, fontWeight: 800, fontSize: 14, cursor: 'pointer', boxShadow: '0 2px 12px rgba(0,0,0,.15)' }}>
                {showForm ? <X size={16} /> : <Plus size={17} />}
                {showForm ? 'Cancel' : 'Schedule Session'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 880, margin: '0 auto', padding: '28px 36px' }}>

        {success && (
          <div style={{ marginBottom: 20, padding: '12px 18px', background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 14, color: '#16a34a', display: 'flex', gap: 10, alignItems: 'center', fontWeight: 600, fontSize: 14 }}>
            <CheckCircle size={16} /> {success}
          </div>
        )}

        {/* Admin Session Form */}
        {isAdmin && showForm && (
          <div style={{ background: '#fff', borderRadius: 20, border: '1.5px solid #e2e8f0', padding: 28, marginBottom: 28, boxShadow: '0 8px 32px rgba(124,58,237,.08)' }}>
            <h3 style={{ margin: '0 0 20px', fontWeight: 800, color: '#1e293b', fontSize: 17, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Video size={18} style={{ color: '#7c3aed' }} />
              {editingId ? 'Edit Session' : 'Schedule New Session'}
            </h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>Session Title *</label>
                  <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Advanced Python Workshop"
                    style={{ width: '100%', padding: '10px 13px', borderRadius: 11, border: '1.5px solid #e2e8f0', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>Host / Instructor *</label>
                  <input required value={form.host_name} onChange={e => setForm(f => ({ ...f, host_name: e.target.value }))} placeholder="Instructor name"
                    style={{ width: '100%', padding: '10px 13px', borderRadius: 11, border: '1.5px solid #e2e8f0', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder="Session agenda (optional)"
                  style={{ width: '100%', padding: '10px 13px', borderRadius: 11, border: '1.5px solid #e2e8f0', fontSize: 13, fontFamily: 'inherit', resize: 'none', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>Date & Time *</label>
                  <input required type="datetime-local" value={form.session_datetime} onChange={e => setForm(f => ({ ...f, session_datetime: e.target.value }))}
                    style={{ width: '100%', padding: '10px 13px', borderRadius: 11, border: '1.5px solid #e2e8f0', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>Duration (mins)</label>
                  <input type="number" min={15} max={480} value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))}
                    style={{ width: '100%', padding: '10px 13px', borderRadius: 11, border: '1.5px solid #e2e8f0', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>Zoom Join URL *</label>
                  <input required value={form.zoom_join_url} onChange={e => setForm(f => ({ ...f, zoom_join_url: e.target.value }))} placeholder="https://zoom.us/j/..."
                    style={{ width: '100%', padding: '10px 13px', borderRadius: 11, border: '1.5px solid #e2e8f0', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>Meeting ID</label>
                  <input value={form.zoom_meeting_id} onChange={e => setForm(f => ({ ...f, zoom_meeting_id: e.target.value }))} placeholder="Optional"
                    style={{ width: '100%', padding: '10px 13px', borderRadius: 11, border: '1.5px solid #e2e8f0', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>Passcode</label>
                  <input value={form.zoom_passcode} onChange={e => setForm(f => ({ ...f, zoom_passcode: e.target.value }))} placeholder="Optional"
                    style={{ width: '100%', padding: '10px 13px', borderRadius: 11, border: '1.5px solid #e2e8f0', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>

              {/* Targeting */}
              <div style={{ background: '#f8fafc', borderRadius: 14, padding: 16 }}>
                <p style={{ margin: '0 0 12px', fontWeight: 800, color: '#475569', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Lock size={13} /> Access Restriction (leave blank = unrestricted)
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 5 }}>Institution</label>
                    <select value={form.target_institution_id} onChange={e => setForm(f => ({ ...f, target_institution_id: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, background: '#fff', fontFamily: 'inherit' }}>
                      <option value="">All</option>
                      {institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 5 }}>Specialization</label>
                    <select value={form.target_specialization_id} onChange={e => setForm(f => ({ ...f, target_specialization_id: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, background: '#fff', fontFamily: 'inherit' }}>
                      <option value="">All</option>
                      {specializations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 5 }}>Batch Name</label>
                    <input value={form.target_batch} onChange={e => setForm(f => ({ ...f, target_batch: e.target.value }))} placeholder="e.g. Batch-2026"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" disabled={submitting}
                  style={{ flex: 1, padding: 13, background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: '#fff', border: 'none', borderRadius: 14, fontWeight: 800, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {submitting ? <Loader size={16} /> : <Video size={16} />}
                  {submitting ? 'Saving…' : editingId ? 'Update Session' : 'Schedule Session'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); }}
                  style={{ padding: '13px 22px', border: '1.5px solid #e2e8f0', background: '#fff', borderRadius: 14, fontWeight: 700, color: '#64748b', cursor: 'pointer', fontSize: 14 }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Sessions list */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}>
            <Loader size={32} style={{ color: '#7c3aed' }} />
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <AlertCircle size={36} style={{ color: '#f87171', marginBottom: 10 }} />
            <p style={{ color: '#94a3b8' }}>{error}</p>
          </div>
        ) : sessions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 16px' }}>
            <div style={{ width: 80, height: 80, margin: '0 auto 16px', borderRadius: 24, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Video size={36} style={{ color: '#8b5cf6' }} />
            </div>
            <p style={{ fontWeight: 700, color: '#475569', fontSize: 16, marginBottom: 6 }}>No sessions scheduled</p>
            <p style={{ color: '#94a3b8', fontSize: 14 }}>
              {isAdmin ? 'Click "Schedule Session" to create a live class.' : 'Check back soon for upcoming live classes from your program.'}
            </p>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <section style={{ marginBottom: 36 }}>
                <h3 style={{ margin: '0 0 16px', fontWeight: 800, color: '#1e293b', fontSize: 17, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Video size={18} style={{ color: '#7c3aed' }} /> Upcoming Sessions
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {upcoming.map(s => (
                    <div key={s.id} style={{ background: '#fff', borderRadius: 20, border: '1.5px solid #e2e8f0', padding: 22, display: 'flex', gap: 18, boxShadow: '0 2px 16px rgba(0,0,0,.04)', transition: 'box-shadow .2s' }}>
                      <div style={{ width: 52, height: 52, borderRadius: 16, background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Video size={24} style={{ color: '#fff' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: '0 0 4px', fontWeight: 800, color: '#1e293b', fontSize: 16 }}>{s.title}</h4>
                        <p style={{ margin: '0 0 6px', fontSize: 13, color: '#64748b' }}>
                          Hosted by <strong>{s.host_name}</strong>
                        </p>
                        {s.description && <p style={{ margin: '0 0 10px', fontSize: 13, color: '#94a3b8', lineHeight: 1.55 }}>{s.description}</p>}
                        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#94a3b8', flexWrap: 'wrap' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><CalendarDays size={12} /> {formatDateTime(s.session_datetime)}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> {s.duration_minutes} min</span>
                          {s.target_batch && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users size={12} /> Batch: {s.target_batch}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                        {s.status === 'live' && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: '#fee2e2', color: '#b91c1c', fontSize: 11, fontWeight: 800 }}>
                            LIVE NOW
                          </span>
                        )}
                        {canJoinSession(s) ? (
                          <a href={s.zoom_join_url} target="_blank" rel="noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '10px 20px', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: '#fff', textDecoration: 'none', borderRadius: 14, fontWeight: 800, fontSize: 14, boxShadow: '0 2px 10px rgba(124,58,237,.3)' }}>
                            Join <ExternalLink size={13} />
                          </a>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px', background: '#f1f5f9', color: '#94a3b8', borderRadius: 14, fontWeight: 800, fontSize: 13, cursor: 'not-allowed' }}>
                              <Lock size={13} /> Join (Opens 15m before)
                            </span>
                          </div>
                        )}
                        {s.zoom_passcode && (
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>
                            Passcode: <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#64748b' }}>{s.zoom_passcode}</span>
                          </span>
                        )}
                        {isAdmin && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => handleEdit(s)} style={{ padding: '6px 10px', border: '1.5px solid #e2e8f0', borderRadius: 9, background: '#fff', cursor: 'pointer', color: '#6366f1' }}><Edit3 size={13} /></button>
                            <button onClick={() => handleDelete(s.id)} style={{ padding: '6px 10px', border: '1.5px solid #fee2e2', borderRadius: 9, background: '#fff', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={13} /></button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {past.length > 0 && (
              <section>
                <h3 style={{ margin: '0 0 12px', fontWeight: 700, color: '#94a3b8', fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Clock size={15} /> Past Sessions
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {past.map(s => (
                    <div key={s.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #f1f5f9', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, opacity: .65 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 12, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Video size={16} style={{ color: '#94a3b8' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontWeight: 700, color: '#64748b', fontSize: 14 }}>{s.title}</p>
                        <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>{formatDateTime(s.session_datetime)} · {s.host_name}</p>
                      </div>
                      <span style={{ background: '#f1f5f9', color: '#94a3b8', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>Ended</span>
                      {isAdmin && (
                        <button onClick={() => handleDelete(s.id)} style={{ padding: '5px 8px', border: '1px solid #fee2e2', borderRadius: 8, background: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={12} /></button>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
