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
} from 'react-native';
import {
  Building,
  Users,
  Award,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  ChevronRight,
  X,
  ShieldCheck,
  CreditCard,
  TrendingUp,
} from 'lucide-react-native';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import Header from '../../components/common/Header';
import api from '../../services/api';

export default function POCDashboardScreen({ navigation }) {
  const [students, setStudents] = useState([]);
  const [cycleYear, setCycleYear] = useState('2026-2027');
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState('All'); // 'All' | 'District' | 'State' | 'National'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Student Detail Modal
  const [selectedReg, setSelectedReg] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchPOCStudents = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get(`/api/admin/poc/students?cycle_year=${cycleYear}`);
      setStudents(res.data || []);
    } catch (err) {
      console.error('Error fetching POC students:', err);
      setError('Could not load institution student roster. Verify POC/SubAdmin access credentials.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [cycleYear]);

  useEffect(() => {
    setLoading(true);
    fetchPOCStudents();
  }, [fetchPOCStudents]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPOCStudents();
  };

  // Filter and Search logic
  const filteredStudents = students.filter((reg) => {
    const matchesTier = tierFilter === 'All' || reg.current_tier === tierFilter;
    const nameStr = reg.user?.name || `Learner #${reg.user_id}`;
    const emailStr = reg.user?.email || '';
    const regNum = reg.registration_number || '';
    const matchesQuery =
      !searchQuery.trim() ||
      nameStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emailStr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      regNum.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTier && matchesQuery;
  });

  const totalEnrolled = students.length;
  const activeAccessCount = students.filter((s) => s.access_status === 'active' || s.access_state === 'active').length;
  const paidCount = students.filter((s) => s.payment_status === 'paid').length;

  // Calculate avg district score
  const scores = students.map((s) => s.district_score).filter((sc) => sc !== null && sc !== undefined);
  const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : 'N/A';

  return (
    <ScreenWrapper>
      <Header title="POC Portal" subtitle={`Institution Scope (${cycleYear})`} />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#06b6d4" />}
      >
        {error ? (
          <View style={styles.errorBanner}>
            <AlertCircle size={18} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Institution KPI Telemetry */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <View style={[styles.iconWrap, { backgroundColor: 'rgba(6, 182, 212, 0.15)' }]}>
              <Users size={18} color="#06b6d4" />
            </View>
            <Text style={styles.kpiValue}>{totalEnrolled}</Text>
            <Text style={styles.kpiLabel}>Enrolled Roster</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.iconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <ShieldCheck size={18} color="#10b981" />
            </View>
            <Text style={[styles.kpiValue, { color: '#10b981' }]}>{activeAccessCount}</Text>
            <Text style={styles.kpiLabel}>Active Access</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.iconWrap, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
              <Award size={18} color="#8b5cf6" />
            </View>
            <Text style={[styles.kpiValue, { color: '#8b5cf6' }]}>{avgScore !== 'N/A' ? `${avgScore}%` : 'N/A'}</Text>
            <Text style={styles.kpiLabel}>Avg District Score</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={[styles.iconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
              <CreditCard size={18} color="#f59e0b" />
            </View>
            <Text style={[styles.kpiValue, { color: '#f59e0b' }]}>{paidCount}</Text>
            <Text style={styles.kpiLabel}>Paid Registrations</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Search size={18} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search student name, email or reg #..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color="#475569" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Tier Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {['All', 'District', 'State', 'National'].map((tier) => (
            <TouchableOpacity
              key={tier}
              style={[styles.tierPill, tierFilter === tier && styles.tierPillActive]}
              onPress={() => setTierFilter(tier)}
            >
              <Text style={[styles.tierPillText, tierFilter === tier && styles.tierPillTextActive]}>{tier}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.sectionHeadRow}>
          <Text style={styles.sectionTitle}>Scoped Student Roster ({filteredStudents.length})</Text>
          <TouchableOpacity
            style={styles.verifyLink}
            onPress={() => navigation?.navigate('Verify')}
          >
            <ShieldCheck size={14} color="#06b6d4" />
            <Text style={styles.verifyLinkText}>Go to Verification ›</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#06b6d4" />
            <Text style={styles.loadingText}>Syncing institution students...</Text>
          </View>
        ) : filteredStudents.length === 0 ? (
          <View style={styles.emptyCard}>
            <Building size={36} color="#64748b" />
            <Text style={styles.emptyTitle}>No Students Found</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery || tierFilter !== 'All'
                ? 'No students matched your search criteria or tier filter.'
                : 'No student registrations assigned to your institution right now.'}
            </Text>
          </View>
        ) : (
          filteredStudents.map((reg) => {
            const studentName = reg.user?.name || `Learner #${reg.user_id}`;
            const studentEmail = reg.user?.email || 'No email registered';
            const isActive = reg.access_status === 'active' || reg.access_state === 'active';
            return (
              <TouchableOpacity
                key={reg.id}
                style={styles.studentCard}
                onPress={() => {
                  setSelectedReg(reg);
                  setModalVisible(true);
                }}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.nameCol}>
                    <Text style={styles.studentName}>{studentName}</Text>
                    <Text style={styles.studentEmail}>{studentEmail}</Text>
                  </View>
                  <ChevronRight size={18} color="#64748b" />
                </View>

                <View style={styles.metaGrid}>
                  <View style={styles.metaCell}>
                    <Text style={styles.metaLabel}>Reg Number:</Text>
                    <Text style={styles.metaVal}>{reg.registration_number || 'PENDING'}</Text>
                  </View>
                  <View style={styles.metaCell}>
                    <Text style={styles.metaLabel}>Batch Tier:</Text>
                    <Text style={[styles.metaVal, { color: '#06b6d4' }]}>{reg.current_tier || 'District'}</Text>
                  </View>
                  <View style={styles.metaCell}>
                    <Text style={styles.metaLabel}>Status:</Text>
                    <View style={[styles.statusBadge, isActive ? styles.badgeActive : styles.badgeInactive]}>
                      <Text style={[styles.statusBadgeText, { color: isActive ? '#10b981' : '#f43f5e' }]}>
                        {isActive ? 'ACTIVE' : 'LOCKED'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Score Summary Row */}
                <View style={styles.scoreRow}>
                  <Text style={styles.scoreText}>District: {reg.district_score ?? '-'}</Text>
                  <Text style={styles.scoreText}>State: {reg.state_score ?? '-'}</Text>
                  <Text style={styles.scoreText}>National: {reg.national_score ?? '-'}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Student Detail & Progression Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Student Dossier #{selectedReg?.id}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}><X size={22} color="#475569" /></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.detailName}>{selectedReg?.user?.name || `Learner #${selectedReg?.user_id}`}</Text>
              <Text style={styles.detailEmail}>{selectedReg?.user?.email}</Text>

              <View style={styles.dossierSection}>
                <Text style={styles.dossierHead}>Registration Details</Text>
                <View style={styles.dossierRow}>
                  <Text style={styles.dossierKey}>Registration #:</Text>
                  <Text style={styles.dossierVal}>{selectedReg?.registration_number || 'N/A'}</Text>
                </View>
                <View style={styles.dossierRow}>
                  <Text style={styles.dossierKey}>Batch / Cycle:</Text>
                  <Text style={styles.dossierVal}>{selectedReg?.batch_name || selectedReg?.cycle_year}</Text>
                </View>
                <View style={styles.dossierRow}>
                  <Text style={styles.dossierKey}>Current Tier:</Text>
                  <Text style={[styles.dossierVal, { color: '#06b6d4' }]}>{selectedReg?.current_tier || 'District'}</Text>
                </View>
                <View style={styles.dossierRow}>
                  <Text style={styles.dossierKey}>Access State:</Text>
                  <Text style={styles.dossierVal}>{selectedReg?.access_state || selectedReg?.access_status}</Text>
                </View>
                <View style={styles.dossierRow}>
                  <Text style={styles.dossierKey}>Payment Status:</Text>
                  <Text style={[styles.dossierVal, { color: selectedReg?.payment_status === 'paid' ? '#10b981' : '#f59e0b' }]}>
                    {selectedReg?.payment_status?.toUpperCase() || 'UNPAID'}
                  </Text>
                </View>
              </View>

              <View style={styles.dossierSection}>
                <Text style={styles.dossierHead}>Assessment Telemetry</Text>
                <View style={styles.dossierRow}>
                  <Text style={styles.dossierKey}>District Exam Score:</Text>
                  <Text style={styles.dossierVal}>{selectedReg?.district_score ?? 'Not Attempted'}</Text>
                </View>
                <View style={styles.dossierRow}>
                  <Text style={styles.dossierKey}>State Exam Score:</Text>
                  <Text style={styles.dossierVal}>{selectedReg?.state_score ?? 'Not Attempted'}</Text>
                </View>
                <View style={styles.dossierRow}>
                  <Text style={styles.dossierKey}>National Exam Score:</Text>
                  <Text style={styles.dossierVal}>{selectedReg?.national_score ?? 'Not Attempted'}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.verifyActionBtn}
                onPress={() => {
                  setModalVisible(false);
                  navigation?.navigate('Verify', { studentId: selectedReg?.user_id });
                }}
              >
                <ShieldCheck size={18} color="#ffffff" />
                <Text style={styles.verifyActionText}>Open Result Verification Console</Text>
              </TouchableOpacity>
            </ScrollView>
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
    marginBottom: 18,
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
  iconWrap: {
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    marginBottom: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: '#0f172a',
    fontSize: 14,
  },
  filterRow: {
    gap: 8,
    marginBottom: 18,
  },
  tierPill: {
    backgroundColor: '#FAF7F2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  tierPillActive: {
    backgroundColor: '#06b6d4',
    borderColor: '#06b6d4',
  },
  tierPillText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
  tierPillTextActive: {
    color: '#ffffff',
  },
  sectionHeadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  verifyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifyLinkText: {
    color: '#06b6d4',
    fontSize: 13,
    fontWeight: '700',
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
  studentCard: {
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
  nameCol: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  studentEmail: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  metaGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
  },
  metaCell: {
    alignItems: 'flex-start',
  },
  metaLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  metaVal: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '700',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  badgeActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  badgeInactive: {
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FAF7F2',
    borderRadius: 10,
    paddingVertical: 8,
    marginTop: 12,
  },
  scoreText: {
    fontSize: 12,
    color: '#a855f7',
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
  detailName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  detailEmail: {
    fontSize: 13,
    color: '#475569',
    marginTop: 2,
  },
  dossierSection: {
    backgroundColor: '#FAF7F2',
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
  },
  dossierHead: {
    fontSize: 13,
    fontWeight: '700',
    color: '#06b6d4',
    marginBottom: 10,
  },
  dossierRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.04)',
  },
  dossierKey: {
    fontSize: 13,
    color: '#475569',
  },
  dossierVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  verifyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#06b6d4',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 24,
    marginBottom: 16,
    gap: 8,
  },
  verifyActionText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});
