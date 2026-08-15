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
import { BookOpen, CheckCircle2, ChevronRight, Clock, Star, Bookmark, X } from 'lucide-react-native';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import Header from '../../components/common/Header';
import api from '../../services/api';

export default function SubjectsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subjects, setSubjects] = useState([]);
  const [progressMap, setProgressMap] = useState({});
  
  // Drill-down modal state
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);

  const fetchSubjectsAndProgress = useCallback(async () => {
    try {
      const [subjRes, progRes] = await Promise.all([
        api.get('/api/learning/subjects').catch(() => ({ data: [] })),
        api.get('/api/learning/subjects-progress').catch(() => ({ data: [] })),
      ]);

      const subjs = subjRes.data || [];
      const progList = progRes.data || [];

      const pMap = {};
      progList.forEach((p) => {
        pMap[p.subject_id] = p;
      });

      setSubjects(subjs);
      setProgressMap(pMap);
    } catch (err) {
      console.error('Error fetching subjects:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSubjectsAndProgress();
  }, [fetchSubjectsAndProgress]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSubjectsAndProgress();
  };

  const handleSelectSubject = async (subject) => {
    setSelectedSubject(subject);
    setLoadingCourses(true);
    try {
      const res = await api.get(`/api/learning/subjects/${subject.id}/courses`);
      setCourses(res.data || []);
    } catch (err) {
      console.error('Error fetching courses for subject:', err);
      setCourses([]);
    } finally {
      setLoadingCourses(false);
    }
  };

  const handleBookmarkCourse = async (course) => {
    try {
      await api.post('/api/learning/bookmarks', {
        item_type: 'course',
        item_id: course.id,
        title: course.title,
        url_path: `/courses/${course.id}`,
      });
      Alert.alert('Bookmarked', `"${course.title}" saved to your bookmarks!`);
    } catch (err) {
      Alert.alert('Error', 'Could not bookmark course. Please try again.');
    }
  };

  if (loading) {
    return (
      <ScreenWrapper>
        <Header title="My Curriculum" subtitle="Assigned Specialization Subjects" />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.loadingText}>Loading assigned curriculum...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <Header title="My Curriculum" subtitle="Assigned Specialization Subjects" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />}
      >
        <Text style={styles.summaryText}>
          Select an assigned subject below to inspect underlying modules, study materials, and linked marketplace courses.
        </Text>

        {subjects.length === 0 ? (
          <View style={styles.emptyCard}>
            <BookOpen size={36} color="#64748b" style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>No Subjects Found</Text>
            <Text style={styles.emptySubtext}>
              You do not have any subjects assigned in your current program cycle. Contact your institution coordinator.
            </Text>
          </View>
        ) : (
          subjects.map((subj) => {
            const prog = progressMap[subj.id] || {};
            const isPassed = prog.passed || false;
            const bestScore = prog.best_score;

            return (
              <TouchableOpacity
                key={subj.id}
                style={styles.subjectCard}
                activeOpacity={0.8}
                onPress={() => handleSelectSubject(subj)}
              >
                <View style={styles.cardTopRow}>
                  <View style={styles.codeBadge}>
                    <Text style={styles.codeText}>{subj.code || `SUB-${subj.id}`}</Text>
                  </View>
                  <View style={[styles.statusBadge, isPassed ? styles.statusBadgePass : styles.statusBadgePending]}>
                    <Text style={[styles.statusBadgeText, isPassed ? styles.statusTextPass : styles.statusTextPending]}>
                      {isPassed ? 'PASSED' : 'ACTIVE'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.subjectTitle}>{subj.name}</Text>
                {subj.description ? (
                  <Text style={styles.subjectDesc} numberOfLines={2}>
                    {subj.description}
                  </Text>
                ) : null}

                <View style={styles.cardFooter}>
                  <View style={styles.footerInfo}>
                    <Text style={styles.footerText}>
                      Semester Tier: <Text style={styles.footerBold}>{subj.semester_tier || 'District'}</Text>
                    </Text>
                    {bestScore !== null && bestScore !== undefined ? (
                      <Text style={styles.footerText}>
                        High Score: <Text style={styles.footerBold}>{bestScore}%</Text>
                      </Text>
                    ) : null}
                  </View>
                  <ChevronRight size={20} color="#818cf8" />
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* Modal for viewing underlying marketplace courses */}
        <Modal visible={!!selectedSubject} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalCode}>{selectedSubject?.code || 'SUBJECT COURSES'}</Text>
                  <Text style={styles.modalTitle}>{selectedSubject?.name}</Text>
                </View>
                <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedSubject(null)}>
                  <X size={20} color="#0f172a" />
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalScroll}>
                {loadingCourses ? (
                  <View style={styles.modalLoading}>
                    <ActivityIndicator size="large" color="#4f46e5" />
                    <Text style={styles.loadingText}>Fetching linked courses...</Text>
                  </View>
                ) : courses.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyTitle}>No Courses Attached</Text>
                    <Text style={styles.emptySubtext}>
                      There are no marketplace courses linked to this subject yet.
                    </Text>
                  </View>
                ) : (
                  courses.map((c) => (
                    <View key={c.id} style={styles.courseCard}>
                      <View style={styles.courseHeaderRow}>
                        <View style={styles.categoryBadge}>
                          <Text style={styles.categoryText}>{c.category || 'General'}</Text>
                        </View>
                        <View style={styles.metaRow}>
                          <Clock size={14} color="#475569" />
                          <Text style={styles.metaText}>{c.duration_hours || 4}h</Text>
                          <Star size={14} color="#f59e0b" style={{ marginLeft: 8 }} />
                          <Text style={styles.metaText}>{c.rating || '4.8'}</Text>
                        </View>
                      </View>

                      <Text style={styles.courseTitle}>{c.title}</Text>
                      <Text style={styles.courseDesc} numberOfLines={3}>
                        {c.description}
                      </Text>

                      <View style={styles.courseActions}>
                        <TouchableOpacity
                          style={styles.bookmarkBtn}
                          onPress={() => handleBookmarkCourse(c)}
                        >
                          <Bookmark size={16} color="#818cf8" />
                          <Text style={styles.bookmarkBtnText}>Bookmark</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
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
  summaryText: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 17,
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
  subjectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  codeBadge: {
    backgroundColor: 'rgba(79, 70, 229, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  codeText: {
    color: '#818cf8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgePass: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusBadgePending: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusTextPass: {
    color: '#10b981',
  },
  statusTextPending: {
    color: '#38bdf8',
  },
  subjectTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  subjectDesc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
    paddingTop: 12,
    marginTop: 4,
  },
  footerInfo: {
    flexDirection: 'row',
    gap: 16,
  },
  footerText: {
    fontSize: 12,
    color: '#64748b',
  },
  footerBold: {
    color: '#334155',
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FAF7F2',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    borderTopWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.15)',
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  modalCode: {
    color: '#818cf8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  modalTitle: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '800',
  },
  closeBtn: {
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 20,
  },
  modalScroll: {
    padding: 20,
    paddingBottom: 40,
  },
  modalLoading: {
    padding: 40,
    alignItems: 'center',
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
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryText: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    color: '#475569',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '600',
  },
  courseTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  courseDesc: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  courseActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
    paddingTop: 10,
  },
  bookmarkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(79, 70, 229, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  bookmarkBtnText: {
    color: '#818cf8',
    fontSize: 13,
    fontWeight: '700',
  },
});
