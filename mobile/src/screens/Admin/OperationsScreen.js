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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Sliders,
  Calendar,
  Megaphone,
  LifeBuoy,
  Plus,
  Clock,
  Video,
  CheckCircle2,
  Trash2,
  Send,
  X,
  AlertCircle,
  MessageSquare,
  BookOpen,
} from 'lucide-react-native';
import ScreenWrapper from '../../components/common/ScreenWrapper';
import Header from '../../components/common/Header';
import api from '../../services/api';

export default function OperationsScreen() {
  const [activeTab, setActiveTab] = useState('curriculum'); // 'curriculum' | 'live' | 'announcements' | 'tickets'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Data states
  const [subjects, setSubjects] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [liveSessions, setLiveSessions] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [tickets, setTickets] = useState([]);

  // Modal / Action states
  const [subjectModal, setSubjectModal] = useState(false);
  const [windowModal, setWindowModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState(null);

  const [liveModal, setLiveModal] = useState(false);
  const [announcementModal, setAnnouncementModal] = useState(false);
  const [ticketModal, setTicketModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  // Forms
  const [subForm, setSubForm] = useState({ name: '', code: '', specialization_id: null, semester_tier: 'Semester 1' });
  const [winForm, setWinForm] = useState({ start_date: '', end_date: '', daily_start_time: '09:00', daily_end_time: '18:00', slot_duration_minutes: 60 });
  const [liveForm, setLiveForm] = useState({ title: '', description: '', session_datetime: '', duration_minutes: '60', meeting_link: '', instructor_name: '', target_batch: 'All Batches' });
  const [annForm, setAnnForm] = useState({ title: '', message: '', priority: 'normal', target_batch: 'All Batches' });
  const [replyText, setReplyText] = useState('');
  const [ticketStatus, setTicketStatus] = useState('resolved');
  const [saving, setSaving] = useState(false);

  const fetchTabMetrics = useCallback(async () => {
    try {
      setError(null);
      if (activeTab === 'curriculum') {
        const [subRes, specRes] = await Promise.all([
          api.get('/api/admin/subadmins/subjects').catch(() => ({ data: [] })),
          api.get('/api/admin/students/specializations').catch(() => ({ data: [] })),
        ]);
        setSubjects(subRes.data || []);
        setSpecializations(specRes.data || []);
      } else if (activeTab === 'live') {
        const res = await api.get('/api/communications/live-sessions', { params: { upcoming_only: false } });
        setLiveSessions(res.data || []);
      } else if (activeTab === 'announcements') {
        const res = await api.get('/api/communications/announcements');
        setAnnouncements(res.data || []);
      } else if (activeTab === 'tickets') {
        const res = await api.get('/api/communications/tickets');
        setTickets(res.data || []);
      }
    } catch (err) {
      console.error('Error fetching operations data:', err);
      setError('Could not load operations telemetry. Check network.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    setLoading(true);
    fetchTabMetrics();
  }, [fetchTabMetrics]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTabMetrics();
  };

  const handleCreateSubject = async () => {
    if (!subForm.name.trim() || !subForm.code.trim()) return;
    try {
      setSaving(true);
      await api.post('/api/admin/subadmins/subjects', subForm);
      setSubjectModal(false);
      setSubForm({ name: '', code: '', specialization_id: null, semester_tier: 'Semester 1' });
      fetchTabMetrics();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to create subject.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateExamWindow = async () => {
    if (!selectedSubject) return;
    try {
      setSaving(true);
      await api.patch(`/api/admin/subadmins/subjects/${selectedSubject.id}/exam-window`, {
        start_date: winForm.start_date || null,
        end_date: winForm.end_date || null,
        daily_start_time: winForm.daily_start_time || '09:00',
        daily_end_time: winForm.daily_end_time || '18:00',
        slot_duration_minutes: parseInt(winForm.slot_duration_minutes, 10) || 60,
      });
      Alert.alert('Success', `Exam window updated for ${selectedSubject.name}`);
      setWindowModal(false);
      fetchTabMetrics();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to update exam window.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateLiveSession = async () => {
    if (!liveForm.title.trim() || !liveForm.meeting_link.trim() || !liveForm.session_datetime.trim()) {
      Alert.alert('Validation Error', 'Title, Meeting Link, and DateTime (YYYY-MM-DDTHH:MM:SS) are required.');
      return;
    }
    try {
      setSaving(true);
      await api.post('/api/communications/live-sessions', {
        ...liveForm,
        duration_minutes: parseInt(liveForm.duration_minutes, 10) || 60,
      });
      setLiveModal(false);
      setLiveForm({ title: '', description: '', session_datetime: '', duration_minutes: '60', meeting_link: '', instructor_name: '', target_batch: 'All Batches' });
      fetchTabMetrics();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to schedule session.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSession = (item) => {
    Alert.alert('Cancel Session', `Are you sure you want to cancel "${item.title}"?`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Cancel Session',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/communications/live-sessions/${item.id}`);
            fetchTabMetrics();
          } catch (err) {
            Alert.alert('Error', err.response?.data?.detail || 'Failed to cancel session.');
          }
        },
      },
    ]);
  };

  const handleCreateAnnouncement = async () => {
    if (!annForm.title.trim() || !annForm.message.trim()) return;
    try {
      setSaving(true);
      await api.post('/api/communications/announcements', annForm);
      setAnnouncementModal(false);
      setAnnForm({ title: '', message: '', priority: 'normal', target_batch: 'All Batches' });
      fetchTabMetrics();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to broadcast announcement.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAnnouncement = (item) => {
    Alert.alert('Delete Announcement', `Remove announcement "${item.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/communications/announcements/${item.id}`);
            fetchTabMetrics();
          } catch (err) {
            Alert.alert('Error', err.response?.data?.detail || 'Failed to delete announcement.');
          }
        },
      },
    ]);
  };

  const handleUpdateTicket = async () => {
    if (!selectedTicket) return;
    try {
      setSaving(true);
      await api.put(`/api/communications/tickets/${selectedTicket.id}/status`, {
        status: ticketStatus,
        admin_response: replyText.trim() || undefined,
      });
      Alert.alert('Success', 'Support ticket updated and learner notified.');
      setTicketModal(false);
      setReplyText('');
      fetchTabMetrics();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to update ticket.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenWrapper>
      <Header title="Operations & Support" subtitle="Curriculum, Live Events & Desk" />

      {/* Top Pill Nav */}
      <View style={styles.navContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.navScroll}>
          <TouchableOpacity
            style={[styles.navTab, activeTab === 'curriculum' && styles.navTabActive]}
            onPress={() => setActiveTab('curriculum')}
          >
            <BookOpen size={16} color={activeTab === 'curriculum' ? '#0f172a' : '#94a3b8'} />
            <Text style={[styles.navText, activeTab === 'curriculum' && styles.navTextActive]}>Curriculum & Exams</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navTab, activeTab === 'live' && styles.navTabActive]}
            onPress={() => setActiveTab('live')}
          >
            <Video size={16} color={activeTab === 'live' ? '#0f172a' : '#94a3b8'} />
            <Text style={[styles.navText, activeTab === 'live' && styles.navTextActive]}>Live Sessions</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navTab, activeTab === 'announcements' && styles.navTabActive]}
            onPress={() => setActiveTab('announcements')}
          >
            <Megaphone size={16} color={activeTab === 'announcements' ? '#0f172a' : '#94a3b8'} />
            <Text style={[styles.navText, activeTab === 'announcements' && styles.navTextActive]}>Announcements</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navTab, activeTab === 'tickets' && styles.navTabActive]}
            onPress={() => setActiveTab('tickets')}
          >
            <LifeBuoy size={16} color={activeTab === 'tickets' ? '#0f172a' : '#94a3b8'} />
            <Text style={[styles.navText, activeTab === 'tickets' && styles.navTextActive]}>Support Tickets</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Action header depending on active tab */}
      <View style={styles.actionHeader}>
        <Text style={styles.tabTitleText}>
          {activeTab === 'curriculum' && 'Subjects & Exam Slot Windows'}
          {activeTab === 'live' && 'Scheduled Masterclasses'}
          {activeTab === 'announcements' && 'Active Broadcasts'}
          {activeTab === 'tickets' && 'Learner Helpdesk Queue'}
        </Text>
        {activeTab === 'curriculum' ? (
          <TouchableOpacity style={styles.plusBtn} onPress={() => setSubjectModal(true)}>
            <Plus size={16} color="#0f172a" />
            <Text style={styles.plusBtnText}>Add Subject</Text>
          </TouchableOpacity>
        ) : activeTab === 'live' ? (
          <TouchableOpacity style={styles.plusBtn} onPress={() => setLiveModal(true)}>
            <Plus size={16} color="#0f172a" />
            <Text style={styles.plusBtnText}>Schedule Class</Text>
          </TouchableOpacity>
        ) : activeTab === 'announcements' ? (
          <TouchableOpacity style={styles.plusBtn} onPress={() => setAnnouncementModal(true)}>
            <Plus size={16} color="#0f172a" />
            <Text style={styles.plusBtnText}>Broadcast</Text>
          </TouchableOpacity>
        ) : null}
      </View>

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

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#f59e0b" />
            <Text style={styles.loadingText}>Syncing operations records...</Text>
          </View>
        ) : activeTab === 'curriculum' ? (
          subjects.length === 0 ? (
            <View style={styles.emptyCard}>
              <BookOpen size={36} color="#64748b" />
              <Text style={styles.emptyTitle}>No Subjects Found</Text>
              <Text style={styles.emptySubtext}>Click "+ Add Subject" to register curriculum items.</Text>
            </View>
          ) : (
            subjects.map((item) => (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardTopRow}>
                  <View style={styles.infoLeft}>
                    <Text style={styles.codeBadge}>{item.code}</Text>
                    <Text style={styles.itemTitle}>{item.name}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.windowBtn}
                    onPress={() => {
                      setSelectedSubject(item);
                      setWinForm({
                        start_date: item.exam_start_date || '',
                        end_date: item.exam_end_date || '',
                        daily_start_time: item.daily_start_time || '09:00',
                        daily_end_time: item.daily_end_time || '18:00',
                        slot_duration_minutes: item.slot_duration_minutes || 60,
                      });
                      setWindowModal(true);
                    }}
                  >
                    <Clock size={14} color="#f59e0b" />
                    <Text style={styles.windowBtnText}>Set Exam Window</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.cardMetaRow}>
                  <Text style={styles.metaText}>Tier: {item.semester_tier || 'Semester 1'}</Text>
                  <Text style={styles.metaText}>
                    Window: {item.exam_start_date ? `${item.exam_start_date} to ${item.exam_end_date}` : 'Not Configured'}
                  </Text>
                </View>
              </View>
            ))
          )
        ) : activeTab === 'live' ? (
          liveSessions.length === 0 ? (
            <View style={styles.emptyCard}>
              <Video size={36} color="#64748b" />
              <Text style={styles.emptyTitle}>No Live Sessions Scheduled</Text>
              <Text style={styles.emptySubtext}>Schedule live interactive classes for learners.</Text>
            </View>
          ) : (
            liveSessions.map((item) => (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardTopRow}>
                  <View style={styles.infoLeft}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.metaSub}>{item.instructor_name || 'Assigned Expert'} • {item.duration_minutes} Mins</Text>
                  </View>
                  <TouchableOpacity style={styles.delBtn} onPress={() => handleDeleteSession(item)}>
                    <Trash2 size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
                {item.description ? <Text style={styles.descText}>{item.description}</Text> : null}
                <View style={styles.cardMetaRow}>
                  <Text style={styles.metaText}>Date: {new Date(item.session_datetime).toLocaleString()}</Text>
                  <Text style={styles.batchPill}>{item.target_batch || 'All Batches'}</Text>
                </View>
              </View>
            ))
          )
        ) : activeTab === 'announcements' ? (
          announcements.length === 0 ? (
            <View style={styles.emptyCard}>
              <Megaphone size={36} color="#64748b" />
              <Text style={styles.emptyTitle}>No Announcements Broadcasted</Text>
              <Text style={styles.emptySubtext}>Broadcast high-priority notices to student portals.</Text>
            </View>
          ) : (
            announcements.map((item) => (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardTopRow}>
                  <View style={styles.infoLeft}>
                    <View style={styles.priorityWrap}>
                      <Text style={[styles.priorityText, item.priority === 'urgent' ? { color: '#ef4444' } : { color: '#fbbf24' }]}>
                        {(item.priority || 'NORMAL').toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                  </View>
                  <TouchableOpacity style={styles.delBtn} onPress={() => handleDeleteAnnouncement(item)}>
                    <Trash2 size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.descText}>{item.message}</Text>
                <View style={styles.cardMetaRow}>
                  <Text style={styles.metaText}>Broadcasted: {new Date(item.created_at || Date.now()).toLocaleDateString()}</Text>
                  <Text style={styles.batchPill}>{item.target_batch || 'All Batches'}</Text>
                </View>
              </View>
            ))
          )
        ) : (
          tickets.length === 0 ? (
            <View style={styles.emptyCard}>
              <LifeBuoy size={36} color="#64748b" />
              <Text style={styles.emptyTitle}>Support Queue Empty</Text>
              <Text style={styles.emptySubtext}>No learner inquiries or dispute tickets currently open.</Text>
            </View>
          ) : (
            tickets.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.card}
                onPress={() => {
                  setSelectedTicket(item);
                  setTicketStatus(item.status || 'resolved');
                  setReplyText(item.admin_response || '');
                  setTicketModal(true);
                }}
              >
                <View style={styles.cardTopRow}>
                  <View style={styles.infoLeft}>
                    <Text style={styles.itemTitle}>{item.subject || 'Support Ticket'}</Text>
                    <Text style={styles.metaSub}>Learner: {item.user_email || `User #${item.user_id}`}</Text>
                  </View>
                  <View style={[styles.statusPill, item.status === 'open' ? styles.statusOpen : styles.statusResolved]}>
                    <Text style={[styles.statusText, item.status === 'open' ? { color: '#fbbf24' } : { color: '#10b981' }]}>
                      {(item.status || 'OPEN').toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={styles.descText} numberOfLines={2}>{item.message}</Text>
                {item.admin_response ? (
                  <View style={styles.adminReplyBox}>
                    <Text style={styles.adminReplyLabel}>Admin Response:</Text>
                    <Text style={styles.adminReplyText}>{item.admin_response}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            ))
          )
        )}
      </ScrollView>

      {/* Add Subject Modal */}
      <Modal visible={subjectModal} transparent animationType="slide" onRequestClose={() => setSubjectModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Subject</Text>
              <TouchableOpacity onPress={() => setSubjectModal(false)}>
                <X size={22} color="#475569" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.inputLabel}>Subject Name *</Text>
              <TextInput style={styles.textInput} placeholder="e.g. Advanced AI Engine" placeholderTextColor="#64748b" value={subForm.name} onChangeText={(t) => setSubForm({ ...subForm, name: t })} />
              <Text style={styles.inputLabel}>Subject Code *</Text>
              <TextInput style={styles.textInput} placeholder="e.g. CS-901" placeholderTextColor="#64748b" autoCapitalize="characters" value={subForm.code} onChangeText={(t) => setSubForm({ ...subForm, code: t.toUpperCase() })} />
              <Text style={styles.inputLabel}>Assign Specialization</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
                {specializations.map((spec) => (
                  <TouchableOpacity key={spec.id || spec.name} style={[styles.pillItem, subForm.specialization_id === spec.id && styles.pillActive]} onPress={() => setSubForm({ ...subForm, specialization_id: spec.id })}>
                    <Text style={[styles.pillText, subForm.specialization_id === spec.id && { color: '#0f172a', fontWeight: '800' }]}>{spec.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setSubjectModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleCreateSubject} disabled={saving}>{saving ? <ActivityIndicator size="small" color="#0f172a" /> : <Text style={styles.saveText}>Save Subject</Text>}</TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Exam Window Modal */}
      <Modal visible={windowModal} transparent animationType="fade" onRequestClose={() => setWindowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Exam Window: {selectedSubject?.code}</Text>
              <TouchableOpacity onPress={() => setWindowModal(false)}><X size={22} color="#475569" /></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.inputLabel}>Start Date (YYYY-MM-DD)</Text>
              <TextInput style={styles.textInput} placeholder="2026-08-01" placeholderTextColor="#64748b" value={winForm.start_date} onChangeText={(t) => setWinForm({ ...winForm, start_date: t })} />
              <Text style={styles.inputLabel}>End Date (YYYY-MM-DD)</Text>
              <TextInput style={styles.textInput} placeholder="2026-08-31" placeholderTextColor="#64748b" value={winForm.end_date} onChangeText={(t) => setWinForm({ ...winForm, end_date: t })} />
              <Text style={styles.inputLabel}>Daily Start Time (HH:MM)</Text>
              <TextInput style={styles.textInput} placeholder="09:00" placeholderTextColor="#64748b" value={winForm.daily_start_time} onChangeText={(t) => setWinForm({ ...winForm, daily_start_time: t })} />
              <Text style={styles.inputLabel}>Daily End Time (HH:MM)</Text>
              <TextInput style={styles.textInput} placeholder="18:00" placeholderTextColor="#64748b" value={winForm.daily_end_time} onChangeText={(t) => setWinForm({ ...winForm, daily_end_time: t })} />
              <Text style={styles.inputLabel}>Slot Duration (Minutes)</Text>
              <TextInput style={styles.textInput} placeholder="60" placeholderTextColor="#64748b" keyboardType="numeric" value={winForm.slot_duration_minutes?.toString()} onChangeText={(t) => setWinForm({ ...winForm, slot_duration_minutes: t })} />
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setWindowModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleUpdateExamWindow} disabled={saving}>{saving ? <ActivityIndicator size="small" color="#0f172a" /> : <Text style={styles.saveText}>Update Window</Text>}</TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Schedule Live Session Modal */}
      <Modal visible={liveModal} transparent animationType="slide" onRequestClose={() => setLiveModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Schedule Masterclass</Text>
              <TouchableOpacity onPress={() => setLiveModal(false)}><X size={22} color="#475569" /></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.inputLabel}>Session Title *</Text>
              <TextInput style={styles.textInput} placeholder="e.g. Live Q&A on FastAPI System Architecture" placeholderTextColor="#64748b" value={liveForm.title} onChangeText={(t) => setLiveForm({ ...liveForm, title: t })} />
              <Text style={styles.inputLabel}>Meeting URL / Zoom Link *</Text>
              <TextInput style={styles.textInput} placeholder="https://zoom.us/j/123456789" placeholderTextColor="#64748b" autoCapitalize="none" value={liveForm.meeting_link} onChangeText={(t) => setLiveForm({ ...liveForm, meeting_link: t })} />
              <Text style={styles.inputLabel}>Date & Time (YYYY-MM-DDTHH:MM:SS) *</Text>
              <TextInput style={styles.textInput} placeholder="2026-07-25T14:00:00" placeholderTextColor="#64748b" value={liveForm.session_datetime} onChangeText={(t) => setLiveForm({ ...liveForm, session_datetime: t })} />
              <Text style={styles.inputLabel}>Instructor Name</Text>
              <TextInput style={styles.textInput} placeholder="Dr. Joswin / Expert" placeholderTextColor="#64748b" value={liveForm.instructor_name} onChangeText={(t) => setLiveForm({ ...liveForm, instructor_name: t })} />
              <Text style={styles.inputLabel}>Duration (Minutes)</Text>
              <TextInput style={styles.textInput} placeholder="60" placeholderTextColor="#64748b" keyboardType="numeric" value={liveForm.duration_minutes} onChangeText={(t) => setLiveForm({ ...liveForm, duration_minutes: t })} />
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setLiveModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleCreateLiveSession} disabled={saving}>{saving ? <ActivityIndicator size="small" color="#0f172a" /> : <Text style={styles.saveText}>Schedule Class</Text>}</TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Broadcast Announcement Modal */}
      <Modal visible={announcementModal} transparent animationType="slide" onRequestClose={() => setAnnouncementModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Broadcast Notice</Text>
              <TouchableOpacity onPress={() => setAnnouncementModal(false)}><X size={22} color="#475569" /></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.inputLabel}>Notice Title *</Text>
              <TextInput style={styles.textInput} placeholder="e.g. Exam Portal Scheduled Maintenance" placeholderTextColor="#64748b" value={annForm.title} onChangeText={(t) => setAnnForm({ ...annForm, title: t })} />
              <Text style={styles.inputLabel}>Message Content *</Text>
              <TextInput style={[styles.textInput, { height: 100, textAlignVertical: 'top' }]} placeholder="Important updates regarding student portal access..." placeholderTextColor="#64748b" multiline value={annForm.message} onChangeText={(t) => setAnnForm({ ...annForm, message: t })} />
              <Text style={styles.inputLabel}>Priority Level</Text>
              <View style={styles.pillRow}>
                <TouchableOpacity style={[styles.pillItem, annForm.priority === 'normal' && styles.pillActive]} onPress={() => setAnnForm({ ...annForm, priority: 'normal' })}><Text style={[styles.pillText, annForm.priority === 'normal' && { color: '#0f172a', fontWeight: '800' }]}>Normal</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.pillItem, annForm.priority === 'urgent' && { backgroundColor: '#ef4444', borderColor: '#ef4444' }]} onPress={() => setAnnForm({ ...annForm, priority: 'urgent' })}><Text style={[styles.pillText, annForm.priority === 'urgent' && { color: '#0f172a', fontWeight: '800' }]}>Urgent</Text></TouchableOpacity>
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setAnnouncementModal(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleCreateAnnouncement} disabled={saving}>{saving ? <ActivityIndicator size="small" color="#0f172a" /> : <Text style={styles.saveText}>Broadcast</Text>}</TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Ticket Management Modal */}
      <Modal visible={ticketModal} transparent animationType="fade" onRequestClose={() => setTicketModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ticket Desk: #{selectedTicket?.id}</Text>
              <TouchableOpacity onPress={() => setTicketModal(false)}><X size={22} color="#475569" /></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.ticketSubject}>{selectedTicket?.subject}</Text>
              <Text style={styles.ticketMsg}>{selectedTicket?.message}</Text>
              <Text style={styles.inputLabel}>Status</Text>
              <View style={styles.pillRow}>
                <TouchableOpacity style={[styles.pillItem, ticketStatus === 'open' && styles.pillActive]} onPress={() => setTicketStatus('open')}><Text style={[styles.pillText, ticketStatus === 'open' && { color: '#0f172a', fontWeight: '800' }]}>Open</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.pillItem, ticketStatus === 'in_progress' && styles.pillActive]} onPress={() => setTicketStatus('in_progress')}><Text style={[styles.pillText, ticketStatus === 'in_progress' && { color: '#0f172a', fontWeight: '800' }]}>In Progress</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.pillItem, ticketStatus === 'resolved' && { backgroundColor: '#10b981', borderColor: '#10b981' }]} onPress={() => setTicketStatus('resolved')}><Text style={[styles.pillText, ticketStatus === 'resolved' && { color: '#0f172a', fontWeight: '800' }]}>Resolved</Text></TouchableOpacity>
              </View>
              <Text style={styles.inputLabel}>Admin Response / Resolution Note</Text>
              <TextInput style={[styles.textInput, { height: 90, textAlignVertical: 'top' }]} placeholder="Type response to notify student..." placeholderTextColor="#64748b" multiline value={replyText} onChangeText={setReplyText} />
            </ScrollView>
            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setTicketModal(false)}><Text style={styles.cancelText}>Close</Text></TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleUpdateTicket} disabled={saving}>{saving ? <ActivityIndicator size="small" color="#0f172a" /> : <Text style={styles.saveText}>Update Ticket</Text>}</TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  navContainer: {
    paddingTop: 8,
    paddingBottom: 4,
  },
  navScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  navTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    gap: 6,
  },
  navTabActive: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  navText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
  navTextActive: {
    color: '#0f172a',
    fontWeight: '800',
  },
  actionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 4,
  },
  tabTitleText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  plusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  plusBtnText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '800',
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  infoLeft: {
    flex: 1,
    marginRight: 10,
  },
  codeBadge: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 2,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  metaSub: {
    fontSize: 12,
    color: '#475569',
    marginTop: 2,
  },
  windowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  windowBtnText: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '700',
  },
  delBtn: {
    padding: 6,
    backgroundColor: '#FAF7F2',
    borderRadius: 8,
  },
  descText: {
    fontSize: 13,
    color: '#334155',
    marginTop: 8,
    lineHeight: 18,
  },
  cardMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
  },
  metaText: {
    fontSize: 12,
    color: '#475569',
  },
  batchPill: {
    backgroundColor: 'rgba(79, 70, 229, 0.2)',
    color: '#818cf8',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  priorityWrap: {
    marginBottom: 2,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusOpen: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  statusResolved: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  adminReplyBox: {
    backgroundColor: '#FAF7F2',
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  adminReplyLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#38bdf8',
  },
  adminReplyText: {
    fontSize: 13,
    color: '#0f172a',
    marginTop: 2,
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
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
    marginTop: 10,
  },
  textInput: {
    backgroundColor: '#FAF7F2',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    color: '#0f172a',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 6,
  },
  pillItem: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#FAF7F2',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  pillActive: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  pillText: {
    color: '#475569',
    fontSize: 12,
  },
  ticketSubject: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  ticketMsg: {
    fontSize: 13,
    color: '#475569',
    marginTop: 6,
    lineHeight: 18,
    marginBottom: 10,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
    gap: 10,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#FAF7F2',
  },
  cancelText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '600',
  },
  saveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f59e0b',
  },
  saveText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '800',
  },
});
