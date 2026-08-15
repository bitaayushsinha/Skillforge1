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
  AlertCircle,
  CheckCircle2,
  Clock,
  User,
  Mail,
  BookOpen,
  X,
  ChevronRight,
  Edit3,
  ShieldCheck,
  FileWarning,
} from 'lucide-react-native';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import Header from '../../components/common/Header';
import api from '../../services/api';

export default function ProposalEvaluationScreen() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [statusTab, setStatusTab] = useState('open'); // 'open' | 'resolved' | 'all'

  // Modal inspection & update
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [detailModal, setDetailModal] = useState(false);
  const [editForm, setEditForm] = useState({
    learner_name: '',
    course_name: '',
    status: 'open',
  });
  const [updating, setUpdating] = useState(false);

  const fetchIssues = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get('/api/reviewer/certificate-issues');
      setIssues(res.data || []);
    } catch (err) {
      console.error('Error fetching certificate issues:', err);
      setError('Could not load dispute records. Reviewer credentials required.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchIssues();
  }, [fetchIssues]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchIssues();
  };

  const handleOpenModal = (issue) => {
    setSelectedIssue(issue);
    setEditForm({
      learner_name: issue.learner_name || '',
      course_name: issue.course_name || '',
      status: issue.status || 'open',
    });
    setDetailModal(true);
  };

  const handleResolveIssue = async (issueId) => {
    try {
      setUpdating(true);
      await api.put(`/api/reviewer/certificate-issues/${issueId}`, {
        status: 'resolved',
      });
      setDetailModal(false);
      Alert.alert('Resolved', 'Certificate issue marked as resolved.');
      fetchIssues();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to update issue status.');
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveCorrections = async () => {
    if (!selectedIssue) return;
    try {
      setUpdating(true);
      await api.put(`/api/reviewer/certificate-issues/${selectedIssue.id}`, {
        learner_name: editForm.learner_name.trim(),
        course_name: editForm.course_name.trim(),
        status: editForm.status,
      });
      setDetailModal(false);
      Alert.alert('Saved', 'Certificate metadata corrections applied.');
      fetchIssues();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to apply corrections.');
    } finally {
      setUpdating(false);
    }
  };

  const filteredIssues = issues.filter((i) => {
    if (statusTab === 'all') return true;
    return i.status === statusTab;
  });

  const openCount = issues.filter((i) => i.status === 'open').length;
  const resolvedCount = issues.filter((i) => i.status === 'resolved').length;

  return (
    <ScreenWrapper>
      <Header title="Dispute Resolution" subtitle="Certificate & Name Correction Center" />

      {/* Summary KPI Pills */}
      <View style={styles.summaryBar}>
        <TouchableOpacity
          style={[styles.kpiBox, statusTab === 'open' && styles.kpiBoxActive]}
          onPress={() => setStatusTab('open')}
        >
          <AlertCircle size={18} color={statusTab === 'open' ? '#ffffff' : '#fbbf24'} />
          <View>
            <Text style={[styles.kpiNum, statusTab === 'open' && { color: '#ffffff' }]}>{openCount}</Text>
            <Text style={[styles.kpiLabel, statusTab === 'open' && { color: '#0f172a' }]}>Open Disputes</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.kpiBox, statusTab === 'resolved' && styles.kpiBoxActiveGreen]}
          onPress={() => setStatusTab('resolved')}
        >
          <CheckCircle2 size={18} color={statusTab === 'resolved' ? '#ffffff' : '#10b981'} />
          <View>
            <Text style={[styles.kpiNum, statusTab === 'resolved' && { color: '#ffffff' }]}>{resolvedCount}</Text>
            <Text style={[styles.kpiLabel, statusTab === 'resolved' && { color: '#0f172a' }]}>Resolved</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.kpiBox, statusTab === 'all' && styles.kpiBoxActiveAll]}
          onPress={() => setStatusTab('all')}
        >
          <FileWarning size={18} color={statusTab === 'all' ? '#ffffff' : '#38bdf8'} />
          <View>
            <Text style={[styles.kpiNum, statusTab === 'all' && { color: '#ffffff' }]}>{issues.length}</Text>
            <Text style={[styles.kpiLabel, statusTab === 'all' && { color: '#0f172a' }]}>Total Issues</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8b5cf6" />}
      >
        {error ? (
          <View style={styles.errorBanner}>
            <AlertCircle size={18} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#8b5cf6" />
            <Text style={styles.loadingText}>Syncing certificate audit tickets...</Text>
          </View>
        ) : filteredIssues.length === 0 ? (
          <View style={styles.emptyCard}>
            <ShieldCheck size={36} color="#64748b" />
            <Text style={styles.emptyTitle}>No {statusTab.toUpperCase()} Certificate Disputes</Text>
            <Text style={styles.emptySubtext}>All certificate names and credentials match current learner registry records.</Text>
          </View>
        ) : (
          filteredIssues.map((item) => {
            const isOpen = item.status === 'open';
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.card}
                onPress={() => handleOpenModal(item)}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.titleArea}>
                    <View style={styles.badgeRow}>
                      <View style={[styles.statusPill, isOpen ? styles.statusOpen : styles.statusResolved]}>
                        <Text style={[styles.statusText, { color: isOpen ? '#fbbf24' : '#10b981' }]}>
                          {isOpen ? 'REQUIRES RESOLUTION' : 'RESOLVED'}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.courseTitle}>{item.course_name}</Text>
                  </View>
                  <ChevronRight size={18} color="#64748b" />
                </View>

                <View style={styles.descBox}>
                  <Text style={styles.descText} numberOfLines={2}>Dispute: {item.issue_description}</Text>
                </View>

                <View style={styles.cardFooter}>
                  <View style={styles.userStat}>
                    <User size={13} color="#475569" />
                    <Text style={styles.userText}>{item.learner_name}</Text>
                  </View>
                  <View style={styles.userStat}>
                    <Mail size={13} color="#475569" />
                    <Text style={styles.userText}>{item.learner_email}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Issue Detail & Metadata Correction Modal */}
      <Modal visible={detailModal} transparent animationType="slide" onRequestClose={() => setDetailModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Certificate Issue #{selectedIssue?.id}</Text>
              <TouchableOpacity onPress={() => setDetailModal(false)}><X size={22} color="#475569" /></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              <View style={styles.issueHeaderBox}>
                <Text style={styles.issueCourseName}>{selectedIssue?.course_name}</Text>
                <Text style={styles.issueSub}>Submitted by {selectedIssue?.learner_name} ({selectedIssue?.learner_email})</Text>
              </View>

              <Text style={styles.sectionHead}>Learner Dispute / Correction Request</Text>
              <View style={styles.issueDescBox}>
                <Text style={styles.issueDescFull}>{selectedIssue?.issue_description}</Text>
              </View>

              <Text style={styles.sectionHead}>Credential Metadata Corrections</Text>
              <Text style={styles.inputLabel}>Learner Name on Certificate</Text>
              <TextInput
                style={styles.textInput}
                value={editForm.learner_name}
                onChangeText={(t) => setEditForm({ ...editForm, learner_name: t })}
                placeholder="Learner legal name"
                placeholderTextColor="#64748b"
              />

              <Text style={styles.inputLabel}>Course Title on Certificate</Text>
              <TextInput
                style={styles.textInput}
                value={editForm.course_name}
                onChangeText={(t) => setEditForm({ ...editForm, course_name: t })}
                placeholder="Verified course title"
                placeholderTextColor="#64748b"
              />

              <Text style={styles.inputLabel}>Status</Text>
              <View style={styles.pillGroup}>
                <TouchableOpacity
                  style={[styles.statusSelectPill, editForm.status === 'open' && styles.statusSelectOpen]}
                  onPress={() => setEditForm({ ...editForm, status: 'open' })}
                >
                  <Text style={[styles.statusSelectText, editForm.status === 'open' && { color: '#ffffff' }]}>Open</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.statusSelectPill, editForm.status === 'resolved' && styles.statusSelectResolved]}
                  onPress={() => setEditForm({ ...editForm, status: 'resolved' })}
                >
                  <Text style={[styles.statusSelectText, editForm.status === 'resolved' && { color: '#ffffff' }]}>Resolved</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              {selectedIssue?.status === 'open' ? (
                <TouchableOpacity
                  style={styles.resolveBtn}
                  onPress={() => handleResolveIssue(selectedIssue.id)}
                  disabled={updating}
                >
                  <CheckCircle2 size={16} color="#ffffff" />
                  <Text style={styles.resolveText}>Mark Resolved</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveCorrections}
                disabled={updating}
              >
                {updating ? <ActivityIndicator size="small" color="#ffffff" /> : (
                  <>
                    <Edit3 size={16} color="#ffffff" />
                    <Text style={styles.saveText}>Save Corrections</Text>
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
  summaryBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 10,
  },
  kpiBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    gap: 8,
  },
  kpiBoxActive: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  kpiBoxActiveGreen: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  kpiBoxActiveAll: {
    backgroundColor: '#0284c7',
    borderColor: '#0284c7',
  },
  kpiNum: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  kpiLabel: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '600',
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
    marginRight: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusOpen: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  statusResolved: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  descBox: {
    backgroundColor: '#FAF7F2',
    padding: 12,
    borderRadius: 12,
    marginTop: 10,
  },
  descText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
  },
  userStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
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
  issueHeaderBox: {
    backgroundColor: '#FAF7F2',
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
  },
  issueCourseName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  issueSub: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
  },
  sectionHead: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8b5cf6',
    marginTop: 14,
    marginBottom: 8,
  },
  issueDescBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
  },
  issueDescFull: {
    fontSize: 14,
    color: '#fde68a',
    lineHeight: 20,
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
  pillGroup: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  statusSelectPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#FAF7F2',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  statusSelectOpen: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  statusSelectResolved: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  statusSelectText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
    gap: 12,
  },
  resolveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  resolveText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  saveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8b5cf6',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  saveText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
