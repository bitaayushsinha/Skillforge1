import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Award, ExternalLink, ShieldCheck, CreditCard, Sparkles } from 'lucide-react-native';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import Header from '../../components/common/Header';
import WalletNav from '../../components/common/WalletNav';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function CertificationsScreen({ navigation }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [certificates, setCertificates] = useState([]);

  const fetchCertificates = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await api.get(`/api/certificates/user/${user.id}`);
      setCertificates(res.data || []);
    } catch (err) {
      console.error('Error fetching learner certificates:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCertificates();
  }, [fetchCertificates]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCertificates();
  };

  const handleOpenCertificate = async (certUrl) => {
    if (!certUrl) {
      Alert.alert('Notice', 'The digital verification link for this certificate is not available.');
      return;
    }
    try {
      const canOpen = await Linking.canOpenURL(certUrl);
      if (canOpen) {
        await Linking.openURL(certUrl);
      } else {
        await WebBrowser.openBrowserAsync(certUrl, {
          toolbarColor: '#0f172a',
          controlsColor: '#818cf8',
        });
      }
    } catch (err) {
      await WebBrowser.openBrowserAsync(certUrl).catch(() => {
        Alert.alert('Error', 'Could not open verification link.');
      });
    }
  };

  if (loading) {
    return (
      <ScreenWrapper>
        <Header title="Credential Wallet" subtitle="Digital Certificates & Badges" />
        <WalletNav activeTab="certificates" />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.loadingText}>Verifying credential registry...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <Header title="Credential Wallet" subtitle="Digital Certificates & Badges" />
      <WalletNav activeTab="certificates" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />}
      >
        {/* Upgrade & Payments Navigation Banner */}
        <TouchableOpacity
          style={styles.paymentBanner}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Payments')}
        >
          <View style={styles.paymentBannerLeft}>
            <View style={styles.paymentIconBox}>
              <CreditCard size={20} color="#38bdf8" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.paymentBannerTitle}>Program Tier & Razorpay Payments</Text>
              <Text style={styles.paymentBannerSub}>Check transaction history or upgrade to State/National levels.</Text>
            </View>
          </View>
          <Award size={20} color="#38bdf8" />
        </TouchableOpacity>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Sparkles size={18} color="#818cf8" />
          <Text style={styles.infoText}>
            All credentials stored in this wallet are blockchain-hashed and verified by the SkillForge Examination Registry. Tap &quot;Verify Digital Credential&quot; to inspect the official PDF verification portal.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Issued Digital Certificates ({certificates.length})</Text>

        {certificates.length === 0 ? (
          <View style={styles.emptyCard}>
            <Award size={40} color="#64748b" style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>No Certificates Issued Yet</Text>
            <Text style={styles.emptySubtext}>
              Complete your curriculum requirements and pass your proctored assessment to unlock official digital certificates.
            </Text>
          </View>
        ) : (
          certificates.map((cert) => {
            const isValid = cert.certificate_status === 'valid';
            return (
              <View key={cert.id || cert.certificate_id} style={styles.certCard}>
                <View style={styles.certTopRow}>
                  <View style={styles.statusBadge}>
                    <ShieldCheck size={14} color={isValid ? '#10b981' : '#f59e0b'} />
                    <Text style={[styles.statusBadgeText, { color: isValid ? '#10b981' : '#f59e0b' }]}>
                      {isValid ? 'VERIFIED CREDENTIAL' : 'PENDING CONFIRMATION'}
                    </Text>
                  </View>
                  <Text style={styles.certIdText}>ID: {cert.certificate_id}</Text>
                </View>

                <Text style={styles.courseName}>{cert.course_name}</Text>
                <Text style={styles.issueDateText}>Issued on {cert.issue_date || 'Recent'}</Text>

                <View style={styles.certFooter}>
                  <View style={styles.sealBox}>
                    <Award size={15} color="#818cf8" />
                    <Text style={styles.sealText}>SkillForge LMS Authority</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.viewBtn}
                    onPress={() => handleOpenCertificate(cert.certificate_url)}
                  >
                    <ExternalLink size={15} color="#ffffff" />
                    <Text style={styles.viewBtnText}>Verify Digital Credential</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
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
  paymentBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    shadowColor: '#38bdf8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  paymentBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  paymentIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  paymentBannerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  paymentBannerSub: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
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
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    color: '#334155',
    fontSize: 13,
    lineHeight: 18,
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
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
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
  certCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.4)',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 5,
  },
  certTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  certIdText: {
    color: '#818cf8',
    fontSize: 12,
    fontWeight: '700',
  },
  courseName: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  issueDateText: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 18,
  },
  certFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
    paddingTop: 14,
  },
  sealBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sealText: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '600',
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#4f46e5',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  viewBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
