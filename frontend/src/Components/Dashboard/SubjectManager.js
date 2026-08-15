import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit, CheckCircle, AlertCircle, Search, Save, X } from 'lucide-react';

export default function SubjectManager({ user, institutionsList }) {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  
  // Dummy specializations for the form. In a real app we'd fetch them from the DB
  const [specializations] = useState([
    { id: 1, name: 'AI & Machine Learning' },
    { id: 2, name: 'Cybersecurity' },
    { id: 3, name: 'Cloud Computing' }
  ]);

  const [form, setForm] = useState({
    name: '',
    code: '',
    description: '',
    specialization_id: 1,
    institution_id: ''
  });

  const token = localStorage.getItem('sf_token');
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/admin/subadmins/subjects`, { headers });
      if (res.ok) setSubjects(await res.json());
      else throw new Error('Failed to load subjects');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const handleOpenModal = (subj = null) => {
    if (subj) {
      setEditingSubject(subj);
      setForm({
        name: subj.name || '',
        code: subj.code || '',
        description: subj.description || '',
        specialization_id: subj.specialization_id || 1,
        institution_id: subj.institution_id || ''
      });
    } else {
      setEditingSubject(null);
      setForm({
        name: '',
        code: '',
        description: '',
        specialization_id: 1,
        institution_id: ''
      });
    }
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const url = editingSubject
        ? `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/admin/subadmins/subjects/${editingSubject.id}`
        : `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/admin/subadmins/subjects`;
      const method = editingSubject ? 'PUT' : 'POST';
      
      const payload = { ...form };
      if (payload.institution_id === '') payload.institution_id = null;
      else payload.institution_id = parseInt(payload.institution_id);
      
      payload.specialization_id = parseInt(payload.specialization_id);

      const res = await fetch(url, { method, headers, body: JSON.stringify(payload) });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || 'Failed to save subject');
      }
      setModalOpen(false);
      showSuccess(editingSubject ? 'Subject updated' : 'Subject created');
      fetchSubjects();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this subject?')) return;
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/admin/subadmins/subjects/${id}`, { method: 'DELETE', headers });
      if (res.ok) {
        showSuccess('Subject deleted');
        fetchSubjects();
      } else {
        throw new Error('Failed to delete subject');
      }
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col gap-6">
      <div className="flex justify-between items-center pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-navy-900">Subject Repository</h2>
          <p className="text-xs text-slate-400 mt-0.5">Manage subjects and link them to institutions.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm"
        >
          <Plus size={16} /> Create Subject
        </button>
      </div>

      {error && (
        <div className="p-3 bg-coral-50 border border-coral-200 text-coral-600 rounded-xl text-sm font-bold flex items-center gap-3">
          <AlertCircle size={18} /> {error}
        </div>
      )}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-bold flex items-center gap-3">
          <CheckCircle size={18} /> {successMsg}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-4">Subject Name & Code</th>
              <th className="py-3 px-4">Institution Scope</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {subjects.length === 0 ? (
              <tr><td colSpan="3" className="py-8 text-center text-slate-400 font-medium">No subjects found.</td></tr>
            ) : (
              subjects.map(subj => {
                const inst = subj.institution_id ? institutionsList.find(i => i.id === subj.institution_id) : null;
                return (
                  <tr key={subj.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="font-bold text-navy-900">{subj.name}</div>
                      <div className="text-xs text-slate-500 font-mono">{subj.code || 'NO-CODE'}</div>
                    </td>
                    <td className="py-4 px-4">
                      {subj.institution_id === null ? (
                         <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[11px] font-bold uppercase rounded border border-slate-200">Global</span>
                      ) : (
                        <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-[11px] font-bold uppercase rounded border border-emerald-200">
                          {inst ? inst.code || inst.name : `Inst ID ${subj.institution_id}`}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleOpenModal(subj)} className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold rounded-lg text-xs transition-colors flex items-center gap-1">
                          <Edit size={13} /> Edit
                        </button>
                        <button onClick={() => handleDelete(subj.id)} className="px-3 py-1.5 bg-coral-50 text-coral-600 hover:bg-coral-100 font-bold rounded-lg text-xs transition-colors flex items-center gap-1">
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="text-xl font-bold text-navy-900">{editingSubject ? 'Edit Subject' : 'Create Subject'}</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleSave} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase">Subject Name</label>
                  <input
                    type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                    placeholder="e.g. Advanced AI Frameworks"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase">Code</label>
                  <input
                    type="text" value={form.code} onChange={e => setForm({...form, code: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                    placeholder="e.g. AI-401"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase">Description</label>
                  <textarea
                    value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                    placeholder="Brief description..." rows={2}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase">Institution Scope</label>
                  <select
                    value={form.institution_id} onChange={e => setForm({...form, institution_id: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  >
                    {user?.role === 'admin' && <option value="">Global (All Institutions)</option>}
                    {institutionsList.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase">Linked Specialization</label>
                  <select
                    value={form.specialization_id} onChange={e => setForm({...form, specialization_id: e.target.value})}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  >
                    {specializations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="mt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                  <button type="submit" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm transition-all flex items-center gap-2">
                    <Save size={16} /> Save Subject
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
