import React, { useState, useEffect } from 'react';
import { Award, X, MessageSquareWarning, Send, ArrowLeft } from 'lucide-react';
import { getCertificateHTML } from './certificateTemplate';

const CertificateModal = ({ user, course, onClose, onShowToast, onSuccess }) => {
  const [isContacting, setIsContacting] = useState(false);
  const [issueMessage, setIssueMessage] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  
  const [displayDetails, setDisplayDetails] = useState({
    name: user?.name || user?.username || 'Learner Name',
    email: user?.email || 'learner@example.com',
    courseName: course?.title || 'Course Title'
  });

  useEffect(() => {
    const issues = JSON.parse(localStorage.getItem('sf_certificate_issues') || '[]');
    const userEmail = user?.email || 'learner@example.com';
    const resolvedIssue = issues.find(i => i.original_email === userEmail && i.course_id === course?.id && i.status === 'resolved');
    
    if (resolvedIssue) {
      setDisplayDetails({
        name: resolvedIssue.learner_name,
        email: resolvedIssue.learner_email,
        courseName: resolvedIssue.course_name
      });
    }
  }, [user, course]);

  const handleSubmitIssue = (e) => {
    e.preventDefault();
    if (!issueMessage.trim()) return;
    
    const existingIssues = JSON.parse(localStorage.getItem('sf_certificate_issues') || '[]');
    const newIssue = {
      id: Date.now(),
      type: 'certificate_issue',
      original_email: user?.email || 'learner@example.com',
      course_id: course?.id,
      learner_name: user?.name || user?.username || 'Learner Name',
      learner_email: user?.email || 'learner@example.com',
      course_name: course?.title || 'Course Title',
      issue_description: issueMessage,
      status: 'pending',
      created_at: new Date().toISOString()
    };
    localStorage.setItem('sf_certificate_issues', JSON.stringify([...existingIssues, newIssue]));

    if (onShowToast) {
      onShowToast('Your message is delivered to our team we will get back within 24hrs');
    }
    onClose();
  };

  const saveCertificateToDB = async () => {
    if (!user || !course) return null;
    try {
      const token = localStorage.getItem('sf_token');
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/certificates/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          user_id: user.id,
          course_id: course.id,
          course_name: course.title,
          completion_percentage: 100,
          assessment_status: 'passed'
        })
      });
      if (!res.ok) throw new Error('Failed to generate certificate');
      const data = await res.json();
      setIsSaved(true);
      return data;
    } catch (err) {
      console.error('Failed to save certificate', err);
      return null;
    }
  };

  const handleDownload = async () => {
    const today = new Date();
    const dateString = `${String(today.getDate()).padStart(2, '0')} / ${String(today.getMonth() + 1).padStart(2, '0')} / ${today.getFullYear()}`;
    
    const cert = await saveCertificateToDB();
    const certId = cert?.certificate_id || cert?.cert_id || `SF-${course?.id || 1}-2026-0001`;
    const qrUrl = cert?.qr_code_path || `http://localhost:8000/uploads/qrcodes/${certId}.png`;
    const issueDate = cert?.issue_date || dateString;

    const certificate = {
      ...(cert || {}),
      learner_name: displayDetails.name,
      course_name: displayDetails.courseName,
      issue_date: issueDate,
      certificate_id: certId,
      qr_code_path: qrUrl.startsWith('http') ? qrUrl : `http://localhost:8000${qrUrl.startsWith('/') ? '' : '/'}${qrUrl}`
    };

    console.log(certificate.qr_code_path);

    const htmlContent = getCertificateHTML({
      ...certificate,
      qr_code_path: certificate.qr_code_path
    });

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
      };
    } else {
      if (onShowToast) onShowToast('Please allow popups to download the certificate.');
    }
    
    if (onShowToast) {
      onShowToast('Certificate generated successfully!');
    }
    // We do not redirect automatically anymore
  };

  return (
    <div className="fixed inset-0 bg-navy-900/40 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl relative animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh] flex flex-col">
        
        {/* Close Button */}
        <button 
          className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors" 
          onClick={onClose}
        >
          <X size={20} />
        </button>

        {!isContacting ? (
          <>
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-4 shadow-sm border border-blue-100">
                <Award size={32} />
              </div>
              <h2 className="text-2xl font-bold text-navy-900 mb-2">Get Certificate</h2>
              <p className="text-sm font-medium text-slate-500 px-4">
                Verify your details to issue your course completion certificate.
              </p>
            </div>

            <form className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                <input 
                  type="text" 
                  value={displayDetails.name} 
                  readOnly 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 cursor-not-allowed focus:outline-none" 
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                <input 
                  type="email" 
                  value={displayDetails.email} 
                  readOnly 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 cursor-not-allowed focus:outline-none" 
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Course Completed</label>
                <input 
                  type="text" 
                  value={displayDetails.courseName} 
                  readOnly 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 cursor-not-allowed focus:outline-none" 
                />
              </div>
              
              <div className="flex flex-col gap-3 mt-4">
                <button 
                  type="button" 
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5" 
                  onClick={async () => {
                    const today = new Date();
                    const dateString = `${String(today.getDate()).padStart(2, '0')} / ${String(today.getMonth() + 1).padStart(2, '0')} / ${today.getFullYear()}`;
                    await saveCertificateToDB(dateString);
                    if (onSuccess) onSuccess();
                    else onClose();
                  }}
                >
                  Certificate
                </button>
                <button 
                  type="button" 
                  className="w-full py-3 text-sm font-semibold text-slate-500 hover:text-navy-900 underline decoration-slate-300 underline-offset-4 transition-colors" 
                  onClick={() => setIsContacting(true)}
                >
                  Contact team (Details Incorrect?)
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
            <div className="flex flex-col items-center text-center mb-8 relative">
              <button 
                type="button"
                className="absolute left-0 top-0 w-10 h-10 flex items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors" 
                onClick={() => setIsContacting(false)}
                title="Go back"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="w-16 h-16 rounded-2xl bg-coral/10 flex items-center justify-center text-coral mb-4 shadow-sm border border-coral/20 mt-2">
                <MessageSquareWarning size={32} />
              </div>
              <h2 className="text-2xl font-bold text-navy-900 mb-2">Report an Issue</h2>
              <p className="text-sm font-medium text-slate-500 px-2">
                Let us know what details are incorrect, and our team will fix it for you.
              </p>
            </div>

            <form className="flex flex-col gap-6" onSubmit={handleSubmitIssue}>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Issue Description</label>
                <textarea 
                  value={issueMessage}
                  onChange={(e) => setIssueMessage(e.target.value)}
                  placeholder="E.g., My name is misspelled, it should be..."
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-coral/20 focus:border-coral transition-all resize-y min-h-[120px]"
                  required
                />
              </div>
              <div className="pt-2 border-t border-slate-100">
                <button 
                  type="submit" 
                  className="w-full flex items-center justify-center gap-2 py-3.5 bg-coral hover:bg-coral-hover text-white text-sm font-bold rounded-xl shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5"
                >
                  <Send size={18} /> Submit Issue
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default CertificateModal;
