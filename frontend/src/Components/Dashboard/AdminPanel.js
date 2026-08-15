import React, { useState, useEffect } from 'react';
import {
  Users, Trash2, Edit, Plus, Shield, RefreshCw, X, ShieldAlert, Check, Mail, BarChart2, FileText
} from 'lucide-react';
import SubAdminConsole from './SubAdminConsole';
import AdminAnalyticsDashboard from './AdminAnalyticsDashboard';
import QuestionBankManager from './QuestionBankManager';
import ExamConfigPanel from './ExamConfigPanel';
import LiveSessionMonitor from './LiveSessionMonitor';

export default function AdminPanel({ user }) {
  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Data lists
  const [usersList, setUsersList] = useState([]);
  const [subscribersList, setSubscribersList] = useState([]);

  // Modals & form state
  const [isUserRoleModalOpen, setIsUserRoleModalOpen] = useState(false);
  const [currentUserToEdit, setCurrentUserToEdit] = useState(null);
  const [userRoleData, setUserRoleData] = useState('learner');

  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [addUserFormData, setAddUserFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'learner'
  });

  const token = localStorage.getItem('sf_token');
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/admin/users`, { headers });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem('sf_token');
          localStorage.removeItem('sf_user');
          window.location.reload();
          return;
        }
        throw new Error('Failed to fetch users');
      }
      const data = await res.json();
      setUsersList(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchSubscribers = async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/admin/subscribers`, { headers });
      if (!res.ok) {
        throw new Error('Failed to fetch subscribers');
      }
      const data = await res.json();
      setSubscribersList(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    if (activeTab === 'users') await fetchUsers();
    if (activeTab === 'subscribers') await fetchSubscribers();
    setLoading(false);
  };

  const handleStartNewCycle = async () => {
    const newCycleName = window.prompt("Enter the name of the new cycle (e.g., '2027-2028'):");
    if (!newCycleName) return;
    if (!window.confirm(`Are you sure you want to start ${newCycleName}? This will archive all current student registrations.`)) return;

    try {
      setLoading(true);
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/admin/cycles/start-new`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ new_cycle_name: newCycleName })
      });
      if (!res.ok) throw new Error("Failed to start new cycle");
      const data = await res.json();
      alert(data.message);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Role Management
  const handleOpenRoleModal = (usr) => {
    setCurrentUserToEdit(usr);
    setUserRoleData(usr.role);
    setIsUserRoleModalOpen(true);
  };

  const handleUpdateRole = async () => {
    if (!currentUserToEdit) return;
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/admin/users/${currentUserToEdit.id}/role`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ role: userRoleData })
      });
      if (!res.ok) throw new Error('Failed to update role');
      setIsUserRoleModalOpen(false);
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/admin/users`, {
        method: 'POST',
        headers,
        body: JSON.stringify(addUserFormData)
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to add user');
      }
      setIsAddUserModalOpen(false);
      setAddUserFormData({ name: '', email: '', password: '', role: 'learner' });
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/admin/users/${id}`, {
        method: 'DELETE',
        headers
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to delete user');
      }
      fetchUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-coral-50 text-coral-600 border border-coral-200';
      case 'sub_admin': return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'reviewer': return 'bg-purple-50 text-purple-600 border border-purple-200';
      case 'expert': return 'bg-blue-50 text-blue-600 border border-blue-200';
      default: return 'bg-emerald-50 text-emerald-600 border border-emerald-200';
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 no-scrollbar bg-slate-50 flex flex-col relative">
      <div className="max-w-6xl mx-auto w-full flex flex-col gap-6">
        
        {/* Header Section */}
        <div className="flex flex-col gap-6 mb-2">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold text-navy-900 leading-tight flex items-center gap-3">
              <ShieldAlert className="text-coral" size={28} /> Super Admin Control Panel
            </h1>
            <p className="text-slate-500 font-medium">Override system database entries and alter system-wide configurations.</p>
          </div>
          
          <div className="inline-flex max-w-full items-center gap-2 p-1.5 bg-slate-200/70 rounded-2xl overflow-x-auto custom-scrollbar">
            <button 
              className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab === 'users' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-600 hover:text-navy'}`}
              onClick={() => setActiveTab('users')}
            >
              <Users size={16} /> Users Management
            </button>
            <button 
              className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab === 'operations' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-600 hover:text-navy'}`}
              onClick={() => setActiveTab('operations')}
            >
              <Shield size={16} className="text-blue-600" /> Sub-Admins & Operations Portal
            </button>
            <button 
              className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab === 'subscribers' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-600 hover:text-navy'}`}
              onClick={() => setActiveTab('subscribers')}
            >
              <Mail size={16} /> Subscribers
            </button>
            <button 
              className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab === 'analytics' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-600 hover:text-navy'}`}
              onClick={() => setActiveTab('analytics')}
            >
              <BarChart2 size={16} className="text-emerald-500" /> System Analytics
            </button>
            <button 
              className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab.startsWith('exam_engine') ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-600 hover:text-navy'}`}
              onClick={() => setActiveTab('exam_engine_banks')}
            >
              <FileText size={16} className="text-indigo-500" /> Exam Engine
            </button>
            <button 
              className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shrink-0 ${activeTab === 'live_sessions' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-600 hover:text-navy'}`}
              onClick={() => setActiveTab('live_sessions')}
            >
              <ShieldAlert size={16} className="text-red-500" /> Live Monitoring
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-coral-50 border border-coral-200 text-coral-600 rounded-xl text-sm font-bold flex items-center shadow-sm">
            {error}
          </div>
        )}
        
        {activeTab === 'operations' ? (
          <div className="flex flex-col gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-navy-900">Cycle Management & Archival</h3>
                <p className="text-sm text-slate-500">Archive current student data and start a new academic cycle.</p>
              </div>
              <button 
                onClick={handleStartNewCycle}
                disabled={loading}
                className="px-5 py-2.5 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 font-bold text-sm rounded-xl transition-all shadow-sm flex items-center gap-2"
              >
                {loading ? <RefreshCw className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                Start New Cycle
              </button>
            </div>
            <SubAdminConsole user={user} />
          </div>
        ) : activeTab === 'analytics' ? (
          <AdminAnalyticsDashboard />
        ) : activeTab === 'live_sessions' ? (
          <div className="flex flex-col gap-6">
            <LiveSessionMonitor />
          </div>
        ) : activeTab === 'exam_engine' ? (
          <div className="flex flex-col gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex gap-2">
              <button 
                onClick={() => setActiveTab('exam_engine_banks')}
                className="px-4 py-2 bg-indigo-50 text-indigo-700 font-bold text-sm rounded-lg"
              >
                Question Banks
              </button>
              <button 
                onClick={() => setActiveTab('exam_engine_config')}
                className="px-4 py-2 text-slate-600 hover:bg-slate-50 font-bold text-sm rounded-lg"
              >
                Configuration
              </button>
            </div>
            <QuestionBankManager />
          </div>
        ) : activeTab === 'exam_engine_banks' ? (
          <div className="flex flex-col gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex gap-2">
              <button 
                className="px-4 py-2 bg-indigo-50 text-indigo-700 font-bold text-sm rounded-lg"
              >
                Question Banks
              </button>
              <button 
                onClick={() => setActiveTab('exam_engine_config')}
                className="px-4 py-2 text-slate-600 hover:bg-slate-50 font-bold text-sm rounded-lg"
              >
                Configuration
              </button>
            </div>
            <QuestionBankManager />
          </div>
        ) : activeTab === 'exam_engine_config' ? (
          <div className="flex flex-col gap-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex gap-2">
              <button 
                onClick={() => setActiveTab('exam_engine_banks')}
                className="px-4 py-2 text-slate-600 hover:bg-slate-50 font-bold text-sm rounded-lg"
              >
                Question Banks
              </button>
              <button 
                className="px-4 py-2 bg-indigo-50 text-indigo-700 font-bold text-sm rounded-lg"
              >
                Configuration
              </button>
            </div>
            <ExamConfigPanel />
          </div>
        ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <h2 className="text-xl font-bold text-navy-900">Registered User Profiles</h2>

            <div className="flex items-center gap-3">
              <button 
                className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-sm font-bold rounded-xl transition-all" 
                onClick={loadData}
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Reload
              </button>
              {activeTab === 'users' && (
                <button 
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-sm hover:shadow-md" 
                  onClick={() => setIsAddUserModalOpen(true)}
                >
                  <Plus size={16} /> Add User
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <RefreshCw className="animate-spin mb-4" size={32} />
              <p className="font-medium">Loading database entries...</p>
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              {activeTab === 'users' && (
                <>
                  <div className="flex flex-col gap-4">
                    <h3 className="text-lg font-bold text-navy-900 px-2">System Staff</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr>
                            <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Name</th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Email</th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Role</th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {usersList.filter(u => ['admin', 'sub_admin', 'reviewer', 'expert'].includes(u.role)).map(usr => (
                            <tr key={usr.id} className="hover:bg-slate-50 transition-colors group">
                              <td className="px-4 py-4 text-sm font-bold text-navy-900 border-b border-slate-50">{usr.name}</td>
                              <td className="px-4 py-4 text-sm font-medium text-slate-600 border-b border-slate-50">{usr.email}</td>
                              <td className="px-4 py-4 border-b border-slate-50">
                                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${getRoleBadgeColor(usr.role)}`}>
                                  {usr.role}
                                </span>
                              </td>
                              <td className="px-4 py-4 border-b border-slate-50">
                                <div className="flex gap-2">
                                  {usr.role !== 'admin' && (
                                    <>
                                      <button 
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-lg transition-colors" 
                                        onClick={() => handleOpenRoleModal(usr)}
                                      >
                                        <Shield size={12} /> Edit Role
                                      </button>
                                      <button 
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-coral-600 hover:text-coral-700 bg-coral-50 hover:bg-coral-100 border border-coral-100 rounded-lg transition-colors" 
                                        onClick={() => handleDeleteUser(usr.id)}
                                      >
                                        <Trash2 size={12} /> Delete
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 pt-4">
                    <h3 className="text-lg font-bold text-navy-900 px-2">Learners</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr>
                            <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Name</th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Email</th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Role</th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {usersList.filter(u => u.role === 'learner').map(usr => (
                            <tr key={usr.id} className="hover:bg-slate-50 transition-colors group">
                              <td className="px-4 py-4 text-sm font-bold text-navy-900 border-b border-slate-50">{usr.name}</td>
                              <td className="px-4 py-4 text-sm font-medium text-slate-600 border-b border-slate-50">{usr.email}</td>
                              <td className="px-4 py-4 border-b border-slate-50">
                                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${getRoleBadgeColor(usr.role)}`}>
                                  {usr.role}
                                </span>
                              </td>
                              <td className="px-4 py-4 border-b border-slate-50">
                                <div className="flex gap-2">
                                  {usr.role !== 'admin' && (
                                    <>
                                      <button 
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-lg transition-colors" 
                                        onClick={() => handleOpenRoleModal(usr)}
                                      >
                                        <Shield size={12} /> Edit Role
                                      </button>
                                      <button 
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-coral-600 hover:text-coral-700 bg-coral-50 hover:bg-coral-100 border border-coral-100 rounded-lg transition-colors" 
                                        onClick={() => handleDeleteUser(usr.id)}
                                      >
                                        <Trash2 size={12} /> Delete
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'subscribers' && (
                <div className="flex flex-col gap-4">
                  <h3 className="text-lg font-bold text-navy-900 px-2">Newsletter Subscribers</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr>
                          <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Email</th>
                          <th className="px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Subscribed At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subscribersList.length === 0 ? (
                          <tr>
                            <td colSpan="2" className="px-4 py-8 text-center text-slate-500 font-medium">No subscribers yet.</td>
                          </tr>
                        ) : (
                          subscribersList.map(sub => (
                            <tr key={sub.id} className="hover:bg-slate-50 transition-colors group">
                              <td className="px-4 py-4 text-sm font-bold text-navy-900 border-b border-slate-50">{sub.email}</td>
                              <td className="px-4 py-4 text-sm text-slate-500 border-b border-slate-50">{new Date(sub.created_at).toLocaleString()}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        )}
      </div>

      {/* Add User Modal */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 bg-navy-900/40 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6 gap-3">
              <div className="flex items-center gap-2">
                <Plus size={24} className="text-blue-500" />
                <h3 className="text-xl font-bold text-navy-900">Add New User</h3>
              </div>
              <button 
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors shrink-0" 
                onClick={() => setIsAddUserModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleAddUser} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-navy-900">Full Name</label>
                <input
                  type="text"
                  required
                  value={addUserFormData.name}
                  onChange={e => setAddUserFormData({ ...addUserFormData, name: e.target.value })}
                  placeholder="e.g. John Doe"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy transition-all"
                />
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-navy-900">Email Address</label>
                <input
                  type="email"
                  required
                  value={addUserFormData.email}
                  onChange={e => setAddUserFormData({ ...addUserFormData, email: e.target.value })}
                  placeholder="e.g. john@example.com"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy transition-all"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-navy-900">Password</label>
                <input
                  type="password"
                  required
                  value={addUserFormData.password}
                  onChange={e => setAddUserFormData({ ...addUserFormData, password: e.target.value })}
                  placeholder="Temporary password"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy transition-all"
                />
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-navy-900">System Role</label>
                <select
                  value={addUserFormData.role}
                  onChange={e => setAddUserFormData({ ...addUserFormData, role: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy transition-all appearance-none cursor-pointer"
                >
                  <option value="learner">Learner</option>
                  <option value="reviewer">Reviewer</option>
                  <option value="expert">Expert</option>
                  <option value="sub_admin">Sub-Admin</option>
                  <option value="admin">Super Admin</option>
                </select>
              </div>
              
              <div className="flex gap-3 pt-4 border-t border-slate-100 mt-2">
                <button 
                  type="button" 
                  className="flex-1 py-3 bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-xl transition-all" 
                  onClick={() => setIsAddUserModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm transition-all" 
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Role Modal */}
      {isUserRoleModalOpen && (
        <div className="fixed inset-0 bg-navy-900/40 backdrop-blur-sm z-[1000] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6 gap-3">
              <div className="flex items-center gap-2">
                <Shield size={24} className="text-blue-500" />
                <h3 className="text-xl font-bold text-navy-900">Change User Role</h3>
              </div>
              <button 
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors shrink-0" 
                onClick={() => setIsUserRoleModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="flex flex-col gap-6">
              <p className="text-sm font-medium text-slate-500 leading-relaxed">
                Update system access permissions for <strong className="text-navy-900">{currentUserToEdit?.name}</strong> ({currentUserToEdit?.email}).
              </p>
              
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-navy-900">System Role</label>
                <select
                  value={userRoleData}
                  onChange={e => setUserRoleData(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy transition-all appearance-none cursor-pointer"
                >
                  <option value="learner">Learner</option>
                  <option value="reviewer">Reviewer</option>
                  <option value="sub_admin">Sub-Admin</option>
                  <option value="admin">Super Admin</option>
                </select>
              </div>
              
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button 
                  className="flex-1 py-3 bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-xl transition-all" 
                  onClick={() => setIsUserRoleModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-sm transition-all" 
                  onClick={handleUpdateRole}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
