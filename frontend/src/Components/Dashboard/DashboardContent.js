import React, { useState, useEffect } from 'react';
import { Play, Award, Clock, TrendingUp, Sparkles, RefreshCw } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis
} from 'recharts';
import useDynamicGreeting from '../../utils/useDynamicGreeting';

const activityData = [
  { name: 'W1', hours: 2 },
  { name: 'W2', hours: 4 },
  { name: 'W3', hours: 3 },
  { name: 'W4', hours: 8 },
  { name: 'W5', hours: 6 },
  { name: 'W6', hours: 9 },
  { name: 'W7', hours: 7 },
  { name: 'W8', hours: 10 },
];

const skillData = [
  { subject: 'React', A: 90, fullMark: 100 },
  { subject: 'Node.js', A: 80, fullMark: 100 },
  { subject: 'Python', A: 65, fullMark: 100 },
  { subject: 'ML/AI', A: 40, fullMark: 100 },
  { subject: 'DevOps', A: 70, fullMark: 100 },
  { subject: 'Sys. Design', A: 85, fullMark: 100 },
];

const DashboardContent = ({ user, onStartCourse }) => {
  const greeting = useDynamicGreeting();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completedCourses, setCompletedCourses] = useState([]);
  const [progressTick, setProgressTick] = useState(0);

  useEffect(() => {
    const handleProgressChange = () => {
      const saved = JSON.parse(localStorage.getItem('sf_completed_courses') || '[]');
      setCompletedCourses(saved);
      setProgressTick(t => t + 1);
    };
    handleProgressChange();
    window.addEventListener('progress_updated', handleProgressChange);
    window.addEventListener('storage', handleProgressChange);
    return () => {
      window.removeEventListener('progress_updated', handleProgressChange);
      window.removeEventListener('storage', handleProgressChange);
    };
  }, []);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const url = `${process.env.REACT_APP_API_URL}/api/courses`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setCourses(data);
        }
      } catch (err) {
        console.error("Error fetching dashboard courses:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  const enrolledCourses = JSON.parse(localStorage.getItem('sf_enrolled_courses') || '[]');
  const continueLearningCourses = [...courses]
    .filter(c => !completedCourses.includes(c.id))
    .sort((a, b) => {
      const progA = JSON.parse(localStorage.getItem(`sf_progress_${a.id}`) || '[]').length;
      const progB = JSON.parse(localStorage.getItem(`sf_progress_${b.id}`) || '[]').length;
      if (progB !== progA) return progB - progA;
      const enrA = enrolledCourses.includes(a.id) ? 1 : 0;
      const enrB = enrolledCourses.includes(b.id) ? 1 : 0;
      return enrB - enrA;
    })
    .slice(0, 3);
  const aiRecommended = courses.filter(c => c.is_ai_generated).slice(0, 3);
  
  const enrolledCount = courses.length;
  const completedCount = courses.filter(c => c.is_expert_validated).length;
  const totalHours = courses.reduce((acc, c) => acc + c.hours, 0);

  const progressPercent = user?.weekly_goal_hours 
    ? Math.min(100, (user.weekly_progress_hours / user.weekly_goal_hours) * 100) 
    : 0;

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 no-scrollbar">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (2/3 width on LG) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Welcome Banner */}
          <div className="relative bg-gradient-to-br from-navy-800 to-navy-900 rounded-2xl p-8 text-white overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white opacity-5 rounded-full blur-2xl"></div>
            <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-coral opacity-10 rounded-full blur-2xl"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold text-blue-200 mb-4 backdrop-blur-sm border border-white/10">
                  <span>🔥</span> {user?.streak || 0}-day streak!
                </div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">{greeting.text}, {user?.name?.split(' ')[0] || 'Alex'} {greeting.emoji}</h1>
                <p className="text-blue-100 font-light max-w-md">You're making steady progress through your learning paths. Keep it up!</p>
                
                <div className="mt-6 max-w-sm">
                  <div className="flex justify-between text-xs font-medium text-blue-200 mb-2">
                    <span>Weekly goal: {user?.weekly_goal_hours || 0} hrs</span>
                    <span>{user?.weekly_progress_hours || 0} / {user?.weekly_goal_hours || 0} hrs</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div className="bg-coral h-2 rounded-full transition-all duration-1000" style={{ width: `${progressPercent}%` }}></div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center bg-white/10 backdrop-blur-md border border-white/20 p-5 rounded-xl shrink-0">
                <div className="text-4xl font-bold text-white mb-1">{user?.xp_points?.toLocaleString() || 0}</div>
                <div className="text-xs text-blue-200 font-semibold uppercase tracking-wider mb-2">XP Points</div>
                <div className="text-xs font-bold text-navy-900 bg-blue-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                  🏆 Top 8% this month
                </div>
              </div>
            </div>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Play size={18} />
                </div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Courses Available</span>
              </div>
              <div className="text-2xl font-bold text-navy-900 mb-1">{enrolledCount}</div>
              <div className="text-xs text-slate-500 font-medium">Real-time catalog</div>
            </div>
            
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                  <Award size={18} />
                </div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Expert Approved</span>
              </div>
              <div className="text-2xl font-bold text-navy-900 mb-1">{completedCount}</div>
              <div className="text-xs text-slate-500 font-medium">Verified curriculum</div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                  <Clock size={18} />
                </div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Total Syllabus</span>
              </div>
              <div className="text-2xl font-bold text-navy-900 mb-1">{totalHours}h</div>
              <div className="text-xs text-slate-500 font-medium">Learning material</div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                  <TrendingUp size={18} />
                </div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Skill Score</span>
              </div>
              <div className="text-2xl font-bold text-navy-900 mb-1">840</div>
              <div className="text-xs text-emerald-500 font-medium">+45 points</div>
            </div>
          </div>

          {/* Continue Learning */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-navy-900">Continue Learning</h2>
              <span className="text-xs font-semibold text-slate-500 uppercase">In progress</span>
            </div>
            
            <div className="space-y-4">
              {loading ? (
                <div className="py-8 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                  <span className="text-sm font-medium">Loading...</span>
                </div>
              ) : continueLearningCourses.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm font-medium">
                  No courses currently in catalog.
                </div>
              ) : (
                continueLearningCourses.map(course => {
                  let totalLessons = Math.max(1, Math.round((course.hours || 10) / 2));
                  if (course.modules_data && Array.isArray(course.modules_data)) {
                    let count = 0;
                    course.modules_data.forEach(mod => {
                      if (mod.lessons) {
                        mod.lessons.forEach(l => {
                          count += (l.contents && l.contents.length > 0) ? l.contents.length : 1;
                        });
                      }
                    });
                    if (count > 0) totalLessons = count;
                  }

                  const savedProgress = JSON.parse(localStorage.getItem(`sf_progress_${course.id}`) || '[]');
                  const lessonsCompleted = Math.min(totalLessons, savedProgress.length);
                  const progress = totalLessons > 0 ? Math.min(100, Math.round((lessonsCompleted / totalLessons) * 100)) : 0;
                  return (
                    <div key={course.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-md transition-all group">
                      <div className="w-12 h-12 rounded-lg bg-navy-50 text-navy flex items-center justify-center shrink-0 group-hover:bg-navy group-hover:text-white transition-colors">
                        <Play fill="currentColor" size={20} />
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-navy-900 mb-1">{course.title}</div>
                        <div className="text-xs text-slate-500 font-medium mb-3">Module 1 · Lesson {lessonsCompleted} of {totalLessons}</div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-semibold text-slate-600">Progress</span>
                          <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-coral h-full rounded-full" style={{ width: `${progress}%` }}></div>
                          </div>
                          <span className="text-xs font-bold text-coral">{progress}%</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => onStartCourse && onStartCourse(course)}
                        className="mt-3 sm:mt-0 w-full sm:w-auto px-5 py-2.5 bg-slate-50 text-navy-900 font-semibold text-sm rounded-lg hover:bg-navy hover:text-white transition-colors border border-slate-200 hover:border-navy"
                      >
                        Resume
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Completed Courses */}
          {courses.filter(c => completedCourses.includes(c.id)).length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mt-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-navy-900">Completed Courses</h2>
                <span className="text-xs font-semibold text-slate-500 uppercase">Finished</span>
              </div>
              <div className="space-y-4">
                {courses.filter(c => completedCourses.includes(c.id)).map(course => (
                  <div key={course.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border border-emerald-100 bg-emerald-50/50 hover:border-emerald-200 transition-all">
                    <div className="w-12 h-12 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                      <Award size={20} />
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-navy-900 mb-1">{course.title}</div>
                      <div className="text-xs text-emerald-600 font-medium">100% Completed</div>
                    </div>
                    <button 
                      onClick={() => onStartCourse && onStartCourse(course)}
                      className="mt-3 sm:mt-0 w-full sm:w-auto px-5 py-2.5 bg-white text-emerald-700 font-semibold text-sm rounded-lg hover:bg-emerald-50 transition-colors border border-emerald-200"
                    >
                      Review Course
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Learning Activity Chart */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-navy-900">Learning Activity</h2>
              <span className="text-xs font-semibold text-slate-500 uppercase">Last 8 weeks</span>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activityData} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                  />
                  <Line type="monotone" dataKey="hours" stroke="#0B3D91" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: 'white' }} activeDot={{ r: 6, fill: '#E94E4E', stroke: 'none' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Right Column (1/3 width on LG) */}
        <div className="space-y-8">
          
          {/* AI Recommendations */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Sparkles size={16} />
              </div>
              <h2 className="text-base font-bold text-navy-900">AI Recommendations</h2>
            </div>
            
            <div className="space-y-4">
              {loading ? (
                <div className="text-slate-400 text-sm font-medium text-center py-4">Loading recommendations...</div>
              ) : aiRecommended.length === 0 ? (
                <div className="text-slate-400 text-sm font-medium text-center py-4">No AI recommendations available.</div>
              ) : (
                aiRecommended.map(course => {
                  const match = Math.round(course.rating * 20);
                  return (
                    <div key={course.id} className="flex justify-between items-center p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 cursor-pointer">
                      <span className="text-sm font-semibold text-slate-700 pr-4 line-clamp-2">{course.title}</span>
                      <span className="text-xs font-bold text-white bg-coral px-2 py-1 rounded-md shrink-0">{match}%</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Skill Radar */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-base font-bold text-navy-900 mb-6">Skill Radar</h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={skillData}>
                  <PolarGrid stroke="#f1f5f9" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} />
                  <Radar name="Skills" dataKey="A" stroke="#0B3D91" fill="#0B3D91" fillOpacity={0.15} />
                  <RechartsTooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}/>
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Upcoming Deadlines */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-base font-bold text-navy-900 mb-6">Upcoming Deadlines</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 border border-slate-100 rounded-xl bg-slate-50">
                <span className="text-sm font-semibold text-slate-700">React Final Project</span>
                <span className="text-xs font-bold text-coral">Jun 22</span>
              </div>
              <div className="flex justify-between items-center p-3 border border-slate-100 rounded-xl bg-slate-50">
                <span className="text-sm font-semibold text-slate-700">ML Quiz 3</span>
                <span className="text-xs font-bold text-slate-500">Jun 28</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default DashboardContent;
