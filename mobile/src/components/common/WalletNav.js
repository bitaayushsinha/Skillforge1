import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Award, CreditCard } from 'lucide-react-native';

export default function WalletNav({ activeTab }) {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.pill, activeTab === 'certificates' && styles.pillActive]}
        onPress={() => navigation.navigate('CertificatesMain')}
      >
        <Award size={15} color={activeTab === 'certificates' ? '#ffffff' : '#94a3b8'} />
        <Text style={[styles.pillText, activeTab === 'certificates' && styles.pillTextActive]}>
          Certificates & Badges
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.pill, activeTab === 'payments' && styles.pillActive]}
        onPress={() => navigation.navigate('Payments')}
      >
        <CreditCard size={15} color={activeTab === 'payments' ? '#ffffff' : '#94a3b8'} />
        <Text style={[styles.pillText, activeTab === 'payments' && styles.pillTextActive]}>
          Payments & Upgrades
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 4,
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
  },
  pillActive: {
    backgroundColor: '#4f46e5',
  },
  pillText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
  },
  pillTextActive: {
    color: '#ffffff',
  },
});
