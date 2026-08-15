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
} from 'react-native';
import { CreditCard, CheckCircle2, ShieldAlert, ArrowUpRight, History, Sparkles } from 'lucide-react-native';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import Header from '../../components/common/Header';
import WalletNav from '../../components/common/WalletNav';
import api from '../../services/api';

export default function PaymentCheckoutScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [registration, setRegistration] = useState(null);
  const [pricing, setPricing] = useState({});
  const [history, setHistory] = useState([]);
  const [submittingTier, setSubmittingTier] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [regRes, priceRes, histRes] = await Promise.all([
        api.get('/api/learning/my-registration').catch(() => ({ data: null })),
        api.get('/api/payments/pricing').catch(() => ({ data: {} })),
        api.get('/api/payments/history').catch(() => ({ data: [] })),
      ]);

      setRegistration(regRes.data);
      setPricing(priceRes.data || {});
      setHistory(histRes.data || []);
    } catch (err) {
      console.error('Error fetching payment data:', err);
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

  const getTierPriceINR = (tierKey, defaultRupees) => {
    const item = pricing?.[tierKey];
    if (!item) return defaultRupees;
    if (typeof item === 'object') {
      return item.total_amount ?? item.base_amount ?? defaultRupees;
    }
    if (typeof item === 'number') {
      return item > 10000 ? item / 100 : item;
    }
    return defaultRupees;
  };

  const handleInitiatePayment = async (targetTier) => {
    if (!registration) {
      Alert.alert('Notice', 'No active student registration found to upgrade.');
      return;
    }

    if (registration.current_tier === targetTier) {
      Alert.alert('Current Tier', `You are already actively enrolled in the ${targetTier} tier.`);
      return;
    }

    setSubmittingTier(targetTier);
    try {
      const res = await api.post('/api/payments/create-order', {
        registration_id: registration.id,
        target_tier: targetTier,
      });

      const orderData = res.data;
      const amountRupees = typeof orderData.amount === 'number'
        ? (orderData.amount > 10000 ? orderData.amount / 100 : orderData.amount)
        : getTierPriceINR(targetTier, targetTier === 'State' ? 1770 : 2360);

      Alert.alert(
        'Razorpay Order Generated',
        `Order ID: ${orderData.order_id}\nAmount: ₹${amountRupees.toFixed(0)} INR (incl. GST)\nKey: ${orderData.key_id}\n\nIn this managed native build, complete checkout using the web portal or Razorpay SDK verification.`,
        [
          { text: 'OK', onPress: () => fetchData() },
        ]
      );
    } catch (err) {
      const msg = err.response?.data?.detail || 'Could not create Razorpay order.';
      Alert.alert('Checkout Error', msg);
    } finally {
      setSubmittingTier(null);
    }
  };

  if (loading) {
    return (
      <ScreenWrapper>
        <Header title="Tier Upgrades" subtitle="Razorpay Payments & Pricing" />
        <WalletNav activeTab="payments" />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.loadingText}>Loading pricing schedules...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  const currentTier = registration?.current_tier || 'District';

  return (
    <ScreenWrapper>
      <Header title="Tier Upgrades" subtitle="Razorpay Payments & Pricing" />
      <WalletNav activeTab="payments" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />}
      >
        <View style={styles.infoBox}>
          <Sparkles size={18} color="#818cf8" />
          <Text style={styles.infoText}>
            Upgrade your access tier to unlock advanced State/National level subjects, AI assessment privileges, and official proctored slots. All transactions are processed securely via Razorpay with 18% GST.
          </Text>
        </View>

        <View style={styles.currentTierCard}>
          <Text style={styles.currentLabel}>CURRENT ACTIVE TIER</Text>
          <Text style={styles.currentValue}>{currentTier.toUpperCase()} LEVEL</Text>
        </View>

        <Text style={styles.sectionTitle}>Available Program Tiers</Text>

        {/* Tier Card: District */}
        <View style={[styles.tierCard, currentTier === 'District' && styles.tierCardActive]}>
          <View style={styles.tierHeader}>
            <View>
              <Text style={styles.tierTitle}>District Tier</Text>
              <Text style={styles.tierSub}>Standard Program Access</Text>
            </View>
            <View style={styles.pricePill}>
              <Text style={styles.priceText}>₹{getTierPriceINR('District', 0).toFixed(0)} INR</Text>
            </View>
          </View>

          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <CheckCircle2 size={16} color="#10b981" />
              <Text style={styles.featureText}>District level curriculum & subjects</Text>
            </View>
            <View style={styles.featureItem}>
              <CheckCircle2 size={16} color="#10b981" />
              <Text style={styles.featureText}>Up to 3 daily AI practice mock attempts</Text>
            </View>
          </View>

          {currentTier === 'District' ? (
            <View style={styles.activeBtn}>
              <Text style={styles.activeBtnText}>CURRENTLY ENROLLED</Text>
            </View>
          ) : null}
        </View>

        {/* Tier Card: State */}
        <View style={[styles.tierCard, currentTier === 'State' && styles.tierCardActive]}>
          <View style={styles.tierHeader}>
            <View>
              <Text style={styles.tierTitle}>State Tier</Text>
              <Text style={styles.tierSub}>Advanced Specialization</Text>
            </View>
            <View style={[styles.pricePill, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
              <Text style={[styles.priceText, { color: '#38bdf8' }]}>₹{getTierPriceINR('State', 1770).toFixed(0)} INR</Text>
            </View>
          </View>

          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <CheckCircle2 size={16} color="#38bdf8" />
              <Text style={styles.featureText}>Full State level curriculum & advanced subjects</Text>
            </View>
            <View style={styles.featureItem}>
              <CheckCircle2 size={16} color="#38bdf8" />
              <Text style={styles.featureText}>Priority proctored exam window selection</Text>
            </View>
            <View style={styles.featureItem}>
              <CheckCircle2 size={16} color="#38bdf8" />
              <Text style={styles.featureText}>Up to 10 daily AI practice evaluations</Text>
            </View>
          </View>

          {currentTier === 'State' ? (
            <View style={styles.activeBtn}>
              <Text style={styles.activeBtnText}>CURRENTLY ENROLLED</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.upgradeBtn, submittingTier === 'State' && styles.upgradeBtnDisabled]}
              disabled={submittingTier === 'State'}
              onPress={() => handleInitiatePayment('State')}
            >
              {submittingTier === 'State' ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <CreditCard size={18} color="#ffffff" />
                  <Text style={styles.upgradeBtnText}>Upgrade to State Tier</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Tier Card: National */}
        <View style={[styles.tierCard, currentTier === 'National' && styles.tierCardActive]}>
          <View style={styles.tierHeader}>
            <View>
              <Text style={styles.tierTitle}>National Tier</Text>
              <Text style={styles.tierSub}>All-Access Elite Leadership</Text>
            </View>
            <View style={[styles.pricePill, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Text style={[styles.priceText, { color: '#10b981' }]}>₹{getTierPriceINR('National', 2360).toFixed(0)} INR</Text>
            </View>
          </View>

          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <CheckCircle2 size={16} color="#10b981" />
              <Text style={styles.featureText}>Complete National level elite curriculum</Text>
            </View>
            <View style={styles.featureItem}>
              <CheckCircle2 size={16} color="#10b981" />
              <Text style={styles.featureText}>Unlimited AI practice evaluation engine</Text>
            </View>
            <View style={styles.featureItem}>
              <CheckCircle2 size={16} color="#10b981" />
              <Text style={styles.featureText}>Direct industry expert review & priority support</Text>
            </View>
          </View>

          {currentTier === 'National' ? (
            <View style={styles.activeBtn}>
              <Text style={styles.activeBtnText}>CURRENTLY ENROLLED</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.upgradeBtn, { backgroundColor: '#10b981' }, submittingTier === 'National' && styles.upgradeBtnDisabled]}
              disabled={submittingTier === 'National'}
              onPress={() => handleInitiatePayment('National')}
            >
              {submittingTier === 'National' ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <CreditCard size={18} color="#ffffff" />
                  <Text style={styles.upgradeBtnText}>Upgrade to National Tier</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Transaction History */}
        <View style={{ marginTop: 24 }}>
          <View style={styles.histHeader}>
            <History size={18} color="#818cf8" />
            <Text style={styles.sectionTitle}>Transaction History</Text>
          </View>

          {history.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No Transactions Found</Text>
              <Text style={styles.emptySubtext}>Your payment history and receipts will appear here after upgrading.</Text>
            </View>
          ) : (
            history.map((record) => (
              <View key={record.id} style={styles.histRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.histTier}>{record.target_tier || 'Tier Upgrade'}</Text>
                  <Text style={styles.histOrder}>{record.gateway_order_id}</Text>
                  <Text style={styles.histDate}>
                    {record.created_at ? new Date(record.created_at).toLocaleDateString() : 'Recent'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.histAmount}>₹{(record.total_amount / 100).toFixed(0)} INR</Text>
                  <View style={[styles.histStatusPill, record.status === 'completed' || record.status === 'paid' ? styles.pillPaid : styles.pillPending]}>
                    <Text style={[styles.histStatusText, record.status === 'completed' || record.status === 'paid' ? styles.textPaid : styles.textPending]}>
                      {record.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>
            ))
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
    fontSize: 15,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  infoBox: {
    backgroundColor: 'rgba(79, 70, 229, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    color: '#334155',
    fontSize: 13,
    lineHeight: 18,
  },
  currentTierCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(129, 140, 248, 0.4)',
    alignItems: 'center',
    marginBottom: 24,
  },
  currentLabel: {
    color: '#818cf8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  currentValue: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 14,
  },
  tierCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  tierCardActive: {
    borderColor: '#4f46e5',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  tierTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0f172a',
  },
  tierSub: {
    fontSize: 13,
    color: '#475569',
    marginTop: 2,
  },
  pricePill: {
    backgroundColor: 'rgba(79, 70, 229, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  priceText: {
    color: '#818cf8',
    fontSize: 14,
    fontWeight: '800',
  },
  featuresList: {
    gap: 10,
    marginBottom: 18,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    color: '#334155',
    fontSize: 13,
  },
  activeBtn: {
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  activeBtnText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 14,
  },
  upgradeBtnDisabled: {
    backgroundColor: '#F1F5F9',
  },
  upgradeBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  histHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  histRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  histTier: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
  },
  histOrder: {
    color: '#818cf8',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  histDate: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  histAmount: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  histStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pillPaid: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  pillPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  histStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  textPaid: {
    color: '#10b981',
  },
  textPending: {
    color: '#f59e0b',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
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
  },
});
