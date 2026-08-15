import React, { useState, useEffect } from 'react';
import { CreditCard, Download, CheckCircle, RefreshCw, AlertCircle } from 'lucide-react';

export default function PaymentHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem('sf_token');
      const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/payments/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch payment history');
      const data = await res.json();
      setHistory(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <RefreshCw className="animate-spin text-navy" size={24} />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm mt-8">
      <h2 className="text-xl font-bold text-navy-900 mb-6 flex items-center gap-2">
        <CreditCard className="text-blue-500" /> Billing & Payment History
      </h2>

      {error && (
        <div className="p-4 bg-coral-50 text-coral-600 rounded-xl text-sm font-bold flex items-center gap-2 mb-6">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {history.length === 0 ? (
        <div className="text-center text-slate-500 py-8 italic">
          No payment history found.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 text-xs uppercase tracking-wider font-bold bg-slate-50/50">
                <th className="p-4">Date</th>
                <th className="p-4">Order ID</th>
                <th className="p-4">Tier / Description</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {history.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 text-slate-600">
                    {new Date(record.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-4 font-mono text-xs text-slate-500">
                    {record.gateway_order_id}
                  </td>
                  <td className="p-4 font-bold text-navy-900">
                    {record.target_tier} Access
                  </td>
                  <td className="p-4 font-bold text-slate-700">
                    {record.currency} {record.total_amount}
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 font-bold text-xs rounded border border-emerald-200">
                      <CheckCircle size={12} /> {record.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button className="text-blue-600 hover:text-blue-800 text-sm font-bold flex items-center justify-end gap-1 ml-auto">
                      <Download size={14} /> Receipt
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
