import React, { useState, useEffect } from 'react';
import { Search, Filter, CheckCircle2, Clock, Sparkles, Star, Users, RefreshCw, Award, ArrowRight, Play } from 'lucide-react';
import CertificateModal from './CertificateModal';

const Marketplace = ({ user, onStartCourse, onCheckout, onGoToCart, onViewChange }) => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory] = useState("All");
  const [selectedLevel, setSelectedLevel] = useState("All levels");
  const [selectedStatus, setSelectedStatus] = useState("All status");
  const [completedCourses, setCompletedCourses] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [issuedCertificates, setIssuedCertificates] = useState([]);
  const [cartCourses, setCartCourses] = useState([]);
  const [expandedCourses, setExpandedCourses] = useState([]);
  const [paymentCourse, setPaymentCourse] = useState(null);
  const [certificateCourse, setCertificateCourse] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    const savedCompleted = JSON.parse(localStorage.getItem('sf_completed_courses') || '[]');
    setCompletedCourses(savedCompleted);
    const savedEnrolled = JSON.parse(localStorage.getItem('sf_enrolled_courses') || '[]');
    setEnrolledCourses(savedEnrolled);
    
    const updateCart = () => {
      const savedCart = JSON.parse(localStorage.getItem('sf_cart') || '[]');
      setCartCourses(savedCart);
    };
    updateCart();
    window.addEventListener('storage', updateCart);
    window.addEventListener('cart_updated', updateCart);
    
    if (user) {
      fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/certificates/${user.id}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setIssuedCertificates(data.map(c => c.course_id));
        })
        .catch(err => console.error(err));
    }

    return () => {
      window.removeEventListener('storage', updateCart);
      window.removeEventListener('cart_updated', updateCart);
    };
  }, [user]);

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handlePaymentSuccess = (course) => {
    const updatedEnrolled = [...enrolledCourses, course.id];
    setEnrolledCourses(updatedEnrolled);
    localStorage.setItem('sf_enrolled_courses', JSON.stringify(updatedEnrolled));
    window.dispatchEvent(new Event('progress_updated'));
    
    setPaymentCourse(null);
    
    if (onStartCourse) {
      onStartCourse(course);
    } else {
      showToast(`Enrolled and loading learning dashboard for "${course.title}"...`);
    }
  };

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (activeCategory && activeCategory !== 'All') {
        queryParams.append('category', activeCategory);
      }
      if (searchQuery) {
        queryParams.append('search', searchQuery);
      }

      const url = `${process.env.REACT_APP_API_URL}/api/courses?${queryParams.toString()}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setCourses(data);
      }
    } catch (err) {
      console.error("Error fetching marketplace courses:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [activeCategory, searchQuery]);

  const filteredCourses = courses.filter(course => {
    const level = course.hours > 35 ? "Advanced" : course.hours > 25 ? "Intermediate" : "Beginner";
    if (selectedLevel !== "All levels" && level !== selectedLevel) return false;

    const status = course.is_expert_validated ? "Expert Approved" : "Pending Review";
    if (selectedStatus !== "All status" && status !== selectedStatus) return false;

    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 no-scrollbar bg-slate-50">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy-900 mb-2">Course Marketplace</h1>
        <p className="text-slate-500">Browse {courses.length} AI-generated, expert-approved courses</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search any skill or topic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy focus:border-transparent transition-all shadow-sm"
          />
        </div>

        <div className="flex gap-4">
          <button 
            className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-navy transition-colors shadow-sm"
            onClick={fetchCourses}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Trending Banner */}
      {courses.length > 0 && (
        <div className="bg-gradient-to-r from-navy-900 to-navy-800 rounded-2xl p-6 md:p-8 mb-10 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-lg border border-navy-700">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold text-blue-200 mb-4 backdrop-blur-sm border border-white/10">
              <Sparkles size={14} /> AI Trending
            </div>
            <h2 className="text-2xl font-bold mb-2">{courses[0].title}</h2>
            <p className="text-blue-200 text-sm">
              By SkillForge AI • {courses[0].is_expert_validated ? 'Expert Reviewed' : 'Pending Review'} • {courses[0].students_count >= 1000 ? `${(courses[0].students_count / 1000).toFixed(1)}k` : courses[0].students_count} students
            </p>
          </div>
          <button 
            className="shrink-0 bg-coral hover:bg-coral-hover text-white px-6 py-3 rounded-xl font-medium transition-all shadow-md shadow-coral/20"
            onClick={() => onStartCourse && onStartCourse(courses[0])}
          >
            View Course
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-slate-400 flex flex-col items-center">
          <RefreshCw className="w-10 h-10 animate-spin mb-4 text-slate-300" />
          <p className="text-lg font-medium text-slate-500">Loading courses...</p>
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="py-20 text-center text-slate-400 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-xl font-bold text-navy-900 mb-2">No courses found</h3>
          <p className="text-slate-500">Try resetting filters or adjusting search queries.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredCourses.map(course => {
            const level = course.hours > 35 ? "Advanced" : course.hours > 25 ? "Intermediate" : "Beginner";
            const status = course.is_expert_validated ? "Expert Approved" : "Pending Review";
            const author = course.is_ai_generated ? "SkillForge AI" : "Domain Expert";
            const students = course.students_count >= 1000 ? `${(course.students_count / 1000).toFixed(1)}k` : `${course.students_count}`;
            const duration = `${course.hours}h`;

            return (
              <div key={course.id} className="flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                <div className="h-48 overflow-hidden relative">
                  <div className={`absolute top-4 left-4 flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold text-white backdrop-blur-md shadow-sm z-10 ${status === 'Pending Review' ? 'bg-amber-500/90' : 'bg-emerald-500/90'}`}>
                    {status === 'Pending Review' ? <Clock size={12} /> : <CheckCircle2 size={12} />}
                    {status}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-900/60 to-transparent z-0"></div>
                  <img 
                    src={course.image_url ? (course.image_url.startsWith('http') ? course.image_url : `${process.env.REACT_APP_API_URL || ''}${course.image_url}`) : 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'} 
                    alt={course.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
                    }}
                  />
                  
                  <div className="absolute bottom-4 left-4 z-10">
                     <span className="px-2.5 py-1 bg-white/20 backdrop-blur-md border border-white/20 rounded-md text-xs font-bold text-white">
                        {course.category}
                     </span>
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="text-xl font-bold text-navy-900 mb-1 leading-tight group-hover:text-coral transition-colors">{course.title}</h3>
                  <p className="text-slate-400 text-sm mb-4 font-medium">{author}</p>

                  <div className="flex items-center gap-4 text-sm text-slate-500 mb-6 font-medium">
                    <div className="flex items-center gap-1">
                      <Star className="text-amber-400 fill-amber-400" size={16} /> <span className="text-navy-900 font-bold">{course.rating}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users size={16} className="text-slate-400" /> {students}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={16} className="text-slate-400" /> {duration}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-5 border-t border-slate-100">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${level === 'Advanced' ? 'bg-purple-100 text-purple-700' : level === 'Intermediate' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {level}
                    </span>
                    
                    <div className="flex items-center gap-2">
                      {!enrolledCourses.includes(course.id) ? (
                        <>
                          {!expandedCourses.includes(course.id) ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedCourses(prev => [...prev, course.id]);
                              }}
                              className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-navy-900 rounded-lg text-sm font-semibold transition-colors"
                            >
                              Get Course
                            </button>
                          ) : (
                            <>
                              {cartCourses.some(c => c.id === course.id) ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (onGoToCart) onGoToCart();
                                  }}
                                  className="px-4 py-2 bg-navy text-white hover:bg-navy-800 rounded-lg text-sm font-semibold transition-colors"
                                >
                                  Go to Cart
                                </button>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const currentCart = JSON.parse(localStorage.getItem('sf_cart') || '[]');
                                    currentCart.push(course);
                                    localStorage.setItem('sf_cart', JSON.stringify(currentCart));
                                    window.dispatchEvent(new Event('cart_updated'));
                                    showToast(`"${course.title}" added to cart!`);
                                  }}
                                  className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-navy-900 rounded-lg text-sm font-semibold transition-colors"
                                >
                                  Add to Cart
                                </button>
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onCheckout) onCheckout(course);
                                  else setPaymentCourse(course);
                                }}
                                className="px-4 py-2 bg-coral hover:bg-coral-hover text-white rounded-lg text-sm font-semibold transition-colors shadow-sm shadow-coral/20"
                              >
                                Enroll Now
                              </button>
                            </>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (completedCourses.includes(course.id) && !issuedCertificates.includes(course.id)) {
                                setCertificateCourse(course);
                              } else if (issuedCertificates.includes(course.id) && onViewChange) {
                                onViewChange('certifications');
                              } else if (onStartCourse) {
                                onStartCourse(course);
                              } else {
                                showToast(`Loading learning dashboard for "${course.title}"...`);
                              }
                            }}
                            className={`px-4 py-2 flex items-center gap-2 rounded-lg text-sm font-semibold transition-colors ${
                              completedCourses.includes(course.id) && !issuedCertificates.includes(course.id)
                                ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-500/20' 
                                : issuedCertificates.includes(course.id)
                                ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm shadow-purple-500/20'
                                : (course.id <= 3 ? 'bg-navy hover:bg-navy-800 text-white shadow-sm' : 'bg-slate-100 hover:bg-slate-200 text-navy-900')
                            }`}
                          >
                            {completedCourses.includes(course.id) && !issuedCertificates.includes(course.id) ? (
                              <>
                                <Award size={16} /> Get Certificate
                              </>
                            ) : issuedCertificates.includes(course.id) ? (
                              <>
                                <Award size={16} /> View Certificate
                              </>
                            ) : (
                              <>
                                {course.id <= 3 ? "Continue Learning" : "Start Learning"}
                                <ArrowRight size={16} />
                              </>
                            )}
                          </button>
                          
                          {completedCourses.includes(course.id) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onStartCourse) {
                                  onStartCourse(course);
                                } else {
                                  showToast(`Re-opening learning dashboard for "${course.title}"...`);
                                }
                              }}
                              className="px-3 py-2 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors shadow-sm"
                              title="Watch Again"
                            >
                              <Play size={16} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-8 right-8 bg-navy-900 text-white px-6 py-4 rounded-xl shadow-xl flex items-center gap-3 z-50 animate-[slideUpFade_0.3s_ease-out]">
          <CheckCircle2 size={20} className="text-emerald-400" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {certificateCourse && (
        <CertificateModal 
          user={user}
          course={certificateCourse}
          onClose={() => setCertificateCourse(null)}
          onShowToast={setToastMessage}
          onSuccess={() => {
            setCertificateCourse(null);
            if (onViewChange) onViewChange('certifications');
          }}
        />
      )}
    </div>
  );
};

export default Marketplace;
