import React, { useState, useEffect, useCallback } from 'react';
import { Star, ThumbsUp, MessageSquare, Filter, Search, Send, CheckCircle, X, ChevronDown } from 'lucide-react';

const API = process.env.REACT_APP_API_URL;

// ─── Star Rating Component ───────────────────────────────────────────────────
function StarRating({ value, onChange, size = 24, readOnly = false }) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;

  return (
    <div className="flex gap-1 items-center">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => !readOnly && onChange && onChange(star)}
          onMouseEnter={() => !readOnly && setHovered(star)}
          onMouseLeave={() => !readOnly && setHovered(0)}
          className={`bg-transparent border-none p-0.5 transition-transform duration-150 ${readOnly ? 'cursor-default' : 'cursor-pointer'} ${!readOnly && hovered >= star ? 'scale-125' : 'scale-100'}`}
          aria-label={`${star} star`}
        >
          <Star
            size={size}
            className={`${display >= star ? 'fill-amber-500 text-amber-500' : 'fill-transparent text-slate-300'}`}
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  );
}

// ─── Rating Bar ──────────────────────────────────────────────────────────────
function RatingBar({ label, count, total }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3 text-xs font-medium">
      <span className="text-slate-500 min-w-[14px] text-right">{label}</span>
      <Star size={12} className="fill-amber-500 text-amber-500" />
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div 
          className="h-full bg-amber-500 rounded-full transition-all duration-700" 
          style={{ width: `${pct}%` }} 
        />
      </div>
      <span className="text-slate-500 min-w-[24px]">{count}</span>
    </div>
  );
}

