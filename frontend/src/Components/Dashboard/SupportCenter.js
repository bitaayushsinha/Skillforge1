import React, { useState, useEffect, useRef } from 'react';
import {
  LifeBuoy, Plus, CheckCircle, Clock, AlertCircle, Loader,
  Send, MessageSquare, X, ChevronRight, ChevronDown
} from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const STATUS_CFG = {
  open:         { color: '#3b82f6', bg: '#eff6ff', label: 'Open',        icon: '🔵' },
  in_progress:  { color: '#f59e0b', bg: '#fffbeb', label: 'In Progress', icon: '🟡' },
  resolved:     { color: '#10b981', bg: '#f0fdf4', label: 'Resolved',    icon: '🟢' },
  closed:       { color: '#94a3b8', bg: '#f8fafc', label: 'Closed',      icon: '⚪' },
};

const CATEGORIES = [
  'Technical Issue', 'Billing & Payments', 'Course Access',
  'Exam & Slots', 'Certification', 'Account', 'General Inquiry'
];

const PRIORITY_STYLE = {
  low:    { color: '#64748b', label: 'Low' },
  medium: { color: '#f59e0b', label: 'Medium' },
  high:   { color: '#ef4444', label: 'High' },
};

function ThreadView({ ticket, currentUser, token, onUpdate }) {
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket.messages]);

  const sendReply = async () => {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`${API}/api/communications/tickets/${ticket.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ body: replyText }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setReplyText('');
      onUpdate(updated);
    } catch {
      alert('Failed to send reply. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const messages = ticket.messages || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Thread */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.length === 0 && (
          <p style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', paddingTop: '24px' }}>
            No messages yet.
          </p>
        )}
        {messages.map((msg) => {
          const isMe = msg.sender_id === currentUser?.id;
          const isAdmin = msg.sender_role === 'admin' || msg.sender_role === 'sub_admin';
          return (
            <div key={msg.id} style={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: '10px', alignItems: 'flex-end' }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                background: isAdmin ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#e2e8f0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '14px', fontWeight: 700,
                color: isAdmin ? '#fff' : '#64748b',
              }}>
                {isAdmin ? '🛡' : (msg.sender_name?.[0] || '?')}
              </div>
              <div style={{ maxWidth: '72%' }}>
                <div style={{
                  background: isMe ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#f1f5f9',
                  color: isMe ? '#fff' : '#1e293b',
                  padding: '10px 14px',
                  borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  fontSize: '13px',
                  lineHeight: 1.5,
                  boxShadow: '0 1px 3px rgba(0,0,0,.06)',
                }}>
                  {msg.body}
                </div>
                <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: 4, textAlign: isMe ? 'right' : 'left' }}>
                  {msg.sender_name || 'Support'} · {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Reply bar (only if not closed/resolved) */}
      {!['resolved', 'closed'].includes(ticket.status) && (
        <div style={{ padding: '12px 16px', borderTop: '1px solid #e2e8f0', background: '#fff', display: 'flex', gap: 10 }}>
          <input
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendReply()}
            placeholder="Write a follow-up message..."
            style={{
              flex: 1, padding: '10px 14px', borderRadius: 12,
              border: '1.5px solid #e2e8f0', fontSize: 13,
              outline: 'none', fontFamily: 'inherit',
            }}
          />
          <button
            onClick={sendReply}
            disabled={sending || !replyText.trim()}
            style={{
              padding: '10px 18px', borderRadius: 12,
              background: replyText.trim() ? '#6366f1' : '#e2e8f0',
              color: replyText.trim() ? '#fff' : '#94a3b8',
              border: 'none', cursor: replyText.trim() ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', gap: 6,
              fontWeight: 700, fontSize: 13, transition: 'all .2s',
            }}
          >
            {sending ? <Loader size={14} className="animate-spin" /> : <Send size={14} />}
            Send
          </button>
        </div>
      )}
    </div>
  );
}

export default function SupportCenter({ user }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ subject: '', category: CATEGORIES[0], message: '', priority: 'medium' });

  const token = localStorage.getItem('sf_token');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const fetchTickets = () => {
    fetch(`${API}/api/communications/tickets`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(setTickets)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTickets(); }, [token]); // eslint-disable-line

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.message.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/communications/tickets`, { method: 'POST', headers, body: JSON.stringify(form) });
      if (!res.ok) throw new Error();
      const ticket = await res.json();
      setTickets(prev => [ticket, ...prev]);
      setSuccess(`Ticket ${ticket.ticket_number} submitted! We'll respond shortly.`);
      setShowForm(false);
      setSelectedId(ticket.id);
      setForm({ subject: '', category: CATEGORIES[0], message: '', priority: 'medium' });
      setTimeout(() => setSuccess(''), 5000);
    } catch {
      alert('Failed to submit ticket. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateTicket = (updated) => {
    setTickets(prev => prev.map(t => t.id === updated.id ? updated : t));
  };

  const selectedTicket = tickets.find(t => t.id === selectedId);
  const unread = tickets.filter(t => t.status !== 'closed').length;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', background: '#f8fafc', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0f766e 0%, #0891b2 100%)', padding: '28px 36px', color: '#fff', flexShrink: 0 }}>
        <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', opacity: .75, textTransform: 'uppercase', marginBottom: 4 }}>Help Center</p>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Support Tickets</h1>
            <p style={{ fontSize: 13, opacity: .8, marginTop: 4 }}>
              {unread} active ticket{unread !== 1 ? 's' : ''} · {tickets.length} total
            </p>
          </div>
          <button
            onClick={() => { setShowForm(v => !v); setSelectedId(null); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '11px 22px', background: '#fff', color: '#0f766e',
              border: 'none', borderRadius: 14, fontWeight: 800, fontSize: 14,
              cursor: 'pointer', boxShadow: '0 2px 12px rgba(0,0,0,.15)',
            }}
          >
            <Plus size={17} /> New Ticket
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', maxWidth: 960, margin: '0 auto', width: '100%', padding: '24px 0' }}>

        {/* Left panel: list */}
        <div style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 0, overflowY: 'auto', paddingRight: 16 }}>
          {success && (
            <div style={{ padding: '12px 16px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 12, marginBottom: 12, color: '#16a34a', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}>
              <CheckCircle size={15} /> {success}
            </div>
          )}

          {/* New ticket form */}
          {showForm && (
            <div style={{ background: '#fff', borderRadius: 16, border: '1.5px solid #e2e8f0', padding: 20, marginBottom: 12, boxShadow: '0 4px 20px rgba(0,0,0,.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontWeight: 800, fontSize: 15, color: '#1e293b' }}>New Support Request</h3>
                <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={16} /></button>
              </div>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>Subject *</label>
                  <input
                    required value={form.subject}
                    onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                    placeholder="Brief description of your issue"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>Category</label>
                    <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 12, background: '#fff', fontFamily: 'inherit' }}>
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>Priority</label>
                    <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 12, background: '#fff', fontFamily: 'inherit' }}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>Message *</label>
                  <textarea
                    required rows={4} value={form.message}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    placeholder="Describe your issue in detail..."
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, resize: 'none', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" disabled={submitting}
                    style={{ flex: 1, padding: '10px', background: '#0f766e', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                    {submitting ? <Loader size={14} className="animate-spin" /> : <LifeBuoy size={14} />}
                    {submitting ? 'Submitting…' : 'Submit Ticket'}
                  </button>
                  <button type="button" onClick={() => setShowForm(false)}
                    style={{ padding: '10px 16px', border: '1.5px solid #e2e8f0', background: '#fff', borderRadius: 10, fontWeight: 700, color: '#64748b', cursor: 'pointer', fontSize: 13 }}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Ticket list */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
              <Loader size={28} style={{ color: '#0f766e', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : tickets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 16px', color: '#94a3b8' }}>
              <LifeBuoy size={40} style={{ marginBottom: 10, opacity: .4 }} />
              <p style={{ fontWeight: 600, color: '#64748b', marginBottom: 6 }}>No tickets yet</p>
              <p style={{ fontSize: 13 }}>Submit a support request and track its progress here.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {tickets.map(t => {
                const cfg = STATUS_CFG[t.status] || STATUS_CFG.open;
                const pri = PRIORITY_STYLE[t.priority] || PRIORITY_STYLE.medium;
                const isSelected = selectedId === t.id;
                const unreadMsgs = (t.messages || []).filter(m => m.sender_role !== 'learner').length;
                return (
                  <button
                    key={t.id}
                    onClick={() => { setSelectedId(isSelected ? null : t.id); setShowForm(false); }}
                    style={{
                      background: isSelected ? '#eff6ff' : '#fff',
                      border: isSelected ? '2px solid #3b82f6' : '1.5px solid #e2e8f0',
                      borderRadius: 14, padding: '14px 16px', textAlign: 'left', cursor: 'pointer',
                      boxShadow: isSelected ? '0 0 0 3px rgba(59,130,246,.1)' : 'none',
                      transition: 'all .15s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: '#1e293b', lineHeight: 1.3, flex: 1, marginRight: 8 }}>{t.subject}</span>
                      <span style={{ background: cfg.bg, color: cfg.color, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{cfg.label}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#94a3b8' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#64748b' }}>{t.ticket_number}</span>
                      <span>·</span>
                      <span style={{ color: pri.color, fontWeight: 700 }}>{pri.label}</span>
                      <span>·</span>
                      <span>{t.category}</span>
                      {unreadMsgs > 0 && (
                        <><span>·</span><span style={{ background: '#6366f1', color: '#fff', padding: '1px 7px', borderRadius: 20, fontWeight: 700 }}>{unreadMsgs} msg{unreadMsgs !== 1 ? 's' : ''}</span></>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right panel: thread */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff', borderRadius: 20, border: '1.5px solid #e2e8f0', boxShadow: '0 4px 24px rgba(0,0,0,.05)', overflow: 'hidden', marginLeft: 16 }}>
          {selectedTicket ? (
            <>
              {/* Thread header */}
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 800, color: '#1e293b', fontSize: 15 }}>{selectedTicket.subject}</p>
                  <p style={{ margin: '3px 0 0', fontSize: 12, color: '#94a3b8' }}>
                    {selectedTicket.ticket_number} · {selectedTicket.category} · Opened {new Date(selectedTicket.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {(() => { const cfg = STATUS_CFG[selectedTicket.status] || STATUS_CFG.open; return (
                    <span style={{ background: cfg.bg, color: cfg.color, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{cfg.label}</span>
                  );})()}
                  <button onClick={() => setSelectedId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}><X size={16} /></button>
                </div>
              </div>
              <ThreadView ticket={selectedTicket} currentUser={user} token={token} onUpdate={handleUpdateTicket} />
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#94a3b8', gap: 12 }}>
              <MessageSquare size={48} style={{ opacity: .25 }} />
              <p style={{ fontWeight: 600, color: '#64748b', fontSize: 15 }}>Select a ticket to view the conversation</p>
              <p style={{ fontSize: 13 }}>Or click "New Ticket" to submit a support request</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
