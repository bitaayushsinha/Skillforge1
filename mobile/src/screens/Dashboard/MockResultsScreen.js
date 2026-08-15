import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
  TextInput,
} from 'react-native';
import { TrendingUp, Award, Clock, PlusCircle, CheckCircle2, Sparkles, X, BrainCircuit } from 'lucide-react-native';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import Header from '../../components/common/Header';
import ExamLiveNav from '../../components/common/ExamLiveNav';
import api from '../../services/api';

export default function MockResultsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [attempts, setAttempts] = useState([]);
  const [subjects, setSubjects] = useState([]);

  // Modal State for starting AI mock exam
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [customTopic, setCustomTopic] = useState('');
  const [difficulty, setDifficulty] = useState('Intermediate');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [mockRes, subjRes] = await Promise.all([
        api.get('/api/learning/my-mock-results').catch(() => ({ data: [] })),
        api.get('/api/learning/subjects').catch(() => ({ data: [] })),
      ]);
      setAttempts(mockRes.data || []);
      setSubjects(subjRes.data || []);
    } catch (err) {
      console.error('Error fetching mock assessment results:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleOpenStartModal = () => {
    setCustomTopic('');
    setDifficulty('Intermediate');
    if (subjects.length > 0) {
      setSelectedSubject(subjects[0]);
    }
    setModalVisible(true);
  };

  const handleStartMockExam = async () => {
    setSubmitting(true);
    try {
      const topicToUse = customTopic.trim() || (selectedSubject ? selectedSubject.name : 'General Assessment');
      const payload = {
        subject_id: selectedSubject ? selectedSubject.id : null,
        topic: topicToUse,
        count: 10,
        difficulty: difficulty,
      };

      const res = await api.post('/api/learning/start-mock-exam', payload);
      Alert.alert(
        'Assessment Recorded',
        `Your AI mock evaluation for "${topicToUse}" completed and was logged to your record.`
      );
      setModalVisible(false);
      fetchData();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Could not start AI assessment. You may have exceeded your daily limit.';
      Alert.alert('Assessment Notice', msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Compute aggregate stats
  const totalAttempts = attempts.length;
  const avgScore = totalAttempts > 0
    ? Math.round(attempts.reduce((acc, curr) => acc + (curr.score || 0), 0) / totalAttempts)
    : 0;
  const bestScore = totalAttempts > 0
    ? Math.round(Math.max(...attempts.map((a) => a.score || 0)))
    : 0;

  if (loading) {
    return (
      <ScreenWrapper>
        <Header title="AI Assessments" subtitle="Mock Exam Analytics & Generation" />
        <ExamLiveNav activeTab="mocks" />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.loadingText}>Analyzing evaluation records...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <Header title="AI Assessments" subtitle="Mock Exam Analytics & Generation" />
      <ExamLiveNav activeTab="mocks" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />}
      >
        {/* Top Action Row */}
        <TouchableOpacity style={styles.startBanner} onPress={handleOpenStartModal} activeOpacity={0.85}>
          <View style={styles.startBannerInfo}>
            <View style={styles.bannerBadge}>
              <BrainCircuit size={14} color="#818cf8" />
              <Text style={styles.bannerBadgeText}>AI EVALUATION ENGINE</Text>
            </View>
            <Text style={styles.startTitle}>Start New Practice Assessment</Text>
            <Text style={styles.startSub}>
              Generate custom multi-choice questions powered by Groq/AI tailored to your specialization topics.
            </Text>
          </View>
          <PlusCircle size={28} color="#818cf8" />
        </TouchableOpacity>

        {/* Analytics Summary */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <TrendingUp size={20} color="#38bdf8" />
            <Text style={styles.kpiNumber}>{totalAttempts}</Text>
            <Text style={styles.kpiLabel}>Total Attempts</Text>
          </View>
          <View style={styles.kpiCard}>
            <Award size={20} color="#818cf8" />
            <Text style={styles.kpiNumber}>{avgScore}%</Text>
            <Text style={styles.kpiLabel}>Avg Mastery</Text>
          </View>
          <View style={styles.kpiCard}>
            <CheckCircle2 size={20} color="#10b981" />
            <Text style={styles.kpiNumber}>{bestScore}%</Text>
            <Text style={styles.kpiLabel}>High Score</Text>
          </View>
        </View>

        {/* Assessment History List */}
        <Text style={styles.sectionTitle}>Evaluation History</Text>
        {attempts.length === 0 ? (
          <View style={styles.emptyCard}>
            <BrainCircuit size={36} color="#64748b" style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>No Assessments Completed Yet</Text>
            <Text style={styles.emptySubtext}>
              Tap &quot;Start New Practice Assessment&quot; above to generate AI practice questions and measure your mastery level.
            </Text>
          </View>
        ) : (
          attempts.map((item) => {
            const dtObj = new Date(item.attempt_date);
            const dateStr = dtObj.toLocaleDateString();
            const timeStr = dtObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const scoreVal = Math.round(item.score || 0);

            return (
              <View key={item.id} style={styles.attemptCard}>
                <View style={styles.attemptLeft}>
                  <Text style={styles.attemptTopic}>{item.topic || 'General Practice'}</Text>
                  <View style={styles.attemptMetaRow}>
                    <Clock size={13} color="#64748b" />
                    <Text style={styles.attemptMetaText}>
                      {dateStr} at {timeStr} • {item.total_questions || 10} Questions
                    </Text>
                  </View>
                </View>

                <View style={[styles.scoreBox, scoreVal >= 70 ? styles.scoreBoxHigh : styles.scoreBoxMid]}>
                  <Text style={[styles.scoreText, scoreVal >= 70 ? styles.scoreHigh : styles.scoreMid]}>
                    {scoreVal}%
                  </Text>
                </View>
              </View>
            );
          })
        )}

        {/* Modal: Start AI Assessment */}
        <Modal visible={modalVisible} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalSub}>AI PRACTICE ENGINE</Text>
                  <Text style={styles.modalTitle}>New Practice Assessment</Text>
                </View>
                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeIcon}>
                  <X size={20} color="#0f172a" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 380 }}>
                <Text style={styles.formLabel}>1. Select Subject Area</Text>
                {subjects.length === 0 ? (
                  <Text style={styles.emptySubtext}>No assigned subjects. Enter custom topic below.</Text>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subjectScroll}>
                    {subjects.map((s) => {
                      const isSel = selectedSubject?.id === s.id;
                      return (
                        <TouchableOpacity
                          key={s.id}
                          style={[styles.subjectPill, isSel && styles.subjectPillSelected]}
                          onPress={() => setSelectedSubject(s)}
                        >
                          <Text style={[styles.subjectPillText, isSel && styles.subjectPillTextSelected]}>
                            {s.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}

                <Text style={[styles.formLabel, { marginTop: 16 }]}>2. Custom Topic (Optional)</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder={selectedSubject ? `e.g. ${selectedSubject.name} Advanced Concepts` : 'Enter topic e.g. React Native Navigation'}
                  placeholderTextColor="#64748b"
                  value={customTopic}
                  onChangeText={setCustomTopic}
                />

                <Text style={[styles.formLabel, { marginTop: 16 }]}>3. Select Difficulty</Text>
                <View style={styles.diffRow}>
                  {['Beginner', 'Intermediate', 'Advanced'].map((lvl) => {
                    const isSel = difficulty === lvl;
                    return (
                      <TouchableOpacity
                        key={lvl}
                        style={[styles.diffPill, isSel && styles.diffPillSelected]}
                        onPress={() => setDifficulty(lvl)}
                      >
                        <Text style={[styles.diffPillText, isSel && styles.diffPillTextSelected]}>{lvl}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              <TouchableOpacity
                style={[styles.generateBtn, submitting && styles.generateBtnDisabled]}
                disabled={submitting}
                onPress={handleStartMockExam}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <BrainCircuit size={18} color="#ffffff" />
                    <Text style={styles.generateBtnText}>Generate & Launch Practice Test</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#475569',
    marginTop: 12,
    fontSize: 15,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  startBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.4)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 6,
  },
  startBannerInfo: {
    flex: 1,
    marginRight: 16,
  },
  bannerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(79, 70, 229, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  bannerBadgeText: {
    color: '#818cf8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  startTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  startSub: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  kpiNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 6,
  },
  kpiLabel: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 18,
  },
  attemptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  attemptLeft: {
    flex: 1,
    marginRight: 12,
  },
  attemptTopic: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  attemptMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  attemptMetaText: {
    color: '#64748b',
    fontSize: 12,
  },
  scoreBox: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  scoreBoxHigh: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10b981',
  },
  scoreBoxMid: {
    backgroundColor: 'rgba(79, 70, 229, 0.2)',
    borderColor: '#4f46e5',
  },
  scoreText: {
    fontSize: 15,
    fontWeight: '800',
  },
  scoreHigh: {
    color: '#10b981',
  },
  scoreMid: {
    color: '#818cf8',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FAF7F2',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    borderTopWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.15)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
    paddingBottom: 14,
  },
  modalSub: {
    color: '#818cf8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  modalTitle: {
    color: '#0f172a',
    fontSize: 19,
    fontWeight: '800',
    marginTop: 2,
  },
  closeIcon: {
    padding: 6,
  },
  formLabel: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  subjectScroll: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  subjectPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  subjectPillSelected: {
    backgroundColor: '#4f46e5',
    borderColor: '#818cf8',
  },
  subjectPillText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
  subjectPillTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  inputField: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#0f172a',
    fontSize: 14,
  },
  diffRow: {
    flexDirection: 'row',
    gap: 8,
  },
  diffPill: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  diffPillSelected: {
    backgroundColor: '#4f46e5',
    borderColor: '#818cf8',
  },
  diffPillText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
  diffPillTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4f46e5',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 20,
  },
  generateBtnDisabled: {
    backgroundColor: '#F1F5F9',
  },
  generateBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
