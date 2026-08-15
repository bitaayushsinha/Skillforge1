import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  User,
  Clock,
  FileCheck,
  ChevronRight,
  AlertTriangle,
  Award,
  Calendar,
} from 'lucide-react-native';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import Header from '../../components/common/Header';
import api from '../../services/api';

export default function ResultVerificationScreen({ route }) {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [results, setResults] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [verifyingId, setVerifyingId] = useState(null);

  // Student selector modal
  const [selectorModal, setSelectorModal] = useState(false);

  const fetchStudents = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get('/api/admin/poc/students?cycle_year=2026-2027');
      const list = res.data || [];
      setStudents(list);
      // Auto-select student passed via nav params or first student
      if (list.length > 0) {
        const paramId = route?.params?.studentId;
        const target = paramId ? list.find((s) => s.user_id === paramId) : list[0];
        if (target) {
          setSelectedStudent(target);
          fetchResultsForStudent(target.user_id);
        }
      }
    } catch (err) {
      console.error('Error loading POC students for verification:', err);
      setError('Could not access student verification queue.');
    } finally {
      setLoadingStudents(false);
      setRefreshing(false);
    }
  }, [route?.params?.studentId]);

  const fetchResultsForStudent = async (studentUserId) => {
    if (!studentUserId) return;
    try {
      setLoadingResults(true);
      setError(null);
      const res = await api.get(`/api/admin/poc/results/student/${studentUserId}`);
      setResults(res.data || []);
    } catch (err) {
      console.error(`Error loading results for student ${studentUserId}:`, err);
      setError('Failed to fetch student exam results.');
    } finally {
      setLoadingResults(false);
    }
  };

  useEffect(() => {
    setLoadingStudents(true);
    fetchStudents();
  }, [fetchStudents]);

  const onRefresh = () => {
    setRefreshing(true);
    if (selectedStudent) {
      fetchResultsForStudent(selectedStudent.user_id);
      setRefreshing(false);
    } else {
      fetchStudents();
    }
  };

  const handleSelectStudent = (s) => {
    setSelectedStudent(s);
    setSelectorModal(false);
    fetchResultsForStudent(s.user_id);
  };

  const handleToggleVerification = async (resultId, currentVerified) => {
    const actionStr = currentVerified ? 'REVOKE verification from' : 'OFFICIALLY VERIFY';
    Alert.alert(
      `${currentVerified ? 'Revoke Verification' : 'Official Verification'}`,
      `Are you sure you want to ${actionStr} this proctored exam result for institutional certification?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: currentVerified ? 'Revoke' : 'Verify Now',
          style: currentVerified ? 'destructive' : 'default',
          onPress: async () => {
            try {
              setVerifyingId(resultId);
              const res = await api.post(`/api/admin/poc/results/${resultId}/verify`);
              const updated = res.data;
              setResults((prev) =>
                prev.map((r) => (r.id === resultId ? { ...r, ...updated } : r))
              );
              Alert.alert(
                'Success',
                `Exam outcome has been ${updated.verified_by_poc ? 'verified' : 'unverified'} successfully.`
              );
            } catch (err) {
              Alert.alert('Error', err.response?.data?.detail || 'Verification request failed.');
            } finally {
              setVerifyingId(null);
            }
          },
        },
      ]
    );
  };

  return (
    <ScreenWrapper>
      <Header title="Result Verification" subtitle="Proctored Exam Auditing" />

      {/* Student Picker Banner */}
      <View style={styles.pickerContainer}>
        <Text style={styles.pickerLabel}>SELECT STUDENT TO AUDIT:</Text>
        <TouchableOpacity
          style={styles.pickerBtn}
          onPress={() => setSelectorModal(true)}
          disabled={loadingStudents || students.length === 0}
        >
          <User size={18} color="#06b6d4" />
          <View style={styles.pickerTextCol}>
            <Text style={styles.pickerStudentName}>
              {selectedStudent
                ? selectedStudent.user?.name || `Learner #${selectedStudent.user_id}`
                : loadingStudents
                ? 'Loading student roster...'
                : 'No students available'}
            </Text>
            {selectedStudent ? (
              <Text style={styles.pickerStudentReg}>
                Reg #: {selectedStudent.registration_number || 'PENDING'} • {selectedStudent.current_tier}
              </Text>
            ) : null}
          </View>
          <ChevronRight size={18} color="#475569" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#06b6d4" />}
      >
        {error ? (
          <View style={styles.errorBanner}>
            <AlertTriangle size={18} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {loadingResults ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#06b6d4" />
            <Text style={styles.loadingText}>Fetching proctored outcomes & integrity hashes...</Text>
          </View>
        ) : !selectedStudent ? (
          <View style={styles.emptyCard}>
            <User size={36} color="#64748b" />
            <Text style={styles.emptyTitle}>Select a Student</Text>
            <Text style={styles.emptySubtext}>Choose a student from your institution above to inspect and verify their proctored exam attempts.</Text>
          </View>
        ) : results.length === 0 ? (
          <View style={styles.emptyCard}>
            <FileCheck size={36} color="#64748b" />
            <Text style={styles.emptyTitle}>No Proctored Exam Results</Text>
            <Text style={styles.emptySubtext}>
              {selectedStudent.user?.name || `Learner #${selectedStudent.user_id}`} has not completed any proctored examination attempts yet.
            </Text>
          </View>
        ) : (
          results.map((item) => {
            const isVerified = item.verified_by_poc;
            const isPass = (item.pass_fail || '').toLowerCase() === 'pass';
            const receivedDate = item.received_at ? new Date(item.received_at).toLocaleDateString() : 'Recent';

            return (
              <View key={item.id} style={[styles.resultCard, isVerified && styles.resultCardVerified]}>
                <View style={styles.cardTop}>
                  <View style={styles.badgeRow}>
                    <View style={[styles.levelBadge, { backgroundColor: 'rgba(6, 182, 212, 0.15)' }]}>
                      <Text style={styles.levelBadgeText}>{item.level?.toUpperCase() || 'EXAM LEVEL'}</Text>
                    </View>
                    <View style={[styles.outcomeBadge, isPass ? styles.badgePass : styles.badgeFail]}>
                      <Text style={[styles.outcomeBadgeText, { color: isPass ? '#10b981' : '#f43f5e' }]}>
                        {isPass ? 'PASSED' : 'FAILED'}
                      </Text>
                    </View>
                  </View>

                  {/* Verification Status Pill */}
                  <View style={[styles.verifyPill, isVerified ? styles.verifyPillGreen : styles.verifyPillOrange]}>
                    {isVerified ? <ShieldCheck size={14} color="#10b981" /> : <ShieldAlert size={14} color="#f59e0b" />}
                    <Text style={[styles.verifyPillText, { color: isVerified ? '#10b981' : '#f59e0b' }]}>
                      {isVerified ? 'VERIFIED' : 'UNVERIFIED'}
                    </Text>
                  </View>
                </View>

                {/* Score Big Display */}
                <View style={styles.scoreArea}>
                  <View>
                    <Text style={styles.scoreVal}>{item.score ?? 0}%</Text>
                    <Text style={styles.scoreLabel}>Final Proctored Score</Text>
                  </View>
                  <View style={styles.metaRight}>
                    <View style={styles.metaRow}>
                      <Calendar size={13} color="#475569" />
                      <Text style={styles.metaText}>{receivedDate}</Text>
                    </View>
                    <View style={styles.metaRow}>
                      <Clock size={13} color="#475569" />
                      <Text style={styles.metaText}>Booking: #{item.booking_ref || item.id}</Text>
                    </View>
                  </View>
                </View>

                {/* Session Reference box */}
                {item.exam_engine_session_ref ? (
                  <View style={styles.sessionBox}>
                    <Text style={styles.sessionLabel}>SESSION TELEMETRY REF:</Text>
                    <Text style={styles.sessionVal} numberOfLines={1}>{item.exam_engine_session_ref}</Text>
                  </View>
                ) : null}

                {/* Official Verification Button */}
                <TouchableOpacity
                  style={[styles.verifyActionBtn, isVerified ? styles.btnRevoke : styles.btnVerify]}
                  onPress={() => handleToggleVerification(item.id, isVerified)}
                  disabled={verifyingId === item.id}
                >
                  {verifyingId === item.id ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      {isVerified ? <XCircle size={16} color="#ef4444" /> : <CheckCircle2 size={16} color="#ffffff" />}
                      <Text style={[styles.verifyBtnText, isVerified && { color: '#ef4444' }]}>
                        {isVerified ? 'Revoke Institutional Verification' : 'Officially Verify Result'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Student Selection Modal */}
      <Modal visible={selectorModal} transparent animationType="slide" onRequestClose={() => setSelectorModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Institution Student</Text>
              <TouchableOpacity onPress={() => setSelectorModal(false)}><XCircle size={22} color="#475569" /></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              {students.map((s) => {
                const isSelected = selectedStudent?.user_id === s.user_id;
                return (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.studentOption, isSelected && styles.studentOptionSelected]}
                    onPress={() => handleSelectStudent(s)}
                  >
                    <User size={18} color={isSelected ? '#06b6d4' : '#64748b'} />
                    <View style={styles.optionInfo}>
                      <Text style={[styles.optionName, isSelected && { color: '#06b6d4' }]}>
                        {s.user?.name || `Learner #${s.user_id}`}
                      </Text>
                      <Text style={styles.optionSub}>
                        Reg: {s.registration_number || 'PENDING'} • {s.current_tier}
                      </Text>
                    </View>
                    {isSelected ? <CheckCircle2 size={18} color="#06b6d4" /> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  pickerContainer: {
    backgroundColor: '#FAF7F2',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  pickerLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    marginBottom: 6,
  },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    gap: 12,
  },
  pickerTextCol: {
    flex: 1,
  },
  pickerStudentName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  pickerStudentReg: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
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
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  resultCardVerified: {
    borderColor: 'rgba(16, 185, 129, 0.4)',
    backgroundColor: 'rgba(16, 185, 129, 0.04)',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  levelBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#06b6d4',
  },
  outcomeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgePass: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  badgeFail: {
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
  },
  outcomeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  verifyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
  },
  verifyPillGreen: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  verifyPillOrange: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  verifyPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  scoreArea: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
  },
  scoreVal: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0f172a',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  metaRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  sessionBox: {
    backgroundColor: '#FAF7F2',
    borderRadius: 10,
    padding: 10,
    marginTop: 14,
  },
  sessionLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
  },
  sessionVal: {
    fontSize: 11,
    color: '#334155',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  verifyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 16,
    gap: 8,
  },
  btnVerify: {
    backgroundColor: '#06b6d4',
  },
  btnRevoke: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  verifyBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
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
    maxHeight: '80%',
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
  studentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#FAF7F2',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    gap: 12,
  },
  studentOptionSelected: {
    borderColor: '#06b6d4',
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
  },
  optionInfo: {
    flex: 1,
  },
  optionName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  optionSub: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
});
