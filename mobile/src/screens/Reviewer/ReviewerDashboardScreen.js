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
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileCheck,
  Cpu,
  TrendingUp,
  MessageSquare,
  ThumbsUp,
  User,
  Filter,
  X,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react-native';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import Header from '../../components/common/Header';
import api from '../../services/api';

export default function ReviewerDashboardScreen() {
  const [proposals, setProposals] = useState([]);
  const [statusFilter, setStatusFilter] = useState('pending'); // 'pending' | 'approved' | 'rejected' | 'all'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Modal inspection / review action
  const [selectedProp, setSelectedProp] = useState(null);
  const [detailModal, setDetailModal] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('Duplicate or out of scope');
  const [rejectFeedback, setRejectFeedback] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchProposals = useCallback(async () => {
    try {
      setError(null);
      const url = statusFilter === 'all'
        ? '/api/reviewer/proposals'
        : `/api/reviewer/proposals?status_filter=${statusFilter}`;
      const res = await api.get(url);
      setProposals(res.data || []);
    } catch (err) {
      console.error('Error loading reviewer proposals:', err);
      setError('Could not access proposal audit queue. Reviewer role required.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    setLoading(true);
    fetchProposals();
  }, [fetchProposals]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProposals();
  };

  const handleApprove = async (proposalId) => {
    try {
      setUpdatingStatus(true);
      await api.put(`/api/reviewer/proposals/${proposalId}/status`, {
        status: 'approved',
      });
      setDetailModal(false);
      Alert.alert('Approved', 'Course proposal has been verified and added to the pipeline.');
      fetchProposals();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to approve proposal.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!selectedProp || !rejectFeedback.trim()) {
      Alert.alert('Required Feedback', 'Please provide constructive feedback for the learner.');
      return;
    }
    try {
      setUpdatingStatus(true);
      await api.put(`/api/reviewer/proposals/${selectedProp.id}/status`, {
        status: 'rejected',
        rejection_reason: rejectReason,
        reviewer_feedback: rejectFeedback.trim(),
      });
      setRejectModal(false);
      setDetailModal(false);
      setRejectFeedback('');
      Alert.alert('Proposal Rejected', 'Feedback notification sent to learner.');
      fetchProposals();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to reject proposal.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getRiskBadge = (risk) => {
    const r = (risk || 'Low').toLowerCase();
    if (r === 'high') {
      return { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', label: 'High Risk' };
    }
    if (r === 'medium') {
      return { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', label: 'Medium Risk' };
    }
    return { bg: 'rgba(16, 185, 129, 0.15)', color: '#10b981', label: 'Low Risk' };
  };

  return (
    <ScreenWrapper>
      <Header title="Review Center" subtitle="Course Proposal & AI Audits" />

      {/* Filter Tabs */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {['pending', 'approved', 'rejected', 'all'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.filterPill, statusFilter === tab && styles.filterPillActive]}
              onPress={() => setStatusFilter(tab)}
            >
              <Text style={[styles.filterText, statusFilter === tab && styles.filterTextActive]}>
                {tab.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8b5cf6" />}
      >
        {error ? (
          <View style={styles.errorBanner}>
            <AlertTriangle size={18} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#8b5cf6" />
            <Text style={styles.loadingText}>Auditing learner proposals...</Text>
          </View>
        ) : proposals.length === 0 ? (
          <View style={styles.emptyCard}>
            <FileCheck size={36} color="#64748b" />
            <Text style={styles.emptyTitle}>No {statusFilter.toUpperCase()} Proposals</Text>
            <Text style={styles.emptySubtext}>When community learners submit course requests, AI pre-processing metrics and summaries will show up right here.</Text>
          </View>
        ) : (
          proposals.map((item) => {
            const riskInfo = getRiskBadge(item.risk_level);
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.card}
                onPress={() => {
                  setSelectedProp(item);
                  setDetailModal(true);
                }}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.titleArea}>
                    <View style={styles.badgesRow}>
                      <Text style={styles.catBadge}>{item.ai_category || item.skill_level || 'Tech Proposal'}</Text>
                      <View style={[styles.riskPill, { backgroundColor: riskInfo.bg }]}>
                        <Text style={[styles.riskText, { color: riskInfo.color }]}>{riskInfo.label}</Text>
                      </View>
                    </View>
                    <Text style={styles.propTitle}>{item.course_name}</Text>
                  </View>
                  <ChevronRight size={18} color="#64748b" />
                </View>

                {/* AI Summary Box */}
                {item.ai_summary ? (
                  <View style={styles.aiBox}>
                    <View style={styles.aiHeader}>
                      <Cpu size={13} color="#a855f7" />
                      <Text style={styles.aiLabel}>AI PRE-PROCESSING SUMMARY</Text>
                    </View>
                    <Text style={styles.aiSummaryText} numberOfLines={2}>{item.ai_summary}</Text>
                  </View>
                ) : (
                  <Text style={styles.reasonText} numberOfLines={2}>Reason: {item.reason_to_learn}</Text>
                )}

                <View style={styles.cardFooter}>
                  <View style={styles.footerStat}>
                    <User size={12} color="#475569" />
                    <Text style={styles.statText}>{item.learner_name || `Learner #${item.learner_id || 'Anon'}`}</Text>
                  </View>
                  <View style={styles.footerStat}>
                    <TrendingUp size={12} color="#38bdf8" />
                    <Text style={[styles.statText, { color: '#38bdf8' }]}>Demand: {item.demand_score || 85}%</Text>
                  </View>
                  <View style={styles.footerStat}>
                    <ThumbsUp size={12} color="#475569" />
                    <Text style={styles.statText}>{item.upvotes || 0}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Detail Audit Modal */}
      <Modal visible={detailModal} transparent animationType="slide" onRequestClose={() => setDetailModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Proposal Audit #{selectedProp?.id}</Text>
              <TouchableOpacity onPress={() => setDetailModal(false)}><X size={22} color="#475569" /></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.detailTitle}>{selectedProp?.course_name}</Text>
              <Text style={styles.detailSub}>Submitted by {selectedProp?.learner_name || 'Scoped Learner'} • Level: {selectedProp?.skill_level}</Text>

              {/* AI Deep Analysis Box */}
              <View style={styles.aiFullBox}>
                <View style={styles.aiHeader}>
                  <Cpu size={16} color="#a855f7" />
                  <Text style={styles.aiFullHeader}>AI ENGINE ANALYSIS</Text>
                </View>
                <Text style={styles.aiFullSummary}>{selectedProp?.ai_summary || 'No AI preprocessing summary generated yet.'}</Text>
                <View style={styles.aiMetricsGrid}>
                  <View style={styles.aiMetricCell}>
                    <Text style={styles.aiMetricVal}>{selectedProp?.demand_score || 85}%</Text>
                    <Text style={styles.aiMetricLbl}>Demand Score</Text>
                  </View>
                  <View style={styles.aiMetricCell}>
                    <Text style={[styles.aiMetricVal, { color: getRiskBadge(selectedProp?.risk_level).color }]}>
                      {selectedProp?.risk_level || 'Low'}
                    </Text>
                    <Text style={styles.aiMetricLbl}>Risk Rating</Text>
                  </View>
                  <View style={styles.aiMetricCell}>
                    <Text style={styles.aiMetricVal}>{selectedProp?.upvotes || 0}</Text>
                    <Text style={styles.aiMetricLbl}>Community Upvotes</Text>
                  </View>
                </View>
                {selectedProp?.ai_recommendation ? (
                  <View style={styles.recomBox}>
                    <Text style={styles.recomLabel}>AI Recommendation: </Text>
                    <Text style={styles.recomText}>{selectedProp.ai_recommendation}</Text>
                  </View>
                ) : null}
              </View>

              <Text style={styles.sectionHeading}>Learner Justification</Text>
              <Text style={styles.bodyText}>{selectedProp?.reason_to_learn}</Text>

              <Text style={styles.sectionHeading}>Expected Outcome</Text>
              <Text style={styles.bodyText}>{selectedProp?.expected_outcome}</Text>

              <Text style={styles.sectionHeading}>Preferred Learning Style</Text>
              <Text style={styles.bodyText}>{selectedProp?.preferred_learning_style}</Text>

              {selectedProp?.additional_notes ? (
                <>
                  <Text style={styles.sectionHeading}>Additional Notes</Text>
                  <Text style={styles.bodyText}>{selectedProp.additional_notes}</Text>
                </>
              ) : null}

              {selectedProp?.status !== 'pending' ? (
                <View style={styles.currentStatusBox}>
                  <Text style={styles.currentStatusText}>Current Status: {selectedProp?.status?.toUpperCase()}</Text>
                  {selectedProp?.rejection_reason ? <Text style={styles.rejectReasonText}>Reason: {selectedProp.rejection_reason}</Text> : null}
                  {selectedProp?.reviewer_feedback ? <Text style={styles.rejectFeedbackText}>{selectedProp.reviewer_feedback}</Text> : null}
                </View>
              ) : null}
            </ScrollView>

            <View style={styles.modalActions}>
              {selectedProp?.status === 'pending' ? (
                <>
                  <TouchableOpacity style={styles.rejectBtn} onPress={() => setRejectModal(true)} disabled={updatingStatus}>
                    <XCircle size={16} color="#ef4444" />
                    <Text style={styles.rejectBtnText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(selectedProp.id)} disabled={updatingStatus}>
                    {updatingStatus ? <ActivityIndicator size="small" color="#ffffff" /> : (
                      <>
                        <CheckCircle2 size={16} color="#ffffff" />
                        <Text style={styles.approveBtnText}>Approve Proposal</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity style={styles.closeFullBtn} onPress={() => setDetailModal(false)}>
                  <Text style={styles.closeFullText}>Close Audit</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Reject Reason & Feedback Modal */}
      <Modal visible={rejectModal} transparent animationType="fade" onRequestClose={() => setRejectModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reject & Provide Feedback</Text>
              <TouchableOpacity onPress={() => setRejectModal(false)}><X size={22} color="#475569" /></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.inputLabel}>Reason Category</Text>
              <View style={styles.pillGroup}>
                {['Duplicate proposal', 'Out of scope', 'Insufficient demand', 'Content safety risk'].map((rsn) => (
                  <TouchableOpacity
                    key={rsn}
                    style={[styles.reasonPill, rejectReason === rsn && styles.reasonPillActive]}
                    onPress={() => setRejectReason(rsn)}
                  >
                    <Text style={[styles.reasonPillText, rejectReason === rsn && { color: '#ffffff', fontWeight: '800' }]}>{rsn}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Constructive Reviewer Feedback *</Text>
              <TextInput
                style={styles.feedbackInput}
                placeholder="Explain what the learner can improve or recommend an alternative existing course..."
                placeholderTextColor="#64748b"
                multiline
                value={rejectFeedback}
                onChangeText={setRejectFeedback}
              />
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setRejectModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.confirmRejectBtn} onPress={handleRejectSubmit} disabled={updatingStatus}>
                {updatingStatus ? <ActivityIndicator size="small" color="#ffffff" /> : <Text style={styles.confirmRejectText}>Confirm Rejection</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  filterBar: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  filterScroll: {
    gap: 8,
  },
  filterPill: {
    backgroundColor: '#FAF7F2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  filterPillActive: {
    backgroundColor: '#8b5cf6',
    borderColor: '#8b5cf6',
  },
  filterText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
  filterTextActive: {
    color: '#ffffff',
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
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  catBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8b5cf6',
  },
  riskPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  riskText: {
    fontSize: 10,
    fontWeight: '700',
  },
  propTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  aiBox: {
    backgroundColor: '#FAF7F2',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.2)',
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  aiLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#c084fc',
  },
  aiSummaryText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
  },
  reasonText: {
    fontSize: 13,
    color: '#334155',
    marginTop: 8,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
  },
  footerStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
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
  detailTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  detailSub: {
    fontSize: 13,
    color: '#475569',
    marginTop: 4,
  },
  aiFullBox: {
    backgroundColor: '#FAF7F2',
    borderRadius: 16,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.25)',
  },
  aiFullHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#c084fc',
  },
  aiFullSummary: {
    fontSize: 13,
    color: '#0f172a',
    marginTop: 8,
    lineHeight: 19,
  },
  aiMetricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
  },
  aiMetricCell: {
    alignItems: 'center',
  },
  aiMetricVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  aiMetricLbl: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  recomBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    padding: 10,
    borderRadius: 8,
  },
  recomLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#c084fc',
  },
  recomText: {
    fontSize: 12,
    color: '#0f172a',
    flex: 1,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8b5cf6',
    marginTop: 18,
  },
  bodyText: {
    fontSize: 14,
    color: '#334155',
    marginTop: 6,
    lineHeight: 20,
  },
  currentStatusBox: {
    backgroundColor: '#FAF7F2',
    padding: 14,
    borderRadius: 12,
    marginTop: 20,
  },
  currentStatusText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#38bdf8',
  },
  rejectReasonText: {
    fontSize: 13,
    color: '#fca5a5',
    marginTop: 4,
    fontWeight: '600',
  },
  rejectFeedbackText: {
    fontSize: 13,
    color: '#334155',
    marginTop: 4,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
    gap: 12,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  rejectBtnText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '700',
  },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  approveBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  closeFullBtn: {
    flex: 1,
    backgroundColor: '#8b5cf6',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeFullText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
    marginTop: 10,
  },
  pillGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reasonPill: {
    backgroundColor: '#FAF7F2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  reasonPillActive: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  reasonPillText: {
    color: '#334155',
    fontSize: 12,
  },
  feedbackInput: {
    backgroundColor: '#FAF7F2',
    borderRadius: 12,
    padding: 14,
    height: 100,
    color: '#0f172a',
    fontSize: 14,
    textAlignVertical: 'top',
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
  cancelText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '600',
  },
  confirmRejectBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#ef4444',
  },
  confirmRejectText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
