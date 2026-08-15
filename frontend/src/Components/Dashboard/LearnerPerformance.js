import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Award, CheckCircle, AlertCircle, Search, RefreshCw, 
  ChevronRight, BookOpen, Clock, Zap, Flame, ExternalLink, X, 
  MessageSquare, ShieldCheck, Check, LayoutGrid, List, BarChart3, HelpCircle
} from 'lucide-react';
import './LearnerPerformance.css';

const LearnerPerformance = ({ user, embedded = false }) => {
  const [learners, setLearners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
  const [selectedLearner, setSelectedLearner] = useState(null);
  const [expertNotes, setExpertNotes] = useState({});
  const [noteInput, setNoteInput] = useState('');
  const [noteSuccess, setNoteSuccess] = useState(false);

  const fetchLearnersPerformance = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/expert/learners-performance`);
      const token = localStorage.getItem('sf_token');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      
      const res = await fetch(url.toString(), { headers });
      if (res.ok) {
        const data = await res.json();
        setLearners(data || []);
      } else {
        throw new Error("Failed to fetch learner assessment performance");
      }
    } catch (err) {
      console.error("Error fetching learner performance:", err);
      setError("Unable to load live assessment data. Please check connection and retry.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLearnersPerformance();
    // Load saved expert notes from localStorage
    const savedNotes = localStorage.getItem('sf_expert_assessment_notes');
    if (savedNotes) {
      try { setExpertNotes(JSON.parse(savedNotes)); } catch (e) {}
    }
  }, []);

  const handleSaveNote = (learnerId, courseId) => {
    if (!noteInput.trim()) return;
    const key = `${learnerId}_${courseId}`;
    const updated = { ...expertNotes, [key]: { text: noteInput, date: new Date().toLocaleDateString(), expert: user?.name || 'Expert Reviewer' } };
    setExpertNotes(updated);
    localStorage.setItem('sf_expert_assessment_notes', JSON.stringify(updated));
    setNoteInput('');
    setNoteSuccess(true);
    setTimeout(() => setNoteSuccess(false), 3000);
  };

  // Get unique list of all courses across learners for dropdown
  const allCoursesList = useMemo(() => {
    const courseMap = new Map();
    learners.forEach(l => {
      l.courses_performance?.forEach(cp => {
        if (!courseMap.has(cp.course_title)) {
          courseMap.set(cp.course_title, cp.course_id);
        }
      });
    });
    return Array.from(courseMap.entries()).map(([title, id]) => ({ id, title }));
  }, [learners]);

  // Filter learners based on search, course, and assessment status
  const filteredLearners = useMemo(() => {
    return learners.filter(l => {
      const matchesSearch = searchQuery === '' || 
        l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.courses_performance?.some(cp => cp.course_title.toLowerCase().includes(searchQuery.toLowerCase()));
        
      const matchesCourse = courseFilter === 'all' || 
        l.courses_performance?.some(cp => cp.course_title === courseFilter);
        
      const matchesStatus = statusFilter === 'all' ||
        l.courses_performance?.some(cp => {
          if (statusFilter === 'passed') return cp.assessment.status === 'passed';
          if (statusFilter === 'in_progress') return cp.assessment.status === 'in_progress';
          if (statusFilter === 'retake_required') return cp.assessment.status === 'retake_required';
          return true;
        });
        
      return matchesSearch && matchesCourse && matchesStatus;
    });
  }, [learners, searchQuery, courseFilter, statusFilter]);

  // Calculate summary metrics
  const metrics = useMemo(() => {
    const total = learners.length;
    let totalCerts = 0;
    let totalRetakes = 0;
    let sumPassRate = 0;
    
    learners.forEach(l => {
      totalCerts += l.completed_assessments || 0;
      l.courses_performance?.forEach(cp => {
        if (cp.assessment.status === 'retake_required') totalRetakes++;
      });
      const rateNum = parseInt(l.overall_pass_rate) || 0;
      sumPassRate += rateNum;
    });
    
    const avgRate = total > 0 ? Math.round(sumPassRate / total) : 0;
    return { total, avgRate, totalCerts, totalRetakes };
  }, [learners]);

  const getStatusBadge = (status, score) => {
    switch (status) {
      case 'passed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle size={13} className="text-emerald-600" />
            Passed ({score}%)
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock size={13} className="text-amber-600" />
            In Progress ({score}%)
          </span>
        );
      case 'retake_required':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-coral-100 text-coral-800 border border-coral-200" style={{ backgroundColor: '#fee2e2', color: '#991b1b', borderColor: '#fecaca' }}>
            <AlertCircle size={13} className="text-coral-600" />
            Retake Needed ({score}%)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            Not Started
          </span>
        );
    }
  };

  return (
    <div className={`learner-performance-container flex-1 bg-slate-50 overflow-y-auto ${embedded ? 'py-2' : 'p-6 md:p-8'} no-scrollbar`}>
      <div className="max-w-7xl mx-auto w-full flex flex-col gap-8">
        
        {/* Header Title Section (hidden if embedded with tabs above, or shown cleanly) */}
        {!embedded && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-100 text-purple-600 rounded-2xl">
                  <BarChart3 size={26} />
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-navy-900 tracking-tight">
                  Learner Course & Assessment Hub
                </h1>
              </div>
              <p className="text-slate-500 font-medium text-sm md:text-base ml-12">
                Real-time tracking of learner curriculum mastery, quiz scores, and verified certifications.
              </p>
            </div>
            <button
              onClick={fetchLearnersPerformance}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-all self-start md:self-center shadow-sm hover:shadow"
            >
              <RefreshCw size={18} className={loading ? "animate-spin text-purple-600" : ""} />
              <span>Refresh Data</span>
            </button>
          </div>
        )}

        {error && (
          <div className="p-4 bg-coral-50 border border-coral-200 text-coral-700 rounded-2xl text-sm font-bold flex items-center gap-3 shadow-sm">
            <AlertCircle size={20} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 4 Stat Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <div className="stat-card-gradient-purple p-5 rounded-2xl stat-card-hover flex items-center justify-between shadow-sm">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-purple-700 mb-1">Total Learners Tracked</p>
              <h3 className="text-3xl font-extrabold text-navy-900">{metrics.total}</h3>
              <p className="text-xs text-slate-600 font-medium mt-1">Across all active curricula</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/80 shadow-sm flex items-center justify-center text-purple-600">
              <Users size={24} />
            </div>
          </div>

          <div className="stat-card-gradient-emerald p-5 rounded-2xl stat-card-hover flex items-center justify-between shadow-sm">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-1">Avg Assessment Pass Rate</p>
              <h3 className="text-3xl font-extrabold text-navy-900">{metrics.avgRate}%</h3>
              <p className="text-xs text-slate-600 font-medium mt-1">Target threshold: ≥60%</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/80 shadow-sm flex items-center justify-center text-emerald-600">
              <Award size={24} />
            </div>
          </div>

          <div className="stat-card-gradient-blue p-5 rounded-2xl stat-card-hover flex items-center justify-between shadow-sm">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-1">Verified Certifications</p>
              <h3 className="text-3xl font-extrabold text-navy-900">{metrics.totalCerts}</h3>
              <p className="text-xs text-slate-600 font-medium mt-1">100% course & assessment mastery</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/80 shadow-sm flex items-center justify-center text-blue-600">
              <CheckCircle size={24} />
            </div>
          </div>

          <div className="stat-card-gradient-amber p-5 rounded-2xl stat-card-hover flex items-center justify-between shadow-sm">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">Retakes / Attention Needed</p>
              <h3 className="text-3xl font-extrabold text-navy-900">{metrics.totalRetakes}</h3>
              <p className="text-xs text-slate-600 font-medium mt-1">Assessments under passing score</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/80 shadow-sm flex items-center justify-center text-amber-600">
              <AlertCircle size={24} />
            </div>
          </div>
        </div>

        {/* Search, Filter & View Toggle Bar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
          
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search learners by name, email, or course..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Course Filter Dropdown */}
            <div className="relative">
              <select
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 cursor-pointer"
              >
                <option value="all">📚 All Enrolled Courses</option>
                {allCoursesList.map(c => (
                  <option key={c.id} value={c.title}>📘 {c.title}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Status Filter Pills & View Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setStatusFilter('all')}
                className={`filter-pill ${statusFilter === 'all' ? 'active' : ''}`}
              >
                <span>All Statuses</span>
              </button>
              <button
                onClick={() => setStatusFilter('passed')}
                className={`filter-pill ${statusFilter === 'passed' ? 'active-passed' : ''}`}
              >
                <CheckCircle size={14} />
                <span>Passed</span>
              </button>
              <button
                onClick={() => setStatusFilter('in_progress')}
                className={`filter-pill ${statusFilter === 'in_progress' ? 'active-progress' : ''}`}
              >
                <Clock size={14} />
                <span>In Progress</span>
              </button>
              <button
                onClick={() => setStatusFilter('retake_required')}
                className={`filter-pill ${statusFilter === 'retake_required' ? 'active-retake' : ''}`}
              >
                <AlertCircle size={14} />
                <span>Retakes</span>
              </button>
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/60 shrink-0 ml-auto">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                  viewMode === 'table' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
                title="Table View"
              >
                <List size={16} />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                  viewMode === 'grid' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
                title="Card Grid View"
              >
                <LayoutGrid size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area: Loading / Empty / Table / Grid */}
        {loading ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-16 flex flex-col items-center justify-center text-center gap-4 shadow-sm min-h-[350px]">
            <div className="w-14 h-14 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center animate-spin">
              <RefreshCw size={28} />
            </div>
            <p className="text-slate-600 font-bold text-lg">Loading live learner assessment analytics...</p>
            <p className="text-slate-400 text-sm">Aggregating quiz performance and certification verification records.</p>
          </div>
        ) : filteredLearners.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-16 flex flex-col items-center justify-center text-center gap-3 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-2">
              <Users size={32} />
            </div>
            <h3 className="text-xl font-bold text-navy-900">No Learners Match Filters</h3>
            <p className="text-slate-500 text-sm max-w-md">Try clearing your search query or switching the course and status filters to see all learner performance records.</p>
            <button
              onClick={() => { setSearchQuery(''); setCourseFilter('all'); setStatusFilter('all'); }}
              className="mt-3 px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-xl transition-all shadow-md"
            >
              Reset All Filters
            </button>
          </div>
        ) : viewMode === 'table' ? (
          /* Table View */
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-4 px-6">Learner Profile</th>
                    <th className="py-4 px-6">Curriculum Mastery</th>
                    <th className="py-4 px-6">Assessment Pass Rate</th>
                    <th className="py-4 px-6">Engagement & XP</th>
                    <th className="py-4 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-medium">
                  {filteredLearners.map(l => (
                    <tr 
                      key={l.learner_id} 
                      onClick={() => setSelectedLearner(l)}
                      className="learner-row cursor-pointer"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <img 
                            src={l.avatar_url} 
                            alt={l.name} 
                            className="w-11 h-11 rounded-2xl object-cover border border-slate-200 shadow-sm shrink-0" 
                          />
                          <div>
                            <div className="font-bold text-navy-900 flex items-center gap-2">
                              <span>{l.name}</span>
                              {l.streak > 15 && (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800">
                                  <Flame size={10} className="text-amber-500 fill-amber-500" />
                                  Top Learner
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">{l.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-700">{l.total_courses} Enrolled</span>
                            <span className="text-xs text-slate-400">•</span>
                            <span className="text-xs font-bold text-emerald-600">{l.completed_assessments} Certified</span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {l.courses_performance?.map((cp, idx) => (
                              <span 
                                key={idx} 
                                className={`w-2.5 h-2.5 rounded-full ${
                                  cp.assessment.status === 'passed' ? 'bg-emerald-500' :
                                  cp.assessment.status === 'in_progress' ? 'bg-amber-400' : 'bg-red-500'
                                }`}
                                title={`${cp.course_title}: ${cp.assessment.status}`}
                              />
                            ))}
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-24 bg-slate-100 h-2.5 rounded-full overflow-hidden shrink-0">
                            <div 
                              className={`h-full rounded-full progress-bar-fill ${
                                parseInt(l.overall_pass_rate) >= 80 ? 'bg-emerald-500' :
                                parseInt(l.overall_pass_rate) >= 60 ? 'bg-amber-500' : 'bg-coral-500'
                              }`}
                              style={{ width: l.overall_pass_rate }}
                            />
                          </div>
                          <span className="font-extrabold text-navy-900 text-sm">{l.overall_pass_rate}</span>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5 text-xs font-bold bg-purple-50 text-purple-700 px-2.5 py-1 rounded-lg border border-purple-100">
                            <Zap size={14} className="text-purple-600 fill-purple-600" />
                            <span>{l.xp_points} XP</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs font-semibold text-slate-600">
                            <Clock size={14} className="text-slate-400" />
                            <span>{l.weekly_progress_hours}h / wk</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setSelectedLearner(l); }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-navy hover:text-white text-slate-700 font-bold text-xs transition-all shadow-sm"
                        >
                          <span>Assessment Report</span>
                          <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Card Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLearners.map(l => (
              <div 
                key={l.learner_id}
                onClick={() => setSelectedLearner(l)}
                className="bg-white rounded-3xl border border-slate-200/80 p-6 stat-card-hover cursor-pointer flex flex-col justify-between gap-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img 
                      src={l.avatar_url} 
                      alt={l.name} 
                      className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shadow-sm" 
                    />
                    <div>
                      <h4 className="font-bold text-navy-900 leading-tight">{l.name}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">{l.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                    <Flame size={12} className="text-amber-500 fill-amber-500" />
                    <span>{l.streak}d</span>
                  </div>
                </div>

                <div className="space-y-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-600">
                    <span>Overall Pass Rate</span>
                    <span className="text-navy-900 font-extrabold">{l.overall_pass_rate}</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full progress-bar-fill"
                      style={{ width: l.overall_pass_rate }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-500 pt-1">
                    <span>Enrolled: <b>{l.total_courses}</b> courses</span>
                    <span>Certified: <b className="text-emerald-600">{l.completed_assessments}</b></span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1 text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100">
                    <Zap size={13} className="fill-purple-600 text-purple-600" />
                    <span>{l.xp_points} XP</span>
                  </div>
                  <button className="text-xs font-bold text-navy-900 hover:text-purple-600 flex items-center gap-1 transition-colors">
                    <span>View Full Breakdown</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Slide-over Modal Drawer for Detailed Assessment Report */}
      {selectedLearner && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-navy-900/50 backdrop-blur-sm modal-overlay-fade">
          <div className="bg-white w-full max-w-3xl h-full shadow-2xl flex flex-col overflow-hidden modal-content-slide">
            
            {/* Modal Header */}
            <div className="p-6 md:p-8 bg-slate-900 text-white flex items-start justify-between gap-4 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-4">
                <img 
                  src={selectedLearner.avatar_url} 
                  alt={selectedLearner.name} 
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-purple-400 shadow-md shrink-0" 
                />
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-2xl font-extrabold text-white">{selectedLearner.name}</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      ID: #{selectedLearner.learner_id}
                    </span>
                  </div>
                  <p className="text-slate-300 text-sm mt-0.5">{selectedLearner.email}</p>
                  <div className="flex items-center gap-4 mt-3 text-xs font-semibold text-slate-300">
                    <span className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-lg">
                      <Flame size={14} className="text-amber-400 fill-amber-400" />
                      {selectedLearner.streak} Day Streak
                    </span>
                    <span className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-lg">
                      <Zap size={14} className="text-purple-400 fill-purple-400" />
                      {selectedLearner.xp_points} XP Total
                    </span>
                    <span className="flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-lg">
                      <Clock size={14} className="text-blue-400" />
                      {selectedLearner.weekly_progress_hours} hrs/wk
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedLearner(null)}
                className="p-2 bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Scrollable Body: Course & Assessment Breakdown */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 bg-slate-50/50 custom-scrollbar">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-navy-900 text-lg flex items-center gap-2">
                  <BookOpen size={20} className="text-purple-600" />
                  <span>Enrolled Course & Quiz Performance ({selectedLearner.courses_performance?.length || 0})</span>
                </h3>
                <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm">
                  Overall Pass Rate: <b className="text-navy-900">{selectedLearner.overall_pass_rate}</b>
                </span>
              </div>

              <div className="space-y-6">
                {selectedLearner.courses_performance?.map((cp, idx) => {
                  const noteKey = `${selectedLearner.learner_id}_${cp.course_id}`;
                  const currentNote = expertNotes[noteKey];

                  return (
                    <div key={idx} className="assessment-card p-6 shadow-sm space-y-5">
                      
                      {/* Course Title & Status Banner */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                        <div>
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-purple-600 bg-purple-50 px-2.5 py-1 rounded-md border border-purple-100">
                            {cp.category}
                          </span>
                          <h4 className="text-lg font-extrabold text-navy-900 mt-2">{cp.course_title}</h4>
                        </div>
                        {getStatusBadge(cp.assessment.status, cp.assessment.score)}
                      </div>

                      {/* Course Completion & Progress bar */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs font-semibold text-slate-600">
                        <div>
                          <span className="text-slate-400 block mb-1">Course Completion</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-slate-200 h-2 rounded-full overflow-hidden">
                              <div className="bg-purple-600 h-full rounded-full" style={{ width: `${cp.progress_percentage}%` }} />
                            </div>
                            <span className="font-bold text-navy-900">{cp.progress_percentage}% ({cp.modules_completed})</span>
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-1">Time Invested</span>
                          <span className="font-bold text-navy-900 flex items-center gap-1">
                            <Clock size={13} className="text-slate-400" />
                            {cp.time_spent}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block mb-1">Last Active Date</span>
                          <span className="font-bold text-navy-900">{cp.last_active}</span>
                        </div>
                      </div>

                      {/* Assessment Quiz Breakdown */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                            <Award size={14} className="text-purple-600" />
                            <span>Individual Lesson Quiz Breakdown</span>
                          </h5>
                          <span className="text-xs font-medium text-slate-400">
                            Attempts: <b className="text-slate-700">{cp.assessment.attempts}</b> • Last: {cp.assessment.last_attempt_date}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          {cp.assessment.quiz_breakdown?.map((q, qIdx) => (
                            <div key={qIdx} className="p-3 bg-white border border-slate-200/80 rounded-xl flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-700 truncate mr-2" title={q.lesson}>{q.lesson}</span>
                              <span className={`font-extrabold px-2 py-0.5 rounded-md ${
                                q.score >= 60 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                              }`}>
                                {q.score}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Certificate & Verification Box */}
                      {cp.assessment.status === 'passed' && cp.assessment.certificate_id && (
                        <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold shadow-sm shrink-0">
                              <ShieldCheck size={20} />
                            </div>
                            <div>
                              <div className="text-xs font-extrabold text-emerald-900">Official Certification Awarded</div>
                              <div className="text-xs font-mono text-emerald-700 mt-0.5">ID: {cp.assessment.certificate_id}</div>
                            </div>
                          </div>
                          <a
                            href={`http://localhost:3000/verify/${cp.assessment.certificate_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm shrink-0"
                          >
                            <span>Verify Certificate</span>
                            <ExternalLink size={14} />
                          </a>
                        </div>
                      )}

                      {/* Expert Feedback Note Area */}
                      <div className="pt-4 border-t border-slate-100 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                            <MessageSquare size={14} className="text-purple-600" />
                            <span>Expert Validation & Feedback Note</span>
                          </span>
                          {currentNote && (
                            <span className="text-[10px] font-semibold text-slate-400">
                              Logged by {currentNote.expert} on {currentNote.date}
                            </span>
                          )}
                        </div>

                        {currentNote ? (
                          <div className="p-3.5 bg-purple-50/50 border border-purple-200/80 rounded-xl text-xs text-navy-900 font-medium flex justify-between items-start gap-2">
                            <p className="italic">"{currentNote.text}"</p>
                            <button
                              onClick={() => {
                                const copy = { ...expertNotes };
                                delete copy[noteKey];
                                setExpertNotes(copy);
                                localStorage.setItem('sf_expert_assessment_notes', JSON.stringify(copy));
                              }}
                              className="text-slate-400 hover:text-red-500 font-bold shrink-0 text-[11px]"
                              title="Delete Note"
                            >
                              Edit/Remove
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Add review feedback, flag for retake, or commend mastery..."
                              value={noteInput}
                              onChange={(e) => setNoteInput(e.target.value)}
                              className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveNote(selectedLearner.learner_id, cp.course_id); }}
                            />
                            <button
                              onClick={() => handleSaveNote(selectedLearner.learner_id, cp.course_id)}
                              className="px-4 py-2 bg-navy hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm shrink-0 flex items-center gap-1"
                            >
                              {noteSuccess ? <Check size={14} className="text-emerald-400" /> : <span>Save Note</span>}
                            </button>
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white border-t border-slate-200 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
                <HelpCircle size={14} className="text-slate-400" />
                <span>All assessment scores are cryptographically synced with SkillForge ledger.</span>
              </div>
              <button
                onClick={() => setSelectedLearner(null)}
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
              >
                Close Report
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default LearnerPerformance;
