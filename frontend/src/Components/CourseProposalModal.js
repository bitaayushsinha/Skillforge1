import React, { useState } from 'react';
import { X, Lightbulb, Send, ChevronDown } from 'lucide-react';

export default function CourseProposalModal({ isOpen, onClose, user }) {
  const [courseName, setCourseName] = useState('');
  const [reasonToLearn, setReasonToLearn] = useState('Career Growth');
  const [skillLevel, setSkillLevel] = useState('Beginner');
  const [preferredStyle, setPreferredStyle] = useState([]);
  const [expectedOutcome, setExpectedOutcome] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [publicVoting, setPublicVoting] = useState(false);

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleStyleChange = (style) => {
    if (preferredStyle.includes(style)) {
      setPreferredStyle(preferredStyle.filter(s => s !== style));
    } else {
      setPreferredStyle([...preferredStyle, style]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (preferredStyle.length === 0) {
      setError('Please select at least one learning style.');
      return;
    }

    setLoading(true);

    const payload = {
      course_name: courseName,
      reason_to_learn: reasonToLearn,
      skill_level: skillLevel,
      preferred_learning_style: JSON.stringify(preferredStyle),
      expected_outcome: expectedOutcome,
      additional_notes: additionalNotes || null,
      public_voting: publicVoting,
      learner_id: user ? user.id : null,
      learner_name: user ? user.name : null,
      profile_image: user && user.profile_image ? user.profile_image : null
    };

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL }/api/proposals/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to submit proposal.');
      }

      setSubmitted(true);
      setTimeout(() => {
        onClose();
        setSubmitted(false);
        // Reset form
        setCourseName('');
        setReasonToLearn('Career Growth');
        setSkillLevel('Beginner');
        setPreferredStyle([]);
        setExpectedOutcome('');
        setAdditionalNotes('');
        setPublicVoting(false);
      }, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const learningStyles = [
    'Video Lessons',
    'Hands-on Projects',
    'Live Mentoring',
    'Reading Materials',
    'Community Discussions'
  ];

  const reasons = [
    'Career Growth',
    'Build a Project',
    'Research',
    'Startup Idea',
    'College Work',
    'Personal Interest'
  ];

  return (
    <div 
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[1000] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-300 relative border border-white/20">
        
        {/* Header Background Decoration */}
        <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-br from-blue-50 via-indigo-50/50 to-white -z-10 rounded-t-[2rem]"></div>
        
        <div className="p-8 sm:p-10">
          <div className="flex justify-between items-start mb-8 gap-3">
            <div className="flex flex-col">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
                  <Lightbulb size={24} className="animate-pulse" />
                </div>
                <h2 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-navy-900 to-slate-700 tracking-tight">Suggest a Course</h2>
              </div>
              <p className="text-slate-500 text-sm font-medium pl-[3.75rem] max-w-[85%]">
                What skill or technology do you want to learn next? Our AI will craft a custom curriculum just for you.
              </p>
            </div>
            <button 
              onClick={onClose} 
              className="w-10 h-10 bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-full flex items-center justify-center transition-all shrink-0 border border-slate-100 shadow-sm"
            >
              <X size={20} />
            </button>
          </div>

          {error && (
            <div className="p-4 mb-8 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm font-semibold flex items-start gap-3">
              <div className="mt-0.5"><X size={16} /></div>
              {error}
            </div>
          )}

          {submitted ? (
            <div className="flex flex-col items-center justify-center py-16 text-center animate-in zoom-in duration-500">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/30 ring-8 ring-emerald-50">
                <Send size={40} className="ml-1" />
              </div>
              <h3 className="text-3xl font-extrabold text-navy-900 mb-3 tracking-tight">Thank You!</h3>
              <p className="text-slate-500 font-medium max-w-sm">We've received your suggestion. Our AI is brewing up something amazing for you!</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-7">
              
              <div className="flex flex-col gap-2.5 group">
                <label className="text-sm font-bold text-slate-700 tracking-wide group-focus-within:text-blue-600 transition-colors">Course Name <span className="text-coral">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Advanced Rust for Systems Programming"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  required
                  className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 shadow-sm hover:border-slate-300 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-7">
                <div className="flex flex-col gap-2.5 group">
                  <label className="text-sm font-bold text-slate-700 tracking-wide group-focus-within:text-blue-600 transition-colors">Reason to Learn <span className="text-coral">*</span></label>
                  <div className="relative">
                    <select 
                      value={reasonToLearn} 
                      onChange={(e) => setReasonToLearn(e.target.value)}
                      className="w-full pl-5 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 shadow-sm hover:border-slate-300 transition-all appearance-none cursor-pointer"
                    >
                      {reasons.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <ChevronDown size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-slate-600 transition-colors" />
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 group">
                  <label className="text-sm font-bold text-slate-700 tracking-wide group-focus-within:text-blue-600 transition-colors">Skill Level <span className="text-coral">*</span></label>
                  <div className="relative">
                    <select 
                      value={skillLevel} 
                      onChange={(e) => setSkillLevel(e.target.value)}
                      className="w-full pl-5 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 shadow-sm hover:border-slate-300 transition-all appearance-none cursor-pointer"
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                    <ChevronDown size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-slate-600 transition-colors" />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-sm font-bold text-slate-700 tracking-wide">Preferred Learning Style <span className="text-coral">*</span></label>
                <div className="flex flex-wrap gap-2.5">
                  {learningStyles.map(style => {
                    const isSelected = preferredStyle.includes(style);
                    return (
                      <button
                        key={style}
                        type="button"
                        onClick={() => handleStyleChange(style)}
                        className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                          isSelected 
                            ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm ring-1 ring-blue-500' 
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        {style}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-2.5 group">
                <label className="text-sm font-bold text-slate-700 tracking-wide group-focus-within:text-blue-600 transition-colors">Expected Outcome <span className="text-coral">*</span></label>
                <textarea
                  placeholder="What do you want to achieve by the end of this course?"
                  value={expectedOutcome}
                  onChange={(e) => setExpectedOutcome(e.target.value)}
                  required
                  rows={3}
                  className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 shadow-sm hover:border-slate-300 transition-all resize-y leading-relaxed"
                />
              </div>

              <div className="flex flex-col gap-2.5 group">
                <label className="text-sm font-bold text-slate-700 tracking-wide group-focus-within:text-blue-600 transition-colors">Additional Notes <span className="text-slate-400 font-medium text-xs ml-1">(optional)</span></label>
                <textarea
                  placeholder="Any specific topics, libraries, or tools you'd like included?"
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  rows={2}
                  className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 shadow-sm hover:border-slate-300 transition-all resize-y leading-relaxed"
                />
              </div>

              <div className="flex items-center gap-3 pt-4">
                <label className="flex items-center gap-3.5 text-sm font-bold text-slate-700 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input 
                      type="checkbox" 
                      checked={publicVoting}
                      onChange={(e) => setPublicVoting(e.target.checked)}
                      className="peer appearance-none w-6 h-6 bg-slate-100 border-2 border-slate-200 rounded-lg hover:border-blue-400 checked:bg-blue-600 checked:border-blue-600 transition-all cursor-pointer shadow-sm focus:ring-4 focus:ring-blue-500/20"
                    />
                    <svg className="absolute w-3.5 h-3.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="group-hover:text-blue-600 transition-colors">Allow public voting on this proposal</span>
                </label>
              </div>

              <div className="pt-8 border-t border-slate-100 mt-2">
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-2xl shadow-xl shadow-blue-500/25 transition-all hover:-translate-y-1 hover:shadow-blue-500/40 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-blue-500/25 flex items-center justify-center gap-2.5 text-[15px]"
                >
                  <Send size={20} className={loading ? 'animate-bounce' : ''} />
                  {loading ? 'Brewing your curriculum...' : 'Submit Suggestion'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
