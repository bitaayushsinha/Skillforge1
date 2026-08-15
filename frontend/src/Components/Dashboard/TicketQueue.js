import React, { useState, useEffect, useRef } from 'react';
import {
  Ticket, Search, Filter, ChevronDown, ChevronRight, Send, Loader,
  CheckCircle2, Clock, AlertCircle, X, RefreshCw, MessageSquare, Users
} from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const STATUS_CFG = {
  open:        { label: 'Open',        color: '#3b82f6', bg: '#eff6ff' },
  in_progress: { label: 'In Progress', color: '#f59e0b', bg: '#fffbeb' },
  resolved:    { label: 'Resolved',    color: '#10b981', bg: '#f0fdf4' },
  closed:      { label: 'Closed',      color: '#94a3b8', bg: '#f8fafc' },
};

const PRIORITY_STYLE = {
  low:    { color: '#64748b', label: 'Low' },
  medium: { color: '#f59e0b', label: 'Medium' },
  high:   { color: '#ef4444', label: 'High' },
};

const STATUS_OPTIONS = ['all', 'open', 'in_progress', 'resolved', 'closed'];

export default function TicketQueue({ user }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const bottomRef = useRef(null);

  const token = localStorage.getItem('sf_token');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const fetchTickets = (sf = statusFilter) => {
    setLoading(true);
    const params = sf !== 'all' ? `?status_filter=${sf}` : '';
    fetch(`${API}/api/communications/tickets${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(data => { setTickets(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchTickets(); }, [statusFilter]); // eslint-disable-line

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [selectedId, tickets]);

  const updateTicket = (updated) => setTickets(prev => prev.map(t => t.id === updated.id ? updated : t));

  const selectedTicket = tickets.find(t => t.id === selectedId);

  const sendReply = async () => {
    if (!replyText.trim() || !selectedTicket) return;
    setSendingReply(true);
    try {
      const res = await fetch(`${API}/api/communications/tickets/${selectedTicket.id}/reply`, {
        method: 'POST', headers, body: JSON.stringify({ body: replyText }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      updateTicket(updated);
      setReplyText('');
    } catch {
      alert('Failed to send reply.');
    } finally {
      setSendingReply(false);
    }
  };

  const setStatus = async (newStatus) => {
    if (!selectedTicket) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`${API}/api/communications/tickets/${selectedTicket.id}/status`, {
        method: 'PUT', headers, body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      updateTicket(updated);
    } catch {
      alert('Failed to update status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const filteredTickets = tickets.filter(t => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return t.subject?.toLowerCase().includes(q) || t.ticket_number?.toLowerCase().includes(q) || t.category?.toLowerCase().includes(q);
    }
    return true;
  });

  const counts = STATUS_OPTIONS.slice(1).reduce((acc, s) => {
    acc[s] = tickets.filter(t => t.status === s).length;
    return acc;
  }, {});

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f8fafc', overflow: 'hidden', height: '100%' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)', padding: '24px 32px', color: '#fff', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Ticket size={20} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontWeight: 800, fontSize: 22 }}>Ticket Queue</h1>
              <p style={{ margin: 0, fontSize: 13, opacity: .7 }}>{tickets.length} total tickets</p>
            </div>
          </div>
          <button onClick={() => fetchTickets()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)', borderRadius: 10, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* Status tabs */}
        <div style={{ display: 'flex', gap: 6 }}>
          {STATUS_OPTIONS.map(s => {
            const isActive = statusFilter === s;
            const cfg = s !== 'all' ? STATUS_CFG[s] : null;
            return (
              <button key={s} onClick={() => { setStatusFilter(s); setSelectedId(null); }}
                style={{
                  padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                  background: isActive ? '#fff' : 'rgba(255,255,255,.1)',
                  color: isActive ? (cfg?.color || '#1e293b') : 'rgba(255,255,255,.8)',
                  transition: 'all .15s',
                }}
              >
                {s === 'all' ? 'All' : STATUS_CFG[s]?.label}
                {s !== 'all' && counts[s] > 0 && <span style={{ marginLeft: 5, background: isActive ? (cfg?.color || '#1e293b') : 'rgba(255,255,255,.2)', color: '#fff', padding: '1px 6px', borderRadius: 10, fontSize: 10 }}>{counts[s]}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Body: split pane */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left: ticket list */}
        <div style={{ width: 340, flexShrink: 0, borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', background: '#fff', overflow: 'hidden' }}>
          {/* Search */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search tickets..."
                style={{ width: '100%', paddingLeft: 34, paddingRight: 12, paddingTop: 9, paddingBottom: 9, border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
                <Loader size={24} style={{ color: '#6366f1' }} />
              </div>
            ) : filteredTickets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 16px', color: '#94a3b8' }}>
                <Ticket size={36} style={{ opacity: .3, marginBottom: 8 }} />
                <p style={{ fontWeight: 600 }}>No tickets found</p>
              </div>
            ) : (
              filteredTickets.map(t => {
                const cfg = STATUS_CFG[t.status] || STATUS_CFG.open;
                const pri = PRIORITY_STYLE[t.priority] || PRIORITY_STYLE.medium;
                const isSelected = selectedId === t.id;
                const newMsgs = (t.messages || []).filter(m => m.sender_role === 'learner').length;
                return (
                  <button key={t.id} onClick={() => { setSelectedId(isSelected ? null : t.id); setReplyText(''); }}
                    style={{
                      width: '100%', textAlign: 'left', padding: '14px 16px', background: isSelected ? '#f0f9ff' : '#fff',
                      borderLeft: isSelected ? '3px solid #3b82f6' : '3px solid transparent',
                      borderTop: 'none', borderRight: 'none', borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer', transition: 'all .15s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: '#1e293b', lineHeight: 1.3, flex: 1, marginRight: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject}</span>
                      <span style={{ background: cfg.bg, color: cfg.color, padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 800, flexShrink: 0 }}>{cfg.label}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{t.ticket_number}</span>
                      <span>·</span>
                      <span style={{ color: pri.color, fontWeight: 700 }}>{pri.label}</span>
                      <span>·</span>
                      <span>{t.category}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 4 }}>
                      {new Date(t.created_at).toLocaleDateString('en-IN')}
                      {newMsgs > 0 && <span style={{ marginLeft: 8, background: '#6366f1', color: '#fff', padding: '1px 6px', borderRadius: 20, fontWeight: 700 }}>{newMsgs} student msg{newMsgs !== 1 ? 's' : ''}</span>}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: ticket detail + thread */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fafafa' }}>
          {selectedTicket ? (
            <>
              {/* Ticket detail header */}
              <div style={{ padding: '16px 24px', borderBottom: '1px solid #e2e8f0', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexShrink: 0 }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 4px', fontWeight: 800, color: '#1e293b', fontSize: 16 }}>{selectedTicket.subject}</h3>
                  <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>
                    {selectedTicket.ticket_number} · {selectedTicket.category} · Priority: {PRIORITY_STYLE[selectedTicket.priority]?.label}
                  </p>
                </div>
                {/* Status picker */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {updatingStatus && <Loader size={14} style={{ color: '#6366f1' }} />}
                  <select value={selectedTicket.status} onChange={e => setStatus(e.target.value)} disabled={updatingStatus}
                    style={{ padding: '6px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 12, fontWeight: 700, color: STATUS_CFG[selectedTicket.status]?.color, background: STATUS_CFG[selectedTicket.status]?.bg, cursor: 'pointer', fontFamily: 'inherit' }}>
                    {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                  <button onClick={() => setSelectedId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}>
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Thread messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(selectedTicket.messages || []).map(msg => {
                  const isAdmin = msg.sender_role === 'admin' || msg.sender_role === 'sub_admin';
                  return (
                    <div key={msg.id} style={{ display: 'flex', gap: 12, flexDirection: isAdmin ? 'row-reverse' : 'row', alignItems: 'flex-end' }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                        background: isAdmin ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#e2e8f0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, fontWeight: 700, color: isAdmin ? '#fff' : '#64748b',
                      }}>
                        {isAdmin ? '🛡' : (msg.sender_name?.[0] || '?')}
                      </div>
                      <div style={{ maxWidth: '70%' }}>
                        <div style={{
                          background: isAdmin ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#fff',
                          color: isAdmin ? '#fff' : '#1e293b',
                          padding: '10px 14px',
                          borderRadius: isAdmin ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          fontSize: 13, lineHeight: 1.55,
                          border: isAdmin ? 'none' : '1px solid #e2e8f0',
                          boxShadow: '0 1px 4px rgba(0,0,0,.05)',
                        }}>
                          {msg.body}
                        </div>
                        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3, textAlign: isAdmin ? 'right' : 'left' }}>
                          {msg.sender_name || 'Support'} ({msg.sender_role}) · {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Reply (disabled for resolved/closed) */}
              {['resolved', 'closed'].includes(selectedTicket.status) ? (
                <div style={{ padding: '14px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: 13, color: '#94a3b8' }}>
                  This ticket is {selectedTicket.status} — reopen by changing its status to respond further.
                </div>
              ) : (
                <div style={{ padding: '12px 24px', borderTop: '1px solid #e2e8f0', background: '#fff', display: 'flex', gap: 10, flexShrink: 0 }}>
                  <input
                    value={replyText} onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendReply()}
                    placeholder="Write a response to the student..."
                    style={{ flex: 1, padding: '10px 14px', borderRadius: 12, border: '1.5px solid #e2e8f0', fontSize: 13, outline: 'none', fontFamily: 'inherit' }}
                  />
                  <button onClick={sendReply} disabled={sendingReply || !replyText.trim()}
                    style={{
                      padding: '10px 20px', borderRadius: 12, border: 'none', cursor: replyText.trim() ? 'pointer' : 'default',
                      background: replyText.trim() ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#e2e8f0',
                      color: replyText.trim() ? '#fff' : '#94a3b8', fontWeight: 700, fontSize: 13,
                      display: 'flex', alignItems: 'center', gap: 7, transition: 'all .15s',
                    }}>
                    {sendingReply ? <Loader size={14} /> : <Send size={14} />} Reply
                  </button>
                </div>
              )}
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: '#94a3b8' }}>
              <MessageSquare size={52} style={{ opacity: .2 }} />
              <p style={{ fontWeight: 600, color: '#64748b', fontSize: 16 }}>Select a ticket to view and respond</p>
              <p style={{ fontSize: 13 }}>Use the queue on the left to triage and manage student queries</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
