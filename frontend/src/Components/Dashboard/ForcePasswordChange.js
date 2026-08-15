import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Shield, CheckCircle, AlertCircle, Loader } from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export default function ForcePasswordChange({ user, onSuccess }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const token = localStorage.getItem('sf_token');

  const requirements = [
    { label: 'At least 8 characters', met: newPassword.length >= 8 },
    { label: 'At least one uppercase letter', met: /[A-Z]/.test(newPassword) },
    { label: 'At least one number', met: /[0-9]/.test(newPassword) },
  ];

  const allMet = requirements.every(r => r.met);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!allMet) {
      setError('New password does not meet all requirements.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/communications/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to change password.');
      }
      setSuccess(true);
      setTimeout(() => onSuccess?.(), 1800);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      padding: 24,
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
    }}>
      {/* Background glow effects */}
      <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'rgba(99,102,241,.12)', filter: 'blur(80px)', top: '10%', left: '15%', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'rgba(139,92,246,.1)', filter: 'blur(60px)', bottom: '10%', right: '15%', pointerEvents: 'none' }} />

      <div style={{
        width: '100%', maxWidth: 440,
        background: 'rgba(255,255,255,.05)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,.1)',
        borderRadius: 28,
        padding: '40px 36px',
        boxShadow: '0 32px 80px rgba(0,0,0,.5)',
        position: 'relative',
      }}>
        {/* Shield icon */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 72, height: 72,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            borderRadius: 22, display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(99,102,241,.4)',
            marginBottom: 16,
          }}>
            <Shield size={34} color="#fff" />
          </div>
          <h1 style={{ color: '#fff', fontWeight: 800, fontSize: 24, margin: 0, marginBottom: 8 }}>
            Set a New Password
          </h1>
          <p style={{ color: 'rgba(255,255,255,.55)', fontSize: 14, margin: 0, lineHeight: 1.6 }}>
            For your security, you must choose a new password before accessing your account.
          </p>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <CheckCircle size={52} style={{ color: '#10b981', marginBottom: 12 }} />
            <p style={{ color: '#fff', fontWeight: 700, fontSize: 18, marginBottom: 6 }}>Password Changed!</p>
            <p style={{ color: 'rgba(255,255,255,.55)', fontSize: 14 }}>Taking you to your dashboard…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Current password */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.6)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>
                Temporary Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,.35)' }} />
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  required
                  placeholder="Enter your temporary password"
                  style={{
                    width: '100%', paddingLeft: 40, paddingRight: 40, paddingTop: 12, paddingBottom: 12,
                    background: 'rgba(255,255,255,.07)', border: '1.5px solid rgba(255,255,255,.12)',
                    borderRadius: 14, color: '#fff', fontSize: 14, outline: 'none',
                    fontFamily: 'inherit', boxSizing: 'border-box',
                  }}
                />
                <button type="button" onClick={() => setShowCurrent(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.4)' }}>
                  {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* New password */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.6)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,.35)' }} />
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  placeholder="Create a strong new password"
                  style={{
                    width: '100%', paddingLeft: 40, paddingRight: 40, paddingTop: 12, paddingBottom: 12,
                    background: 'rgba(255,255,255,.07)', border: `1.5px solid ${newPassword && !allMet ? 'rgba(239,68,68,.4)' : 'rgba(255,255,255,.12)'}`,
                    borderRadius: 14, color: '#fff', fontSize: 14, outline: 'none',
                    fontFamily: 'inherit', boxSizing: 'border-box',
                  }}
                />
                <button type="button" onClick={() => setShowNew(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.4)' }}>
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Password requirements */}
              {newPassword && (
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {requirements.map((r, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12 }}>
                      <div style={{
                        width: 16, height: 16, borderRadius: '50%',
                        background: r.met ? '#10b981' : 'rgba(255,255,255,.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        transition: 'background .2s',
                      }}>
                        {r.met && <CheckCircle size={10} color="#fff" />}
                      </div>
                      <span style={{ color: r.met ? '#10b981' : 'rgba(255,255,255,.45)' }}>{r.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.6)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>
                Confirm New Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,.35)' }} />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Confirm your new password"
                  style={{
                    width: '100%', paddingLeft: 40, paddingRight: 40, paddingTop: 12, paddingBottom: 12,
                    background: 'rgba(255,255,255,.07)',
                    border: `1.5px solid ${confirmPassword && newPassword !== confirmPassword ? 'rgba(239,68,68,.4)' : 'rgba(255,255,255,.12)'}`,
                    borderRadius: 14, color: '#fff', fontSize: 14, outline: 'none',
                    fontFamily: 'inherit', boxSizing: 'border-box',
                  }}
                />
                <button type="button" onClick={() => setShowConfirm(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.4)' }}>
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p style={{ margin: '6px 0 0', fontSize: 12, color: '#f87171', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <AlertCircle size={12} /> Passwords do not match
                </p>
              )}
            </div>

            {/* Error */}
            {error && (
              <div style={{
                padding: '12px 16px', background: 'rgba(239,68,68,.15)', border: '1px solid rgba(239,68,68,.3)',
                borderRadius: 12, color: '#fca5a5', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <AlertCircle size={14} /> {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 8,
                padding: '14px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                border: 'none', borderRadius: 16,
                color: '#fff', fontWeight: 800, fontSize: 15, cursor: loading ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                boxShadow: '0 4px 20px rgba(99,102,241,.4)',
                opacity: loading ? .7 : 1,
                transition: 'opacity .2s',
              }}
            >
              {loading ? <Loader size={18} /> : <Shield size={18} />}
              {loading ? 'Securing your account…' : 'Set New Password & Continue'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
