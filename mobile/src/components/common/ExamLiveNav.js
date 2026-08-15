import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Calendar, Video, BrainCircuit } from 'lucide-react-native';

export default function ExamLiveNav({ activeTab }) {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.pill, activeTab === 'slots' && styles.pillActive]}
        onPress={() => navigation.navigate('SlotBookingMain')}
      >
        <Calendar size={14} color={activeTab === 'slots' ? '#ffffff' : '#94a3b8'} />
        <Text style={[styles.pillText, activeTab === 'slots' && styles.pillTextActive]}>
          Exam Slots
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.pill, activeTab === 'live' && styles.pillActive]}
        onPress={() => navigation.navigate('LiveClasses')}
      >
        <Video size={14} color={activeTab === 'live' ? '#ffffff' : '#94a3b8'} />
        <Text style={[styles.pillText, activeTab === 'live' && styles.pillTextActive]}>
          Live Classes
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.pill, activeTab === 'mocks' && styles.pillActive]}
        onPress={() => navigation.navigate('MockResults')}
      >
        <BrainCircuit size={14} color={activeTab === 'mocks' ? '#ffffff' : '#94a3b8'} />
        <Text style={[styles.pillText, activeTab === 'mocks' && styles.pillTextActive]}>
          AI Mocks
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
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  pillActive: {
    backgroundColor: '#4f46e5',
  },
  pillText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
  pillTextActive: {
    color: '#ffffff',
  },
});
