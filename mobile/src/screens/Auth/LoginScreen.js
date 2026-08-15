import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { APP_NAME } from '../../config/env';

const DEMO_ROLES = [
  { label: 'Learner', email: 'learner@skillforge.com', pass: 'learner123', color: '#3b82f6' },
  { label: 'Expert', email: 'expert@skillforge.com', pass: 'expert123', color: '#8b5cf6' },
  { label: 'Reviewer', email: 'reviewer@skillforge.com', pass: 'reviewer123', color: '#ec4899' },
  { label: 'Admin', email: 'admin@skillforge.com', pass: 'admin123', color: '#f59e0b' },
  { label: 'Sub-Admin', email: 'subadmin@skillforge.com', pass: 'subadmin123', color: '#10b981' },
  { label: 'POC', email: 'poc@skillforge.com', pass: 'poc123', color: '#06b6d4' },
];

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }
    setLoading(true);
    setErrorMessage('');
    
    const result = await login(email.trim().toLowerCase(), password);
    setLoading(false);
    if (!result.success) {
      setErrorMessage(result.error || 'Authentication failed. Please check credentials.');
    }
  };

  const handleQuickFill = (role) => {
    setEmail(role.email);
    setPassword(role.pass);
    setErrorMessage('');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Header Section */}
        <View style={styles.headerContainer}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>SF</Text>
          </View>
          <Text style={styles.title}>{APP_NAME}</Text>
          <Text style={styles.subtitle}>Mobile Learning & Administration Portal</Text>
        </View>

        {/* Login Card */}
        <View style={styles.card}>
          <Text style={styles.cardHeader}>Welcome Back</Text>
          <Text style={styles.cardSubtext}>Sign in with your verified credentials</Text>

          {errorMessage ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. learner@skillforge.com"
              placeholderTextColor="#64748b"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Enter your password"
                placeholderTextColor="#64748b"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={styles.toggleBtn}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.toggleBtnText}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.loginBtnText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Quick Demo Credentials Bar */}
        <View style={styles.demoSection}>
          <Text style={styles.demoTitle}>DEMO CREDENTIALS QUICK-FILL</Text>
          <View style={styles.demoGrid}>
            {DEMO_ROLES.map((role) => (
              <TouchableOpacity
                key={role.label}
                style={[styles.demoPill, { borderColor: role.color }]}
                onPress={() => handleQuickFill(role)}
              >
                <View style={[styles.demoDot, { backgroundColor: role.color }]} />
                <Text style={styles.demoPillText}>{role.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF7F2',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  logoBadgeText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#475569',
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  cardHeader: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  cardSubtext: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 20,
    marginTop: 2,
  },
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#ef4444',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 13,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FAF7F2',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 12,
    color: '#0f172a',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
  },
  toggleBtn: {
    position: 'absolute',
    right: 16,
    paddingVertical: 4,
  },
  toggleBtnText: {
    color: '#818cf8',
    fontSize: 13,
    fontWeight: '600',
  },
  loginBtn: {
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  loginBtnDisabled: {
    opacity: 0.6,
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  demoSection: {
    marginTop: 32,
    alignItems: 'center',
  },
  demoTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: 1.5,
    marginBottom: 14,
  },
  demoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  demoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  demoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  demoPillText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '600',
  },
});
