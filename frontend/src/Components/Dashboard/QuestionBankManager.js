import React, { useState, useEffect } from 'react';
import { Upload, Plus, Trash2, List, FileText, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

const QuestionBankManager = () => {
  const [banks, setBanks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [showCreate, setShowCreate] = useState(false);
  const [newBank, setNewBank] = useState({ subject_id: '', level: 'District', name: '', is_active: true });
  
  const [selectedBank, setSelectedBank] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  
  const [subjects, setSubjects] = useState([]);

  useEffect(() => {
    fetchBanks();
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const token = localStorage.getItem('sf_token');
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/admin/subadmins/subjects`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSubjects(data);
      }
    } catch (err) {
      console.error('Failed to fetch subjects', err);
    }
  };

  const fetchBanks = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('sf_token');
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/exam-banks/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBanks(data);
      } else {
        throw new Error('Failed to fetch question banks');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBank = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('sf_token');
      // For this demo, using a static subject_id = 1 if none selected
      const payload = {
        ...newBank,
        subject_id: parseInt(newBank.subject_id) || 1
      };
      
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/exam-banks/`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setShowCreate(false);
        setNewBank({ subject_id: '', level: 'District', name: '', is_active: true });
        fetchBanks();
      } else {
        throw new Error('Failed to create question bank');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile || !selectedBank) return;
    
    setUploadStatus({ type: 'loading', message: 'Processing file...' });
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target.result;
        // Basic JSON parsing assuming format: [{"text": "Q1", "options": ["A","B"], "correct_answer": 0}]
        let questions = JSON.parse(content);
        
        // Normalize correct_answer to be an integer
        questions = questions.map(q => {
          let ans = q.correct_answer;
          if (typeof ans === 'string') {
            const upper = ans.trim().toUpperCase();
            if (['A', 'B', 'C', 'D', 'E'].includes(upper)) {
              ans = upper.charCodeAt(0) - 65;
            } else {
              ans = parseInt(ans, 10);
            }
          }
          return {
            ...q,
            correct_answer: isNaN(ans) ? 0 : ans
          };
        });
        
        const token = localStorage.getItem('sf_token');
        const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/exam-banks/${selectedBank.id}/questions/upload`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify(questions)
        });
        
        const data = await res.json();
        if (res.ok && data.success) {
          setUploadStatus({ type: 'success', message: `Successfully imported ${data.imported_count} questions.`, errors: data.errors });
          setUploadFile(null);
        } else {
          let errs = data.errors || [];
          if (data.detail && Array.isArray(data.detail)) {
            errs = data.detail.map(e => `${e.loc.join('.')}: ${e.msg}`);
          } else if (data.detail && typeof data.detail === 'string') {
            errs = [data.detail];
          }
          if (errs.length === 0) errs = ['Failed to upload (Invalid JSON structure or server error)'];
          
          setUploadStatus({ type: 'error', message: 'Upload completed with errors.', errors: errs });
        }
      } catch (err) {
        setUploadStatus({ type: 'error', message: `Parse Error: ${err.message}` });
      }
    };
    reader.readAsText(uploadFile);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <List className="text-indigo-600" /> Question Bank Manager
        </h2>
        <button 
          onClick={() => setShowCreate(!showCreate)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-indigo-700"
        >
          <Plus size={18} /> New Bank
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
          <AlertCircle size={20} /> {error}
        </div>
      )}

      {showCreate && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-semibold mb-4 border-b pb-2">Create New Question Bank</h3>
          <form onSubmit={handleCreateBank} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
              <select 
                required
                value={newBank.subject_id} onChange={e => setNewBank({...newBank, subject_id: e.target.value})}
                className="w-full border-slate-300 rounded-lg shadow-sm p-2 border"
              >
                <option value="">Select a subject...</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <input 
                required type="text" 
                value={newBank.name} onChange={e => setNewBank({...newBank, name: e.target.value})}
                className="w-full border-slate-300 rounded-lg shadow-sm p-2 border" 
                placeholder="e.g. Java Fundamentals Q1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Level</label>
              <select 
                value={newBank.level} onChange={e => setNewBank({...newBank, level: e.target.value})}
                className="w-full border-slate-300 rounded-lg shadow-sm p-2 border"
              >
                <option value="Institution">Institution</option>
                <option value="District">District</option>
                <option value="State">State</option>
                <option value="National">National</option>
              </select>
            </div>
            <div className="col-span-full">
              <button type="submit" disabled={loading} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700">
                {loading ? 'Creating...' : 'Create Bank'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="bg-slate-50 p-4 border-b border-slate-200">
            <h3 className="font-semibold text-slate-700">Existing Banks</h3>
          </div>
          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
            {banks.length === 0 ? (
              <div className="p-4 text-slate-500 text-center">No question banks found.</div>
            ) : (
              banks.map(bank => (
                <div 
                  key={bank.id} 
                  onClick={() => { setSelectedBank(bank); setUploadStatus(null); }}
                  className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors ${selectedBank?.id === bank.id ? 'bg-indigo-50 border-l-4 border-indigo-600' : ''}`}
                >
                  <div className="font-medium text-slate-800">{bank.name}</div>
                  <div className="text-xs text-slate-500 mt-1 flex justify-between">
                    <span>Level: {bank.level}</span>
                    <span className={bank.is_active ? "text-emerald-600" : "text-rose-600"}>
                      {bank.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {selectedBank ? (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
              <h3 className="text-xl font-semibold mb-2">{selectedBank.name}</h3>
              <p className="text-sm text-slate-500 mb-6">Manage questions and upload new question sets in JSON format.</p>
              
              <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 border-dashed mb-6 text-center">
                <FileText size={32} className="mx-auto text-slate-400 mb-2" />
                <h4 className="font-medium text-slate-700 mb-1">Upload Questions</h4>
                <p className="text-xs text-slate-500 mb-4">Format: JSON Array of objects (text, options[], correct_answer)</p>
                
                <form onSubmit={handleFileUpload} className="flex flex-col items-center gap-4">
                  <input 
                    type="file" 
                    accept=".json"
                    onChange={(e) => setUploadFile(e.target.files[0])}
                    className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  />
                  <button 
                    type="submit" 
                    disabled={!uploadFile || uploadStatus?.type === 'loading'}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {uploadStatus?.type === 'loading' ? <RefreshCw className="animate-spin" size={18} /> : <Upload size={18} />}
                    Upload File
                  </button>
                </form>
              </div>

              {uploadStatus && (
                <div className={`p-4 rounded-lg border ${uploadStatus.type === 'success' ? 'bg-emerald-50 border-emerald-200' : uploadStatus.type === 'error' ? 'bg-rose-50 border-rose-200' : 'bg-blue-50 border-blue-200'}`}>
                  <div className={`font-medium flex items-center gap-2 ${uploadStatus.type === 'success' ? 'text-emerald-800' : uploadStatus.type === 'error' ? 'text-rose-800' : 'text-blue-800'}`}>
                    {uploadStatus.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                    {uploadStatus.message}
                  </div>
                  {uploadStatus.errors && uploadStatus.errors.length > 0 && (
                    <ul className="mt-2 text-sm text-rose-600 list-disc list-inside">
                      {uploadStatus.errors.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-12 flex flex-col items-center justify-center text-slate-500 h-full">
              <List size={48} className="text-slate-300 mb-4" />
              <p>Select a question bank from the left to manage it.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuestionBankManager;
