import React, { useState, useEffect, useMemo } from 'react';
import { Play, CheckCircle2, FileText, ChevronDown, ChevronUp, Image, Video, HelpCircle } from 'lucide-react';
import './MyLearning.css';

import CourseQuiz from './CourseQuiz';

const MyLearning = ({ course: rawCourse, onBack, onComplete }) => {
  const [shuffledLessonsMap, setShuffledLessonsMap] = useState({});

  const course = useMemo(() => {
    if (!rawCourse || !rawCourse.modules_data) return rawCourse;
    const newModules = rawCourse.modules_data.map((mod, mIndex) => {
      if (!mod.lessons) return mod;
      let modHasQuiz = false;
      let lastLessonWithQuizIdx = -1;
      mod.lessons.forEach((l, lIdx) => {
        const checkLesson = shuffledLessonsMap[l.id || l.title] || l;
        if (checkLesson.contents && checkLesson.contents.some(c => c.type === 'quiz')) {
          modHasQuiz = true;
          lastLessonWithQuizIdx = lIdx;
        }
      });
      if (!modHasQuiz || lastLessonWithQuizIdx === -1) return mod;

      const newLessons = mod.lessons.map((lesson, lIdx) => {
        let baseLesson = shuffledLessonsMap[lesson.id || lesson.title] || lesson;
        if (lIdx === lastLessonWithQuizIdx) {
          const hasResultsAlready = baseLesson.contents && baseLesson.contents.some(c => c.type === 'module_results');
          if (hasResultsAlready) return baseLesson;
          return {
            ...baseLesson,
            contents: [
              ...(baseLesson.contents || []),
              {
                id: `mod_res_${mIndex}`,
                type: 'module_results',
                title: 'Assessment Score & Review',
                moduleIndex: mIndex,
                moduleTitle: mod.title
              }
            ]
          };
        }
        return baseLesson;
      });
      return { ...mod, lessons: newLessons };
    });
    return { ...rawCourse, modules_data: newModules };
  }, [rawCourse, shuffledLessonsMap]);

  const [activeLesson, setActiveLesson] = useState(null);
  const [activeContentIndex, setActiveContentIndex] = useState(0);
  const [expandedModules, setExpandedModules] = useState({});
  const [showQuiz, setShowQuiz] = useState(false);
  const [completedItems, setCompletedItems] = useState([]);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  
  useEffect(() => {
    if (course && course.modules_data && course.modules_data.length > 0) {
      setExpandedModules({ 0: true });
      const saved = JSON.parse(localStorage.getItem(`sf_progress_${course.id}`) || '[]');
      setCompletedItems(saved);
      const savedAnswers = JSON.parse(localStorage.getItem(`sf_answers_${course.id}`) || '{}');
      setSelectedAnswers(savedAnswers);

      const token = localStorage.getItem('sf_token');
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      if (token && course.id) {
        fetch(`${apiUrl}/api/learning/courses/${course.id}/progress`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data) {
              if (Array.isArray(data.completed_items)) setCompletedItems(data.completed_items);
              if (data.quiz_answers) setSelectedAnswers(data.quiz_answers);
            }
          })
          .catch(() => {});
      }

      for (const mod of course.modules_data) {
        if (mod.lessons && mod.lessons.length > 0) {
          setActiveLesson(mod.lessons[0]);
          setActiveContentIndex(0);
          return;
        }
      }
    } else {
      setActiveLesson(null);
      setCompletedItems([]);
      setSelectedAnswers({});
    }
  }, [course]);

  const toggleModule = (mIndex) => {
    setExpandedModules(prev => ({ ...prev, [mIndex]: !prev[mIndex] }));
  };

  if (!course) {
    return <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>No course selected. Please select a course from the Dashboard or Marketplace.</div>;
  }

  const hasModules = course.modules_data && course.modules_data.length > 0;

  const flattenedItems = [];
  if (course && course.modules_data) {
    course.modules_data.forEach((mod, mIndex) => {
      if (mod.lessons) {
        mod.lessons.forEach((lesson) => {
          if (lesson.contents && lesson.contents.length > 0) {
            lesson.contents.forEach((content, cIndex) => {
              flattenedItems.push({ moduleIndex: mIndex, lesson: lesson, content: content, contentIndex: cIndex });
            });
          } else {
            flattenedItems.push({ moduleIndex: mIndex, lesson: lesson, content: null, contentIndex: 0 });
          }
        });
      }
    });
  }
  
  const getItemId = (lesson, content, cIndex) => {
    if (!lesson) return '';
    return content ? `${lesson.id || lesson.title}_c${content.id || cIndex}` : `${lesson.id || lesson.title}_l0`;
  };

  const totalItems = flattenedItems.filter(item => item.content?.type !== 'module_results').length;
  const completedCount = completedItems.filter(id => !id.includes('mod_res_') && !id.includes('module_results')).length;
  const progressPercent = totalItems > 0 ? Math.min(100, Math.round((completedCount / totalItems) * 100)) : 0;

  const saveProgressToBackend = async (courseId, nextCompleted, nextAnswers) => {
    const token = localStorage.getItem('sf_token');
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    if (!token || !courseId) return;
    try {
      await fetch(`${apiUrl}/api/learning/courses/${courseId}/progress`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          completed_items: nextCompleted,
          quiz_answers: nextAnswers || selectedAnswers || {}
        })
      });
    } catch (err) {
      console.error('Failed to save progress to backend:', err);
    }
  };

  const markCurrentCompleted = () => {
    if (currentIndex >= 0 && currentIndex < flattenedItems.length) {
      const currentItem = flattenedItems[currentIndex];
      const itemId = getItemId(currentItem.lesson, currentItem.content, currentItem.contentIndex);
      if (itemId && !completedItems.includes(itemId)) {
        const nextCompleted = [...completedItems, itemId];
        setCompletedItems(nextCompleted);
        if (course && course.id) {
          localStorage.setItem(`sf_progress_${course.id}`, JSON.stringify(nextCompleted));
          saveProgressToBackend(course.id, nextCompleted, selectedAnswers);
          window.dispatchEvent(new Event('progress_updated'));
        }
      }
    }
  };

  const toggleItemCompletion = (lesson, content, cIndex) => {
    const itemId = getItemId(lesson, content, cIndex);
    if (!itemId) return;
    let nextCompleted;
    if (completedItems.includes(itemId)) {
      nextCompleted = completedItems.filter(id => id !== itemId);
    } else {
      nextCompleted = [...completedItems, itemId];
    }
    setCompletedItems(nextCompleted);
    if (course && course.id) {
      localStorage.setItem(`sf_progress_${course.id}`, JSON.stringify(nextCompleted));
      saveProgressToBackend(course.id, nextCompleted, selectedAnswers);
      window.dispatchEvent(new Event('progress_updated'));
    }
  };

  const retakeOrRejoinAssessment = (targetLesson) => {
    if (!targetLesson || !targetLesson.contents) return;

    const quizContents = [];
    const nonQuizBefore = [];
    const nonQuizAfter = [];
    let foundQuiz = false;

    targetLesson.contents.forEach((c, idx) => {
      if (c.type === 'quiz') {
        foundQuiz = true;
        quizContents.push(c);
      } else if (c.type === 'module_results') {
        // Skip old results item
      } else {
        if (!foundQuiz) nonQuizBefore.push(c);
        else nonQuizAfter.push(c);
      }
    });

    if (quizContents.length === 0) return;

    const itemIdsToRemove = [];
    targetLesson.contents.forEach((c, idx) => {
      if (c.type === 'quiz' || c.type === 'module_results') {
        itemIdsToRemove.push(getItemId(targetLesson, c, idx));
      }
    });

    setSelectedAnswers(prevAnswers => {
      const nextAnswers = { ...prevAnswers };
      itemIdsToRemove.forEach(id => delete nextAnswers[id]);
      if (rawCourse && rawCourse.id) {
        localStorage.setItem(`sf_answers_${rawCourse.id}`, JSON.stringify(nextAnswers));
      }
      return nextAnswers;
    });

    setCompletedItems(prevCompleted => {
      const nextCompleted = prevCompleted.filter(id => !itemIdsToRemove.includes(id));
      if (rawCourse && rawCourse.id) {
        localStorage.setItem(`sf_progress_${rawCourse.id}`, JSON.stringify(nextCompleted));
        window.dispatchEvent(new Event('progress_updated'));
      }
      return nextCompleted;
    });

    const shuffledQuizzes = quizContents.map(q => {
      if (!q.quiz_data || !q.quiz_data.options) return q;
      const oldOptions = [...q.quiz_data.options];
      const correctStr = oldOptions[q.quiz_data.answer];
      
      const newOptions = [...oldOptions];
      for (let i = newOptions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newOptions[i], newOptions[j]] = [newOptions[j], newOptions[i]];
      }
      
      const newAnswerIdx = newOptions.indexOf(correctStr);
      return {
        ...q,
        quiz_data: {
          ...q.quiz_data,
          options: newOptions,
          answer: newAnswerIdx
        }
      };
    });

    for (let i = shuffledQuizzes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledQuizzes[i], shuffledQuizzes[j]] = [shuffledQuizzes[j], shuffledQuizzes[i]];
    }

    const newLesson = {
      ...targetLesson,
      contents: [...nonQuizBefore, ...shuffledQuizzes, ...nonQuizAfter]
    };

    const lessonKey = targetLesson.id || targetLesson.title;
    setShuffledLessonsMap(prev => ({ ...prev, [lessonKey]: newLesson }));

    setActiveLesson(newLesson);
    setActiveContentIndex(0);
  };

  const currentIndex = activeLesson ? flattenedItems.findIndex(item => item.lesson.id === activeLesson.id && item.contentIndex === activeContentIndex) : -1;
  const prevLessonItem = currentIndex > 0 ? flattenedItems[currentIndex - 1] : null;
  const nextLessonItem = currentIndex >= 0 && currentIndex < flattenedItems.length - 1 ? flattenedItems[currentIndex + 1] : null;

  const currentItem = currentIndex >= 0 && currentIndex < flattenedItems.length ? flattenedItems[currentIndex] : null;
  const isCurrentQuiz = currentItem?.content?.type === 'quiz';
  const currentItemId = currentItem ? getItemId(currentItem.lesson, currentItem.content, currentItem.contentIndex) : '';
  const canProceed = !isCurrentQuiz || (selectedAnswers[currentItemId] !== undefined || completedItems.includes(currentItemId));

  const handlePrev = () => {
    if (prevLessonItem) {
      setActiveLesson(prevLessonItem.lesson);
      setActiveContentIndex(prevLessonItem.contentIndex);
      setExpandedModules(prev => ({ ...prev, [prevLessonItem.moduleIndex]: true }));
    }
  };

  const completeCourse = () => {
    if (!canProceed) {
      alert("Please choose an option before proceeding.");
      return;
    }
    markCurrentCompleted();
    const saved = JSON.parse(localStorage.getItem('sf_completed_courses') || '[]');
    if (course && course.id && !saved.includes(course.id)) {
      saved.push(course.id);
      localStorage.setItem('sf_completed_courses', JSON.stringify(saved));
    }
    const allIds = flattenedItems.map(item => getItemId(item.lesson, item.content, item.contentIndex));
    setCompletedItems(allIds);
    if (course && course.id) {
      localStorage.setItem(`sf_progress_${course.id}`, JSON.stringify(allIds));
      window.dispatchEvent(new Event('progress_updated'));
    }
    if (onComplete) onComplete();
    else if (onBack) onBack();
  };

  const handleNext = () => {
    if (!canProceed) {
      alert("Please choose an option before proceeding to the next question.");
      return;
    }
    markCurrentCompleted();
    if (nextLessonItem) {
      setActiveLesson(nextLessonItem.lesson);
      setActiveContentIndex(nextLessonItem.contentIndex);
      setExpandedModules(prev => ({ ...prev, [nextLessonItem.moduleIndex]: true }));
    } else {
      if (course && course.quiz_questions && course.quiz_questions.length > 0) {
        setShowQuiz(true);
      } else {
        completeCourse();
      }
    }
  };

  if (showQuiz) {
    return (
      <div className="flex-1 w-full bg-slate-50 overflow-y-auto p-8">
        <CourseQuiz 
          courseId={course.id} 
          courseName={course.title}
          onComplete={completeCourse} 
          onCancel={() => setShowQuiz(false)} 
        />
      </div>
    );
  }
  
  return (
    <div className="flex h-full flex-1 w-full bg-slate-50 overflow-hidden">
      
      {/* Sidebar: Curriculum */}
      <aside className="curriculum-sidebar" style={{ width: '320px', background: '#f8fafc', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div className="curriculum-header" style={{ padding: '2rem 1.5rem 1rem', borderBottom: '1px solid #e2e8f0' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', padding: 0, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            ← Back to Courses
          </button>
          <h2 className="course-title-small" style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '0.75rem', color: '#0f172a' }}>{course.title}</h2>
          <div className="curriculum-progress-bg" style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', marginBottom: '0.5rem', width: '100%', overflow: 'hidden' }}>
            <div className="curriculum-progress-fill" style={{ width: `${progressPercent}%`, background: '#3b82f6', height: '100%', borderRadius: '3px', transition: 'width 0.4s ease-out' }}></div>
          </div>
          <div className="curriculum-progress-info" style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: '600', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: progressPercent === 100 ? '#10b981' : '#3b82f6', fontWeight: '700' }}>{progressPercent}% Completed</span>
            <span>{completedCount}/{totalItems} {totalItems === 1 ? 'item' : 'items'}</span>
          </div>
        </div>

        <div className="curriculum-list" style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          {hasModules ? (
            course.modules_data.map((mod, mIndex) => {
              const isExpanded = expandedModules[mIndex];
              return (
                <div key={mod.id || mIndex} className="module-accordion" style={{ marginBottom: '1rem' }}>
                  <button 
                    onClick={() => toggleModule(mIndex)}
                    style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', border: '1px solid #e2e8f0', padding: '0.85rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: '700', color: '#1e293b', fontSize: '0.9rem', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}
                  >
                    {mIndex + 1}. {mod.title}
                    <span style={{ color: '#94a3b8', display: 'flex' }}>
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </span>
                  </button>
                  {isExpanded && (
                    <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {mod.lessons.map((lesson, lIndex) => {
                        const isLessonActive = activeLesson?.id === lesson.id;
                        return (
                          <div key={lesson.id || lIndex} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <div style={{ 
                              padding: '0.5rem 1rem', 
                              color: isLessonActive ? '#0f172a' : '#64748b',
                              fontWeight: '700',
                              fontSize: '0.85rem'
                            }}>
                              {lesson.title}
                            </div>
                            
                            {lesson.contents && lesson.contents.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', marginLeft: '0.5rem' }}>
                                {lesson.contents.map((c, cIndex) => {
                                  if (c.type === 'module_results') return null;
                                  const isContentActive = isLessonActive && activeContentIndex === cIndex;
                                  const isCompleted = completedItems.includes(getItemId(lesson, c, cIndex));
                                  const isAssessmentItem = c.type === 'quiz' || c.type === 'module_results';
                                  const canClickSidebarItem = !isAssessmentItem || (cIndex === 0 && !isLessonActive);

                                  return (
                                    <div 
                                      key={cIndex}
                                      onClick={() => {
                                        if (!canClickSidebarItem) return;
                                        if (isCurrentQuiz && !canProceed && getItemId(lesson, c, cIndex) !== currentItemId) {
                                          alert("Please choose an option before proceeding to the next question.");
                                          return;
                                        }
                                        const isAssessmentLesson = lesson.contents && lesson.contents.some(x => x.type === 'quiz');
                                        const hasFinishedAssessment = isAssessmentLesson && lesson.contents.some(x => x.type === 'quiz' && selectedAnswers[getItemId(lesson, x, lesson.contents.indexOf(x))] !== undefined);
                                        if (isAssessmentLesson && (hasFinishedAssessment || !isLessonActive)) {
                                          if (hasFinishedAssessment) {
                                            retakeOrRejoinAssessment(lesson);
                                            return;
                                          }
                                        }
                                        setActiveLesson(lesson);
                                        setActiveContentIndex(cIndex);
                                      }}
                                      style={{
                                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                                        padding: '0.6rem 1rem', borderRadius: '6px', cursor: canClickSidebarItem ? 'pointer' : 'default',
                                        background: isContentActive ? '#eff6ff' : 'transparent',
                                        color: isContentActive ? '#3b82f6' : '#64748b',
                                        borderLeft: isContentActive ? '3px solid #3b82f6' : '3px solid transparent',
                                        transition: 'all 0.2s',
                                        fontSize: '0.8rem', fontWeight: isContentActive ? '600' : '500'
                                      }}
                                    >
                                      {c.type === 'video' ? <Video size={14} /> : 
                                       c.type === 'pdf' ? <FileText size={14} /> : 
                                       c.type === 'image' ? <Image size={14} /> : 
                                       c.type === 'quiz' ? null :
                                       c.type === 'module_results' ? <CheckCircle2 size={14} style={{ color: '#10b981' }} /> :
                                       <FileText size={14} />}
                                      <span style={{ textTransform: (c.type === 'quiz' || c.type === 'module_results') ? 'none' : 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }} title={c.type === 'quiz' ? (c.quiz_data?.question || 'Assessment Question') : (c.title || c.type)}>
                                        {c.type === 'quiz' ? (c.quiz_data?.question || 'Assessment Question') : (c.title || c.type)}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (isAssessmentItem) return;
                                          toggleItemCompletion(lesson, c, cIndex);
                                        }}
                                        style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: isAssessmentItem ? 'default' : 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                                        title={isAssessmentItem ? "Complete assessment via Next button" : (isCompleted ? "Mark as incomplete" : "Mark as completed")}
                                      >
                                        {isCompleted ? (
                                          <CheckCircle2 size={15} style={{ color: '#10b981' }} />
                                        ) : (
                                          <div style={{ width: '13px', height: '13px', borderRadius: '50%', border: isContentActive ? '2px solid #3b82f6' : '2px solid #cbd5e1', transition: 'border-color 0.2s' }} />
                                        )}
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                               <div 
                                  onClick={() => {
                                    if (isCurrentQuiz && !canProceed && getItemId(lesson, null, 0) !== currentItemId) {
                                      alert("Please choose an option before proceeding to the next question.");
                                      return;
                                    }
                                    setActiveLesson(lesson);
                                    setActiveContentIndex(0);
                                  }}
                                  style={{
                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    padding: '0.6rem 1rem', borderRadius: '6px', cursor: 'pointer',
                                    background: isLessonActive ? '#eff6ff' : 'transparent',
                                    color: isLessonActive ? '#3b82f6' : '#64748b',
                                    borderLeft: isLessonActive ? '3px solid #3b82f6' : '3px solid transparent',
                                    transition: 'all 0.2s',
                                    fontSize: '0.8rem', fontWeight: isLessonActive ? '600' : '500',
                                    marginLeft: '0.5rem'
                                  }}
                                >
                                  <FileText size={14} />
                                  <span>Empty Lesson</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleItemCompletion(lesson, null, 0);
                                    }}
                                    style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                                    title={completedItems.includes(getItemId(lesson, null, 0)) ? "Mark as incomplete" : "Mark as completed"}
                                  >
                                    {completedItems.includes(getItemId(lesson, null, 0)) ? (
                                      <CheckCircle2 size={15} style={{ color: '#10b981' }} />
                                    ) : (
                                      <div style={{ width: '13px', height: '13px', borderRadius: '50%', border: isLessonActive ? '2px solid #3b82f6' : '2px solid #cbd5e1', transition: 'border-color 0.2s' }} />
                                    )}
                                  </button>
                                </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div style={{ padding: '1.25rem', color: '#64748b', fontSize: '0.9rem' }}>
              No dynamic modules available for this course.
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="learning-content" style={{ flex: 1, padding: '2.5rem 4rem', background: '#fff', overflowY: 'auto' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          
          <h1 style={{ fontSize: '2rem', fontWeight: '800', color: '#0f172a', margin: '0 0 1.5rem 0', textTransform: 'capitalize' }}>
            {activeLesson ? activeLesson.title : course.title}
          </h1>

          <div className="video-section" style={{ background: '#000', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', position: 'relative' }}>
            {activeLesson && activeLesson.contents && activeLesson.contents.length > 0 ? (
              <div className="lesson-contents">
                {(() => {
                  const content = activeLesson.contents[activeContentIndex];
                  if (!content) return null;
                  
                  if (content.type === 'video' && content.content_url) {
                    return (
                      <video controls style={{ width: '100%', display: 'block', maxHeight: '600px', backgroundColor: '#000' }}>
                        <source src={`${process.env.REACT_APP_API_URL}${content.content_url}`} type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                    );
                  } else if (content.type === 'image' && content.content_url) {
                    return (
                      <img src={`${process.env.REACT_APP_API_URL}${content.content_url}`} alt={activeLesson.title} style={{ width: '100%', display: 'block', maxHeight: '600px', objectFit: 'contain', backgroundColor: '#f8fafc' }} />
                    );
                  } else if (content.type === 'text') {
                    return (
                      <div style={{ padding: '3rem', backgroundColor: '#fff', minHeight: '400px', fontSize: '1.1rem', lineHeight: 1.6, color: '#334155' }}>
                        {content.text_content}
                      </div>
                    );
                  } else if (content.type === 'pdf' && content.content_url) {
                    return (
                      <div style={{ padding: '4rem', backgroundColor: '#f8fafc', minHeight: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                        <FileText size={64} color="#ef4444" />
                        <h3 style={{ margin: 0, color: '#0f172a' }}>PDF Document</h3>
                        <a href={`${process.env.REACT_APP_API_URL}${content.content_url}`} target="_blank" rel="noreferrer" style={{ padding: '0.75rem 2rem', background: '#3b82f6', color: '#fff', textDecoration: 'none', fontWeight: '600', borderRadius: '8px', marginTop: '1rem' }}>Download / View PDF</a>
                      </div>
                    );
                  } else if (content.type === 'quiz' && content.quiz_data) {
                    const userAns = selectedAnswers[currentItemId];
                    const isAnswered = userAns !== undefined;

                    return (
                      <div style={{ padding: '3rem', backgroundColor: '#fff', minHeight: '400px', borderTop: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                          <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', margin: 0, flex: 1 }}>
                            {content.quiz_data.question}
                          </h3>
                          <span style={{ 
                            padding: '0.4rem 0.85rem', 
                            borderRadius: '20px', 
                            fontSize: '0.85rem', 
                            fontWeight: '700', 
                            background: isAnswered ? '#eff6ff' : '#f1f5f9',
                            color: isAnswered ? '#1e40af' : '#64748b',
                            border: `1px solid ${isAnswered ? '#bfdbfe' : '#e2e8f0'}`,
                            marginLeft: '1rem',
                            whiteSpace: 'nowrap'
                          }}>
                            {isAnswered ? 'Answered ✓' : 'Not Answered'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          {content.quiz_data.options.map((opt, i) => {
                            const isSelectedOpt = userAns === i;

                            return (
                              <button 
                                key={i} 
                                onClick={() => {
                                  const nextAnswers = { ...selectedAnswers, [currentItemId]: i };
                                  setSelectedAnswers(nextAnswers);
                                  if (course && course.id) {
                                    localStorage.setItem(`sf_answers_${course.id}`, JSON.stringify(nextAnswers));
                                    saveProgressToBackend(course.id, completedItems, nextAnswers);
                                  }
                                  markCurrentCompleted();
                                }}
                                style={{ 
                                  padding: '1rem 1.5rem', 
                                  textAlign: 'left', 
                                  background: isSelectedOpt ? '#eff6ff' : '#f8fafc', 
                                  border: isSelectedOpt ? '2px solid #3b82f6' : '2px solid #e2e8f0', 
                                  borderRadius: '12px', 
                                  fontSize: '1.1rem',
                                  color: isSelectedOpt ? '#1e40af' : '#334155', 
                                  cursor: 'pointer', 
                                  transition: 'all 0.2s', 
                                  fontWeight: isSelectedOpt ? '700' : '500', 
                                  boxShadow: isSelectedOpt ? '0 0 0 3px rgba(59, 130, 246, 0.15)' : 'none', 
                                  display: 'flex', 
                                  justifyContent: 'space-between', 
                                  alignItems: 'center' 
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                  <div style={{ 
                                    width: '22px', height: '22px', borderRadius: '4px', 
                                    background: isSelectedOpt ? '#3b82f6' : '#cbd5e1',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: '#fff', fontSize: '0.8rem', fontWeight: 'bold'
                                  }}>
                                    {isSelectedOpt ? '✓' : ''}
                                  </div>
                                  <span>{opt}</span>
                                </div>
                                {isSelectedOpt && <CheckCircle2 size={20} style={{ color: '#3b82f6', shrink: 0 }} />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  } else if (content.type === 'module_results') {
                    const moduleQuizzes = [];
                    const currentMod = course.modules_data[content.moduleIndex || 0];
                    if (currentMod && currentMod.lessons) {
                      currentMod.lessons.forEach((l, lIdx) => {
                        if (l.contents) {
                          l.contents.forEach((c, cIdx) => {
                            if (c.type === 'quiz' && c.quiz_data) {
                              const qId = getItemId(l, c, cIdx);
                              moduleQuizzes.push({ lesson: l, content: c, contentIndex: cIdx, id: qId });
                            }
                          });
                        }
                      });
                    }
                    const totalScore = moduleQuizzes.filter(q => selectedAnswers[q.id] === q.content.quiz_data.answer).length;
                    const percentage = moduleQuizzes.length > 0 ? Math.round((totalScore / moduleQuizzes.length) * 100) : 100;

                    return (
                      <div style={{ padding: '3rem', backgroundColor: '#f8fafc', minHeight: '600px', borderTop: '1px solid #e2e8f0' }}>
                        <div style={{ padding: '2rem 2.5rem', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '2rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f1f5f9', paddingBottom: '1.25rem', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                              <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#0f172a', margin: 0 }}>Review: {content.moduleTitle || 'Module'} Assessment</h2>
                              <p style={{ color: '#64748b', margin: '0.25rem 0 0', fontSize: '0.95rem' }}>Module Assessment Results & Answer Key</p>
                            </div>
                            <div style={{ textAlign: 'right', display: 'flex', gap: '2rem', alignItems: 'center' }}>
                              <div>
                                <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: '800', color: percentage >= 70 ? '#10b981' : '#f59e0b', marginTop: '0.2rem' }}>
                                  {percentage >= 70 ? 'Passed ✓' : 'Needs Review'}
                                </div>
                              </div>
                              <div style={{ paddingLeft: '2rem', borderLeft: '2px solid #f1f5f9' }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Points</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#0f172a', marginTop: '0.1rem' }}>
                                  {totalScore} / {moduleQuizzes.length} <span style={{ fontSize: '1rem', fontWeight: '700', color: '#64748b' }}>({percentage}%)</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
                          <button
                            type="button"
                            onClick={() => retakeOrRejoinAssessment(activeLesson)}
                            style={{
                              padding: '0.85rem 2rem',
                              background: '#3b82f6',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '30px',
                              fontSize: '1rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              transition: 'all 0.2s'
                            }}
                          >
                            <span>Retry Quiz</span>
                          </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                          {moduleQuizzes.map((q, qIndex) => {
                            const userAns = selectedAnswers[q.id];
                            const correctAns = q.content.quiz_data.answer;
                            const isQCorrect = userAns === correctAns;
                            const isAnswered = userAns !== undefined;
                            return (
                              <div key={q.id} style={{ padding: '2rem', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                                  <h4 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1e293b', margin: 0, flex: 1 }}>
                                    {qIndex + 1}. {q.content.quiz_data.question}
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
                                  {q.content.quiz_data.options.map((opt, optIndex) => {
                                    const isSelectedOpt = userAns === optIndex;
                                    const isCorrectOpt = optIndex === correctAns;
                                    
                                    let bg = '#f8fafc';
                                    let border = '2px solid #e2e8f0';
                                    let color = '#334155';
                                    let icon = null;
                                    let fontWeight = '500';

                                    if (isCorrectOpt) {
                                      bg = '#ecfdf5';
                                      border = '2px solid #10b981';
                                      color = '#065f46';
                                      fontWeight = '700';
                                      icon = <CheckCircle2 size={18} style={{ color: '#10b981', shrink: 0 }} />;
                                    } else if (isSelectedOpt && !isCorrectOpt) {
                                      bg = '#fef2f2';
                                      border = '2px solid #ef4444';
                                      color = '#991b1b';
                                      fontWeight = '700';
                                      icon = <span style={{ fontWeight: 'bold', color: '#ef4444', fontSize: '1.2rem', lineHeight: 1 }}>✕</span>;
                                    }

                                    return (
                                      <div 
                                        key={optIndex}
                                        style={{ 
                                          padding: '0.9rem 1.25rem', 
                                          borderRadius: '10px', 
                                          background: bg, 
                                          border: border, 
                                          color: color, 
                                          fontSize: '1rem',
                                          fontWeight: fontWeight,
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center',
                                          transition: 'all 0.2s'
                                        }}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                          <div style={{ 
                                            width: '20px', height: '20px', borderRadius: '4px', 
                                            background: isSelectedOpt ? (isCorrectOpt ? '#10b981' : '#ef4444') : (isCorrectOpt ? '#10b981' : '#cbd5e1'),
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: '#fff', fontSize: '0.75rem', fontWeight: 'bold'
                                          }}>
                                            {(isSelectedOpt || isCorrectOpt) ? '✓' : ''}
                                          </div>
                                          <span>{opt}</span>
                                        </div>
                                        {icon}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            ) : course.image_url ? (
              <div className="video-player-mock" style={{ backgroundImage: `url(${process.env.REACT_APP_API_URL}${course.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center', paddingBottom: '56.25%', position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: '80px', height: '80px', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <Play size={32} fill="#fff" color="#fff" style={{ marginLeft: '4px' }} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="video-player-mock" style={{ background: '#1e293b', paddingBottom: '56.25%', position: 'relative' }}>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: '80px', height: '80px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Play size={32} fill="#fff" color="#fff" style={{ marginLeft: '4px' }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem' }}>
            <button 
              onClick={handlePrev}
              disabled={!prevLessonItem}
              style={{ 
                padding: '0.75rem 1.5rem', 
                background: prevLessonItem ? '#f1f5f9' : '#f8fafc', 
                color: prevLessonItem ? '#334155' : '#cbd5e1', 
                border: 'none', 
                borderRadius: '8px', 
                fontWeight: '600', 
                cursor: prevLessonItem ? 'pointer' : 'not-allowed', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                transition: 'all 0.2s'
              }}
            >
              ← Previous Lesson
            </button>
            <button 
              onClick={handleNext}
              disabled={!canProceed}
              style={{ 
                padding: '0.75rem 1.5rem', 
                background: canProceed ? '#3b82f6' : '#94a3b8', 
                color: '#fff', 
                border: 'none', 
                borderRadius: '8px', 
                fontWeight: '600', 
                cursor: canProceed ? 'pointer' : 'not-allowed', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                boxShadow: canProceed ? '0 4px 6px -1px rgba(59, 130, 246, 0.2), 0 2px 4px -1px rgba(59, 130, 246, 0.1)' : 'none',
                transition: 'all 0.2s',
                opacity: canProceed ? 1 : 0.7
              }}
              title={!canProceed ? "Please choose an option to proceed" : ""}
            >
              {nextLessonItem ? 'Complete & Next →' : 'Complete Course ✓'}
            </button>
          </div>

        </div>
      </main>
    </div>
  );
};

export default MyLearning;
