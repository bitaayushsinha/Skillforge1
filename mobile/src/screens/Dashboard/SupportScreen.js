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
  Modal,
  TextInput,
} from 'react-native';
import { HelpCircle, Bell, MessageSquare, PlusCircle, CheckCircle2, Clock, Send, X, AlertCircle } from 'lucide-react-native';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import Header from '../../components/common/Header';
import api from '../../services/api';

export default function SupportScreen() {
  const [activeTab, setActiveTab] = useState('announcements'); // 'announcements' | 'tickets'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [announcements, setAnnouncements] = useState([]);
  const [tickets, setTickets] = useState([]);

  // Create Ticket Modal State
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('General Inquiry');
  const [priority, setPriority] = useState('normal');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Threaded Reply Modal State
  const [activeTicket, setActiveTicket] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [annRes, tktRes] = await Promise.all([
        api.get('/api/communications/announcements').catch(() => ({ data: [] })),
        api.get('/api/communications/tickets').catch(() => ({ data: [] })),
      ]);

      setAnnouncements(annRes.data || []);
      setTickets(tktRes.data || []);
    } catch (err) {
      console.error('Error fetching support data:', err);
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

  const handleCreateTicket = async () => {
    if (!subject.trim() || !message.trim()) {
      Alert.alert('Required Fields', 'Please enter a subject line and detailed inquiry message.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/api/communications/tickets', {
        subject: subject.trim(),
        category,
        priority,
        message: message.trim(),
      });
      Alert.alert('Ticket Submitted', 'Our administrative support team has received your inquiry.');
      setCreateModalVisible(false);
      setSubject('');
      setMessage('');
      fetchData();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Could not submit support ticket.';
      Alert.alert('Submission Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !activeTicket) return;
    setSendingReply(true);
    try {
      const res = await api.post(`/api/communications/tickets/${activeTicket.id}/reply`, {
        body: replyText.trim(),
      });
      setActiveTicket(res.data);
      setReplyText('');
      fetchData();
    } catch (err) {
      Alert.alert('Error', 'Could not post reply to ticket thread.');
    } finally {
      setSendingReply(false);
    }
  };

  if (loading) {
    return (
      <ScreenWrapper>
        <Header title="Support Center" subtitle="Announcements & Help Desk" />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.loadingText}>Syncing communications...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <Header title="Support Center" subtitle="Announcements & Help Desk" />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />}
      >
        {/* Tab Switcher */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'announcements' && styles.tabButtonActive]}
            onPress={() => setActiveTab('announcements')}
          >
            <Bell size={16} color={activeTab === 'announcements' ? '#ffffff' : '#94a3b8'} />
            <Text style={[styles.tabText, activeTab === 'announcements' && styles.tabTextActive]}>
              Announcements ({announcements.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'tickets' && styles.tabButtonActive]}
            onPress={() => setActiveTab('tickets')}
          >
            <MessageSquare size={16} color={activeTab === 'tickets' ? '#ffffff' : '#94a3b8'} />
            <Text style={[styles.tabText, activeTab === 'tickets' && styles.tabTextActive]}>
              Help Tickets ({tickets.length})
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'announcements' ? (
          /* ANNOUNCEMENTS TAB */
          <View>
            {announcements.length === 0 ? (
              <View style={styles.emptyCard}>
                <Bell size={36} color="#64748b" style={{ marginBottom: 10 }} />
                <Text style={styles.emptyTitle}>No Announcements</Text>
                <Text style={styles.emptySubtext}>You have no targeted announcements at this time.</Text>
              </View>
            ) : (
              announcements.map((ann) => (
                <View key={ann.id} style={styles.annCard}>
                  <View style={styles.annTopRow}>
                    <View style={styles.priorityBadge}>
                      <Text style={styles.priorityText}>BROADCAST</Text>
                    </View>
                    <Text style={styles.annDate}>
                      {ann.created_at ? new Date(ann.created_at).toLocaleDateString() : 'Recent'}
                    </Text>
                  </View>
                  <Text style={styles.annTitle}>{ann.title}</Text>
                  <Text style={styles.annContent}>{ann.content}</Text>
                </View>
              ))
            )}
          </View>
        ) : (
          /* TICKETS TAB */
          <View>
            <TouchableOpacity
              style={styles.newTicketBanner}
              onPress={() => setCreateModalVisible(true)}
              activeOpacity={0.85}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.newTicketTitle}>Open New Support Ticket</Text>
                <Text style={styles.newTicketSub}>Got a question on name changes, slot issues, or payments? Contact support.</Text>
              </View>
              <PlusCircle size={26} color="#818cf8" />
            </TouchableOpacity>

            {tickets.length === 0 ? (
              <View style={styles.emptyCard}>
                <HelpCircle size={36} color="#64748b" style={{ marginBottom: 10 }} />
                <Text style={styles.emptyTitle}>No Open Tickets</Text>
                <Text style={styles.emptySubtext}>Your submitted help desk tickets and administrative replies will appear here.</Text>
              </View>
            ) : (
              tickets.map((tkt) => {
                const isOpen = tkt.status === 'open' || tkt.status === 'in_progress';
                return (
                  <TouchableOpacity
                    key={tkt.id}
                    style={styles.ticketCard}
                    activeOpacity={0.8}
                    onPress={() => setActiveTicket(tkt)}
                  >
                    <View style={styles.tktHeaderRow}>
                      <Text style={styles.tktNumber}>{tkt.ticket_number}</Text>
                      <View style={[styles.statusTag, isOpen ? styles.tagOpen : styles.tagClosed]}>
                        <Text style={[styles.tagText, isOpen ? styles.textOpen : styles.textClosed]}>
                          {tkt.status ? tkt.status.toUpperCase().replace('_', ' ') : 'OPEN'}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.tktSubject}>{tkt.subject}</Text>
                    <Text style={styles.tktCategory}>{tkt.category || 'General Inquiry'}</Text>

                    <View style={styles.tktFooter}>
                      <Text style={styles.tktMsgCount}>
                        {(tkt.messages?.length || 1)} Message(s) in thread
                      </Text>
                      <Text style={styles.tktAction}>View Thread →</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        {/* Create Ticket Modal */}
        <Modal visible={createModalVisible} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>New Help Ticket</Text>
                <TouchableOpacity onPress={() => setCreateModalVisible(false)} style={styles.closeBtn}>
                  <X size={20} color="#0f172a" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 380 }}>
                <Text style={styles.formLabel}>Subject / Topic</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="e.g. Certificate name correction request"
                  placeholderTextColor="#64748b"
                  value={subject}
                  onChangeText={setSubject}
                />

                <Text style={[styles.formLabel, { marginTop: 14 }]}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow}>
                  {['General Inquiry', 'Exam & Slots', 'Certificates', 'Payments & Billing', 'Technical Issue'].map((cat) => {
                    const isSel = category === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.catPill, isSel && styles.catPillSelected]}
                        onPress={() => setCategory(cat)}
                      >
                        <Text style={[styles.catPillText, isSel && styles.catPillTextSelected]}>{cat}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <Text style={[styles.formLabel, { marginTop: 14 }]}>Inquiry Message</Text>
                <TextInput
                  style={[styles.inputField, styles.textArea]}
                  placeholder="Describe your request in detail for our support administrators..."
                  placeholderTextColor="#64748b"
                  multiline={true}
                  numberOfLines={4}
                  value={message}
                  onChangeText={setMessage}
                />
              </ScrollView>

              <TouchableOpacity
                style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                disabled={submitting}
                onPress={handleCreateTicket}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Send size={16} color="#ffffff" />
                    <Text style={styles.submitBtnText}>Submit Help Ticket</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* View Ticket Thread & Reply Modal */}
        <Modal visible={!!activeTicket} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { maxHeight: '85%', height: '85%' }]}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tktNumber}>{activeTicket?.ticket_number}</Text>
                  <Text style={styles.modalTitle} numberOfLines={1}>{activeTicket?.subject}</Text>
                </View>
                <TouchableOpacity onPress={() => setActiveTicket(null)} style={styles.closeBtn}>
                  <X size={20} color="#0f172a" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ flex: 1, paddingVertical: 10 }}>
                {(activeTicket?.messages || []).map((msg) => {
                  const isLearner = msg.sender_role === 'learner' || msg.sender_id === activeTicket?.user_id;
                  return (
                    <View
                      key={msg.id}
                      style={[
                        styles.msgBubble,
                        isLearner ? styles.bubbleLearner : styles.bubbleAdmin,
                      ]}
                    >
                      <View style={styles.msgHeader}>
                        <Text style={styles.msgSender}>{msg.sender_name || 'Support Agent'}</Text>
                        <Text style={styles.msgRole}>{msg.sender_role ? msg.sender_role.toUpperCase() : 'STAFF'}</Text>
                      </View>
                      <Text style={styles.msgBody}>{msg.body}</Text>
                    </View>
                  );
                })}
              </ScrollView>

              {/* Reply Input Bar */}
              <View style={styles.replyBar}>
                <TextInput
                  style={styles.replyInput}
                  placeholder="Type a threaded reply..."
                  placeholderTextColor="#64748b"
                  value={replyText}
                  onChangeText={setReplyText}
                />
                <TouchableOpacity
                  style={[styles.sendReplyBtn, sendingReply && { opacity: 0.5 }]}
                  disabled={sendingReply || !replyText.trim()}
                  onPress={handleSendReply}
                >
                  {sendingReply ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Send size={18} color="#ffffff" />
                  )}
                </TouchableOpacity>
              </View>
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: '#4f46e5',
  },
  tabText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    marginTop: 10,
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
  annCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  annTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  priorityBadge: {
    backgroundColor: 'rgba(79, 70, 229, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityText: {
    color: '#818cf8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  annDate: {
    color: '#64748b',
    fontSize: 12,
  },
  annTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  annContent: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
  },
  newTicketBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.4)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  newTicketTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  newTicketSub: {
    fontSize: 12,
    color: '#475569',
  },
  ticketCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  tktHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tktNumber: {
    color: '#818cf8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusTag: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tagOpen: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  tagClosed: {
    backgroundColor: 'rgba(100, 116, 139, 0.2)',
  },
  tagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  textOpen: {
    color: '#10b981',
  },
  textClosed: {
    color: '#475569',
  },
  tktSubject: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  tktCategory: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 12,
  },
  tktFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
    paddingTop: 10,
  },
  tktMsgCount: {
    fontSize: 12,
    color: '#475569',
  },
  tktAction: {
    fontSize: 12,
    color: '#818cf8',
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FAF7F2',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    borderTopWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.15)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
    paddingBottom: 14,
  },
  modalTitle: {
    color: '#0f172a',
    fontSize: 19,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 6,
  },
  formLabel: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  inputField: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#0f172a',
    fontSize: 14,
  },
  textArea: {
    height: 110,
    textAlignVertical: 'top',
  },
  pillRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  catPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  catPillSelected: {
    backgroundColor: '#4f46e5',
    borderColor: '#818cf8',
  },
  catPillText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
  catPillTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4f46e5',
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 20,
  },
  submitBtnDisabled: {
    backgroundColor: '#F1F5F9',
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  msgBubble: {
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
    maxWidth: '85%',
  },
  bubbleLearner: {
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  bubbleAdmin: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  msgHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  msgSender: {
    fontSize: 12,
    fontWeight: '700',
    color: '#818cf8',
  },
  msgRole: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
  },
  msgBody: {
    fontSize: 14,
    color: '#0f172a',
    lineHeight: 20,
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
    paddingTop: 14,
  },
  replyInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#0f172a',
    fontSize: 14,
  },
  sendReplyBtn: {
    backgroundColor: '#4f46e5',
    padding: 12,
    borderRadius: 14,
  },
});
