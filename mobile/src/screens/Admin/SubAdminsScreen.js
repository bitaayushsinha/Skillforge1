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
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  ShieldAlert,
  Plus,
  Edit3,
  Trash2,
  Check,
  X,
  AlertCircle,
  Building2,
  Lock,
  CheckCircle2,
} from 'lucide-react-native';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import Header from '../../components/common/Header';
import api from '../../services/api';

const PRIVILEGE_ITEMS = [
  { key: 'manage_institutions', label: 'Manage Institutions', desc: 'Create, edit & delete partner colleges' },
  { key: 'manage_students', label: 'Manage Students', desc: 'Enroll, edit & override student access' },
  { key: 'allocate_specializations', label: 'Allocate Specializations', desc: 'Assign batch/program tracks to students' },
  { key: 'reset_passwords', label: 'Reset Passwords', desc: 'Reset credentials for scoped students' },
  { key: 'manage_content', label: 'Manage Content & Exams', desc: 'Manage curriculum windows & live sessions' },
  { key: 'view_reports', label: 'View System Reports', desc: 'Access standard dashboard telemetry' },
  { key: 'enrollment_reports', label: 'Enrollment Analytics', desc: 'Export & view detailed batch stats' },
  { key: 'custom_reports', label: 'Custom Reports', desc: 'Generate specialized analytics queries' },
  { key: 'bulk_upload', label: 'Bulk Upload Data', desc: 'Upload CSVs for bulk student enrollment' },
];

