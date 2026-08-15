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
} from 'react-native';
import {
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Users,
  Award,
  TrendingUp,
  Cpu,
  FileCheck,
  X,
  ChevronRight,
  ShieldCheck,
  Clock,
} from 'lucide-react-native';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import Header from '../../components/common/Header';
import api from '../../services/api';

export default function ExpertDashboardScreen() {
  const [courses, setCourses] = useState([]);
  const [learnersPerf, setLearnersPerf] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Modal for learner performance detail or course inspection
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseModalVisible, setCourseModalVisible] = useState(false);
  const [perfModalVisible, setPerfModalVisible] = useState(false);

  const fetchExpertData = useCallback(async () => {
    try {
      setError(null);
      const [coursesRes, perfRes] = await Promise.all([
        api.get('/api/expert/courses').catch(() => ({ data: [] })),
        api.get('/api/expert/learners-performance').catch(() => ({ data: [] })),
      ]);
      setCourses(coursesRes.data || []);
      setLearnersPerf(perfRes.data || []);
    } catch (err) {
      console.error('Error fetching expert dashboard data:', err);
      setError('Could not load course validation telemetry. Industrial Expert role required.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchExpertData();
  }, [fetchExpertData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchExpertData();
  };

  const totalCourses = courses.length;
  const validatedCount = courses.filter((c) => c.is_expert_validated).length;
  const aiGeneratedCount = courses.filter((c) => c.is_ai_generated).length;
  const monitoredLearnersCount = learnersPerf.length;

  return (
    <ScreenWrapper>
      <Header title="Expert Review Center" subtitle="Industrial Quality & AI Auditing" />

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

        {/* KPI Grid */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconWrap, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
              <BookOpen size={18} color="#8b5cf6" />
            </View>
            <Text style={styles.kpiValue}>{totalCourses}</Text>
            <Text style={styles.kpiLabel}>Total Courses</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <ShieldCheck size={18} color="#10b981" />
            </View>
            <Text style={[styles.kpiValue, { color: '#10b981' }]}>{validatedCount}</Text>
            <Text style={styles.kpiLabel}>Expert Validated</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconWrap, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
              <Cpu size={18} color="#38bdf8" />
            </View>
            <Text style={[styles.kpiValue, { color: '#38bdf8' }]}>{aiGeneratedCount}</Text>
            <Text style={styles.kpiLabel}>AI Generated</Text>
          </View>

          <TouchableOpacity style={styles.kpiCard} onPress={() => setPerfModalVisible(true)}>
            <View style={[styles.kpiIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
              <TrendingUp size={18} color="#f59e0b" />
            </View>
            <Text style={[styles.kpiValue, { color: '#f59e0b' }]}>{monitoredLearnersCount}</Text>
            <Text style={styles.kpiLabel}>Learners Monitored ›</Text>
          </TouchableOpacity>
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHead}>Curriculum Audit Queue</Text>
          <Text style={styles.sectionSub}>Review course outlines & quality checks</Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#8b5cf6" />
            <Text style={styles.loadingText}>Syncing assigned courses...</Text>
          </View>
        ) : courses.length === 0 ? (
          <View style={styles.emptyCard}>
            <BookOpen size={36} color="#64748b" />
            <Text style={styles.emptyTitle}>No Courses Assigned</Text>
            <Text style={styles.emptySubtext}>When courses are assigned or generated by AI, they will appear here for validation.</Text>
          </View>
        ) : (
          courses.map((course) => (
            <TouchableOpacity
              key={course.id}
              style={styles.courseCard}
              onPress={() => {
                setSelectedCourse(course);
                setCourseModalVisible(true);
              }}
            >
              <View style={styles.courseHeaderRow}>
                <View style={styles.titleCol}>
                  <View style={styles.badgeRow}>
                    <Text style={styles.categoryBadge}>{course.category || 'General Tech'}</Text>
                    {course.is_ai_generated ? (
                      <View style={styles.aiPill}>
                        <Cpu size={10} color="#a855f7" />
                        <Text style={styles.aiPillText}>AI Engine</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.courseTitle}>{course.title}</Text>
                </View>
                <ChevronRight size={18} color="#64748b" />
              </View>

              <Text style={styles.courseDesc} numberOfLines={2}>{course.description}</Text>

              <View style={styles.courseFooterRow}>
                <View style={styles.metaStat}>
                  <Clock size={13} color="#475569" />
                  <Text style={styles.metaText}>{course.hours || 0} Hrs</Text>
                </View>
                <View style={styles.metaStat}>
                  <Users size={13} color="#475569" />
                  <Text style={styles.metaText}>{course.students_count || 0} Students</Text>
                </View>
                <View style={[styles.validationPill, course.is_expert_validated ? styles.validPillActive : styles.validPillPending]}>
                  {course.is_expert_validated ? (
                    <>
                      <CheckCircle2 size={12} color="#10b981" />
                      <Text style={[styles.validationText, { color: '#10b981' }]}>Validated</Text>
                    </>
                  ) : (
                    <>
                      <AlertCircle size={12} color="#fbbf24" />
                      <Text style={[styles.validationText, { color: '#fbbf24' }]}>Pending Audit</Text>
                    </>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Course Detail / Inspection Modal */}
      <Modal visible={courseModalVisible} transparent animationType="slide" onRequestClose={() => setCourseModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Course Inspection #{selectedCourse?.id}</Text>
              <TouchableOpacity onPress={() => setCourseModalVisible(false)}>
                <X size={22} color="#475569" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.detailTitle}>{selectedCourse?.title}</Text>
              <Text style={styles.detailCategory}>{selectedCourse?.category}</Text>
              <Text style={styles.detailDesc}>{selectedCourse?.description}</Text>

              <View style={styles.detailStatsBox}>
                <View style={styles.statCol}>
                  <Text style={styles.statVal}>{selectedCourse?.hours || 0}h</Text>
                  <Text style={styles.statLbl}>Duration</Text>
                </View>
                <View style={styles.statCol}>
                  <Text style={styles.statVal}>{selectedCourse?.students_count || 0}</Text>
                  <Text style={styles.statLbl}>Enrolled</Text>
                </View>
                <View style={styles.statCol}>
                  <Text style={styles.statVal}>{selectedCourse?.rating ? `${selectedCourse.rating}★` : 'New'}</Text>
                  <Text style={styles.statLbl}>Rating</Text>
                </View>
              </View>

              <View style={styles.auditStatusRow}>
                <ShieldCheck size={20} color={selectedCourse?.is_expert_validated ? '#10b981' : '#f59e0b'} />
                <View style={styles.auditStatusText}>
                  <Text style={styles.auditHead}>
                    Industrial Status: {selectedCourse?.is_expert_validated ? 'Verified & Approved' : 'Under Review'}
                  </Text>
                  <Text style={styles.auditSub}>
                    {selectedCourse?.is_expert_validated
                      ? 'Curriculum standards and module structure meet industry benchmark requirements.'
                      : 'Requires module content check and supplemental material upload.'}
                  </Text>
                </View>
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setCourseModalVisible(false)}>
                <Text style={styles.closeBtnText}>Close Inspection</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Learners Performance Modal */}
      <Modal visible={perfModalVisible} transparent animationType="slide" onRequestClose={() => setPerfModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Learners Performance Telemetry</Text>
              <TouchableOpacity onPress={() => setPerfModalVisible(false)}>
                <X size={22} color="#475569" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              {learnersPerf.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Users size={32} color="#64748b" />
                  <Text style={styles.emptyTitle}>No Performance Data</Text>
                  <Text style={styles.emptySubtext}>Learner progression and certificate records will populate right here.</Text>
                </View>
              ) : (
                learnersPerf.map((item, index) => (
                  <View key={item.user_id || index} style={styles.perfRow}>
                    <View style={styles.perfInfo}>
                      <Text style={styles.perfName}>{item.name || `Learner #${item.user_id}`}</Text>
                      <Text style={styles.perfEmail}>{item.email || 'Scoped Learner'}</Text>
                    </View>
                    <View style={styles.perfMetrics}>
                      <Text style={styles.perfCertBadge}>{item.certificates_count || 0} Certs</Text>
                      <Text style={styles.perfXP}>{item.xp_points || 0} XP</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setPerfModalVisible(false)}>
                <Text style={styles.closeBtnText}>Close Report</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
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
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  kpiCard: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    alignItems: 'flex-start',
  },
  kpiIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  kpiLabel: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
    fontWeight: '600',
  },
  sectionHeaderRow: {
    marginBottom: 12,
  },
  sectionHead: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  sectionSub: {
    fontSize: 13,
    color: '#475569',
    marginTop: 2,
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
  courseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  courseHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleCol: {
    flex: 1,
    marginRight: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  categoryBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8b5cf6',
  },
  aiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  aiPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#c084fc',
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  courseDesc: {
    fontSize: 13,
    color: '#475569',
    marginTop: 6,
    lineHeight: 18,
  },
  courseFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
  },
  metaStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  validationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  validPillActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  validPillPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  validationText: {
    fontSize: 11,
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
  modalScroll: {
    padding: 18,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  detailCategory: {
    fontSize: 13,
    color: '#8b5cf6',
    fontWeight: '700',
    marginTop: 4,
  },
  detailDesc: {
    fontSize: 14,
    color: '#334155',
    marginTop: 10,
    lineHeight: 20,
  },
  detailStatsBox: {
    flexDirection: 'row',
    backgroundColor: '#FAF7F2',
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
    justifyContent: 'space-around',
  },
  statCol: {
    alignItems: 'center',
  },
  statVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  statLbl: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  auditStatusRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
    gap: 12,
    alignItems: 'flex-start',
  },
  auditStatusText: {
    flex: 1,
  },
  auditHead: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  auditSub: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
    lineHeight: 18,
  },
  perfRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FAF7F2',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  perfInfo: {
    flex: 1,
  },
  perfName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  perfEmail: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  perfMetrics: {
    alignItems: 'flex-end',
  },
  perfCertBadge: {
    fontSize: 12,
    fontWeight: '800',
    color: '#38bdf8',
  },
  perfXP: {
    fontSize: 11,
    color: '#f59e0b',
    fontWeight: '700',
    marginTop: 2,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
    alignItems: 'center',
  },
  closeBtn: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
