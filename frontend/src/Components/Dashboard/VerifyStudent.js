import React, { useState, useEffect } from 'react';
import { ShieldCheck, Search, ArrowLeft, Loader2, Award, User, Calendar, ExternalLink } from 'lucide-react';

const VerifyStudent = ({ studentId: initialStudentId }) => {
  const [studentId, setStudentId] = useState(initialStudentId || '');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [studentData, setStudentData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (studentId) {
      handleVerification(studentId);
    }
  }, [studentId]);

  const handleVerification = async (idToVerify) => {
    try {
      setLoading(true);
      setError(false);
      setStudentData(null);
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/verify/student/${idToVerify}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.valid) {
          setStudentData(data);
        } else {
          setError(true);
        }
      } else {
        setError(true);
      }
    } catch (err) {
      console.error("Verification error:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleManualSearch = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setStudentId(searchInput.trim());
      window.history.pushState({}, '', `/verify-student/${searchInput.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center py-16 px-6 relative overflow-hidden font-sans">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
      
      <div className="flex flex-col items-center gap-3 mb-12 z-10 text-center">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
          <User size={24} />
        </div>
        <h1 className="text-3xl font-black tracking-wider bg-gradient-to-r from-white via-slate-200 to-blue-400 bg-clip-text text-transparent mt-2">
          Student Credential Lookup
        </h1>
        <p className="text-slate-400 mt-2 max-w-lg">Verify the authenticity of a student's learning records and earned certificates by entering their Student ID or Registration Number.</p>
      </div>

      <div className="w-full max-w-2xl z-10 mb-8">
        <form onSubmit={handleManualSearch} className="flex gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Enter Student ID or Registration No..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-900/80 border border-slate-700 rounded-xl text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono shadow-xl backdrop-blur-xl"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold rounded-xl shadow-md transition-all whitespace-nowrap"
          >
            Lookup
          </button>
        </form>
      </div>

      {loading && (
        <div className="mt-8 flex flex-col items-center z-10">
          <Loader2 size={48} className="animate-spin text-blue-400 mb-4" />
          <p className="text-slate-400">Querying cryptographic ledger...</p>
        </div>
      )}

      {!loading && error && studentId && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center max-w-md w-full z-10 animate-in zoom-in-95 duration-300">
          <p className="text-red-400 font-bold mb-2">Student Not Found</p>
          <p className="text-slate-400 text-sm">We could not find any records for ID <span className="font-mono text-white">{studentId}</span>.</p>
        </div>
      )}

      {!loading && studentData && (
        <div className="w-full max-w-3xl z-10 animate-in slide-in-from-bottom-8 duration-500">
          <div className="bg-slate-900/90 border border-blue-500/30 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-400 to-indigo-500"></div>
            
            <div className="flex items-center gap-4 mb-8 border-b border-slate-800 pb-6">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center text-blue-400">
                <User size={32} />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
                  <ShieldCheck size={14} /> Verified Student Record
                </div>
                <h2 className="text-2xl font-black text-white">{studentData.student_name}</h2>
                <p className="text-slate-400 text-sm font-mono mt-1">ID: {studentData.student_id}</p>
              </div>
            </div>

            <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
              <Award size={18} className="text-blue-400" /> Earned Certificates ({studentData.certificates.length})
            </h3>
            
            <div className="space-y-4">
              {studentData.certificates.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No certificates issued for this student yet.</p>
              ) : (
                studentData.certificates.map((cert) => (
                  <div key={cert.certificate_id} className="bg-slate-950/60 rounded-xl p-5 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-white mb-1">{cert.course_name}</h4>
                      <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-slate-400">
                        <span className="flex items-center gap-1"><Calendar size={12}/> {cert.issue_date}</span>
                        <span className="text-slate-600">•</span>
                        <span>ID: {cert.certificate_id}</span>
                        <span className="text-slate-600">•</span>
                        <span className={cert.status === 'valid' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                          {cert.status === 'valid' ? 'Valid & Active' : 'Pending Confirmation'}
                        </span>
                      </div>
                    </div>
                    <a 
                      href={`/verify/${cert.certificate_id}`}
                      target="_blank"
                      rel="noopener noreferrer" 
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors whitespace-nowrap"
                    >
                      View Cert <ExternalLink size={14} />
                    </a>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="mt-6 text-center">
            <a href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
              <ArrowLeft size={16} /> Back to SkillForge Home
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerifyStudent;
