import React, { useState, useEffect } from 'react';
import { Award, CheckCircle2, XCircle, ShieldCheck, Calendar, User, BookOpen, ExternalLink, ArrowLeft, Loader2, QrCode, Search } from 'lucide-react';
import { getCertificateHTML } from './certificateTemplate';

const VerifyCertificate = ({ certId: initialCertId }) => {
  const [certId, setCertId] = useState(initialCertId || '');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [certData, setCertData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (certId) {
      handleVerification(certId);
    }
  }, [certId]);

  const handleVerification = async (idToVerify) => {
    try {
      setLoading(true);
      setError(false);
      setCertData(null);
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/verify/${idToVerify}`, {
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.valid) {
          setCertData(data);
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
      setCertId(searchInput.trim());
      // Update URL without reloading
      window.history.pushState({}, '', `/verify/${searchInput.trim()}`);
    }
  };

  const handlePrint = () => {
    if (!certData) return;
    const certificate = {
      ...certData,
      qr_code_path: certData.qr_code_path || `http://localhost:8000/uploads/qrcodes/${certData.certificate_id || certId}.png`
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
      alert('Please allow popups to view the certificate.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-6 relative overflow-hidden font-sans">
      {/* Background glowing effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDelay: '1s' }}></div>

      {/* Header Logo */}
      <div className="flex items-center gap-3 mb-8 z-10">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-teal-500/20">
          <Award size={22} className="animate-bounce" style={{ animationDuration: '3s' }} />
        </div>
        <span className="text-2xl font-black tracking-wider bg-gradient-to-r from-white via-slate-200 to-teal-400 bg-clip-text text-transparent">
          SKILLFORGE
        </span>
      </div>

      {loading ? (
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-12 max-w-md w-full text-center shadow-2xl backdrop-blur-xl flex flex-col items-center justify-center z-10">
          <Loader2 size={48} className="animate-spin text-teal-400 mb-6" />
          <h2 className="text-xl font-bold text-slate-200 mb-2">Verifying Credential...</h2>
          <p className="text-slate-400 text-sm">Checking cryptographic signatures and SkillForge ledger records for ID: <span className="text-teal-400 font-mono">{certId}</span></p>
        </div>
      ) : error || !certData ? (
        <div className="bg-slate-900/80 border border-slate-700/50 rounded-3xl p-10 max-w-md w-full text-center shadow-2xl backdrop-blur-xl z-10 animate-in zoom-in-95 duration-300">
          {error && certId && (
            <div className="mb-8">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-red-400 border border-red-500/20">
                <XCircle size={32} />
              </div>
              <h2 className="text-xl font-black text-white mb-2">Invalid Certificate</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                We could not verify ID <span className="text-red-400 font-mono font-bold bg-red-950/40 px-2 py-0.5 rounded border border-red-500/20">{certId}</span>.
              </p>
            </div>
          )}
          
          <h2 className="text-2xl font-black text-white mb-4">{certId ? 'Try Another ID' : 'Verify a Certificate'}</h2>
          <form onSubmit={handleManualSearch} className="flex flex-col gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Enter Certificate ID..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-950/50 border border-slate-700 rounded-xl text-white outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all font-mono"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-600 hover:to-blue-600 text-white font-bold rounded-xl transition-all shadow-md flex justify-center items-center gap-2"
            >
              <ShieldCheck size={18} /> Verify Now
            </button>
          </form>
          
          <a
            href="/"
            className="inline-flex items-center justify-center gap-2 w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all border border-slate-700 shadow-md"
          >
            <ArrowLeft size={18} /> Return to SkillForge Home
          </a>
        </div>
      ) : (
        <div className="bg-slate-900/90 border border-teal-500/30 rounded-3xl max-w-lg w-full p-8 sm:p-10 shadow-2xl shadow-teal-950/50 backdrop-blur-xl z-10 animate-in zoom-in-95 duration-300 relative">
          {/* Top green glow bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-400 via-emerald-400 to-blue-500"></div>

          <div className="flex flex-col items-center text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black tracking-widest uppercase mb-6 shadow-sm">
              <ShieldCheck size={16} /> Verified Credential
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-black text-white mb-2 leading-tight">
              {certData.course_name}
            </h1>
            <p className="text-slate-400 text-sm">Certificate of Completion • Expert Validated</p>
          </div>

          <div className="bg-slate-950/60 rounded-2xl p-6 border border-slate-800/80 mb-8 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <User size={14} className="text-teal-400" /> Awarded To
              </span>
              <span className="font-bold text-white text-base font-serif italic">
                {certData.learner_name}
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Calendar size={14} className="text-teal-400" /> Issue Date
              </span>
              <span className="font-semibold text-slate-200 text-sm">
                {certData.issue_date}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Award size={14} className="text-teal-400" /> Certificate ID
              </span>
              <span className="font-mono font-bold text-teal-400 text-xs bg-teal-950/50 px-2.5 py-1 rounded border border-teal-500/20">
                {certData.certificate_id}
              </span>
            </div>
          </div>

          {certData.qr_code_path && (
            <div className="flex items-center justify-between gap-4 p-4 bg-slate-950/40 rounded-2xl border border-slate-800/60 mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-xl shrink-0">
                  <img 
                    src={certData.qr_code_path.startsWith('http') ? certData.qr_code_path : `http://localhost:8000${certData.qr_code_path}`} 
                    alt="QR Code" 
                    className="w-14 h-14 object-contain"
                  />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <QrCode size={14} className="text-teal-400" /> Authentic Cryptographic QR
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Scan from mobile device to verify instantly</div>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-teal-500/20 transition-all text-sm"
            >
              <ExternalLink size={16} /> View & Print Certificate
            </button>
            <a
              href="/"
              className="flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold rounded-xl transition-all text-sm border border-slate-700"
            >
              Home
            </a>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-slate-500 z-10">
        © {new Date().getFullYear()} SkillForge Learning Platforms Inc. • Cryptographically Verified Ledger
      </div>
    </div>
  );
};

export default VerifyCertificate;
