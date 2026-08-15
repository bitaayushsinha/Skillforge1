import React from 'react';
import { ArrowRight } from 'lucide-react';
import { BRANDING } from '../../config/branding';

const LandingHero = ({ stats, onStartFree, onBrowseCourses }) => {
  const activeLearners = stats?.find(s => s.key === 'active_learners')?.value || '15k+';
  const expertCourses = stats?.find(s => s.key === 'expert_courses')?.value || '120+';
  const domainExperts = stats?.find(s => s.key === 'domain_experts')?.value || '50+';
  const satisfactionRate = '98%';

  return (
    <section className="relative pt-32 pb-64 md:pb-40 lg:pt-48 lg:pb-48 overflow-hidden">
      {/* Background with Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=2940&auto=format&fit=crop" 
          alt="Students learning" 
          className="w-full h-full object-cover" 
          loading="eager" 
        />
        <div className="absolute inset-0 bg-navy-900/80 mix-blend-multiply"></div>
        <div className="bg-gradient-to-t from-navy-900 via-transparent to-transparent absolute top-0 right-0 bottom-0 left-0"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 mb-8">
          <span className="flex h-2 w-2 rounded-full bg-coral"></span>
          <span className="text-sm font-medium text-white tracking-wide uppercase">New term starting soon</span>
        </div>
        
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-semibold tracking-tight text-white mb-6 leading-[1.1]">
          {BRANDING.HERO_TITLE.split('with')[0]} with <br className="hidden md:block" />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-white">{BRANDING.HERO_TITLE.split('with')[1] || 'Confidence & Clarity'}</span>
        </h1>
        
        <p className="mt-4 text-xl text-slate-200 max-w-2xl mx-auto mb-10 font-light">
          {BRANDING.HERO_SUBTITLE}
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button 
            onClick={onStartFree} 
            className="bg-coral hover:bg-coral-hover text-white px-8 py-4 rounded-xl text-lg font-medium transition-all shadow-xl shadow-coral/20 flex items-center justify-center gap-2"
          >
            Start Learning Today
            <ArrowRight className="w-5 h-5" />
          </button>
          <button 
            onClick={onBrowseCourses} 
            className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-8 py-4 rounded-xl text-lg font-medium transition-all flex items-center justify-center"
          >
            Explore Courses
          </button>
        </div>
      </div>

      {/* Stats Bar - Aligned to bottom absolute */}
      <div className="absolute bottom-0 w-full z-20 border-t border-white/10 bg-navy-900/40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
            <div>
              <div className="text-3xl font-semibold tracking-tight">{activeLearners}</div>
              <div className="text-sm text-slate-300 font-medium mt-1">Active Students</div>
            </div>
            <div>
              <div className="text-3xl font-semibold tracking-tight">{satisfactionRate}</div>
              <div className="text-sm text-slate-300 font-medium mt-1">Satisfaction Rate</div>
            </div>
            <div>
              <div className="text-3xl font-semibold tracking-tight">{expertCourses}</div>
              <div className="text-sm text-slate-300 font-medium mt-1">Expert Courses</div>
            </div>
            <div>
              <div className="text-3xl font-semibold tracking-tight">{domainExperts}</div>
              <div className="text-sm text-slate-300 font-medium mt-1">Domain Experts</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingHero;
