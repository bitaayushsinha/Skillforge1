import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/AuthContext';

/**
 * Mobile equivalent of web's AdminProtectedRoute, ExpertProtectedRoute, ReviewerProtectedRoute, and SubAdminProtectedRoute.
 */

export const AdminGuard = ({ children, fallback }) => {
  const { user } = useAuth();
  if (!user || user.role !== 'admin') {
    return fallback || <AccessDeniedScreen requiredRole="Administrator" />;
  }
  return children;
};

export const ExpertGuard = ({ children, fallback }) => {
  const { user } = useAuth();
  if (!user || (user.role !== 'expert' && user.role !== 'admin')) {
    return fallback || <AccessDeniedScreen requiredRole="Industry Expert" />;
  }
  return children;
};

export const ReviewerGuard = ({ children, fallback }) => {
  const { user } = useAuth();
  if (!user || (user.role !== 'reviewer' && user.role !== 'admin')) {
    return fallback || <AccessDeniedScreen requiredRole="Reviewer" />;
  }
  return children;
};

export const SubAdminGuard = ({ children, requiredPrivilege, fallback }) => {
  const { user } = useAuth();
  if (!user) {
    return fallback || <AccessDeniedScreen requiredRole="Sub-Admin" />;
  }
  if (user.role === 'admin') {
    return children; // Admin has unrestricted access
  }
  if (user.role !== 'sub_admin') {
    return fallback || <AccessDeniedScreen requiredRole="Sub-Admin" />;
  }
  // If specific privilege key is required, verify against sub-admin privileges object
  if (requiredPrivilege && user.privileges && !user.privileges[requiredPrivilege]) {
    return fallback || <AccessDeniedScreen requiredRole={`Sub-Admin (${requiredPrivilege})`} />;
  }
  return children;
};

export const POCGuard = ({ children, fallback }) => {
  const { user } = useAuth();
  const canAccessPOC =
    user &&
    (user.role === 'poc' ||
      user.role === 'admin' ||
      (user.role === 'sub_admin' && user.privileges && user.privileges.verify_assessments));

  if (!canAccessPOC) {
    return fallback || <AccessDeniedScreen requiredRole="Institute POC / Assessment Verifier" />;
  }
  return children;
};

export const AccessDeniedScreen = ({ requiredRole }) => {
  const { logout } = useAuth();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Access Restricted</Text>
      <Text style={styles.message}>
        You must be signed in as an {requiredRole || 'authorized role'} to access this section.
      </Text>
      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutBtnText}>Sign Out & Switch Account</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF7F2',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ef4444',
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  logoutBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  logoutBtnText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
  },
});
