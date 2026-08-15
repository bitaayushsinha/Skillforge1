import React, { useState, useEffect } from 'react';
import { Heart, Reply, Clock } from 'lucide-react';

const Comment = ({ comment, allComments, onReply, onLike }) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');
  
  const replies = allComments.filter(c => c.parent_comment_id === comment.id);

  const handleReplySubmit = (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    onReply(comment.id, replyText);
    setReplyText('');
    setShowReplyForm(false);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.round((now - date) / (1000 * 60 * 60));
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.round(diffHours / 24)}d ago`;
  };

  return (
    <div className="mb-6 last:mb-0">
      <div className="flex gap-4">
        <img 
          src={comment.user_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.user_name)}&background=random`} 
          alt="avatar" 
          className="w-10 h-10 rounded-full shrink-0 border border-slate-200"
        />
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-sm font-bold text-navy-900">{comment.user_name}</span>
            <span className="flex items-center gap-1 text-xs text-slate-400 font-medium">
              <Clock size={12}/> {formatDate(comment.created_at)}
            </span>
          </div>
          
          <p className="text-sm text-slate-700 leading-relaxed mb-3">{comment.content}</p>
          
          <div className="flex items-center gap-4">
            <button className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-coral transition-colors" onClick={() => onLike(comment.id)}>
              <Heart size={14} className={comment.likes > 0 ? "text-coral fill-coral/20" : ""} /> {comment.likes}
            </button>
            <button className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-navy-900 transition-colors" onClick={() => setShowReplyForm(!showReplyForm)}>
              <Reply size={14} /> Reply
            </button>
          </div>
          
          {showReplyForm && (
            <form onSubmit={handleReplySubmit} className="flex gap-3 mt-4">
              <input 
                type="text" 
                placeholder="Write a reply..." 
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="flex-1 px-4 py-2 border border-slate-200 rounded-xl bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy focus:bg-white transition-all shadow-inner"
                autoFocus
              />
              <button 
                type="submit" 
                disabled={!replyText.trim()}
                className="px-5 py-2 bg-navy hover:bg-navy-800 text-white font-semibold text-sm rounded-xl disabled:opacity-50 transition-colors shadow-sm"
              >
                Post
              </button>
            </form>
          )}
        </div>
      </div>
      
      {replies.length > 0 && (
        <div className="pl-6 md:pl-10 ml-5 mt-6 border-l-2 border-slate-100 space-y-6">
          {replies.map(r => (
            <Comment 
              key={r.id} 
              comment={r} 
              allComments={allComments} 
              onReply={onReply} 
              onLike={onLike} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

const CommentsSection = ({ proposalId }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchComments = async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/community/proposals/${proposalId}/comments`);
      if (res.ok) {
        setComments(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [proposalId]);

  const handlePost = async (parentId, content) => {
    try {
      const token = localStorage.getItem('sf_token');
      const res = await fetch(`${process.env.REACT_APP_API_URL }/api/community/proposals/${proposalId}/comment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content, parent_comment_id: parentId })
      });
      if (res.ok) {
        const added = await res.json();
        setComments([...comments, added]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLike = async (commentId) => {
    try {
      const token = localStorage.getItem('sf_token');
      const res = await fetch(`${process.env.REACT_APP_API_URL }/api/community/comments/${commentId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setComments(comments.map(c => c.id === commentId ? { ...c, likes: data.likes } : c));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const rootComments = comments.filter(c => !c.parent_comment_id);

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-inner">
      <form 
        className="flex gap-4 mb-8" 
        onSubmit={(e) => { e.preventDefault(); if (newComment.trim()) { handlePost(null, newComment); setNewComment(''); } }}
      >
        <img 
          src={`https://ui-avatars.com/api/?name=Me&background=e2e8f0`} 
          alt="me" 
          className="w-10 h-10 rounded-full shrink-0 border border-slate-200"
        />
        <input 
          type="text" 
          placeholder="Add a public comment..." 
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="flex-1 px-5 py-3 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy transition-all shadow-sm"
        />
        <button 
          type="submit" 
          disabled={!newComment.trim()}
          className="px-6 py-3 bg-navy hover:bg-navy-800 text-white font-semibold text-sm rounded-xl disabled:opacity-50 transition-colors shadow-sm"
        >
          Post
        </button>
      </form>

      {loading ? (
        <div className="py-6 text-center text-slate-400 text-sm font-semibold">Loading comments...</div>
      ) : (
        <div className="space-y-6">
          {rootComments.length === 0 ? (
            <div className="text-center text-slate-400 text-sm font-medium py-4">No comments yet. Be the first to start the discussion!</div>
          ) : (
            rootComments.map(c => (
              <Comment 
                key={c.id} 
                comment={c} 
                allComments={comments} 
                onReply={handlePost} 
                onLike={handleLike} 
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default CommentsSection;
