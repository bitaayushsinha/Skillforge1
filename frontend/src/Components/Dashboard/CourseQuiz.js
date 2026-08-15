import React, { useState, useEffect } from 'react';
import { Brain, CheckCircle, XCircle, ArrowRight, Loader2, Sparkles } from 'lucide-react';

export default function CourseQuiz({ courseId, courseName, onComplete, onCancel }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [passed, setPassed] = useState(false);
  const [score, setScore] = useState(0);
  
  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('sf_token');
        const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/courses/${courseId}/quiz`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!res.ok) throw new Error('Failed to fetch quiz');
        const data = await res.json();
        if (data && data.length > 0) {
          setQuestions(data);
        } else {
          // If Groq fails or returns empty, auto-pass
          onComplete();
        }
      } catch (err) {
        console.error("Quiz generation error:", err);
        // Fallback: if generation fails, we still let them complete the course
        onComplete();
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [courseId, onComplete]);

  const handleSelectAnswer = (index) => {
    if (showResults) return;
    setSelectedAnswers({
      ...selectedAnswers,
      [currentQuestionIndex]: index
    });
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Calculate score
      let correct = 0;
      questions.forEach((q, i) => {
        if (selectedAnswers[i] === q.answer) correct++;
      });
      const isPassed = correct >= Math.ceil(questions.length * 0.6); // 60% to pass
      const percentage = Math.round((correct / questions.length) * 100);
      setScore(percentage);
      setPassed(isPassed);
      setShowResults(true);

      if (isPassed) {
        try {
          const userStr = localStorage.getItem('sf_user');
          const token = localStorage.getItem('sf_token');
          const user = userStr ? JSON.parse(userStr) : { id: 1 };
          fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/certificates/generate`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              user_id: user?.id || 1,
              course_id: courseId || 1,
              course_name: courseName || 'SkillForge Course',
              completion_percentage: 100,
              assessment_status: 'passed'
            })
          })
          .then(res => res.json())
          .then(data => console.log('Certificate generated automatically:', data))
          .catch(err => console.error('Failed to auto-generate certificate:', err));
        } catch (err) {
          console.error("Error initiating auto certificate generation:", err);
        }
      }
    }
  };

  const handleRetry = () => {
    const shuffledQs = questions.map(q => {
      if (!q.options) return q;
      const oldOptions = [...q.options];
      const correctStr = oldOptions[q.answer];
      
      const newOptions = [...oldOptions];
      for (let i = newOptions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newOptions[i], newOptions[j]] = [newOptions[j], newOptions[i]];
      }
      
      const newAnswerIdx = newOptions.indexOf(correctStr);
      return {
        ...q,
        options: newOptions,
        answer: newAnswerIdx
      };
    });

    for (let i = shuffledQs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledQs[i], shuffledQs[j]] = [shuffledQs[j], shuffledQs[i]];
    }

    setQuestions(shuffledQs);
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setShowResults(false);
    setPassed(false);
    setScore(0);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-12 text-center flex flex-col items-center justify-center animate-in fade-in duration-300 min-h-[400px]">
        <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 mb-6">
          <Brain size={32} className="animate-pulse" />
        </div>
        <h3 className="text-2xl font-bold text-navy-900 mb-2">Generating Final Quiz...</h3>
        <p className="text-slate-500 font-medium flex items-center justify-center gap-2">
          <Loader2 size={16} className="animate-spin text-blue-500" />
          Our AI is reading your course material to generate custom questions.
        </p>
      </div>
    );
  }

  if (questions.length === 0) return null;

  if (showResults) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-10 text-center animate-in zoom-in-95 duration-300 max-w-4xl mx-auto my-6">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${passed ? 'bg-emerald-50 text-emerald-500' : 'bg-coral-50 text-coral-500'}`}>
          {passed ? <CheckCircle size={40} /> : <XCircle size={40} />}
        </div>
        <h2 className="text-3xl font-bold text-navy-900 mb-3">{passed ? 'Congratulations!' : 'Keep Practicing'}</h2>
        
        <div className="flex justify-center mb-6">
          <div className={`px-6 py-2 rounded-2xl font-black text-3xl border-2 ${passed ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-coral-50 text-coral-600 border-coral-100'}`}>
            {score}%
          </div>
        </div>

        <p className="text-slate-500 font-medium mb-8 max-w-md mx-auto">
          {passed 
            ? "You've successfully demonstrated your understanding of the material. Your certificate is ready!" 
            : "You didn't quite pass the final assessment. Review the material and try again."}
        </p>
        
        <div className="flex gap-4 justify-center mb-10 flex-wrap">
          <button 
            onClick={handleRetry}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            <span>Retry Quiz</span>
          </button>
          {passed && (
            <button 
              onClick={onComplete}
              className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <Sparkles size={20} /> Claim Certificate
            </button>
          )}
          <button 
            onClick={onCancel}
            className="px-8 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
          >
            Back to Course
          </button>
        </div>

        {/* Final Assessment Answer Key & Review */}
        <div style={{ textAlign: 'left', borderTop: '2px solid #f1f5f9', paddingTop: '2.5rem', marginTop: '1.5rem' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', marginBottom: '1.5rem', textAlign: 'center' }}>
            Final Assessment Answer Key & Review
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {questions.map((q, qIndex) => {
              const userAns = selectedAnswers[qIndex];
              const correctAns = q.answer;
              const isQCorrect = userAns === correctAns;
              const isAnswered = userAns !== undefined;

              return (
                <div key={qIndex} style={{ padding: '2rem', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                    <h4 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1e293b', margin: 0, flex: 1 }}>
                      {qIndex + 1}. {q.question}
                    </h4>
                    <span style={{ 
                      padding: '0.4rem 0.85rem', 
                      borderRadius: '20px', 
                      fontSize: '0.85rem', 
                      fontWeight: '700', 
                      background: isAnswered ? (isQCorrect ? '#ecfdf5' : '#fef2f2') : '#f1f5f9',
                      color: isAnswered ? (isQCorrect ? '#065f46' : '#991b1b') : '#64748b',
                      border: `1px solid ${isAnswered ? (isQCorrect ? '#a7f3d0' : '#fecaca') : '#e2e8f0'}`,
                      marginLeft: '1rem',
                      whiteSpace: 'nowrap'
                    }}>
                      {isAnswered ? (isQCorrect ? '1 / 1 pts ✓' : '0 / 1 pts ✕') : '0 / 1 pts (Unanswered)'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {q.options && q.options.map((opt, optIndex) => {
                      const isSelectedOpt = userAns === optIndex;
                      const isCorrectOpt = optIndex === correctAns;
                      
                      let bg = '#fff';
                      let border = '2px solid #e2e8f0';
                      let color = '#334155';
                      let fontWeight = '500';
                      let badge = null;

                      if (isCorrectOpt) {
                        bg = '#ecfdf5';
                        border = '2px solid #10b981';
                        color = '#065f46';
                        fontWeight = '700';
                        badge = <span style={{ color: '#10b981', fontWeight: 'bold' }}>✓ Correct Answer</span>;
                      } else if (isSelectedOpt && !isCorrectOpt) {
                        bg = '#fef2f2';
                        border = '2px solid #ef4444';
                        color = '#991b1b';
                        fontWeight = '700';
                        badge = <span style={{ color: '#ef4444', fontWeight: 'bold' }}>✕ Your Answer</span>;
                      }

                      return (
                        <div key={optIndex} style={{
                          padding: '1rem 1.25rem',
                          background: bg,
                          border: border,
                          borderRadius: '12px',
                          color: color,
                          fontWeight: fontWeight,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '1rem'
                        }}>
                          <span style={{ flex: 1 }}>{opt}</span>
                          {badge}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQuestionIndex];
  const hasSelected = selectedAnswers[currentQuestionIndex] !== undefined;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 animate-in slide-in-from-bottom-4 duration-300 max-w-3xl mx-auto mt-8">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Brain size={20} />
          </div>
          <div>
            <h3 className="font-bold text-navy-900 text-lg">Final Assessment</h3>
            <p className="text-xs font-semibold text-slate-500">{courseName}</p>
          </div>
        </div>
        <div className="text-sm font-bold text-slate-400 bg-slate-50 px-4 py-2 rounded-full">
          Question {currentQuestionIndex + 1} of {questions.length}
        </div>
      </div>

      <div className="mb-8">
        <h4 className="text-xl font-bold text-slate-800 mb-6 leading-snug">{currentQ.question}</h4>
        <div className="flex flex-col gap-3">
          {currentQ.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleSelectAnswer(i)}
              className={`w-full text-left px-6 py-4 rounded-xl border-2 font-medium transition-all ${
                selectedAnswers[currentQuestionIndex] === i 
                  ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' 
                  : 'border-slate-100 bg-white hover:border-blue-200 hover:bg-slate-50 text-slate-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  selectedAnswers[currentQuestionIndex] === i ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
                }`}>
                  {selectedAnswers[currentQuestionIndex] === i && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                {opt}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-between items-center pt-6 border-t border-slate-100">
        <button 
          onClick={onCancel}
          className="text-slate-500 hover:text-slate-700 font-bold px-4 py-2"
        >
          Cancel
        </button>
        <button
          onClick={handleNext}
          disabled={!hasSelected}
          className="flex items-center gap-2 px-8 py-3 bg-navy hover:bg-navy-800 text-white font-bold rounded-xl shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {currentQuestionIndex === questions.length - 1 ? 'Finish' : 'Next Question'}
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
