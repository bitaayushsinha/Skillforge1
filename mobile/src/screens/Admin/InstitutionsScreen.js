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
  Building2,
  Plus,
  Search,
  Mail,
  Phone,
  MapPin,
  Edit3,
  Trash2,
  X,
  Check,
  AlertCircle,
} from 'lucide-react-native';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import Header from '../../components/common/Header';
import api from '../../services/api';

export default function InstitutionsScreen() {
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);

  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    email: '',
    phone: '',
    address: '',
    description: '',
  });
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState(null);

  const fetchInstitutions = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get('/api/institutions');
      setInstitutions(res.data || []);
    } catch (err) {
      console.error('Error fetching institutions:', err);
      setError('Could not load institution registry. Check network connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchInstitutions();
  }, [fetchInstitutions]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchInstitutions();
  };

  const filteredInstitutions = institutions.filter((inst) => {
    const query = searchQuery.toLowerCase();
    return (
      inst.name?.toLowerCase().includes(query) ||
      inst.code?.toLowerCase().includes(query) ||
      inst.email?.toLowerCase().includes(query)
    );
  });

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({
      name: '',
      code: '',
      email: '',
      phone: '',
      address: '',
      description: '',
    });
    setModalError(null);
    setModalVisible(true);
  };

  const openEditModal = (inst) => {
    setEditingId(inst.id);
    setFormData({
      name: inst.name || '',
      code: inst.code || '',
      email: inst.email || '',
      phone: inst.phone || '',
      address: inst.address || '',
      description: inst.description || '',
    });
    setModalError(null);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setModalError('Institution name is required.');
      return;
    }
    try {
      setSaving(true);
      setModalError(null);

      if (editingId) {
        await api.put(`/api/institutions/${editingId}`, formData);
      } else {
        await api.post('/api/institutions', formData);
      }

      setModalVisible(false);
      fetchInstitutions();
    } catch (err) {
      console.error('Error saving institution:', err);
      setModalError(err.response?.data?.detail || 'Failed to save institution.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (inst) => {
    Alert.alert(
      'Delete Institution',
      `Are you sure you want to remove "${inst.name}"? All associated sub-admin access bindings will also be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/api/institutions/${inst.id}`);
              fetchInstitutions();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.detail || 'Failed to delete institution.');
            }
          },
        },
      ]
    );
  };

  return (
    <ScreenWrapper>
      <Header title="Partner Colleges" subtitle="Institution Registry & Scopes" />
      
      <View style={styles.topContainer}>
        {/* Search Bar */}
        <View style={styles.searchBox}>
          <Search size={18} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by college name or code..."
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

        {/* Add Button */}
        <TouchableOpacity style={styles.addBtn} onPress={openCreateModal}>
          <Plus size={18} color="#0f172a" />
          <Text style={styles.addBtnText}>Add College</Text>
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
            <Text style={styles.loadingText}>Fetching colleges...</Text>
          </View>
        ) : filteredInstitutions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Building2 size={36} color="#64748b" />
            <Text style={styles.emptyTitle}>No Institutions Found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery ? 'Try adjusting your search filters.' : 'Click "+ Add College" to register your first partner institution.'}
            </Text>
          </View>
        ) : (
          filteredInstitutions.map((inst) => (
            <View key={inst.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.titleArea}>
                  <Text style={styles.instName}>{inst.name}</Text>
                  {inst.code ? (
                    <View style={styles.codeBadge}>
                      <Text style={styles.codeText}>{inst.code}</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.actionIcons}>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => openEditModal(inst)}>
                    <Edit3 size={16} color="#38bdf8" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.iconBtn} onPress={() => handleDelete(inst)}>
                    <Trash2 size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>

              {inst.description ? (
                <Text style={styles.descText} numberOfLines={2}>
                  {inst.description}
                </Text>
              ) : null}

              <View style={styles.metaDivider} />

              <View style={styles.metaGrid}>
                {inst.email ? (
                  <View style={styles.metaItem}>
                    <Mail size={14} color="#475569" />
                    <Text style={styles.metaText}>{inst.email}</Text>
                  </View>
                ) : null}
                {inst.phone ? (
                  <View style={styles.metaItem}>
                    <Phone size={14} color="#475569" />
                    <Text style={styles.metaText}>{inst.phone}</Text>
                  </View>
                ) : null}
                {inst.address ? (
                  <View style={[styles.metaItem, { width: '100%' }]}>
                    <MapPin size={14} color="#475569" />
                    <Text style={styles.metaText} numberOfLines={1}>
                      {inst.address}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Create / Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? 'Edit Institution' : 'Register New College'}</Text>
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

              <Text style={styles.inputLabel}>College Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Stanford University"
                placeholderTextColor="#64748b"
                value={formData.name}
                onChangeText={(t) => setFormData({ ...formData, name: t })}
              />

              <Text style={styles.inputLabel}>Institution Code / Identifier</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. STANFORD"
                placeholderTextColor="#64748b"
                autoCapitalize="characters"
                value={formData.code}
                onChangeText={(t) => setFormData({ ...formData, code: t.toUpperCase() })}
              />

              <Text style={styles.inputLabel}>Official Email</Text>
              <TextInput
                style={styles.textInput}
                placeholder="admin@college.edu"
                placeholderTextColor="#64748b"
                keyboardType="email-address"
                autoCapitalize="none"
                value={formData.email}
                onChangeText={(t) => setFormData({ ...formData, email: t })}
              />

              <Text style={styles.inputLabel}>Contact Phone</Text>
              <TextInput
                style={styles.textInput}
                placeholder="+1 555-0199"
                placeholderTextColor="#64748b"
                keyboardType="phone-pad"
                value={formData.phone}
                onChangeText={(t) => setFormData({ ...formData, phone: t })}
              />

              <Text style={styles.inputLabel}>Campus Address</Text>
              <TextInput
                style={styles.textInput}
                placeholder="123 Campus Rd, City, State"
                placeholderTextColor="#64748b"
                value={formData.address}
                onChangeText={(t) => setFormData({ ...formData, address: t })}
              />

              <Text style={styles.inputLabel}>Notes / Description</Text>
              <TextInput
                style={[styles.textInput, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Partner program specifics..."
                placeholderTextColor="#64748b"
                multiline
                value={formData.description}
                onChangeText={(t) => setFormData({ ...formData, description: t })}
              />
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
                    <Text style={styles.saveBtnText}>{editingId ? 'Update College' : 'Save College'}</Text>
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
  titleArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  instName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  codeBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  codeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#38bdf8',
  },
  actionIcons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    padding: 6,
    backgroundColor: '#FAF7F2',
    borderRadius: 8,
  },
  descText: {
    fontSize: 13,
    color: '#475569',
    marginTop: 8,
    lineHeight: 18,
  },
  metaDivider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    marginVertical: 12,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: '#334155',
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