export default function SubAdminsScreen() {
  const [subadmins, setSubAdmins] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    institution_ids: [],
    privileges: {},
  });
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState(null);

  const fetchSubAdminsData = useCallback(async () => {
    try {
      setError(null);
      const [subRes, instRes] = await Promise.all([
        api.get('/api/admin/subadmins'),
        api.get('/api/institutions').catch(() => ({ data: [] })),
      ]);
      setSubAdmins(subRes.data || []);
      setInstitutions(instRes.data || []);
    } catch (err) {
      console.error('Error fetching sub-admins:', err);
      setError('Could not load sub-admin records. Top-level Admin privileges required.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSubAdminsData();
  }, [fetchSubAdminsData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSubAdminsData();
  };

  const openCreateModal = () => {
    setEditingUserId(null);
    const initialPrivs = {};
    PRIVILEGE_ITEMS.forEach((p) => (initialPrivs[p.key] = true));
    setFormData({
      name: '',
      email: '',
      password: '',
      institution_ids: [],
      privileges: initialPrivs,
    });
    setModalError(null);
    setModalVisible(true);
  };

  const openEditModal = (sub) => {
    setEditingUserId(sub.user_id || sub.id);
    const existingPrivs = { ...sub.privileges };
    setFormData({
      name: sub.name || '',
      email: sub.email || '',
      password: '',
      institution_ids: sub.assigned_institutions?.map((i) => i.id) || sub.institution_ids || [],
      privileges: existingPrivs,
    });
    setModalError(null);
    setModalVisible(true);
  };

  const toggleInstitutionSelection = (id) => {
    setFormData((prev) => {
      const exists = prev.institution_ids.includes(id);
      if (exists) {
        return { ...prev, institution_ids: prev.institution_ids.filter((item) => item !== id) };
      } else {
        return { ...prev, institution_ids: [...prev.institution_ids, id] };
      }
    });
  };

  const togglePrivilege = (key) => {
    setFormData((prev) => ({
      ...prev,
      privileges: {
        ...prev.privileges,
        [key]: !prev.privileges[key],
      },
    }));
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      setModalError('Name and Email are required.');
      return;
    }
    if (!editingUserId && !formData.password.trim()) {
      setModalError('Password is required when creating a new Sub-Admin.');
      return;
    }
    try {
      setSaving(true);
      setModalError(null);

      if (editingUserId) {
        const payload = {
          name: formData.name,
          email: formData.email,
          institution_ids: formData.institution_ids,
          privileges: formData.privileges,
        };
        if (formData.password.trim()) {
          payload.password = formData.password.trim();
        }
        await api.put(`/api/admin/subadmins/${editingUserId}/privileges`, payload);
      } else {
        await api.post('/api/admin/subadmins', formData);
      }

      setModalVisible(false);
      fetchSubAdminsData();
    } catch (err) {
      console.error('Error saving subadmin:', err);
      setModalError(err.response?.data?.detail || 'Failed to save sub-admin.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (sub) => {
    Alert.alert(
      'Revoke Sub-Admin Access',
      `Are you sure you want to permanently delete account for "${sub.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/admin/subadmins/${sub.user_id || sub.id}`);
              fetchSubAdminsData();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.detail || 'Failed to delete sub-admin.');
            }
          },
        },
      ]
    );
  };

  return (
    <ScreenWrapper>
      <Header title="Sub-Admins" subtitle="Role Privileges & Scoping Control" />

      <View style={styles.topBar}>
        <Text style={styles.topLabel}>Authorized Sub-Administrators ({subadmins.length})</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openCreateModal}>
          <Plus size={18} color="#0f172a" />
          <Text style={styles.addBtnText}>Add Sub-Admin</Text>
        </TouchableOpacity>
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
            <Text style={styles.loadingText}>Loading sub-admin permissions...</Text>
          </View>
        ) : subadmins.length === 0 ? (
          <View style={styles.emptyCard}>
            <ShieldAlert size={36} color="#64748b" />
            <Text style={styles.emptyTitle}>No Sub-Admins Configured</Text>
            <Text style={styles.emptySubtext}>
              Assign delegated administrators with restricted college scopes and tailored feature toggles.
            </Text>
          </View>
        ) : (
          subadmins.map((sub) => {
            const activePrivCount = Object.values(sub.privileges || {}).filter(Boolean).length;
            const scopeCount = sub.assigned_institutions?.length || sub.institution_ids?.length || 0;

            return (
              <View key={sub.user_id || sub.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.subInfo}>
                    <Text style={styles.subName}>{sub.name}</Text>
                    <Text style={styles.subEmail}>{sub.email}</Text>
                  </View>
                  <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => openEditModal(sub)}>
                      <Edit3 size={16} color="#38bdf8" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => handleDelete(sub)}>
                      <Trash2 size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.metaDivider} />

                <View style={styles.scopeBox}>
                  <View style={styles.scopeHeader}>
                    <Building2 size={14} color="#818cf8" />
                    <Text style={styles.scopeTitle}>
                      Institution Scopes: <Text style={styles.scopeCount}>{scopeCount === 0 ? 'Global / All' : `${scopeCount} Colleges`}</Text>
                    </Text>
                  </View>
                  {sub.assigned_institutions?.length > 0 ? (
                    <View style={styles.pillWrap}>
                      {sub.assigned_institutions.map((inst) => (
                        <View key={inst.id} style={styles.instPill}>
                          <Text style={styles.instPillText}>{inst.name}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>

                <View style={styles.privSummary}>
                  <Lock size={14} color="#10b981" />
                  <Text style={styles.privText}>{activePrivCount} of {PRIVILEGE_ITEMS.length} Permissions Enabled</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Create / Edit Sub-Admin Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingUserId ? 'Edit Sub-Admin Scopes' : 'Create Sub-Admin'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={22} color="#475569" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {modalError ? (
                <View style={styles.modalErrorBanner}>
                  <AlertCircle size={16} color="#ef4444" />
                  <Text style={styles.modalErrorText}>{modalError}</Text>
                </View>
              ) : null}

              <Text style={styles.sectionHead}>Account Profile</Text>
              <Text style={styles.inputLabel}>Full Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Delegate Name"
                placeholderTextColor="#64748b"
                value={formData.name}
                onChangeText={(t) => setFormData({ ...formData, name: t })}
              />

              <Text style={styles.inputLabel}>Email Address *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="subadmin@college.edu"
                placeholderTextColor="#64748b"
                keyboardType="email-address"
                autoCapitalize="none"
                value={formData.email}
                onChangeText={(t) => setFormData({ ...formData, email: t })}
              />

              <Text style={styles.inputLabel}>{editingUserId ? 'New Password (leave blank to keep current)' : 'Password *'}</Text>
              <TextInput
                style={styles.textInput}
                placeholder={editingUserId ? '••••••••' : 'Secret@123'}
                placeholderTextColor="#64748b"
                secureTextEntry
                value={formData.password}
                onChangeText={(t) => setFormData({ ...formData, password: t })}
              />

              <Text style={[styles.sectionHead, { marginTop: 20 }]}>Assigned Institution Scopes</Text>
              <Text style={styles.scopeHint}>
                Select which partner colleges this sub-admin can view/manage. Leave none selected for Global access.
              </Text>

              <View style={styles.instSelectionList}>
                {institutions.map((inst) => {
                  const isSelected = formData.institution_ids.includes(inst.id);
                  return (
                    <TouchableOpacity
                      key={inst.id}
                      style={[styles.instSelectRow, isSelected && styles.instSelectRowActive]}
                      onPress={() => toggleInstitutionSelection(inst.id)}
                    >
                      <Text style={[styles.instSelectText, isSelected && { color: '#0f172a', fontWeight: '700' }]}>
                        {inst.name} ({inst.code || 'NO-CODE'})
                      </Text>
                      {isSelected ? <CheckCircle2 size={18} color="#f59e0b" /> : null}
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.sectionHead, { marginTop: 20 }]}>Granular Privilege Toggles</Text>
              <View style={styles.privsList}>
                {PRIVILEGE_ITEMS.map((item) => {
                  const isEnabled = !!formData.privileges[item.key];
                  return (
                    <View key={item.key} style={styles.privRow}>
                      <View style={styles.privInfo}>
                        <Text style={styles.privLabel}>{item.label}</Text>
                        <Text style={styles.privDesc}>{item.desc}</Text>
                      </View>
                      <Switch
                        value={isEnabled}
                        onValueChange={() => togglePrivilege(item.key)}
                        trackColor={{ false: '#334155', true: '#f59e0b' }}
                        thumbColor={isEnabled ? '#0f172a' : '#94a3b8'}
                      />
                    </View>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color="#0f172a" />
                ) : (
                  <>
                    <Check size={18} color="#0f172a" />
                    <Text style={styles.saveBtnText}>{editingUserId ? 'Update Privileges' : 'Create Sub-Admin'}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  topLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f59e0b',
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 12,
    gap: 6,
  },
  addBtnText: {
    color: '#0f172a',
    fontSize: 13,
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  subInfo: {
    flex: 1,
  },
  subName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  subEmail: {
    fontSize: 13,
    color: '#475569',
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    padding: 6,
    backgroundColor: '#FAF7F2',
    borderRadius: 8,
  },
  metaDivider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    marginVertical: 12,
  },
  scopeBox: {
    marginBottom: 10,
  },
  scopeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  scopeTitle: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
  scopeCount: {
    color: '#818cf8',
    fontWeight: '700',
  },
  pillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  instPill: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  instPillText: {
    fontSize: 11,
    color: '#38bdf8',
    fontWeight: '600',
  },
  privSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: 8,
    borderRadius: 8,
  },
  privText: {
    fontSize: 12,
    color: '#10b981',
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
    maxHeight: '88%',
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
  sectionHead: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f59e0b',
    marginBottom: 10,
  },
  scopeHint: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
    marginTop: 10,
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
  instSelectionList: {
    gap: 8,
  },
  instSelectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FAF7F2',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  instSelectRowActive: {
    borderColor: '#f59e0b',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  instSelectText: {
    fontSize: 13,
    color: '#334155',
  },
  privsList: {
    gap: 12,
    marginTop: 6,
    paddingBottom: 20,
  },
  privRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FAF7F2',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  privInfo: {
    flex: 1,
    marginRight: 10,
  },
  privLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  privDesc: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f59e0b',
    gap: 6,
  },
  saveBtnText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '800',
  },
});
