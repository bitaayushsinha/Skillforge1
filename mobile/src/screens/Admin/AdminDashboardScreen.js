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
import {
  LayoutDashboard,
  Users,
  Award,
  TrendingUp,
  ShieldCheck,
  Calendar,
  IndianRupee,
  Building2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react-native';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import Header from '../../components/common/Header';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function AdminDashboardScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [engagementData, setEngagementData] = useState(null);
  const [progressionData, setProgressionData] = useState(null);
  const [error, setError] = useState(null);

  const fetchAdminMetrics = useCallback(async () => {
    try {
      setError(null);
      const [sysRes, engRes, progRes] = await Promise.all([
        api.get('/api/admin/reports/system-dashboard').catch(() => ({ data: null })),
        api.get('/api/admin/reports/engagement').catch(() => ({ data: null })),
        api.get('/api/admin/analytics/progression').catch(() => ({ data: null })),
      ]);

      setDashboardData(sysRes.data);
      setEngagementData(engRes.data);
      setProgressionData(progRes.data);
    } catch (err) {
      console.error('Error fetching admin dashboard metrics:', err);
      setError('Failed to load live system analytics. Check network or permissions.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminMetrics();
  }, [fetchAdminMetrics]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAdminMetrics();
  };

  // Calculate top-level aggregates
  const totalStudents = engagementData?.total_students || 
    dashboardData?.progression?.reduce((sum, item) => sum + (item.student_count || 0), 0) || 0;
  const activeStudents = engagementData?.active_students || 0;
  const completionRate = engagementData?.completion_rate || 0;
  const certCount = engagementData?.total_certificates_issued || 0;

  const totalRevenue = dashboardData?.revenue?.reduce((sum, item) => sum + (item.total_revenue || 0), 0) || 0;

  if (loading) {
    return (
      <ScreenWrapper>
        <Header title="Admin Overview" subtitle="System Analytics & Metrics" />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#f59e0b" />
          <Text style={styles.loadingText}>Loading live portal telemetry...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <Header
        title="Admin Overview"
        subtitle={`Role: ${user?.role === 'admin' ? 'System Administrator' : 'Sub-Administrator'}`}
      />
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

        {/* Hero Banner Box */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeaderRow}>
            <View style={styles.heroBadge}>
              <ShieldCheck size={14} color="#fbbf24" />
              <Text style={styles.heroBadgeText}>SYSTEM HEALTH: OPTIMAL</Text>
            </View>
            <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
              <RefreshCw size={16} color="#475569" />
            </TouchableOpacity>
          </View>
          <Text style={styles.heroTitle}>SkillForge LMS Telemetry</Text>
          <Text style={styles.heroSubtitle}>Real-time student progress, exam verification, and revenue flow</Text>

          {/* Quick Revenue Banner inside Hero */}
          <View style={styles.revenueBox}>
            <View style={styles.revenueInfo}>
              <Text style={styles.revenueLabel}>Total Realized Revenue</Text>
              <Text style={styles.revenueValue}>₹{totalRevenue.toLocaleString()}</Text>
            </View>
            <View style={styles.revenueIconBox}>
              <IndianRupee size={22} color="#10b981" />
            </View>
          </View>
        </View>

        {/* KPI Grid */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
              <Users size={20} color="#3b82f6" />
            </View>
            <Text style={styles.kpiNumber}>{totalStudents}</Text>
            <Text style={styles.kpiLabel}>Total Enrolled</Text>
            <Text style={styles.kpiSubLabel}>{activeStudents} Active</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Award size={20} color="#10b981" />
            </View>
            <Text style={styles.kpiNumber}>{certCount}</Text>
            <Text style={styles.kpiLabel}>Certificates Issued</Text>
            <Text style={styles.kpiSubLabel}>Verified credentials</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
              <TrendingUp size={20} color="#f59e0b" />
            </View>
            <Text style={styles.kpiNumber}>{completionRate}%</Text>
            <Text style={styles.kpiLabel}>Curriculum Pace</Text>
            <Text style={styles.kpiSubLabel}>Avg mastery rate</Text>
          </View>
        </View>

        {/* Tier Progression Breakdown */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Tier Progression Distribution</Text>
          <Text style={styles.sectionSubtitle}>Learner breakdown by tier and access status</Text>

          {progressionData?.tiers?.length > 0 ? (
            progressionData.tiers.map((t, idx) => {
              const totalInTier = t.total || (t.active + t.grace_period + t.deactivated + t.pending_payment) || 1;
              const activePct = Math.round(((t.active || 0) / totalInTier) * 100);
              return (
                <View key={t.tier || idx} style={styles.tierCard}>
                  <View style={styles.tierHeader}>
                    <Text style={styles.tierName}>{t.tier} Tier</Text>
                    <Text style={styles.tierTotalText}>{t.total} Students</Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${activePct}%` }]} />
                  </View>
                  <View style={styles.tierStatsRow}>
                    <Text style={styles.tierStatItem}>Active: <Text style={{ color: '#10b981' }}>{t.active || 0}</Text></Text>
                    <Text style={styles.tierStatItem}>Grace: <Text style={{ color: '#fbbf24' }}>{t.grace_period || 0}</Text></Text>
                    <Text style={styles.tierStatItem}>Unpaid: <Text style={{ color: '#f87171' }}>{t.pending_payment || 0}</Text></Text>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No progression telemetry recorded yet.</Text>
            </View>
          )}
        </View>

        {/* Batch-wise Performance */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Registration Cycle Performance</Text>
          <Text style={styles.sectionSubtitle}>Exam pass rates and average scores across batches</Text>

          {dashboardData?.batch_analytics?.length > 0 ? (
            dashboardData.batch_analytics.map((batch, index) => (
              <View key={batch.cycle_year || index} style={styles.batchCard}>
                <View style={styles.batchHeader}>
                  <View style={styles.batchTitleRow}>
                    <Calendar size={18} color="#818cf8" />
                    <Text style={styles.batchName}>{batch.cycle_year || 'Current Batch'}</Text>
                  </View>
                  <View style={[styles.passBadge, batch.pass_rate >= 60 ? styles.passBadgeGood : styles.passBadgeWarn]}>
                    <Text style={[styles.passBadgeText, batch.pass_rate >= 60 ? { color: '#10b981' } : { color: '#f59e0b' }]}>
                      {batch.pass_rate}% Pass Rate
                    </Text>
                  </View>
                </View>
                <View style={styles.batchDetailsRow}>
                  <Text style={styles.batchDetailText}>Enrolled: <Text style={styles.boldWhite}>{batch.total_students}</Text></Text>
                  <Text style={styles.batchDetailText}>Avg Score: <Text style={styles.boldWhite}>{batch.avg_score}%</Text></Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No cycle analytics found.</Text>
            </View>
          )}
        </View>
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
    fontSize: 14,
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
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    marginBottom: 20,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  heroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  heroBadgeText: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  refreshBtn: {
    padding: 4,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 16,
  },
  revenueBox: {
    backgroundColor: '#FAF7F2',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  revenueInfo: {
    flex: 1,
  },
  revenueLabel: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
    marginBottom: 2,
  },
  revenueValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#10b981',
  },
  revenueIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
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
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  kpiIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  kpiNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  kpiLabel: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  kpiSubLabel: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
    textAlign: 'center',
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 12,
    marginTop: 2,
  },
  tierCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tierName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  tierTotalText: {
    fontSize: 13,
    color: '#818cf8',
    fontWeight: '600',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#FAF7F2',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#f59e0b',
    borderRadius: 4,
  },
  tierStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tierStatItem: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  batchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  batchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  batchTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  batchName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  passBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  passBadgeGood: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  passBadgeWarn: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  passBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  batchDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
    paddingTop: 10,
  },
  batchDetailText: {
    fontSize: 13,
    color: '#475569',
  },
  boldWhite: {
    color: '#0f172a',
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
  },
});

