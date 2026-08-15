import React, { useState, useEffect } from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';

const SubAdminProtectedRoute = ({ user, requiredPrivilege, children }) => {
  const [privileges, setPrivileges] = useState(user?.privileges || null);
  const [loading, setLoading] = useState(!user?.privileges && user?.role === 'sub_admin');
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
      if (!user) {
        setHasAccess(false);
        setLoading(false);
        return;
      }
      if (user.role === 'admin') {
        setHasAccess(true);
        setLoading(false);
        return;
      }
      if (user.role !== 'sub_admin') {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      let currentPrivs = privileges;
      if (!currentPrivs) {
        try {
          const token = localStorage.getItem('sf_token');
          const res = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/admin/subadmins/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            currentPrivs = data.privileges;
            setPrivileges(currentPrivs);
          }
        } catch (err) {
          console.error("Failed to fetch sub-admin privileges", err);
        }
      }

      if (!requiredPrivilege) {
        setHasAccess(true);
      } else if (currentPrivs && currentPrivs[requiredPrivilege]) {
        setHasAccess(true);
      } else {
        setHasAccess(false);
      }
      setLoading(false);
    };

    checkAccess();
  }, [user, requiredPrivilege, privileges]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 font-sans">
        <RefreshCw className="animate-spin mb-3 text-navy" size={28} />
        <p className="text-sm font-semibold">Verifying granular administrative privileges...</p>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="p-8 max-w-lg mx-auto mt-12 bg-coral-50 border border-coral-200 rounded-3xl text-center flex flex-col items-center shadow-sm font-sans">
        <div className="w-16 h-16 rounded-full bg-coral-100 text-coral-600 flex items-center justify-center mb-4">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-xl font-bold text-navy-900 mb-2">Access Denied</h2>
        <p className="text-sm text-slate-600 leading-relaxed mb-4">
          You are signed in as <strong className="text-navy">{user?.email}</strong> with role <span className="uppercase font-bold text-xs bg-slate-200 px-2 py-0.5 rounded">{user?.role}</span>, but your account lacks the required granular privilege: <strong className="text-coral-600">`{requiredPrivilege || 'admin/sub-admin'}`</strong>.
        </p>
        <p className="text-xs text-slate-400">
          Please contact the Main Super Administrator if you believe you need this capability enabled.
        </p>
      </div>
    );
  }

  return children;
};

export default SubAdminProtectedRoute;
