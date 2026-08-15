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
import { Video, Calendar, Clock, User, ExternalLink, Sparkles } from 'lucide-react-native';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import Header from '../../components/common/Header';
import ExamLiveNav from '../../components/common/ExamLiveNav';
import api from '../../services/api';

export default function LiveClassesScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sessions, setSessions] = useState([]);

  const fetchLiveSessions = useCallback(async () => {
    try {
      const res = await api.get('/api/communications/live-sessions?upcoming_only=true');
      setSessions(res.data || []);
    } catch (err) {
      console.error('Error fetching live classes:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveSessions();
  }, [fetchLiveSessions]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLiveSessions();
  };

  const handleJoinSession = async (session) => {
    if (!session.zoom_link) {
      Alert.alert('Notice', 'No meeting link has been provided for this live session.');
      return;
    }

    try {
      const canOpen = await Linking.canOpenURL(session.zoom_link);
      if (canOpen) {
        await Linking.openURL(session.zoom_link);
      } else {
        await WebBrowser.openBrowserAsync(session.zoom_link, {
          toolbarColor: '#0f172a',
          controlsColor: '#818cf8',
        });
      }
    } catch (err) {
      await WebBrowser.openBrowserAsync(session.zoom_link, {
        toolbarColor: '#0f172a',
        controlsColor: '#818cf8',
      }).catch(() => {
        Alert.alert('Error', 'Could not launch Zoom session link.');
      });
    }
  };

  if (loading) {
    return (
      <ScreenWrapper>
        <Header title="Live Classes" subtitle="Interactive Batch Sessions" />
        <ExamLiveNav activeTab="live" />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.loadingText}>Syncing live schedules...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <Header title="Live Classes" subtitle="Interactive Batch Sessions" />
      <ExamLiveNav activeTab="live" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />}
      >
        <View style={styles.infoBox}>
          <Sparkles size={18} color="#818cf8" />
          <Text style={styles.infoText}>
            These live sessions are dynamically scoped to your assigned program specialization and batch cohort. Tap &quot;Join Session&quot; at the scheduled time to connect via Zoom.
          </Text>
        </View>

        {sessions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Video size={36} color="#64748b" style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>No Live Sessions Scheduled</Text>
            <Text style={styles.emptySubtext}>
              There are currently no upcoming live lectures scheduled for your batch. Check back soon.
            </Text>
          </View>
        ) : (
          sessions.map((item) => {
            const dtObj = new Date(item.session_datetime);
            const dateStr = dtObj.toLocaleDateString();
            const timeStr = dtObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <View key={item.id} style={styles.sessionCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.badgeRow}>
                    <View style={styles.liveIndicator} />
                    <Text style={styles.liveText}>SCHEDULED</Text>
                  </View>
                  <Text style={styles.durationText}>{item.duration_minutes || 60} mins</Text>
                </View>

                <Text style={styles.topicTitle}>{item.topic}</Text>
                {item.description ? (
                  <Text style={styles.sessionDesc}>{item.description}</Text>
                ) : null}

                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Calendar size={15} color="#818cf8" />
                    <Text style={styles.metaText}>{dateStr}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Clock size={15} color="#818cf8" />
                    <Text style={styles.metaText}>{timeStr}</Text>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <View style={styles.instructorInfo}>
                    <User size={15} color="#64748b" />
                    <Text style={styles.instructorText}>Host ID: {item.host_id || 'Faculty'}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.joinBtn}
                    onPress={() => handleJoinSession(item)}
                  >
                    <ExternalLink size={16} color="#ffffff" />
                    <Text style={styles.joinBtnText}>Join Session</Text>
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
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    marginTop: 10,
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
  sessionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3b82f6',
  },
  liveText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '800',
  },
  durationText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  topicTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  sessionDesc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 14,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.06)',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  instructorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  instructorText: {
    color: '#475569',
    fontSize: 12,
  },
  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#4f46e5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  joinBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
