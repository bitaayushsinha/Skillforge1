import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, Clock, ShieldCheck, PlayCircle, Loader2, Save, Send, Eye, ShieldAlert, FileText, Maximize2, AlertTriangle, UserCheck } from 'lucide-react';

const enterFullScreen = () => {
  try {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(err => console.log("Fullscreen request blocked or already active:", err));
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen();
    }
  } catch (err) {
    console.error("Error attempting to enable fullscreen:", err);
  }
};

const exitFullScreen = () => {
  try {
    const isFS = document.fullscreenElement || document.webkitFullscreenElement;
    if (isFS) {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(err => console.log("Exit fullscreen error:", err));
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  } catch (err) {
    console.error("Error attempting to exit fullscreen:", err);
  }
};

const ExamPortal = ({ credentialId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [examData, setExamData] = useState(null);
  
  const [examState, setExamState] = useState('compliance'); // 'compliance', 'taking', 'suspended', 'completed'
  const [sessionInfo, setSessionInfo] = useState(null);
  const [questions, setQuestions] = useState([]);
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [savingAnswer, setSavingAnswer] = useState(false);
  
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef(null);
  const [suspensionReason, setSuspensionReason] = useState("");
  
  // Proctoring States
  const [cameraPermission, setCameraPermission] = useState('pending');
  const [liveStatusMessage, setLiveStatusMessage] = useState("Proctoring Active - Clean Frame");
  const [liveStatusType, setLiveStatusType] = useState('clean');
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const faceDetectorRef = useRef(null);
  
  // Refs to avoid stale closures in event listeners
  const examStateRef = useRef(examState);
  const credentialIdRef = useRef(credentialId);
  const lastWarningTimeRef = useRef(0);
  const tabWarningActiveRef = useRef(false);
  const tabCountdownIntervalRef = useRef(null);
  const screenStreamRef = useRef(null);
  const [tabWarningCountdown, setTabWarningCountdown] = useState(5);
  const [tabWarningActive, setTabWarningActive] = useState(false);

  useEffect(() => {
    examStateRef.current = examState;
    credentialIdRef.current = credentialId;
  }, [examState, credentialId]);

  useEffect(() => {
    const verifyCredential = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/v1/exam-engine/credentials/${credentialId}`);
        if (!res.ok) throw new Error('Failed to verify credential. It may be invalid or expired.');
        const data = await res.json();
        if (!data.is_valid) throw new Error(`Credential status: ${data.status.replace(/_/g, ' ')}`);
        setExamData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    verifyCredential();
  }, [credentialId]);

  const logViolation = async (type, message, severity = 1) => {
    try {
      await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/v1/exam-engine/sessions/${credentialIdRef.current}/violations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, message, severity })
      });
    } catch (err) { console.error("Failed to log violation", err); }
  };

  const triggerSuspension = async (type, message) => {
    setSuspensionReason(message);
    setExamState('suspended');
    
    // Stop timers & cameras
    if (timerRef.current) clearInterval(timerRef.current);
    if (tabCountdownIntervalRef.current) clearInterval(tabCountdownIntervalRef.current);
    tabWarningActiveRef.current = false;
    setTabWarningActive(false);
    
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    exitFullScreen();

    try {
      await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/v1/exam-engine/sessions/${credentialIdRef.current}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, message })
      });
    } catch (err) { console.error("Failed to suspend", err); }
  };

  // Timer logic
  useEffect(() => {
    if (examState === 'taking' && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleSubmitExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [examState, timeLeft]);

  // Tab switch & Fullscreen logic
  useEffect(() => {
    if (examState !== 'taking') return;

    const handleCopyPaste = (e) => {
      e.preventDefault();
      logViolation('copy_paste', 'Learner attempted to copy, paste, or use context menu.', 0);
    };

    const handleKeyDown = (e) => {
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        logViolation('screenshot', 'Learner attempted to use PrintScreen key.', 1);
      }
      if ((e.ctrlKey || e.metaKey) && ['s', 'p', 'S', 'P'].includes(e.key)) {
        e.preventDefault();
        logViolation('screenshot', `Learner attempted to use save/print shortcut: ${e.key}`, 1);
      }
    };

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
      logViolation('navigation', 'Learner attempted to close or refresh the tab.', 1);
    };

    const handlePopState = () => {
      logViolation('navigation', 'Learner used browser back/forward buttons.', 1);
      window.history.pushState(null, null, window.location.href);
    };

    const handleTabSwitchAlert = (violationType) => {
      if (tabWarningActiveRef.current) return;
      tabWarningActiveRef.current = true;
      setTabWarningActive(true);
      setTabWarningCountdown(5);
      
      let count = 5;
      if (tabCountdownIntervalRef.current) clearInterval(tabCountdownIntervalRef.current);
      tabCountdownIntervalRef.current = setInterval(() => {
        count -= 1;
        if (count <= 0) {
          clearInterval(tabCountdownIntervalRef.current);
          tabWarningActiveRef.current = false;
          setTabWarningActive(false);
          const msg = violationType === 'fullscreen' ? 'Exited Full Screen and failed to return within 5 seconds.' : 'Failed to return to test window within 5 seconds.';
          triggerSuspension(violationType, msg);
        } else {
          setTabWarningCountdown(count);
        }
      }, 1000);
    };

    const handleReturnToTab = (violationType) => {
      if (tabCountdownIntervalRef.current) {
        clearInterval(tabCountdownIntervalRef.current);
        tabCountdownIntervalRef.current = null;
      }
      tabWarningActiveRef.current = false;
      setTabWarningActive(false);
      const msg = violationType === 'fullscreen' ? 'Returned to Full Screen within 5s.' : 'Returned to test window within 5s.';
      logViolation(violationType, msg);
    };

    const handleVis = () => {
      if (document.hidden) handleTabSwitchAlert('tab_switch');
      else if (tabWarningActiveRef.current) handleReturnToTab('tab_switch');
    };

    const handleBlur = () => handleTabSwitchAlert('tab_switch');
    const handleFocus = () => { if (tabWarningActiveRef.current) handleReturnToTab('tab_switch'); };

    const handleFS = () => {
      const isFS = document.fullscreenElement || document.webkitFullscreenElement;
      if (!isFS) handleTabSwitchAlert('fullscreen');
      else if (tabWarningActiveRef.current) handleReturnToTab('fullscreen');
    };

    document.addEventListener('visibilitychange', handleVis);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('fullscreenchange', handleFS);
    document.addEventListener('webkitfullscreenchange', handleFS);
    document.addEventListener('copy', handleCopyPaste);
    document.addEventListener('paste', handleCopyPaste);
    document.addEventListener('contextmenu', handleCopyPaste);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    
    // Push state so popstate can intercept back button
    window.history.pushState(null, null, window.location.href);

    return () => {
      document.removeEventListener('visibilitychange', handleVis);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('fullscreenchange', handleFS);
      document.removeEventListener('webkitfullscreenchange', handleFS);
      document.removeEventListener('copy', handleCopyPaste);
      document.removeEventListener('paste', handleCopyPaste);
      document.removeEventListener('contextmenu', handleCopyPaste);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
      if (tabCountdownIntervalRef.current) clearInterval(tabCountdownIntervalRef.current);
    };
  }, [examState]);

  // Video AI monitoring
  useEffect(() => {
    let stream = null;
    let monitorInterval = null;

    if (examState === 'taking') {
      navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240, facingMode: 'user' } })
        .then((videoStream) => {
          stream = videoStream;
          if (videoRef.current) videoRef.current.srcObject = videoStream;
          setCameraPermission('granted');
          monitorInterval = setInterval(analyzeVideoFrame, 800);
        })
        .catch((err) => {
          console.error("Camera error:", err);
          setCameraPermission('denied');
          triggerSuspension('hardware', 'Camera access was denied or hardware disconnected.');
        });
    } else {
        if (videoRef.current && videoRef.current.srcObject) {
          videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        }
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach(track => track.stop());
        }
      }

    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
      if (screenStreamRef.current) screenStreamRef.current.getTracks().forEach(track => track.stop());
      if (monitorInterval) clearInterval(monitorInterval);
    };
  }, [examState]);

  const analyzeVideoFrame = async () => {
    if (!videoRef.current || !canvasRef.current || videoRef.current.readyState !== 4 || examStateRef.current !== 'taking') return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = 160;
    canvas.height = 120;
    ctx.drawImage(video, 0, 0, 160, 120);

    let faceDetected = false;
    let faceCount = 0;
    let headTurned = false;

    if (window.FaceDetector) {
      try {
        if (!faceDetectorRef.current) faceDetectorRef.current = new window.FaceDetector({ fastMode: true });
        const faces = await faceDetectorRef.current.detect(canvas);
        faceCount = faces.length;
        if (faceCount > 0) {
          faceDetected = true;
          const box = faces[0].boundingBox;
          const centerX = box.x + (box.width / 2);
          if (centerX < 35 || centerX > 125) headTurned = true;
        }
      } catch (e) {}
    } else {
      // Fallback skin pixel check
      const imageData = ctx.getImageData(0, 0, 160, 120).data;
      let skinPixels = 0;
      for (let i = 0; i < imageData.length; i += 4) {
        const r = imageData[i], g = imageData[i+1], b = imageData[i+2];
        if (r > 95 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 15) skinPixels++;
      }
      if (skinPixels > 150) { faceDetected = true; faceCount = 1; }
      else if (skinPixels < 50) { faceDetected = false; faceCount = 0; }
    }

    const now = Date.now();
    if (now - lastWarningTimeRef.current < 4000) return; // Debounce

    if (!faceDetected || faceCount === 0) {
      lastWarningTimeRef.current = now;
      setLiveStatusMessage("⚠️ Learner Out of Frame");
      setLiveStatusType('error');
      logViolation('body', 'Learner out of camera frame.');
      // After multiple missing frames, could trigger suspension
    } else if (faceCount > 1) {
      lastWarningTimeRef.current = now;
      setLiveStatusMessage("⚠️ Multiple Faces Detected!");
      setLiveStatusType('error');
      triggerSuspension('body', 'Multiple individuals detected in camera frame.');
    } else if (headTurned) {
      lastWarningTimeRef.current = now;
      setLiveStatusMessage("⚠️ Eye/Head deviation detected.");
      setLiveStatusType('warning');
      logViolation('eye', 'Eye or head deviation detected.');
    } else {
      setLiveStatusMessage("Proctoring Active - Clean Frame");
      setLiveStatusType('clean');
    }
  };

  const handleStartExam = async () => {
    setLoading(true);
    try {
      if (examData?.requires_screenshare) {
        try {
          const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
          screenStreamRef.current = stream;
          stream.getVideoTracks()[0].addEventListener('ended', () => {
            triggerSuspension('screen_share', 'Screen sharing was stopped.');
          });
        } catch (e) {
          throw new Error('Screen sharing is required for this exam. Please grant permission to continue.');
        }
      }
      
      enterFullScreen(); // Request before API call
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/v1/exam-engine/sessions/${credentialId}/start`, { method: 'POST' });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Failed to start exam session');
      }
      const data = await res.json();
      setSessionInfo(data);
      setQuestions(data.questions);
      setTimeLeft(data.remaining_seconds !== undefined ? data.remaining_seconds : data.duration_minutes * 60);
      setExamState('taking');
    } catch (err) {
      setError(err.message);
      exitFullScreen();
    } finally {
      setLoading(false);
    }
  };

  const pollForResume = async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/v1/exam-engine/sessions/${credentialId}/status`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'active') {
          if (data.remaining_seconds !== undefined) setTimeLeft(data.remaining_seconds);
          enterFullScreen();
          setExamState('taking');
        } else if (data.status === 'terminated') {
          setExamState('completed'); // It's terminated, so end exam
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    let pollInterval;
    if (examState === 'suspended') {
      pollInterval = setInterval(pollForResume, 5000);
    }
    return () => clearInterval(pollInterval);
  }, [examState]);

  const handleSelectAnswer = async (qId, optIndex) => {
    setAnswers(prev => ({ ...prev, [qId]: optIndex }));
    setSavingAnswer(true);
    try {
      await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/v1/exam-engine/sessions/${credentialId}/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_id: qId, answer: optIndex })
      });
    } catch (err) {} finally { setSavingAnswer(false); }
  };

  const [scoreResult, setScoreResult] = useState(null);

  const handleSubmitExam = async () => {
    if (timeLeft > 0 && !window.confirm("Are you sure you want to submit your exam? You cannot change answers after submitting.")) return;
    
    setLoading(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/v1/exam-engine/sessions/${credentialId}/submit`, {
        method: 'POST'
      });
      const data = await res.json();
      setScoreResult(data);
    } catch (err) {
      console.error(err);
    }
    
    setExamState('completed');
    setLoading(false);
    exitFullScreen();
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
    }
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading && examState === 'compliance') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={48} />
        <p className="text-slate-600 font-medium text-lg animate-pulse">Verifying Exam Credential...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center border-t-4 border-rose-500">
          <div className="bg-rose-100 text-rose-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h2>
          <p className="text-slate-600 mb-8">{error}</p>
          <a href="/" className="inline-block bg-slate-800 text-white font-semibold py-3 px-6 rounded-xl hover:bg-slate-900 transition-colors">
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  if (examState === 'suspended') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-8 text-center border-t-4 border-rose-600">
          <div className="bg-rose-100 text-rose-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldAlert size={32} />
          </div>
          <h2 className="text-2xl font-bold text-rose-700 mb-2">Exam Suspended</h2>
          <p className="text-slate-800 font-medium mb-4">{suspensionReason}</p>
          <p className="text-slate-500 text-sm mb-8">
            Your session has been locked due to a critical proctoring violation. 
            An administrator must review the logs and approve resumption before you can continue.
            The system is polling for clearance automatically...
          </p>
          <div className="flex justify-center"><Loader2 className="animate-spin text-slate-400" size={32} /></div>
        </div>
      </div>
    );
  }

  if (examState === 'completed') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className={`bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center border-t-4 ${scoreResult?.passed ? 'border-emerald-500' : 'border-rose-500'}`}>
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${scoreResult?.passed ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Exam Submitted</h2>
          <p className="text-slate-600 mb-6">Your answers have been securely submitted and sent back to SkillForge.</p>
          
          {scoreResult && (
            <div className="mb-8">
              <div className={`p-4 rounded-xl mb-4 ${scoreResult.passed ? 'bg-emerald-50 text-emerald-900' : 'bg-rose-50 text-rose-900'}`}>
                <div className="text-sm font-bold uppercase tracking-wider mb-1">Score</div>
                <div className="text-4xl font-black">{Math.round(scoreResult.score_percentage)}%</div>
                <div className="text-sm font-semibold mt-1">
                  {scoreResult.level ? `${scoreResult.level} Level: ` : ''}
                  {scoreResult.passed ? 'QUALIFIED / PASSED' : 'NOT QUALIFIED / FAILED'}
                </div>
              </div>
              {scoreResult.topic_breakdown && Object.keys(scoreResult.topic_breakdown).length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Topic-Wise Performance</h4>
                  <div className="space-y-2">
                    {Object.entries(scoreResult.topic_breakdown).map(([topic, stats]) => (
                      <div key={topic} className="flex justify-between items-center text-sm">
                        <span className="font-medium text-slate-700 truncate mr-2">{topic}</span>
                        <span className="text-slate-600 font-mono text-xs">
                          {stats.correct}/{stats.total} ({stats.accuracy}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <a href="/" className="inline-block bg-indigo-600 text-white font-semibold py-3 px-6 rounded-xl hover:bg-indigo-700 transition-colors">
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  if (examState === 'taking') {
    if (questions.length === 0) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center border-t-4 border-amber-500">
            <div className="bg-amber-100 text-amber-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">No Questions Found</h2>
            <p className="text-slate-600 mb-8">This exam does not currently have any questions assigned to its formal question bank. Please notify your administrator to add questions.</p>
            <button 
              onClick={handleSubmitExam} 
              className="inline-block bg-indigo-600 text-white font-semibold py-3 px-6 rounded-xl hover:bg-indigo-700 transition-colors">
              Submit Empty Exam
            </button>
          </div>
        </div>
      );
    }
    
    const currentQ = questions[currentQuestionIndex];
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col select-none">
        
        {/* Fullscreen Violation Warning Overlay */}
        {tabWarningActive && (
          <div className="fixed inset-0 bg-rose-600/95 z-[9999] flex flex-col items-center justify-center text-white">
            <AlertTriangle size={80} className="mb-6 animate-pulse" />
            <h2 className="text-4xl font-bold mb-4 text-center px-4">RETURN TO EXAM WINDOW IMMEDIATELY!</h2>
            <p className="text-xl max-w-2xl text-center mb-8">
              You have left the authorized full-screen examination environment. 
              Your session will be suspended if you do not return in:
            </p>
            <div className="text-8xl font-black">{tabWarningCountdown}s</div>
            <button onClick={enterFullScreen} className="mt-12 bg-white text-rose-600 px-8 py-4 rounded-full font-bold text-xl hover:bg-rose-50 shadow-2xl">
              Return to Full Screen
            </button>
          </div>
        )}

        <header className="bg-indigo-900 text-white py-3 px-6 md:px-8 flex justify-between items-center shadow-md sticky top-0 z-50">
          <div className="font-bold flex items-center gap-3">
            <ShieldCheck className="text-indigo-300" />
            <span>{examData.subject_name} ({examData.level})</span>
          </div>
          
          <div className={`px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 border shadow-inner ${
            liveStatusType === 'clean' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
            liveStatusType === 'warning' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
            'bg-rose-500/20 text-rose-300 border-rose-500/30'
          }`}>
            <UserCheck size={14} /> {liveStatusMessage}
          </div>

          <div className="flex items-center gap-4">
            {savingAnswer && <span className="text-xs text-indigo-300 flex items-center gap-1"><Save size={12} className="animate-pulse" /> Saving...</span>}
            <div className={`font-mono text-lg font-bold flex items-center gap-2 bg-indigo-800/50 py-1.5 px-4 rounded-lg ${timeLeft < 300 ? 'text-rose-400' : 'text-emerald-400'}`}>
              <Clock size={18} /> {formatTime(timeLeft)}
            </div>
          </div>
        </header>
        
        <main className="flex-1 flex w-full max-w-7xl mx-auto overflow-hidden">
          {/* Question List Sidebar */}
          <div className="w-64 bg-white border-r border-slate-200 overflow-y-auto hidden md:block">
            {/* Live Camera Feed */}
            <div className="p-4 border-b border-slate-100 bg-slate-900 flex justify-center relative">
              <video 
                ref={videoRef} 
                autoPlay 
                muted 
                playsInline 
                className="w-full h-auto rounded-lg shadow-inner bg-black border border-slate-700" 
                style={{ transform: 'scaleX(-1)' }} 
              />
              <canvas ref={canvasRef} className="hidden" />
              {cameraPermission !== 'granted' && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 rounded-lg">
                  <Loader2 className="animate-spin text-slate-400" />
                </div>
              )}
            </div>

            <div className="p-4 border-b border-slate-100 font-bold text-slate-700">Questions Overview</div>
            <div className="p-4 grid grid-cols-4 gap-2">
              {questions.map((q, idx) => {
                const isAnswered = answers[q.id] !== undefined;
                const isCurrent = idx === currentQuestionIndex;
                return (
                  <button 
                    key={q.id}
                    onClick={() => setCurrentQuestionIndex(idx)}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold transition-all
                      ${isCurrent ? 'ring-2 ring-indigo-600 ring-offset-1' : ''}
                      ${isAnswered ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}
                    `}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Main Question Area */}
          <div className="flex-1 overflow-y-auto bg-slate-50 p-6 md:p-12 flex flex-col items-center relative">
            <div className="w-full max-w-3xl">
              <div className="flex justify-between items-end mb-6">
                <h2 className="text-lg font-bold text-slate-500 uppercase tracking-wider">Question {currentQuestionIndex + 1} of {questions.length}</h2>
              </div>
              
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-6 relative">
                <p className="text-xl text-slate-800 font-medium leading-relaxed mb-8">{currentQ.text}</p>
                <div className="space-y-3">
                  {currentQ.options.map((opt, oIdx) => {
                    const isSelected = answers[currentQ.id] === oIdx;
                    return (
                      <div 
                        key={oIdx}
                        onClick={() => handleSelectAnswer(currentQ.id, oIdx)}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-4
                          ${isSelected ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-sm' : 'border-slate-100 bg-white hover:border-indigo-200 hover:bg-slate-50'}
                        `}
                      >
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors
                          ${isSelected ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'}
                        `}>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                        <span className="font-medium">{opt}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <button 
                  disabled={currentQuestionIndex === 0}
                  onClick={() => setCurrentQuestionIndex(prev => prev - 1)}
                  className="px-6 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 bg-slate-100 transition-colors disabled:opacity-50"
                >
                  Previous
                </button>
                
                {currentQuestionIndex === questions.length - 1 ? (
                  <button 
                    onClick={handleSubmitExam}
                    className="px-8 py-2.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition-all flex items-center gap-2"
                  >
                    Submit Exam <Send size={18} />
                  </button>
                ) : (
                  <button 
                    onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                    className="px-8 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition-all"
                  >
                    Next
                  </button>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // default: compliance state
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 py-4 px-6 md:px-12 flex justify-between items-center shadow-sm">
        <div className="font-bold text-xl text-indigo-900 flex items-center gap-2">
          <ShieldCheck className="text-indigo-600" />
          SkillForge Formal Examination
        </div>
        <div className="text-sm font-medium text-slate-500 bg-slate-100 py-1.5 px-3 rounded-full flex items-center gap-2">
          <Clock size={14} /> Time Window Strict Enforcement
        </div>
      </header>
      
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="bg-white max-w-2xl w-full rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="bg-indigo-600 p-8 text-white">
            <h1 className="text-3xl font-bold mb-2">{examData?.subject_name}</h1>
            <p className="text-indigo-100 font-medium text-lg">Level: {examData?.level}</p>
          </div>
          
          <div className="p-8">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-8">
              <h3 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
                <ShieldCheck size={20} className="text-blue-600" /> Pre-Exam Compliance Verification
              </h3>
              <ul className="space-y-3 text-sm text-blue-800">
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center shrink-0 text-blue-700 font-bold mt-0.5">1</div>
                  <span>Ensure you are in a quiet, well-lit room. Your webcam will be monitored.</span>
                </li>
                {examData?.requires_screenshare && (
                  <li className="flex items-start gap-2 text-indigo-700 font-semibold bg-indigo-50 p-2 rounded-lg border border-indigo-100">
                    <div className="w-5 h-5 rounded-full bg-indigo-200 flex items-center justify-center shrink-0 text-indigo-800 font-bold mt-0.5">!</div>
                    <span>This exam requires you to share your screen. You will be prompted to select 'Entire Screen' when you click Start.</span>
                  </li>
                )}
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center shrink-0 text-blue-700 font-bold mt-0.5">2</div>
                  <span>Leaving full-screen or switching tabs will suspend the exam and require Admin approval.</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center shrink-0 text-blue-700 font-bold mt-0.5">3</div>
                  <span>Copy, paste, and right-click are strictly disabled.</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center shrink-0 text-blue-700 font-bold mt-0.5">4</div>
                  <span>By proceeding, you agree to the Academic Integrity Honor Code.</span>
                </li>
              </ul>
            </div>
            
            <div className="flex justify-between items-center border-t border-slate-100 pt-6">
              <div className="text-sm text-slate-500">
                Candidate: <span className="font-bold text-slate-800">{examData?.student_name}</span>
              </div>
              <button 
                onClick={handleStartExam}
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl shadow-md transition-all flex items-center gap-2 hover:shadow-lg disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : 'Start Exam'} <PlayCircle size={18} />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ExamPortal;
