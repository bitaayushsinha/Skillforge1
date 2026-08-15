import React, { useState, useEffect } from 'react';
import {
  Megaphone, Plus, X, Loader, CheckCircle, Building2,
  BookOpen, Users, Calendar, AlertTriangle, Info, Bell
} from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const PRIORITY_OPTIONS = [
  { value: 'normal', label: 'Normal', color: '#6366f1', bg: '#eff0ff' },
  { value: 'high',   label: 'High',   color: '#f59e0b', bg: '#fffbeb' },
  { value: 'urgent', label: 'Urgent', color: '#ef4444', bg: '#fef2f2' },
];

const PRIORITY_ICON = { urgent: <AlertTriangle size={12} />, high: <Megaphone size={12} />, normal: <Info size={12} /> };

export default function AnnouncementComposer({ user }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [institutions, setInstitutions] = useState([]);
  const [specializations, setSpecializations] = useState([]);

  const [form, setForm] = useState({
    title: '', content: '', priority: 'normal',
    target_institution_id: '', target_specialization_id: '', target_batch: '', expires_at: '',
  });

  const token = localStorage.getItem('sf_token');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/communications/announcements`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : Promise.reject()).catch(() => []),
      fetch(`${API}/api/institutions`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : Promise.reject()).catch(() => []),
      fetch(`${API}/api/learning/specializations`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : Promise.reject()).catch(() => []),
    ]).then(([anns, insts, specs]) => {
      setAnnouncements(Array.isArray(anns) ? anns : []);
      setInstitutions(Array.isArray(insts) ? insts : []);
      setSpecializations(Array.isArray(specs) ? specs : []);
      setLoading(false);
    });
  }, []); // eslint-disable-line

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;
    setSubmitting(true);
    const body = {
      title: form.title,
      content: form.content,
      priority: form.priority,
      target_institution_id: form.target_institution_id ? parseInt(form.target_institution_id) : null,
      target_specialization_id: form.target_specialization_id ? parseInt(form.target_specialization_id) : null,
      target_batch: form.target_batch || null,
      expires_at: form.expires_at || null,
    };
    try {
      const res = await fetch(`${API}/api/communications/announcements`, { method: 'POST', headers, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json())?.detail || 'Failed');
      const ann = await res.json();
      setAnnouncements(prev => [ann, ...prev]);
      setSuccess(`Announcement "${ann.title}" published!`);
      setShowForm(false);
      setForm({ title: '', content: '', priority: 'normal', target_institution_id: '', target_specialization_id: '', target_batch: '', expires_at: '' });
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteAnnouncement = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    await fetch(`${API}/api/communications/announcements/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    setAnnouncements(prev => prev.filter(a => a.id !== id));
  };

  const targetSummary = (ann) => {
    const parts = [];
    if (ann.target_institution_id) {
      const inst = institutions.find(i => i.id === ann.target_institution_id);
      if (inst) parts.push(`🏛 ${inst.name}`);
    }
    if (ann.target_specialization_id) {
      const spec = specializations.find(s => s.id === ann.target_specialization_id);
      if (spec) parts.push(`📚 ${spec.name}`);
    }
    if (ann.target_batch) parts.push(`👥 Batch: ${ann.target_batch}`);
    return parts.length ? parts.join(' · ') : '🌐 All Students';
  };

  const getPriorityStyle = (p) => PRIORITY_OPTIONS.find(o => o.value === p) || PRIORITY_OPTIONS[0];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f8fafc', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', padding: '28px 36px', color: '#fff', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(255,255,255,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Megaphone size={22} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontWeight: 800, fontSize: 24 }}>Announcements</h1>
              <p style={{ margin: '3px 0 0', fontSize: 13, opacity: .75 }}>{announcements.length} published announcements</p>
            </div>
          </div>
          <button onClick={() => setShowForm(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '11px 22px', background: showForm ? 'rgba(255,255,255,.15)' : '#fff',
              color: showForm ? '#fff' : '#4f46e5', border: showForm ? '1px solid rgba(255,255,255,.3)' : 'none',
              borderRadius: 14, fontWeight: 800, fontSize: 14, cursor: 'pointer',
              boxShadow: '0 2px 12px rgba(0,0,0,.15)',
            }}>
            {showForm ? <X size={16} /> : <Plus size={17} />}
            {showForm ? 'Cancel' : 'New Announcement'}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 36px' }}>

        {success && (
          <div style={{ marginBottom: 16, padding: '12px 18px', background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 14, color: '#16a34a', display: 'flex', gap: 10, alignItems: 'center', fontWeight: 600, fontSize: 14 }}>
            <CheckCircle size={16} /> {success}
          </div>
        )}

        {/* Composer form */}
        {showForm && (
          <div style={{ background: '#fff', borderRadius: 20, border: '1.5px solid #e2e8f0', padding: 28, marginBottom: 24, boxShadow: '0 8px 32px rgba(79,70,229,.08)' }}>
            <h3 style={{ margin: '0 0 20px', fontWeight: 800, color: '#1e293b', fontSize: 17, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Megaphone size={18} style={{ color: '#6366f1' }} /> Compose Announcement
            </h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Title */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>Title *</label>
                <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Announcement title..."
                  style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', fontWeight: 600 }}
                />
              </div>

              {/* Content */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>Content *</label>
                <textarea required value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={4}
                  placeholder="Write the announcement body..."
                  style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 14, resize: 'vertical', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', lineHeight: 1.6 }}
                />
              </div>

              {/* Priority */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>Priority</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {PRIORITY_OPTIONS.map(p => (
                    <button key={p.value} type="button" onClick={() => setForm(f => ({ ...f, priority: p.value }))}
                      style={{
                        flex: 1, padding: '9px 14px', borderRadius: 12, border: '2px solid',
                        borderColor: form.priority === p.value ? p.color : '#e2e8f0',
                        background: form.priority === p.value ? p.bg : '#fff',
                        color: form.priority === p.value ? p.color : '#94a3b8',
                        fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      }}>
                      {PRIORITY_ICON[p.value]} {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Targeting */}
              <div style={{ background: '#f8fafc', borderRadius: 14, padding: 18 }}>
                <p style={{ margin: '0 0 12px', fontWeight: 800, color: '#475569', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Users size={14} /> Targeting (leave blank for all students)
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Building2 size={11} /> Institution
                    </label>
                    <select value={form.target_institution_id} onChange={e => setForm(f => ({ ...f, target_institution_id: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, background: '#fff', fontFamily: 'inherit' }}>
                      <option value="">All Institutions</option>
                      {institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <BookOpen size={11} /> Specialization
                    </label>
                    <select value={form.target_specialization_id} onChange={e => setForm(f => ({ ...f, target_specialization_id: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, background: '#fff', fontFamily: 'inherit' }}>
                      <option value="">All Specializations</option>
                      {specializations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Users size={11} /> Batch Name
                    </label>
                    <input value={form.target_batch} onChange={e => setForm(f => ({ ...f, target_batch: e.target.value }))}
                      placeholder="e.g. Batch-2026"
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Calendar size={11} /> Expiry (optional)
                  </label>
                  <input type="datetime-local" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                    style={{ padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, fontFamily: 'inherit' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" disabled={submitting}
                  style={{ flex: 1, padding: '13px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', border: 'none', borderRadius: 14, fontWeight: 800, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {submitting ? <Loader size={16} /> : <Megaphone size={16} />}
                  {submitting ? 'Publishing…' : 'Publish Announcement'}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  style={{ padding: '13px 22px', border: '1.5px solid #e2e8f0', background: '#fff', borderRadius: 14, fontWeight: 700, color: '#64748b', cursor: 'pointer', fontSize: 14 }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Announcements list */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '64px 0' }}>
            <Loader size={32} style={{ color: '#6366f1' }} />
          </div>
        ) : announcements.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 16px', color: '#94a3b8' }}>
            <Bell size={52} style={{ opacity: .2, marginBottom: 12 }} />
            <p style={{ fontWeight: 700, color: '#64748b', fontSize: 16, marginBottom: 6 }}>No announcements yet</p>
            <p style={{ fontSize: 14 }}>Click "New Announcement" to broadcast a message to your students.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {announcements.map(ann => {
              const pCfg = getPriorityStyle(ann.priority);
              const now = new Date();
              const expired = ann.expires_at && new Date(ann.expires_at) < now;
              return (
                <div key={ann.id}
                  style={{
                    background: expired ? '#f8fafc' : '#fff',
                    border: `1.5px solid ${expired ? '#f1f5f9' : '#e2e8f0'}`,
                    borderRadius: 18, padding: '20px 24px',
                    boxShadow: expired ? 'none' : '0 2px 12px rgba(0,0,0,.04)',
                    opacity: expired ? .65 : 1,
                    position: 'relative',
                    borderLeft: `4px solid ${pCfg.color}`,
                  }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <span style={{ background: pCfg.bg, color: pCfg.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 5 }}>
                          {PRIORITY_ICON[ann.priority]} {ann.priority.charAt(0).toUpperCase() + ann.priority.slice(1)}
                        </span>
                        {expired && <span style={{ background: '#fef2f2', color: '#ef4444', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>Expired</span>}
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>{new Date(ann.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                      <h4 style={{ margin: '0 0 6px', fontWeight: 800, color: '#1e293b', fontSize: 16 }}>{ann.title}</h4>
                      <p style={{ margin: '0 0 10px', color: '#475569', fontSize: 14, lineHeight: 1.6 }}>{ann.content}</p>
                      <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Users size={11} /> {targetSummary(ann)}
                        {ann.expires_at && <><span>·</span><Calendar size={11} /> Expires {new Date(ann.expires_at).toLocaleDateString()}</>}
                      </p>
                    </div>
                    <button onClick={() => deleteAnnouncement(ann.id)}
                      style={{ marginLeft: 12, padding: 7, background: 'none', border: '1.5px solid #fee2e2', borderRadius: 9, cursor: 'pointer', color: '#ef4444', flexShrink: 0 }}>
                      <X size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
