import React, { useState } from 'react';
import { Mail, Send, CheckCircle } from 'lucide-react';
import { PrivacyModal, TermsModal } from './LegalModals';
import { BRANDING } from '../config/branding';

export default function Footer({ setActivePage }) {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState('');
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      if (response.ok) {
        setSubscribed(true);
        setEmail('');
      } else {
        setError('Failed to subscribe. Please try again later.');
      }
    } catch (err) {
      setError('Network error. Please try again later.');
    }
  };

  return (
    <footer style={styles.footer}>
      <div className="container" style={styles.container}>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-[2fr_1fr_2fr] gap-12">
          {/* Brand Column */}
          <div style={styles.brandCol}>
            <div style={styles.logoRow}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" fill="#2563EB" />
                <path d="M12 17C14.7614 17 17 14.7614 17 12C17 9.23858 14.7614 7 12 7C9.23858 7 7 9.23858 7 12C7 14.7614 9.23858 17 12 17Z" fill="#60A5FA" />
              </svg>
              <span style={styles.logoText}>{BRANDING.HEADER_LOGO_TEXT}</span>
            </div>
            <p style={styles.brandDesc}>
              Combining AI curriculum planning with domain expert validation to teach the skills that actually matter in industry.
            </p>
            <div style={styles.socialRow}>
              <a href="https://github.com" style={styles.socialIcon} aria-label="GitHub">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" /></svg>
              </a>
              <a href="https://twitter.com" style={styles.socialIcon} aria-label="Twitter">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" /></svg>
              </a>
              <a href="https://linkedin.com" style={styles.socialIcon} aria-label="LinkedIn">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect x="2" y="9" width="4" height="12" /><circle cx="4" cy="4" r="2" /></svg>
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div style={styles.linksCol}>
            <h4 style={styles.colTitle}>Product</h4>
            <ul style={styles.linkList}>
              <li>
                <a href="#" onClick={(e) => { e.preventDefault(); if(setActivePage) setActivePage('home'); window.scrollTo(0,0); }} style={styles.link}>
                  Home
                </a>
              </li>
              <li><a href="#courses" onClick={(e) => { if(setActivePage) { e.preventDefault(); setActivePage('home'); setTimeout(()=>window.location.hash='#courses', 100); } }} style={styles.link}>Courses Catalog</a></li>
              <li><a href="#faq" onClick={(e) => { e.preventDefault(); if(setActivePage) setActivePage('faq'); window.scrollTo(0,0); }} style={styles.link}>FAQ</a></li>
              <li><a href="#feedback" onClick={(e) => { e.preventDefault(); if(setActivePage) setActivePage('feedback'); window.scrollTo(0,0); }} style={styles.link}>Feedback</a></li>
            </ul>
          </div>



          {/* Subscription Form */}
          <div style={styles.subscribeCol}>
            <h4 style={styles.colTitle}>Stay Updated</h4>
            <p style={styles.subscribeDesc}>Subscribe to receive notifications when new curricula are expert-validated.</p>

            {subscribed ? (
              <div style={styles.successBox}>
                <CheckCircle size={16} color="#10b981" />
                <span style={styles.successText}>Successfully subscribed!</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} style={styles.form}>
                <div style={styles.inputWrapper}>
                  <Mail size={16} style={styles.mailIcon} />
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={styles.input}
                    className="form-input"
                  />
                  <button type="submit" style={styles.submitBtn} aria-label="Subscribe">
                    <Send size={14} />
                  </button>
                </div>
                {error && <span style={styles.errorText}>{error}</span>}
              </form>
            )}
          </div>
        </div>

        {/* Bottom Banner */}
        <div style={styles.bottomBanner}>
          <p style={styles.copyright}>
            {BRANDING.FOOTER_TEXT} | Powered by <a href="https://datavex.ai/" target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }} onMouseOver={(e) => e.target.style.color = '#fff'} onMouseOut={(e) => e.target.style.color = 'inherit'}>DataVex</a>
          </p>
          <div style={styles.bottomLinks}>
            <button
              onClick={() => setIsPrivacyOpen(true)}
              style={{ ...styles.bottomLink, background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', padding: 0 }}
            >
              Privacy Policy
            </button>
            <button
              onClick={() => setIsTermsOpen(true)}
              style={{ ...styles.bottomLink, background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', padding: 0 }}
            >
              Terms of Service
            </button>
          </div>
        </div>
      </div>

      <PrivacyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
      <TermsModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />
    </footer>
  );
}

const styles = {
  footer: {
    backgroundColor: '#0a0a0a',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    padding: '5rem 0 3rem 0',
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4rem',
  },
  brandCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  logoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  logoText: {
    fontFamily: 'var(--font-heading)',
    fontSize: '1.2rem',
    fontWeight: '800',
    color: '#ffffff',
  },
  brandDesc: {
    fontSize: '0.875rem',
    color: '#a1a1aa',
    lineHeight: '1.6',
    maxWidth: '300px',
  },
  socialRow: {
    display: 'flex',
    gap: '1rem',
    marginTop: '0.5rem',
  },
  socialIcon: {
    color: '#a1a1aa',
    transition: 'color var(--transition-fast)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.5rem',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '50%',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    cursor: 'pointer',
    ':hover': {
      color: '#fff',
    },
  },
  linksCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  colTitle: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#ffffff',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  linkList: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  link: {
    color: '#a1a1aa',
    textDecoration: 'none',
    fontSize: '0.875rem',
    transition: 'color var(--transition-fast)',
    cursor: 'pointer',
    ':hover': {
      color: '#fff',
    },
  },
  subscribeCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  subscribeDesc: {
    fontSize: '0.875rem',
    color: '#a1a1aa',
    lineHeight: '1.5',
    maxWidth: '300px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  mailIcon: {
    position: 'absolute',
    left: '1rem',
    color: '#64748b',
  },
  input: {
    width: '100%',
    paddingLeft: '2.5rem',
    paddingRight: '3rem',
    borderRadius: '9999px',
  },
  submitBtn: {
    position: 'absolute',
    right: '0.25rem',
    background: 'var(--color-accent-blue)',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s',
    ':hover': {
      background: 'var(--color-accent-sky)',
    },
  },
  errorText: {
    fontSize: '0.75rem',
    color: '#ef4444',
  },
  successBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    borderRadius: '9999px',
    padding: '0.5rem 1rem',
    fontSize: '0.85rem',
    color: '#10b981',
  },
  successText: {
    fontWeight: '500',
  },
  bottomBanner: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    paddingTop: '2rem',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  copyright: {
    fontSize: '0.8rem',
    color: '#71717a',
  },
  bottomLinks: {
    display: 'flex',
    gap: '1.5rem',
  },
  bottomLink: {
    fontSize: '0.8rem',
    color: '#71717a',
    textDecoration: 'none',
    transition: 'color var(--transition-fast)',
    ':hover': {
      color: '#fff',
    },
  },
};

// Add social icon & links hover effect
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.innerHTML = `
    footer a:hover {
      color: #ffffff !important;
    }
  `;
  document.head.appendChild(style);
}
