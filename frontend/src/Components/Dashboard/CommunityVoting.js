import React, { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, MessageSquare, Clock, BarChart2, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import CommentsSection from './CommentsSection';

const CommunityVoting = () => {
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('trending');
  const [category, setCategory] = useState('');
  const [activeCommentId, setActiveCommentId] = useState(null);

  const fetchProposals = async () => {
    try {
      setLoading(true);
      const url = new URL(`${process.env.REACT_APP_API_URL }/api/community/proposals`);
      url.searchParams.append('sort_by', sortBy);
      if (category) url.searchParams.append('category', category);
      
      const token = localStorage.getItem('sf_token');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(url.toString(), { headers });
      if (res.ok) {
        const data = await res.json();
        setProposals(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, [sortBy, category]);

  const handleVote = async (id, type) => {
    try {
      const token = localStorage.getItem('sf_token');
      const res = await fetch(`${process.env.REACT_APP_API_URL }/api/community/proposals/${id}/vote`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ vote_type: type })
      });
      
      if (res.ok) {
        const updated = await res.json();
        setProposals(prev => prev.map(p => p.id === id ? updated : p));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Just now';
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.round((now - date) / (1000 * 60 * 60));
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.round(diffHours / 24)}d ago`;
  };

  const CommunityPost = ({ p, handleVote, activeCommentId, setActiveCommentId }) => {
    const [showAI, setShowAI] = useState(false);

    const jobRelevance = p.risk_level === 'Low' ? 'High' : p.risk_level === 'Medium' ? 'Moderate' : 'Low';
    const marketDemand = p.demand_score >= 80 ? 'Strong' : p.demand_score >= 50 ? 'Moderate' : 'Low';

    return (
      <div className="mb-6">
        <div className="flex bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
          {/* Vote Gutter */}
          <div className="flex flex-col items-center justify-start py-4 px-3 bg-slate-50 border-r border-slate-100 shrink-0 w-16 gap-3">
            <button 
              className={`p-1.5 rounded-lg transition-colors ${p.user_vote === 'upvote' ? 'text-navy bg-navy-100' : 'text-slate-400 hover:text-navy hover:bg-slate-200'}`} 
              onClick={() => handleVote(p.id, 'upvote')}
            >
              <ArrowUp size={22} strokeWidth={p.user_vote === 'upvote' ? 3 : 2} />
            </button>
            <span className={`text-base font-bold ${p.user_vote === 'upvote' ? 'text-navy' : p.user_vote === 'downvote' ? 'text-coral' : 'text-slate-700'}`}>
              {p.upvotes - p.downvotes}
            </span>
            <button 
              className={`p-1.5 rounded-lg transition-colors ${p.user_vote === 'downvote' ? 'text-coral bg-coral-50' : 'text-slate-400 hover:text-coral hover:bg-slate-200'}`} 
              onClick={() => handleVote(p.id, 'downvote')}
            >
              <ArrowDown size={22} strokeWidth={p.user_vote === 'downvote' ? 3 : 2} />
            </button>
          </div>
          
          {/* Content */}
          <div className="p-6 flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <img className="w-8 h-8 rounded-full border border-slate-200" src={p.profile_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.learner_name || 'Anonymous')}&background=random`} alt="avatar" />
                <span className="text-sm font-bold text-navy-900">{p.learner_name || 'Anonymous Learner'}</span>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded uppercase tracking-wider text-[10px] font-bold border border-slate-200">
                  {p.skill_level}
                </span>
              </div>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                <Clock size={14} /> {formatDate(p.created_at)}
              </span>
            </div>
            
            <h3 className="text-xl font-bold text-navy-900 mb-3">{p.course_name}</h3>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {p.ai_category && (
                <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-semibold border border-blue-100">
                  {p.ai_category}
                </span>
              )}
              {p.demand_score !== null && (
                <span className="px-3 py-1 bg-coral-50 text-coral-600 rounded-lg text-xs font-semibold border border-coral-100">
                  Demand: {p.demand_score}/100
                </span>
              )}
            </div>
            
            {p.ai_summary && (
              <p className="text-slate-600 text-sm leading-relaxed mb-6">
                {p.ai_summary}
              </p>
            )}

            <div className="bg-slate-50 rounded-xl border border-slate-100 mb-4 overflow-hidden">
              <button 
                className="flex items-center justify-between w-full p-4 text-sm font-bold text-navy-900 hover:bg-slate-100 transition-colors" 
                onClick={() => setShowAI(!showAI)}
              >
                <span className="flex items-center gap-2">
                  <Sparkles size={16} className="text-purple-500" /> AI Insight
                </span>
                {showAI ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
              </button>
              
              {showAI && (
                <div className="p-4 pt-0 text-sm space-y-3">
                  <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                    <span className="font-semibold text-slate-600">Job relevance:</span> 
                    <span className="font-bold text-navy-900">{jobRelevance}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                    <span className="font-semibold text-slate-600">Market demand:</span> 
                    <span className="font-bold text-navy-900">{marketDemand} ({p.demand_score})</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                    <span className="font-semibold text-slate-600">Related skills:</span> 
                    <span className="font-bold text-navy-900">{p.ai_category}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                    <span className="font-semibold text-slate-600">Duplicate risk:</span> 
                    <span className={`font-bold ${p.duplicate_status ? 'text-coral' : 'text-emerald-500'}`}>
                      {p.duplicate_status ? 'High' : 'Low'}
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-6 mt-auto pt-4 border-t border-slate-100">
              <button 
                className={`flex items-center gap-2 text-sm font-semibold transition-colors ${activeCommentId === p.id ? 'text-navy-900' : 'text-slate-500 hover:text-navy-900'}`}
                onClick={() => setActiveCommentId(activeCommentId === p.id ? null : p.id)}
              >
                <MessageSquare size={18} /> {p.comment_count} Comments
              </button>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                <BarChart2 size={18} /> {p.upvotes} Upvotes · {p.downvotes} Downvotes
              </div>
            </div>
          </div>
        </div>
        
        {activeCommentId === p.id && (
          <div className="mt-4">
            <CommentsSection proposalId={p.id} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 no-scrollbar bg-slate-50">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col mb-8 gap-4">
          <h2 className="text-3xl font-bold text-navy-900">Community Feed</h2>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center p-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto no-scrollbar w-full sm:w-auto">
              {[
                { id: 'trending', label: 'Trending' },
                { id: 'newest', label: 'Newest' },
                { id: 'most_voted', label: 'Top Voted' },
                { id: 'most_discussed', label: 'Discussed' }
              ].map(tab => (
                <button 
                  key={tab.id}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    sortBy === tab.id 
                      ? 'bg-navy-50 text-navy-900 shadow-sm' 
                      : 'text-slate-600 hover:text-navy-900 hover:bg-slate-50'
                  }`}
                  onClick={() => setSortBy(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            
            <select 
              className="w-full sm:w-auto px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy cursor-pointer transition-all"
              value={category} 
              onChange={e => setCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              <option value="engineering">Engineering</option>
              <option value="data-science">Data Science</option>
              <option value="design">Design</option>
              <option value="business">Business</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col">
          {loading ? (
            <div className="py-20 text-center text-slate-400 flex flex-col items-center">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-navy rounded-full animate-spin mb-4" />
              <p className="text-lg font-medium text-slate-500">Loading feed...</p>
            </div>
          ) : proposals.length === 0 ? (
            <div className="py-20 text-center text-slate-400 bg-white rounded-2xl border border-slate-100 shadow-sm">
              <h3 className="text-xl font-bold text-navy-900 mb-2">No proposals found</h3>
              <p className="text-slate-500">Be the first to submit a proposal!</p>
            </div>
          ) : (
            proposals.map(p => (
              <CommunityPost 
                key={p.id} 
                p={p} 
                handleVote={handleVote} 
                activeCommentId={activeCommentId} 
                setActiveCommentId={setActiveCommentId} 
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CommunityVoting;