// ─── Feedback Card ───────────────────────────────────────────────────────────
function FeedbackCard({ feedback, onHelpful }) {
  const [markedHelpful, setMarkedHelpful] = useState(false);
  const [helpfulCount, setHelpfulCount] = useState(feedback.helpful_count);
  const [loading, setLoading] = useState(false);

  const handleHelpful = async () => {
    if (markedHelpful || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/feedback/${feedback.id}/helpful`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setHelpfulCount(data.helpful_count);
        setMarkedHelpful(true);
        onHelpful && onHelpful(feedback.id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const initials = feedback.user_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const avatarColor = `hsl(${(feedback.user_name.charCodeAt(0) * 31) % 360}, 65%, 55%)`;

  const dateStr = new Date(feedback.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col group">
      <div className="flex justify-between items-start mb-4 gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0" 
            style={{ backgroundColor: avatarColor }}
          >
            {initials}
          </div>
          <div>
            <div className="font-bold text-sm text-navy-900">{feedback.user_name}</div>
            <div className="text-xs font-semibold text-slate-400 mt-0.5">{dateStr}</div>
          </div>
        </div>
        <StarRating value={feedback.rating} readOnly size={16} />
      </div>

      {feedback.title && (
        <div className="font-bold text-base text-navy-900 mb-2 leading-tight">{feedback.title}</div>
      )}
      <p className="text-sm text-slate-600 leading-relaxed mb-6 flex-1">
        {feedback.comment}
      </p>

      <div className="flex justify-between items-center flex-wrap gap-2 pt-4 border-t border-slate-100">
        <span className="inline-block px-3 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-lg border border-blue-100 max-w-[200px] truncate">
          {feedback.course_title || `Course #${feedback.course_id}`}
        </span>
        <button
          onClick={handleHelpful}
          disabled={markedHelpful || loading}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            markedHelpful 
              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
              : 'bg-slate-50 text-slate-500 hover:text-navy-900 border border-slate-200 hover:border-slate-300'
          }`}
        >
          <ThumbsUp size={14} className={markedHelpful ? 'fill-emerald-200' : ''} />
          {markedHelpful ? 'Helpful!' : 'Helpful'} · {helpfulCount}
        </button>
      </div>
    </div>
  );
}

// ─── Write Feedback Modal ────────────────────────────────────────────────────
function WriteFeedbackModal({ courses, user, onClose, onSubmit }) {
  const [courseId, setCourseId] = useState('');
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!courseId) { setError('Please select a course.'); return; }
    if (!rating) { setError('Please give a star rating.'); return; }
    if (comment.trim().length < 10) { setError('Comment must be at least 10 characters.'); return; }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('sf_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API}/api/feedback`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ course_id: parseInt(courseId), rating, title: title.trim() || null, comment: comment.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Submission failed.');
      }
      const data = await res.json();
      onSubmit(data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-navy-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-8 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex justify-between items-start mb-8 gap-3">
          <div>
            <h2 className="text-2xl font-bold text-navy-900 mb-1">Share Your Experience</h2>
            <p className="text-sm font-semibold text-slate-500">Help other learners by reviewing a course</p>
          </div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full flex items-center justify-center transition-colors shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-navy-900">Course *</label>
            <div className="relative">
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy appearance-none cursor-pointer transition-all shadow-inner"
                required
              >
                <option value="">— Select a course —</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
              <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-navy-900">Rating *</label>
            <div className="flex items-center gap-4">
              <StarRating value={rating} onChange={setRating} size={32} />
              {rating > 0 && (
                <span className="text-sm font-bold text-amber-500">
                  {['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'][rating]}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-navy-900">Review Title <span className="text-slate-400 font-medium text-xs">(optional)</span></label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Incredible deep-dive into the topic"
              maxLength={120}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy transition-all shadow-inner"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold text-navy-900">Your Review *</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share what you liked or didn't like about this course. Your feedback helps other learners make better decisions."
              rows={5}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy transition-all shadow-inner resize-y leading-relaxed"
              required
            />
            <div className="text-right text-xs font-semibold text-slate-400 mt-1">
              {comment.length} / 1000
            </div>
          </div>

          {error && (
            <div className="p-3 bg-coral-50 border border-coral-200 text-coral-600 rounded-xl text-sm font-bold">
              {error}
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3.5 bg-navy hover:bg-navy-800 text-white font-bold rounded-xl shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? 'Submitting…' : (
                <><Send size={18} /> Submit Review</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main FeedbackPage ───────────────────────────────────────────────────────
export default function FeedbackPage({ user, onOpenAuth, insideDashboard = false }) {
  const [courses, setCourses] = useState([]);
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch courses
  useEffect(() => {
    fetch(`${API}/api/courses`)
      .then((r) => r.json())
      .then(setCourses)
      .catch(console.error);
  }, []);

  // Fetch feedback
  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCourseId !== 'all') params.append('course_id', selectedCourseId);
      const res = await fetch(`${API}/api/feedback?${params}`);
      if (res.ok) {
        const data = await res.json();
        // Enrich with course title
        setFeedbackList(data.map((fb) => ({
          ...fb,
          course_title: courses.find((c) => c.id === fb.course_id)?.title || `Course #${fb.course_id}`,
        })));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [selectedCourseId, courses]);

  useEffect(() => {
    if (courses.length > 0 || selectedCourseId === 'all') fetchFeedback();
  }, [fetchFeedback]);

  const handleSubmitSuccess = (newFeedback) => {
    const enriched = {
      ...newFeedback,
      course_title: courses.find((c) => c.id === newFeedback.course_id)?.title || `Course #${newFeedback.course_id}`,
    };
    setFeedbackList((prev) => [enriched, ...prev]);
    setSuccessMsg('🎉 Your review has been published! Thank you for sharing.');
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  // Compute aggregated stats for the selected course filter
  const filteredFeedback = feedbackList
    .filter((fb) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        fb.comment.toLowerCase().includes(q) ||
        (fb.title || '').toLowerCase().includes(q) ||
        fb.user_name.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at);
      if (sortBy === 'highest') return b.rating - a.rating;
      if (sortBy === 'lowest') return a.rating - b.rating;
      if (sortBy === 'helpful') return b.helpful_count - a.helpful_count;
      return 0;
    });

  const totalReviews = feedbackList.length;
  const avgRating = totalReviews > 0
    ? (feedbackList.reduce((s, fb) => s + fb.rating, 0) / totalReviews).toFixed(1)
    : 0;
  const ratingCounts = [5, 4, 3, 2, 1].map((r) => ({
    star: r,
    count: feedbackList.filter((fb) => fb.rating === r).length,
  }));

  const containerClass = insideDashboard 
    ? "flex-1 overflow-y-auto no-scrollbar bg-slate-50 flex flex-col relative"
    : "min-h-screen bg-slate-50 flex flex-col relative";

  return (
    <div className={containerClass}>
      
      {/* ── Hero Banner ─────────────────────────────────── */}
      <section className={`bg-white border-b border-slate-200 ${insideDashboard ? 'py-8 px-6 md:px-8' : 'pt-32 pb-16 px-6'}`}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-start justify-between gap-10">
          
          <div className="flex-1 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold border border-blue-100 mb-6 uppercase tracking-wider">
              <MessageSquare size={14} /> Community Reviews
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-navy-900 leading-tight mb-4">
              What Learners Are <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-400 pb-2">Saying</span>
            </h1>
            <p className="text-slate-500 text-lg font-medium leading-relaxed mb-8 max-w-xl">
              Real reviews from real learners. Discover what makes each course special — or help the community by sharing your own experience.
            </p>
            <button
              onClick={() => {
                if (user) setShowModal(true);
                else if (onOpenAuth) onOpenAuth();
              }}
              className="px-6 py-3.5 bg-navy hover:bg-navy-800 text-white font-bold rounded-xl shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 flex items-center gap-2 w-full sm:w-auto justify-center"
            >
              <MessageSquare size={18} />
              {user ? 'Write a Review' : 'Sign in to Review'}
            </button>
          </div>

          {/* Stats Summary */}
          {totalReviews > 0 && (
            <div className="w-full md:w-80 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 shrink-0 flex flex-col gap-6">
              <div className="flex flex-col items-center gap-2 pb-5 border-b border-slate-100">
                <span className="text-5xl font-bold text-navy-900 leading-none">{avgRating}</span>
                <StarRating value={Math.round(avgRating)} readOnly size={24} />
                <span className="text-sm font-semibold text-slate-400">{totalReviews} review{totalReviews !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex flex-col gap-3">
                {ratingCounts.map(({ star, count }) => (
                  <RatingBar key={star} label={star} count={count} total={totalReviews} />
                ))}
              </div>
            </div>
          )}
          
        </div>
      </section>

      {/* ── Success Toast ───────────────────────────────── */}
      {successMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white font-bold text-sm rounded-full shadow-lg shadow-emerald-500/30 z-50 animate-in slide-in-from-bottom-8 duration-300">
          <CheckCircle size={18} />
          {successMsg}
        </div>
      )}

      {/* ── Filters Bar ─────────────────────────────────── */}
      <section className={`bg-slate-50/80 backdrop-blur-md border-b border-slate-200 z-30 ${insideDashboard ? 'sticky top-0 py-4 px-6 md:px-8' : 'sticky top-16 py-4 px-6'}`}>
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-4">
          
          <div className="relative flex-1 w-full md:w-auto min-w-[240px]">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reviews…"
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy shadow-sm transition-all"
            />
          </div>

          <div className="flex gap-4 w-full md:w-auto flex-wrap sm:flex-nowrap">
            <div className="relative w-full sm:w-auto">
              <Filter size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full sm:min-w-[200px] pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy shadow-sm appearance-none cursor-pointer"
              >
                <option value="all">All Courses</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.title.length > 45 ? c.title.slice(0, 45) + '…' : c.title}</option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            <div className="relative w-full sm:w-auto">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full sm:min-w-[160px] pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy shadow-sm appearance-none cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="highest">Highest Rated</option>
                <option value="lowest">Lowest Rated</option>
                <option value="helpful">Most Helpful</option>
              </select>
              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
          
        </div>
      </section>

      {/* ── Reviews Grid ────────────────────────────────── */}
      <section className={`flex-1 ${insideDashboard ? 'p-6 md:p-8' : 'py-12 px-6'}`}>
        <div className="max-w-6xl mx-auto flex flex-col h-full">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-navy rounded-full animate-spin mb-4" />
              <p className="text-slate-500 font-semibold">Loading reviews…</p>
            </div>
          ) : filteredFeedback.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16 bg-white rounded-3xl border border-slate-100 shadow-sm text-center px-6">
              <div className="text-5xl mb-4">💬</div>
              <h3 className="text-xl font-bold text-navy-900 mb-2">
                {feedbackList.length === 0 ? 'No reviews yet' : 'No reviews match your search'}
              </h3>
              <p className="text-slate-500 font-medium mb-6 max-w-sm leading-relaxed">
                {feedbackList.length === 0
                  ? 'Be the first to share your experience with a course!'
                  : 'Try adjusting your search or filter criteria.'}
              </p>
              {feedbackList.length === 0 && (
                <button
                  className="px-6 py-3 bg-navy hover:bg-navy-800 text-white font-bold rounded-xl shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
                  onClick={() => user ? setShowModal(true) : onOpenAuth?.()}
                >
                  Write the First Review
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-6">
                <span className="text-slate-500 text-sm font-semibold">
                  Showing <strong className="text-navy-900">{filteredFeedback.length}</strong> review{filteredFeedback.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
                {filteredFeedback.map((fb) => (
                  <FeedbackCard key={fb.id} feedback={fb} />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── Write Feedback Modal ─────────────────────────── */}
      {showModal && (
        <WriteFeedbackModal
          courses={courses}
          user={user}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmitSuccess}
        />
      )}
    </div>
  );
}
