import React, { useState, useEffect } from 'react';
import {
  BookOpen, Video, FileText, Image, File, Upload,
  ExternalLink, Sparkles, RefreshCw, CheckCircle, AlertCircle, Plus, X, Trash2, Edit, Star, LayoutGrid, Check, PlayCircle, Users, Clock
} from 'lucide-react';
import LearnerPerformance from './LearnerPerformance';

export default function ExpertPanel({ user }) {
  const [activeTab, setActiveTab] = useState('curriculum');
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);

  // Loading & states
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [currentCourse, setCurrentCourse] = useState(null);
  const [courseFormData, setCourseFormData] = useState({
    title: '',
    description: '',
    category: 'Software Engineering',
    rating: 4.5,
    students_count: 1000,
    hours: 20,
    is_ai_generated: true,
    is_expert_validated: false,
    image_url: ''
  });

  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [modulesData, setModulesData] = useState([]);
  const [quizQuestionsData, setQuizQuestionsData] = useState([]);

  const token = localStorage.getItem('sf_token');
  const headers = {
    'Authorization': `Bearer ${token}`
  };

  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [isQuizPromptOpen, setIsQuizPromptOpen] = useState(false);
  const [quizCountInput, setQuizCountInput] = useState("5");

  const [assessmentPromptTarget, setAssessmentPromptTarget] = useState(null);
  const [isAssessmentPromptOpen, setIsAssessmentPromptOpen] = useState(false);
  const [assessmentCountInput, setAssessmentCountInput] = useState("3");
  const [isGeneratingAssessment, setIsGeneratingAssessment] = useState(false);

  const submitGenerateQuiz = async () => {
    const count = parseInt(quizCountInput, 10);
    if (isNaN(count) || count < 1 || count > 50) {
      alert("Please enter a valid number of questions between 1 and 50.");
      return;
    }

    setIsQuizPromptOpen(false);

    try {
      setIsGeneratingQuiz(true);
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/courses/quiz/generate`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          count,
          course_title: courseFormData.title,
          course_description: courseFormData.description,
          modules_data: modulesData
        })
      });
      if (!res.ok) throw new Error("Failed to generate quiz");
      const data = await res.json();
      if (data && data.length > 0) {
        setQuizQuestionsData(data);
      } else {
        alert("No quiz questions generated.");
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const submitGenerateAssessment = async () => {
    if (!assessmentPromptTarget) return;
    const { mIndex, lIndex, cIndex } = assessmentPromptTarget;
    const count = parseInt(assessmentCountInput, 10);
    if (isNaN(count) || count < 1 || count > 50) {
      alert("Please enter a valid number of questions between 1 and 50.");
      return;
    }

    setIsAssessmentPromptOpen(false);

    try {
      setIsGeneratingAssessment(true);
      const mod = modulesData[mIndex];
      const lesson = mod?.lessons[lIndex];
      const lessonTitle = lesson?.title || "Lesson";
      const modTitle = mod?.title || "Module";

      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/courses/quiz/generate`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          count,
          course_title: courseFormData.title + ` (Module: ${modTitle}, Lesson: ${lessonTitle})`,
          course_description: courseFormData.description,
          modules_data: [mod]
        })
      });
      if (!res.ok) throw new Error("Failed to generate assessment questions");
      const data = await res.json();
      if (data && data.length > 0) {
        const newQuizContents = data.map((q, idx) => ({
          id: Date.now().toString() + '-' + idx,
          type: 'quiz',
          quiz_data: {
            question: q.question || '',
            options: q.options && q.options.length === 4 ? q.options : [
              q.options?.[0] || 'Option 1',
              q.options?.[1] || 'Option 2',
              q.options?.[2] || 'Option 3',
              q.options?.[3] || 'Option 4',
            ],
            answer: q.answer !== undefined && q.answer >= 0 && q.answer <= 3 ? q.answer : 0
          }
        }));

        const newData = [...modulesData];
        const currentContent = newData[mIndex]?.lessons[lIndex]?.contents[cIndex];
        const isBlank = !currentContent?.quiz_data || !currentContent.quiz_data.question || currentContent.quiz_data.question.trim() === '';
        
        if (isBlank) {
          newData[mIndex].lessons[lIndex].contents.splice(cIndex, 1, ...newQuizContents);
        } else {
          newData[mIndex].lessons[lIndex].contents.splice(cIndex + 1, 0, ...newQuizContents);
        }
        setModulesData(newData);
      } else {
        alert("No assessment questions generated.");
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setIsGeneratingAssessment(false);
      setAssessmentPromptTarget(null);
    }
  };

  const handleDeleteCourse = async (id) => {
    if (!window.confirm("Are you sure you want to delete this course from the catalog?")) return;
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/admin/courses/${id}`, {
        method: 'DELETE',
        headers
      });
      if (!res.ok) throw new Error('Failed to delete course');
      if (selectedCourse && selectedCourse.id === id) {
        setSelectedCourse(null);
      }
      fetchCourses();
    } catch (err) {
      alert(err.message);
    }
  };

  const fetchCourses = async () => {
    setLoadingCourses(true);
    setError(null);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/expert/courses`, { headers });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem('sf_token');
          localStorage.removeItem('sf_user');
          window.location.reload();
          return;
        }
        throw new Error('Failed to fetch courses');
      }
      const data = await res.json();
      setCourses(data);
      if (data.length > 0 && !selectedCourse) {
        setSelectedCourse(data[0]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingCourses(false);
    }
  };


  useEffect(() => {
    fetchCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const uploadFileToServer = async (file) => {
    if (!file) return null;
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${process.env.REACT_APP_API_URL}/api/admin/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    if (!res.ok) throw new Error(`Failed to upload file ${file.name}`);
    const data = await res.json();
    return data.url;
  };

  const handleAddModule = () => {
    setModulesData([...modulesData, {
      id: Date.now().toString(),
      title: '',
      lessons: []
    }]);
  };

  const handleRemoveModule = (mIndex) => {
    const newData = [...modulesData];
    newData.splice(mIndex, 1);
    setModulesData(newData);
  };

  const handleAddLesson = (mIndex) => {
    const newData = [...modulesData];
    newData[mIndex].lessons.push({
      id: Date.now().toString(),
      title: '',
      contents: [{ id: Date.now().toString() + 'c', type: 'video', content_url: null, text_content: '', file: null }]
    });
    setModulesData(newData);
  };

  const handleRemoveLesson = (mIndex, lIndex) => {
    const newData = [...modulesData];
    newData[mIndex].lessons.splice(lIndex, 1);
    setModulesData(newData);
  };

  const handleAddContent = (mIndex, lIndex) => {
    const newData = [...modulesData];
    newData[mIndex].lessons[lIndex].contents.push({
      id: Date.now().toString(),
      type: 'video',
      content_url: '',
      file: null
    });
    setModulesData(newData);
  };

  const handleRemoveContent = (mIndex, lIndex, cIndex) => {
    const newData = [...modulesData];
    newData[mIndex].lessons[lIndex].contents.splice(cIndex, 1);
    setModulesData(newData);
  };

  const handleOpenCourseModal = (course = null) => {
    setThumbnailFile(null);
    if (course) {
      setCurrentCourse(course);
      setCourseFormData({
        title: course.title,
        description: course.description,
        category: course.category,
        rating: course.rating,
        students_count: course.students_count,
        hours: course.hours,
        is_ai_generated: course.is_ai_generated,
        is_expert_validated: course.is_expert_validated,
        image_url: course.image_url || ''
      });
      setModulesData(course.modules_data || []);
    } else {
      setCurrentCourse(null);
      setCourseFormData({
        title: '',
        description: '',
        category: 'Software Engineering',
        rating: 4.5,
        students_count: 100,
        hours: 10,
        is_ai_generated: true,
        is_expert_validated: false,
        image_url: ''
      });
      setModulesData([]);
    }
    setIsCourseModalOpen(true);
  };


  const handleSaveCourse = async (e) => {
    e.preventDefault();
    try {
      // 1. Upload thumbnail
      let updatedImageUrl = courseFormData.image_url;
      if (thumbnailFile) {
        updatedImageUrl = await uploadFileToServer(thumbnailFile);
      }

      // 1.5 Upload module content files
      const newModulesData = [];
      for (const mod of modulesData) {
        const newLessons = [];
        for (const less of mod.lessons) {
          const newContents = [];
          for (const content of less.contents) {
            if (content.file) {
              const url = await uploadFileToServer(content.file);
              newContents.push({ ...content, content_url: url, file: undefined });
            } else {
              newContents.push(content);
            }
          }
          newLessons.push({ ...less, contents: newContents });
        }
        newModulesData.push({ ...mod, lessons: newLessons });
      }

      // 2. Save course
      const url = currentCourse
        ? `${process.env.REACT_APP_API_URL}/api/admin/courses/${currentCourse.id}`
        : `${process.env.REACT_APP_API_URL}/api/admin/courses`;
      const method = currentCourse ? 'PUT' : 'POST';

      const coreData = {
        title: courseFormData.title,
        description: courseFormData.description,
        category: courseFormData.category,
        rating: courseFormData.rating,
        students_count: courseFormData.students_count,
        hours: courseFormData.hours,
        is_ai_generated: courseFormData.is_ai_generated,
        is_expert_validated: courseFormData.is_expert_validated,
        image_url: updatedImageUrl,
        modules_data: newModulesData,
        quiz_questions: quizQuestionsData
      };

      const res = await fetch(url, {
        method,
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(coreData)
      });

      if (!res.ok) throw new Error('Failed to save course');

      setIsCourseModalOpen(false);

      // Update selected course if we just edited it
      if (currentCourse && selectedCourse && currentCourse.id === selectedCourse.id) {
        const updatedCourse = await res.json();
        setSelectedCourse(updatedCourse);
      }

      fetchCourses();
    } catch (err) {
      alert(err.message);
    }
  };

  const getContentTypeIcon = (type) => {
    switch (type) {
      case 'video': return <Video size={14} />;
      case 'pdf': return <FileText size={14} />;
      case 'image': return <Image size={14} />;
      case 'text': return <File size={14} />;
      default: return <File size={14} />;
    }
  };

  return (
    <div className="flex-1 overflow-hidden bg-slate-50 flex flex-col relative h-full">
      <div className="flex-1 overflow-y-auto p-6 md:p-8 no-scrollbar w-full">
        <div className="max-w-7xl mx-auto w-full flex flex-col gap-6 h-full">

          {/* Header Section */}
          <div className="flex flex-col gap-1 mb-2">
            <h1 className="text-3xl font-bold text-navy-900 leading-tight flex items-center gap-3">
              <Sparkles className="text-purple-500" size={28} /> Expert Validation Hub
            </h1>
            <p className="text-slate-500 font-medium">Provide rich educational media, notes, and references for accepted curriculum courses.</p>
          </div>

          {error && (
            <div className="p-4 bg-coral-50 border border-coral-200 text-coral-600 rounded-xl text-sm font-bold flex items-center shadow-sm gap-2">
              <AlertCircle size={18} /> {error}
            </div>
          )}
          {successMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-xl text-sm font-bold flex items-center shadow-sm gap-2">
              <CheckCircle size={18} /> {successMsg}
            </div>
          )}

          {/* Top Tab Bar */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
            <button
              onClick={() => setActiveTab('curriculum')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-sm transition-all ${
                activeTab === 'curriculum'
                  ? 'bg-navy text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-navy-900'
              }`}
            >
              <BookOpen size={18} />
              <span>Curriculum & Media Hub</span>
            </button>
            <button
              onClick={() => setActiveTab('learners')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-extrabold text-sm transition-all ${
                activeTab === 'learners'
                  ? 'bg-navy text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-navy-900'
              }`}
            >
              <Users size={18} />
              <span>Learner Course & Assessment Performance</span>
              <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 ml-1">Live</span>
            </button>
          </div>

          {activeTab === 'learners' ? (
            <LearnerPerformance user={user} embedded={true} />
          ) : (
            <div className="flex flex-col lg:flex-row gap-6 h-full min-h-[500px]">
              {/* Left Column: Course Catalog */}
            <div className="w-full lg:w-80 flex flex-col bg-white border border-slate-200 rounded-3xl overflow-hidden shrink-0 shadow-sm h-full max-h-[80vh]">
              <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-white/90 backdrop-blur z-10">
                <h3 className="font-bold text-navy-900 flex items-center gap-2">
                  <LayoutGrid size={18} className="text-slate-400" /> Course Catalog
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleOpenCourseModal(null)}
                    className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors tooltip-trigger relative group"
                    title="Add Course"
                  >
                    <Plus size={16} />
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Add Course</span>
                  </button>
                  <button
                    onClick={fetchCourses}
                    disabled={loadingCourses}
                    className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-lg transition-colors tooltip-trigger relative group"
                    title="Refresh"
                  >
                    <RefreshCw size={16} className={loadingCourses ? "animate-spin" : ""} />
                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Refresh</span>
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar p-2">
                {loadingCourses ? (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-3">
                    <RefreshCw className="animate-spin" size={24} />
                    <span className="text-sm font-medium">Fetching courses...</span>
                  </div>
                ) : courses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                    <span className="text-sm font-medium">No courses found.</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    {courses.map(course => (
                      <div
                        key={course.id}
                        className={`p-4 rounded-xl cursor-pointer flex gap-3 transition-all ${selectedCourse?.id === course.id
                            ? 'bg-purple-50 shadow-inner'
                            : 'hover:bg-slate-50'
                          }`}
                        onClick={() => setSelectedCourse(course)}
                      >
                        <div className={`mt-0.5 shrink-0 ${selectedCourse?.id === course.id ? 'text-purple-500' : 'text-slate-400'}`}>
                          <BookOpen size={18} />
                        </div>
                        <div className="flex flex-col overflow-hidden">
                          <span className={`font-bold truncate ${selectedCourse?.id === course.id ? 'text-purple-900' : 'text-navy-900'}`}>
                            {course.title}
                          </span>
                          <span className="text-xs font-semibold text-slate-500 truncate mt-0.5">
                            {course.category} • {course.hours}h
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Course Details & Curriculum */}
            <div className="flex-1 bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col max-h-[80vh]">
              {selectedCourse ? (
                <div className="flex flex-col h-full overflow-y-auto no-scrollbar p-6 lg:p-8">
                  {/* Selected Course Header */}
                  <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-100 rounded-2xl p-6 mb-8 shadow-sm flex flex-col relative overflow-hidden">
                    {/* Decorative element */}
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                      <BookOpen size={120} />
                    </div>

                    <div className="flex justify-between items-start mb-4 relative z-10">
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-[10px] font-bold uppercase tracking-widest">
                        {selectedCourse.category}
                      </span>
                      <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${selectedCourse.is_expert_validated ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                        {selectedCourse.is_expert_validated ? <><Check size={12} /> Expert Validated</> : <><AlertCircle size={12} /> Needs Validation</>}
                      </span>
                    </div>
                    <h2 className="text-2xl font-bold text-navy-900 mb-2 relative z-10">{selectedCourse.title}</h2>
                    <p className="text-sm font-medium text-slate-600 leading-relaxed max-w-3xl relative z-10">{selectedCourse.description}</p>

                    <div className="flex items-center gap-6 mt-6 relative z-10 text-sm font-bold text-slate-500">
                      <div className="flex items-center gap-1.5"><Star size={16} className="text-amber-400 fill-amber-400" /> {selectedCourse.rating}</div>
                      <div className="flex items-center gap-1.5"><Users size={16} /> {selectedCourse.students_count.toLocaleString()} Students</div>
                      <div className="flex items-center gap-1.5"><Clock size={16} /> {selectedCourse.hours} Hours</div>
                    </div>
                  </div>

                  {/* Course Curriculum Section */}
                  <div className="flex flex-col flex-1">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-navy-900 flex items-center gap-2">
                        <BookOpen size={20} className="text-blue-500" /> Course Curriculum
                      </h3>
                      <div className="flex gap-3">
                        <button
                          className="flex items-center gap-2 px-4 py-2 bg-coral-50 hover:bg-coral-100 text-coral-600 text-sm font-bold rounded-xl transition-all border border-coral-200"
                          onClick={() => handleDeleteCourse(selectedCourse.id)}
                        >
                          <Trash2 size={16} /> Delete Course
                        </button>
                        <button
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm transition-all"
                          onClick={() => handleOpenCourseModal(selectedCourse)}
                        >
                          <Edit size={16} /> Edit Curriculum
                        </button>
                      </div>
                    </div>

                    {selectedCourse.modules_data && selectedCourse.modules_data.length > 0 ? (
                      <div className="flex flex-col gap-6 pb-8">
                        {selectedCourse.modules_data.map((mod, mIdx) => (
                          <div key={mod.id || mIdx} className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-sm transition-all hover:shadow-md">
                            <div className="bg-slate-100 px-6 py-4 border-b border-slate-200">
                              <h4 className="text-lg font-bold text-navy-900 flex items-center gap-2">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-xs">{mIdx + 1}</span>
                                {mod.title}
                              </h4>
                            </div>

                            <div className="flex flex-col gap-4 p-6">
                              {mod.lessons && mod.lessons.map((less, lIdx) => (
                                <div key={less.id || lIdx} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:border-blue-200 transition-colors group">
                                  <h5 className="font-bold text-navy-900 mb-3 flex items-center gap-2 group-hover:text-blue-600 transition-colors">
                                    <PlayCircle size={16} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                                    Lesson {lIdx + 1}: {less.title}
                                  </h5>
                                  <div className="flex flex-wrap gap-2 ml-6">
                                    {less.contents && less.contents.map((content, cIdx) => (
                                      <span key={content.id || cIdx} className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 bg-slate-100 text-slate-600 uppercase tracking-widest rounded-md border border-slate-200">
                                        {getContentTypeIcon(content.type)} {content.type}
                                      </span>
                                    ))}
                                    {(!less.contents || less.contents.length === 0) && (
                                      <span className="text-xs font-semibold text-slate-400 italic">No content items added.</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                              {(!mod.lessons || mod.lessons.length === 0) && (
                                <div className="text-center py-4 text-sm font-semibold text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                                  No lessons added to this module yet.
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-12 bg-slate-50 border border-slate-200 border-dashed rounded-3xl mt-4">
                        <BookOpen size={48} className="text-slate-300 mb-4" />
                        <h4 className="text-lg font-bold text-navy-900 mb-2">No Curriculum Built</h4>
                        <p className="text-sm font-medium text-slate-500 max-w-sm text-center mb-6">This course doesn't have any modules or lessons yet. Start building the curriculum to provide rich content.</p>
                        <button
                          onClick={() => handleOpenCourseModal(selectedCourse)}
                          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm transition-all"
                        >
                          <Plus size={18} /> Build Curriculum
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-12 text-center text-slate-400">
                  <BookOpen size={64} className="mb-6 opacity-20" />
                  <h3 className="text-xl font-bold text-navy-900 mb-2">Select a Course</h3>
                  <p className="font-medium max-w-sm">Choose a course from the catalog on the left to view and edit its curriculum details.</p>
                </div>
              )}
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Course Modal */}
      {isCourseModalOpen && (
        <div className="fixed inset-0 bg-navy-900/40 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  {currentCourse ? <Edit size={20} /> : <Plus size={20} />}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-navy-900">{currentCourse ? "Edit Course Entry" : "Create New Course"}</h3>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{currentCourse ? "Update catalog details and curriculum" : "Add a new course to the catalog"}</p>
                </div>
              </div>
              <button
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
                onClick={() => setIsCourseModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveCourse} className="flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 md:p-8 no-scrollbar bg-white">
                <div className="flex flex-col gap-8 max-w-4xl mx-auto">

                  {/* Basic Info Section */}
                  <div className="flex flex-col gap-6 pb-8 border-b border-slate-100">
                    <h4 className="text-lg font-bold text-navy-900 flex items-center gap-2"><BookOpen size={18} className="text-blue-500" /> Basic Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col gap-2 md:col-span-2">
                        <label className="text-sm font-bold text-navy-900">Course Title</label>
                        <input
                          type="text"
                          required
                          value={courseFormData.title}
                          onChange={e => setCourseFormData({ ...courseFormData, title: e.target.value })}
                          placeholder="e.g. Advanced System Architecture"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                      </div>

                      <div className="flex flex-col gap-2 md:col-span-2">
                        <label className="text-sm font-bold text-navy-900">Description</label>
                        <textarea
                          required
                          value={courseFormData.description}
                          onChange={e => setCourseFormData({ ...courseFormData, description: e.target.value })}
                          placeholder="Provide a comprehensive summary..."
                          rows={3}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-y"
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold text-navy-900">Category</label>
                        <input
                          type="text"
                          required
                          value={courseFormData.category}
                          onChange={e => setCourseFormData({ ...courseFormData, category: e.target.value })}
                          placeholder="e.g. Software Engineering"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold text-navy-900">Hours Duration</label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={courseFormData.hours}
                          onChange={e => setCourseFormData({ ...courseFormData, hours: parseInt(e.target.value) || 0 })}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold text-navy-900">Rating (0 - 5)</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="5"
                          required
                          value={courseFormData.rating}
                          onChange={e => setCourseFormData({ ...courseFormData, rating: parseFloat(e.target.value) || 0.0 })}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold text-navy-900">Students Enrolled</label>
                        <input
                          type="number"
                          min="0"
                          required
                          value={courseFormData.students_count}
                          onChange={e => setCourseFormData({ ...courseFormData, students_count: parseInt(e.target.value) || 0 })}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                      </div>

                      <div className="flex flex-col gap-2 md:col-span-2 mt-2">
                        <label className="text-sm font-bold text-navy-900">Thumbnail Image</label>
                        <div className="flex items-center gap-4 p-4 border border-slate-200 border-dashed rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={e => setThumbnailFile(e.target.files[0])}
                            className="text-sm font-medium text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all"
                          />
                        </div>
                        {courseFormData.image_url && !thumbnailFile && (
                          <div className="text-xs font-semibold text-slate-500 flex items-center gap-1 mt-1 ml-1">
                            Current: <a href={`${process.env.REACT_APP_API_URL}${courseFormData.image_url}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">View Image</a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Curriculum Section */}
                  <div className="flex flex-col gap-6 pb-8 border-b border-slate-100">
                    <div className="flex justify-between items-center">
                      <h4 className="text-lg font-bold text-navy-900 flex items-center gap-2"><LayoutGrid size={18} className="text-blue-500" /> Curriculum Builder</h4>
                      <button
                        type="button"
                        className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 text-sm font-bold rounded-xl transition-all"
                        onClick={handleAddModule}
                      >
                        <Plus size={16} /> Add Module
                      </button>
                    </div>

                    <div className="flex flex-col gap-6">
                      {modulesData.map((module, mIndex) => (
                        <div key={module.id} className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden p-5 shadow-sm">
                          <div className="flex flex-col sm:flex-row gap-4 mb-5 items-start sm:items-center">
                            <div className="flex items-center gap-3 flex-1 w-full">
                              <span className="flex items-center justify-center w-8 h-8 shrink-0 rounded-full bg-blue-100 text-blue-600 font-bold text-sm">{mIndex + 1}</span>
                              <input
                                type="text"
                                placeholder="Module Title"
                                value={module.title}
                                onChange={(e) => {
                                  const newData = [...modulesData];
                                  newData[mIndex].title = e.target.value;
                                  setModulesData(newData);
                                }}
                                className="flex-1 w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-navy-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                required
                              />
                            </div>
                            <div className="flex gap-2 w-full sm:w-auto">
                              <button
                                type="button"
                                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold rounded-lg transition-colors border border-blue-100"
                                onClick={() => handleAddLesson(mIndex)}
                              >
                                <Plus size={14} /> Add Lesson
                              </button>
                              <button
                                type="button"
                                className="flex items-center justify-center w-10 h-10 bg-coral-50 hover:bg-coral-100 text-coral-600 rounded-lg transition-colors border border-coral-100"
                                onClick={() => handleRemoveModule(mIndex)}
                                title="Remove Module"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>

                          <div className="flex flex-col gap-4 pl-4 sm:pl-11">
                            {module.lessons.map((lesson, lIndex) => (
                              <div key={lesson.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative overflow-hidden group">
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-200 group-hover:bg-blue-400 transition-colors"></div>
                                <div className="flex gap-4 mb-4 items-center">
                                  <input
                                    type="text"
                                    placeholder={`Lesson ${lIndex + 1} Title`}
                                    value={lesson.title}
                                    onChange={(e) => {
                                      const newData = [...modulesData];
                                      newData[mIndex].lessons[lIndex].title = e.target.value;
                                      setModulesData(newData);
                                    }}
                                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-navy-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    required
                                  />
                                  <button
                                    type="button"
                                    className="p-2 text-slate-400 hover:text-coral hover:bg-coral-50 rounded-lg transition-colors"
                                    onClick={() => handleRemoveLesson(mIndex, lIndex)}
                                  >
                                    <X size={16} />
                                  </button>
                                </div>

                                <div className="flex flex-col gap-3 ml-2 pl-3 border-l-2 border-slate-100">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Contents</span>
                                    <button
                                      type="button"
                                      className="text-xs font-bold text-blue-500 hover:text-blue-600 flex items-center gap-1"
                                      onClick={() => handleAddContent(mIndex, lIndex)}
                                    >
                                      <Plus size={12} /> Add Content
                                    </button>
                                  </div>

                                  {lesson.contents.map((content, cIndex) => (
                                    <div key={content.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-col gap-3 relative group/content">
                                      <button
                                        type="button"
                                        className="absolute -right-2 -top-2 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-coral hover:border-coral transition-colors opacity-0 group-hover/content:opacity-100 shadow-sm"
                                        onClick={() => handleRemoveContent(mIndex, lIndex, cIndex)}
                                      >
                                        <X size={12} />
                                      </button>

                                      <div className="flex items-center gap-3">
                                        <select
                                          value={content.type}
                                          onChange={(e) => {
                                            const newData = [...modulesData];
                                            newData[mIndex].lessons[lIndex].contents[cIndex].type = e.target.value;
                                            setModulesData(newData);
                                          }}
                                          className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                                        >
                                          <option value="video">🎥 Video</option>
                                          <option value="pdf">📄 PDF</option>
                                          <option value="image">🖼️ Image</option>
                                          <option value="text">📝 Text</option>
                                          <option value="quiz">❓ Quiz (MCQ)</option>
                                        </select>
                                      </div>

                                      {content.type === 'text' ? (
                                        <textarea
                                          placeholder="Write text content or enter URL..."
                                          value={content.text_content || ''}
                                          onChange={(e) => {
                                            const newData = [...modulesData];
                                            newData[mIndex].lessons[lIndex].contents[cIndex].text_content = e.target.value;
                                            setModulesData(newData);
                                          }}
                                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-y min-h-[80px]"
                                          required
                                        />
                                      ) : content.type === 'quiz' ? (
                                        <div className="flex flex-col gap-3 p-3 border border-blue-200 rounded-lg bg-blue-50">
                                          <input
                                            type="text"
                                            placeholder="Question text"
                                            value={content.quiz_data?.question || ''}
                                            onChange={(e) => {
                                              const newData = [...modulesData];
                                              if (!newData[mIndex].lessons[lIndex].contents[cIndex].quiz_data) {
                                                newData[mIndex].lessons[lIndex].contents[cIndex].quiz_data = { question: '', options: ['', '', '', ''], answer: 0 };
                                              }
                                              newData[mIndex].lessons[lIndex].contents[cIndex].quiz_data.question = e.target.value;
                                              setModulesData(newData);
                                            }}
                                            className="w-full px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm font-medium focus:outline-none focus:border-blue-400"
                                            required
                                          />
                                          {Array.from({ length: 4 }).map((_, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                              <input
                                                type="radio"
                                                name={`quiz-${mIndex}-${lIndex}-${cIndex}`}
                                                checked={content.quiz_data?.answer === i}
                                                onChange={() => {
                                                  const newData = [...modulesData];
                                                  if (!newData[mIndex].lessons[lIndex].contents[cIndex].quiz_data) {
                                                    newData[mIndex].lessons[lIndex].contents[cIndex].quiz_data = { question: '', options: ['', '', '', ''], answer: 0 };
                                                  }
                                                  newData[mIndex].lessons[lIndex].contents[cIndex].quiz_data.answer = i;
                                                  setModulesData(newData);
                                                }}
                                              />
                                              <input
                                                type="text"
                                                placeholder={`Option ${i + 1}`}
                                                value={content.quiz_data?.options?.[i] || ''}
                                                onChange={(e) => {
                                                  const newData = [...modulesData];
                                                  if (!newData[mIndex].lessons[lIndex].contents[cIndex].quiz_data) {
                                                    newData[mIndex].lessons[lIndex].contents[cIndex].quiz_data = { question: '', options: ['', '', '', ''], answer: 0 };
                                                  }
                                                  newData[mIndex].lessons[lIndex].contents[cIndex].quiz_data.options[i] = e.target.value;
                                                  setModulesData(newData);
                                                }}
                                                className="w-full px-3 py-1.5 bg-white border border-blue-100 rounded-md text-xs font-medium focus:outline-none focus:border-blue-300"
                                                required
                                              />
                                            </div>
                                          ))}
                                          <div className="mt-2 pt-3 border-t border-blue-200 flex justify-between items-center">
                                            <span className="text-[11px] text-blue-600 font-medium">Use AI to generate assessment questions for this lesson</span>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setAssessmentPromptTarget({ mIndex, lIndex, cIndex });
                                                setIsAssessmentPromptOpen(true);
                                              }}
                                              disabled={isGeneratingAssessment}
                                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-blue-400 disabled:to-indigo-400 text-white text-xs font-bold rounded-lg shadow-sm hover:shadow transition-all cursor-pointer"
                                            >
                                              {isGeneratingAssessment && assessmentPromptTarget?.mIndex === mIndex && assessmentPromptTarget?.lIndex === lIndex && assessmentPromptTarget?.cIndex === cIndex ? (
                                                <RefreshCw size={13} className="animate-spin" />
                                              ) : (
                                                <Sparkles size={13} />
                                              )}
                                              Generate Assessment
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="flex flex-col gap-2">
                                          <input
                                            type="file"
                                            accept={content.type === 'video' ? 'video/*' : content.type === 'pdf' ? '.pdf' : 'image/*'}
                                            onChange={(e) => {
                                              const newData = [...modulesData];
                                              newData[mIndex].lessons[lIndex].contents[cIndex].file = e.target.files[0];
                                              setModulesData(newData);
                                            }}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 border-dashed rounded-lg text-xs font-medium text-slate-600 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all cursor-pointer"
                                          />
                                          {content.content_url && !content.file && (
                                            <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1 ml-1">
                                              Current File: <a href={`${process.env.REACT_APP_API_URL}${content.content_url}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">View</a>
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                            {module.lessons.length === 0 && (
                              <div className="text-xs font-semibold text-slate-400 italic py-2 pl-2">No lessons added.</div>
                            )}
                          </div>
                        </div>
                      ))}
                      {modulesData.length === 0 && (
                        <div className="text-center py-8 text-sm font-semibold text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                          Click "Add Module" to start building curriculum.
                        </div>
                      )}
                    </div>
                  </div>


                  {/* Final Assessment (Quiz) Section */}
                  <div className="flex flex-col gap-6 pb-8 border-b border-slate-100">
                    <div className="flex justify-between items-center">
                      <h4 className="text-lg font-bold text-navy-900 flex items-center gap-2"><CheckCircle size={18} className="text-blue-500" /> Final Assessment Quiz</h4>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 text-sm font-bold rounded-xl transition-all border border-blue-200"
                          onClick={() => setIsQuizPromptOpen(true)}
                          disabled={isGeneratingQuiz}
                        >
                          {isGeneratingQuiz ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
                          Generate Quiz
                        </button>
                        <button
                          type="button"
                          className="flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 text-sm font-bold rounded-xl transition-all"
                          onClick={() => setQuizQuestionsData([...quizQuestionsData, { question: '', options: ['', '', '', ''], answer: 0 }])}
                        >
                          <Plus size={16} /> Add Question
                        </button>
                      </div>
                    </div>
                    <div className="text-xs font-medium text-slate-500 mb-2">
                      Leave empty to automatically generate the final quiz using AI.
                    </div>

                    <div className="flex flex-col gap-6">
                      {quizQuestionsData.map((q, qIndex) => (
                        <div key={qIndex} className="bg-slate-50 border border-blue-200 rounded-2xl p-5 shadow-sm">
                          <div className="flex justify-between mb-4">
                            <span className="font-bold text-blue-800 text-sm">Question {qIndex + 1}</span>
                            <button type="button" onClick={() => setQuizQuestionsData(quizQuestionsData.filter((_, i) => i !== qIndex))} className="text-coral hover:text-coral-600"><Trash2 size={16} /></button>
                          </div>
                          <div className="flex flex-col gap-4">
                            <input
                              type="text"
                              placeholder="Question text..."
                              value={q.question}
                              onChange={(e) => {
                                const newQ = [...quizQuestionsData];
                                newQ[qIndex] = { ...newQ[qIndex], question: e.target.value };
                                setQuizQuestionsData(newQ);
                              }}
                              className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-navy-900 focus:outline-none focus:border-blue-500 transition-all"
                              required
                            />
                            <div className="flex flex-col gap-2">
                              {q.options.map((opt, oIndex) => (
                                <div key={oIndex} className="flex items-center gap-3">
                                  <input
                                    type="checkbox"
                                    checked={
                                      Array.isArray(q.answer)
                                        ? q.answer.includes(oIndex)
                                        : (Number(q.answer) === oIndex || (q.answer == null && oIndex === 0))
                                    }
                                    onChange={(e) => {
                                      const newQ = [...quizQuestionsData];
                                      const isChecked = e.target.checked;
                                      let currentAnswers = Array.isArray(newQ[qIndex].answer)
                                        ? [...newQ[qIndex].answer]
                                        : (newQ[qIndex].answer != null ? [Number(newQ[qIndex].answer)] : [0]);

                                      if (isChecked) {
                                        if (!currentAnswers.includes(oIndex)) currentAnswers.push(oIndex);
                                      } else {
                                        currentAnswers = currentAnswers.filter((a) => a !== oIndex);
                                      }
                                      newQ[qIndex] = { ...newQ[qIndex], answer: currentAnswers };
                                      setQuizQuestionsData(newQ);
                                    }}
                                    className="cursor-pointer w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 transition-all"
                                  />
                                  <input
                                    type="text"
                                    placeholder={`Option ${oIndex + 1}`}
                                    value={opt}
                                    onChange={(e) => {
                                      const newQ = [...quizQuestionsData];
                                      const newOptions = [...newQ[qIndex].options];
                                      newOptions[oIndex] = e.target.value;
                                      newQ[qIndex] = { ...newQ[qIndex], options: newOptions };
                                      setQuizQuestionsData(newQ);
                                    }}
                                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md text-sm font-medium focus:outline-none focus:border-blue-400"
                                    required
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Settings Section */}
                  <div className="flex flex-col gap-4">
                    <h4 className="text-lg font-bold text-navy-900 flex items-center gap-2"><CheckCircle size={18} className="text-blue-500" /> Final Settings</h4>
                    <label className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl cursor-pointer hover:bg-emerald-100/50 transition-colors">
                      <div className="relative flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={courseFormData.is_expert_validated}
                          onChange={e => setCourseFormData({ ...courseFormData, is_expert_validated: e.target.checked })}
                          className="peer appearance-none w-6 h-6 border-2 border-emerald-200 rounded-md bg-white checked:bg-emerald-500 checked:border-emerald-500 transition-all cursor-pointer"
                        />
                        <Check size={14} className="text-white absolute pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-emerald-800">Expert Approved</span>
                        <span className="text-xs font-semibold text-emerald-600">Mark this course as officially validated and ready for learners.</span>
                      </div>
                    </label>
                  </div>

                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  className="px-6 py-3 bg-white border-2 border-slate-200 hover:bg-slate-100 text-slate-700 text-sm font-bold rounded-xl transition-all"
                  onClick={() => setIsCourseModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
                >
                  Save Course Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quiz Generation Prompt Modal */}
      {isQuizPromptOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-200 p-6">
            <h3 className="text-xl font-bold text-navy-900 mb-2 flex items-center gap-2">
              <Sparkles className="text-blue-500" size={24} /> Generate Quiz
            </h3>
            <p className="text-sm text-slate-500 mb-4 font-medium">How many questions would you like the AI to generate? (Max 50)</p>
            
            <input
              type="number"
              min="1"
              max="50"
              value={quizCountInput}
              onChange={(e) => setQuizCountInput(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-navy-900 focus:outline-none focus:border-blue-500 transition-all mb-6"
            />
            
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-xl transition-all"
                onClick={() => setIsQuizPromptOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm"
                onClick={submitGenerateQuiz}
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lesson Assessment Quiz Generation Prompt Modal */}
      {isAssessmentPromptOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-200 p-6">
            <h3 className="text-xl font-bold text-navy-900 mb-2 flex items-center gap-2">
              <Sparkles className="text-blue-500" size={24} /> Generate Assessment
            </h3>
            <p className="text-sm text-slate-500 mb-4 font-medium">How many questions would you like to generate for this assessment? (Max 50)</p>
            
            <input
              type="number"
              min="1"
              max="50"
              value={assessmentCountInput}
              onChange={(e) => setAssessmentCountInput(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-navy-900 focus:outline-none focus:border-blue-500 transition-all mb-6"
            />
            
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-xl transition-all cursor-pointer"
                onClick={() => setIsAssessmentPromptOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
                disabled={isGeneratingAssessment}
                onClick={submitGenerateAssessment}
              >
                {isGeneratingAssessment ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Generate
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
