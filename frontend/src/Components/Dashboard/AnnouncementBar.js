import React, { useState, useEffect, useCallback } from 'react';
import { X, Bell, ChevronRight, AlertTriangle, Info, Megaphone, CheckCheck } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const PRIORITY_CONFIG = {
  urgent: { bg: '#dc2626', text: '#fff', icon: <AlertTriangle size={14} /> },
  high:   { bg: '#d97706', text: '#fff', icon: <Megaphone size={14} /> },
  normal: { bg: '#4f46e5', text: '#fff', icon: <Info size={14} /> },
  low:    { bg: '#475569', text: '#fff', icon: <Bell size={14} /> },
};

export default function AnnouncementBar({ user }) {
  const [announcements, setAnnouncements] = useState([]);
  const [dismissed, setDismissed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sf_dismissed_announcements') || '[]'); }
    catch { return []; }
  });
  const [currentIdx, setCurrentIdx] = useState(0);
  const [marking, setMarking] = useState(false);

  const token = localStorage.getItem('sf_token');

  const fetchAnnouncements = useCallback(() => {
    if (!token) return;
    fetch(`${API}/api/communications/announcements`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : [])
      .then(all => {
        const now = new Date();
        setAnnouncements(all.filter(a => !a.expires_at || new Date(a.expires_at) > now));
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);

  const handleDismiss = useCallback((id) => {
    // Mark as read on server (fire-and-forget)
    fetch(`${API}/api/communications/announcements/${id}/read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});

    setDismissed(prev => {
      const updated = [...prev, id];
      localStorage.setItem('sf_dismissed_announcements', JSON.stringify(updated));
      return updated;
    });
    setCurrentIdx(0);
  }, [token]);

  const handleMarkAllRead = useCallback(async () => {
    setMarking(true);
    try {
      await fetch(`${API}/api/communications/announcements/mark-all-read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const allIds = announcements.map(a => a.id);
      setDismissed(prev => {
        const updated = [...new Set([...prev, ...allIds])];
        localStorage.setItem('sf_dismissed_announcements', JSON.stringify(updated));
        return updated;
      });
    } catch { /* silent */ }
    finally { setMarking(false); }
  }, [announcements, token]);

  const visible = announcements.filter(a => !dismissed.includes(a.id));
  const unreadCount = announcements.filter(a => !a.is_read && !dismissed.includes(a.id)).length;

  if (visible.length === 0) return null;

  const ann = visible[Math.min(currentIdx, visible.length - 1)];
  if (!ann) return null;

  const cfg = PRIORITY_CONFIG[ann.priority] || PRIORITY_CONFIG.normal;

  return (
    <div style={{
      background: cfg.bg, color: cfg.text,
      padding: '10px 20px', display: 'flex', alignItems: 'center',
      gap: 12, fontSize: 13, flexShrink: 0, position: 'relative',
      boxShadow: '0 2px 8px rgba(0,0,0,.12)',
    }}>
      {/* Priority icon */}
      <span style={{ flexShrink: 0, opacity: .9 }}>{cfg.icon}</span>

      {/* Unread badge */}
      {unreadCount > 0 && (
        <span style={{
          background: 'rgba(255,255,255,.25)', color: '#fff',
          borderRadius: 20, padding: '1px 8px', fontSize: 11, fontWeight: 800, flexShrink: 0,
        }}>
          {unreadCount} new
        </span>
      )}

      {/* Announcement text */}
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        <strong style={{ marginRight: 8 }}>{ann.title}</strong>
        <span style={{ opacity: .9 }}>{ann.content}</span>
      </div>

      {/* Pagination */}
      {visible.length > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, fontSize: 12, fontWeight: 800, opacity: .85 }}>
          <span>{currentIdx + 1}/{visible.length}</span>
          <button
            onClick={() => setCurrentIdx(i => (i + 1) % visible.length)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: '2px 4px', borderRadius: 6, opacity: .9 }}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Mark all read */}
      {unreadCount > 0 && (
        <button
          onClick={handleMarkAllRead}
          disabled={marking}
          style={{
            background: 'rgba(255,255,255,.2)', border: 'none', borderRadius: 8,
            color: '#fff', cursor: 'pointer', padding: '4px 10px', fontSize: 11,
            fontWeight: 700, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4,
          }}
        >
          <CheckCheck size={12} /> {marking ? 'Marking…' : 'Mark all read'}
        </button>
      )}

      {/* Dismiss current */}
      <button
        onClick={() => handleDismiss(ann.id)}
        aria-label="Dismiss"
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 4, opacity: .8, flexShrink: 0 }}
      >
        <X size={15} />
      </button>
    </div>
  );
}
