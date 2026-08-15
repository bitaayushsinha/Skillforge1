import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Award, BookOpen, Bookmark, Calendar, ChevronRight, TrendingUp, Sparkles } from 'lucide-react-native';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import Header from '../../components/common/Header';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function DashboardScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [registration, setRegistration] = useState(null);
  const [progressData, setProgressData] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [mockResults, setMockResults] = useState([]);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setError(null);
      const [regRes, progRes, bmRes, mockRes] = await Promise.all([
        api.get('/api/learning/my-registration').catch(() => ({ data: null })),
        api.get('/api/learning/subjects-progress').catch(() => ({ data: [] })),
        api.get('/api/learning/bookmarks').catch(() => ({ data: [] })),
        api.get('/api/learning/my-mock-results').catch(() => ({ data: [] })),
      ]);

      setRegistration(regRes.data);
      setProgressData(progRes.data || []);
      setBookmarks(bmRes.data || []);
      setMockResults(mockRes.data || []);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Could not load some dashboard metrics. Check network.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  // Calculate aggregate completion & best stats
  const totalSubjects = progressData.length;
  const passedSubjects = progressData.filter((item) => item.passed).length;
  const overallCompletionRate = totalSubjects > 0 ? Math.round((passedSubjects / totalSubjects) * 100) : 0;
  
  const latestMock = mockResults.length > 0 ? mockResults[0] : null;

  if (loading) {
    return (
      <ScreenWrapper>
        <Header title="SkillForge Portal" subtitle="Learner Dashboard" />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.loadingText}>Syncing academic records...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <Header title="SkillForge Portal" subtitle={`Welcome, ${user?.name || 'Learner'}`} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />}
      >
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Hero Program Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={styles.heroBadge}>
              <Sparkles size={14} color="#818cf8" />
              <Text style={styles.heroBadgeText}>ACTIVE PROGRAM</Text>
            </View>
            <Text style={styles.tierPill}>{registration?.current_tier || 'District'} Tier</Text>
          </View>
          <Text style={styles.heroTitle}>{registration?.batch_name || 'Assigned Specialization'}</Text>
          <Text style={styles.heroSubtext}>Registration ID: {registration?.registration_number || 'SF-ACTIVE'}</Text>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressTextRow}>
              <Text style={styles.progressLabel}>Curriculum Mastery</Text>
              <Text style={styles.progressPercent}>{overallCompletionRate}%</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${overallCompletionRate}%` }]} />
            </View>
          </View>
        </View>

        {/* KPI Grid */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
              <BookOpen size={20} color="#3b82f6" />
            </View>
            <Text style={styles.kpiNumber}>{totalSubjects}</Text>
            <Text style={styles.kpiLabel}>Subjects Assigned</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Award size={20} color="#10b981" />
            </View>
            <Text style={styles.kpiNumber}>{passedSubjects}</Text>
            <Text style={styles.kpiLabel}>Subjects Passed</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
              <Bookmark size={20} color="#8b5cf6" />
            </View>
            <Text style={styles.kpiNumber}>{bookmarks.length}</Text>
            <Text style={styles.kpiLabel}>Bookmarks Saved</Text>
          </View>
        </View>

        {/* Subject Progress Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Assigned Subjects Progress</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Subjects')}>
            <Text style={styles.sectionAction}>View All</Text>
          </TouchableOpacity>
        </View>

        {progressData.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No Subjects Assigned Yet</Text>
            <Text style={styles.emptySubtext}>Your academic advisor will assign specialization curricula soon.</Text>
          </View>
        ) : (
          progressData.slice(0, 3).map((item) => (
            <TouchableOpacity
              key={item.subject_id}
              style={styles.subjectCard}
              onPress={() => navigation.navigate('Subjects')}
            >
              <View style={styles.subjectCardMain}>
                <View style={styles.subjectInfo}>
                  <Text style={styles.subjectCode}>{item.subject_code}</Text>
                  <Text style={styles.subjectName}>{item.subject_name}</Text>
                </View>
                <View style={[styles.statusBadge, item.passed ? styles.statusBadgePass : styles.statusBadgePending]}>
                  <Text style={[styles.statusBadgeText, item.passed ? styles.statusTextPass : styles.statusTextPending]}>
                    {item.passed ? 'PASSED' : 'IN PROGRESS'}
                  </Text>
                </View>
              </View>
              <View style={styles.subjectMetaRow}>
                <Text style={styles.subjectMetaText}>Bookings: {item.total_bookings}</Text>
                <Text style={styles.subjectMetaText}>Best Score: {item.best_score !== null ? `${item.best_score}%` : 'N/A'}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Recent Mock Test Attempt */}
        {latestMock ? (
          <View style={styles.recentActivityBox}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent AI Assessment</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Exams')}>
                <Text style={styles.sectionAction}>Analytics</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.mockCard}>
              <View style={styles.mockCardLeft}>
                <TrendingUp size={24} color="#818cf8" />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.mockTopic}>{latestMock.topic}</Text>
                  <Text style={styles.mockDate}>
                    {new Date(latestMock.attempt_date).toLocaleDateString()} • {latestMock.total_questions} Questions
                  </Text>
                </View>
              </View>
              <View style={styles.mockScorePill}>
                <Text style={styles.mockScoreText}>{Math.round(latestMock.score)}%</Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* Bookmarks Summary */}
        {bookmarks.length > 0 ? (
          <View style={styles.bookmarksSection}>
            <Text style={styles.sectionTitle}>Saved Bookmarks</Text>
            {bookmarks.slice(0, 2).map((bm) => (
              <View key={bm.id} style={styles.bookmarkRow}>
                <Bookmark size={16} color="#8b5cf6" />
                <Text style={styles.bookmarkTitle} numberOfLines={1}>
                  {bm.title}
                </Text>
                <ChevronRight size={16} color="#64748b" />
              </View>
            ))}
          </View>
        ) : null}
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
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#ef4444',
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 13,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    marginBottom: 20,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(79, 70, 229, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  heroBadgeText: {
    color: '#818cf8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tierPill: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  heroSubtext: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 20,
  },
  progressContainer: {
    marginTop: 4,
  },
  progressTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 14,
    color: '#818cf8',
    fontWeight: '800',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#FAF7F2',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4f46e5',
    borderRadius: 4,
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
  kpiIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  kpiNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  kpiLabel: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  sectionAction: {
    fontSize: 13,
    color: '#818cf8',
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    marginBottom: 20,
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
  },
  subjectCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  subjectCardMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  subjectInfo: {
    flex: 1,
    marginRight: 12,
  },
  subjectCode: {
    fontSize: 11,
    fontWeight: '800',
    color: '#818cf8',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  subjectName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
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
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusTextPass: {
    color: '#10b981',
  },
  statusTextPending: {
    color: '#f59e0b',
  },
  subjectMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
  },
  subjectMetaText: {
    fontSize: 12,
    color: '#475569',
  },
  recentActivityBox: {
    marginTop: 12,
  },
  mockCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  mockCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mockTopic: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  mockDate: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  mockScorePill: {
    backgroundColor: 'rgba(79, 70, 229, 0.2)',
    borderWidth: 1,
    borderColor: '#4f46e5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  mockScoreText: {
    color: '#818cf8',
    fontSize: 14,
    fontWeight: '800',
  },
  bookmarksSection: {
    marginTop: 24,
  },
  bookmarkRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  bookmarkTitle: {
    flex: 1,
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 10,
  },
});
