import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Users,
  Search,
  Plus,
  Edit3,
  KeyRound,
  ShieldAlert,
  BookOpen,
  X,
  Check,
  AlertCircle,
  Filter,
  UserCheck,
  UserX,
} from 'lucide-react-native';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import Header from '../../components/common/Header';
import api from '../../services/api';

export default function StudentsScreen() {
  const [students, setStudents] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpec, setSelectedSpec] = useState('');
  const [error, setError] = useState(null);

  // Modal for Create Student
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newStudent, setNewStudent] = useState({
    name: '',
    email: '',
    password: '',
    institution_id: null,
    specialization: '',
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  // Action Modal / Sheet for specific student
  const [actionStudent, setActionStudent] = useState(null);
  const [actionModalVisible, setActionModalVisible] = useState(false);

  // Sub-modal states inside Action sheet
  const [allocSpec, setAllocSpec] = useState('');
  const [resetPwd, setResetPwd] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);

  const fetchStudentsData = useCallback(async () => {
    try {
      setError(null);
      const params = {};
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (selectedSpec) params.specialization = selectedSpec;

      const [studRes, specRes, instRes] = await Promise.all([
        api.get('/api/admin/students', { params }),
        api.get('/api/admin/students/specializations').catch(() => ({ data: [] })),
        api.get('/api/institutions').catch(() => ({ data: [] })),
      ]);

      setStudents(studRes.data || []);
      setSpecializations(specRes.data || []);
      setInstitutions(instRes.data || []);
    } catch (err) {
      console.error('Error fetching student directory:', err);
      setError('Could not load student records. Check permissions or network.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, selectedSpec]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudentsData();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchStudentsData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStudentsData();
  };

  const handleCreateStudent = async () => {
    if (!newStudent.name.trim() || !newStudent.email.trim() || !newStudent.password.trim()) {
      setCreateError('Name, Email, and Password are required.');
      return;
    }
    try {
      setCreating(true);
      setCreateError(null);
      await api.post('/api/admin/students', newStudent);
      setCreateModalVisible(false);
      setNewStudent({ name: '', email: '', password: '', institution_id: null, specialization: '' });
      fetchStudentsData();
    } catch (err) {
      console.error('Error creating student:', err);
      setCreateError(err.response?.data?.detail || 'Failed to enroll student.');
    } finally {
      setCreating(false);
    }
  };

  const handleAllocateSpecialization = async () => {
    if (!allocSpec) return;
    try {
      setActionLoading(true);
      setActionError(null);
      await api.put(`/api/admin/students/${actionStudent.id}/specialization`, { specialization: allocSpec });
      Alert.alert('Success', `Specialization updated to ${allocSpec}`);
      setActionModalVisible(false);
      fetchStudentsData();
    } catch (err) {
      setActionError(err.response?.data?.detail || 'Failed to allocate specialization.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (resetPwd.length < 6) {
      setActionError('New password must be at least 6 characters.');
      return;
    }
    try {
      setActionLoading(true);
      setActionError(null);
      await api.put(`/api/admin/students/${actionStudent.id}/password`, { new_password: resetPwd });
      Alert.alert('Success', `Password reset successfully for ${actionStudent.email}`);
      setResetPwd('');
      setActionModalVisible(false);
    } catch (err) {
      setActionError(err.response?.data?.detail || 'Failed to reset password.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOverrideAccess = async (actionType) => {
    if (!overrideReason.trim()) {
      setActionError('Please provide a reason for manual access override.');
      return;
    }
    try {
      setActionLoading(true);
      setActionError(null);
      // Try finding active registration or invoke override directly if available
      // First let's check access-status endpoint
      const statusRes = await api.get('/api/admin/analytics/access-status').catch(() => ({ data: { records: [] } }));
      const regRecord = statusRes.data?.records?.find((r) => r.email === actionStudent.email);
      
      if (regRecord) {
        await api.post(`/api/admin/analytics/access-status/${regRecord.registration_id}/override`, {
          action: actionType,
          reason: overrideReason,
        });
        Alert.alert('Success', `Student status overridden to ${actionType === 'activate' ? 'Active' : 'Deactivated'}`);
        setActionModalVisible(false);
        fetchStudentsData();
      } else {
        setActionError('Active program registration record not found for override.');
      }
    } catch (err) {
      setActionError(err.response?.data?.detail || 'Failed to override access status.');
    } finally {
      setActionLoading(false);
    }
  };

  const getInstitutionName = (id) => {
    const inst = institutions.find((i) => i.id === id);
    return inst ? inst.name : 'Unassigned / Independent';
  };

  return (
    <ScreenWrapper>
      <Header title="Student Directory" subtitle="Learner Records & Allocation" />

      {/* Search and Action Header */}
      <View style={styles.topContainer}>
        <View style={styles.searchBox}>
          <Search size={18} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search learner by name or email..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} color="#64748b" />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={() => setCreateModalVisible(true)}>
          <Plus size={18} color="#0f172a" />
          <Text style={styles.addBtnText}>Enroll</Text>
        </TouchableOpacity>
      </View>

      {/* Specialization Filter Pills */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterPill, selectedSpec === '' && styles.filterPillActive]}
            onPress={() => setSelectedSpec('')}
          >
            <Text style={[styles.filterText, selectedSpec === '' && styles.filterTextActive]}>All Programs</Text>
          </TouchableOpacity>
          {specializations.map((spec) => (
            <TouchableOpacity
              key={spec.id || spec.name}
              style={[styles.filterPill, selectedSpec === spec.name && styles.filterPillActive]}
              onPress={() => setSelectedSpec(spec.name)}
            >
              <Text style={[styles.filterText, selectedSpec === spec.name && styles.filterTextActive]}>
                {spec.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#f59e0b" />}
      >
        {error ? (
          <View style={styles.errorBanner}>
            <AlertCircle size={18} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#f59e0b" />
            <Text style={styles.loadingText}>Loading directory...</Text>
          </View>
        ) : students.length === 0 ? (
          <View style={styles.emptyCard}>
            <Users size={36} color="#64748b" />
            <Text style={styles.emptyTitle}>No Students Found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery || selectedSpec ? 'No records match your filters.' : 'Click "+ Enroll" to add your first learner.'}
            </Text>
          </View>
        ) : (
          students.map((student) => (
            <View key={student.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.studentInfo}>
                  <Text style={styles.studentName}>{student.name}</Text>
                  <Text style={styles.studentEmail}>{student.email}</Text>
                </View>
                <View style={[styles.statusBadge, student.is_active ? styles.badgeActive : styles.badgeInactive]}>
                  <Text style={[styles.statusText, student.is_active ? { color: '#10b981' } : { color: '#f87171' }]}>
                    {student.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <View style={styles.metaBox}>
                  <BookOpen size={14} color="#818cf8" />
                  <Text style={styles.metaLabel} numberOfLines={1}>
                    {student.specialization || 'No Specialization'}
                  </Text>
                </View>
                <View style={styles.metaBox}>
                  <Text style={styles.instLabel} numberOfLines={1}>
                    {getInstitutionName(student.institution_id)}
                  </Text>
                </View>
              </View>

              <View style={styles.actionFooter}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => {
                    setActionStudent(student);
                    setAllocSpec(student.specialization || '');
                    setResetPwd('');
                    setOverrideReason('');
                    setActionError(null);
                    setActionModalVisible(true);
                  }}
                >
                  <Edit3 size={14} color="#f59e0b" />
                  <Text style={styles.actionBtnText}>Manage Account</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Enroll Student Modal */}
      <Modal visible={createModalVisible} transparent animationType="slide" onRequestClose={() => setCreateModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Enroll New Learner</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <X size={22} color="#475569" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {createError ? (
                <View style={styles.modalErrorBanner}>
                  <AlertCircle size={16} color="#ef4444" />
                  <Text style={styles.modalErrorText}>{createError}</Text>
                </View>
              ) : null}

              <Text style={styles.inputLabel}>Full Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Student Name"
                placeholderTextColor="#64748b"
                value={newStudent.name}
                onChangeText={(t) => setNewStudent({ ...newStudent, name: t })}
              />

              <Text style={styles.inputLabel}>Email Address *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="student@example.com"
                placeholderTextColor="#64748b"
                keyboardType="email-address"
                autoCapitalize="none"
                value={newStudent.email}
                onChangeText={(t) => setNewStudent({ ...newStudent, email: t })}
              />

              <Text style={styles.inputLabel}>Temporary Password *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Secret@123"
                placeholderTextColor="#64748b"
                secureTextEntry
                value={newStudent.password}
                onChangeText={(t) => setNewStudent({ ...newStudent, password: t })}
              />

              <Text style={styles.inputLabel}>Assign Specialization</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerRow}>
                {specializations.map((s) => (
                  <TouchableOpacity
                    key={s.id || s.name}
                    style={[styles.pickerPill, newStudent.specialization === s.name && styles.pickerPillActive]}
                    onPress={() => setNewStudent({ ...newStudent, specialization: s.name })}
                  >
                    <Text style={[styles.pickerText, newStudent.specialization === s.name && { color: '#0f172a', fontWeight: '800' }]}>
                      {s.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Assign Institution</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerRow}>
                <TouchableOpacity
                  style={[styles.pickerPill, newStudent.institution_id === null && styles.pickerPillActive]}
                  onPress={() => setNewStudent({ ...newStudent, institution_id: null })}
                >
                  <Text style={[styles.pickerText, newStudent.institution_id === null && { color: '#0f172a', fontWeight: '800' }]}>
                    Independent / None
                  </Text>
                </TouchableOpacity>
                {institutions.map((inst) => (
                  <TouchableOpacity
                    key={inst.id}
                    style={[styles.pickerPill, newStudent.institution_id === inst.id && styles.pickerPillActive]}
                    onPress={() => setNewStudent({ ...newStudent, institution_id: inst.id })}
                  >
                    <Text style={[styles.pickerText, newStudent.institution_id === inst.id && { color: '#0f172a', fontWeight: '800' }]}>
                      {inst.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setCreateModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleCreateStudent} disabled={creating}>
                {creating ? <ActivityIndicator size="small" color="#0f172a" /> : <Text style={styles.saveBtnText}>Enroll Learner</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Action / Management Sheet */}
      <Modal visible={actionModalVisible} transparent animationType="fade" onRequestClose={() => setActionModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{actionStudent?.name}</Text>
                <Text style={styles.modalSub}>{actionStudent?.email}</Text>
              </View>
              <TouchableOpacity onPress={() => setActionModalVisible(false)}>
                <X size={22} color="#475569" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {actionError ? (
                <View style={styles.modalErrorBanner}>
                  <AlertCircle size={16} color="#ef4444" />
                  <Text style={styles.modalErrorText}>{actionError}</Text>
                </View>
              ) : null}

              {/* Specialization Allocation Section */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionHead}>Allocate Specialization</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerRow}>
                  {specializations.map((s) => (
                    <TouchableOpacity
                      key={s.id || s.name}
                      style={[styles.pickerPill, allocSpec === s.name && styles.pickerPillActive]}
                      onPress={() => setAllocSpec(s.name)}
                    >
                      <Text style={[styles.pickerText, allocSpec === s.name && { color: '#0f172a', fontWeight: '800' }]}>
                        {s.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity style={styles.subActionBtn} onPress={handleAllocateSpecialization} disabled={actionLoading}>
                  <Check size={16} color="#0f172a" />
                  <Text style={styles.subActionText}>Save Specialization</Text>
                </TouchableOpacity>
              </View>

              {/* Password Reset Section */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionHead}>Reset Password</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="New strong password..."
                  placeholderTextColor="#64748b"
                  secureTextEntry
                  value={resetPwd}
                  onChangeText={setResetPwd}
                />
                <TouchableOpacity
                  style={[styles.subActionBtn, { backgroundColor: '#38bdf8', marginTop: 10 }]}
                  onPress={handleResetPassword}
                  disabled={actionLoading}
                >
                  <KeyRound size={16} color="#0f172a" />
                  <Text style={styles.subActionText}>Reset Password</Text>
                </TouchableOpacity>
              </View>

              {/* Access Override Section */}
              <View style={styles.sectionCard}>
                <Text style={styles.sectionHead}>Manual Access Status Override</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Audit reason for override..."
                  placeholderTextColor="#64748b"
                  value={overrideReason}
                  onChangeText={setOverrideReason}
                />
                <View style={styles.overrideBtnRow}>
                  <TouchableOpacity
                    style={[styles.overrideBtn, { backgroundColor: 'rgba(16, 185, 129, 0.2)', borderColor: '#10b981' }]}
                    onPress={() => handleOverrideAccess('activate')}
                    disabled={actionLoading}
                  >
                    <UserCheck size={16} color="#10b981" />
                    <Text style={[styles.overrideText, { color: '#10b981' }]}>Activate Access</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.overrideBtn, { backgroundColor: 'rgba(239, 68, 68, 0.2)', borderColor: '#ef4444' }]}
                    onPress={() => handleOverrideAccess('deactivate')}
                    disabled={actionLoading}
                  >
                    <UserX size={16} color="#ef4444" />
                    <Text style={[styles.overrideText, { color: '#ef4444' }]}>Deactivate Access</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  topContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  searchInput: {
    flex: 1,
    color: '#0f172a',
    fontSize: 14,
    marginLeft: 8,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f59e0b',
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 12,
    gap: 6,
  },
  addBtnText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '800',
  },
  filterContainer: {
    marginTop: 10,
  },
  filterScroll: {
    paddingHorizontal: 20,
    gap: 8,
    paddingBottom: 6,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  filterPillActive: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  filterText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#0f172a',
    fontWeight: '800',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#ef4444',
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 13,
    flex: 1,
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: '#475569',
    marginTop: 12,
    fontSize: 14,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  studentEmail: {
    fontSize: 13,
    color: '#475569',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  badgeInactive: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
  },
  metaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaLabel: {
    fontSize: 13,
    color: '#818cf8',
    fontWeight: '600',
  },
  instLabel: {
    fontSize: 12,
    color: '#334155',
  },
  actionFooter: {
    marginTop: 6,
    alignItems: 'flex-end',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
  },
  actionBtnText: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalSub: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  modalScroll: {
    padding: 18,
  },
  modalErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
    gap: 8,
  },
  modalErrorText: {
    color: '#fca5a5',
    fontSize: 12,
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
    marginTop: 12,
  },
  textInput: {
    backgroundColor: '#FAF7F2',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    color: '#0f172a',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  pickerRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 6,
  },
  pickerPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#FAF7F2',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  pickerPillActive: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  pickerText: {
    color: '#475569',
    fontSize: 12,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
    gap: 10,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#FAF7F2',
  },
  cancelBtnText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '600',
  },
  saveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f59e0b',
  },
  saveBtnText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '800',
  },
  sectionCard: {
    backgroundColor: '#FAF7F2',
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  sectionHead: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
  },
  subActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f59e0b',
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 10,
    gap: 6,
  },
  subActionText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '800',
  },
  overrideBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  overrideBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  overrideText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
