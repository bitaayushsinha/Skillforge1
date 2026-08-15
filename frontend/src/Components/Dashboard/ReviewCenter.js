import React, { useState, useEffect } from 'react';
import { Sparkles, AlertTriangle, CheckCircle, XCircle, Clock, AlertCircle, RefreshCw, BarChart2, ArrowUp, ArrowDown, MessageSquare, Award, Edit2, Save, Filter, FileText, Check, X } from 'lucide-react';

const ReviewCenter = ({ user }) => {
  const [viewType, setViewType] = useState('proposals'); // 'proposals' or 'certificates'
  const [proposals, setProposals] = useState([]);
  const [certificateIssues, setCertificateIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectProposalId, setRejectProposalId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [reviewerFeedback, setReviewerFeedback] = useState('');
  const [rejecting, setRejecting] = useState(false);
  
  // States for inline editing certificate issues
  const [editingIssueId, setEditingIssueId] = useState(null);
  const [editForm, setEditForm] = useState({ learner_name: '', learner_email: '', course_name: '' });

  const rejectionReasonsList = [
    "Duplicate Course",
    "Unclear Proposal",
    "Insufficient Details",
    "Irrelevant Topic",
    "Unsafe Content",
    "Out of Scope",
    "Other"
  ];

  const fetchProposals = async () => {
    const token = localStorage.getItem('sf_token');
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';

    if (viewType === 'certificates') {
      setLoading(true);
      try {
        const res = await fetch(`${apiUrl}/api/reviewer/certificate-issues`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const issues = await res.json();
          setCertificateIssues(issues);
        } else {
          const issues = JSON.parse(localStorage.getItem('sf_certificate_issues') || '[]');
          setCertificateIssues(issues);
        }
      } catch (err) {
        const issues = JSON.parse(localStorage.getItem('sf_certificate_issues') || '[]');
        setCertificateIssues(issues);
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const url = `${apiUrl}/api/reviewer/proposals${activeTab !== 'all' ? `?status_filter=${activeTab}` : ''}`;

      
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem('sf_token');
          localStorage.removeItem('sf_user');
          window.location.reload();
          return;
        }
        throw new Error('Failed to fetch proposals');
      }
      
      const data = await res.json();
      setProposals(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, viewType]);

  const handleStatusUpdate = async (id, newStatus, extraPayload = {}) => {
    try {
      const token = localStorage.getItem('sf_token');
      const res = await fetch(`${process.env.REACT_APP_API_URL }/api/reviewer/proposals/${id}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus, ...extraPayload })
      });
      
      if (!res.ok) throw new Error('Failed to update status');
      
      // Refresh the list
      fetchProposals();
    } catch (err) {
      setError('Error updating status: ' + err.message);
    }
  };

  const openRejectModal = (id) => {
    setRejectProposalId(id);
    setRejectionReason('');
    setReviewerFeedback('');
    setRejectModalOpen(true);
  };

  const handleRejectSubmit = async () => {
    if (!rejectionReason) {
      setError("Please select a rejection reason.");
      setRejectModalOpen(false);
      return;
    }
    
    setRejecting(true);
    await handleStatusUpdate(rejectProposalId, 'rejected', {
      rejection_reason: rejectionReason,
      reviewer_feedback: reviewerFeedback
    });
    setRejecting(false);
    setRejectModalOpen(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Just now';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleEditIssue = (issue) => {
    setEditingIssueId(issue.id);
    setEditForm({
      learner_name: issue.learner_name,
      learner_email: issue.learner_email,
      course_name: issue.course_name
    });
  };

  const handleSaveIssue = async (id) => {
    const token = localStorage.getItem('sf_token');
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    try {
      await fetch(`${apiUrl}/api/reviewer/certificate-issues/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          learner_name: editForm.learner_name,
          learner_email: editForm.learner_email,
          course_name: editForm.course_name,
          status: 'resolved'
        })
      });
      await fetchProposals();
    } catch (err) {
      console.error('Failed to update certificate issue:', err);
    } finally {
      setEditingIssueId(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 no-scrollbar bg-slate-50 flex flex-col relative">
      <div className="max-w-6xl mx-auto w-full flex flex-col gap-6">
        
        {/* Header Section */}
        <div className="flex flex-col gap-6 mb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h1 className="text-3xl font-bold text-navy-900 leading-tight flex items-center gap-3">
              <CheckCircle className="text-blue-500" size={28} /> Review Center
            </h1>
            
            <div className="flex p-1 bg-slate-200/70 rounded-xl w-max">
              <button 
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewType === 'proposals' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500 hover:text-navy'}`}
                onClick={() => setViewType('proposals')}
              >
                Course Proposals
              </button>
              <button 
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewType === 'certificates' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500 hover:text-navy'}`}
                onClick={() => setViewType('certificates')}
              >
                Certificate Issues
              </button>
            </div>
          </div>
          
          {viewType === 'proposals' && (
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'pending', label: 'Pending' },
                { id: 'ai_flagged', label: 'AI Flagged' },
                { id: 'approved', label: 'Approved' },
                { id: 'rejected', label: 'Rejected' }
              ].map(tab => (
                <button 
                  key={tab.id}
                  className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                    activeTab === tab.id 
                      ? 'bg-blue-50 border-blue-200 text-blue-700' 
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-navy-900'
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="p-4 bg-coral-50 border border-coral-200 text-coral-600 rounded-xl text-sm font-bold flex items-center shadow-sm">
            {error}
          </div>
        )}
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <RefreshCw className="animate-spin mb-4" size={32} />
            <p className="font-medium">Loading content...</p>
          </div>
        ) : viewType === 'certificates' ? (
          certificateIssues.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm flex flex-col items-center justify-center">
              <CheckCircle size={56} className="text-emerald-300 mb-4" />
              <h3 className="text-xl font-bold text-navy-900 mb-2">No Certificate Issues!</h3>
              <p className="text-slate-500 font-medium max-w-sm">There are no reported issues with certificates. Everything is running smoothly.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {certificateIssues.map(issue => (
                <div key={issue.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col gap-5 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex flex-col">
                      <h3 className="text-lg font-bold text-navy-900 mb-2">Certificate Details Issue</h3>
                      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-widest">
                        <span className="flex items-center gap-1.5"><Award size={14} className="text-blue-500" /> {issue.course_name}</span>
                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                        <span className="flex items-center gap-1.5"><Clock size={14} /> {formatDate(issue.created_at)}</span>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-widest ${
                      issue.status === 'resolved' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      {issue.status}
                    </span>
                  </div>
                  
                  <div className="flex flex-col gap-4">
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                      <strong className="text-xs font-bold text-navy-900 uppercase tracking-widest block mb-2 flex items-center gap-2">
                        <FileText size={14} className="text-blue-500"/> Learner Note
                      </strong>
                      <p className="text-sm font-medium text-slate-600 leading-relaxed">
                        {issue.issue_description}
                      </p>
                    </div>
                    
                    {editingIssueId === issue.id ? (
                      <div className="flex flex-col gap-4 p-4 border border-blue-100 bg-blue-50/30 rounded-xl animate-in fade-in">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-navy-900">Learner Name</label>
                          <input 
                            type="text" 
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            value={editForm.learner_name}
                            onChange={(e) => setEditForm({...editForm, learner_name: e.target.value})}
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-navy-900">Learner Email</label>
                          <input 
                            type="email" 
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            value={editForm.learner_email}
                            onChange={(e) => setEditForm({...editForm, learner_email: e.target.value})}
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-navy-900">Course Name</label>
                          <input 
                            type="text" 
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            value={editForm.course_name}
                            onChange={(e) => setEditForm({...editForm, course_name: e.target.value})}
                          />
                        </div>
                        <div className="flex gap-3 mt-2">
                          <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors" onClick={() => handleSaveIssue(issue.id)}>
                            <Save size={16} /> Save & Resolve
                          </button>
                          <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-lg transition-colors" onClick={() => setEditingIssueId(null)}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-[100px_1fr] gap-y-3 gap-x-2 text-sm">
                          <span className="font-semibold text-slate-400">Learner:</span>
                          <span className="font-medium text-navy-900">{issue.learner_name}</span>
                          <span className="font-semibold text-slate-400">Email:</span>
                          <span className="font-medium text-navy-900">{issue.learner_email}</span>
                          <span className="font-semibold text-slate-400">Course:</span>
                          <span className="font-medium text-navy-900">{issue.course_name}</span>
                        </div>
                        
                        {issue.status !== 'resolved' && (
                          <div className="pt-4 border-t border-slate-100">
                            <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border-2 border-slate-200 hover:border-blue-200 hover:bg-blue-50 text-navy-900 text-sm font-bold rounded-xl transition-all" onClick={() => handleEditIssue(issue)}>
                              <Edit2 size={16} className="text-blue-500" /> Edit Details & Resolve
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : proposals.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm flex flex-col items-center justify-center">
            <CheckCircle size={56} className="text-emerald-300 mb-4" />
            <h3 className="text-xl font-bold text-navy-900 mb-2">All caught up!</h3>
            <p className="text-slate-500 font-medium max-w-sm">There are no proposals in this category awaiting review.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {proposals.map(p => (
              <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col gap-6 hover:shadow-md transition-shadow">
                
                {/* Proposal Header */}
                <div className="flex justify-between items-start gap-4">
                  <div className="flex flex-col gap-3">
                    <h3 className="text-xl font-bold text-navy-900 leading-tight">{p.course_name}</h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                      <div className="flex items-center gap-1.5 bg-slate-100 pr-2 rounded-full">
                        <img 
                          src={p.profile_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.learner_name || 'Anonymous')}&background=random`} 
                          alt="Learner" 
                          className="w-5 h-5 rounded-full"
                        />
                        <span className="text-navy-900">{p.learner_name || 'Anonymous'}</span>
                      </div>
                      <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                      <span>{p.skill_level}</span>
                      <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                      <span className="flex items-center gap-1"><Clock size={12}/> {formatDate(p.created_at)}</span>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-widest shrink-0 ${
                    p.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                    p.status === 'ai_flagged' ? 'bg-orange-50 text-orange-600' :
                    p.status === 'approved' ? 'bg-emerald-50 text-emerald-600' :
                    'bg-coral-50 text-coral-600'
                  }`}>
                    {p.status.replace('_', ' ')}
                  </span>
                </div>

                {/* AI Analysis Box */}
                <div className="flex flex-col gap-4 p-5 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 border border-indigo-100 rounded-2xl">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-widest">
                    <Sparkles size={14} /> AI Analysis
                  </div>
                  <p className="text-sm font-medium text-slate-600 leading-relaxed">
                    {p.ai_summary || 'No AI summary generated for this proposal.'}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-3 mt-1">
                    <div className="bg-white border border-indigo-50 p-3 rounded-xl flex flex-col gap-1 shadow-sm">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category</span>
                      <span className="text-sm font-bold text-navy-900 truncate" title={p.ai_category}>{p.ai_category || 'N/A'}</span>
                    </div>
                    <div className="bg-white border border-indigo-50 p-3 rounded-xl flex flex-col gap-1 shadow-sm">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Risk Level</span>
                      <span className={`text-sm font-bold ${p.risk_level === 'High' ? 'text-coral' : p.risk_level === 'Medium' ? 'text-amber-500' : 'text-emerald-500'}`}>
                        {p.risk_level || 'N/A'}
                      </span>
                    </div>
                    <div className="bg-white border border-indigo-50 p-3 rounded-xl flex flex-col gap-1 shadow-sm">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Demand Score</span>
                      <span className="text-sm font-bold text-navy-900">{p.demand_score ? `${p.demand_score}/100` : 'N/A'}</span>
                    </div>
                    <div className="bg-white border border-indigo-50 p-3 rounded-xl flex flex-col gap-1 shadow-sm">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Duplicate</span>
                      <span className={`text-sm font-bold ${p.duplicate_status ? 'text-coral' : 'text-emerald-500'}`}>
                        {p.duplicate_status ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                  
                  {(p.status === 'ai_flagged' || p.duplicate_status) && (
                    <div className="mt-2 p-3 bg-coral-50 border border-coral-200 rounded-xl flex items-start gap-3">
                      <AlertTriangle size={16} className="text-coral shrink-0 mt-0.5" />
                      <p className="text-xs font-bold text-coral">
                        Warning: {p.ai_flagged_reason || (p.duplicate_status ? 'High similarity to existing courses.' : 'Flagged by AI.')}
                      </p>
                    </div>
                  )}
                </div>

                {/* Community Feedback */}
                {(p.public_voting || p.upvotes > 0 || p.downvotes > 0 || p.comment_count > 0) && (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-blue-500 uppercase tracking-widest">
                      <BarChart2 size={14} /> Community Feedback
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-bold border border-emerald-100">
                        <ArrowUp size={16} /> {p.upvotes}
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-coral-50 text-coral-700 rounded-lg text-sm font-bold border border-coral-100">
                        <ArrowDown size={16} /> {p.downvotes}
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-bold border border-blue-100">
                        <MessageSquare size={16} /> {p.comment_count}
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                {['pending', 'ai_flagged'].includes(p.status) && (
                  <div className="pt-5 border-t border-slate-100 mt-auto flex flex-col sm:flex-row gap-3">
                    <button 
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold rounded-xl transition-colors shadow-sm" 
                      onClick={() => handleStatusUpdate(p.id, 'approved')}
                    >
                      <Check size={16} /> Approve
                    </button>
                    <button 
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-700 text-sm font-bold rounded-xl transition-colors" 
                      onClick={() => handleStatusUpdate(p.id, 'changes_requested')}
                    >
                      <AlertCircle size={16} /> Needs Changes
                    </button>
                    <button 
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-coral-100 hover:bg-coral-200 text-coral-700 text-sm font-bold rounded-xl transition-colors" 
                      onClick={() => openRejectModal(p.id)}
                    >
                      <X size={16} /> Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 bg-navy-900/40 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6 gap-3">
              <div className="flex items-center gap-2 text-coral">
                <XCircle size={24} />
                <h3 className="text-xl font-bold text-navy-900">Reject Proposal</h3>
              </div>
              <button 
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors shrink-0" 
                onClick={() => setRejectModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-navy-900">Reason for Rejection <span className="text-coral">*</span></label>
                <select 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-coral/20 focus:border-coral transition-all appearance-none cursor-pointer"
                  value={rejectionReason} 
                  onChange={e => setRejectionReason(e.target.value)}
                >
                  <option value="">-- Select a reason --</option>
                  {rejectionReasonsList.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-navy-900">Reviewer Feedback <span className="text-slate-400 font-medium text-xs">(optional)</span></label>
                <textarea 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy transition-all resize-y" 
                  placeholder="Provide detailed feedback to help the learner improve their proposal..."
                  rows={4}
                  value={reviewerFeedback}
                  onChange={e => setReviewerFeedback(e.target.value)}
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <button 
                  className="flex-1 py-3 bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-xl transition-all" 
                  onClick={() => setRejectModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  className="flex-1 py-3 bg-coral hover:bg-coral-hover text-white text-sm font-bold rounded-xl shadow-sm transition-all disabled:opacity-50" 
                  onClick={handleRejectSubmit}
                  disabled={rejecting || !rejectionReason}
                >
                  {rejecting ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewCenter;
