import React from 'react';
import { ArrowRight, Clock, Users, BookOpen } from 'lucide-react';

const LandingCourses = ({ courses, activeCategory, setActiveCategory, searchQuery, setSearchQuery, onEnrollCourse }) => {
  // We'll show up to 6 courses on the landing page for this design
  const displayedCourses = courses.slice(0, 6);

  return (
    <section id="courses" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <span className="text-coral font-medium tracking-wider uppercase text-sm">Our Courses</span>
            <h2 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight text-navy-900">
              Find the right path for you
            </h2>
          </div>
          
          <div className="flex flex-col items-start md:items-end gap-4 w-full md:w-auto">
             <div className="flex overflow-x-auto bg-slate-100 p-1 rounded-lg w-full max-w-full">
                {['All', 'Software Engineering', 'AI & Machine Learning', 'Data Science & Databases'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                      activeCategory === cat 
                        ? 'bg-white text-navy-900 shadow-sm' 
                        : 'text-slate-500 hover:text-navy-900'
                    }`}
                  >
                    {cat === 'All' ? 'All Courses' : cat}
                  </button>
                ))}
             </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-10">
          <input
            type="text"
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-96 px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-navy focus:border-transparent transition-all"
          />
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {displayedCourses.map(course => (
            <div key={course.id} className="flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="h-48 overflow-hidden relative">
                {course.is_expert_validated && (
                  <span className="absolute top-4 right-4 bg-navy text-white text-xs font-semibold px-2 py-1 rounded">
                    Expert Validated
                  </span>
                )}
                <img 
                  src={course.image_url ? (course.image_url.startsWith('http') ? course.image_url : `${process.env.REACT_APP_API_URL || ''}${course.image_url}`) : 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'} 
                  alt={course.title} 
                  className="w-full h-full object-cover" 
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
                  }}
                />
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <h3 className="text-xl font-semibold text-navy-900 mb-2 tracking-tight">{course.title}</h3>
                <p className="text-slate-500 text-base mb-6 flex-1 line-clamp-3">
                  {course.description}
                </p>
                
                <div className="flex items-center gap-4 text-sm text-slate-500 mb-6">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" /> {course.hours} Hours
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" /> {course.students_count?.toLocaleString()} Students
                  </div>
                </div>

                <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
                  <span className="text-2xl font-semibold text-navy-900">
                    ⭐ {course.rating}
                  </span>
                  <button 
                    onClick={() => onEnrollCourse(course)}
                    className="text-coral font-medium hover:text-coral-hover flex items-center gap-1 group"
                  >
                    View Details
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LandingCourses;
