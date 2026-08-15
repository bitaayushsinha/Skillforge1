import React, { useState, useEffect } from 'react';
import { Award, Target, TrendingUp, Trophy, Globe, CheckCircle2, Share2, Download, ShieldCheck, Lock, Trash2, Eye, CreditCard, Sparkles, AlertCircle, Clock, BookOpen, ChevronRight } from 'lucide-react';
import { getCertificateHTML } from './certificateTemplate';

const Certifications = ({ user }) => {
  const [certificates, setCertificates] = useState([]);
  const [registration, setRegistration] = useState(null);
  const [subjectsProgress, setSubjectsProgress] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [targetTier, setTargetTier] = useState('State');
  const [paying, setPaying] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchAllData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('sf_token') || localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

      const [certRes, regRes, progRes] = await Promise.all([
        fetch(`${API_URL}/api/certificates/${user.id}`, { headers }),
        fetch(`${API_URL}/api/learning/my-registration`, { headers }),
        fetch(`${API_URL}/api/learning/subjects-progress`, { headers }),
      ]);

      if (certRes.ok) setCertificates(await certRes.json());
      if (regRes.ok) {
        const regData = await regRes.json();
        setRegistration(regData);
        if (regData?.current_tier === 'District') setTargetTier('State');
        else if (regData?.current_tier === 'State') setTargetTier('National');
      }
      if (progRes.ok) {
        const progData = await progRes.json();
        setSubjectsProgress(progData || []);
        if (progData?.length > 0 && !selectedSubjectId) {
          setSelectedSubjectId(progData[0].subject_id);
        }
      }
    } catch (err) {
      console.error("Error fetching certifications data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [user]);

  const handleDelete = async (certId) => {
    if (!window.confirm("Are you sure you want to delete this certificate?")) return;
    try {
      const response = await fetch(`${API_URL}/api/certificates/${certId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setCertificates(prev => prev.filter(c => c.id !== certId && c.certificate_id !== certId));
        showToast("Certificate deleted successfully");
      }
    } catch (err) {
      console.error("Failed to delete certificate", err);
    }
  };

  const handleDownload = (cert) => {
    const certId = cert.certificate_id || cert.cert_id || '';
    const htmlContent = getCertificateHTML(user?.name || user?.username || 'Learner Name', cert.course_name, cert.issue_date, certId, cert.qr_code_path);
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
      showToast('Please allow popups to download the certificate.');
    }
  };

  const handleView = (cert) => {
    const certId = cert.certificate_id || cert.cert_id || '';
    const htmlContent = getCertificateHTML(user?.name || user?.username || 'Learner Name', cert.course_name, cert.issue_date, certId, cert.qr_code_path);
    const viewWindow = window.open('', '_blank');
    if (viewWindow) {
      viewWindow.document.open();
      viewWindow.document.write(htmlContent);
      viewWindow.document.close();
      viewWindow.onload = () => {
        viewWindow.focus();
      };
    } else {
      showToast('Please allow popups to view the certificate.');
    }
  };

  const handlePaymentUnlock = async () => {
    if (!registration) return;
    setPaying(true);
    try {
      const token = localStorage.getItem('sf_token') || localStorage.getItem('token');
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      };

      // 1. Create order
      const orderRes = await fetch(`${API_URL}/api/payments/create-order`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          registration_id: registration.id,
          target_tier: targetTier
        })
      });

      if (!orderRes.ok) {
        const errData = await orderRes.json();
        throw new Error(errData.detail || 'Failed to create payment order');
      }

      const orderData = await orderRes.json();

      // 2. Launch Razorpay Checkout
      const options = {
        key: orderData.key_id || process.env.REACT_APP_RAZORPAY_KEY_ID || 'rzp_test_TDQGFCm2xKMtfk',
        amount: orderData.amount * 100, // Amount is in currency subunits (paise)
        currency: orderData.currency || "INR",
        name: "SkillForge LMS",
        description: `Unlock ${targetTier} Level`,
        order_id: orderData.order_id,
        handler: async function (response){
            try {
              const verifyRes = await fetch(`${API_URL}/api/payments/verify`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                  registration_id: registration.id,
                  target_tier: targetTier,
                  order_id: response.razorpay_order_id,
                  payment_id: response.razorpay_payment_id,
                  signature: response.razorpay_signature
                })
              });

              if (!verifyRes.ok) {
                const errData = await verifyRes.json();
                throw new Error(errData.detail || 'Payment verification failed');
              }

              showToast(`🎉 Successfully unlocked ${targetTier} Level! Access extended.`);
              setShowPaymentModal(false);
              fetchAllData();
            } catch (err) {
              showToast(`Error: ${err.message}`);
            } finally {
              setPaying(false);
            }
        },
        prefill: {
            name: user?.name || "Learner",
            email: user?.email || "learner@example.com",
            contact: "9999999999"
        },
        theme: {
            color: "#E94E4E"
        }
      };
      const rzp1 = new window.Razorpay(options);
      rzp1.on('payment.failed', function (response){
              showToast(`Payment failed: ${response.error.description}`);
              setPaying(false);
      });
      rzp1.open();
      
    } catch (err) {
      showToast(`Error: ${err.message}`);
      setPaying(false);
    }
  };

  const pricingMap = {
    State: { base: 1500, gst: 270, total: 1770 },
    National: { base: 2000, gst: 360, total: 2360 }
  };
  const pricing = pricingMap[targetTier] || pricingMap.State;

  const badgeConfig = {
    Bronze: {
      color: 'from-amber-600 to-amber-800 text-amber-100 border-amber-500/30',
      icon: '🥉',
      title: 'District Bronze Scholar',
      desc: 'Earned by passing District Exam (Score ≥ 50%)'
    },
    Silver: {
      color: 'from-slate-400 to-slate-600 text-slate-100 border-slate-300/40',
      icon: '🥈',
      title: 'State Silver Merit Badge',
      desc: 'Earned by passing State Exam (Score ≥ 60%)'
    },
    Gold: {
      color: 'from-yellow-500 to-amber-600 text-yellow-100 border-yellow-300/50',
      icon: '🥇',
      title: 'National Gold Excellence Badge',
      desc: 'Earned by passing National Exam (Score ≥ 80%)'
    }
  };

  const computedBadgeTier = registration?.badge_tier || (
    certificates.some(c => c.course_name?.includes('National')) ? 'Gold' :
    certificates.some(c => c.course_name?.includes('State Merit')) ? 'Silver' :
    certificates.some(c => c.course_name?.includes('District Qualification')) ? 'Bronze' : null
  );
  const currentBadge = computedBadgeTier ? badgeConfig[computedBadgeTier] : null;

  const hasStatePass = registration?.current_tier === 'State' || registration?.current_tier === 'National';
  const selectedSubject = subjectsProgress.find(s => s.subject_id === selectedSubjectId);

  const ScoreGauge = ({ score, size = 80 }) => {
    const pct = Math.min(100, Math.max(0, score || 0));
    const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#6366f1' : pct >= 50 ? '#f59e0b' : '#ef4444';
    const r = 34; const circ = 2 * Math.PI * r;
    return (
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg viewBox="0 0 80 80" width={size} height={size} className="-rotate-90">
          <circle cx="40" cy="40" r={r} fill="none" stroke="#f1f5f9" strokeWidth="8" />
          <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={`${(pct / 100) * circ} ${circ}`} strokeLinecap="round" />
        </svg>
        <span className="absolute text-sm font-black" style={{ color }}>{pct.toFixed(0)}%</span>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 no-scrollbar bg-slate-50 relative">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[1000] bg-navy-900 text-white px-6 py-3.5 rounded-2xl shadow-2xl border border-white/10 animate-in slide-in-from-bottom-5 flex items-center gap-2 font-medium">
          <Sparkles size={18} className="text-coral" />
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-navy-900 mb-2">Certification & Progression Center</h1>
          <p className="text-slate-500">Per-subject exam results, tier advancement, and verified credentials</p>
        </div>
        <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm shrink-0">
          <Globe size={18} className="text-navy" /> Public Profile
        </button>
      </div>

      {/* ── Per-Subject Progression Panel ── */}
      {subjectsProgress.length > 0 && (
        <div className="mb-10">
          <h2 className="text-lg font-bold text-navy-900 mb-4 flex items-center gap-2">
            <BookOpen size={18} className="text-purple-600" /> Subject-Level Exam Progression
          </h2>

          {/* Subject Tabs */}
          <div className="flex gap-2 flex-wrap mb-5">
            {subjectsProgress.map(sp => (
              <button
                key={sp.subject_id}
                onClick={() => setSelectedSubjectId(sp.subject_id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  selectedSubjectId === sp.subject_id
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-purple-50 hover:text-purple-700'
                }`}
              >
                {sp.subject_name}
                {sp.passed && <span className="ml-1.5 text-emerald-300">✓</span>}
              </button>
            ))}
          </div>

          {/* Selected Subject Detail Card */}
          {selectedSubject && (
            <div className="bg-gradient-to-br from-navy-900 via-navy-800 to-indigo-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-48 h-48 bg-coral/10 rounded-full blur-3xl" />

              {/* Subject header */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-7 relative z-10">
                <div>
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border mb-3 ${
                    selectedSubject.passed
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : selectedSubject.has_result
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        : 'bg-slate-500/20 text-slate-300 border-slate-500/30'
                  }`}>
                    {selectedSubject.passed ? <><CheckCircle2 size={13} /> District Qualified</> :
                     selectedSubject.has_result ? <><AlertCircle size={13} /> Not Yet Passed</> :
                     <><Clock size={13} /> No Result Yet</>}
                  </div>
                  <h2 className="text-xl font-black mb-0.5">{selectedSubject.subject_name}</h2>
                  <p className="text-slate-400 text-xs">Code: {selectedSubject.subject_code} · Tier: {selectedSubject.tier}</p>
                </div>

                {selectedSubject.passed && !hasStatePass && (
                  <button
                    onClick={() => { setTargetTier('State'); setShowPaymentModal(true); }}
                    className="px-5 py-3 bg-gradient-to-r from-coral to-orange-500 hover:from-coral/90 hover:to-orange-600 text-white font-extrabold text-sm rounded-2xl shadow-lg transition-all flex items-center gap-2 shrink-0"
                  >
                    <CreditCard size={16} /> Unlock State Tier (₹1,770 INR)
                  </button>
                )}
              </div>

              {/* Score + Milestone Row */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative z-10">
                {/* Score Gauge */}
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 flex flex-col items-center justify-center">
                  {selectedSubject.has_result ? (
                    <>
                      <ScoreGauge score={selectedSubject.best_score} size={80} />
                      <p className="text-xs text-slate-300 mt-2 text-center">Best Score</p>
                      <span className={`text-xs font-bold mt-1 px-2 py-0.5 rounded-full ${
                        selectedSubject.passed ? 'bg-emerald-500/30 text-emerald-300' : 'bg-rose-500/30 text-rose-300'
                      }`}>
                        {selectedSubject.best_pass_fail === 'PASS' || selectedSubject.best_pass_fail === 'pass' ? 'PASS' : 'FAIL'}
                      </span>
                    </>
                  ) : (
                    <div className="text-center py-2">
                      <BookOpen size={32} className="text-slate-400 mx-auto mb-2" />
                      <p className="text-xs text-slate-400">No exam<br/>result yet</p>
                    </div>
                  )}
                </div>

                {/* Milestone 1 */}
                <div className={`rounded-2xl p-4 border ${selectedSubject.passed ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-white/10 border-white/15'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Milestone 1</span>
                    {selectedSubject.passed ? <CheckCircle2 size={16} className="text-emerald-400" /> : <Target size={16} className="text-slate-400" />}
                  </div>
                  <h4 className="font-bold text-sm">District Level</h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">Score ≥ 50% · Bronze Badge</p>
                  {selectedSubject.best_score != null && (
                    <p className="text-[11px] text-white/70 mt-1 font-semibold">
                      Your score: {selectedSubject.best_score?.toFixed(1)}%
                    </p>
                  )}
                  {selectedSubject.attempt_count > 0 && (
                    <p className="text-[11px] text-slate-400 mt-0.5">{selectedSubject.attempt_count} attempt(s)</p>
                  )}
                </div>

                {/* Milestone 2 */}
                <div className={`rounded-2xl p-4 border ${hasStatePass ? 'bg-emerald-500/20 border-emerald-500/30' : selectedSubject.passed ? 'bg-purple-500/20 border-purple-400/40 ring-1 ring-purple-400/30' : 'bg-white/5 border-white/10 opacity-60'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-300">Milestone 2</span>
                    {hasStatePass ? <CheckCircle2 size={16} className="text-emerald-400" /> : <Target size={16} className="text-purple-300" />}
                  </div>
                  <h4 className="font-bold text-sm">State Level</h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    {selectedSubject.passed ? 'Tier unlock required · ₹1,770 INR' : 'Pass District first (≥ 50%)'}
                  </p>
                  <p className="text-[11px] text-slate-300 mt-0.5">Score ≥ 60% · Silver Badge</p>
                </div>

                {/* Milestone 3 */}
                <div className={`rounded-2xl p-4 border ${registration?.current_tier === 'National' ? 'bg-yellow-500/20 border-yellow-500/30' : 'bg-white/5 border-white/10 opacity-50'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Milestone 3</span>
                    <Trophy size={16} className="text-slate-400" />
                  </div>
                  <h4 className="font-bold text-sm">National & Innovation Hub</h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">Score ≥ 80% · Gold Badge · IBM Hub Access</p>
                </div>
              </div>

              {/* Topic Breakdown if available */}
              {selectedSubject.topic_breakdown && typeof selectedSubject.topic_breakdown === 'object' && Object.keys(selectedSubject.topic_breakdown).length > 0 && (
                <div className="mt-6 pt-5 border-t border-white/10 relative z-10">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Topic Breakdown (Latest Attempt)</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(selectedSubject.topic_breakdown).map(([topic, data]) => {
                      const acc = typeof data === 'object' ? data.accuracy : null;
                      return (
                        <div key={topic} className="bg-white/10 rounded-xl p-3 border border-white/10">
                          <p className="text-xs font-semibold text-white truncate mb-1">{topic}</p>
                          <p className="text-lg font-black text-white">{acc != null ? `${acc.toFixed(0)}%` : `${data.correct}/${data.total}`}</p>
                          <p className="text-[10px] text-slate-400">accuracy</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty state when no subjects loaded */}
          {subjectsProgress.length === 0 && !loading && (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
              <BookOpen size={36} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 text-sm">No registered subjects found. Contact your admin to get subjects assigned.</p>
            </div>
          )}
        </div>
      )}

      {/* Top Stats & Badges Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-10">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-md transition-shadow">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Earned Certs</span>
            <span className="text-2xl font-bold text-navy-900">{certificates.length}</span>
            <span className="text-xs font-semibold text-emerald-600">QR Verified</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Award size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-md transition-shadow">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Subjects Registered</span>
            <span className="text-2xl font-bold text-navy-900">{subjectsProgress.length}</span>
            <span className="text-xs font-semibold text-purple-600">{subjectsProgress.filter(s => s.passed).length} passed</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center group-hover:scale-110 transition-transform">
            <BookOpen size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-md transition-shadow">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Current Tier</span>
            <span className="text-2xl font-bold text-navy-900">{registration?.current_tier || 'District'}</span>
            <span className="text-xs font-semibold text-blue-600 capitalize">{registration?.access_state || 'Active'}</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Target size={24} />
          </div>
        </div>

        {/* Badge Tier Card */}
        <div className={`p-5 rounded-2xl shadow-sm border flex items-center justify-between transition-all ${currentBadge ? `bg-gradient-to-r ${currentBadge.color}` : 'bg-white border-slate-100'}`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-2xl shrink-0">
              {currentBadge ? currentBadge.icon : '🏅'}
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider opacity-80 block mb-0.5">Badge</span>
              <h3 className="text-sm font-bold leading-tight">{currentBadge ? currentBadge.title : 'No Badge Yet'}</h3>
              <p className="text-[10px] opacity-80 mt-0.5">{currentBadge ? currentBadge.desc : 'Pass District ≥50%'}</p>
            </div>
          </div>
          {currentBadge && (
            <ShieldCheck size={18} className="opacity-70 shrink-0 ml-2" />
          )}
        </div>
      </div>


      {/* Earned Certificates List */}
      <h2 className="text-xl font-bold text-navy-900 mb-6">Earned Certificates & Credentials</h2>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
          <p className="text-slate-500 text-sm">Loading verified certificates...</p>
        </div>
      ) : certificates.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <Award size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-700 mb-2">No certificates yet</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto">Complete your District assessment with a score ≥ 50% to instantly generate your verified QR-coded certificate.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          {certificates.map(cert => (
            <div key={cert.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
              <div className="bg-gradient-to-br from-navy-800 to-navy-900 p-6 text-white relative">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-32 h-32 bg-white opacity-5 rounded-full blur-2xl"></div>
                <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-32 h-32 bg-coral opacity-10 rounded-full blur-2xl"></div>
                
                <div className="flex items-center justify-between mb-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-sm rounded-lg text-xs font-bold border border-white/20">
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    {cert.certificate_status === 'pending_ibm_confirmation' ? 'Pending IBM Approval' : 'Verified'}
                  </div>
                  <button 
                    onClick={() => handleDelete(cert.id)}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-red-500/80 flex items-center justify-center text-white backdrop-blur-sm transition-colors border border-white/20"
                    title="Delete certificate"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <h3 className="text-lg font-bold mb-1 leading-tight relative z-10">{cert.course_name}</h3>
                <div className="text-blue-200 text-xs font-medium relative z-10">SkillForge LMS Authority</div>
              </div>
              
              <div className="p-6 flex flex-col flex-1">
                <div className="flex justify-between items-center text-xs font-semibold text-slate-400 mb-4">
                  <span>Issued {cert.issue_date}</span>
                  <span className="px-2 py-1 bg-slate-50 border border-slate-100 rounded text-slate-500 font-mono text-[11px]">{cert.certificate_id || cert.cert_id}</span>
                </div>

                {cert.qr_code_path && (
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl mb-4 border border-slate-100">
                    <img 
                      src={cert.qr_code_path.startsWith('http') ? cert.qr_code_path : `${API_URL}${cert.qr_code_path}`} 
                      alt="QR Code" 
                      className="w-12 h-12 rounded-lg bg-white p-1 border border-slate-200 shrink-0 object-contain" 
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-navy-900">Instant QR Verification</span>
                      <span className="text-[10px] text-slate-500">Scan to validate certificate authenticity</span>
                    </div>
                  </div>
                )}
                
                <div className="flex flex-wrap gap-2 mt-auto border-t border-slate-100 pt-4">
                  <a 
                    href={`/verify/${cert.certificate_id || cert.cert_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-1.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-bold transition-colors border border-emerald-200 mb-1"
                  >
                    <CheckCircle2 size={15} /> Verify Authenticity
                  </a>
                  <button 
                    onClick={() => handleDownload(cert)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors border border-slate-200 hover:border-slate-300"
                  >
                    <Download size={16} className="text-navy" /> PDF
                  </button>
                  <button 
                    onClick={() => handleView(cert)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors border border-slate-200 hover:border-slate-300"
                  >
                    <Eye size={16} className="text-navy" /> View
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Payment Unlock Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-navy-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-navy-900 font-bold text-lg">
                <CreditCard className="text-coral" size={22} />
                Unlock {targetTier} Level
              </div>
              <button 
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-sm text-slate-600 mb-6">
              Complete your fee payment to unlock next-tier coursework, subject registration, and assessment slots.
            </p>

            {/* Pricing Breakdown Card */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 mb-4 space-y-2.5 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Base Level Fee ({targetTier})</span>
                <span className="font-semibold">₹{pricing.base.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>GST (18%)</span>
                <span className="font-semibold">₹{pricing.gst.toLocaleString()}</span>
              </div>
              <div className="border-t border-slate-200 pt-2.5 flex justify-between font-bold text-navy-900 text-base">
                <span>Total Payable (INR)</span>
                <span className="text-coral">₹{pricing.total.toLocaleString()}</span>
              </div>
            </div>
            
            <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-xl mb-6 border border-blue-200 flex items-start gap-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <div>
                <strong>Demo Mode:</strong> Use test card number <code className="bg-white px-1 py-0.5 rounded border border-blue-100 font-mono">4111 1111 1111 1111</code> with any future expiry and CVV.
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePaymentUnlock}
                disabled={paying}
                className="flex-1 py-3 bg-gradient-to-r from-coral to-orange-600 hover:from-coral/90 hover:to-orange-700 text-white font-bold text-sm rounded-xl shadow-md transition-all disabled:opacity-50"
              >
                {paying ? 'Processing...' : `Pay ₹${pricing.total.toLocaleString()}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Certifications;
