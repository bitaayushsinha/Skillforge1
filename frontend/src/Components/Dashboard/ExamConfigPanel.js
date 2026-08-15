import React, { useState, useEffect } from 'react';
import { Settings, Save, AlertCircle, CheckCircle } from 'lucide-react';

const ExamConfigPanel = () => {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Dummy subjects for demo
  const [subjects] = useState([
    { id: 1, name: 'Sample Subject' }
  ]);

  const [formData, setFormData] = useState({
    subject_id: 1,
    level: 'District',
    duration_minutes: 60,
    question_count: 60,
    ai_mock_enabled: true,
    randomize_questions: true,
    max_attempts: 1,
    per_day_ai_limit: 3,
    max_violations: 3
  });
  
  const [existingConfigId, setExistingConfigId] = useState(null);

  useEffect(() => {
    fetchConfig();
  }, [formData.subject_id, formData.level]);

  const fetchConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('sf_token');
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/exam-configs/?subject_id=${formData.subject_id}&level=${formData.level}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const conf = data[0];
          setFormData({
            subject_id: conf.subject_id,
            level: conf.level,
            duration_minutes: conf.duration_minutes,
            question_count: conf.question_count,
            ai_mock_enabled: conf.ai_mock_enabled,
            randomize_questions: conf.randomize_questions ?? true,
            max_attempts: conf.max_attempts,
            per_day_ai_limit: conf.per_day_ai_limit,
            max_violations: conf.max_violations ?? 3
          });
          setExistingConfigId(conf.id);
        } else {
          setExistingConfigId(null);
          setFormData(prev => ({
            ...prev,
            duration_minutes: 60,
            question_count: 60,
            ai_mock_enabled: true,
            randomize_questions: true,
            max_attempts: 1,
            per_day_ai_limit: 3,
            max_violations: 3
          }));
        }
      }
    } catch (err) {
      setError('Failed to fetch config');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');
    setError(null);
    
    try {
      const token = localStorage.getItem('sf_token');
      const url = existingConfigId 
        ? `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/exam-configs/${existingConfigId}`
        : `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/exam-configs/`;
        
      const method = existingConfigId ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        const data = await res.json();
        setExistingConfigId(data.id);
        setSuccessMsg('Exam configuration saved successfully!');
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        throw new Error('Failed to save config');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2 border-b pb-4">
        <Settings className="text-indigo-600" size={24} />
        <h2 className="text-2xl font-bold text-slate-800">Exam Configuration</h2>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
          <AlertCircle size={20} /> {error}
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 text-emerald-700 rounded-lg flex items-center gap-2">
          <CheckCircle size={20} /> {successMsg}
        </div>
      )}

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="bg-slate-50 p-4 rounded-lg space-y-4">
              <h3 className="font-semibold text-slate-700 border-b pb-2">Target Filter</h3>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                <select 
                  value={formData.subject_id} 
                  onChange={e => setFormData({...formData, subject_id: parseInt(e.target.value)})}
                  className="w-full border-slate-300 rounded-lg shadow-sm p-2 border"
                >
                  {subjects.map(sub => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Level</label>
                <select 
                  value={formData.level} 
                  onChange={e => setFormData({...formData, level: e.target.value})}
                  className="w-full border-slate-300 rounded-lg shadow-sm p-2 border"
                >
                  <option value="Institution">Institution</option>
                  <option value="District">District</option>
                  <option value="State">State</option>
                  <option value="National">National</option>
                </select>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg space-y-4">
              <h3 className="font-semibold text-slate-700 border-b pb-2">Exam Parameters</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Duration (mins)</label>
                  <input 
                    type="number" min="10" max="300"
                    value={formData.duration_minutes} 
                    onChange={e => setFormData({...formData, duration_minutes: parseInt(e.target.value)})}
                    className="w-full border-slate-300 rounded-lg shadow-sm p-2 border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Question Count</label>
                  <input 
                    type="number" min="5" max="200"
                    value={formData.question_count} 
                    onChange={e => setFormData({...formData, question_count: parseInt(e.target.value)})}
                    className="w-full border-slate-300 rounded-lg shadow-sm p-2 border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Max Attempts</label>
                  <input 
                    type="number" min="1" max="5"
                    value={formData.max_attempts} 
                    onChange={e => setFormData({...formData, max_attempts: parseInt(e.target.value)})}
                    className="w-full border-slate-300 rounded-lg shadow-sm p-2 border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Daily AI Limit</label>
                  <input 
                    type="number" min="0" max="20"
                    value={formData.per_day_ai_limit} 
                    onChange={e => setFormData({...formData, per_day_ai_limit: parseInt(e.target.value)})}
                    className="w-full border-slate-300 rounded-lg shadow-sm p-2 border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Max Violations (Auto-Suspend)</label>
                  <input 
                    type="number" min="1" max="10"
                    value={formData.max_violations} 
                    onChange={e => setFormData({...formData, max_violations: parseInt(e.target.value)})}
                    className="w-full border-slate-300 rounded-lg shadow-sm p-2 border"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Randomize Questions</label>
                  <span className="text-xs text-slate-500">Randomly select questions from the bank</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.randomize_questions} 
                    onChange={e => setFormData({...formData, randomize_questions: e.target.checked})}
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-slate-700">AI Mock Practice</label>
                  <span className="text-xs text-slate-500">Allow students to take AI generated mocks</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.ai_mock_enabled} 
                    onChange={e => setFormData({...formData, ai_mock_enabled: e.target.checked})}
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            </div>
            
          </div>
          
          <div className="flex justify-end pt-4 border-t">
            <button 
              type="submit" 
              disabled={loading}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-indigo-700"
            >
              <Save size={18} /> {existingConfigId ? 'Update Config' : 'Save Config'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExamConfigPanel;
