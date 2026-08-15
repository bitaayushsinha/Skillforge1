import React, { useState, useEffect } from 'react';
import {
  Shield, Building, GraduationCap, UploadCloud, BarChart3, Plus, Trash2, Edit,
  RefreshCw, X, Check, Lock, Key, Download, AlertCircle, Search, Filter,
  CheckCircle, FileText, Users, Sliders, Megaphone, Ticket, CalendarDays
} from 'lucide-react';
import './AdminPanel.css';
import TicketQueue from './TicketQueue';
import AnnouncementComposer from './AnnouncementComposer';
import SubjectManager from './SubjectManager';

export default function SubAdminConsole({ user }) {
  const [activeTab, setActiveTab] = useState(user?.role === 'admin' ? 'subadmins' : 'institutions');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modalError, setModalError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Sub-admin privileges state for logged in sub-admin
  const [myPrivileges, setMyPrivileges] = useState(user?.privileges || null);

  // Data lists
  const [subadminsList, setSubadminsList] = useState([]);
  const [institutionsList, setInstitutionsList] = useState([]);
  const [specializationsList, setSpecializationsList] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [engagementReport, setEngagementReport] = useState(null);
  const [enrollmentReport, setEnrollmentReport] = useState(null);
  const [examSubjects, setExamSubjects] = useState([]);
  const [examWindowForms, setExamWindowForms] = useState({});  // { subjectId: { start, end } }
  const [savingWindowId, setSavingWindowId] = useState(null);

  // Search & Filter States
  const [studentSearch, setStudentSearch] = useState('');
  const [filterInstitutionId, setFilterInstitutionId] = useState('');
  const [filterSpecialization, setFilterSpecialization] = useState('');
  const [reportInstId, setReportInstId] = useState('');
  const [reportSpec, setReportSpec] = useState('');
  const [reportProgram, setReportProgram] = useState('');

  // Selection for bulk specialization and subjects
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [bulkSpecModalOpen, setBulkSpecModalOpen] = useState(false);
  const [bulkSpecValue, setBulkSpecValue] = useState('');
  
  const [bulkSubjModalOpen, setBulkSubjModalOpen] = useState(false);
  const [bulkSubjValue, setBulkSubjValue] = useState('');

  // Modals state
  const [subadminModalOpen, setSubadminModalOpen] = useState(false);
  const [editingSubadmin, setEditingSubadmin] = useState(null);
  const [subadminForm, setSubadminForm] = useState({
    name: '', email: '', password: '',
    privileges: {
      manage_institutions: false, manage_students: false, reset_passwords: false,
      allocate_specializations: false, bulk_upload: false, view_reports: false,
      custom_reports: false, enrollment_reports: false, export_data: false
    },
    institution_ids: []
  });

  const [instModalOpen, setInstModalOpen] = useState(false);
  const [editingInst, setEditingInst] = useState(null);
  const [instForm, setInstForm] = useState({ name: '', code: '', contact_email: '', address: '' });

  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [studentForm, setStudentForm] = useState({
    name: '', email: '', password: '', institution_id: '', specialization: ''
  });

  const [pwdModalOpen, setPwdModalOpen] = useState(false);
  const [pwdTargetUser, setPwdTargetUser] = useState(null);
  const [newPasswordVal, setNewPasswordVal] = useState('');

  const [uploadFile, setUploadFile] = useState(null);
  const [uploadResponse, setUploadResponse] = useState(null);

  const token = localStorage.getItem('sf_token');
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  // Fetch logged in sub-admin privileges if needed
  useEffect(() => {
    if (user?.role === 'sub_admin' && !myPrivileges) {
      fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/admin/subadmins/me`, { headers })
        .then(res => {
          if (res.status === 401 || res.status === 403) {
            localStorage.removeItem('sf_token');
            window.location.reload();
            return null;
          }
          return res.ok ? res.json() : null;
        })
        .then(data => { if (data?.privileges) setMyPrivileges(data.privileges); })
        .catch(err => console.error(err));
    }
  }, [user]);

  const hasPriv = (key) => {
    if (user?.role === 'admin') return true;
    return myPrivileges ? !!myPrivileges[key] : false;
  };

  const fetchSubadmins = async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/admin/subadmins`, { headers });
      if (res.ok) setSubadminsList(await res.json());
    } catch (err) { setError(err.message); }
  };

  const fetchInstitutions = async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/institutions`, { headers });
      if (res.ok) setInstitutionsList(await res.json());
    } catch (err) { setError(err.message); }
  };

  const fetchSpecializations = async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/admin/students/specializations`, { headers });
      if (res.ok) setSpecializationsList(await res.json());
    } catch (err) { setError(err.message); }
  };

  const fetchExamSubjects = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/admin/subadmins/subjects`, { headers });
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('sf_token');
        window.location.reload();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setExamSubjects(data);
        
        // Fetch exam window for each subject
        const forms = {};
        await Promise.all(data.map(async (s) => {
          const wRes = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/admin/subadmins/subjects/${s.id}/exam-window`, { headers });
          if (wRes.ok) {
            const w = await wRes.json();
            if (w) {
              forms[s.id] = {
                start_date: w.start_date ? w.start_date.slice(0, 10) : '',
                end_date: w.end_date ? w.end_date.slice(0, 10) : '',
                daily_start_time: w.daily_start_time || '09:00',
                daily_end_time: w.daily_end_time || '17:00',
                slot_duration_minutes: w.slot_duration_minutes || 60,
                hasWindow: true
              };
            } else {
              forms[s.id] = { start_date: '', end_date: '', daily_start_time: '09:00', daily_end_time: '17:00', slot_duration_minutes: 60, hasWindow: false };
            }
          } else {
             forms[s.id] = { start_date: '', end_date: '', daily_start_time: '09:00', daily_end_time: '17:00', slot_duration_minutes: 60, hasWindow: false };
          }
        }));
        setExamWindowForms(forms);
      } else {
        setError('Failed to load subjects');
      }
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const handleSaveExamWindow = async (subjectId, form) => {
    setSavingWindowId(subjectId);
    setError(null);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/admin/subadmins/subjects/${subjectId}/exam-window`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
          end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
          daily_start_time: form.daily_start_time || null,
          daily_end_time: form.daily_end_time || null,
          slot_duration_minutes: parseInt(form.slot_duration_minutes) || null
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to save');
      setSuccessMsg(data.message);
      setTimeout(() => setSuccessMsg(null), 4000);
      // Refresh subjects to pick up new window values
      await fetchExamSubjects();
    } catch (err) { setError(err.message); } finally { setSavingWindowId(null); }
  };


  const fetchStudents = async () => {
    try {
      const params = new URLSearchParams();
      if (studentSearch) params.append('search', studentSearch);
      if (filterInstitutionId) params.append('institution_id', filterInstitutionId);
      if (filterSpecialization) params.append('specialization', filterSpecialization);
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/admin/students?${params.toString()}`, { headers });
      if (res.ok) setStudentsList(await res.json());
    } catch (err) { setError(err.message); }
  };

  const fetchReports = async () => {
    try {
      const params = new URLSearchParams();
      if (reportInstId) params.append('institution_id', reportInstId);
      if (reportSpec) params.append('specialization', reportSpec);
      if (reportProgram) params.append('program', reportProgram);

      const resEngage = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/admin/reports/engagement?${params.toString()}`, { headers });
      if (resEngage.ok) setEngagementReport(await resEngage.json());

      const resEnroll = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/admin/reports/enrollment?${params.toString()}`, { headers });
      if (resEnroll.ok) setEnrollmentReport(await resEnroll.json());
    } catch (err) { setError(err.message); }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    if (activeTab === 'subadmins' && user?.role === 'admin') await fetchSubadmins();
    if (activeTab === 'institutions' || activeTab === 'students' || activeTab === 'subadmins' || activeTab === 'reports') await fetchInstitutions();
    if (activeTab === 'students' || activeTab === 'reports') await fetchSpecializations();
    if (activeTab === 'students') await fetchStudents();
    if (activeTab === 'reports') {
      await fetchReports();
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  // --- Sub-Admin Actions ---
  const handleOpenSubadminModal = (sa = null) => {
    setModalError(null);
    if (sa) {
      setEditingSubadmin(sa);
      setSubadminForm({
        name: sa.name || '',
        email: sa.email || '',
        password: '',
        privileges: sa.privileges || {
          manage_institutions: false, manage_students: false, reset_passwords: false,
          allocate_specializations: false, bulk_upload: false, view_reports: false,
          custom_reports: false, enrollment_reports: false, export_data: false
        },
        institution_ids: sa.institution_ids || []
      });
    } else {
      setEditingSubadmin(null);
      setSubadminForm({
        name: '', email: '', password: '',
        privileges: {
          manage_institutions: false, manage_students: false, reset_passwords: false,
          allocate_specializations: false, bulk_upload: false, view_reports: false,
          custom_reports: false, enrollment_reports: false, export_data: false
        },
        institution_ids: []
      });
    }
    setSubadminModalOpen(true);
  };

  const handleSaveSubadmin = async (e) => {
    e.preventDefault();
    try {
      const url = editingSubadmin
        ? `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/admin/subadmins/${editingSubadmin.id}/privileges`
        : `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/admin/subadmins`;
      const method = editingSubadmin ? 'PUT' : 'POST';
      const body = { ...subadminForm };
      if (editingSubadmin && !body.password) delete body.password;

      const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || 'Failed to save sub-admin');
      }
      setSubadminModalOpen(false);
      showSuccess(editingSubadmin ? 'Sub-admin permissions updated!' : 'Sub-admin created successfully!');
      fetchSubadmins();
    } catch (err) { setModalError(err.message); }
  };

  const handleDeleteSubadmin = async (id) => {
    if (!window.confirm('Are you sure you want to remove this sub-admin account?')) return;
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/admin/subadmins/${id}`, {
        method: 'DELETE', headers
      });
      if (res.ok) {
        showSuccess('Sub-admin removed successfully');
        fetchSubadmins();
      }
    } catch (err) { setError(err.message); }
  };

  // --- Institution Actions ---
  const handleOpenInstModal = (inst = null) => {
    setModalError(null);
    if (inst) {
      setEditingInst(inst);
      setInstForm({ name: inst.name || '', code: inst.code || '', contact_email: inst.contact_email || '', address: inst.address || '' });
    } else {
      setEditingInst(null);
      setInstForm({ name: '', code: '', contact_email: '', address: '' });
    }
    setInstModalOpen(true);
  };

  const handleSaveInst = async (e) => {
    e.preventDefault();
    try {
      const url = editingInst
        ? `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/institutions/${editingInst.id}`
        : `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/institutions`;
      const method = editingInst ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers, body: JSON.stringify(instForm) });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || 'Failed to save institution');
      }
      setInstModalOpen(false);
      showSuccess(editingInst ? 'Institution updated!' : 'Institution created!');
      fetchInstitutions();
    } catch (err) { setModalError(err.message); }
  };

  const handleDeleteInst = async (id) => {
    if (!window.confirm('Are you sure you want to delete this institution?')) return;
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/institutions/${id}`, { method: 'DELETE', headers });
      if (res.ok) {
        showSuccess('Institution deleted');
        fetchInstitutions();
      }
    } catch (err) { setError(err.message); }
  };

  // --- Student Actions ---
  const handleOpenStudentModal = (s = null) => {
    setModalError(null);
    if (s) {
      setEditingStudent(s);
      setStudentForm({
        name: s.name || '', email: s.email || '', password: '',
        institution_id: s.institution_id || '', specialization: s.specialization || ''
      });
    } else {
      setEditingStudent(null);
      setStudentForm({ name: '', email: '', password: '', institution_id: '', specialization: '' });
    }
    setStudentModalOpen(true);
  };

  const handleSaveStudent = async (e) => {
    e.preventDefault();
    try {
      const url = editingStudent
        ? `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/admin/students/${editingStudent.id}`
        : `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/admin/students`;
      const method = editingStudent ? 'PUT' : 'POST';
      const body = { ...studentForm };
      if (body.institution_id === '') body.institution_id = null;
      else body.institution_id = parseInt(body.institution_id);
      if (editingStudent && !body.password) delete body.password;

      const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || 'Failed to save student');
      }
      setStudentModalOpen(false);
      showSuccess(editingStudent ? 'Student updated!' : 'Student added successfully!');
      fetchStudents();
    } catch (err) { setModalError(err.message); }
  };

  const handleOpenPwdModal = (s) => {
    setModalError(null);
    setPwdTargetUser(s);
    setNewPasswordVal('');
    setPwdModalOpen(true);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!pwdTargetUser) return;
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/admin/students/${pwdTargetUser.id}/password`, {
        method: 'PUT', headers, body: JSON.stringify({ new_password: newPasswordVal })
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || 'Failed to reset password');
      }
      setPwdModalOpen(false);
      showSuccess(`Password reset successfully for ${pwdTargetUser.email}`);
    } catch (err) { setModalError(err.message); }
  };

  const handleBulkSpecSubmit = async (e) => {
    e.preventDefault();
    if (selectedStudentIds.length === 0 || !bulkSpecValue) return;
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/admin/students/bulk-specialization`, {
        method: 'POST', headers, body: JSON.stringify({ student_ids: selectedStudentIds, specialization: bulkSpecValue })
      });
      if (!res.ok) throw new Error('Bulk specialization failed');
      const d = await res.json();
      setBulkSpecModalOpen(false);
      setSelectedStudentIds([]);
      setBulkSpecValue('');
      showSuccess(d.message || 'Specialization allocated');
      fetchStudents();
    } catch (err) { setError(err.message); }
  };

  const handleBulkSubjSubmit = async (e) => {
    e.preventDefault();
    if (selectedStudentIds.length === 0 || !bulkSubjValue) return;
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/admin/students/bulk-subject-assignment`, {
        method: 'POST', headers, body: JSON.stringify({ student_ids: selectedStudentIds, subject_id: parseInt(bulkSubjValue) })
      });
      if (!res.ok) throw new Error('Bulk subject assignment failed');
      const d = await res.json();
      setBulkSubjModalOpen(false);
      setSelectedStudentIds([]);
      setBulkSubjValue('');
      showSuccess(d.message || 'Subject assigned');
    } catch (err) { setError(err.message); }
  };

  const handleDownloadTemplate = () => {
    const url = `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/admin/students/template`;
    fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.blob())
      .then(blob => {
        const a = document.createElement('a');
        a.href = window.URL.createObjectURL(blob);
        a.download = 'student_upload_template.csv';
        a.click();
      }).catch(err => setError('Failed to download template'));
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) return setError('Please select a CSV file');
    const formData = new FormData();
    formData.append('file', uploadFile);
    setLoading(true);
    setUploadResponse(null);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/admin/students/bulk-upload`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Bulk upload failed');
      setUploadResponse(data);
      if (data.success_count > 0) showSuccess(`Successfully imported ${data.success_count} student records!`);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 no-scrollbar bg-slate-50 flex flex-col relative font-sans">
      <div className="max-w-7xl mx-auto w-full flex flex-col gap-6">
        
        {/* Top Header */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold text-navy-900 leading-tight flex items-center gap-3">
              <Shield className="text-blue-600" size={28} />
              {user?.role === 'admin' ? 'Super Admin & Operations Portal' : 'Sub-Admin Operations Console'}
            </h1>
            <p className="text-slate-500 font-medium text-sm">
              {user?.role === 'admin'
                ? 'Manage institutions, sub-admin staff privileges, learner rosters, and analyze system-wide telemetry.'
                : 'Manage assigned institutions, student specializations, bulk data imports, and scoped analytics.'}
            </p>
          </div>

          {/* Tab Bar */}
          <div className="inline-flex max-w-full items-center gap-2 p-1.5 bg-slate-200/70 rounded-2xl overflow-x-auto custom-scrollbar">
            {user?.role === 'admin' && (
              <button
                className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab === 'subadmins' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-600 hover:text-navy'}`}
                onClick={() => setActiveTab('subadmins')}
              >
                <Shield size={16} className="text-blue-600" /> Sub-Admins Staff
              </button>
            )}
            {(user?.role === 'admin' || hasPriv('manage_institutions')) && (
              <button
                className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab === 'institutions' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-600 hover:text-navy'}`}
                onClick={() => setActiveTab('institutions')}
              >
                <Building size={16} className="text-emerald-600" /> Institutions
              </button>
            )}
            {(user?.role === 'admin' || hasPriv('manage_students') || hasPriv('allocate_specializations') || hasPriv('reset_passwords')) && (
              <button
                className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab === 'students' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-600 hover:text-navy'}`}
                onClick={() => setActiveTab('students')}
              >
                <GraduationCap size={16} className="text-purple-600" /> Students & Specs
              </button>
            )}
            {(user?.role === 'admin' || hasPriv('bulk_upload')) && (
              <button
                className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab === 'upload' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-600 hover:text-navy'}`}
                onClick={() => setActiveTab('upload')}
              >
                <UploadCloud size={16} className="text-blue-500" /> Bulk Upload
              </button>
            )}
            {(user?.role === 'admin' || hasPriv('view_reports') || hasPriv('custom_reports') || hasPriv('enrollment_reports')) && (
              <button
                className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab === 'reports' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-600 hover:text-navy'}`}
                onClick={() => setActiveTab('reports')}
              >
                <BarChart3 size={16} className="text-coral" /> Analytics & Reports
              </button>
            )}
            {/* Communications Tabs */}
            <button
              className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab === 'announcements' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-navy'}`}
              onClick={() => setActiveTab('announcements')}
            >
              <Megaphone size={16} className="text-indigo-500" /> Announcements
            </button>
            <button
              className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab === 'tickets' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:text-navy'}`}
              onClick={() => setActiveTab('tickets')}
            >
              <Ticket size={16} className="text-teal-500" /> Ticket Queue
            </button>
            <button
              className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab === 'subjects' ? 'bg-white text-orange-700 shadow-sm' : 'text-slate-600 hover:text-navy'}`}
              onClick={() => setActiveTab('subjects')}
            >
              <FileText size={16} className="text-orange-500" /> Subjects
            </button>
            <button
              className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab === 'examwindows' ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-600 hover:text-navy'}`}
              onClick={() => { setActiveTab('examwindows'); fetchExamSubjects(); }}
            >
              <CalendarDays size={16} className="text-violet-500" /> Exam Windows
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-coral-50 border border-coral-200 text-coral-600 rounded-xl text-sm font-bold flex items-center gap-3 shadow-sm">
            <AlertCircle size={20} /> {error}
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-bold flex items-center gap-3 shadow-sm animate-in fade-in">
            <CheckCircle size={20} /> {successMsg}
          </div>
        )}

        {/* --- TAB 1: SUB-ADMINS MANAGEMENT --- */}
        {activeTab === 'subadmins' && user?.role === 'admin' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm flex flex-col gap-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold text-navy-900">Sub-Admin Administrative Roster</h2>
                <p className="text-xs text-slate-400 mt-0.5">Assign granular privileges and college management boundaries to delegate tasks safely.</p>
              </div>
              <button
                onClick={() => handleOpenSubadminModal()}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm"
              >
                <Plus size={16} /> Create Sub-Admin
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Sub-Admin Profile</th>
                    <th className="py-3 px-4">Granular Privileges Assigned</th>
                    <th className="py-3 px-4">Assigned Colleges Scope</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {subadminsList.length === 0 ? (
                    <tr><td colSpan="4" className="py-8 text-center text-slate-400 font-medium">No sub-admin accounts created yet.</td></tr>
                  ) : (
                    subadminsList.map(sa => (
                      <tr key={sa.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-4">
                          <div className="font-bold text-navy-900">{sa.name}</div>
                          <div className="text-xs text-slate-500">{sa.email}</div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-wrap gap-1.5 max-w-md">
                            {sa.privileges && Object.entries(sa.privileges)
                              .filter(([k, v]) => v === true && k !== 'id' && k !== 'user_id')
                              .map(([k]) => (
                                <span key={k} className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200/60 rounded-md text-[10px] font-bold uppercase tracking-wider">
                                  {k.replace('_', ' ')}
                                </span>
                              ))}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex flex-wrap gap-1">
                            {(!sa.institution_ids || sa.institution_ids.length === 0) ? (
                              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Unrestricted across colleges</span>
                            ) : (
                              sa.institution_ids.map(id => {
                                const inst = institutionsList.find(i => i.id === id);
                                return (
                                  <span key={id} className="text-xs font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                                    {inst ? inst.code || inst.name : `ID: ${id}`}
                                  </span>
                                );
                              })
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => handleOpenSubadminModal(sa)} className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold rounded-lg text-xs transition-colors flex items-center gap-1">
                              <Edit size={13} /> Privileges
                            </button>
                            <button onClick={() => handleDeleteSubadmin(sa.id)} className="px-3 py-1.5 bg-coral-50 text-coral-600 hover:bg-coral-100 font-bold rounded-lg text-xs transition-colors flex items-center gap-1">
                              <Trash2 size={13} /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- TAB 2: INSTITUTIONS MANAGEMENT --- */}
        {activeTab === 'institutions' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm flex flex-col gap-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold text-navy-900">Institutions & Colleges Directory</h2>
                <p className="text-xs text-slate-400 mt-0.5">Configure participating institutions for student alignment and reporting segregation.</p>
              </div>
              {(user?.role === 'admin' || hasPriv('manage_institutions')) && (
                <button
                  onClick={() => handleOpenInstModal()}
                  className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm"
                >
                  <Plus size={16} /> Add Institution
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Institution Name</th>
                    <th className="py-3 px-4">Code / Identifier</th>
                    <th className="py-3 px-4">Contact Email</th>
                    <th className="py-3 px-4">Address</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {institutionsList.length === 0 ? (
                    <tr><td colSpan="5" className="py-8 text-center text-slate-400 font-medium">No institutions registered yet.</td></tr>
                  ) : (
                    institutionsList.map(i => (
                      <tr key={i.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-4 font-bold text-navy-900">{i.name}</td>
                        <td className="py-4 px-4">
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold text-xs rounded-md border border-slate-200 uppercase">{i.code || 'N/A'}</span>
                        </td>
                        <td className="py-4 px-4 text-slate-600">{i.contact_email || '—'}</td>
                        <td className="py-4 px-4 text-slate-500 text-xs truncate max-w-[200px]">{i.address || '—'}</td>
                        <td className="py-4 px-4 text-right">
                          {(user?.role === 'admin' || hasPriv('manage_institutions')) && (
                            <div className="flex justify-end gap-2">
                              <button onClick={() => handleOpenInstModal(i)} className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold rounded-lg text-xs transition-colors flex items-center gap-1">
                                <Edit size={13} /> Edit
                              </button>
                              <button onClick={() => handleDeleteInst(i.id)} className="px-3 py-1.5 bg-coral-50 text-coral-600 hover:bg-coral-100 font-bold rounded-lg text-xs transition-colors flex items-center gap-1">
                                <Trash2 size={13} /> Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- TAB 2.5: SUBJECTS MANAGEMENT --- */}
        {activeTab === 'subjects' && (
          <SubjectManager user={user} institutionsList={institutionsList} />
        )}

        {/* --- TAB 3: STUDENTS MANAGEMENT --- */}
        {activeTab === 'students' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold text-navy-900">Student Profiles & Specializations</h2>
                <p className="text-xs text-slate-400 mt-0.5">Manage learner credentials, perform zero-escalation password resets, and assign specializations.</p>
              </div>
              <div className="flex gap-2">
                {(user?.role === 'admin' || hasPriv('allocate_specializations')) && selectedStudentIds.length > 0 && (
                  <>
                    <button
                      onClick={() => setBulkSpecModalOpen(true)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-xl shadow-sm transition-all animate-in zoom-in-95"
                    >
                      <Sliders size={16} /> Bulk Specialization ({selectedStudentIds.length})
                    </button>
                    <button
                      onClick={() => { setBulkSubjModalOpen(true); fetchExamSubjects(); }}
                      className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold rounded-xl shadow-sm transition-all animate-in zoom-in-95"
                    >
                      <FileText size={16} /> Bulk Subject Assign ({selectedStudentIds.length})
                    </button>
                  </>
                )}
                {(user?.role === 'admin' || hasPriv('manage_students')) && (
                  <button
                    onClick={() => handleOpenStudentModal()}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm transition-all"
                  >
                    <Plus size={16} /> Add Student
                  </button>
                )}
              </div>
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap gap-3 items-center bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search student name or email..."
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-navy"
                />
              </div>
              <select
                value={filterInstitutionId}
                onChange={e => setFilterInstitutionId(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none"
              >
                <option value="">All Institutions</option>
                {institutionsList.map(i => <option key={i.id} value={i.id}>{i.name} ({i.code})</option>)}
              </select>
              <select
                value={filterSpecialization}
                onChange={e => setFilterSpecialization(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none w-44"
              >
                <option value="">All Specializations</option>
                {specializationsList.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
              <button onClick={fetchStudents} className="px-4 py-2 bg-navy text-white text-sm font-bold rounded-xl hover:bg-navy-800 transition-colors flex items-center gap-1.5">
                <Filter size={14} /> Filter
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={studentsList.length > 0 && selectedStudentIds.length === studentsList.length}
                        onChange={e => {
                          if (e.target.checked) setSelectedStudentIds(studentsList.map(s => s.id));
                          else setSelectedStudentIds([]);
                        }}
                        className="w-4 h-4 rounded accent-blue-600"
                      />
                    </th>
                    <th className="py-3 px-4">Learner Profile</th>
                    <th className="py-3 px-4">College / Institution</th>
                    <th className="py-3 px-4">Specialization Track</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {studentsList.length === 0 ? (
                    <tr><td colSpan="6" className="py-8 text-center text-slate-400 font-medium">No matching student profiles found.</td></tr>
                  ) : (
                    studentsList.map(s => {
                      const inst = institutionsList.find(i => i.id === s.institution_id);
                      const isSelected = selectedStudentIds.includes(s.id);
                      return (
                        <tr key={s.id} className={`hover:bg-slate-50/50 transition-colors ${isSelected ? 'bg-blue-50/30' : ''}`}>
                          <td className="py-4 px-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={e => {
                                if (e.target.checked) setSelectedStudentIds([...selectedStudentIds, s.id]);
                                else setSelectedStudentIds(selectedStudentIds.filter(id => id !== s.id));
                              }}
                              className="w-4 h-4 rounded accent-blue-600"
                            />
                          </td>
                          <td className="py-4 px-4">
                            <div className="font-bold text-navy-900">{s.name}</div>
                            <div className="text-xs text-slate-500">{s.email}</div>
                          </td>
                          <td className="py-4 px-4">
                            {inst ? (
                              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-md border border-emerald-200">
                                {inst.code || inst.name}
                              </span>
                            ) : <span className="text-xs text-slate-400 italic">Independent</span>}
                          </td>
                          <td className="py-4 px-4">
                            {s.specialization ? (
                              <span className="px-2.5 py-1 bg-purple-50 text-purple-700 font-semibold text-xs rounded-md border border-purple-200">
                                {s.specialization}
                              </span>
                            ) : <span className="text-xs text-slate-400">—</span>}
                          </td>
                          <td className="py-4 px-4">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${s.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                              {s.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              {(user?.role === 'admin' || hasPriv('manage_students')) && (
                                <button onClick={() => handleOpenStudentModal(s)} className="px-2.5 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold rounded-lg text-xs transition-colors" title="Edit Profile">
                                  <Edit size={13} />
                                </button>
                              )}
                              {(user?.role === 'admin' || hasPriv('reset_passwords')) && (
                                <button onClick={() => handleOpenPwdModal(s)} className="px-2.5 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 font-bold rounded-lg text-xs transition-colors flex items-center gap-1" title="Reset Password without escalation">
                                  <Key size={13} /> Reset Pwd
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- TAB 4: BULK UPLOAD UI --- */}
        {activeTab === 'upload' && (
          <div className="flex flex-col gap-6">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex-1">
                <h2 className="text-xl font-bold text-navy-900 flex items-center gap-2">
                  <UploadCloud className="text-blue-500" size={24} /> Template-Based Bulk Student Upload
                </h2>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                  Import hundreds of student records simultaneously using CSV formatting. Row-level validation automatically inspects email addresses, duplicate records, and checks institution code authorization.
                </p>
              </div>
              <button
                onClick={handleDownloadTemplate}
                className="flex items-center gap-2 px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-2xl shadow-md transition-all shrink-0"
              >
                <Download size={18} /> Download Sample CSV Template
              </button>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm flex flex-col gap-6">
              <form onSubmit={handleUploadSubmit} className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-1 w-full relative border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center bg-slate-50/50 transition-colors cursor-pointer">
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={e => setUploadFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="flex flex-col items-center pointer-events-none">
                    <FileText size={28} className="text-slate-400 mb-2" />
                    <p className="text-sm font-bold text-navy-900">
                      {uploadFile ? uploadFile.name : 'Drag & drop CSV file here, or click to browse'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Supports UTF-8 CSV with columns: name, email, password, institution_code, specialization</p>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading || !uploadFile}
                  className="px-6 py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm rounded-2xl shadow-md transition-all flex items-center gap-2 shrink-0 h-full"
                >
                  {loading ? <RefreshCw className="animate-spin" size={18} /> : <UploadCloud size={18} />}
                  Start Bulk Import
                </button>
              </form>

              {/* Upload Response & Structured Error Display Table */}
              {uploadResponse && (
                <div className="flex flex-col gap-6 pt-6 border-t border-slate-100 animate-in fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <div className="text-xs font-bold text-slate-400 uppercase">Total Rows Inspected</div>
                      <div className="text-2xl font-black text-navy-900 mt-1">{uploadResponse.total_rows}</div>
                    </div>
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
                      <div className="text-xs font-bold text-emerald-600 uppercase">Successfully Imported</div>
                      <div className="text-2xl font-black text-emerald-700 mt-1">{uploadResponse.success_count}</div>
                    </div>
                    <div className={`p-4 rounded-2xl border ${uploadResponse.error_count > 0 ? 'bg-coral-50 border-coral-200' : 'bg-slate-50 border-slate-200'}`}>
                      <div className={`text-xs font-bold uppercase ${uploadResponse.error_count > 0 ? 'text-coral-600' : 'text-slate-400'}`}>Validation Errors</div>
                      <div className={`text-2xl font-black mt-1 ${uploadResponse.error_count > 0 ? 'text-coral-600' : 'text-slate-700'}`}>{uploadResponse.error_count}</div>
                    </div>
                  </div>

                  {uploadResponse.errors && uploadResponse.errors.length > 0 && (
                    <div className="flex flex-col gap-3">
                      <h4 className="font-bold text-navy-900 text-sm flex items-center gap-2">
                        <AlertCircle size={16} className="text-coral" /> Row-Level Validation Report ({uploadResponse.errors.length} failed rows)
                      </h4>
                      <div className="overflow-x-auto max-h-80 border border-slate-200 rounded-2xl">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-coral-50/60 text-coral-800 text-[11px] font-bold uppercase border-b border-coral-200">
                              <th className="py-2.5 px-4 w-20">Row #</th>
                              <th className="py-2.5 px-4">Email / Identifier</th>
                              <th className="py-2.5 px-4">Validation Failure Reason</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs">
                            {uploadResponse.errors.map((err, idx) => (
                              <tr key={idx} className="hover:bg-coral-50/20">
                                <td className="py-3 px-4 font-bold text-slate-700">Row {err.row}</td>
                                <td className="py-3 px-4 font-mono text-slate-600">{err.email || 'N/A'}</td>
                                <td className="py-3 px-4 font-bold text-coral-600">{err.reason}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- TAB 5: REPORTS & ANALYTICS DASHBOARD --- */}
        {activeTab === 'reports' && (
          <div className="flex flex-col gap-6">
            {/* Filters Box */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-wrap gap-4 items-center justify-between">
              <div className="flex flex-wrap gap-3 items-center flex-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Filter size={14} /> Report Filters:
                </span>
                <select
                  value={reportInstId}
                  onChange={e => setReportInstId(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-navy-900 outline-none"
                >
                  <option value="">All Colleges / Institutions</option>
                  {institutionsList.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
                <select
                  value={reportSpec}
                  onChange={e => setReportSpec(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-navy-900 outline-none w-44"
                >
                  <option value="">All Specializations</option>
                  {specializationsList.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
                <input
                  type="text"
                  placeholder="Program category filter..."
                  value={reportProgram}
                  onChange={e => setReportProgram(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none w-44"
                />
              </div>
              <button
                onClick={fetchReports}
                className="px-5 py-2 bg-navy text-white text-sm font-bold rounded-xl hover:bg-navy-800 transition-colors flex items-center gap-2"
              >
                <RefreshCw size={14} /> Update Telemetry
              </button>
            </div>

            {/* Engagement Stats Cards */}
            {engagementReport && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Learners Scope</span>
                    <Users className="text-blue-500" size={20} />
                  </div>
                  <div className="mt-4">
                    <div className="text-3xl font-black text-navy-900">{engagementReport.total_students}</div>
                    <div className="text-xs text-emerald-600 font-bold mt-1">
                      {engagementReport.active_students} Active ({engagementReport.total_students ? round((engagementReport.active_students / engagementReport.total_students)*100, 1) : 0}%)
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Weekly Goal Progress</span>
                    <BarChart3 className="text-emerald-500" size={20} />
                  </div>
                  <div className="mt-4">
                    <div className="text-3xl font-black text-navy-900">{engagementReport.total_progress_hours} <span className="text-sm font-normal text-slate-400">hrs</span></div>
                    <div className="text-xs text-slate-500 font-semibold mt-1">
                      Target Goal: {engagementReport.total_goal_hours} hrs total
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Completion Rate Est.</span>
                    <GraduationCap className="text-purple-500" size={20} />
                  </div>
                  <div className="mt-4">
                    <div className="text-3xl font-black text-purple-700">{engagementReport.completion_rate}%</div>
                    <div className="text-xs text-slate-500 font-semibold mt-1">
                      Avg Streak: {engagementReport.average_streak} days
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Certificates Issued</span>
                    <CheckCircle className="text-amber-500" size={20} />
                  </div>
                  <div className="mt-4">
                    <div className="text-3xl font-black text-navy-900">{engagementReport.total_certificates_issued}</div>
                    <div className="text-xs text-amber-600 font-bold mt-1">
                      Avg XP: {engagementReport.average_xp} pts
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Enrollment Breakdown Tables */}
            {enrollmentReport && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* By Institution */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col gap-4">
                  <h3 className="text-lg font-bold text-navy-900 flex items-center gap-2">
                    <Building size={18} className="text-blue-600" /> Enrollment by Institution
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase">
                          <th className="py-2.5 px-3">Institution Name</th>
                          <th className="py-2.5 px-3 text-right">Registered</th>
                          <th className="py-2.5 px-3 text-right">Active</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {enrollmentReport.by_institution.map((stat, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-3 px-3 font-bold text-navy-900">{stat.institution_name}</td>
                            <td className="py-3 px-3 text-right font-bold text-slate-700">{stat.registered}</td>
                            <td className="py-3 px-3 text-right font-bold text-emerald-600">{stat.active}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* By Specialization */}
                <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col gap-4">
                  <h3 className="text-lg font-bold text-navy-900 flex items-center gap-2">
                    <GraduationCap size={18} className="text-purple-600" /> Enrollment by Specialization
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase">
                          <th className="py-2.5 px-3">Specialization Track</th>
                          <th className="py-2.5 px-3 text-right">Learner Count</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {enrollmentReport.by_specialization.map((spec, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-3 px-3 font-bold text-navy-900">{spec.specialization}</td>
                            <td className="py-3 px-3 text-right font-bold text-purple-700">{spec.student_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- TAB: ANNOUNCEMENTS (Admin Comms) --- */}
        {activeTab === 'announcements' && (
          <AnnouncementComposer user={user} />
        )}

        {/* --- TAB: TICKET QUEUE (Admin Comms) --- */}
        {activeTab === 'tickets' && (
          <TicketQueue user={user} />
        )}

        {/* --- TAB: EXAM WINDOWS MANAGEMENT --- */}
        {activeTab === 'examwindows' && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm flex flex-col gap-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-bold text-navy-900 flex items-center gap-2">
                  <CalendarDays className="text-violet-500" size={22} /> Exam Window Management
                </h3>
                <p className="text-sm text-slate-500 mt-1">Set the booking window for each subject. Students can only book slots within these dates.</p>
              </div>
              <button onClick={fetchExamSubjects} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500" title="Refresh">
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>

            {examSubjects.length === 0 && !loading && (
              <div className="text-center py-10 text-slate-400">
                <CalendarDays size={40} className="mx-auto mb-3 opacity-40" />
                <p className="font-medium">No subjects found.</p>
              </div>
            )}

            <div className="flex flex-col gap-4">
              {examSubjects.map(subject => {
                const form = examWindowForms[subject.id] || {
                  start_date: '', end_date: '', daily_start_time: '09:00', daily_end_time: '17:00', slot_duration_minutes: 60, hasWindow: false
                };
                const isSaving = savingWindowId === subject.id;
                const hasWindow = form.hasWindow;

                return (
                  <div key={subject.id} className="border border-slate-200 rounded-2xl p-5 flex flex-col xl:flex-row xl:items-center gap-4 hover:border-violet-200 transition-all">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-navy-900">{subject.name}</span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{subject.semester_tier}</span>
                        {hasWindow
                          ? <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">Window Active</span>
                          : <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">No Window Set</span>
                        }
                      </div>
                      {subject.code && <p className="text-xs text-slate-400 mt-0.5">{subject.code}</p>}
                    </div>

                    <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Start Date</label>
                        <input
                          type="date"
                          value={form.start_date}
                          onChange={e => setExamWindowForms(prev => ({ ...prev, [subject.id]: { ...form, start_date: e.target.value } }))}
                          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-violet-400"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">End Date</label>
                        <input
                          type="date"
                          value={form.end_date}
                          onChange={e => setExamWindowForms(prev => ({ ...prev, [subject.id]: { ...form, end_date: e.target.value } }))}
                          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-violet-400"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Daily Range</label>
                        <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 focus-within:border-violet-400">
                          <input
                            type="time"
                            value={form.daily_start_time}
                            onChange={e => setExamWindowForms(prev => ({ ...prev, [subject.id]: { ...form, daily_start_time: e.target.value } }))}
                            className="bg-transparent text-sm font-medium outline-none w-20"
                          />
                          <span className="text-slate-400">-</span>
                          <input
                            type="time"
                            value={form.daily_end_time}
                            onChange={e => setExamWindowForms(prev => ({ ...prev, [subject.id]: { ...form, daily_end_time: e.target.value } }))}
                            className="bg-transparent text-sm font-medium outline-none w-20"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Slot Dur. (min)</label>
                        <input
                          type="number"
                          value={form.slot_duration_minutes}
                          onChange={e => setExamWindowForms(prev => ({ ...prev, [subject.id]: { ...form, slot_duration_minutes: e.target.value } }))}
                          className="px-3 py-2 w-20 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-violet-400"
                        />
                      </div>
                      <div className="flex gap-2 mt-auto">
                        <button
                          onClick={() => handleSaveExamWindow(subject.id, form)}
                          disabled={isSaving}
                          className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm rounded-xl transition-all flex items-center gap-2 shadow-sm disabled:opacity-60"
                        >
                          {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* --- SUB-ADMIN CREATION / EDIT MODAL --- */}
      {subadminModalOpen && (
        <div className="fixed inset-0 bg-navy-900/50 backdrop-blur-sm z-[1100] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-8 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-6">
              <h3 className="text-xl font-bold text-navy-900 flex items-center gap-2">
                <Shield className="text-blue-600" size={22} />
                {editingSubadmin ? 'Edit Sub-Admin Capabilities' : 'Create New Sub-Admin Staff'}
              </h3>
              <button onClick={() => setSubadminModalOpen(false)} className="p-1 rounded-full hover:bg-slate-100 text-slate-400"><X size={20} /></button>
            </div>

            {modalError && (
              <div className="mb-6 p-4 bg-coral-50 border border-coral-200 text-coral-600 rounded-xl text-sm font-bold flex items-center gap-3 shadow-sm">
                <AlertCircle size={20} /> {modalError}
              </div>
            )}

            <form onSubmit={handleSaveSubadmin} className="flex flex-col gap-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-navy-900 uppercase">Full Name</label>
                  <input
                    type="text" required value={subadminForm.name}
                    onChange={e => setSubadminForm({ ...subadminForm, name: e.target.value })}
                    placeholder="e.g. Sarah Jenkins"
                    className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-navy"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-navy-900 uppercase">Email Address</label>
                  <input
                    type="email" required value={subadminForm.email}
                    onChange={e => setSubadminForm({ ...subadminForm, email: e.target.value })}
                    placeholder="e.g. sarah@college.edu"
                    className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-navy"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-navy-900 uppercase">
                  {editingSubadmin ? 'New Password (leave blank to keep unchanged)' : 'Initial Password'}
                </label>
                <input
                  type="password" required={!editingSubadmin} value={subadminForm.password}
                  onChange={e => setSubadminForm({ ...subadminForm, password: e.target.value })}
                  placeholder="Secret access password..."
                  className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-navy"
                />
              </div>

              {/* Granular Privileges Toggles */}
              <div className="flex flex-col gap-3 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-navy-900 uppercase tracking-wider">Granular Administrative Capabilities</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  {Object.keys(subadminForm.privileges).map(key => (
                    <label key={key} className="flex items-center gap-3 text-sm font-semibold text-slate-700 cursor-pointer hover:text-navy">
                      <input
                        type="checkbox"
                        checked={!!subadminForm.privileges[key]}
                        onChange={e => setSubadminForm({
                          ...subadminForm,
                          privileges: { ...subadminForm.privileges, [key]: e.target.checked }
                        })}
                        className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                      />
                      <span className="capitalize">{key.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* College Scoping Assignment */}
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                <label className="text-xs font-bold text-navy-900 uppercase tracking-wider">College / Institution Scoping</label>
                <p className="text-xs text-slate-400">Select which colleges this sub-admin can manage. If none selected, they will have unrestricted access across all institutions.</p>
                <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                  {institutionsList.map(inst => {
                    const checked = subadminForm.institution_ids.includes(inst.id);
                    return (
                      <button
                        type="button" key={inst.id}
                        onClick={() => {
                          const ids = checked
                            ? subadminForm.institution_ids.filter(id => id !== inst.id)
                            : [...subadminForm.institution_ids, inst.id];
                          setSubadminForm({ ...subadminForm, institution_ids: ids });
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${checked ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                      >
                        {checked && <Check size={12} />} {inst.name} ({inst.code})
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setSubadminModalOpen(false)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition-all">Save Sub-Admin</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- INSTITUTION MODAL --- */}
      {instModalOpen && (
        <div className="fixed inset-0 bg-navy-900/50 backdrop-blur-sm z-[1100] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-6">
              <h3 className="text-xl font-bold text-navy-900 flex items-center gap-2">
                <Building className="text-emerald-600" size={22} />
                {editingInst ? 'Edit Institution' : 'Add New Institution'}
              </h3>
              <button onClick={() => setInstModalOpen(false)} className="p-1 rounded-full hover:bg-slate-100 text-slate-400"><X size={20} /></button>
            </div>

            {modalError && (
              <div className="mb-6 p-4 bg-coral-50 border border-coral-200 text-coral-600 rounded-xl text-sm font-bold flex items-center gap-3 shadow-sm">
                <AlertCircle size={20} /> {modalError}
              </div>
            )}

            <form onSubmit={handleSaveInst} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-navy-900 uppercase">Institution / College Name</label>
                <input
                  type="text" required value={instForm.name}
                  onChange={e => setInstForm({ ...instForm, name: e.target.value })}
                  placeholder="e.g. Stanford University"
                  className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-navy"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-navy-900 uppercase">Short Code / Identifier</label>
                  <input
                    type="text" value={instForm.code}
                    onChange={e => setInstForm({ ...instForm, code: e.target.value })}
                    placeholder="e.g. STANFORD"
                    className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-navy uppercase"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-navy-900 uppercase">Contact Email</label>
                  <input
                    type="email" value={instForm.contact_email}
                    onChange={e => setInstForm({ ...instForm, contact_email: e.target.value })}
                    placeholder="e.g. admin@stanford.edu"
                    className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-navy"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-navy-900 uppercase">Address / Location</label>
                <input
                  type="text" value={instForm.address}
                  onChange={e => setInstForm({ ...instForm, address: e.target.value })}
                  placeholder="e.g. Stanford, CA 94305"
                  className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-navy"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
                <button type="button" onClick={() => setInstModalOpen(false)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md transition-all">Save Institution</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- STUDENT ADD / EDIT MODAL --- */}
      {studentModalOpen && (
        <div className="fixed inset-0 bg-navy-900/50 backdrop-blur-sm z-[1100] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-6">
              <h3 className="text-xl font-bold text-navy-900 flex items-center gap-2">
                <GraduationCap className="text-purple-600" size={22} />
                {editingStudent ? 'Edit Learner Profile' : 'Register New Learner'}
              </h3>
              <button onClick={() => setStudentModalOpen(false)} className="p-1 rounded-full hover:bg-slate-100 text-slate-400"><X size={20} /></button>
            </div>

            {modalError && (
              <div className="mb-6 p-4 bg-coral-50 border border-coral-200 text-coral-600 rounded-xl text-sm font-bold flex items-center gap-3 shadow-sm">
                <AlertCircle size={20} /> {modalError}
              </div>
            )}

            <form onSubmit={handleSaveStudent} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-navy-900 uppercase">Learner Full Name</label>
                <input
                  type="text" required value={studentForm.name}
                  onChange={e => setStudentForm({ ...studentForm, name: e.target.value })}
                  placeholder="e.g. Alex Robinson"
                  className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-navy"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-navy-900 uppercase">Email Address</label>
                <input
                  type="email" required value={studentForm.email}
                  onChange={e => setStudentForm({ ...studentForm, email: e.target.value })}
                  placeholder="e.g. alex@student.edu"
                  className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-navy"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-navy-900 uppercase">
                  {editingStudent ? 'New Password (optional)' : 'Account Password'}
                </label>
                <input
                  type="password" required={!editingStudent} value={studentForm.password}
                  onChange={e => setStudentForm({ ...studentForm, password: e.target.value })}
                  placeholder="Secret password..."
                  className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-navy"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-navy-900 uppercase">College / Institution</label>
                  <select
                    value={studentForm.institution_id}
                    onChange={e => setStudentForm({ ...studentForm, institution_id: e.target.value })}
                    className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-navy"
                  >
                    <option value="">Independent / None</option>
                    {institutionsList.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-navy-900 uppercase">Specialization Track</label>
                  <select
                    value={studentForm.specialization}
                    onChange={e => setStudentForm({ ...studentForm, specialization: e.target.value })}
                    className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-navy"
                  >
                    <option value="">Select Specialization...</option>
                    {specializationsList.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-2">
                <button type="button" onClick={() => setStudentModalOpen(false)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm rounded-xl shadow-md transition-all">Save Student</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- PASSWORD RESET ZERO-ESCALATION MODAL --- */}
      {pwdModalOpen && pwdTargetUser && (
        <div className="fixed inset-0 bg-navy-900/50 backdrop-blur-sm z-[1100] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-6">
              <h3 className="text-xl font-bold text-navy-900 flex items-center gap-2">
                <Key className="text-amber-600" size={22} /> Zero-Escalation Password Reset
              </h3>
              <button onClick={() => setPwdModalOpen(false)} className="p-1 rounded-full hover:bg-slate-100 text-slate-400"><X size={20} /></button>
            </div>

            {modalError && (
              <div className="mb-6 p-4 bg-coral-50 border border-coral-200 text-coral-600 rounded-xl text-sm font-bold flex items-center gap-3 shadow-sm">
                <AlertCircle size={20} /> {modalError}
              </div>
            )}

            <form onSubmit={handleResetPassword} className="flex flex-col gap-5">
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-800 leading-relaxed">
                <strong>Notice:</strong> This endpoint allows sub-admins to reset student passwords without privilege escalation. The backend enforces that administrative accounts cannot be targeted.
              </div>
              <p className="text-sm text-slate-600">
                Targeting Learner: <strong className="text-navy-900">{pwdTargetUser.name}</strong> ({pwdTargetUser.email})
              </p>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-navy-900 uppercase">New Account Password</label>
                <input
                  type="text" required value={newPasswordVal}
                  onChange={e => setNewPasswordVal(e.target.value)}
                  placeholder="Enter temporary replacement password..."
                  className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-navy"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setPwdModalOpen(false)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-xl shadow-md transition-all">Confirm Password Reset</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- BULK SPECIALIZATION MODAL --- */}
      {bulkSpecModalOpen && (
        <div className="fixed inset-0 bg-navy-900/50 backdrop-blur-sm z-[1100] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-6">
              <h3 className="text-xl font-bold text-navy-900 flex items-center gap-2">
                <Sliders className="text-purple-600" size={22} /> Bulk Specialization Allocation
              </h3>
              <button onClick={() => setBulkSpecModalOpen(false)} className="p-1 rounded-full hover:bg-slate-100 text-slate-400"><X size={20} /></button>
            </div>

            <form onSubmit={handleBulkSpecSubmit} className="flex flex-col gap-5">
              <p className="text-sm text-slate-600">
                You have selected <strong className="text-purple-700 font-black">{selectedStudentIds.length}</strong> student profiles. Assigning a specialization track will update their dashboard learning paths simultaneously.
              </p>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-navy-900 uppercase">Specialization Track Name</label>
                <select
                  required value={bulkSpecValue}
                  onChange={e => setBulkSpecValue(e.target.value)}
                  className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-navy"
                >
                  <option value="" disabled>Select Specialization...</option>
                  {specializationsList.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setBulkSpecModalOpen(false)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm rounded-xl shadow-md transition-all">Allocate to Batch</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {bulkSubjModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-navy-900">Bulk Subject Assign</h3>
              <button onClick={() => setBulkSubjModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleBulkSubjSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase">Select Subject</label>
                  <select
                    required
                    value={bulkSubjValue}
                    onChange={e => setBulkSubjValue(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  >
                    <option value="" disabled>Choose a subject...</option>
                    {examSubjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                  </select>
                </div>
                <div className="mt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setBulkSubjModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                  <button type="submit" className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold rounded-xl shadow-sm transition-all flex items-center gap-2">
                    <Check size={16} /> Assign to {selectedStudentIds.length} Students
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function round(val, decimals) {
  return Number(Math.round(val + 'e' + decimals) + 'e-' + decimals);
}
