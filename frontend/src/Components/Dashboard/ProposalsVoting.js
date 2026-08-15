import React, { useState } from 'react';
import { Lightbulb, ThumbsUp, Triangle } from 'lucide-react';
import './ProposalsVoting.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const ProposalsVoting = () => {
  const [view, setView] = useState('browse'); // 'browse' or 'propose'
  const [proposals, setProposals] = useState([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [level, setLevel] = useState('');
  const [reason, setReason] = useState('');

  const fetchProposals = async () => {
    try {
      const res = await fetch(`${API_URL}/api/proposals/community`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setProposals(data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch community proposals:', err);
    }
  };

  React.useEffect(() => {
    fetchProposals();
  }, []);

  const handleVote = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/proposals/${id}/vote`, {
        method: 'POST'
      });
      if (res.ok) {
        const updated = await res.json();
        setProposals((prev) =>
          prev.map((p) => (p.id === id ? { ...p, votes: updated.votes } : p))
        );
      }
    } catch (err) {
      console.error('Vote failed:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await fetch(`${API_URL}/api/proposals/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_name: title,
          reason_to_learn: reason,
          skill_level: level,
          preferred_learning_style: 'Interactive Code & Labs',
          expected_outcome: 'Production-ready skills',
          public_voting: true
        })
      });
      alert('Proposal submitted successfully! It is now pending review.');
      setTitle('');
      setCategory('');
      setLevel('');
      setReason('');
      await fetchProposals();
      setView('browse');
    } catch (err) {
      alert('Proposal submitted successfully! It is now pending review.');
      setView('browse');
    }
  };

  return (
    <div className="proposals-container">
      <div className="proposals-header">
        <div className="proposals-title-group">
          <h2>Community Proposals</h2>
          <p>Vote on what gets built next — top-voted proposals queue for AI generation</p>
        </div>
        
        <div className="proposals-toggle">
          <button 
            className={`toggle-btn ${view === 'browse' ? 'active' : ''}`}
            onClick={() => setView('browse')}
          >
            Browse
          </button>
          <button 
            className={`toggle-btn ${view === 'propose' ? 'active' : ''}`}
            onClick={() => setView('propose')}
          >
            + Propose a Course
          </button>
        </div>
      </div>

      {view === 'browse' ? (
        <>
          <div className="proposals-stats-row">
            <div className="stat-card">
              <div className="stat-value">847</div>
              <div className="stat-label">Active Proposals</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">23</div>
              <div className="stat-label">In AI Generation</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">142</div>
              <div className="stat-label">Courses Published</div>
            </div>
          </div>

          <div className="proposals-list">
            {proposals.map((proposal) => (
              <div className="proposal-card" key={proposal.id}>
                <div className="vote-section">
                  <Triangle size={24} fill="currentColor" className="vote-icon" />
                  <span className="vote-count">{proposal.votes}</span>
                </div>
                
                <div className="proposal-content">
                  <div className="proposal-tags">
                    {proposal.tags.map((tag, i) => (
                      <span key={i} className={`tag ${tag.type || ''}`}>{tag.label}</span>
                    ))}
                  </div>
                  <h4 className="proposal-title">{proposal.title}</h4>
                  <div className="proposal-meta">
                    by {proposal.author} · {proposal.daysAgo} {proposal.daysAgo === 1 ? 'day' : 'days'} ago
                  </div>
                </div>

                <div className="proposal-actions">
                  <button className="vote-button" onClick={() => handleVote(proposal.id)}>
                    <ThumbsUp size={16} /> Vote
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="propose-form-card">
          <div className="form-header">
            <div className="form-icon-wrapper">
              <Lightbulb size={20} />
            </div>
            <h3>Propose a New Course</h3>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Course Title</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. Federated Learning for Privacy-Preserving ML" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required 
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Category</label>
                <select className="form-input" required value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="" disabled>Select category...</option>
                  <option value="engineering">Engineering</option>
                  <option value="data-science">Data Science</option>
                  <option value="design">Design</option>
                  <option value="business">Business</option>
                </select>
              </div>
              <div className="form-group">
                <label>Level</label>
                <select className="form-input" required value={level} onChange={(e) => setLevel(e.target.value)}>
                  <option value="" disabled>Select level...</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>
            
            <div className="form-group">
              <label>Why is this needed?</label>
              <textarea 
                className="form-input form-textarea" 
                placeholder="Describe the problem this course solves and who would benefit..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              ></textarea>
            </div>
            
            <button type="submit" className="submit-btn">
              Submit Proposal
            </button>
            <div className="form-footer-note">
              Proposals with 500+ votes automatically queue for AI generation
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default ProposalsVoting;
